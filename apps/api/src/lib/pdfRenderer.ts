// ═══════════════════════════════════════════════════════════════════
// pdfRenderer.ts — HTML → PDF vetorial via Chrome headless
//
// Por que existe: o fluxo antigo dependia do window.print() do navegador do
// usuário. Quem escolhia o destino "Microsoft Print to PDF" recebia um PDF
// rasterizado (centenas de tiles JPEG por página, sem fontes embutidas), onde
// as hastes finas de l/I viravam pixels sólidos e pareciam negrito. Gerando o
// PDF aqui, o resultado é sempre vetorial, independente do que o usuário
// escolhe no diálogo de impressão.
// ═══════════════════════════════════════════════════════════════════

import puppeteer from 'puppeteer-core'
import type { Browser, Page } from 'puppeteer-core'
import { existsSync } from 'fs'
import { execSync } from 'child_process'
import { PDFDocument } from 'pdf-lib'

const CAMINHOS_CHROMIUM = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean) as string[]

let caminhoResolvido: string | null | undefined

export function acharChromium(): string | null {
  if (caminhoResolvido !== undefined) return caminhoResolvido
  for (const p of CAMINHOS_CHROMIUM) {
    if (existsSync(p)) { caminhoResolvido = p; return p }
  }
  // Nixpacks instala no /nix/store — o binário só aparece no PATH
  for (const bin of ['chromium', 'chromium-browser', 'google-chrome']) {
    try {
      const achado = execSync(`command -v ${bin}`, { encoding: 'utf-8' }).trim()
      if (achado) { caminhoResolvido = achado; return achado }
    } catch { /* não está no PATH */ }
  }
  caminhoResolvido = null
  return null
}

let browserPromise: Promise<Browser> | null = null

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const executablePath = acharChromium()
    if (!executablePath) {
      throw new Error('Chromium nao encontrado no servidor (defina PUPPETEER_EXECUTABLE_PATH)')
    }
    browserPromise = puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',              // obrigatório em container sem user namespaces
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',   // /dev/shm pequeno no Railway derruba o Chrome
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    })
    // Se o Chrome cair (OOM, crash), permite relançar na próxima chamada
    browserPromise
      .then(b => b.on('disconnected', () => { browserPromise = null }))
      .catch(() => { browserPromise = null })
  }
  return browserPromise
}

export interface RenderOpts {
  /** Origens cujas requisições o Chrome pode fazer (capa, logo). Resto é bloqueado. */
  origensPermitidas: string[]
  /**
   * Cabeçalho/rodapé NATIVOS do Puppeteer, repetidos de verdade em cada
   * página — usados no lugar do truque de <table><thead>/<tfoot> (que não é
   * confiável pra controle de quebra de página dentro dele; ver histórico em
   * gerarPdfServicoBrowser.ts). Quando presentes, margin.top/bottom reserva
   * exatamente a altura de cada um (54px/48px, mesma medida usada nos
   * templates) para o conteúdo não ficar por baixo.
   */
  headerTemplate?: string
  footerTemplate?: string
}

// Margem reservada pro cabeçalho/rodapé NATIVO do Puppeteer. Tem que ser
// MAIOR que a altura dos templates (54px/48px), não igual: com valores
// idênticos não sobra folga nenhuma e qualquer arredondamento de subpixel na
// paginação joga a primeira linha de conteúdo POR BAIXO da barra do
// cabeçalho — foi exatamente o que aconteceu (texto cortado ao meio no topo
// de várias páginas, achado em 2026-08-21 olhando as páginas renderizadas).
// A folga extra também serve de respiro visual entre a barra e o texto.
const MARGEM_HEADER_FOOTER = { top: '86px', right: '0', bottom: '76px', left: '0' } as const
const MARGEM_ZERO = { top: '0', right: '0', bottom: '0', left: '0' } as const

async function prepararPagina(page: Page, html: string, origensPermitidas: string[]): Promise<void> {
  // Sandbox de rede: o HTML vem do cliente, então só deixamos passar o que
  // o próprio documento precisa (imagem de capa e logo). Nada de SSRF.
  await page.setRequestInterception(true)
  page.on('request', req => {
    const url = req.url()
    if (url.startsWith('data:') || url.startsWith('about:') || url.startsWith('blob:')) {
      return req.continue()
    }
    if (origensPermitidas.some(o => url.startsWith(o))) return req.continue()
    req.abort().catch(() => {})
  })

  await page.setContent(html, { waitUntil: 'load', timeout: 30_000 })
  // O script do documento faz o cálculo de rodapé e sinaliza quando terminou.
  await page
    .waitForFunction('window.__PDF_READY__ === true', { timeout: 20_000 })
    .catch(() => { /* documento antigo sem o flag — segue mesmo assim */ })
}

export async function renderPdf(html: string, opts: RenderOpts): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await prepararPagina(page, html, opts.origensPermitidas)

    const usaHeaderFooterNativo = Boolean(opts.headerTemplate && opts.footerTemplate)

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: !usaHeaderFooterNativo,   // com header/footer nativo, margin abaixo manda
      margin: usaHeaderFooterNativo ? MARGEM_HEADER_FOOTER : MARGEM_ZERO,
      ...(usaHeaderFooterNativo ? {
        displayHeaderFooter: true,
        headerTemplate: opts.headerTemplate,
        footerTemplate: opts.footerTemplate,
      } : {}),
      timeout: 60_000,
    })
    return Buffer.from(pdf)
  } finally {
    await page.close().catch(() => {})
  }
}

