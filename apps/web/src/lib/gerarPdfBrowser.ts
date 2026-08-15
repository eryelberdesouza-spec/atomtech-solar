// ═══════════════════════════════════════════════════════════════════
// gerarPdfBrowser.ts — Geração de PDF via window.print()
// Inclui: nome do cliente em destaque, fluxo de caixa 25 anos
// ═══════════════════════════════════════════════════════════════════

const formatCurrency = (v: number | string | null | undefined): string => {
  const n = Number(v ?? 0)
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const formatKwh = (v: number | string | null | undefined): string =>
  `${Number(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh`
const formatPayback = (meses: number): string => {
  const anos = Math.floor(meses / 12); const m = meses % 12
  if (anos === 0) return `${m} meses`
  if (m === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`
  return `${anos}a ${m}m`
}
const formatDate = (s: any): string => {
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
  const bold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  return txt.split('\n\n').map(para => {
    const lines = para.split('\n').filter(l => l.trim())
    if (!lines.length) return ''
    if (lines.every(l => l.trimStart().startsWith('- '))) {
      return '<ul>' + lines.map(l => `<li>${bold(l.replace(/^\s*-\s*/, ''))}</li>`).join('') + '</ul>'
    }
    return `<p>${bold(para.replace(/\n/g, '<br>'))}</p>`
  }).join('')
}

const CSS = `
  /* ─── RESET ──────────────────────────────────────────────────── */
  * { box-sizing: border-box; margin: 0; padding: 0; }

  /* ─── TIPOGRAFIA ─────────────────────────────────────────────── */
  body {
    font-family: 'Calibri Light', Calibri, Candara, 'Segoe UI', 'Trebuchet MS', sans-serif;
    font-weight: 300;
    font-size: 15px;
    line-height: 1.75;
    color: #1C1C2E;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    -webkit-font-smoothing: antialiased;
  }
  p {
    font-size: 15px;
    font-weight: 300;
    color: #333;
    line-height: 1.8;
    margin-bottom: 10px;
  }
  strong, b {
    font-family: Calibri, Candara, 'Segoe UI', sans-serif;
    font-weight: 600;
    color: #0E2040;
  }
  ul { padding-left: 20px; margin: 8px 0 12px; }
  li { font-size: 15px; font-weight: 300; color: #444; line-height: 1.9; }

  /* ─── FOLHA A4 ────────────────────────────────────────────────── */
  /* Cada folha é uma <table>: o Chrome repete thead no topo e tfoot no pé
     de CADA página impressa quando o conteúdo transborda — é o que garante
     cabeçalho/rodapé íntegros com conteúdo de tamanho variável (mesma
     técnica do gerarPdfServicoBrowser.ts).
     IMPORTANTE: a tabela NÃO pode ter height fixo (impede a fragmentação e
     o thead deixa de repetir) e o break-after precisa ficar no div wrapper
     (o Chrome ignora break-after em <table>). O rodapé é colado no pé da
     última página via preenchimento medido em JS antes do print. */
  .sheet-wrap { page-break-after: always; break-after: page; }
  .sheet-wrap:last-of-type { page-break-after: auto; break-after: auto; }
  table.sheet {
    width: 210mm;
    border-collapse: collapse;
    border-spacing: 0;
  }
  table.sheet > thead { display: table-header-group; }
  table.sheet > tfoot { display: table-footer-group; }
  table.sheet > thead > tr > td,
  table.sheet > tfoot > tr > td,
  table.sheet > tbody > tr > td {
    padding: 0; border: none; background: transparent; text-align: left;
  }
  table.sheet > tbody > tr > td { vertical-align: top; }

  /* ─── CAPA ────────────────────────────────────────────────────── */
  .capa {
    width: 210mm; height: 297mm;
    position: relative; overflow: hidden;
    background: #06150f;
    display: block;
    page-break-after: always; break-after: page;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .capa-bg {
    position: absolute; inset: 0;
    width: 100%; height: 100%; object-fit: cover; z-index: 1;
  }
  .capa-overlay {
    position: absolute; inset: 0; z-index: 2;
    background: linear-gradient(90deg,
      rgba(3,18,13,0.96) 0%, rgba(4,28,20,0.92) 28%,
      rgba(4,28,20,0.68) 46%, rgba(4,28,20,0.18) 63%,
      rgba(4,28,20,0.00) 100%
    );
  }
  .capa-topinfo {
    position: absolute; z-index: 3;
    top: 18mm; right: 17mm;
    text-align: right; font-size: 9.5px; line-height: 1.4;
    color: rgba(255,255,255,0.62); letter-spacing: 0.4px;
    font-family: 'Montserrat', Calibri, sans-serif;
  }
  .capa-content {
    position: relative; z-index: 3;
    height: 100%; width: 54%;
    padding: 22mm 18mm 20mm 18mm;
    display: flex; flex-direction: column; justify-content: space-between;
    font-family: 'Montserrat', 'Segoe UI', Calibri, sans-serif;
    color: #fff;
  }
  .capa-logo { width: 48mm; height: auto; object-fit: contain; }
  .capa-logo-text { font-size: 20px; font-weight: 900; color: #fff; letter-spacing: 2px; line-height: 1.1; }
  .capa-logo-sub { font-size: 10px; font-weight: 400; color: rgba(255,255,255,0.75); letter-spacing: 5px; text-transform: uppercase; margin-top: 4px; }
  .capa-eyebrow { font-size: 9px; letter-spacing: 5px; text-transform: uppercase; color: #f2c23b; font-weight: 600; margin-bottom: 9mm; }
  .capa-title { font-size: 32px; line-height: 1.05; font-weight: 800; text-transform: uppercase; color: #fff; margin: 0 0 8mm 0; max-width: 96mm; }
  .capa-accent { width: 18mm; height: 1.5mm; background: #f2c23b !important; margin-bottom: 9mm; border-radius: 99px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .capa-prepared { font-size: 9.5px; letter-spacing: 2.5px; text-transform: uppercase; color: rgba(255,255,255,0.8); margin-bottom: 4mm; }
  .capa-cliente { font-size: 19px; line-height: 1.14; font-weight: 800; text-transform: uppercase; max-width: 102mm; margin-bottom: 12mm; color: #fff; }
  .capa-meta { display: grid; grid-template-columns: repeat(3, auto); gap: 10mm; align-items: start; max-width: 105mm; }
  .capa-meta-label { font-size: 9px; letter-spacing: 1.6px; text-transform: uppercase; color: rgba(255,255,255,0.75); margin-bottom: 2mm; }
  .capa-meta-value { font-size: 10px; font-weight: 700; color: #fff; }
  .capa-footer { display: flex; gap: 3mm; align-items: center; color: rgba(255,255,255,0.85); font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; }
  .capa-footer-bar { width: 1.2mm; height: 8mm; background: #f2c23b !important; border-radius: 99px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* ─── HEADER INTERNO ─────────────────────────────────────────── */
  .header-interno {
    background: #0E2040;
    padding: 12px 36px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .header-logo { font-family: Calibri, Candara, sans-serif; font-size: 14px; font-weight: 700; color: #fff; letter-spacing: 1px; }
  .header-logo span { color: #F5A623; }
  .header-tag { font-size: 10px; font-weight: 400; color: rgba(255,255,255,0.8); letter-spacing: 3px; text-transform: uppercase; }

  /* ─── FOOTER ─────────────────────────────────────────────────── */
  .footer {
    background: #0E2040;
    padding: 12px 36px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer-text { font-size: 10px; font-weight: 400; color: rgba(255,255,255,0.85); line-height: 1.5; }
  .footer-numero { font-size: 10px; color: rgba(255,255,255,0.7); font-family: Calibri, Candara, monospace; }

  /* ─── SEÇÃO CONTEÚDO ─────────────────────────────────────────── */
  .section { padding: 20px 36px; }
  .section-title {
    font-family: Calibri, Candara, sans-serif;
    font-size: 22px; font-weight: 600; color: #0E2040;
    border-left: 4px solid #F5A623; padding-left: 12px;
    margin-bottom: 16px;
    break-after: avoid; page-break-after: avoid;
  }
  .section-sub { font-family: Calibri, Candara, sans-serif; font-size: 16px; font-weight: 600; color: #0E2040; margin: 28px 0 12px; padding-top: 16px; border-top: 1px solid #eee; break-after: avoid; page-break-after: avoid; }

  /* ─── KPIs ────────────────────────────────────────────────────── */
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
  .kpi-card { background: #f7f8fc; border-radius: 8px; padding: 14px 16px; border-top: 3px solid #F5A623; }
  .kpi-card-green { border-top-color: #2D9C4E; }
  .kpi-label { font-family: Calibri, Candara, sans-serif; font-size: 10px; font-weight: 400; color: #888; letter-spacing: 1.5px; text-transform: uppercase; }
  .kpi-value { font-family: Calibri, Candara, sans-serif; font-size: 23px; font-weight: 700; color: #0E2040; margin-top: 4px; }
  .kpi-unit { font-family: Calibri, Candara, sans-serif; font-size: 12px; font-weight: 300; color: #888; }

  /* ─── TABELAS DE CONTEÚDO (escopadas em .section para não afetar a
         tabela-folha .sheet) ─────────────────────────────────────── */
  .section table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  .section table thead { display: table-header-group; } /* repete o cabeçalho da tabela se ela quebrar de página */
  .section tr { break-inside: avoid; page-break-inside: avoid; }
  .section th { background: #0E2040; color: #fff; padding: 8px 10px; font-family: Calibri, Candara, sans-serif; font-size: 10px; font-weight: 400; letter-spacing: 1px; text-transform: uppercase; text-align: left; }
  .section th:last-child, .section td:last-child { text-align: right; }
  .section td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; font-family: Calibri, Candara, sans-serif; font-size: 13px; font-weight: 300; color: #333; }
  .section tr:nth-child(even) td { background: #fafafa; }
  .fluxo-positivo { color: #2D9C4E; font-weight: 600; }
  .fluxo-negativo { color: #d32f2f; }

  /* ─── HIGHLIGHT ───────────────────────────────────────────────── */
  .highlight-box { background: linear-gradient(135deg, #fff8e8, #fff3d0); border-left: 4px solid #F5A623; padding: 13px 18px; border-radius: 0 8px 8px 0; margin: 10px 0 14px; }
  .highlight-box p { margin: 0; font-weight: 400; color: #0E2040; font-size: 15px; }

  /* ─── COMPARATIVO ─────────────────────────────────────────────── */
  .comparativo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
  .comp-card { border-radius: 10px; padding: 14px; text-align: center; }
  .comp-poupanca { background: #f0f7f0; }
  .comp-rf { background: #f0f4f7; }
  .comp-solar { background: linear-gradient(135deg, #fff8e8, #fff3d0); border: 2px solid #F5A623; }
  .comp-label { font-size: 10px; font-weight: 300; color: #888; letter-spacing: 1.5px; text-transform: uppercase; }
  .comp-value { font-family: Calibri, Candara, sans-serif; font-size: 15px; font-weight: 700; color: #0E2040; margin-top: 6px; }
  .comp-badge { font-size: 12px; color: #F5A623; font-weight: 600; margin-top: 4px; }

  /* ─── REDUÇÃO DA CONTA ────────────────────────────────────────── */
  .reducao-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px; margin: 10px 0; }
  .reducao-header { background: #0E2040; color: #fff; padding: 9px 14px; font-family: Calibri, Candara, sans-serif; font-size: 10px; font-weight: 400; }
  .reducao-cell { background: #f7f8fc; padding: 12px 14px; }
  .reducao-label { font-size: 9px; font-weight: 300; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .reducao-value { font-family: Calibri, Candara, sans-serif; font-size: 17px; font-weight: 700; color: #0E2040; margin-top: 3px; }
  .reducao-value.economia { color: #2D9C4E; }

  /* ─── PAGAMENTO ───────────────────────────────────────────────── */
  .pagamento-box { border: 2px solid #F5A623; border-radius: 10px; padding: 14px; margin: 20px 0; }
  .pagamento-tipo { font-family: Calibri, Candara, sans-serif; font-size: 14px; font-weight: 600; color: #0E2040; margin-bottom: 8px; }
  .pagamento-linha { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; font-weight: 300; }
  .pagamento-linha:last-child { border-bottom: none; }

  /* ─── ACEITE / ASSINATURA ─────────────────────────────────────── */
  .aceite-box { background: #f7f8fc; border-radius: 10px; padding: 20px; margin: 14px 0; }
  /* Espaço de ~10 cm antes das linhas de assinatura */
  .assinatura-espaco { height: 100mm; }
  .assinatura-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; break-inside: avoid; page-break-inside: avoid; }
  .assinatura-linha { border-top: 1.5px solid #222; padding-top: 10px; text-align: center; font-size: 12px; font-weight: 300; color: #555; }

  /* ─── CONTROLE DE QUEBRA DE PÁGINA ────────────────────────────── */
  .kpi-card, .comp-card, .pagamento-box, .highlight-box, .aceite-box,
  .reducao-grid, .assinatura-grid {
    break-inside: avoid; page-break-inside: avoid;
  }

  /* ─── PRINT ───────────────────────────────────────────────────── */
  @media print {
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Calibri Light', Calibri, Candara, sans-serif; font-weight: 300; }
    @page { size: A4; margin: 0; }
  }
`

function headerInterno(numero: string, logoUrl?: string | null) {
  return `<div class="header-interno">
    <div class="header-logo">
      ${logoUrl ? `<img src="${logoUrl}" style="height:24px;max-width:130px;object-fit:contain;vertical-align:middle;" alt="Logo"/>` : `ATOM<span>TECH</span>`}
      <small style="font-size:10px;font-weight:400;color:rgba(255,255,255,0.75);margin-left:8px">Energia Solar e Tecnologia</small>
    </div>
    <div class="header-tag">Proposta Comercial &middot; ${numero}</div>
  </div>`
}

function footer(numero: string, emp?: any) {
  const tel    = emp?.telefone || '(61) 3978-1738'
  const email  = emp?.email    || 'contato@atomtech.tec.br'
  const cidade = emp?.cidade   || 'Brasília/DF'
  return `<div class="footer">
    <div class="footer-text">${emp?.nome ?? 'Atom Tech'} &mdash; Energia Solar e Tecnologia<br>${cidade} &middot; ${email} &middot; ${tel}</div>
    <div class="footer-numero">${numero}</div>
  </div>`
}

// Uma folha A4: thead/tfoot da tabela repetem o cabeçalho/rodapé em cada
// página impressa caso o conteúdo transborde para páginas seguintes.
function sheet(inner: string, numero: string, logoUrl?: string | null, emp?: any): string {
  return `<div class="sheet-wrap"><table class="sheet">
    <thead><tr><td>${headerInterno(numero, logoUrl)}</td></tr></thead>
    <tfoot><tr><td>${footer(numero, emp)}</td></tr></tfoot>
    <tbody><tr><td><div class="section">${inner}</div></td></tr></tbody>
  </table></div>`
}

function paginaTexto(titulo: string, chave: string, textos: any, numero: string, logoUrl?: string, emp?: any): string {
  const conteudo = textos?.[chave]?.conteudo
  if (!conteudo) return ''
  return sheet(`<div class="section-title">${titulo}</div>
      ${renderTexto(conteudo)}`, numero, logoUrl, emp)
}

// `autoPrint: false` é usado na geração server-side (Chrome headless), onde o
// PDF sai do page.pdf() e não do diálogo de impressão.
export function gerarHTML(data: any, opts: { autoPrint?: boolean } = {}): string {
  const autoPrint = opts.autoPrint !== false
  const { proposta: prop, empresa: emp, cliente: cli, fatura: fat,
    dimensionamento: dim, equipamentos: equips, precificacao: prec,
    analiseFinanceira: af, condicoesComerciais: condicoes, blocos, textos } = data

  const numero     = prop?.numero ?? 'AT-2026-XXXX'
  const precoFinal = Number(prec?.precoFinal ?? 0)
  const logoUrl    = emp?.logoUrl

  const blocosAtivos = (blocos ?? []).filter((b: any) => b.ativo).map((b: any) => b.tipoBloco)
  const tem = (tipo: string) => blocosAtivos.length === 0 || blocosAtivos.includes(tipo)
  const textoOverrideBloco = (tipo: string): string | null =>
    (blocos ?? []).find((b: any) => b.tipoBloco === tipo)?.textoOverride ?? null

  // ── CAPA ─────────────────────────────────────────────────────────────────
  // Título da proposta (editável em "✏ Editar" no topo) tem prioridade sobre o
  // texto genérico — achado em 2026-08-10: o campo salvava e aparecia na tela,
  // mas o PDF fotovoltaico nunca chegava a lê-lo, sempre mostrando "Energia
  // Solar" fixo (diferente do PDF de serviço, que já respeitava esse campo).
  const tituloCapa = prop?.tituloServico
    ? String(prop.tituloServico)
    : prop?.tipoProposta === 'fotovoltaico'
      ? 'Energia<br>Solar'
      : prop?.tipoProposta === 'servico_geral'
        ? 'Proposta de<br>Servi&ccedil;os'
        : 'Proposta<br>Comercial'

  const capaImg  = (data as any).capaImg as string | undefined
  const bgUrl    = capaImg
    ? `${window.location.origin}/assets/covers/${capaImg}.png`
    : null

  const capa = tem('capa') ? `<div class="capa">
    ${bgUrl ? `<img class="capa-bg" src="${bgUrl}" alt="" onerror="this.style.display='none'"/>` : ''}
    <div class="capa-overlay"></div>
    <div class="capa-topinfo">
      ${emp?.cidade ?? 'Brasília'}/DF<br>
      ${numero}
    </div>
    <div class="capa-content">
      <header>
        ${logoUrl
          ? `<img class="capa-logo" src="${logoUrl}" alt="Logo"/>`
          : `<div class="capa-logo-text"><span style="color:#f2c23b;">ATOM</span>TECH</div>
             <div class="capa-logo-sub">Energia Solar</div>`
        }
      </header>
      <main>
        <div class="capa-eyebrow">Proposta Comercial</div>
        <h1 class="capa-title">${tituloCapa}</h1>
        <div class="capa-accent"></div>
        <div class="capa-prepared">Preparado exclusivamente para</div>
        <div class="capa-cliente">${cli?.nome ?? ''}</div>
        <div class="capa-meta">
          <div>
            <div class="capa-meta-label">Data</div>
            <div class="capa-meta-value">${formatDate(prop?.dataEmissao)}</div>
          </div>
          <div>
            <div class="capa-meta-label">V&aacute;lida at&eacute;</div>
            <div class="capa-meta-value">${prop?.dataValidade ? formatDate(prop.dataValidade) : '5 dias'}</div>
          </div>
          <div>
            <div class="capa-meta-label">Proposta</div>
            <div class="capa-meta-value">${numero}</div>
          </div>
        </div>
      </main>
      <footer class="capa-footer">
        <div class="capa-footer-bar"></div>
        <div>Engenharia &bull; Energia &bull; Tecnologia</div>
      </footer>
    </div>
  </div>` : ''

  // ── RESUMO DA PROPOSTA (modelo Direto ao Ponto) ──────────────────────────
  // Página de abertura logo após a capa: cliente, o que está sendo ofertado e
  // o investimento — sem esperar o cliente passar por conteúdo institucional
  // para chegar até aqui. Substitui o costume de abrir com apresentação da
  // empresa / como funciona a energia solar antes de mostrar a oferta.
  const resumoProposta = tem('resumo_proposta') ? sheet(`
      <div class="section-title">Resumo da Proposta</div>
      <div class="kpi-grid" style="margin-bottom:18px">
        <div class="kpi-card"><div class="kpi-label">Cliente</div><div class="kpi-value" style="font-size:16px">${cli?.nome ?? ''}</div></div>
        <div class="kpi-card"><div class="kpi-label">Pot&ecirc;ncia Proposta</div><div class="kpi-value">${Number(dim?.potenciaFinalKwp ?? 0).toFixed(2)} <span class="kpi-unit">kWp</span></div></div>
        <div class="kpi-card kpi-card-green"><div class="kpi-label">Gera&ccedil;&atilde;o/M&ecirc;s Estimada</div><div class="kpi-value">${formatKwh(Number(dim?.geracaoAnualKwh ?? 0) / 12)}</div></div>
      </div>
      <div style="margin-top:4px">
        <div class="section-sub">O que estamos propondo</div>
        <p>Sistema fotovoltaico dimensionado para o seu perfil de consumo, com equipamentos, instala&ccedil;&atilde;o e projeto de engenharia inclusos &mdash; detalhado nas pr&oacute;ximas p&aacute;ginas.</p>
      </div>
      <div class="highlight-box" style="margin-top:18px"><p>Investimento Total: <strong>${formatCurrency(precoFinal)}</strong> &mdash; condi&ccedil;&otilde;es de pagamento na sequ&ecirc;ncia.</p></div>
      <div style="margin-top:16px;font-size:12px;color:#888">
        <strong style="color:#0E2040">Contato:</strong> ${cli?.telefone ?? ''}${cli?.email ? ` &middot; ${cli.email}` : ''}
      </div>`, numero, logoUrl, emp) : ''

  // ── APRESENTAÇÃO ─────────────────────────────────────────────────────────
  const apresentacao = tem('apresentacao_empresa') ? sheet(`
      <div class="section-title">Conhe&ccedil;a a Atom Tech</div>
      ${renderTexto(textos?.apresentacao_empresa?.conteudo) || '<p>A Atom Tech &eacute; especializada em sistemas fotovoltaicos.</p>'}
      ${tem('o_que_inclui') && textos?.o_que_inclui?.conteudo ? `
      <div style="margin-top:20px">
        <div class="section-sub">Sua Proposta Inclui</div>
        ${renderTexto(textos.o_que_inclui.conteudo)}
      </div>` : ''}`, numero, logoUrl, emp) : ''

  // ── TEXTOS INSTITUCIONAIS ─────────────────────────────────────────────────
  const comoFunciona   = tem('como_funciona')   ? paginaTexto('Como Funciona a Energia Solar',    'como_funciona',   textos, numero, logoUrl, emp) : ''
  const diferenciais   = tem('diferenciais')    ? paginaTexto('Diferenciais da Atom Tech',         'diferenciais',    textos, numero, logoUrl, emp) : ''
  const garantias      = tem('garantias')       ? paginaTexto('Garantias Inclusas',                'garantias',       textos, numero, logoUrl, emp) : ''
  const fornecedores   = tem('fornecedores')    ? paginaTexto('Fornecedores e Fabricantes',        'fornecedores',    textos, numero, logoUrl, emp) : ''
  const regulamentacao = tem('regulamentacao')  ? paginaTexto('Regulamenta&ccedil;&atilde;o no Brasil', 'regulamentacao', textos, numero, logoUrl, emp) : ''

  // ── DIMENSIONAMENTO ──────────────────────────────────────────────────────
  const dimensionamentoBloco = tem('dimensionamento') ? sheet(`
      <div class="section-title">Dimensionamento do Sistema</div>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Pot&ecirc;ncia Proposta</div><div class="kpi-value">${Number(dim?.potenciaFinalKwp ?? 0).toFixed(2)} <span class="kpi-unit">kWp</span></div></div>
        <div class="kpi-card"><div class="kpi-label">Gera&ccedil;&atilde;o/M&ecirc;s</div><div class="kpi-value">${formatKwh(Number(dim?.geracaoAnualKwh ?? 0) / 12)} <span class="kpi-unit">/m&ecirc;s</span></div></div>
        <div class="kpi-card"><div class="kpi-label">&Aacute;rea Necess&aacute;ria</div><div class="kpi-value">${Number(dim?.areaEstimadaM2 ?? 0).toFixed(0)} <span class="kpi-unit">m&sup2;</span></div></div>
        <div class="kpi-card kpi-card-green"><div class="kpi-label">Consumo M&eacute;dio</div><div class="kpi-value">${formatKwh(dim?.consumoMedioMensalKwh)} <span class="kpi-unit">/m&ecirc;s</span></div></div>
        <div class="kpi-card kpi-card-green"><div class="kpi-label">% Compensa&ccedil;&atilde;o</div><div class="kpi-value">${Number(dim?.percentualCompensacao ?? 0).toFixed(0)}<span class="kpi-unit">%</span></div></div>
        <div class="kpi-card kpi-card-green"><div class="kpi-label">Economia/M&ecirc;s Est.</div><div class="kpi-value" style="font-size:18px">${formatCurrency(dim?.economiaMensalEstimada)}</div></div>
      </div>
      ${(equips ?? []).length > 0 && tem('equipamentos') ? `
      <div style="margin-top:16px">
        <div class="section-sub">Equipamentos</div>
        <table>
          <thead><tr><th>Item</th><th>Fabricante / Modelo</th><th style="text-align:center">Qtd.</th><th>Pot&ecirc;ncia</th><th>Garantia</th></tr></thead>
          <tbody>
            ${equips.map((eq: any) => `<tr>
              <td>${eq.tipo === 'modulo' ? 'M&oacute;dulos Fotovoltaicos' : eq.tipo === 'microinversor' ? 'Microinversor(es)' : 'Inversor(es)'}</td>
              <td style="color:#555">${[eq.fabricante, eq.modelo].filter(Boolean).join(' &mdash; ') || 'A confirmar'}</td>
              <td style="text-align:center;font-weight:700;color:#F5A623">${eq.quantidade}</td>
              <td>${eq.potenciaWp ? (eq.tipo === 'modulo' ? `${eq.potenciaWp} Wp` : `${(eq.potenciaWp/1000).toFixed(1)} kW`) : '&mdash;'}</td>
              <td>${eq.garantiaAnos ? `${eq.garantiaAnos} anos` : '&mdash;'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}`, numero, logoUrl, emp) : ''

  // ── ANÁLISE FINANCEIRA ───────────────────────────────────────────────────
  const analise = tem('analise_financeira') ? sheet(`
      <div class="section-title">An&aacute;lise Financeira do Investimento</div>
      <div class="highlight-box"><p>Investimento de <strong>${formatCurrency(precoFinal)}</strong> com infla&ccedil;&atilde;o energ&eacute;tica de 9,5% a.a. e 25 anos de vida &uacute;til.</p></div>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Payback Simples</div><div class="kpi-value" style="font-size:19px">${formatPayback(Number(af?.paybackSimplesMeses ?? 0))}</div></div>
        <div class="kpi-card"><div class="kpi-label">VPL (25 anos)</div><div class="kpi-value" style="font-size:16px">${formatCurrency(af?.vpl)}</div></div>
        <div class="kpi-card"><div class="kpi-label">TIR</div><div class="kpi-value">${(Number(af?.tir ?? 0) * 100).toFixed(2)}<span class="kpi-unit">%</span></div></div>
      </div>
      <p style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin:12px 0 8px">Saldo ap&oacute;s 25 anos &mdash; Comparativo</p>
      <div class="comparativo-grid">
        <div class="comp-card comp-poupanca"><div class="comp-label">Poupan&ccedil;a</div><div class="comp-value">${formatCurrency(af?.comparativoPoupanca25a)}</div><div class="comp-badge" style="color:#888">~4,3% a.a.</div></div>
        <div class="comp-card comp-rf"><div class="comp-label">Renda Fixa</div><div class="comp-value">${formatCurrency(af?.comparativoRendaFixa25a)}</div><div class="comp-badge" style="color:#1a56c4">~7,4% a.a.</div></div>
        <div class="comp-card comp-solar"><div class="comp-label">Sistema Solar</div><div class="comp-value">${formatCurrency(af?.saldo25Anos)}</div><div class="comp-badge">Melhor retorno</div></div>
      </div>
      ${tem('reducao_conta') ? `
      <div style="margin-top:16px">
        <div class="section-sub">Redu&ccedil;&atilde;o da Conta de Energia</div>
        <div class="reducao-grid">
          <div><div class="reducao-header">Antes da Instala&ccedil;&atilde;o</div><div class="reducao-cell"><div class="reducao-label">Custo Mensal</div><div class="reducao-value">${formatCurrency(fat?.valorTotal || Number(af?.economiaMensalAno1))}</div></div></div>
          <div><div class="reducao-header">Economia M&eacute;dia Mensal</div><div class="reducao-cell"><div class="reducao-label">Gera&ccedil;&atilde;o Solar</div><div class="reducao-value economia">${formatCurrency(af?.economiaMensalAno1)}</div></div></div>
          <div><div class="reducao-header">Depois da Instala&ccedil;&atilde;o</div><div class="reducao-cell"><div class="reducao-label">Custo Residual</div><div class="reducao-value">${formatCurrency(Math.max(0, Number(fat?.valorTotal || 0) - Number(af?.economiaMensalAno1 || 0)))}</div></div></div>
        </div>
      </div>` : ''}`, numero, logoUrl, emp) : ''

  // ── FLUXO DE CAIXA ───────────────────────────────────────────────────────
  const fluxoCaixa = tem('fluxo_caixa') ? (() => {
    const fluxo: any[] = af?.fluxoCaixaJson ?? af?.fluxoCaixa ?? []
    if (!fluxo.length) return ''

    const thead = `<thead><tr>
      <th style="width:30px">Ano</th>
      <th>Gera&ccedil;&atilde;o (kWh)</th>
      <th>Tarifa R$/kWh</th>
      <th>Economia Anual</th>
      <th>Troca Inversor</th>
      <th>Fluxo L&iacute;quido</th>
      <th>Saldo Acumulado</th>
    </tr></thead>`

    const isMicroinversor = dim?.topologia === 'microinversor'
    const renderLinhas = (linhas: any[]) => linhas.map((f: any) => {
      const saldo = Number(f.saldoAcumulado ?? 0)
      const fluxoLiq = Number(f.fluxoLiquido ?? 0)
      // Ano 0 nunca tem troca; microinversor nunca tem troca (garantia 25 anos)
      const troca = (f.ano === 0 || isMicroinversor) ? 0 : Number(f.custoTrocaInversor ?? 0)
      return `<tr>
        <td style="font-weight:700;color:#0E2040">${f.ano}</td>
        <td>${Number(f.geracaoKwh ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
        <td>R$ ${Number(f.tarifa ?? 0).toFixed(4)}</td>
        <td style="color:#2D9C4E;font-weight:600">${f.ano === 0 ? '&mdash;' : formatCurrency(f.economiaAnual)}</td>
        <td style="color:${troca > 0 ? '#e53e3e' : '#888'}">${troca > 0 ? formatCurrency(troca) : '&mdash;'}</td>
        <td class="${fluxoLiq >= 0 ? 'fluxo-positivo' : 'fluxo-negativo'}">${formatCurrency(fluxoLiq)}</td>
        <td class="${saldo >= 0 ? 'fluxo-positivo' : 'fluxo-negativo'}" style="font-weight:700">${formatCurrency(saldo)}</td>
      </tr>`
    }).join('')

    const highlight = `<div class="highlight-box"><p>Proje&ccedil;&atilde;o anual com infla&ccedil;&atilde;o energ&eacute;tica de 9,5% a.a. | Investimento: <strong>${formatCurrency(precoFinal)}</strong></p></div>`
    const p1 = fluxo.slice(0, 13)   // Anos 0–12
    const p2 = fluxo.slice(13)       // Anos 13–25

    return sheet(`
      <div class="section-title">Fluxo de Caixa &mdash; 25 Anos</div>
      ${highlight}
      <p style="font-size:10px;color:#888;margin:6px 0 8px;text-transform:uppercase;letter-spacing:.05em">Anos 0 a 12</p>
      <table style="font-size:11px">${thead}<tbody>${renderLinhas(p1)}</tbody></table>`, numero, logoUrl, emp)
    + sheet(`
      <div class="section-title">Fluxo de Caixa &mdash; 25 Anos</div>
      ${highlight}
      <p style="font-size:10px;color:#888;margin:6px 0 8px;text-transform:uppercase;letter-spacing:.05em">Anos 13 a 25</p>
      <table style="font-size:11px">${thead}<tbody>${renderLinhas(p2)}</tbody></table>`, numero, logoUrl, emp)
  })() : ''

  // ── CONDIÇÕES COMERCIAIS ─────────────────────────────────────────────────
  const prazoExecucaoSolar = prop?.prazoExecucao ?? null
  const condicoesBloco = tem('condicoes_comerciais') ? sheet(`
      <div class="section-title">Condi&ccedil;&otilde;es Comerciais</div>
      <div class="highlight-box"><p>Investimento Total: <strong>${formatCurrency(precoFinal)}</strong> &middot; Economia Estimada: <strong>${formatCurrency(af?.economiaMensalAno1)}/m&ecirc;s</strong></p></div>
      ${prazoExecucaoSolar ? `<div style="margin-top:12px;padding:12px 16px;background:#F5A62310;border-left:3px solid #F5A623;border-radius:4px"><span style="font-size:11px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.05em">Prazo de Execu&ccedil;&atilde;o</span><p style="margin:4px 0 0;font-weight:600;color:#0E2040;font-size:14px">${prazoExecucaoSolar}</p></div>` : ''}
      ${tem('formas_pagamento') ? `
      <div style="margin-top:14px">
        <div class="section-sub">Formas de Pagamento</div>
        ${(condicoes ?? []).map((c: any) => `
          <div class="pagamento-box">
            <div class="pagamento-tipo">${c.descricao || c.tipo}</div>
            ${(c.parcelas ?? []).map((p: any) => `
              <div class="pagamento-linha">
                <span>${p.descricaoEvento}${p.prazoDias > 0 ? ` &mdash; at&eacute; ${p.prazoDias} dias ${p.tipoPrazo}` : ''}</span>
                <span style="font-weight:700">${c.tipo !== 'financiamento' ? formatCurrency(p.valor) : ''}</span>
              </div>`).join('')}
          </div>`).join('')}
      </div>` : ''}`, numero, logoUrl, emp) : ''

  // ── CONTEÚDO DO ACEITE (bloco interno — sem header/footer/page próprios) ──
  // Embutido ao final da última seção ativa (consideracoes ou pagina propria)
  const aceiteInner = tem('aceite') ? `
    <div style="margin-top:32px;break-inside:avoid;page-break-inside:avoid;">
      <div style="border-left:4px solid #F5A623;padding-left:12px;font-family:Calibri,Candara,sans-serif;font-size:20px;font-weight:600;color:#0E2040;margin-bottom:16px">Aceite da Proposta</div>
      <div class="aceite-box">
        <p><strong>Emiss&atilde;o:</strong> ${formatDate(prop?.dataEmissao)} &nbsp;&nbsp;&nbsp; <strong>Validade:</strong> ${prop?.dataValidade ? formatDate(prop.dataValidade) : '5 dias corridos'}</p>
        <p style="margin-top:6px">Esta proposta foi elaborada com base no seu perfil de consumo e nas melhores solu&ccedil;&otilde;es dispon&iacute;veis no mercado.</p>
      </div>
      <p style="margin-top:20px;font-size:15px;line-height:1.9">
        &Eacute; uma honra poder apresentar esta solu&ccedil;&atilde;o de energia solar para voc&ecirc;, <strong>${cli?.nome?.split(' ')[0] ?? 'cliente'}</strong>.
        A Atom Tech se compromete a acompanhar cada etapa com transpar&ecirc;ncia, qualidade e respeito ao seu investimento.
      </p>
      <p style="margin-top:12px;font-size:14px;color:#666">Bras&iacute;lia, em ${formatDate(prop?.dataEmissao)}.</p>
      <div class="assinatura-espaco"></div>
      <div class="assinatura-grid">
        <div><div class="assinatura-linha">${cli?.nome ?? 'Cliente'}</div></div>
        <div><div class="assinatura-linha">Atom Tech &mdash; Respons&aacute;vel Comercial</div></div>
      </div>
      ${tem('contato') ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px;padding-top:20px;border-top:1px solid #eee">
        <div>
          <p style="font-size:14px;font-weight:700;color:#0E2040;margin-bottom:6px">Contato</p>
          <p style="font-size:14px">${emp?.telefone ?? '(61) 3978-1738'}</p>
          <p style="font-size:14px">${emp?.email ?? 'contato@atomtech.tec.br'}</p>
        </div>
        <div>
          <p style="font-size:14px;font-weight:700;color:#0E2040;margin-bottom:6px">Endere&ccedil;o</p>
          <p style="font-size:14px">${emp?.endereco ?? 'Edif&iacute;cio SIA Centro Empresarial, Sala 231 B'} &mdash; ${emp?.cidade ?? 'Bras&iacute;lia'}/DF</p>
        </div>
      </div>` : ''}
    </div>
  ` : ''

  // ── CONSIDERAÇÕES GERAIS (embute aceiteInner ao final) ───────────────────
  const DEFAULT_CONSIDERACOES_SOLAR = `- **Atendimento:** Prestado em horário comercial, de segunda a sexta-feira das 8h às 18h.
- **Autoria do Orçamento:** Este documento é de uso exclusivo desta negociação e não deve ser repassado a terceiros.
- **Encargos e Taxas:** Taxas de homologação junto à distribuidora, AVCB e outras licenças são responsabilidade do contratante, salvo se expressamente incluídas.
- **Etapa Única:** Os serviços serão executados de forma contínua e em etapa única, salvo acordo formal em contrário.
- **Garantia:** Os serviços de instalação possuem garantia de 12 (doze) meses a partir da emissão da Nota Fiscal. Equipamentos seguem a garantia do fabricante conforme especificado no contrato.
- **Horário Comercial:** A execução ocorrerá em horário comercial; serviços noturnos ou em fins de semana serão cobrados à parte.`

  const consideracoesBloco = tem('consideracoes_gerais') ? (() => {
    const fixedTxt = (textos as any)?.['consideracoes_gerais']?.conteudo || DEFAULT_CONSIDERACOES_SOLAR
    const customTxt = textoOverrideBloco('consideracoes_gerais')?.trim() || ''
    const txt = [fixedTxt, customTxt].filter(Boolean).join('\n')
    const linhas = txt.split('\n').map((l: string) => l.trim()).filter(Boolean)
    let itemIdx = 0
    const itensHtml = linhas.map((linha: string) => {
      const linhaStrip = linha.replace(/^[-*•]\s*/, '')
      // Subtítulo: linha "**Título**" exata OU linha toda em MAIÚSCULAS —
      // mesmo com asteriscos desbalanceados digitados (ex.: "*EXCLUSÕES**"),
      // que o conversor de negrito não consome. Os asteriscos são limpos.
      const soTexto = linhaStrip.replace(/\*+/g, '').trim()
      const ehSubtitulo = soTexto.length >= 4 && soTexto.length <= 60 &&
        (/^\*\*[^*]+\*\*\s*$/.test(linhaStrip.trim()) ||
         (/^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇÜ0-9\s.:—–-]+$/.test(soTexto) && /[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇÜ]/.test(soTexto)))
      if (ehSubtitulo) {
        return `<div style="font-family:Calibri,Candara,sans-serif;font-size:16px;font-weight:600;color:#0E2040;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #F5A62350;break-after:avoid;page-break-after:avoid">${soTexto}</div>`
      }
      // "-" ou "*" SEM letra-ponto logo após → item numerado
      // "- a. texto", "- b. texto" etc. → texto corrido (preserva o "a.", "b.")
      const ehItem = /^[-*•]/.test(linha) && !/^[-*•]\s*[a-zA-Z]\.\s/.test(linha)
      const texto = linhaStrip.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      if (ehItem) {
        itemIdx++
        return `<div style="display:flex;gap:14px;margin-bottom:40px;align-items:flex-start;padding-bottom:20px;border-bottom:1px solid #EEF2F7;break-inside:avoid;page-break-inside:avoid">
          <span style="min-width:24px;height:24px;background:#F5A62315;color:#0E2040;border:1px solid #F5A62340;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:Calibri,sans-serif;flex-shrink:0;margin-top:2px">${itemIdx}</span>
          <span style="font-size:14px;font-weight:300;color:#333;line-height:1.8">${texto}</span>
        </div>`
      }
      return `<p style="font-size:14px;font-weight:300;color:#333;line-height:1.8;margin:0 0 8px 4px">${texto}</p>`
    }).join('')
    return sheet(`
      <div class="section-title">LEIA COM ATEN&Ccedil;&Atilde;O &mdash; INFORMA&Ccedil;&Otilde;ES IMPORTANTES</div>
      ${itensHtml}`, numero, logoUrl, emp)
  })() : ''

  // Aceite sempre em página própria com header e footer — garante posicionamento correto
  const aceite = tem('aceite') ? sheet(aceiteInner, numero, logoUrl, emp) : ''

  // Modelo "Direto ao Ponto": cliente/oferta/investimento/pagamento/aceite logo
  // no início — institucional e financeiro (payback etc., normalmente
  // desativados neste modelo) viram material de apoio no final.
  const corpo = prop?.modeloProposta === 'direto_ao_ponto'
    ? `${capa}${resumoProposta}${dimensionamentoBloco}${condicoesBloco}${aceite}${garantias}${diferenciais}${apresentacao}${comoFunciona}${regulamentacao}${fornecedores}${analise}${fluxoCaixa}${consideracoesBloco}`
    : `${capa}${apresentacao}${comoFunciona}${diferenciais}${garantias}${fornecedores}${regulamentacao}${dimensionamentoBloco}${analise}${fluxoCaixa}${condicoesBloco}${consideracoesBloco}${aceite}`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta ${numero} &mdash; ${emp?.nome ?? 'Atom Tech'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=block">
  <style>${CSS}</style>
</head>
<body>
  ${corpo}
  <script>
    window.onload = function() {
      setTimeout(function() {
        // O tfoot naturalmente fica logo após o conteúdo na última página de
        // cada folha. Preenche o espaço restante (medido) para empurrá-lo ao
        // pé da página — técnica do gerarPdfServicoBrowser.ts, aqui por folha.
        try {
          var pageH = 297 * 96 / 25.4; // altura A4 em px CSS (~1122.5)
          document.querySelectorAll('table.sheet').forEach(function(sh) {
            var thead = sh.tHead, tfoot = sh.tFoot;
            var cell = sh.querySelector('tbody > tr > td');
            if (!thead || !tfoot || !cell) return;
            var theadH = thead.getBoundingClientRect().height;
            var tfootH = tfoot.getBoundingClientRect().height;
            var availH = pageH - theadH - tfootH;
            if (availH <= 0) return;
            var contentH = cell.getBoundingClientRect().height;
            // Cabe em uma página: preenchimento exato cola o rodapé no pé.
            // Se transborda, NÃO preencher: estimar o vão da última página é
            // impreciso (break-inside:avoid desloca conteúdo) e um erro para
            // mais vaza o rodapé para uma página órfã. Nesse caso o tfoot
            // fica logo após o conteúdo — e o Chrome já repete cabeçalho e
            // rodapé no pé/topo de cada página intermediária.
            if (contentH <= availH) {
              cell.style.paddingBottom = (availH - contentH - 1) + 'px';
            }
          });
        } catch (e) {}
        // Sinaliza ao Chrome headless que o layout terminou (geração no servidor)
        window.__PDF_READY__ = true;
        ${autoPrint ? 'setTimeout(function() { window.print(); }, 100);' : ''}
      }, 700);
    };
  </script>
</body>
</html>`
}

export function abrirPdfNoNavegador(data: any, winParam?: Window | null): void {
  const html = gerarHTML(data)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const win  = winParam ?? window.open(url, '_blank')
  if (!win) { alert('Popups bloqueados. Permita popups para este site e tente novamente.'); return }
  // Quando a janela foi pré-aberta (no clique), navega-la para o blob
  if (winParam) winParam.location.href = url
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
