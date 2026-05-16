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

  /* ─── TIPOGRAFIA — Calibri Light (sistema Windows) ───────────── */
  body {
    font-family: 'Calibri Light', Calibri, Candara, 'Segoe UI', 'Trebuchet MS', sans-serif;
    font-weight: 300;
    font-size: 11.5px;
    line-height: 1.75;
    color: #1C1C2E;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    font-feature-settings: "liga" 0, "kern" 1;
  }

  /* Parágrafo e texto corrido */
  p {
    font-size: 11.5px;
    font-weight: 300;
    color: #333;
    line-height: 1.8;
    margin-bottom: 9px;
  }

  /* Negrito explícito com Calibri regular (não Bold) */
  strong, b {
    font-family: Calibri, Candara, 'Segoe UI', sans-serif;
    font-weight: 600;
    color: #0E2040;
  }

  /* Listas */
  ul { padding-left: 18px; margin: 6px 0 10px; }
  li { font-size: 11.5px; font-weight: 300; color: #444; line-height: 1.9; }

  /* ─── PÁGINA A4 ───────────────────────────────────────────────── */
  .page {
    width: 210mm;
    min-height: 297mm;
    position: relative;
    display: flex;
    flex-direction: column;
    page-break-after: always;
    break-after: page;
  }

  /* ─── CAPA ────────────────────────────────────────────────────── */
  .capa { background: linear-gradient(160deg, #0A1628 0%, #0E2040 55%, #102A50 100%); }
  .capa-top { padding: 28px 36px 0; display: flex; justify-content: space-between; align-items: center; }
  .capa-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 36px; }
  .capa-pretitle {
    font-family: Calibri, Candara, sans-serif;
    font-size: 10px; font-weight: 400;
    color: #F5A623; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 16px;
  }
  .capa-title {
    font-family: Calibri, Candara, sans-serif;
    font-size: 48px; font-weight: 700;
    color: #fff; line-height: 1.1; margin-bottom: 8px;
  }
  .capa-title span { color: #F5A623; }
  .capa-divider { width: 60px; height: 3px; background: #F5A623; margin: 18px 0; border-radius: 2px; }
  .capa-cliente-label {
    font-family: Calibri, Candara, sans-serif;
    font-size: 9px; font-weight: 300;
    color: rgba(255,255,255,0.5); letter-spacing: 4px; text-transform: uppercase; margin-bottom: 10px;
  }
  .capa-cliente-nome {
    font-family: Calibri, Candara, sans-serif;
    font-size: 30px; font-weight: 600;
    color: #fff; line-height: 1.15;
  }
  .capa-meta { display: flex; gap: 32px; margin-top: 20px; }
  .capa-meta-label {
    font-size: 9px; font-weight: 300;
    color: rgba(255,255,255,0.4); letter-spacing: 2px; text-transform: uppercase;
  }
  .capa-meta-value {
    font-family: Calibri, Candara, sans-serif;
    font-size: 13px; font-weight: 400;
    color: rgba(255,255,255,0.85); margin-top: 2px;
  }
  .capa-footer { padding: 20px 36px; display: flex; justify-content: space-between; align-items: flex-end; }
  .capa-footer-left { font-size: 9px; font-weight: 300; color: rgba(255,255,255,0.3); line-height: 1.6; }
  .capa-footer-right { font-size: 9px; font-weight: 300; color: rgba(255,255,255,0.3); text-align: right; }

  /* ─── HEADER INTERNO ─────────────────────────────────────────── */
  .header-interno {
    background: #0E2040;
    padding: 12px 36px;
    display: flex; justify-content: space-between; align-items: center;
    flex-shrink: 0;
  }
  .header-logo {
    font-family: Calibri, Candara, sans-serif;
    font-size: 14px; font-weight: 700; color: #fff; letter-spacing: 1px;
  }
  .header-logo span { color: #F5A623; }
  .header-tag {
    font-size: 9px; font-weight: 300;
    color: rgba(255,255,255,0.4); letter-spacing: 3px; text-transform: uppercase;
  }

  /* ─── FOOTER ─────────────────────────────────────────────────── */
  .footer {
    background: #0E2040;
    padding: 12px 36px;
    display: flex; justify-content: space-between; align-items: center;
    flex-shrink: 0; margin-top: auto;
  }
  .footer-text { font-size: 8.5px; font-weight: 300; color: rgba(255,255,255,0.45); line-height: 1.5; }
  .footer-numero { font-size: 8.5px; color: rgba(255,255,255,0.3); font-family: Calibri, Candara, monospace; }

  /* ─── SEÇÃO CONTEÚDO ─────────────────────────────────────────── */
  .section { padding: 20px 36px; flex: 1; overflow: hidden; }
  .section-title {
    font-family: Calibri, Candara, sans-serif;
    font-size: 18px; font-weight: 600;
    color: #0E2040;
    border-left: 4px solid #F5A623; padding-left: 12px;
    margin-bottom: 14px;
  }
  .section-sub {
    font-family: Calibri, Candara, sans-serif;
    font-size: 13px; font-weight: 600;
    color: #0E2040; margin: 14px 0 8px;
  }

  /* ─── KPIs ────────────────────────────────────────────────────── */
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0; }
  .kpi-card {
    background: #f7f8fc; border-radius: 8px;
    padding: 13px 14px; border-top: 3px solid #F5A623;
  }
  .kpi-card-green { border-top-color: #2D9C4E; }
  .kpi-label {
    font-family: Calibri, Candara, sans-serif;
    font-size: 8.5px; font-weight: 400; color: #888;
    letter-spacing: 2px; text-transform: uppercase;
  }
  .kpi-value {
    font-family: Calibri, Candara, sans-serif;
    font-size: 21px; font-weight: 700; color: #0E2040; margin-top: 3px;
  }
  .kpi-unit {
    font-family: Calibri, Candara, sans-serif;
    font-size: 10px; font-weight: 300; color: #888;
  }

  /* ─── TABELAS ─────────────────────────────────────────────────── */
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th {
    background: #0E2040; color: #fff;
    padding: 7px 8px;
    font-family: Calibri, Candara, sans-serif;
    font-size: 8.5px; font-weight: 400; letter-spacing: 1px; text-transform: uppercase;
    text-align: left;
  }
  th:last-child, td:last-child { text-align: right; }
  td {
    padding: 6px 8px; border-bottom: 1px solid #f0f0f0;
    font-family: Calibri, Candara, sans-serif;
    font-size: 11px; font-weight: 300; color: #333;
  }
  tr:nth-child(even) td { background: #fafafa; }
  .fluxo-positivo { color: #2D9C4E; font-weight: 600; }
  .fluxo-negativo { color: #d32f2f; }

  /* ─── CAIXAS HIGHLIGHT ────────────────────────────────────────── */
  .highlight-box {
    background: linear-gradient(135deg, #fff8e8, #fff3d0);
    border-left: 4px solid #F5A623;
    padding: 11px 16px; border-radius: 0 8px 8px 0;
    margin: 8px 0 12px;
  }
  .highlight-box p {
    margin: 0; font-weight: 400; color: #0E2040; font-size: 12px;
  }

  /* ─── COMPARATIVO ─────────────────────────────────────────────── */
  .comparativo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0; }
  .comp-card { border-radius: 10px; padding: 13px; text-align: center; }
  .comp-poupanca { background: #f0f7f0; }
  .comp-rf { background: #f0f4f7; }
  .comp-solar { background: linear-gradient(135deg, #fff8e8, #fff3d0); border: 2px solid #F5A623; }
  .comp-label { font-size: 8.5px; font-weight: 300; color: #888; letter-spacing: 2px; text-transform: uppercase; }
  .comp-value {
    font-family: Calibri, Candara, sans-serif;
    font-size: 13px; font-weight: 700; color: #0E2040; margin-top: 5px;
  }
  .comp-badge { font-size: 10.5px; color: #F5A623; font-weight: 600; margin-top: 3px; }

  /* ─── REDUÇÃO DA CONTA ────────────────────────────────────────── */
  .reducao-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px; margin: 8px 0; }
  .reducao-header {
    background: #0E2040; color: #fff;
    padding: 8px 12px;
    font-family: Calibri, Candara, sans-serif;
    font-size: 9px; font-weight: 400;
  }
  .reducao-cell { background: #f7f8fc; padding: 10px 12px; }
  .reducao-label { font-size: 8px; font-weight: 300; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .reducao-value {
    font-family: Calibri, Candara, sans-serif;
    font-size: 15px; font-weight: 700; color: #0E2040; margin-top: 2px;
  }
  .reducao-value.economia { color: #2D9C4E; }

  /* ─── PAGAMENTO ───────────────────────────────────────────────── */
  .pagamento-box { border: 2px solid #F5A623; border-radius: 10px; padding: 12px; margin: 8px 0; }
  .pagamento-tipo {
    font-family: Calibri, Candara, sans-serif;
    font-size: 12px; font-weight: 600; color: #0E2040; margin-bottom: 6px;
  }
  .pagamento-linha {
    display: flex; justify-content: space-between;
    padding: 4px 0; border-bottom: 1px solid #f5f5f5;
    font-size: 11.5px; font-weight: 300;
  }
  .pagamento-linha:last-child { border-bottom: none; }

  /* ─── ACEITE ──────────────────────────────────────────────────── */
  .aceite-box { background: #f7f8fc; border-radius: 10px; padding: 18px; margin: 12px 0; }
  .assinatura-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
  .assinatura-linha {
    border-top: 1px solid #333; padding-top: 8px; text-align: center;
    font-size: 10px; font-weight: 300; color: #555;
  }

  /* ─── PRINT ───────────────────────────────────────────────────── */
  @media print {
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Calibri Light', Calibri, Candara, sans-serif;
      font-weight: 300;
    }
    .page { page-break-after: always; break-after: page; }
    @page { size: A4; margin: 0; }
  }
`

function headerInterno(numero: string, logoUrl?: string | null) {
  return `<div class="header-interno">
    <div class="header-logo">
      ${logoUrl ? `<img src="${logoUrl}" style="height:24px;max-width:130px;object-fit:contain;vertical-align:middle;" alt="Logo"/>` : `ATOM<span>TECH</span>`}
      <small style="font-size:9px;font-weight:300;color:rgba(255,255,255,0.4);margin-left:8px">Energia Solar e Tecnologia</small>
    </div>
    <div class="header-tag">Proposta Comercial &middot; ${numero}</div>
  </div>`
}

function footer(numero: string, emp?: any) {
  const tel    = emp?.telefone || '(61) 3978-1738'
  const email  = emp?.email    || 'contato@atomtech.tec.br'
  const cidade = emp?.cidade   || 'Bras\u00edlia/DF'
  return `<div class="footer">
    <div class="footer-text">${emp?.nome ?? 'Atom Tech'} &mdash; Energia Solar e Tecnologia<br>${cidade} &middot; ${email} &middot; ${tel}</div>
    <div class="footer-numero">${numero}</div>
  </div>`
}

function paginaTexto(titulo: string, chave: string, textos: any, numero: string, logoUrl?: string, emp?: any): string {
  const conteudo = textos?.[chave]?.conteudo
  if (!conteudo) return ''
  return `<div class="page">
    ${headerInterno(numero, logoUrl)}
    <div class="section">
      <div class="section-title">${titulo}</div>
      ${renderTexto(conteudo)}
    </div>
    ${footer(numero, emp)}
  </div>`
}

function gerarHTML(data: any): string {
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
  const capa = tem('capa') ? `<div class="page capa">
    <div class="capa-top">
      <div>
        ${logoUrl
          ? `<img src="${logoUrl}" style="height:60px;max-width:180px;object-fit:contain;" alt="Logo"/>`
          : `<div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:2px">ATOM TECH</div>
             <div style="font-size:10px;font-weight:400;color:#F5A623;letter-spacing:6px;text-transform:uppercase">Energia Solar</div>`
        }
      </div>
      <div style="font-size:9px;color:rgba(255,255,255,0.3);text-align:right">${emp?.cidade ?? 'Bras\u00edlia'}/DF<br>www.atomtech.tec.br</div>
    </div>
    <div class="capa-body">
      <div class="capa-pretitle">Proposta Comercial</div>
      <div class="capa-title">ENERGIA<br><span>SOLAR</span><br>PARA VOC\u00ca</div>
      <div class="capa-divider"></div>
      <div class="capa-cliente-label">Preparado exclusivamente para</div>
      <div class="capa-cliente-nome">${cli?.nome ?? ''}</div>
      <div class="capa-meta">
        <div><div class="capa-meta-label">Data</div><div class="capa-meta-value">${formatDate(prop?.dataEmissao)}</div></div>
        <div><div class="capa-meta-label">Validade</div><div class="capa-meta-value">${prop?.dataValidade ? formatDate(prop.dataValidade) : '5 dias'}</div></div>
        <div><div class="capa-meta-label">Proposta</div><div class="capa-meta-value">${numero}</div></div>
      </div>
    </div>
    <div class="capa-footer">
      <div class="capa-footer-left">${emp?.endereco ?? 'Edif\u00edcio SIA Centro Empresarial \u2014 Sala 231 B'}<br>${emp?.cidade ?? 'Bras\u00edlia'}/DF</div>
      <div class="capa-footer-right">${emp?.email ?? 'contato@atomtech.tec.br'}<br>${emp?.telefone ?? '(61) 3978-1738'}</div>
    </div>
  </div>` : ''

  // ── APRESENTAÇÃO ─────────────────────────────────────────────────────────
  const apresentacao = tem('apresentacao_empresa') ? `<div class="page">
    ${headerInterno(numero, logoUrl)}
    <div class="section">
      <div class="section-title">Conhe\u00e7a a Atom Tech</div>
      ${renderTexto(textos?.apresentacao_empresa?.conteudo) || '<p>A Atom Tech \u00e9 especializada em sistemas fotovoltaicos.</p>'}
      ${tem('o_que_inclui') && textos?.o_que_inclui?.conteudo ? `
      <div style="margin-top:20px">
        <div class="section-sub">Sua Proposta Inclui</div>
        ${renderTexto(textos.o_que_inclui.conteudo)}
      </div>` : ''}
    </div>
    ${footer(numero, emp)}
  </div>` : ''

  // ── TEXTOS INSTITUCIONAIS ─────────────────────────────────────────────────
  const comoFunciona  = tem('como_funciona')  ? paginaTexto('Como Funciona a Energia Solar',   'como_funciona',  textos, numero, logoUrl, emp) : ''
  const diferenciais  = tem('diferenciais')   ? paginaTexto('Diferenciais da Atom Tech',        'diferenciais',   textos, numero, logoUrl, emp) : ''
  const garantias     = tem('garantias')      ? paginaTexto('Garantias Inclusas',               'garantias',      textos, numero, logoUrl, emp) : ''
  const fornecedores  = tem('fornecedores')   ? paginaTexto('Fornecedores e Fabricantes',       'fornecedores',   textos, numero, logoUrl, emp) : ''
  const regulamentacao= tem('regulamentacao') ? paginaTexto('Regulamenta\u00e7\u00e3o no Brasil','regulamentacao', textos, numero, logoUrl, emp) : ''

  // ── DIMENSIONAMENTO ──────────────────────────────────────────────────────
  const dimensionamentoBloco = tem('dimensionamento') ? `<div class="page">
    ${headerInterno(numero, logoUrl)}
    <div class="section">
      <div class="section-title">Dimensionamento do Sistema</div>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Pot\u00eancia Proposta</div><div class="kpi-value">${Number(dim?.potenciaFinalKwp ?? 0).toFixed(2)} <span class="kpi-unit">kWp</span></div></div>
        <div class="kpi-card"><div class="kpi-label">Gera\u00e7\u00e3o/M\u00eas</div><div class="kpi-value">${formatKwh(Number(dim?.geracaoAnualKwh ?? 0) / 12)} <span class="kpi-unit">/m\u00eas</span></div></div>
        <div class="kpi-card"><div class="kpi-label">\u00c1rea Necess\u00e1ria</div><div class="kpi-value">${Number(dim?.areaEstimadaM2 ?? 0).toFixed(0)} <span class="kpi-unit">m\u00b2</span></div></div>
        <div class="kpi-card kpi-card-green"><div class="kpi-label">Consumo M\u00e9dio</div><div class="kpi-value">${formatKwh(dim?.consumoMedioMensalKwh)} <span class="kpi-unit">/m\u00eas</span></div></div>
        <div class="kpi-card kpi-card-green"><div class="kpi-label">% Compensa\u00e7\u00e3o</div><div class="kpi-value">${Number(dim?.percentualCompensacao ?? 0).toFixed(0)}<span class="kpi-unit">%</span></div></div>
        <div class="kpi-card kpi-card-green"><div class="kpi-label">Economia/M\u00eas Est.</div><div class="kpi-value" style="font-size:16px">${formatCurrency(dim?.economiaMensalEstimada)}</div></div>
      </div>
      ${(equips ?? []).length > 0 && tem('equipamentos') ? `
      <div style="margin-top:14px">
        <div class="section-sub">Equipamentos</div>
        <table>
          <thead><tr><th>Item</th><th>Fabricante / Modelo</th><th style="text-align:center">Qtd.</th><th>Pot\u00eancia</th><th>Garantia</th></tr></thead>
          <tbody>
            ${equips.map((eq: any) => `<tr>
              <td>${eq.tipo === 'modulo' ? 'M\u00f3dulos Fotovoltaicos' : eq.tipo === 'microinversor' ? 'Microinversor(es)' : 'Inversor(es)'}</td>
              <td style="color:#555">${[eq.fabricante, eq.modelo].filter(Boolean).join(' \u2014 ') || 'A confirmar'}</td>
              <td style="text-align:center;font-weight:700;color:#F5A623">${eq.quantidade}</td>
              <td>${eq.potenciaWp ? (eq.tipo === 'modulo' ? `${eq.potenciaWp} Wp` : `${(eq.potenciaWp/1000).toFixed(1)} kW`) : '\u2014'}</td>
              <td>${eq.garantiaAnos ? `${eq.garantiaAnos} anos` : '\u2014'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>
    ${footer(numero, emp)}
  </div>` : ''

  // ── ANÁLISE FINANCEIRA ───────────────────────────────────────────────────
  const analise = tem('analise_financeira') ? `<div class="page">
    ${headerInterno(numero, logoUrl)}
    <div class="section">
      <div class="section-title">An\u00e1lise Financeira do Investimento</div>
      <div class="highlight-box"><p>Investimento de <strong>${formatCurrency(precoFinal)}</strong> com infla\u00e7\u00e3o energ\u00e9tica de 9,5% a.a. e 25 anos de vida \u00fatil.</p></div>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Payback Simples</div><div class="kpi-value" style="font-size:17px">${formatPayback(Number(af?.paybackSimplesMeses ?? 0))}</div></div>
        <div class="kpi-card"><div class="kpi-label">VPL (25 anos)</div><div class="kpi-value" style="font-size:14px">${formatCurrency(af?.vpl)}</div></div>
        <div class="kpi-card"><div class="kpi-label">TIR</div><div class="kpi-value">${(Number(af?.tir ?? 0) * 100).toFixed(2)}<span class="kpi-unit">%</span></div></div>
      </div>
      <p style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px;margin:10px 0 6px">Saldo ap\u00f3s 25 anos \u2014 Comparativo</p>
      <div class="comparativo-grid">
        <div class="comp-card comp-poupanca"><div class="comp-label">Poupan\u00e7a</div><div class="comp-value">${formatCurrency(af?.comparativoPoupanca25a)}</div><div class="comp-badge" style="color:#888">~4,3% a.a.</div></div>
        <div class="comp-card comp-rf"><div class="comp-label">Renda Fixa</div><div class="comp-value">${formatCurrency(af?.comparativoRendaFixa25a)}</div><div class="comp-badge" style="color:#1a56c4">~7,4% a.a.</div></div>
        <div class="comp-card comp-solar"><div class="comp-label">Sistema Solar</div><div class="comp-value">${formatCurrency(af?.saldo25Anos)}</div><div class="comp-badge">Melhor retorno</div></div>
      </div>
      ${tem('reducao_conta') ? `
      <div style="margin-top:14px">
        <div class="section-sub">Redu\u00e7\u00e3o da Conta de Energia</div>
        <div class="reducao-grid">
          <div><div class="reducao-header">Antes da Instala\u00e7\u00e3o</div><div class="reducao-cell"><div class="reducao-label">Custo Mensal</div><div class="reducao-value">${formatCurrency(fat?.valorTotal || Number(af?.economiaMensalAno1))}</div></div></div>
          <div><div class="reducao-header">Economia M\u00e9dia Mensal</div><div class="reducao-cell"><div class="reducao-label">Gera\u00e7\u00e3o Solar</div><div class="reducao-value economia">${formatCurrency(af?.economiaMensalAno1)}</div></div></div>
          <div><div class="reducao-header">Depois da Instala\u00e7\u00e3o</div><div class="reducao-cell"><div class="reducao-label">Custo Residual</div><div class="reducao-value">${formatCurrency(Math.max(0, Number(fat?.valorTotal || 0) - Number(af?.economiaMensalAno1 || 0)))}</div></div></div>
        </div>
      </div>` : ''}
    </div>
    ${footer(numero, emp)}
  </div>` : ''

  // ── FLUXO DE CAIXA ───────────────────────────────────────────────────────
  const fluxoCaixa = tem('fluxo_caixa') ? (() => {
    const fluxo: any[] = af?.fluxoCaixaJson ?? af?.fluxoCaixa ?? []
    if (!fluxo.length) return ''
    return `<div class="page">
    ${headerInterno(numero, logoUrl)}
    <div class="section">
      <div class="section-title">Fluxo de Caixa \u2014 25 Anos</div>
      <div style="margin-bottom:8px">
        <div class="highlight-box"><p>Projeção anual com infla\u00e7\u00e3o energ\u00e9tica de 9,5% a.a. | Investimento: <strong>${formatCurrency(precoFinal)}</strong></p></div>
      </div>
      <table style="font-size:10px">
        <thead>
          <tr>
            <th style="width:28px">Ano</th>
            <th>Gera\u00e7\u00e3o (kWh)</th>
            <th>Tarifa R$/kWh</th>
            <th>Economia Anual</th>
            <th>Troca Inversor</th>
            <th>Fluxo L\u00edquido</th>
            <th>Saldo Acumulado</th>
          </tr>
        </thead>
        <tbody>
          ${fluxo.map((f: any) => {
            const saldo = Number(f.saldoAcumulado ?? 0)
            const fluxoLiq = Number(f.fluxoLiquido ?? 0)
            return `<tr>
              <td style="font-weight:700;color:#0E2040">${f.ano}</td>
              <td>${Number(f.geracaoKwh ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
              <td>R$ ${Number(f.tarifa ?? 0).toFixed(4)}</td>
              <td style="color:#2D9C4E;font-weight:600">${formatCurrency(f.economiaAnual)}</td>
              <td style="color:${Number(f.custoTrocaInversor ?? 0) > 0 ? '#e53e3e' : '#888'}">${Number(f.custoTrocaInversor ?? 0) > 0 ? formatCurrency(f.custoTrocaInversor) : '\u2014'}</td>
              <td class="${fluxoLiq >= 0 ? 'fluxo-positivo' : 'fluxo-negativo'}">${formatCurrency(fluxoLiq)}</td>
              <td class="${saldo >= 0 ? 'fluxo-positivo' : 'fluxo-negativo'}" style="font-weight:700">${formatCurrency(saldo)}</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>
    ${footer(numero, emp)}
  </div>`
  })() : ''

  // ── CONDIÇÕES COMERCIAIS ─────────────────────────────────────────────────
  const prazoExecucaoSolar = prop?.prazoExecucao ?? null
  const condicoesBloco = tem('condicoes_comerciais') ? `<div class="page">
    ${headerInterno(numero, logoUrl)}
    <div class="section">
      <div class="section-title">Condi\u00e7\u00f5es Comerciais</div>
      <div class="highlight-box"><p>Investimento Total: <strong>${formatCurrency(precoFinal)}</strong> &middot; Economia Estimada: <strong>${formatCurrency(af?.economiaMensalAno1)}/m\u00eas</strong></p></div>
      ${prazoExecucaoSolar ? `<div style="margin-top:10px;padding:10px 14px;background:#F5A62310;border-left:3px solid #F5A623;border-radius:4px"><span style="font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:.05em">Prazo de Execu\u00e7\u00e3o</span><p style="margin:3px 0 0;font-weight:600;color:#0E2040;font-size:12px">${prazoExecucaoSolar}</p></div>` : ''}
      ${tem('formas_pagamento') ? `
      <div style="margin-top:12px">
        <div class="section-sub">Formas de Pagamento</div>
        ${(condicoes ?? []).map((c: any) => `
          <div class="pagamento-box">
            <div class="pagamento-tipo">${c.descricao || c.tipo}</div>
            ${(c.parcelas ?? []).map((p: any) => `
              <div class="pagamento-linha">
                <span>${p.descricaoEvento}${p.prazoDias > 0 ? ` \u2014 at\u00e9 ${p.prazoDias} dias ${p.tipoPrazo}` : ''}</span>
                <span style="font-weight:700">${c.tipo !== 'financiamento' ? formatCurrency(p.valor) : ''}</span>
              </div>`).join('')}
          </div>`).join('')}
      </div>` : ''}
    </div>
    ${footer(numero, emp)}
  </div>` : ''

  // ── CONSIDERAÇÕES GERAIS ─────────────────────────────────────────────────
  const DEFAULT_CONSIDERACOES_SOLAR = `- **Atendimento:** Prestado em horário comercial, de segunda a sexta-feira das 8h às 18h.
- **Autoria do Orçamento:** Este documento é de uso exclusivo desta negociação e não deve ser repassado a terceiros.
- **Encargos e Taxas:** Taxas de homologação junto à distribuidora, AVCB e outras licenças são responsabilidade do contratante, salvo se expressamente incluídas.
- **Etapa Única:** Os serviços serão executados de forma contínua e em etapa única, salvo acordo formal em contrário.
- **Garantia:** Os serviços possuem garantia de 5 anos na instalação e conforme fabricante para os equipamentos.
- **Horário Comercial:** A execução ocorrerá em horário comercial; serviços noturnos ou em fins de semana serão cobrados à parte.`

  const consideracoesBloco = tem('consideracoes_gerais') ? (() => {
    // Itens fixos (empresa) + itens específicos desta proposta
    const fixedTxt = (textos as any)?.['consideracoes_gerais']?.conteudo || DEFAULT_CONSIDERACOES_SOLAR
    const customTxt = textoOverrideBloco('consideracoes_gerais')?.trim() || ''
    const txt = [fixedTxt, customTxt].filter(Boolean).join('\n')
    const linhas = txt.split('\n').map((l: string) => l.trim()).filter(Boolean)
    const itensHtml = linhas.map((linha: string, idx: number) => {
      const texto = linha.replace(/^[-*•]\s*/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      return `<div style="display:flex;gap:12px;margin-bottom:10px;align-items:flex-start;padding-bottom:10px;border-bottom:1px solid #EEF2F7">
        <span style="min-width:22px;height:22px;background:#F5A62315;color:#0E2040;border:1px solid #F5A62340;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;font-family:Calibri,sans-serif;flex-shrink:0;margin-top:1px">${idx + 1}</span>
        <span style="font-size:11px;font-weight:300;color:#333;line-height:1.8">${texto}</span>
      </div>`
    }).join('')
    return `<div class="page">
    ${headerInterno(numero, logoUrl)}
    <div class="section">
      <div class="section-title">LEIA COM ATENÇÃO — INFORMAÇÕES IMPORTANTES</div>
      ${itensHtml}
    </div>
    ${footer(numero, emp)}
  </div>`
  })() : ''

  // ── ACEITE ───────────────────────────────────────────────────────────────
  const aceite = tem('aceite') ? `<div class="page">
    ${headerInterno(numero, logoUrl)}
    <div class="section">
      <div class="section-title">Aceite da Proposta</div>
      <div class="aceite-box">
        <p><strong>Emiss\u00e3o:</strong> ${formatDate(prop?.dataEmissao)} &nbsp;&nbsp; <strong>Validade:</strong> ${prop?.dataValidade ? formatDate(prop.dataValidade) : '5 dias corridos'}</p>
        <p style="margin-top:4px">Esta proposta foi elaborada com base no seu perfil de consumo.</p>
      </div>
      <p style="margin-top:16px;font-size:14px;line-height:1.9">
        \u00c9 uma honra poder apresentar esta solu\u00e7\u00e3o de energia solar para voc\u00ea, ${cli?.nome?.split(' ')[0] ?? 'cliente'}.
        A Atom Tech se compromete a acompanhar cada etapa com transpar\u00eancia e qualidade.
      </p>
      <p style="margin-top:12px;font-size:13px;color:#666">Bras\u00edlia, em ${formatDate(prop?.dataEmissao)}.</p>
      <div class="assinatura-grid">
        <div><div class="assinatura-linha">${cli?.nome ?? 'Cliente'}</div></div>
        <div><div class="assinatura-linha">Atom Tech \u2014 Respons\u00e1vel Comercial</div></div>
      </div>
      ${tem('contato') ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px">
        <div><p style="font-size:12px;font-weight:700;color:#0E2040;margin-bottom:4px">Contato</p><p style="font-size:11px">${emp?.telefone ?? '(61) 3978-1738'} &middot; ${emp?.email ?? 'contato@atomtech.tec.br'}</p></div>
        <div><p style="font-size:12px;font-weight:700;color:#0E2040;margin-bottom:4px">Endere\u00e7o</p><p style="font-size:11px">${emp?.endereco ?? 'Edif\u00edcio SIA Centro Empresarial, Sala 231 B'} \u2014 ${emp?.cidade ?? 'Bras\u00edlia'}/DF</p></div>
      </div>` : ''}
    </div>
    ${footer(numero, emp)}
  </div>` : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta ${numero} \u2014 ${emp?.nome ?? 'Atom Tech'}</title>
  <style>${CSS}</style>
</head>
<body>
  ${capa}${apresentacao}${comoFunciona}${diferenciais}${garantias}${fornecedores}${regulamentacao}${dimensionamentoBloco}${analise}${fluxoCaixa}${condicoesBloco}${consideracoesBloco}${aceite}
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 800); };</script>
</body>
</html>`
}

export function abrirPdfNoNavegador(data: any): void {
  const html = gerarHTML(data)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')
  if (!win) alert('Popups bloqueados. Permita popups para este site e tente novamente.')
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