/**
 * Renderiza um documento em DUAS passagens e junta o resultado num só PDF:
 * a capa (full-bleed, margin 0, sem cabeçalho/rodapé) e o restante do
 * conteúdo (com cabeçalho/rodapé NATIVOS do Puppeteer repetidos por página).
 *
 * Por quê: quando cabeçalho/rodapé nativos estão ativos, o Puppeteer reserva
 * a MESMA margem em TODA página do PDF — incluindo a capa, que é desenhada
 * pra ocupar a folha inteira (297mm) sem nenhuma margem. As duas coisas são
 * incompatíveis numa única passagem de render, por isso a capa vira um PDF
 * de 1 página à parte (sem margem) e é colada na frente do restante.
 */
export async function renderPdfComCapaSeparada(
  capaHtml: string,
  contentHtml: string,
  opts: RenderOpts,
): Promise<Buffer> {
  const browser = await getBrowser()

  const [capaPdf, contentPdf] = await Promise.all([
    (async () => {
      const page = await browser.newPage()
      try {
        await prepararPagina(page, capaHtml, opts.origensPermitidas)
        return await page.pdf({
          format: 'A4', printBackground: true, preferCSSPageSize: true,
          margin: MARGEM_ZERO,
          timeout: 60_000,
        })
      } finally {
        await page.close().catch(() => {})
      }
    })(),
    (async () => {
      const page = await browser.newPage()
      try {
        await prepararPagina(page, contentHtml, opts.origensPermitidas)
        return await page.pdf({
          format: 'A4', printBackground: true, preferCSSPageSize: false,
          margin: MARGEM_HEADER_FOOTER,
          displayHeaderFooter: true,
          headerTemplate: opts.headerTemplate ?? '<div></div>',
          footerTemplate: opts.footerTemplate ?? '<div></div>',
          timeout: 60_000,
        })
      } finally {
        await page.close().catch(() => {})
      }
    })(),
  ])

  const merged = await PDFDocument.create()
  const capaDoc = await PDFDocument.load(capaPdf)
  const contentDoc = await PDFDocument.load(contentPdf)
  const [capaPage] = await merged.copyPages(capaDoc, [0])
  merged.addPage(capaPage)
  const contentPages = await merged.copyPages(contentDoc, contentDoc.getPageIndices())
  contentPages.forEach(p => merged.addPage(p))

  return Buffer.from(await merged.save())
}

// ─── CONTRATO + PROPOSTA ANEXADA (PDF ÚNICO) ──────────────────────────────
// Junta o PDF do contrato com o PDF da proposta aceita, com uma página
// divisória "ANEXO" entre os dois — mesmo padrão de minutas reais da
// empresa, que reservam essa página pra indicar onde os anexos começam.

export interface AnexoRenderSpec {
  bodyHtml: string
  capaHtml?: string | null
  headerTemplate?: string
  footerTemplate?: string
}

async function mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create()
  for (const buf of buffers) {
    const doc = await PDFDocument.load(buf)
    const pages = await merged.copyPages(doc, doc.getPageIndices())
    pages.forEach(p => merged.addPage(p))
  }
  return Buffer.from(await merged.save())
}

const ANEXO_DIVIDER_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4; margin: 0; }
  body {
    width: 210mm; height: 297mm; display: flex; align-items: center; justify-content: center;
    font-family: Calibri, Arial, sans-serif;
  }
  h1 { font-size: 72pt; font-weight: 300; color: #1a2744; letter-spacing: 0.12em; }
</style></head><body><h1>ANEXO</h1><script>window.onload = function(){ window.__PDF_READY__ = true; };</script></body></html>`

// Renderiza uma "parte" no mesmo formato devolvido por gerarHTML/
// gerarHtmlServico com { serverSide: true } — com capa separada quando
// header/footer nativos estão presentes, ou documento único caso contrário.
async function renderAnexo(anexo: AnexoRenderSpec, opts: RenderOpts): Promise<Buffer> {
  const temHeaderFooter = Boolean(anexo.headerTemplate && anexo.footerTemplate)
  if (anexo.capaHtml && temHeaderFooter) {
    return renderPdfComCapaSeparada(anexo.capaHtml, anexo.bodyHtml, {
      ...opts, headerTemplate: anexo.headerTemplate, footerTemplate: anexo.footerTemplate,
    })
  }
  return renderPdf(anexo.bodyHtml, {
    ...opts, ...(temHeaderFooter ? { headerTemplate: anexo.headerTemplate, footerTemplate: anexo.footerTemplate } : {}),
  })
}

export async function renderPdfContratoComAnexo(
  contratoHtml: string,
  anexo: AnexoRenderSpec | null,
  opts: RenderOpts,
): Promise<Buffer> {
  // Contrato usa o próprio truque de thead/tfoot repetido (sem header/footer
  // nativo) — renderPdf simples, igual ao caminho antigo do PDF de proposta.
  const contratoPdf = await renderPdf(contratoHtml, { origensPermitidas: opts.origensPermitidas })
  if (!anexo) return contratoPdf

  const [dividerPdf, anexoPdf] = await Promise.all([
    renderPdf(ANEXO_DIVIDER_HTML, { origensPermitidas: opts.origensPermitidas }),
    renderAnexo(anexo, { origensPermitidas: opts.origensPermitidas }),
  ])
  return mergePdfBuffers([contratoPdf, dividerPdf, anexoPdf])
}
