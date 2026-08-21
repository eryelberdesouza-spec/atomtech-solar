// ═══════════════════════════════════════════════════════════════════
// gerarPdfServicoBrowser.ts — PDF de Proposta de Serviço Geral
// ═══════════════════════════════════════════════════════════════════

import { JOST_FONT_FACE_CSS } from './jostFontEmbed'

const fmt = (v: number | string | null | undefined): string => {
  const n = Number(v ?? 0)
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const fmtN = (v: number | string | null | undefined, dec = 3): string =>
  Number(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: dec })

const fmtDate = (s: any): string => {
  if (!s) return ''
  try {
    const str = String(s)
    if (str.includes('T') || str.includes('-')) {
      const p = str.split('T')[0].split('-'); return p[2] + '/' + p[1] + '/' + p[0]
    }
    return str
  } catch { return String(s) }
}

function renderTexto(txt: string | undefined | null): string {
  if (!txt) return ''
  // Only strip genuine list bullets (- or •), NOT ** which is bold marker
  const stripBullet = (s: string) => s.replace(/^[-•]\s*|^\*(?!\*)\s+/, '')
  const bold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  return txt.split('\n\n').map(para => {
    const lines = para.split('\n').filter(l => l.trim())
    if (!lines.length) return ''
    if (lines.every(l => /^[-•*]\s/.test(l.trimStart()) && !l.trimStart().startsWith('**'))) {
      return '<ul>' + lines.map(l => `<li>${bold(stripBullet(l.trim()))}</li>`).join('') + '</ul>'
    }
    return `<p>${bold(para.replace(/\n/g, '<br>'))}</p>`
  }).join('')
}

function renderListaNumerada(txt: string, cor1: string): string {
  const bold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  const linhas = txt.split('\n').map(l => l.trim()).filter(Boolean)
  let idx = 0
  return linhas.map(linha => {
    const linhaStrip = linha.replace(/^[-•*]\s*/, '')
    // Subtítulo: linha "**Título**" exata OU linha toda em MAIÚSCULAS — mesmo
    // com asteriscos desbalanceados digitados (ex.: "*EXCLUSÕES**"), que o
    // conversor de negrito não consome. Os asteriscos são limpos.
    const soTexto = linhaStrip.replace(/\*+/g, '').trim()
    const ehSubtitulo = soTexto.length >= 4 && soTexto.length <= 60 &&
      (/^\*\*[^*]+\*\*\s*$/.test(linhaStrip.trim()) ||
       (soTexto === soTexto.toUpperCase() && /[A-ZÁÉÍÓÚÃÕÇ]/.test(soTexto)))
    if (ehSubtitulo) {
      return `<div style="font-size:15px;font-weight:600;color:#0E2040;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid ${cor1}50;break-after:avoid;page-break-after:avoid">${soTexto}</div>`
    }
    // "-" ou "•" puro → item numerado. "- a. texto" → texto corrido (preserva "a.")
    const ehItem = /^[-•]/.test(linha) && !/^[-•]\s*[a-zA-Z]\.\s/.test(linha)
    const texto = bold(linhaStrip)
    if (ehItem) {
      idx++
      return `<div style="display:flex;gap:12px;margin-bottom:40px;align-items:flex-start;padding-bottom:20px;border-bottom:1px solid #EEF2F7;page-break-inside:avoid;break-inside:avoid">
        <span style="min-width:24px;height:24px;background:${cor1}18;color:#0E2040;border:1px solid ${cor1}40;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;margin-top:3px">${idx}</span>
        <div style="flex:1;font-size:13px;font-weight:300;color:#333;line-height:1.85">${texto}</div>
      </div>`
    }
    return `<p style="font-size:13px;font-weight:300;color:#333;line-height:1.85;margin:0 0 8px 4px">${texto}</p>`
  }).join('')
}

// Remove prefixos de lista (-, •, *, 1., a.) para o badge de letra substituir
const stripPrefix = (s: string) => s.replace(/^[-•]\s*|^\*(?!\*)\s+|^\d+\.\s*|^[a-zA-Z]\.\s*/, '')

