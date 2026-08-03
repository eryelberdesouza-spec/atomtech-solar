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
import type { Browser } from 'puppeteer-core'
import { existsSync } from 'fs'
import { execSync } from 'child_process'

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
}

export async function renderPdf(html: string, opts: RenderOpts): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    // Sandbox de rede: o HTML vem do cliente, então só deixamos passar o que
    // o próprio documento precisa (imagem de capa e logo). Nada de SSRF.
    await page.setRequestInterception(true)
    page.on('request', req => {
      const url = req.url()
      if (url.startsWith('data:') || url.startsWith('about:') || url.startsWith('blob:')) {
        return req.continue()
      }
      if (opts.origensPermitidas.some(o => url.startsWith(o))) return req.continue()
      req.abort().catch(() => {})
    })

    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 })
    // O script do documento faz o cálculo de rodapé e sinaliza quando terminou.
    await page
      .waitForFunction('window.__PDF_READY__ === true', { timeout: 20_000 })
      .catch(() => { /* documento antigo sem o flag — segue mesmo assim */ })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,   // respeita o @page { size: A4; margin: 0 }
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      timeout: 60_000,
    })
    return Buffer.from(pdf)
  } finally {
    await page.close().catch(() => {})
  }
}
