// ═══════════════════════════════════════════════════════════════════
// Template HTML da Proposta Comercial
// Renderizado via Puppeteer → PDF
// Fiel à identidade visual Atom Tech (amarelo #F5A623, verde #2D9C4E)
// Lei 14.300/2022 — Fio B exibido na análise financeira
// ═══════════════════════════════════════════════════════════════════

const formatCurrency = (v: number | string | null | undefined): string => {
  const n = Number(v ?? 0)
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatKwh = (v: number | string | null | undefined): string =>
  `${Number(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh`

const formatPayback = (meses: number): string => {
  const anos = Math.floor(meses / 12)
  const m = meses % 12
  if (anos === 0) return `${m} meses`
  if (m === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`
  return `${anos}a ${m}m`
}

const formatDate = (s: any): string => {
  if (!s) return ''
  try {
    const date = new Date(s)
    if (!isNaN(date.getTime())) {
      const d = String(date.getUTCDate()).padStart(2, '0')
      const m = String(date.getUTCMonth() + 1).padStart(2, '0')
      const y = date.getUTCFullYear()
      return d + '/' + m + '/' + y
    }
    const str = String(s)
    if (str.includes('-')) {
      const parts = str.split('T')[0].split('-')
      return parts[2] + '/' + parts[1] + '/' + parts[0]
    }
    return str
  } catch(e) { return String(s) }
}

function renderTexto(txt: string | undefined | null): string {
  if (!txt) return ''
  return txt
    .split('\n\n').join('</p><p>')
    .split('\n').join('<br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; color: #222; background: white; font-size: 14px; line-height: 1.7; }
  .page { width: 210mm; min-height: 297mm; position: relative; overflow: hidden; display: flex; flex-direction: column; }
  .page-break { page-break-before: always; }
  .capa { background: linear-gradient(160deg, #0A1628 0%, #0E2040 55%, #102A50 100%); width: 210mm; min-height: 297mm; display: flex; flex-direction: column; position: relative; overflow: hidden; }
  .capa-bg-circle { position: absolute; border-radius: 50%; background: rgba(245,166,35,0.06); }
  .capa-top { padding: 28px 36px 0; display: flex; justify-content: space-between; align-items: center; }
  .capa-logo-area { display: flex; flex-direction: column; }
  .capa-logo-text-atom { font-size: 22px; font-weight: 900; color: #fff; letter-spacing: 2px; }
  .capa-logo-text-tech { font-size: 10px; font-weight: 400; color: #F5A623; letter-spacing: 6px; text-transform: uppercase; }
  .capa-logo-sub { font-size: 8px; color: rgba(255,255,255,0.4); letter-spacing: 2px; margin-top: 2px; }
  .capa-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 36px; }
  .capa-pretitle { font-size: 11px; color: #F5A623; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 16px; }
  .capa-title { font-size: 48px; font-weight: 900; color: #fff; line-height: 1.1; margin-bottom: 8px; }
  .capa-title span { color: #F5A623; }
  .capa-divider { width: 60px; height: 3px; background: #F5A623; margin: 20px 0; border-radius: 2px; }
  .capa-cliente-label { font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 3px; text-transform: uppercase; }
  .capa-cliente-nome { font-size: 18px; font-weight: 700; color: #fff; margin-top: 4px; }
  .capa-meta { display: flex; gap: 32px; margin-top: 16px; }
  .capa-meta-label { font-size: 9px; color: rgba(255,255,255,0.4); letter-spacing: 2px; text-transform: uppercase; }
  .capa-meta-value { font-size: 13px; color: rgba(255,255,255,0.8); font-weight: 600; margin-top: 2px; }
  .capa-footer { padding: 20px 36px; display: flex; justify-content: space-between; align-items: flex-end; }
  .capa-footer-left { font-size: 9px; color: rgba(255,255,255,0.3); line-height: 1.6; }
  .capa-footer-right { font-size: 9px; color: rgba(255,255,255,0.3); text-align: right; }
  .header-interno { background: #0E2040; padding: 14px 36px; display: flex; justify-content: space-between; align-items: center; }
  .header-logo { font-size: 14px; font-weight: 900; color: #fff; letter-spacing: 1px; }
  .header-logo span { color: #F5A623; }
  .header-tag { font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 3px; text-transform: uppercase; }
  .section { padding: 28px 36px; flex: 1; }
  .section-title { font-size: 20px; font-weight: 800; color: #0E2040; border-left: 4px solid #F5A623; padding-left: 12px; margin-bottom: 16px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
  .kpi-card { background: #f8f9fc; border-radius: 10px; padding: 16px; border-top: 3px solid #F5A623; }
  .kpi-label { font-size: 11px; color: #888; letter-spacing: 2px; text-transform: uppercase; }
  .kpi-value { font-size: 24px; font-weight: 800; color: #0E2040; margin-top: 4px; }
  .kpi-unit { font-size: 11px; color: #888; font-weight: 400; }
  .kpi-card-green { border-top-color: #2D9C4E; }
  .kpi-card-blue { border-top-color: #1565C0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #0E2040; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
  th:last-child { text-align: right; }
  td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; color: #333; }
  td:last-child { text-align: right; font-weight: 600; }
  tr:nth-child(even) td { background: #fafafa; }
  tr.total td { background: #0E2040; color: #fff; font-weight: 700; font-size: 13px; }
  .fc-table th { font-size: 8px; padding: 6px 8px; }
  .fc-table td { padding: 7px 8px; font-size: 12px; }
  .fc-table td.positivo { color: #2D9C4E; font-weight: 700; }
  .fc-table td.negativo { color: #c0392b; font-weight: 700; }
  .pagamento-box { border: 2px solid #F5A623; border-radius: 10px; padding: 16px; margin: 10px 0; }
  .pagamento-tipo { font-size: 13px; font-weight: 700; color: #0E2040; margin-bottom: 8px; }
  .pagamento-linha { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
  .pagamento-linha:last-child { border-bottom: none; }
  .pagamento-desc { color: #444; font-size: 13px; }
  .pagamento-valor { font-weight: 700; color: #0E2040; }
  .cronograma-item { display: flex; gap: 14px; margin-bottom: 12px; align-items: flex-start; }
  .cronograma-dot { width: 28px; height: 28px; border-radius: 50%; background: #F5A623; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #0E2040; }
  .cronograma-line { flex: 1; }
  .cronograma-prazo { font-size: 11px; color: #F5A623; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .cronograma-desc { font-size: 14px; color: #333; margin-top: 2px; }
  .comparativo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
  .comp-card { border-radius: 10px; padding: 16px; text-align: center; }
  .comp-poupanca { background: #f0f7f0; }
  .comp-rf { background: #f0f4f7; }
  .comp-solar { background: linear-gradient(135deg, #fff8e8, #fff3d0); border: 2px solid #F5A623; }
  .comp-label { font-size: 11px; color: #888; letter-spacing: 2px; text-transform: uppercase; }
  .comp-value { font-size: 15px; font-weight: 800; color: #0E2040; margin-top: 6px; }
  .comp-badge { font-size: 12px; color: #F5A623; font-weight: 700; margin-top: 4px; }
  .aceite-box { background: #f8f9fc; border-radius: 10px; padding: 24px; margin: 16px 0; }
  .assinatura-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
  .assinatura-linha { border-top: 1px solid #333; padding-top: 8px; text-align: center; font-size: 10px; color: #555; }
  .reducao-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px; margin: 12px 0; }
  .reducao-header { background: #0E2040; color: #fff; padding: 10px 14px; font-size: 10px; font-weight: 600; }
  .reducao-cell { background: #f8f9fc; padding: 12px 14px; }
  .reducao-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .reducao-value { font-size: 16px; font-weight: 700; color: #0E2040; margin-top: 2px; }
  .reducao-value.economia { color: #2D9C4E; }
  .fiob-box { background: #fff8f0; border-left: 4px solid #E65100; border-radius: 0 8px 8px 0; padding: 10px 14px; margin-top: 10px; font-size: 11px; color: #444; line-height: 1.6; }
  .fiob-box strong { color: #E65100; }
  .fiob-box-gd1 { background: #f0f7f0; border-left: 4px solid #2D9C4E; border-radius: 0 8px 8px 0; padding: 10px 14px; margin-top: 10px; font-size: 11px; color: #444; line-height: 1.6; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 20px; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .badge-gd1 { background: #e8f5ed; color: #1e6e35; }
  .badge-gd2 { background: #fff3e0; color: #E65100; }
  .footer { background: #0E2040; padding: 16px 36px; display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
  .footer-text { font-size: 9px; color: rgba(255,255,255,0.5); line-height: 1.5; }
  .footer-numero { font-size: 9px; color: rgba(255,255,255,0.3); font-family: monospace; }
  p { font-size: 12px; color: #444; line-height: 1.7; margin-bottom: 8px; }
  ul { padding-left: 18px; margin: 8px 0; }
  li { font-size: 12px; color: #444; line-height: 1.8; }
  strong { font-weight: 700; color: #0E2040; }
  .highlight-box { background: linear-gradient(135deg, #fff8e8, #fff3d0); border-left: 4px solid #F5A623; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 12px 0; }
  .highlight-box p { margin: 0; color: #0E2040; font-weight: 600; }
`

function headerInterno(numero: string, logoUrl?: string | null) {
  return `
    <div class="header-interno">
      <div class="header-logo">${logoUrl ? `<img src="${logoUrl}" style="height:28px;object-fit:contain;" alt="Logo"/>` : `ATOM<span>TECH</span>`} <small style="font-size:9px;font-weight:300;color:rgba(255,255,255,0.4);margin-left:8px">Energia Solar e Tecnologia</small></div>
      <div class="header-tag">Proposta Comercial &middot; ${numero}</div>
    </div>
  `
}

function footer(numero: string) {
  return `
    <div class="footer">
      <div class="footer-text">Atom Tech &mdash; Energia Solar e Tecnologia<br>Bras&iacute;lia/DF &middot; contato@atomtech.tec.br &middot; (61) 3978-1738</div>
      <div class="footer-numero">${numero}</div>
    </div>
  `
}

export function gerarHTMLProposta(data: any): string {
  const { proposta: prop, empresa: emp, cliente: cli, fatura: fat,
    dimensionamento: dim, equipamentos: equips, precificacao: prec,
    analiseFinanceira: af, condicoesComerciais: condicoes,
    blocos, textos, cronograma } = data

  const numero     = prop.numero ?? 'AT-2026-XXXX'
  const precoFinal = Number(prec?.precoFinal ?? 0)

  const blocosAtivos = (blocos ?? []).filter((b: any) => b.ativo).map((b: any) => b.tipoBloco)
  const temBloco = (tipo: string) => blocosAtivos.includes(tipo)

  // ── CAPA ──────────────────────────────────────────────────────────────────
  const capa = temBloco('capa') ? `
    <div class="page capa">
      <div class="capa-bg-circle" style="width:400px;height:400px;top:-100px;right:-100px;"></div>
      <div class="capa-bg-circle" style="width:200px;height:200px;bottom:80px;left:-60px;"></div>
      <div class="capa-top">
        <div class="capa-logo-area">
          ${emp?.logoUrl
            ? `<img src="${emp.logoUrl}" style="height:60px;max-width:180px;object-fit:contain;" alt="Logo"/>`
            : `<span class="capa-logo-text-atom">ATOM TECH</span>
               <span class="capa-logo-text-tech">Energia Solar</span>
               <span class="capa-logo-sub">&amp; Tecnologia</span>`
          }
        </div>
        <div style="font-size:9px;color:rgba(255,255,255,0.3);text-align:right">Bras&iacute;lia/DF<br>www.atomtech.tec.br</div>
      </div>
      <div class="capa-body">
        <div class="capa-pretitle">Proposta Comercial</div>
        <div class="capa-title">ENERGIA<br><span>SOLAR</span><br>PARA VOC&Ecirc;</div>
        <div class="capa-divider"></div>
        <div class="capa-cliente-label">Preparado para</div>
        <div class="capa-cliente-nome">${cli?.nome ?? ''}</div>
        <div class="capa-meta">
          <div class="capa-meta-item">
            <div class="capa-meta-label">Data</div>
            <div class="capa-meta-value">${formatDate(prop.dataEmissao)}</div>
          </div>
          <div class="capa-meta-item">
            <div class="capa-meta-label">Validade</div>
            <div class="capa-meta-value">${prop.dataValidade ? formatDate(prop.dataValidade) : '5 dias'}</div>
          </div>
          <div class="capa-meta-item">
            <div class="capa-meta-label">Proposta</div>
            <div class="capa-meta-value">${numero}</div>
          </div>
        </div>
      </div>
      <div class="capa-footer">
        <div class="capa-footer-left">
          Edif&iacute;cio SIA Centro Empresarial &mdash; Sala 231 B<br>
          Setor de Ind&uacute;stria e Abastecimento, Bras&iacute;lia/DF<br>
          CEP 71200-030
        </div>
        <div class="capa-footer-right">
          contato@atomtech.tec.br<br>
          (61) 3978-1738
        </div>
      </div>
    </div>
  ` : ''

  // ── APRESENTAÇÃO ──────────────────────────────────────────────────────────
  const apresentacao = temBloco('apresentacao_empresa') ? `
    <div class="page page-break">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section">
        <div class="section-title">Conhe&ccedil;a a Atom Tech</div>
        <p>${renderTexto(textos?.apresentacao_empresa) || 'A Atom Tech &eacute; uma empresa especializada em sistemas fotovoltaicos.'}</p>
        <div style="margin-top:24px">
          <div class="section-title" style="font-size:16px">Sua Proposta Inclui</div>
          <p>${renderTexto(textos?.o_que_inclui) || '- Dimensionamento do sistema<br>- Projeto de engenharia<br>- Fornecimento e instala&ccedil;&atilde;o<br>- Testes e homologa&ccedil;&atilde;o'}</p>
        </div>
      </div>
      ${footer(numero)}
    </div>
  ` : ''

  // ── COMO FUNCIONA + REGULAMENTAÇÃO ────────────────────────────────────────
  const comoFunciona = (temBloco('como_funciona') || temBloco('regulamentacao')) ? `
    ${temBloco('como_funciona') ? `<div class="page page-break">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section" style="flex:1">
        <div class="section-title">Como Funciona a Energia Solar</div>
        <div style="font-size:13px;line-height:1.8;color:#333"><p>${renderTexto(textos?.como_funciona) || 'Os pain&eacute;is solares captam a energia do Sol e transformam em corrente cont&iacute;nua. O inversor converte para corrente alternada.'}</p></div>
      </div>
      ${footer(numero)}
    </div>` : ''}
    ${temBloco('regulamentacao') ? `<div class="page page-break">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section" style="flex:1">
        <div class="section-title">Regulamenta&ccedil;&atilde;o no Brasil</div>
        <div style="font-size:13px;line-height:1.8;color:#333"><p>${renderTexto(textos?.regulamentacao)}</p></div>
      </div>
      ${footer(numero)}
    </div>` : ''}
  ` : ''

  // ── DIFERENCIAIS + GARANTIAS + FORNECEDORES ───────────────────────────────
  const diferenciais = (temBloco('diferenciais') || temBloco('garantias') || temBloco('fornecedores')) ? `
    ${temBloco('diferenciais') ? `<div class="page page-break">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section" style="flex:1">
        <div class="section-title">Diferenciais da Atom Tech</div>
        <div style="font-size:13px;line-height:1.8;color:#333"><p>${renderTexto(textos?.diferenciais) || 'Efici&ecirc;ncia, economia, sustentabilidade e valoriza&ccedil;&atilde;o do im&oacute;vel.'}</p></div>
      </div>
      ${footer(numero)}
    </div>` : ''}
    ${(temBloco('garantias') || temBloco('fornecedores')) ? `<div class="page page-break">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section" style="flex:1">
        ${temBloco('garantias') ? `
        <div class="section-title">Garantias Inclusas</div>
        <div style="font-size:13px;line-height:1.8;color:#333"><p>${renderTexto(textos?.garantias) || 'Instala&ccedil;&atilde;o: 1 ano. M&oacute;dulos: 12 anos. Inversores: 10 anos.'}</p></div>
        ` : ''}
        ${temBloco('fornecedores') ? `
        <div style="margin-top:32px">
          <div class="section-title">Fornecedores</div>
          <div style="font-size:13px;line-height:1.8;color:#333"><p>${renderTexto(textos?.fornecedores) || 'Trabalhamos com fabricantes TIER 1: JA Solar, Trina Solar, Sungrow, GoodWe, Huawei, WEG.'}</p></div>
        </div>
        ` : ''}
      </div>
      ${footer(numero)}
    </div>` : ''}
  ` : ''

  // ── DIMENSIONAMENTO ───────────────────────────────────────────────────────
  const dimensionamentoBloco = temBloco('dimensionamento') ? `
    <div class="page page-break">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section">
        <div class="section-title">Dimensionamento do Sistema</div>
        <p>O sistema foi dimensionado exclusivamente para o seu perfil de consumo, considerando o hist&oacute;rico de energia el&eacute;trica e as melhores pr&aacute;ticas de engenharia fotovoltaica.</p>
        <div class="kpi-grid" style="margin-top:16px">
          <div class="kpi-card">
            <div class="kpi-label">Pot&ecirc;ncia Proposta</div>
            <div class="kpi-value">${Number(dim?.potenciaFinalKwp ?? 0).toFixed(2)} <span class="kpi-unit">kWp</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Gera&ccedil;&atilde;o Estimada</div>
            <div class="kpi-value">${Number(dim?.economiaMensalEstimada ?? 0) > 0 ? formatKwh((Number(dim?.geracaoAnualKwh ?? 0) / 12)) : '&mdash;'} <span class="kpi-unit">/m&ecirc;s</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">&Aacute;rea Necess&aacute;ria</div>
            <div class="kpi-value">${Number(dim?.areaEstimadaM2 ?? 0).toFixed(0)} <span class="kpi-unit">m&sup2;</span></div>
          </div>
          <div class="kpi-card kpi-card-green">
            <div class="kpi-label">Consumo M&eacute;dio</div>
            <div class="kpi-value">${formatKwh(dim?.consumoMedioMensalKwh)} <span class="kpi-unit">/m&ecirc;s</span></div>
          </div>
          <div class="kpi-card kpi-card-green">
            <div class="kpi-label">% de Compensa&ccedil;&atilde;o</div>
            <div class="kpi-value">${Number(dim?.percentualCompensacao ?? 0).toFixed(0)}<span class="kpi-unit">%</span></div>
          </div>
          <div class="kpi-card kpi-card-green">
            <div class="kpi-label">Economia Mensal Est.</div>
            <div class="kpi-value" style="font-size:16px">${formatCurrency(dim?.economiaMensalEstimada)}</div>
          </div>
        </div>
        ${temBloco('equipamentos') ? `
        <div style="margin-top:20px">
          <div class="section-title" style="font-size:16px">Principais Equipamentos e Servi&ccedil;os Inclusos</div>
          <table>
            <thead><tr><th>Item</th><th>Fabricante / Modelo</th><th style="text-align:center">Qtd.</th><th>Pot&ecirc;ncia</th><th>Garantia</th></tr></thead>
            <tbody>
              ${(equips ?? []).length > 0 ? equips.map((eq: any) => `
                <tr>
                  <td>${eq.tipo === 'modulo' ? 'M&oacute;dulos Fotovoltaicos' : eq.tipo === 'inversor' ? 'Inversor(es)' : eq.tipo === 'microinversor' ? 'Microinversor(es)' : eq.tipo}</td>
                  <td style="color:#555">${[eq.fabricante, eq.modelo].filter(Boolean).join(' &mdash; ') || 'A confirmar'}</td>
                  <td style="text-align:center;font-weight:700;color:#F5A623">${eq.quantidade}</td>
                  <td>${eq.potenciaWp ? (eq.tipo === 'modulo' ? `${eq.potenciaWp} Wp` : `${(eq.potenciaWp/1000%1===0)?(eq.potenciaWp/1000).toFixed(0):(eq.potenciaWp/1000).toFixed(2).replace('.',',')} kW`) : '&mdash;'}</td>
                  <td>${eq.garantiaAnos ? `${eq.garantiaAnos} anos` : '&mdash;'}</td>
                </tr>
              `).join('') : `<tr><td>M&oacute;dulos Fotovoltaicos</td><td style="color:#555">A confirmar</td><td style="text-align:center;font-weight:700;color:#F5A623">${dim?.quantidadeModulos ?? '&mdash;'}</td><td>&mdash;</td><td>12 anos</td></tr>`}
            </tbody>
          </table>
        </div>
        ` : ''}
        ${temBloco('cronograma') ? `
        <div style="margin-top:20px">
          <div class="section-title" style="font-size:16px">Cronograma</div>
          <div style="margin-top:12px">
            ${(cronograma ?? []).map((m: any, i: number) => `
              <div class="cronograma-item">
                <div class="cronograma-dot">${i + 1}</div>
                <div class="cronograma-line">
                  ${m.prazoTexto ? `<div class="cronograma-prazo">${m.prazoTexto}</div>` : ''}
                  <div class="cronograma-desc">${m.descricao}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
      ${footer(numero)}
    </div>
  ` : ''

  // ── ANÁLISE FINANCEIRA ────────────────────────────────────────────────────
  const analise = temBloco('analise_financeira') ? (() => {
    const enquadramentoGD = af?.enquadramentoGD ?? 'GD2'
    const pctFioB         = Number(af?.pctFioBVigente ?? 0)
    const custoFioBMensal = Number(af?.custoFioBMensalAno1 ?? 0)
    const isGD1           = enquadramentoGD === 'GD1'
    const distribuidora   = cli?.distribuidora || fat?.distribuidora || 'concession&aacute;ria local'

    // Cálculo consistente do "Antes da Instalação"
    const economiaMensal = Number(af?.economiaMensalAno1 ?? 0)
    const valorFatura    = Number(fat?.valorTotal ?? 0)
    const pctCompensacao = Number(dim?.percentualCompensacao ?? 0) / 100
    const custoAntes     = valorFatura > 0 ? valorFatura : pctCompensacao > 0 ? economiaMensal / pctCompensacao : economiaMensal
    const custoResidual  = Math.max(0, custoAntes - economiaMensal)

    return `
    <div class="page page-break">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section">
        <div class="section-title">An&aacute;lise Financeira do Investimento</div>
        <p>Investir em energia solar &eacute; uma das decis&otilde;es financeiras mais inteligentes. Com retorno garantido, previs&iacute;vel e isento de imposto de renda, o sistema fotovoltaico supera as aplica&ccedil;&otilde;es financeiras tradicionais.</p>

        <div class="highlight-box">
          <p>An&aacute;lise para investimento de <strong>${formatCurrency(precoFinal)}</strong>,
          infla&ccedil;&atilde;o energ&eacute;tica de 9,5% a.a. e 25 anos de vida &uacute;til.
          Enquadramento: <span class="badge badge-${isGD1 ? 'gd1' : 'gd2'}">${enquadramentoGD}</span>
          &nbsp;&middot;&nbsp;
          ${!isGD1 ? `Fio B vigente: <strong>${(pctFioB * 100).toFixed(0)}%</strong> &mdash; ${distribuidora}` : '<strong style="color:#2D9C4E">Isento do Fio B at&eacute; 2045</strong>'}
          </p>
        </div>

        ${temBloco('indicadores_financeiros') ? `
        <div class="kpi-grid" style="margin-top:16px">
          <div class="kpi-card">
            <div class="kpi-label">Payback Simples</div>
            <div class="kpi-value" style="font-size:16px">${formatPayback(Number(af?.paybackSimplesMeses ?? 0))}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">VPL (25 anos)</div>
            <div class="kpi-value" style="font-size:15px">${formatCurrency(af?.vpl)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">TIR</div>
            <div class="kpi-value">${(Number(af?.tir ?? 0) * 100).toFixed(2)}<span class="kpi-unit">%</span></div>
          </div>
        </div>
        <div style="margin-top:16px">
          <p style="font-size:11px;color:#888;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Saldo ap&oacute;s 25 anos &mdash; Comparativo de Investimentos</p>
          <div class="comparativo-grid">
            <div class="comp-card comp-poupanca">
              <div class="comp-label">Poupan&ccedil;a</div>
              <div class="comp-value">${formatCurrency(af?.comparativoPoupanca25a)}</div>
              <div class="comp-badge" style="color:#888">~4,3% a.a.</div>
            </div>
            <div class="comp-card comp-rf">
              <div class="comp-label">Renda Fixa</div>
              <div class="comp-value">${formatCurrency(af?.comparativoRendaFixa25a)}</div>
              <div class="comp-badge" style="color:#1a56c4">~7,4% a.a.</div>
            </div>
            <div class="comp-card comp-solar">
              <div class="comp-label">Sistema Solar</div>
              <div class="comp-value">${formatCurrency(af?.saldo25Anos)}</div>
              <div class="comp-badge">Melhor retorno</div>
            </div>
          </div>
        </div>
        ` : ''}

        ${temBloco('reducao_conta') ? `
        <div style="margin-top:20px">
          <div class="section-title" style="font-size:16px">Redu&ccedil;&atilde;o da Conta de Energia</div>
          <div class="reducao-grid">
            <div>
              <div class="reducao-header">Antes da Instala&ccedil;&atilde;o</div>
              <div class="reducao-cell">
                <div class="reducao-label">Custo Mensal de Energia</div>
                <div class="reducao-value">${formatCurrency(custoAntes)}</div>
              </div>
            </div>
            <div>
              <div class="reducao-header">Economia M&eacute;dia Mensal</div>
              <div class="reducao-cell">
                <div class="reducao-label">Gera&ccedil;&atilde;o Solar (l&iacute;quida)</div>
                <div class="reducao-value economia">${formatCurrency(economiaMensal)}</div>
              </div>
            </div>
            <div>
              <div class="reducao-header">Depois da Instala&ccedil;&atilde;o</div>
              <div class="reducao-cell">
                <div class="reducao-label">Custo Residual</div>
                <div class="reducao-value">${formatCurrency(custoResidual)}</div>
              </div>
            </div>
          </div>

          ${!isGD1 && custoFioBMensal > 0 ? `
          <div class="fiob-box">
            <strong>Fio B &mdash; Lei 14.300/2022 (${enquadramentoGD}):</strong>
            A economia acima j&aacute; considera o impacto do Fio B.
            Para sistemas conectados ap&oacute;s 07/01/2023, a ${distribuidora} cobra
            <strong>${(pctFioB * 100).toFixed(0)}%</strong> do componente TUSD Fio B
            sobre a energia compensada (&asymp;55% injetada na rede) &mdash;
            equivalente a <strong>${formatCurrency(custoFioBMensal)}/m&ecirc;s</strong> no 1&ordm; ano.
            Esse percentual sobe progressivamente at&eacute; 100% em 2029, conforme cronograma legal.
          </div>
          ` : isGD1 ? `
          <div class="fiob-box-gd1">
            <strong style="color:#2D9C4E">Direito Adquirido &mdash; GD1:</strong>
            Este sistema est&aacute; isento da cobran&ccedil;a do Fio B at&eacute; 31/12/2045,
            garantindo a economia m&aacute;xima pelo per&iacute;odo vigente.
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
      ${footer(numero)}
    </div>
  `})() : ''

  // ── FLUXO DE CAIXA ────────────────────────────────────────────────────────
  const _fluxoTodos = (af?.fluxoCaixaJson as any[] ?? [])
  const _fluxoP1 = _fluxoTodos.slice(0, 13)
  const _fluxoP2 = _fluxoTodos.slice(13)
  const _thFluxo = `<thead><tr>
    <th style='text-align:center;width:35px'>ANO</th>
    <th style='text-align:right'>Gera&ccedil;&atilde;o (kWh)</th>
    <th style='text-align:right'>Tarifa (R$/kWh)</th>
    <th style='text-align:right'>Economia Anual</th>
    <th style='text-align:right'>Investimento</th>
    <th style='text-align:right'>Saldo Acumulado</th>
  </tr></thead>`
  const _trFluxo = (linhas: any[]) => linhas.map((f: any) => `
    <tr>
      <td style='text-align:center;font-weight:700;color:#0E2040'>${f.ano}</td>
      <td style='text-align:right'>${Number(f.geracaoKwh).toLocaleString('pt-BR')}</td>
      <td style='text-align:right'>${Number(f.tarifa).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3})}</td>
      <td style='text-align:right;color:#2D9C4E;font-weight:600'>${f.ano>0?formatCurrency(f.economiaAnual):'&mdash;'}</td>
      <td style='text-align:right;color:#c0392b'>${f.ano===0?formatCurrency(-precoFinal):'&mdash;'}</td>
      <td style='text-align:right;font-weight:600' class='${Number(f.saldoAcumulado)>=0?'positivo':'negativo'}'>${formatCurrency(f.saldoAcumulado)}</td>
    </tr>`).join('')
  const fluxoCaixaBloco = temBloco('fluxo_caixa') && af?.fluxoCaixaJson ? `
    <div class='page page-break'>
      ${headerInterno(numero, emp?.logoUrl)}
      <div class='section' style='flex:1'>
        <div class='section-title'>Fluxo de Caixa do Projeto</div>
        <p style='font-size:11px;color:#888;margin:0 0 8px'>Anos 0 a 12</p>
        <table class='fc-table' style='font-size:11px'>${_thFluxo}<tbody>${_trFluxo(_fluxoP1)}</tbody></table>
      </div>
      ${footer(numero)}
    </div>
    <div class='page page-break'>
      ${headerInterno(numero, emp?.logoUrl)}
      <div class='section' style='flex:1'>
        <div class='section-title'>Fluxo de Caixa do Projeto</div>
        <p style='font-size:11px;color:#888;margin:0 0 8px'>Anos 13 a 25</p>
        <table class='fc-table' style='font-size:11px'>${_thFluxo}<tbody>${_trFluxo(_fluxoP2)}</tbody></table>
      </div>
      ${footer(numero)}
    </div>
  ` : ''

  // ── CONDIÇÕES COMERCIAIS ──────────────────────────────────────────────────
  const condicoesBloco = (temBloco('condicoes_comerciais') || temBloco('formas_pagamento')) ? `
    <div class="page page-break">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section">
        <div class="section-title">Condi&ccedil;&otilde;es Comerciais</div>
        <div class="highlight-box">
          <p>Investimento Total: <strong>${formatCurrency(precoFinal)}</strong> &nbsp;&middot;&nbsp; Economia Estimada: <strong>${formatCurrency(af?.economiaMensalAno1)}/m&ecirc;s</strong></p>
        </div>
        <div style="margin-top:16px">
          <div class="section-title" style="font-size:16px">Formas de Pagamento</div>
          ${(condicoes ?? []).map((c: any) => `
            <div class="pagamento-box" style="margin-top:12px">
              <div class="pagamento-tipo">${c.descricao || c.tipo}</div>
              ${(c.parcelas ?? []).map((p: any) => `
                <div class="pagamento-linha">
                  <span class="pagamento-desc">${p.descricaoEvento}${p.prazoDias > 0 ? ` &mdash; at&eacute; ${p.prazoDias} dias ${p.tipoPrazo}` : ''}</span>
                  <span class="pagamento-valor">${c.tipo === 'financiamento' || c.tipo === 'cartao' ? '' : formatCurrency(p.valor)}</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        ${emp?.bancoPixChave ? `
        <div style="margin-top:16px;background:#f8f9fc;border-radius:8px;padding:14px">
          <p style="font-size:12px;color:#888;margin:12px 0 16px;font-style:italic">
            * Financiamento sujeito &agrave; an&aacute;lise de cr&eacute;dito.<br>
            ** Parcelamento no cart&atilde;o conforme taxas da operadora.
          </p>
          <p style="font-size:11px;font-weight:700;color:#0E2040;margin-bottom:6px">Dados para Pagamento</p>
          <p style="font-size:11px;color:#555">Chave PIX (CNPJ): <strong>${emp.bancoPixChave}</strong></p>
          ${emp.bancoNome ? `<p style="font-size:11px;color:#555">Banco: <strong>${emp.bancoNome}</strong>${emp.bancoAgencia ? ` &middot; Ag: ${emp.bancoAgencia}` : ''}${emp.bancoConta ? ` &middot; CC: ${emp.bancoConta}` : ''}</p>` : ''}
        </div>
        ` : ''}
      </div>
      ${footer(numero)}
    </div>
  ` : ''

  // ── ACEITE ────────────────────────────────────────────────────────────────
  const aceiteBloco = temBloco('aceite') ? `
    <div class="page page-break">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section">
        <div class="section-title">Aceite da Proposta</div>
        <div class="aceite-box">
          <p><strong>Emiss&atilde;o:</strong> ${formatDate(prop.dataEmissao)}&nbsp;&nbsp;&nbsp;<strong>Validade:</strong> ${prop.dataValidade ? formatDate(prop.dataValidade) : '5 dias corridos'}</p>
          <p style="margin-top:6px">Esta proposta foi elaborada com base no seu perfil de consumo e nas melhores solu&ccedil;&otilde;es dispon&iacute;veis no mercado.</p>
        </div>
        <p style="margin-top:20px;font-size:14px;line-height:1.8;color:#333">
          &Eacute; uma honra poder apresentar esta solu&ccedil;&atilde;o de energia solar para voc&ecirc;, ${cli?.nome?.split(' ')[0] ?? 'cliente'}.
          A Atom Tech se compromete a acompanhar cada etapa com transpar&ecirc;ncia, qualidade e respeito ao seu investimento.
        </p>
        <p style="margin-top:16px;font-size:13px;color:#666">Bras&iacute;lia, em ${formatDate(prop.dataEmissao)}.</p>
        <div class="assinatura-grid" style="margin-top:60px">
          <div><div class="assinatura-linha">${cli?.nome ?? 'Cliente'}</div></div>
          <div><div class="assinatura-linha">Atom Tech &mdash; Respons&aacute;vel Comercial</div></div>
        </div>
      </div>
      ${temBloco('contato') ? `
      <div class="section" style="padding-top:0;display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div>
          <p style="font-size:14px;font-weight:700;color:#0E2040;margin-bottom:10px">Contato</p>
          <p style="font-size:11px"><strong>Respons&aacute;vel Comercial:</strong> Eryelber Correia de Souza</p>
          <p style="font-size:11px">(61) 3978-1738</p>
          <p style="font-size:11px">eryelber@atomtech.tec.br</p>
        </div>
        <div>
          <p style="font-size:13px;font-weight:700;color:#0E2040;margin-bottom:8px">Nosso Endere&ccedil;o</p>
          <p style="font-size:11px">Edif&iacute;cio SIA Centro Empresarial &mdash; Sala 231 B</p>
          <p style="font-size:11px">Setor de Ind&uacute;stria e Abastecimento (SIA), Zona Industrial</p>
          <p style="font-size:11px">Bras&iacute;lia/DF &mdash; CEP: 71200-030</p>
        </div>
      </div>
      ` : ''}
      ${footer(numero)}
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposta Comercial ${numero} &mdash; Atom Tech</title>
  <style>${CSS}</style>
</head>
<body>
  ${capa}
  ${apresentacao}
  ${comoFunciona}
  ${diferenciais}
  ${dimensionamentoBloco}
  ${analise}
  ${fluxoCaixaBloco}
  ${condicoesBloco}
  ${prop.observacoesInternas ? `
    <div class="page page-break">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section" style="flex:1">
        <div class="section-title">Observa&ccedil;&otilde;es</div>
        <div style="background:#f8f9fa;border-left:4px solid #F5A623;padding:16px 20px;border-radius:0 8px 8px 0;margin-top:16px">
          <p style="color:#333;font-size:13px;line-height:1.8;margin:0;white-space:pre-line">${prop.observacoesInternas}</p>
        </div>
      </div>
      ${footer(numero)}
    </div>
  ` : ''}
  ${aceiteBloco}
</body>
</html>`
}