// Cada linha não-vazia = um item independente com badge de letra (a, b, c…)
// NÃO usa agruparItens — garante que linhas sem prefixo virem itens distintos
function renderListaLetras(txt: string): string {
  const letras = 'abcdefghijklmnopqrstuvwxyz'
  const bold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  const items = txt.split('\n').map(l => l.trim()).filter(Boolean)
  if (!items.length) return ''
  return items.map((item, idx) => {
    const clean = bold(stripPrefix(item))
    return `<div style="display:flex;gap:12px;margin-bottom:6px;align-items:flex-start;padding-bottom:6px;border-bottom:1px solid #EEF2F7;page-break-inside:avoid;break-inside:avoid">
      <span style="min-width:26px;height:26px;background:#0E2040;color:#F5A623;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;margin-top:2px">${letras[idx] ?? idx + 1}</span>
      <div style="flex:1;font-size:13px;font-weight:300;color:#333;line-height:1.85;padding-top:3px">${clean}</div>
    </div>`
  }).join('')
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS_SERVICO = `
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body {
    font-family: 'Jost', 'Segoe UI', Candara, sans-serif;
    font-weight: 300; font-size: 13.5px; line-height: 1.75;
    color: #1C1C2E; background: white;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    -webkit-font-smoothing: antialiased;
  }
  p { font-size: 13.5px; font-weight: 300; color: #333; line-height: 1.85; margin-bottom: 10px; }
  strong, b { font-family: 'Jost', sans-serif; font-weight: 600; color: #0E2040; }
  ul { padding-left: 20px; margin: 8px 0 12px; }
  li { font-size: 13.5px; font-weight: 300; color: #444; line-height: 1.9; margin-bottom: 4px; }

  /* ─── CAPA — full-bleed dark cover ───────────────────────────── */
  .capa {
    width: 210mm; height: 297mm;
    position: relative; overflow: hidden;
    background: #06150f; display: block;
    page-break-after: always; break-after: page;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .capa-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
  .capa-overlay {
    position: absolute; inset: 0; z-index: 2;
    background: linear-gradient(90deg,
      rgba(3,18,13,0.96) 0%, rgba(4,28,20,0.92) 28%,
      rgba(4,28,20,0.68) 46%, rgba(4,28,20,0.18) 63%,
      rgba(4,28,20,0.00) 100%);
  }
  .capa-topinfo {
    position: absolute; z-index: 3; top: 18mm; right: 17mm;
    text-align: right; font-size: 9px; line-height: 1.4;
    color: rgba(255,255,255,0.85); letter-spacing: 0.4px;
    font-family: 'Montserrat', Calibri, sans-serif;
  }
  .capa-content {
    position: relative; z-index: 3; height: 100%; width: 54%;
    padding: 22mm 18mm 20mm 18mm;
    display: flex; flex-direction: column; justify-content: space-between;
    font-family: 'Montserrat', 'Segoe UI', Calibri, sans-serif; color: #fff;
  }
  .capa-eyebrow { font-size: 9px; letter-spacing: 5px; text-transform: uppercase; color: #f2c23b; font-weight: 600; margin-bottom: 9mm; }
  .capa-title { font-size: 32px; line-height: 1.05; font-weight: 800; text-transform: uppercase; color: #fff; margin: 0 0 8mm 0; max-width: 96mm; }
  .capa-accent { width: 18mm; height: 1.5mm; background: #f2c23b !important; margin-bottom: 9mm; border-radius: 99px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .capa-prepared { font-size: 9.5px; letter-spacing: 2.5px; text-transform: uppercase; color: rgba(255,255,255,0.8); margin-bottom: 4mm; }
  .capa-cliente { font-size: 19px; line-height: 1.14; font-weight: 800; text-transform: uppercase; max-width: 102mm; margin-bottom: 12mm; color: #fff; }
  .capa-meta { display: grid; grid-template-columns: repeat(3, auto); gap: 10mm; align-items: start; max-width: 105mm; }
  .capa-meta-label { font-size: 9px; letter-spacing: 1.6px; text-transform: uppercase; color: rgba(255,255,255,0.75); margin-bottom: 2mm; }
  .capa-meta-value { font-size: 11.5px; font-weight: 700; color: #fff; }
  .capa-footer-row { display: flex; gap: 3mm; align-items: center; color: rgba(255,255,255,0.85); font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; }
  .capa-footer-bar { width: 1.2mm; height: 8mm; background: #f2c23b !important; border-radius: 99px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* ─── TABELA DE DOCUMENTO: thead/tfoot repetem em cada página impressa */
  .doc-table {
    width: 210mm;
    border-collapse: collapse;
    border-spacing: 0;
  }
  .doc-table thead { display: table-header-group; }
  .doc-table tfoot { display: table-footer-group; } /* repete rodapé no fim de cada página, igual ao thead */
  .doc-table tbody { display: table-row-group; }
  .doc-thead-cell { padding: 0 0 10px 0; border: none; }
  .doc-tfoot-cell { padding: 0; border: none; }
  .doc-tbody-cell  { padding: 0; border: none; vertical-align: top; }

  /* ─── HEADER INTERNO (dentro do <thead>) ───────────────────────── */
  .header-interno {
    height: 54px;
    background: #0E2040;
    padding: 0 36px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .header-logo { display: flex; align-items: center; gap: 10px; }
  .header-logo-nome { font-size: 16px; font-weight: 700; color: #fff; letter-spacing: 1px; }
  .header-logo-nome span { color: #F5A623; }
  .header-logo-tag {
    font-size: 9px; font-weight: 300; color: rgba(255,255,255,0.5);
    letter-spacing: 2px; text-transform: uppercase;
    padding-left: 10px; border-left: 1px solid rgba(255,255,255,0.2);
  }
  .header-tag { font-size: 10px; font-weight: 400; color: rgba(255,255,255,0.85); letter-spacing: 2px; text-transform: uppercase; }

  /* ─── SEÇÕES DE CONTEÚDO (fluem naturalmente no tbody) ──────────── */
  .doc-content { padding: 0 36px 16px; }
  .section { margin-bottom: 32px; }
  .section + .section { margin-top: 8px; }
  .section-title {
    font-size: 17px; font-weight: 600; color: #0E2040;
    border-left: 4px solid #F5A623; padding-left: 12px;
    margin-bottom: 14px;
    page-break-after: avoid; break-after: avoid;
    page-break-inside: avoid; break-inside: avoid;
    /* line-height folgado + padding-top: quando o título abre uma página, a
       tinta dos acentos maiúsculos (o "Á" de PALÁCIO) ultrapassava o topo da
       caixa da linha e era pintada na página ANTERIOR — sobrava um acento
       solto boiando acima da barra do rodapé (visto em AT-2026-08195, p.2).
       Com espaço sobrando acima do texto, a tinta fica dentro da caixa. */
    line-height: 1.45; padding-top: 6px;
  }
  .section-divider { border: none; border-top: 1px solid #E8EDF4; margin: 12px 0; }

  /* ─── TABELA DE ITENS ──────────────────────────────────────────── */
  /* A tabela não parte no meio quando cabe inteira numa página. Sem isso ela
     quebrava deixando na página seguinte só a linha de títulos das colunas,
     sem nenhum item embaixo, e o total logo em seguida (visto em
     AT-2026-08195). break-inside:avoid é seguro mesmo com muitos itens: o
     Chrome ignora a regra quando o conteúdo não cabe numa página só e quebra
     normalmente — aí o thead repetido volta a fazer sentido. */
  .tabela-itens { width: 100%; border-collapse: collapse; margin-bottom: 14px; break-inside: avoid; page-break-inside: avoid; }
  .tabela-itens thead tr { background: #0E2040; }
  .tabela-itens thead th {
    padding: 10px 12px; text-align: left; color: #fff;
    font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .tabela-itens thead th.num { text-align: right; }
  .tabela-itens tbody tr:nth-child(odd) { background: #F8FAFD; }
  .tabela-itens tbody tr:nth-child(even) { background: #fff; }
  .tabela-itens tbody td {
    padding: 10px 12px; color: #2C3E50; font-size: 12.5px;
    border-bottom: 1px solid #EEF2F7;
  }
  .tabela-itens tbody td.num { text-align: right; }
  .tabela-itens tbody td.descricao { font-weight: 400; }
  /* Uma linha de item nunca parte no meio entre duas páginas. */
  .tabela-itens tbody tr { break-inside: avoid; page-break-inside: avoid; }
  /* <tfoot> por padrão REPETE em toda página quando a tabela quebra — o
     "Valor Total da Proposta" aparecia duas vezes, uma no fim da página e
     outra depois da continuação da tabela (visto em AT-2026-08195). Como
     aqui o tfoot é o total final e não um rodapé de continuação, ele tem que
     sair uma vez só, no fim: table-row-group o coloca em ordem normal de
     documento. O <thead> continua repetindo de propósito, pra continuação da
     tabela manter os títulos das colunas. */
  .tabela-itens tfoot { display: table-row-group; }
  .tabela-itens tfoot tr { background: #0E2040; break-inside: avoid; page-break-inside: avoid; }
  .tabela-itens tfoot td { padding: 11px 12px; color: #fff; font-size: 13px; font-weight: 500; }
  .tabela-itens tfoot td.num { text-align: right; color: #fff; font-size: 15px; font-weight: 700; }

  /* ─── CONDIÇÕES COMERCIAIS ─────────────────────────────────────── */
  .cond-card {
    border: 1px solid #E8EDF4; border-radius: 10px; overflow: hidden; margin-bottom: 14px;
    break-inside: avoid; page-break-inside: avoid;
  }
  .cond-header {
    padding: 12px 18px; background: #F5F8FC;
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid #E8EDF4;
  }
  .cond-header-title { font-size: 13px; font-weight: 600; color: #0E2040; }
  .cond-total { font-size: 15px; font-weight: 700; color: #0E2040; }
  .parcelas-table { width: 100%; border-collapse: collapse; }
  .parcelas-table td { padding: 9px 18px; font-size: 12.5px; color: #444; border-bottom: 1px solid #EEF2F7; }
  .parcelas-table td.valor { text-align: right; font-weight: 600; color: #0E2040; }
  .parcelas-table tr:last-child td { border-bottom: none; }

  /* ─── ACEITE ───────────────────────────────────────────────────── */
  /* Histórico da investigação (rodadas 1-3, ver git log) — vão gigante como
     margin (100mm) ou como div solta pra "atravessar página" (35mm) sempre
     acabava separando o texto de aceite da assinatura por uma quebra de
     página. Rodada 4 (2026-08-21): o wrapper INTEIRO do bloco Aceite e
     Assinatura (ver secAceite) agora é um único break-inside:avoid com vão
     pequeno — sem sub-blocos, sem div vazia pra "furar" a quebra. */
  .aceite-box { background: #F5F8FC; border-radius: 10px; padding: 24px; margin-bottom: 40px; }
  .assinatura-grid { display: flex; gap: 56px; }
  .assinatura-grid > div { flex: 1 1 0; }
  .assinatura-linha {
    border-top: 1px solid #333; padding-top: 10px; text-align: center;
    font-size: 12px; font-weight: 300; color: #555;
  }

  /* ─── INFO BOX ─────────────────────────────────────────────────── */
  .info-box {
    background: linear-gradient(135deg, #fff8e8, #fff3d0);
    border-left: 4px solid #F5A623;
    padding: 13px 18px; border-radius: 0 8px 8px 0; margin-bottom: 14px;
    break-inside: avoid; page-break-inside: avoid;
  }
  .info-box p { margin: 0; font-weight: 400; color: #0E2040; font-size: 13px; }
`

// @page{margin:0} SÓ pode ir na capa (full-bleed, sem cabeçalho/rodapé) e no
// fallback antigo em doc-table (cujo thead/tfoot repetido cuida do espaço em
// FLUXO normal, sem margem reservada). Achado em 2026-08-21 (rodada 8): antes
// isso estava dentro do CSS_SERVICO compartilhado — e como page.pdf() sempre
// renderiza sob @media print, essa regra também valia pro documento de
// conteúdo do caminho serverSide (rodada 7), que precisa da margem de 54px/
// 48px reservada via JS pro cabeçalho/rodapé NATIVO do Puppeteer. Com CSS
// forçando margin:0, o conteúdo era desenhado como se ocupasse a página
// inteira (sem reservar aquele espaço), enquanto o cabeçalho/rodapé nativo é
// desenhado por cima numa faixa separada — resultado: cabeçalho sobrepondo o
// início do conteúdo em toda página de continuação.
const CSS_PAGINA_MARGEM_ZERO = `
  @media print {
    body { margin: 0; }
    @page { size: A4; margin: 0; }
  }
`

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function blocoAtivo(blocos: any[], tipo: string): boolean {
  if (!blocos || blocos.length === 0) return true
  const b = blocos.find((b: any) => b.tipoBloco === tipo)
  return b ? b.ativo : false
}

function textoBloco(blocos: any[], tipo: string, textos: Record<string, any>, chaveTexto: string): string {
  const bloco = blocos?.find((b: any) => b.tipoBloco === tipo)
  if (bloco?.textoOverride) return bloco.textoOverride
  return textos?.[chaveTexto]?.conteudo ?? ''
}

function headerInterno(numero: string, nomeEmpresa: string, logoUrl?: string | null) {
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="height:32px;max-width:160px;object-fit:contain;display:block;" alt="Logo"/>`
    : `<div class="header-logo-nome">${nomeEmpresa}</div><div class="header-logo-tag">Proposta de Serviços</div>`
  return `<div class="header-interno" style="background-color:#0E2040 !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
    <div class="header-logo">${logoHtml}</div>
    <div class="header-tag">Proposta de Serviços &middot; ${numero}</div>
  </div>`
}

function footerServico(numero: string, empresa: any) {
  const partes = [
    empresa?.nome,
    empresa?.cidade ? `${empresa.cidade}/${empresa.estado ?? ''}` : null,
    empresa?.email,
    empresa?.telefone,
  ].filter(Boolean).join(' · ')
  return `<div style="width:100%;height:48px;background-color:#0E2040;padding:0 36px;display:flex;align-items:center;justify-content:space-between;">
    <div style="font-size:11px;font-weight:400;color:rgba(255,255,255,0.92);font-family:inherit;">${partes}</div>
    <div style="font-size:10px;color:rgba(255,255,255,0.8);font-family:inherit;">${numero}</div>
  </div>`
}

function sec(titulo: string, conteudo: string): string {
  return `<div class="section"><div class="section-title">${titulo}</div>${conteudo}</div>`
}

// ─── HEADER/FOOTER NATIVOS (Puppeteer headerTemplate/footerTemplate) ──────────
// Rodada 7 (2026-08-21): o truque de <table><thead>/<tfoot> pra "repetir"
// cabeçalho/rodapé por página impressa se provou definitivamente não confiável
// pra controle de quebra de página dentro dela (break-before, break-inside e
// até medição em JS com colchão de segurança falharam em produção — proposta
// AT-2026-08195, bloco de assinatura separado do contato mesmo com margem de
// segurança de 60px). Como o PDF já é gerado no servidor via Puppeteer, dá pra
// usar o mecanismo NATIVO do Chrome pra cabeçalho/rodapé repetido por página
// (page.pdf({headerTemplate, footerTemplate})) — aí o conteúdo flui em bloco
// normal (fora de tabela) e break-inside:avoid volta a ser confiável de
// verdade, do jeito que é em qualquer documento HTML comum.
// IMPORTANTE: headerTemplate/footerTemplate rodam isolados — SEM acesso ao
// <style> do documento principal. Estilo 100% inline aqui.
function headerTemplateServico(numero: string, nomeEmpresa: string, logoUrl?: string | null) {
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="height:28px;max-width:140px;object-fit:contain;display:block;" alt="Logo"/>`
    : `<div style="font-size:13px;font-weight:700;color:#fff;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">${nomeEmpresa}</div>`
  return `
    <div style="width:100%;height:54px;background:#0E2040;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:0 36px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;margin:0;font-family:Arial,Helvetica,sans-serif;">
      <div>${logoHtml}</div>
      <div style="font-size:9px;font-weight:400;color:rgba(255,255,255,0.85);letter-spacing:1.5px;text-transform:uppercase;">Proposta de Serviços &middot; ${numero}</div>
    </div>`
}

function footerTemplateServico(numero: string, empresa: any) {
  const partes = [
    empresa?.nome,
    empresa?.cidade ? `${empresa.cidade}/${empresa.estado ?? ''}` : null,
    empresa?.email,
    empresa?.telefone,
  ].filter(Boolean).join(' &middot; ')
  return `
    <div style="width:100%;height:48px;background:#0E2040;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:0 36px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;margin:0;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:11px;font-weight:400;color:rgba(255,255,255,0.92);">${partes}</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.8);">${numero}</div>
    </div>`
}

// ─── GERADOR PRINCIPAL ───────────────────────────────────────────────────────

// Monta o HTML completo da proposta de serviço.
// `autoPrint: false` é usado na geração server-side (Chrome headless), onde o
// PDF sai do page.pdf() e não do diálogo de impressão.
export function gerarHtmlServico(data: any, opts: { autoPrint?: boolean; serverSide?: boolean } = {}): any {
  const autoPrint = opts.autoPrint !== false
  const serverSide = opts.serverSide === true
  const { proposta, itensServico, condicoesComerciais, blocos, empresa, textos, cliente } = data

  const cor1 = empresa?.corPrimaria ?? '#F5A623'
  const cor2 = empresa?.corSecundaria ?? '#2D9C4E'
  const nomeEmpresa = empresa?.nome ?? 'Atom Tech'
  const logoUrl = empresa?.logoUrl ?? null
  const nomeCliente = cliente?.nome ?? proposta?.clienteNome ?? 'Cliente'
  const tituloServico = proposta?.tituloServico ?? 'Proposta de Serviços'
  const numero = proposta?.numero ?? ''
  const dataEmissao = fmtDate(proposta?.dataEmissao)
  const dataValidade = proposta?.dataValidade ? fmtDate(proposta.dataValidade) : null
  const totalGeral = (itensServico ?? []).reduce((s: number, i: any) => s + Number(i.valorTotal), 0)
  const prazoExecucao = proposta?.prazoExecucao ?? null
  const condsAtivas = (condicoesComerciais ?? []).filter((c: any) => c.ativa !== false)

  const H = (n: string) => headerInterno(n, nomeEmpresa, logoUrl)
  const F = (n: string) => footerServico(n, empresa)

  // ── CAPA ─────────────────────────────────────────────────────────
  const capaImgServico  = (data as any).capaImg as string | undefined
  const bgUrlServico    = capaImgServico
    ? `${window.location.origin}/assets/covers/${capaImgServico}.png`
    : null

  let capaHtml = ''
  if (blocoAtivo(blocos, 'capa')) {
    capaHtml = `
    <div class="capa">
      ${bgUrlServico ? `<img class="capa-bg" src="${bgUrlServico}" alt="" onerror="this.style.display='none'"/>` : ''}
      <div class="capa-overlay"></div>
      <div class="capa-topinfo">
        ${empresa?.cidade ? `${empresa.cidade}/${empresa.estado ?? 'DF'}` : 'Brasília/DF'}<br>
        ${numero}
      </div>
      <div class="capa-content">
        <header>
          ${logoUrl
            ? `<img src="${logoUrl}" style="width:48mm;height:auto;object-fit:contain;" alt="Logo"/>`
            : `<div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:2px;line-height:1.1;"><span style="color:#f2c23b;">${nomeEmpresa.split(' ')[0]}</span>${nomeEmpresa.split(' ').slice(1).join(' ')}</div>
               <div style="font-size:9px;font-weight:400;color:rgba(255,255,255,0.5);letter-spacing:5px;text-transform:uppercase;margin-top:4px;">Engenharia &amp; Tecnologia</div>`
          }
        </header>
        <main>
          <div class="capa-eyebrow">Proposta Comercial</div>
          <h1 class="capa-title">${tituloServico}</h1>
          <div class="capa-accent"></div>
          <div class="capa-prepared">Preparado exclusivamente para</div>
          <div class="capa-cliente">${nomeCliente}</div>
          <div class="capa-meta">
            <div>
              <div class="capa-meta-label">Data</div>
              <div class="capa-meta-value">${dataEmissao}</div>
            </div>
            ${dataValidade ? `<div>
              <div class="capa-meta-label">Válida até</div>
              <div class="capa-meta-value">${dataValidade}</div>
            </div>` : ''}
            <div>
              <div class="capa-meta-label">Proposta</div>
              <div class="capa-meta-value">${numero}</div>
            </div>
          </div>
        </main>
        <footer class="capa-footer-row">
          <div class="capa-footer-bar"></div>
          <div>Engenharia &bull; Energia &bull; Tecnologia</div>
        </footer>
      </div>
    </div>`
  }

  // ── CONTEÚDO (flui naturalmente, thead repete em cada página) ─────
  const tipoLabel: Record<string, string> = {
    avista: 'À Vista', parcelado_marcos: 'Parcelado por Marcos', financiamento: 'Financiamento', cartao: 'Cartão de Crédito',
  }

  // Cada bloco vira uma string nomeada (em vez de acumular direto em `sections`)
  // para permitir duas ordens de montagem — clássica e "Direto ao Ponto" — sem
  // duplicar a lógica de conteúdo de cada bloco.

  // Apresentação + Diferenciais
  const temApres = blocoAtivo(blocos, 'apresentacao_empresa')
  const temDif   = blocoAtivo(blocos, 'diferenciais')
  let secApresentacao = ''
  let secDiferenciais = ''
  if (temApres || temDif) {
    const txtApres = textoBloco(blocos, 'apresentacao_empresa', textos ?? {}, 'apresentacao_empresa')
    const txtDif   = textoBloco(blocos, 'diferenciais', textos ?? {}, 'diferenciais')
    const defaultApres = `<p>${nomeEmpresa} é uma empresa especializada em soluções técnicas e de engenharia, com foco em qualidade, segurança e satisfação do cliente. Nossa equipe atua com comprometimento em cada etapa do projeto, do planejamento à entrega final.</p>`
    const defaultDif   = `<ul>
      <li>Equipe técnica qualificada e certificada</li>
      <li>Materiais de alta qualidade com garantia do fabricante</li>
      <li>Pontualidade e comprometimento com prazos combinados</li>
      <li>Atendimento personalizado e suporte pós-serviço</li>
      <li>Orçamento transparente sem custos ocultos</li>
    </ul>`
    if (temApres) secApresentacao = sec('Quem Somos', renderTexto(txtApres) || defaultApres)
    if (temDif)   secDiferenciais = sec('Por que nos escolher?', renderTexto(txtDif) || defaultDif)
  }

  // Como Funciona + Regulamentação
  const temCF  = blocoAtivo(blocos, 'como_funciona')
  const temReg = blocoAtivo(blocos, 'regulamentacao')
  let secComoFunciona = ''
  let secRegulamentacao = ''
  if (temCF) {
    const txt = textoBloco(blocos, 'como_funciona', textos ?? {}, 'como_funciona')
    secComoFunciona = sec('Como Funciona', renderTexto(txt) || '<p>Informações sobre o funcionamento do serviço proposto.</p>')
  }
  if (temReg) {
    const txt = textoBloco(blocos, 'regulamentacao', textos ?? {}, 'regulamentacao')
    secRegulamentacao = sec('Regulamentação', renderTexto(txt) || '<p>O serviço é prestado em conformidade com as normas técnicas e legislação vigente aplicáveis.</p>')
  }

  // Fornecedores
  let secFornecedores = ''
  if (blocoAtivo(blocos, 'fornecedores')) {
    const txt = textoBloco(blocos, 'fornecedores', textos ?? {}, 'fornecedores')
    secFornecedores = sec('Fornecedores e Parceiros', renderTexto(txt) || '<p>Trabalhamos com fornecedores homologados que atendem aos mais altos padrões de qualidade e procedência.</p>')
  }

  // O que Propomos Entregar
  const temEntregas = blocoAtivo(blocos, 'escopo_entregas')
  const txtEntregas = textoBloco(blocos, 'escopo_entregas', textos ?? {}, 'escopo_entregas')
  let secEntregas = ''
  if (temEntregas && txtEntregas) {
    secEntregas = sec('O que Propomos Entregar', renderListaLetras(txtEntregas))
  }

  // Escopo do Serviço (tabela de itens)
  const temEscopo = blocoAtivo(blocos, 'escopo_servico')
  let secEscopo = ''
  if (temEscopo) {
    const itens = itensServico ?? []
    secEscopo = sec(tituloServico, `
      <table class="tabela-itens">
        <thead>
          <tr>
            <th style="width:36px">#</th><th>Descrição</th>
            <th class="num" style="width:52px">Un.</th>
            <th class="num" style="width:70px">Qtd.</th>
            <th class="num" style="width:100px">Valor Unit.</th>
            <th class="num" style="width:110px">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itens.map((item: any, idx: number) => `
          <tr>
            <td style="color:#5F708C;font-size:11px;text-align:center">${idx + 1}</td>
            <td class="descricao">${item.descricao}</td>
            <td class="num">${item.unidade ?? 'un'}</td>
            <td class="num">${fmtN(item.quantidade)}</td>
            <td class="num">${fmt(item.valorUnitario)}</td>
            <td class="num" style="font-weight:600">${fmt(item.valorTotal)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr><td colspan="5">Valor Total da Proposta</td><td class="num">${fmt(totalGeral)}</td></tr>
        </tfoot>
      </table>
      ${prazoExecucao ? `<div class="info-box"><p><strong>⏱ Prazo de Execução:</strong> ${prazoExecucao}</p></div>` : ''}
      <p style="font-size:11px;color:#5F708C;margin-top:4px">* Valores em Reais (BRL). Proposta válida até ${dataValidade ?? '—'}.</p>
    `)
  }

  // Condições de Pagamento
  // Leva com o valor total em destaque ANTES do detalhamento — pedido do
  // usuário em 2026-08-14: o valor "aparecia no meio" do card da condição,
  // sem antes ter sido apresentado como manchete. Mesmo padrão já usado no
  // PDF solar (highlight-box com "Investimento Total" antes da quebra em
  // formas de pagamento).
  const temConds = blocoAtivo(blocos, 'condicoes_comerciais') && condsAtivas.length > 0
  let secCondicoes = ''
  if (temConds) {
    secCondicoes = sec('Condições de Pagamento', `
      <div class="info-box" style="margin-bottom:14px"><p><strong>Valor Total:</strong> ${fmt(totalGeral)}</p></div>
    ` + condsAtivas.map((cond: any) => {
      const parcelas = cond.parcelas ?? []
      return `<div class="cond-card">
        <div class="cond-header">
          <div class="cond-header-title">${tipoLabel[cond.tipo] ?? cond.tipo}${cond.descricao ? ` — ${cond.descricao}` : ''}</div>
          <div class="cond-total">${fmt(cond.valorTotal)}</div>
        </div>
        ${parcelas.length > 0 ? `<table class="parcelas-table">
          ${parcelas.map((p: any) => `<tr>
            <td style="color:#0E2040;font-weight:600;width:28px">${p.numeroParcela}.</td>
            <td>${p.descricaoEvento}</td>
            <td style="color:#5F708C;font-size:11px">${p.prazoDias > 0 ? `${p.prazoDias} dias ${p.tipoPrazo ?? 'corridos'}` : 'Na assinatura'}</td>
            <td class="valor">${fmt(p.valor)}</td>
          </tr>`).join('')}
        </table>` : ''}
      </div>`
    }).join(''))
  }

  // Garantias
  let secGarantias = ''
  if (blocoAtivo(blocos, 'garantias')) {
    const txtGar = textoBloco(blocos, 'garantias', textos ?? {}, 'garantias')
    const defaultGar = `- Todos os serviços executados possuem garantia conforme a legislação vigente e as especificações técnicas dos fabricantes dos materiais utilizados.
- Nosso compromisso vai além da entrega — estamos presentes no pós-serviço para qualquer suporte necessário.`
    secGarantias = sec('Garantias Inclusas', renderListaNumerada(txtGar || defaultGar, cor1))
  }

  // Resumo da Proposta (modelo Direto ao Ponto) — cliente e o que estamos
  // propondo, logo após a capa, sem esperar o cliente passar por conteúdo
  // institucional para chegar até aqui. É a ÚNICA seção de escopo qualitativo
  // deste modelo (substitui "O que Propomos Entregar", que ficava redundante
  // logo abaixo) e NÃO repete o valor — o valor aparece uma única vez, na
  // tabela de itens que vem em seguida.
  let secResumo = ''
  if (blocoAtivo(blocos, 'resumo_proposta')) {
    const resumoEscopo = txtEntregas
      ? renderListaLetras(txtEntregas)
      : '<p>Escopo detalhado a seguir.</p>'
    secResumo = sec('Resumo da Proposta', `
      <div class="cond-card" style="margin-bottom:16px"><div class="cond-header-title">Cliente</div><p style="margin-top:4px;font-size:14px;font-weight:600;color:#0E2040">${nomeCliente}</p></div>
      <div class="info-box"><p><strong>O que estamos propondo:</strong></p>${resumoEscopo}</div>
      <p style="font-size:12px;color:#5F708C;margin-top:10px">Valor e condições de pagamento a seguir.</p>
    `)
  }

  // Observações Complementares
  let secObservacoes = ''
  if (blocoAtivo(blocos, 'observacoes_complementares')) {
    const bloco = (blocos ?? []).find((b: any) => b.tipoBloco === 'observacoes_complementares')
    const txtObs = bloco?.textoOverride?.trim() || ''
    if (txtObs) {
      secObservacoes = sec('Observações Complementares', renderTexto(txtObs))
    }
  }

  // Considerações Gerais
  const DEFAULT_CONSIDERACOES = `- **Atendimento:** Prestado em horário comercial, de segunda a sexta-feira das 8h às 18h.
- **Autoria do Orçamento:** Este documento é de uso exclusivo desta negociação e não deve ser repassado a terceiros.
- **Encargos e Taxas:** Eventuais taxas, licenças ou liberações necessárias são de responsabilidade do contratante.
- **Etapa Única:** Os serviços serão executados de forma contínua e em etapa única, salvo acordo formal em contrário.
- **Garantia:** Os serviços executados possuem garantia de 12 (doze) meses contra defeitos de execução e mão de obra, conforme estabelecido no contrato.
- **Horário Comercial:** A execução ocorrerá em horário comercial; serviços noturnos ou em fins de semana serão cobrados à parte.`

  let secConsideracoes = ''
  if (blocoAtivo(blocos, 'consideracoes_gerais')) {
    const fixedTxt   = (textos ?? {})?.['consideracoes_gerais']?.conteudo || DEFAULT_CONSIDERACOES
    const customBloco = (blocos ?? []).find((b: any) => b.tipoBloco === 'consideracoes_gerais')
    const customTxt  = customBloco?.textoOverride?.trim() || ''
    secConsideracoes = sec('LEIA COM ATENÇÃO — Informações Importantes', renderListaNumerada(customTxt || fixedTxt, cor1))
  }

  // Aceite + Contato
  const temAceite  = blocoAtivo(blocos, 'aceite')
  const temContato = blocoAtivo(blocos, 'contato')
  let secAceite = ''
  if (temAceite) {
    // display:grid aqui já causou o bloco quebrar sozinho pra outra página
    // mesmo dentro de um ancestral break-inside:avoid (bug conhecido do
    // Chromium: containers CSS Grid fragmentam ignorando break-inside:avoid
    // herdado do pai — a paginação corta bem na borda do grid). flexbox com
    // wrap não tem esse problema e respeita a quebra do bloco pai.
    const contatoInline = temContato ? `
      <div style="display:flex;flex-wrap:wrap;gap:10px 20px;margin-top:32px;padding-top:24px;border-top:1px solid #E8EEF5">
        ${empresa?.cnpj ? `<div style="flex:1 1 40%">
          <p style="color:#5F708C;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px">CNPJ</p>
          <p style="font-size:14px;font-weight:600;color:#0E2040;margin:0">${empresa.cnpj}</p>
        </div>` : ''}
        ${empresa?.telefone ? `<div style="flex:1 1 40%">
          <p style="color:#5F708C;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px">Telefone</p>
          <p style="font-size:14px;font-weight:600;color:#0E2040;margin:0">${empresa.telefone}</p>
        </div>` : ''}
        ${empresa?.email ? `<div style="flex:1 1 40%">
          <p style="color:#5F708C;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px">E-mail</p>
          <p style="font-size:14px;font-weight:600;color:#0E2040;margin:0">${empresa.email}</p>
        </div>` : ''}
        ${empresa?.site ? `<div style="flex:1 1 40%">
          <p style="color:#5F708C;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px">Site</p>
          <p style="font-size:14px;font-weight:600;color:#0E2040;margin:0">${empresa.site}</p>
        </div>` : ''}
        ${empresa?.endereco ? `<div style="flex:1 1 100%;margin-top:2px">
          <p style="color:#5F708C;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px">Endereço</p>
          <p style="font-size:14px;font-weight:600;color:#0E2040;margin:0">${empresa.endereco}${empresa.cidade ? `, ${empresa.cidade}/${empresa.estado}` : ''}</p>
        </div>` : ''}
      </div>` : ''
    // Achado em 2026-08-21 (4ª e 5ª rodadas): break-before:page E
    // break-inside:avoid em <div> aninhado dentro da <td> gigante do
    // doc-table (usada pra repetir thead/tfoot em cada página impressa) NÃO
    // são confiáveis — motores de impressão do Chrome não garantem essas
    // quebras nesse contexto específico de tabela. O bloco de aceite podia
    // renderizar com o texto numa página e a assinatura/contato quase uma
    // página inteira depois, com um vão enorme no meio — break-inside:avoid
    // simplesmente não "segurava" o bloco junto.
    // Solução definitiva (rodada 5): parar de confiar em CSS de quebra de
    // página aqui. O bloco carrega um id (#pdf-aceite-bloco) e o script no
    // fim do documento MEDE em runtime se ele cabe inteiro no espaço
    // restante da página atual; se não couber, insere um margin-top exato
    // pra empurrar o bloco INTEIRO pro topo da próxima página impressa.
    // Ver bloco "Empurra o Aceite" no <script> mais abaixo.
    secAceite = sec('Aceite e Assinatura', `
      <div id="pdf-aceite-bloco" style="break-inside:avoid;page-break-inside:avoid">
        <div class="aceite-box">
          <p>Ao assinar este documento, o contratante declara estar de acordo com todos os termos, condições, escopo de serviços e valores descritos nesta proposta comercial.</p>
          <p style="margin-top:10px"><strong>Proposta:</strong> ${numero} &nbsp;&nbsp; <strong>Valor Total:</strong> ${fmt(totalGeral)}</p>
          <p><strong>Cliente:</strong> ${nomeCliente}</p>
        </div>
        <div class="assinatura-grid">
          <div>
            <div class="assinatura-linha">Contratante — ${nomeCliente}</div>
            <p style="text-align:center;font-size:11px;color:#999;margin-top:8px">Data: ___/___/______</p>
          </div>
          <div>
            <div class="assinatura-linha">Contratada — ${nomeEmpresa}</div>
            <p style="text-align:center;font-size:11px;color:#999;margin-top:8px">Data: ___/___/______</p>
          </div>
        </div>
        ${contatoInline}
      </div>
    `)
  }

  // Modelo "Direto ao Ponto": cliente/escopo/investimento/pagamento/aceite logo
  // no início — institucional vira material de apoio no final.
  // Direto ao Ponto: Resumo já cobre o escopo qualitativo (não repete
  // secEntregas — ver comentário acima). Aceite fica sempre por último, depois
  // de todo o conteúdo de apoio — assinar é o ato final, não algo que acontece
  // antes do cliente ver garantias/institucional. Apresentação (Quem Somos)
  // vem antes de Diferenciais (Por que nos escolher), mesma ordem lógica do
  // modelo Clássico: primeiro diz quem é, depois por que escolher.
  const sections = proposta?.modeloProposta === 'direto_ao_ponto'
    ? `${secResumo}${secEscopo}${secCondicoes}${secGarantias}${secApresentacao}${secDiferenciais}${secComoFunciona}${secRegulamentacao}${secFornecedores}${secObservacoes}${secConsideracoes}${secAceite}`
    : `${secApresentacao}${secDiferenciais}${secComoFunciona}${secRegulamentacao}${secFornecedores}${secEntregas}${secEscopo}${secCondicoes}${secGarantias}${secObservacoes}${secConsideracoes}${secAceite}`

  const footerHtml = footerServico(numero, empresa)
  const headerHtml = headerInterno(numero, nomeEmpresa, logoUrl)

  // ── Rodada 7: caminho server-side com header/footer NATIVOS do Puppeteer ──
  // Sem doc-table, sem thead/tfoot repetido via truque de CSS — conteúdo em
  // fluxo normal, onde break-inside:avoid (já presente em #pdf-aceite-bloco
  // e nos outros blocos protegidos) funciona de verdade. Nenhuma medição em
  // JS de posição de página é mais necessária.
  if (serverSide) {
    const estiloComum = `<style>${JOST_FONT_FACE_CSS}</style><style>${CSS_SERVICO.replace(/#F5A623/g, cor1).replace(/#2D9C4E/g, cor2)}</style>`
    const scriptEsperaFontes = `<script>
      window.onload = function() {
        var esperarFontes = Promise.all([
          document.fonts.load('300 13px Jost'), document.fonts.load('400 13px Jost'),
          document.fonts.load('500 13px Jost'), document.fonts.load('600 13px Jost'),
          document.fonts.load('700 13px Jost'), document.fonts.load('800 13px Jost'),
          document.fonts.load('900 13px Jost'),
        ]).then(function() { return document.fonts.ready })
        var timeoutFontes = new Promise(function(res) { setTimeout(res, 5000) })
        Promise.race([esperarFontes, timeoutFontes]).then(function() {
          setTimeout(function() { window.__PDF_READY__ = true; }, 200);
        });
      };
    </script>`

    // Capa (se ativa) vira um DOCUMENTO PRÓPRIO — página cheia (297mm), sem
    // margem, sem cabeçalho/rodapé. O restante do conteúdo é outro documento,
    // com cabeçalho/rodapé nativos do Puppeteer reservando margem em toda
    // página. A API renderiza os dois separadamente e cola a capa na frente
    // (ver renderPdfComCapaSeparada) — não dá pra misturar os dois num único
    // page.pdf(), porque a margem reservada pro cabeçalho/rodapé se aplicaria
    // também na capa, cortando o full-bleed dela.
    const capaDocHtml = capaHtml
      ? `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">${estiloComum}<style>${CSS_PAGINA_MARGEM_ZERO}</style></head><body>${capaHtml}${scriptEsperaFontes}</body></html>`
      : null

    const bodyHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proposta ${numero} — ${nomeCliente}</title>
  ${estiloComum}
</head>
<body>
  ${sections ? `<div class="doc-content">${sections}</div>` : ''}
  ${scriptEsperaFontes}
</body>
</html>`
    return {
      bodyHtml,
      capaHtml: capaDocHtml,
      headerTemplate: headerTemplateServico(numero, nomeEmpresa, logoUrl),
      footerTemplate: footerTemplateServico(numero, empresa),
    }
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proposta ${numero} — ${nomeCliente}</title>
  <style>${JOST_FONT_FACE_CSS}</style>
  <style>${CSS_SERVICO.replace(/#F5A623/g, cor1).replace(/#2D9C4E/g, cor2)}</style>
  <style>${CSS_PAGINA_MARGEM_ZERO}</style>
</head>
<body>
  ${capaHtml}
  ${sections ? `
  <table class="doc-table">
    <thead><tr><td class="doc-thead-cell">${headerHtml}</td></tr></thead>
    <tfoot><tr><td class="doc-tfoot-cell">${footerHtml}</td></tr></tfoot>
    <tbody><tr><td class="doc-tbody-cell">
      <div class="doc-content">${sections}</div>
    </td></tr></tbody>
  </table>` : ''}
  <script>
    window.onload = function() {
      // Espera a fonte Jost carregar de verdade antes de imprimir/renderizar.
      var esperarFontes = Promise.all([
        document.fonts.load('300 13px Jost'),
        document.fonts.load('400 13px Jost'),
        document.fonts.load('500 13px Jost'),
        document.fonts.load('600 13px Jost'),
        document.fonts.load('700 13px Jost'),
        document.fonts.load('800 13px Jost'),
        document.fonts.load('900 13px Jost'),
      ]).then(function() { return document.fonts.ready })
      var timeoutFontes = new Promise(function(res) { setTimeout(res, 5000) })
      Promise.race([esperarFontes, timeoutFontes]).then(function() {
      setTimeout(function() {
        // Empurra o Aceite pro topo da próxima página se ele não couber com
        // folga no espaço restante da página atual. break-inside:avoid (CSS,
        // no elemento) fica como primeira linha de defesa, mas rodada 5
        // mostrou (proposta AT-2026-08195) que ele sozinho não é suficiente
        // dentro do doc-table — por isso a medição em runtime é a proteção
        // principal, com um colchão de segurança generoso (BUFFER) em vez de
        // matemática de pixel exato: é preferível empurrar um pouco cedo
        // demais (sobra um respiro no fim da página anterior) do que deixar
        // por conta do motor de impressão decidir onde cortar — foi
        // exatamente essa decisão do motor que separou a grade de assinatura
        // do bloco de contato, com o texto de aceite ainda "cabendo" pelas
        // contas mas o conjunto se partindo do mesmo jeito.
        try {
          var contentM = document.querySelector('.doc-content');
          var theadM   = document.querySelector('.doc-table thead');
          var tfootM   = document.querySelector('.doc-table tfoot');
          var aceite   = document.getElementById('pdf-aceite-bloco');
          if (contentM && theadM && tfootM && aceite) {
            var pageHM   = Math.round(297 * 96 / 25.4);
            var availHM  = pageHM - theadM.offsetHeight - tfootM.offsetHeight;
            var BUFFER   = 60; // colchão de segurança em px — melhor sobrar respiro que arriscar corte
            var blockH   = aceite.offsetHeight;
            if (availHM > 0 && blockH > 0) {
              var offsetTop = aceite.getBoundingClientRect().top - contentM.getBoundingClientRect().top;
              var posInPage = ((offsetTop % availHM) + availHM) % availHM; // sempre positivo
              var alturaEfetiva = Math.min(blockH, availHM); // nunca empurra além do que cabe numa pagina inteira
              if (posInPage + alturaEfetiva + BUFFER > availHM) {
                aceite.style.marginTop = (availHM - posInPage + BUFFER) + 'px';
              }
            }
          }
        } catch(e) {}
        // Empurra o tfoot ao pé da última página calculando o espaço restante
        try {
          var content  = document.querySelector('.doc-content');
          var thead    = document.querySelector('.doc-table thead');
          var tfoot    = document.querySelector('.doc-table tfoot');
          if (content && thead && tfoot) {
            var pageH   = Math.round(297 * 96 / 25.4); // 297mm em px a 96dpi ≈ 1122px
            var theadH  = thead.offsetHeight;
            var tfootH  = tfoot.offsetHeight;
            var availH  = pageH - theadH - tfootH;
            var contentH = content.scrollHeight;
            if (availH > 0) {
              // Espaco vazio sobrando na ULTIMA pagina = quanto empurrar o rodape ate o pe
              var remainder = contentH % availH;
              // Achado em 2026-08-14: quando o conteudo transborda so uma FRACAO
              // pequena pra pagina seguinte (ex.: poucas linhas do Aceite), o
              // "remainder" fica minusculo e "fill" vira quase uma pagina INTEIRA
              // de padding — resultado: uma pagina em branco no fim do PDF. So
              // preenche quando a ultima pagina ja tem conteudo substancial
              // (>25% da altura util); caso contrario deixa o rodape logo apos
              // o conteudo mesmo, sem tentar colar no pe da pagina.
              var fill = remainder > availH * 0.25 ? (availH - remainder) : 0;
              // -12px de margem de seguranca evita transbordar e gerar pagina em branco
              if (fill > 24) {
                content.style.paddingBottom = (16 + fill - 12) + 'px';
              }
            }
          }
        } catch(e) {}
        // Sinaliza ao Chrome headless que o layout terminou (geração no servidor)
        window.__PDF_READY__ = true;
        ${autoPrint ? 'window.print();' : ''}
      }, 300);
      });
    };
  </script>
</body>
</html>`

  return fullHtml
}

export function abrirPdfServicoNoNavegador(data: any, winParam?: Window | null): void {
  const fullHtml = gerarHtmlServico(data, { autoPrint: true })
  const win = winParam ?? window.open('', '_blank')
  if (!win) { alert('Permita popups para este site e tente novamente.'); return }
  win.document.write(fullHtml)
  win.document.close()
}
