// ═══════════════════════════════════════════════════════════════════
// gerarPdfBrowser.ts — Geração de PDF via window.print() no browser
// Coloque em: apps/web/src/lib/gerarPdfBrowser.ts
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
    const str = String(s)
    if (str.includes('T') || str.includes('-')) {
      const parts = str.split('T')[0].split('-')
      return parts[2] + '/' + parts[1] + '/' + parts[0]
    }
    return str
  } catch { return String(s) }
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
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #222; background: white; font-size: 14px; line-height: 1.7; }
  .page { width: 210mm; min-height: 297mm; position: relative; overflow: hidden; display: flex; flex-direction: column; page-break-after: always; }
  .capa { background: linear-gradient(160deg, #0A1628 0%, #0E2040 55%, #102A50 100%); width: 210mm; min-height: 297mm; display: flex; flex-direction: column; position: relative; overflow: hidden; }
  .capa-top { padding: 28px 36px 0; display: flex; justify-content: space-between; align-items: center; }
  .capa-logo-text-atom { font-size: 22px; font-weight: 900; color: #fff; letter-spacing: 2px; }
  .capa-logo-text-tech { font-size: 10px; font-weight: 400; color: #F5A623; letter-spacing: 6px; text-transform: uppercase; }
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
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #0E2040; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
  th:last-child { text-align: right; }
  td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; color: #333; }
  td:last-child { text-align: right; font-weight: 600; }
  tr:nth-child(even) td { background: #fafafa; }
  .pagamento-box { border: 2px solid #F5A623; border-radius: 10px; padding: 16px; margin: 10px 0; }
  .pagamento-tipo { font-size: 13px; font-weight: 700; color: #0E2040; margin-bottom: 8px; }
  .pagamento-linha { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
  .pagamento-linha:last-child { border-bottom: none; }
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
  .highlight-box { background: linear-gradient(135deg, #fff8e8, #fff3d0); border-left: 4px solid #F5A623; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 12px 0; }
  .highlight-box p { margin: 0; color: #0E2040; font-weight: 600; }
  .footer { background: #0E2040; padding: 16px 36px; display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
  .footer-text { font-size: 9px; color: rgba(255,255,255,0.5); line-height: 1.5; }
  .footer-numero { font-size: 9px; color: rgba(255,255,255,0.3); font-family: monospace; }
  p { font-size: 12px; color: #444; line-height: 1.7; margin-bottom: 8px; }
  ul { padding-left: 18px; margin: 8px 0; }
  li { font-size: 12px; color: #444; line-height: 1.8; }
  strong { font-weight: 700; color: #0E2040; }
  .reducao-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px; margin: 12px 0; }
  .reducao-header { background: #0E2040; color: #fff; padding: 10px 14px; font-size: 10px; font-weight: 600; }
  .reducao-cell { background: #f8f9fc; padding: 12px 14px; }
  .reducao-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .reducao-value { font-size: 16px; font-weight: 700; color: #0E2040; margin-top: 2px; }
  .reducao-value.economia { color: #2D9C4E; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; }
    @page { size: A4; margin: 0; }
  }
`

function headerInterno(numero: string, logoUrl?: string | null) {
  return `
    <div class="header-interno">
      <div class="header-logo">${logoUrl
        ? `<img src="${logoUrl}" style="height:28px;object-fit:contain;" alt="Logo"/>`
        : `ATOM<span>TECH</span>`
      } <small style="font-size:9px;font-weight:300;color:rgba(255,255,255,0.4);margin-left:8px">Energia Solar e Tecnologia</small></div>
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

function gerarHTML(data: any): string {
  const { proposta: prop, empresa: emp, cliente: cli, fatura: fat,
    dimensionamento: dim, equipamentos: equips, precificacao: prec,
    analiseFinanceira: af, condicoesComerciais: condicoes, blocos, textos } = data

  const numero = prop?.numero ?? 'AT-2026-XXXX'
  const precoFinal = Number(prec?.precoFinal ?? 0)
  const blocosAtivos = (blocos ?? []).filter((b: any) => b.ativo).map((b: any) => b.tipoBloco)
  const tem = (tipo: string) => blocosAtivos.includes(tipo)

  // CAPA
  const capa = tem('capa') ? `
    <div class="page capa">
      <div class="capa-top">
        <div>
          ${emp?.logoUrl
            ? `<img src="${emp.logoUrl}" style="height:60px;max-width:180px;object-fit:contain;" alt="Logo"/>`
            : `<div class="capa-logo-text-atom">ATOM TECH</div>
               <div class="capa-logo-text-tech">Energia Solar</div>`
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
          <div><div class="capa-meta-label">Data</div><div class="capa-meta-value">${formatDate(prop?.dataEmissao)}</div></div>
          <div><div class="capa-meta-label">Validade</div><div class="capa-meta-value">${prop?.dataValidade ? formatDate(prop.dataValidade) : '5 dias'}</div></div>
          <div><div class="capa-meta-label">Proposta</div><div class="capa-meta-value">${numero}</div></div>
        </div>
      </div>
      <div class="capa-footer">
        <div class="capa-footer-left">Edif&iacute;cio SIA Centro Empresarial &mdash; Sala 231 B<br>Bras&iacute;lia/DF &mdash; CEP 71200-030</div>
        <div class="capa-footer-right">contato@atomtech.tec.br<br>(61) 3978-1738</div>
      </div>
    </div>` : ''

  // APRESENTAÇÃO
  const apresentacao = tem('apresentacao_empresa') ? `
    <div class="page">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section">
        <div class="section-title">Conhe&ccedil;a a Atom Tech</div>
        <p>${renderTexto(textos?.apresentacao_empresa?.conteudo) || 'A Atom Tech &eacute; especializada em sistemas fotovoltaicos.'}</p>
        ${tem('o_que_inclui') ? `
        <div style="margin-top:24px">
          <div class="section-title" style="font-size:16px">Sua Proposta Inclui</div>
          <p>${renderTexto(textos?.o_que_inclui?.conteudo) || 'Dimensionamento, projeto, fornecimento, instala&ccedil;&atilde;o e homologa&ccedil;&atilde;o.'}</p>
        </div>` : ''}
      </div>
      ${footer(numero)}
    </div>` : ''

  // DIMENSIONAMENTO
  const dimensionamentoBloco = tem('dimensionamento') ? `
    <div class="page">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section">
        <div class="section-title">Dimensionamento do Sistema</div>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Pot&ecirc;ncia Proposta</div>
            <div class="kpi-value">${Number(dim?.potenciaFinalKwp ?? 0).toFixed(2)} <span class="kpi-unit">kWp</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Gera&ccedil;&atilde;o/M&ecirc;s</div>
            <div class="kpi-value">${formatKwh(Number(dim?.geracaoAnualKwh ?? 0) / 12)} <span class="kpi-unit">/m&ecirc;s</span></div>
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
            <div class="kpi-label">% Compensa&ccedil;&atilde;o</div>
            <div class="kpi-value">${Number(dim?.percentualCompensacao ?? 0).toFixed(0)}<span class="kpi-unit">%</span></div>
          </div>
          <div class="kpi-card kpi-card-green">
            <div class="kpi-label">Economia/M&ecirc;s Est.</div>
            <div class="kpi-value" style="font-size:16px">${formatCurrency(dim?.economiaMensalEstimada)}</div>
          </div>
        </div>
        ${(equips ?? []).length > 0 ? `
        <div style="margin-top:20px">
          <div class="section-title" style="font-size:16px">Equipamentos</div>
          <table>
            <thead><tr><th>Item</th><th>Fabricante / Modelo</th><th style="text-align:center">Qtd.</th><th>Pot&ecirc;ncia</th><th>Garantia</th></tr></thead>
            <tbody>
              ${equips.map((eq: any) => `
                <tr>
                  <td>${eq.tipo === 'modulo' ? 'M&oacute;dulos Fotovoltaicos' : eq.tipo === 'microinversor' ? 'Microinversor(es)' : 'Inversor(es)'}</td>
                  <td style="color:#555">${[eq.fabricante, eq.modelo].filter(Boolean).join(' &mdash; ') || 'A confirmar'}</td>
                  <td style="text-align:center;font-weight:700;color:#F5A623">${eq.quantidade}</td>
                  <td>${eq.potenciaWp ? (eq.tipo === 'modulo' ? `${eq.potenciaWp} Wp` : `${(eq.potenciaWp/1000).toFixed(1)} kW`) : '&mdash;'}</td>
                  <td>${eq.garantiaAnos ? `${eq.garantiaAnos} anos` : '&mdash;'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : ''}
      </div>
      ${footer(numero)}
    </div>` : ''

  // ANÁLISE FINANCEIRA
  const analise = tem('analise_financeira') ? `
    <div class="page">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section">
        <div class="section-title">An&aacute;lise Financeira do Investimento</div>
        <div class="highlight-box">
          <p>Investimento de <strong>${formatCurrency(precoFinal)}</strong> com infla&ccedil;&atilde;o energ&eacute;tica de 9,5% a.a. e 25 anos de vida &uacute;til.</p>
        </div>
        <div class="kpi-grid" style="margin-top:16px">
          <div class="kpi-card">
            <div class="kpi-label">Payback Simples</div>
            <div class="kpi-value" style="font-size:18px">${formatPayback(Number(af?.paybackSimplesMeses ?? 0))}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">VPL (25 anos)</div>
            <div class="kpi-value" style="font-size:16px">${formatCurrency(af?.vpl)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">TIR</div>
            <div class="kpi-value">${(Number(af?.tir ?? 0) * 100).toFixed(2)}<span class="kpi-unit">%</span></div>
          </div>
        </div>
        <div style="margin-top:16px">
          <p style="font-size:11px;color:#888;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Saldo ap&oacute;s 25 anos &mdash; Comparativo</p>
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
        ${tem('reducao_conta') ? `
        <div style="margin-top:20px">
          <div class="section-title" style="font-size:16px">Redu&ccedil;&atilde;o da Conta de Energia</div>
          <div class="reducao-grid">
            <div>
              <div class="reducao-header">Antes da Instala&ccedil;&atilde;o</div>
              <div class="reducao-cell">
                <div class="reducao-label">Custo Mensal</div>
                <div class="reducao-value">${formatCurrency(fat?.valorTotal || Number(af?.economiaMensalAno1))}</div>
              </div>
            </div>
            <div>
              <div class="reducao-header">Economia M&eacute;dia Mensal</div>
              <div class="reducao-cell">
                <div class="reducao-label">Gera&ccedil;&atilde;o Solar</div>
                <div class="reducao-value economia">${formatCurrency(af?.economiaMensalAno1)}</div>
              </div>
            </div>
            <div>
              <div class="reducao-header">Depois da Instala&ccedil;&atilde;o</div>
              <div class="reducao-cell">
                <div class="reducao-label">Custo Residual</div>
                <div class="reducao-value">${formatCurrency(Math.max(0, Number(fat?.valorTotal || 0) - Number(af?.economiaMensalAno1 || 0)))}</div>
              </div>
            </div>
          </div>
        </div>` : ''}
      </div>
      ${footer(numero)}
    </div>` : ''

  // CONDIÇÕES COMERCIAIS
  const condicoesBloco = tem('condicoes_comerciais') ? `
    <div class="page">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section">
        <div class="section-title">Condi&ccedil;&otilde;es Comerciais</div>
        <div class="highlight-box">
          <p>Investimento Total: <strong>${formatCurrency(precoFinal)}</strong> &middot; Economia Estimada: <strong>${formatCurrency(af?.economiaMensalAno1)}/m&ecirc;s</strong></p>
        </div>
        <div style="margin-top:16px">
          <div class="section-title" style="font-size:16px">Formas de Pagamento</div>
          ${(condicoes ?? []).map((c: any) => `
            <div class="pagamento-box">
              <div class="pagamento-tipo">${c.descricao || c.tipo}</div>
              ${(c.parcelas ?? []).map((p: any) => `
                <div class="pagamento-linha">
                  <span>${p.descricaoEvento}${p.prazoDias > 0 ? ` &mdash; at&eacute; ${p.prazoDias} dias ${p.tipoPrazo}` : ''}</span>
                  <span style="font-weight:700">${c.tipo !== 'financiamento' ? formatCurrency(p.valor) : ''}</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>
      ${footer(numero)}
    </div>` : ''

  // ACEITE
  const aceite = tem('aceite') ? `
    <div class="page">
      ${headerInterno(numero, emp?.logoUrl)}
      <div class="section">
        <div class="section-title">Aceite da Proposta</div>
        <div class="aceite-box">
          <p><strong>Emiss&atilde;o:</strong> ${formatDate(prop?.dataEmissao)} &nbsp;&nbsp; <strong>Validade:</strong> ${prop?.dataValidade ? formatDate(prop.dataValidade) : '5 dias corridos'}</p>
          <p style="margin-top:6px">Esta proposta foi elaborada com base no seu perfil de consumo.</p>
        </div>
        <p style="margin-top:20px;font-size:14px;line-height:1.8">
          &Eacute; uma honra poder apresentar esta solu&ccedil;&atilde;o de energia solar para voc&ecirc;, ${cli?.nome?.split(' ')[0] ?? 'cliente'}.
          A Atom Tech se compromete a acompanhar cada etapa com transpar&ecirc;ncia e qualidade.
        </p>
        <p style="margin-top:16px;font-size:13px;color:#666">Bras&iacute;lia, em ${formatDate(prop?.dataEmissao)}.</p>
        <div class="assinatura-grid" style="margin-top:60px">
          <div><div class="assinatura-linha">${cli?.nome ?? 'Cliente'}</div></div>
          <div><div class="assinatura-linha">Atom Tech &mdash; Respons&aacute;vel Comercial</div></div>
        </div>
        ${tem('contato') ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:32px">
          <div>
            <p style="font-size:13px;font-weight:700;color:#0E2040;margin-bottom:8px">Contato</p>
            <p style="font-size:11px">(61) 3978-1738 &middot; eryelber@atomtech.tec.br</p>
          </div>
          <div>
            <p style="font-size:13px;font-weight:700;color:#0E2040;margin-bottom:8px">Endere&ccedil;o</p>
            <p style="font-size:11px">Edif&iacute;cio SIA Centro Empresarial, Sala 231 B &mdash; Bras&iacute;lia/DF</p>
          </div>
        </div>` : ''}
      </div>
      ${footer(numero)}
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta ${numero} &mdash; Atom Tech</title>
  <style>${CSS}</style>
</head>
<body>
  ${capa}${apresentacao}${dimensionamentoBloco}${analise}${condicoesBloco}${aceite}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 800);
    };
  </script>
</body>
</html>`
}

export function abrirPdfNoNavegador(data: any): void {
  const html = gerarHTML(data)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const janela = window.open(url, '_blank')
  if (!janela) {
    alert('Popups bloqueados. Permita popups para este site e tente novamente.')
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
