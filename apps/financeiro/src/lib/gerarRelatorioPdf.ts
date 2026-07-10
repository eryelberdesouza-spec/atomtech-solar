// ═══════════════════════════════════════════════════════════════════
// Gerador de PDF para Relatórios Financeiros — usa window.print()
// ═══════════════════════════════════════════════════════════════════

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const BASE_STYLE = `
  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px; color: #1a1a2e; background: #fff;
    padding: 20px 24px;
  }
  @media print {
    body { padding: 0; }
  }
  h1 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
  h2 { font-size: 13px; font-weight: 700; margin: 16px 0 8px; color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 4px; }
  h3 { font-size: 11px; font-weight: 700; margin: 10px 0 6px; color: #374151; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10B981; padding-bottom: 12px; margin-bottom: 16px; }
  .header-info p { font-size: 10px; color: #6B7280; line-height: 1.5; }
  .header-right { text-align: right; }
  .titulo-relatorio { font-size: 15px; font-weight: 800; color: #10B981; }
  .sub-titulo { font-size: 10px; color: #6B7280; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #064E3B; color: #fff; padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  th.right { text-align: right; }
  td { padding: 6px 10px; border-bottom: 1px solid #E5E7EB; font-size: 10.5px; vertical-align: middle; }
  td.right { text-align: right; font-weight: 600; }
  tr:nth-child(even) td { background: #F9FAFB; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .badge-green  { background: #D1FAE5; color: #065F46; }
  .badge-red    { background: #FEE2E2; color: #991B1B; }
  .badge-yellow { background: #FEF3C7; color: #92400E; }
  .badge-blue   { background: #DBEAFE; color: #1E40AF; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .kpi { background: #F3F4F6; border-radius: 8px; padding: 10px 12px; border-left: 3px solid #10B981; }
  .kpi-label { font-size: 9px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
  .kpi-value { font-size: 14px; font-weight: 800; color: #065F46; }
  .kpi-red   { border-left-color: #EF4444; } .kpi-red .kpi-value { color: #991B1B; }
  .kpi-blue  { border-left-color: #3B82F6; } .kpi-blue .kpi-value { color: #1E40AF; }
  .faixa-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; }
  .faixa { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px; text-align: center; }
  .faixa-label { font-size: 9px; color: #6B7280; font-weight: 700; margin-bottom: 4px; }
  .faixa-value { font-size: 13px; font-weight: 800; color: #1F2937; }
  .faixa-red .faixa-value { color: #DC2626; } .faixa-red .faixa-label { color: #991B1B; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #E5E7EB; font-size: 9px; color: #9CA3AF; text-align: center; }
  @media print { .no-print { display: none !important; } }
`

function cabecalho(titulo: string, sub: string, empresa: any) {
  return `
    <div class="header">
      <div class="header-info">
        <p><strong>${empresa?.nome ?? 'Atom Tech'}</strong></p>
        ${empresa?.cnpj ? `<p>CNPJ: ${empresa.cnpj}</p>` : ''}
        ${empresa?.cidade ? `<p>${empresa.cidade}${empresa.estado ? ` — ${empresa.estado}` : ''}</p>` : ''}
      </div>
      <div class="header-right">
        <div class="titulo-relatorio">${titulo}</div>
        <div class="sub-titulo">${sub}</div>
        <div class="sub-titulo">Emitido em: ${new Date().toLocaleString('pt-BR')}</div>
      </div>
    </div>
  `
}

function rodape() {
  return `<div class="footer">Atom Tech · AGF — Atom Gestão Financeira · Documento gerado automaticamente</div>`
}

function abrirJanela(html: string) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Permita popups para gerar o PDF'); return }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório</title><style>${BASE_STYLE}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`)
  win.document.close()
}

// ─── Contas a Pagar / Receber ─────────────────────────────────────────────────

export function gerarRelatorioLancamentos(opts: {
  rows: any[]
  tipo: 'PAGAR' | 'RECEBER'
  filtros: string
  empresa: any
}) {
  const { rows, tipo, filtros, empresa } = opts
  const titulo = tipo === 'PAGAR' ? 'Contas a Pagar' : 'Contas a Receber'
  const total  = rows.reduce((s: number, r: any) => s + Number(r.valor ?? r.valorOriginal ?? 0), 0)
  const pagas  = rows.filter((r: any) => r.status === 'PAGA').reduce((s: number, r: any) => s + Number(r.valorPago ?? r.valor ?? 0), 0)
  const aberto = rows.filter((r: any) => r.status !== 'PAGA').reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0)

  const html = `
    ${cabecalho(titulo, filtros, empresa)}
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Total de Parcelas</div><div class="kpi-value">${rows.length}</div></div>
      <div class="kpi ${tipo === 'PAGAR' ? 'kpi-red' : ''}"><div class="kpi-label">Valor Total</div><div class="kpi-value">${fmtBRL(total)}</div></div>
      <div class="kpi"><div class="kpi-label">Já ${tipo === 'PAGAR' ? 'Pago' : 'Recebido'}</div><div class="kpi-value" style="color:#065F46">${fmtBRL(pagas)}</div></div>
      <div class="kpi kpi-blue"><div class="kpi-label">Em Aberto</div><div class="kpi-value">${fmtBRL(aberto)}</div></div>
    </div>
    <table>
      <thead><tr>
        <th>Vencimento</th><th>${tipo === 'PAGAR' ? 'Fornecedor' : 'Cliente'}</th>
        <th>Descrição</th><th>Documento</th><th>Plano de Contas</th>
        <th class="right">Valor</th><th class="right">Status</th>
      </tr></thead>
      <tbody>
        ${rows.map((r: any) => {
          const st = r.statusDisplay ?? r.status
          const badge = st === 'PAGA' ? 'badge-green' : st === 'VENCIDA' ? 'badge-red' : 'badge-yellow'
          return `<tr>
            <td>${fmtData(r.vencimento)}</td>
            <td>${r.pessoaNome ?? '—'}</td>
            <td>${r.descricao ?? '—'}</td>
            <td>${r.documento ?? '—'}</td>
            <td>${r.planoNome ?? '—'}</td>
            <td class="right">${fmtBRL(Number(r.valor ?? 0))}</td>
            <td class="right"><span class="badge ${badge}">${st}</span></td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
    ${rodape()}
  `
  abrirJanela(html)
}

// ─── Aging ────────────────────────────────────────────────────────────────────

export function gerarRelatorioAging(opts: { data: any; tipo: string; empresa: any }) {
  const { data, tipo, empresa } = opts
  const { faixas, detalhes } = data
  const total = Object.values(faixas as Record<string, number>).reduce((s, v) => s + v, 0)

  const html = `
    ${cabecalho('Relatório de Aging', `Tipo: ${tipo} · ${detalhes.length} parcelas`, empresa)}
    <div class="faixa-grid">
      <div class="faixa"><div class="faixa-label">A Vencer</div><div class="faixa-value">${fmtBRL(faixas.aVencer)}</div></div>
      <div class="faixa faixa-red"><div class="faixa-label">0–30 dias</div><div class="faixa-value">${fmtBRL(faixas.a30)}</div></div>
      <div class="faixa faixa-red"><div class="faixa-label">31–60 dias</div><div class="faixa-value">${fmtBRL(faixas.a60)}</div></div>
      <div class="faixa faixa-red"><div class="faixa-label">61–90 dias</div><div class="faixa-value">${fmtBRL(faixas.a90)}</div></div>
      <div class="faixa faixa-red"><div class="faixa-label">+90 dias</div><div class="faixa-value">${fmtBRL(faixas.acima90)}</div></div>
    </div>
    <table>
      <thead><tr><th>Tipo</th><th>Vencimento</th><th>Dias Atraso</th><th>Pessoa</th><th>Descrição</th><th class="right">Valor</th><th>Faixa</th></tr></thead>
      <tbody>
        ${detalhes.map((r: any) => `<tr>
          <td>${r.tipo}</td>
          <td>${fmtData(r.vencimento)}</td>
          <td>${r.diasAtraso > 0 ? r.diasAtraso + ' dias' : 'A vencer'}</td>
          <td>${r.pessoaNome ?? '—'}</td>
          <td>${r.descricao}</td>
          <td class="right">${fmtBRL(r.valor)}</td>
          <td><span class="badge ${r.diasAtraso > 0 ? 'badge-red' : 'badge-blue'}">${r.faixa}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
    <p style="text-align:right;font-weight:700;font-size:12px;margin-top:8px">Total: ${fmtBRL(total)}</p>
    ${rodape()}
  `
  abrirJanela(html)
}

// ─── Extrato Bancário ─────────────────────────────────────────────────────────

export function gerarRelatorioExtrato(opts: { data: any; dataIni: string; dataFim: string; empresa: any }) {
  const { data, dataIni, dataFim, empresa } = opts
  const { conta, movimentos, saldoInicial, saldoFinal, totalEntradas, totalSaidas } = data

  let saldoCorrido = saldoInicial
  const linhas = movimentos.map((m: any) => {
    saldoCorrido += m.entrada - m.saida
    return `<tr>
      <td>${fmtData(m.data)}</td>
      <td>${m.descricao}</td>
      <td>${m.pessoaNome ?? '—'}</td>
      <td>${m.forma ?? '—'}</td>
      <td class="right" style="color:#065F46">${m.entrada > 0 ? fmtBRL(m.entrada) : '—'}</td>
      <td class="right" style="color:#991B1B">${m.saida > 0 ? fmtBRL(m.saida) : '—'}</td>
      <td class="right" style="font-weight:700;color:${saldoCorrido >= 0 ? '#065F46' : '#991B1B'}">${fmtBRL(saldoCorrido)}</td>
    </tr>`
  }).join('')

  const html = `
    ${cabecalho('Extrato Bancário', `${conta?.nome ?? ''} · ${fmtData(dataIni)} a ${fmtData(dataFim)}`, empresa)}
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Saldo Inicial</div><div class="kpi-value">${fmtBRL(saldoInicial)}</div></div>
      <div class="kpi"><div class="kpi-label">Total Entradas</div><div class="kpi-value">${fmtBRL(totalEntradas)}</div></div>
      <div class="kpi kpi-red"><div class="kpi-label">Total Saídas</div><div class="kpi-value">${fmtBRL(totalSaidas)}</div></div>
      <div class="kpi ${saldoFinal >= 0 ? '' : 'kpi-red'}"><div class="kpi-label">Saldo Final</div><div class="kpi-value">${fmtBRL(saldoFinal)}</div></div>
    </div>
    <table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Pessoa</th><th>Forma</th><th class="right">Entrada</th><th class="right">Saída</th><th class="right">Saldo</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    ${rodape()}
  `
  abrirJanela(html)
}

// ─── Por Centro de Custo ──────────────────────────────────────────────────────

export function gerarRelatorioCentroCusto(opts: { rows: any[]; filtros: string; empresa: any }) {
  const { rows, filtros, empresa } = opts
  const totalRec = rows.reduce((s: number, r: any) => s + r.receitas, 0)
  const totalDesp = rows.reduce((s: number, r: any) => s + r.despesas, 0)

  const html = `
    ${cabecalho('Relatório por Centro de Custo', filtros, empresa)}
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><div class="kpi-label">Total Receitas</div><div class="kpi-value">${fmtBRL(totalRec)}</div></div>
      <div class="kpi kpi-red"><div class="kpi-label">Total Despesas</div><div class="kpi-value">${fmtBRL(totalDesp)}</div></div>
      <div class="kpi ${totalRec - totalDesp >= 0 ? '' : 'kpi-red'}"><div class="kpi-label">Resultado</div><div class="kpi-value">${fmtBRL(totalRec - totalDesp)}</div></div>
    </div>
    <table>
      <thead><tr><th>Código</th><th>Centro de Custo</th><th class="right">Receitas</th><th class="right">Despesas</th><th class="right">Resultado</th></tr></thead>
      <tbody>
        ${rows.map((r: any) => `<tr>
          <td>${r.codigo}</td><td>${r.nome}</td>
          <td class="right" style="color:#065F46">${fmtBRL(r.receitas)}</td>
          <td class="right" style="color:#991B1B">${fmtBRL(r.despesas)}</td>
          <td class="right" style="font-weight:700;color:${r.resultado >= 0 ? '#065F46' : '#991B1B'}">${fmtBRL(r.resultado)}</td>
        </tr>`).join('')}
        <tr style="font-weight:700;background:#F3F4F6">
          <td colspan="2"><strong>TOTAL</strong></td>
          <td class="right" style="color:#065F46"><strong>${fmtBRL(totalRec)}</strong></td>
          <td class="right" style="color:#991B1B"><strong>${fmtBRL(totalDesp)}</strong></td>
          <td class="right" style="color:${totalRec - totalDesp >= 0 ? '#065F46' : '#991B1B'}"><strong>${fmtBRL(totalRec - totalDesp)}</strong></td>
        </tr>
      </tbody>
    </table>
    ${rodape()}
  `
  abrirJanela(html)
}

// ─── Por Fornecedor / Cliente ─────────────────────────────────────────────────

export function gerarRelatorioPorPessoa(opts: { rows: any[]; tipo: string; filtros: string; empresa: any }) {
  const { rows, tipo, filtros, empresa } = opts
  const totalPago = rows.reduce((s: number, r: any) => s + r.pago, 0)
  const totalRec  = rows.reduce((s: number, r: any) => s + r.recebido, 0)

  const html = `
    ${cabecalho(`Relatório por ${tipo === 'PAGAR' ? 'Fornecedor' : tipo === 'RECEBER' ? 'Cliente' : 'Pessoa'}`, filtros, empresa)}
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><div class="kpi-label">Pessoas no Período</div><div class="kpi-value">${rows.length}</div></div>
      <div class="kpi"><div class="kpi-label">Total Recebido</div><div class="kpi-value">${fmtBRL(totalRec)}</div></div>
      <div class="kpi kpi-red"><div class="kpi-label">Total Pago</div><div class="kpi-value">${fmtBRL(totalPago)}</div></div>
    </div>
    <table>
      <thead><tr><th>Pessoa</th><th class="right">Títulos</th><th class="right">Recebido</th><th class="right">Pago</th><th class="right">Saldo</th></tr></thead>
      <tbody>
        ${rows.map((r: any) => `<tr>
          <td>${r.nome}</td>
          <td class="right">${r.qtdTitulos}</td>
          <td class="right" style="color:#065F46">${r.recebido > 0 ? fmtBRL(r.recebido) : '—'}</td>
          <td class="right" style="color:#991B1B">${r.pago > 0 ? fmtBRL(r.pago) : '—'}</td>
          <td class="right" style="font-weight:700;color:${r.recebido - r.pago >= 0 ? '#065F46' : '#991B1B'}">${fmtBRL(r.recebido - r.pago)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${rodape()}
  `
  abrirJanela(html)
}

// ─── Inadimplência ────────────────────────────────────────────────────────────

export function gerarRelatorioInadimplencia(opts: { data: any; tipo: string; empresa: any }) {
  const { data, tipo, empresa } = opts
  const { totalVencido, qtdParcelas, porPessoa, detalhes } = data

  const html = `
    ${cabecalho('Relatório de Inadimplência', `Tipo: ${tipo} · Base: ${new Date().toLocaleDateString('pt-BR')}`, empresa)}
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi kpi-red"><div class="kpi-label">Total Vencido</div><div class="kpi-value">${fmtBRL(totalVencido)}</div></div>
      <div class="kpi kpi-red"><div class="kpi-label">Parcelas Vencidas</div><div class="kpi-value">${qtdParcelas}</div></div>
      <div class="kpi"><div class="kpi-label">Pessoas Envolvidas</div><div class="kpi-value">${porPessoa.length}</div></div>
    </div>
    <h2>Resumo por Pessoa</h2>
    <table>
      <thead><tr><th>Pessoa</th><th class="right">Qtd Parcelas</th><th class="right">Total Vencido</th></tr></thead>
      <tbody>${porPessoa.map((p: any) => `<tr><td>${p.nome}</td><td class="right">${p.qtd}</td><td class="right" style="color:#991B1B;font-weight:700">${fmtBRL(p.total)}</td></tr>`).join('')}</tbody>
    </table>
    <h2>Detalhamento</h2>
    <table>
      <thead><tr><th>Vencimento</th><th>Pessoa</th><th>Descrição</th><th class="right">Dias Atraso</th><th class="right">Valor</th></tr></thead>
      <tbody>${detalhes.map((r: any) => `<tr>
        <td>${fmtData(r.vencimento)}</td>
        <td>${r.pessoaNome ?? '—'}</td>
        <td>${r.descricao}</td>
        <td class="right"><span class="badge badge-red">${r.diasAtraso} dias</span></td>
        <td class="right" style="color:#991B1B;font-weight:700">${fmtBRL(r.valor)}</td>
      </tr>`).join('')}</tbody>
    </table>
    ${rodape()}
  `
  abrirJanela(html)
}
