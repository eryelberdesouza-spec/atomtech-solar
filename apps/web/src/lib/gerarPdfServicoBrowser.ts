// ═══════════════════════════════════════════════════════════════════
// gerarPdfServicoBrowser.ts — PDF de Proposta de Serviço Geral
// ═══════════════════════════════════════════════════════════════════

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

const CSS_SERVICO = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Calibri Light', Calibri, Candara, 'Segoe UI', sans-serif;
    font-weight: 300; font-size: 11.5px; line-height: 1.75;
    color: #1C1C2E; background: white;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    -webkit-font-smoothing: antialiased;
  }
  p { font-size: 11.5px; font-weight: 300; color: #333; line-height: 1.8; margin-bottom: 9px; }
  strong, b { font-family: Calibri, Candara, 'Segoe UI', sans-serif; font-weight: 600; color: #0E2040; }
  ul { padding-left: 18px; margin: 6px 0 10px; }
  li { font-size: 11.5px; font-weight: 300; color: #444; line-height: 1.9; }

  .page {
    width: 210mm; min-height: 297mm; position: relative;
    display: flex; flex-direction: column;
    page-break-after: always; break-after: page;
  }
  .page:last-child { page-break-after: avoid; break-after: avoid; }

  /* ─── CAPA ─────────────────────────────────────────────────────── */
  .capa { background: linear-gradient(160deg, #0A1628 0%, #0E2040 55%, #102A50 100%); }
  .capa-top { padding: 28px 36px 0; display: flex; justify-content: space-between; align-items: center; }
  .capa-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 36px; }
  .capa-pretitle {
    font-family: Calibri, Candara, sans-serif; font-size: 10px; font-weight: 400;
    color: #F5A623; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 16px;
  }
  .capa-title {
    font-family: Calibri, Candara, sans-serif; font-size: 32px; font-weight: 700;
    color: #FFFFFF; line-height: 1.1; margin-bottom: 12px;
  }
  .capa-subtitle { font-size: 14px; color: #8BAED0; font-weight: 300; margin-bottom: 28px; }
  .capa-info { display: flex; flex-direction: column; gap: 7px; margin-bottom: 32px; }
  .capa-info-row { display: flex; align-items: center; gap: 10px; }
  .capa-info-dot { width: 6px; height: 6px; background: #F5A623; border-radius: 50%; flex-shrink: 0; }
  .capa-info-text { font-size: 12px; color: #C8D8EC; }
  .capa-divider { height: 2px; background: linear-gradient(90deg, #F5A623 0%, transparent 100%); margin: 20px 0; }
  .capa-bottom { padding: 20px 36px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 12px; }
  .capa-company { font-size: 11px; color: rgba(255,255,255,0.45); }
  .logo-circle { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #F5A623, #E8720C); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; font-weight: 900; flex-shrink: 0; }

  /* ─── PÁGINAS INTERNAS ─────────────────────────────────────────── */
  .page-inner { display: flex; flex-direction: column; height: 100%; }
  .page-header {
    padding: 16px 36px 14px; border-bottom: 2px solid #F5A623;
    display: flex; justify-content: space-between; align-items: center;
  }
  .page-header-title { font-size: 11px; font-weight: 600; color: #0E2040; text-transform: uppercase; letter-spacing: 2px; }
  .page-header-num { font-size: 10px; color: #8A9BB5; font-family: Calibri, monospace; }
  .page-content { flex: 1; padding: 24px 36px 0; }
  .page-footer { padding: 12px 36px; border-top: 1px solid #E8EDF4; display: flex; justify-content: space-between; align-items: center; }
  .page-footer-text { font-size: 9px; color: #B0BEC5; }
  .section-title {
    font-family: Calibri, Candara, sans-serif; font-size: 16px; font-weight: 700;
    color: #0E2040; margin-bottom: 14px; padding-bottom: 8px;
    border-bottom: 2px solid #F5A623; display: flex; align-items: center; gap: 8px;
  }
  .section-title::before { content: ''; display: inline-block; width: 4px; height: 18px; background: #F5A623; border-radius: 2px; }

  /* ─── TABELA DE ITENS ──────────────────────────────────────────── */
  .tabela-itens { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  .tabela-itens thead tr { background: #0E2040; }
  .tabela-itens thead th {
    padding: 8px 12px; text-align: left; color: #FFFFFF;
    font-family: Calibri, Candara, sans-serif; font-size: 10px;
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .tabela-itens thead th:last-child { text-align: right; }
  .tabela-itens thead th.num { text-align: right; }
  .tabela-itens tbody tr:nth-child(odd) { background: #F8FAFD; }
  .tabela-itens tbody tr:nth-child(even) { background: #FFFFFF; }
  .tabela-itens tbody td {
    padding: 9px 12px; color: #2C3E50; font-size: 11px;
    border-bottom: 1px solid #EEF2F7;
  }
  .tabela-itens tbody td.num { text-align: right; font-family: Calibri, monospace; }
  .tabela-itens tbody td.descricao { font-weight: 400; }
  .tabela-itens tfoot tr { background: #0E2040; }
  .tabela-itens tfoot td {
    padding: 10px 12px; color: white;
    font-family: Calibri, Candara, sans-serif; font-size: 12px; font-weight: 700;
  }
  .tabela-itens tfoot td.num { text-align: right; color: #F5A623; font-size: 14px; }

  /* ─── CONDIÇÕES COMERCIAIS ─────────────────────────────────────── */
  .cond-card {
    border: 1px solid #E8EDF4; border-radius: 8px; overflow: hidden; margin-bottom: 14px;
    break-inside: avoid; page-break-inside: avoid;
  }
  .cond-header {
    padding: 10px 16px; background: #F5F8FC;
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid #E8EDF4;
  }
  .cond-header-title { font-size: 12px; font-weight: 600; color: #0E2040; font-family: Calibri, Candara, sans-serif; }
  .cond-total { font-size: 14px; font-weight: 700; color: #F5A623; font-family: Calibri, Candara, sans-serif; }
  .parcelas-table { width: 100%; border-collapse: collapse; }
  .parcelas-table td { padding: 7px 16px; font-size: 11px; color: #444; border-bottom: 1px solid #EEF2F7; }
  .parcelas-table td.valor { text-align: right; font-weight: 600; color: #0E2040; font-family: Calibri, monospace; }
  .parcelas-table tr:last-child td { border-bottom: none; }

  /* ─── ACEITE ───────────────────────────────────────────────────── */
  .aceite-box { border: 1px solid #E8EDF4; border-radius: 8px; padding: 24px; }
  .assinatura-linha { border-top: 1px solid #999; margin-top: 50px; padding-top: 6px; font-size: 10px; color: #999; text-align: center; }

  @media print {
    body { margin: 0; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
  }
`

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

export function abrirPdfServicoNoNavegador(data: any): void {
  const { proposta, itensServico, condicoesComerciais, blocos, empresa, textos, cliente } = data

  const cor1 = empresa?.corPrimaria ?? '#F5A623'
  const cor2 = empresa?.corSecundaria ?? '#2D9C4E'
  const nomeEmpresa = empresa?.nome ?? 'Atom Tech Energia Solar'
  const nomeCliente = cliente?.nome ?? proposta?.clienteNome ?? 'Cliente'
  const tituloServico = proposta?.tituloServico ?? 'Proposta de Serviços'
  const numero = proposta?.numero ?? ''
  const dataEmissao = fmtDate(proposta?.dataEmissao)
  const dataValidade = proposta?.dataValidade ? fmtDate(proposta.dataValidade) : null

  const totalGeral = (itensServico ?? []).reduce((s: number, i: any) => s + Number(i.valorTotal), 0)

  const condsAtivas = (condicoesComerciais ?? []).filter((c: any) => c.ativa !== false)

  // ── CAPA ─────────────────────────────────────────────────────────
  let html = ''

  if (blocoAtivo(blocos, 'capa')) {
    html += `
    <div class="page capa">
      <div class="capa-top">
        <div class="logo-circle">A</div>
        <div class="page-header-num" style="color:rgba(255,255,255,0.4)">${numero}</div>
      </div>
      <div class="capa-body">
        <div class="capa-pretitle">Proposta de Serviços</div>
        <div class="capa-title">${tituloServico}</div>
        <div class="capa-subtitle">Preparada especialmente para você</div>
        <div class="capa-divider"></div>
        <div class="capa-info">
          <div class="capa-info-row"><div class="capa-info-dot"></div><div class="capa-info-text"><strong style="color:#fff">Cliente:</strong> ${nomeCliente}</div></div>
          <div class="capa-info-row"><div class="capa-info-dot"></div><div class="capa-info-text"><strong style="color:#fff">Data de Emissão:</strong> ${dataEmissao}</div></div>
          ${dataValidade ? `<div class="capa-info-row"><div class="capa-info-dot"></div><div class="capa-info-text"><strong style="color:#fff">Válida até:</strong> ${dataValidade}</div></div>` : ''}
          <div class="capa-info-row"><div class="capa-info-dot"></div><div class="capa-info-text" style="color:#F5A623;font-size:13px;font-weight:600">Valor Total: ${fmt(totalGeral)}</div></div>
        </div>
      </div>
      <div class="capa-bottom">
        <div class="logo-circle" style="width:30px;height:30px;font-size:12px">A</div>
        <div class="capa-company">${nomeEmpresa}${empresa?.cidade ? ` · ${empresa.cidade}/${empresa.estado}` : ''}</div>
      </div>
    </div>`
  }

  // ── APRESENTAÇÃO DA EMPRESA ───────────────────────────────────────
  if (blocoAtivo(blocos, 'apresentacao_empresa')) {
    const txt = textoBloco(blocos, 'apresentacao_empresa', textos ?? {}, 'apresentacao_empresa')
    html += `
    <div class="page">
      <div class="page-inner">
        <div class="page-header">
          <div class="page-header-title">Sobre a Empresa</div>
          <div class="page-header-num">${numero}</div>
        </div>
        <div class="page-content">
          <div class="section-title">Quem Somos</div>
          ${renderTexto(txt) || `<p>${nomeEmpresa} é uma empresa especializada em soluções elétricas e de automação, com foco em qualidade, segurança e satisfação do cliente.</p>`}
        </div>
        <div class="page-footer">
          <div class="page-footer-text">${nomeEmpresa}</div>
          <div class="page-footer-text">${numero}</div>
        </div>
      </div>
    </div>`
  }

  // ── DIFERENCIAIS ─────────────────────────────────────────────────
  if (blocoAtivo(blocos, 'diferenciais')) {
    const txt = textoBloco(blocos, 'diferenciais', textos ?? {}, 'diferenciais')
    html += `
    <div class="page">
      <div class="page-inner">
        <div class="page-header">
          <div class="page-header-title">Diferenciais</div>
          <div class="page-header-num">${numero}</div>
        </div>
        <div class="page-content">
          <div class="section-title">Por que nos escolher?</div>
          ${renderTexto(txt) || '<ul><li>Equipe técnica qualificada e certificada</li><li>Materiais de alta qualidade com garantia</li><li>Pontualidade e comprometimento com prazos</li><li>Suporte pós-venda</li></ul>'}
        </div>
        <div class="page-footer">
          <div class="page-footer-text">${nomeEmpresa}</div>
          <div class="page-footer-text">${numero}</div>
        </div>
      </div>
    </div>`
  }

  // ── GARANTIAS ────────────────────────────────────────────────────
  if (blocoAtivo(blocos, 'garantias')) {
    const txt = textoBloco(blocos, 'garantias', textos ?? {}, 'garantias')
    html += `
    <div class="page">
      <div class="page-inner">
        <div class="page-header">
          <div class="page-header-title">Garantias</div>
          <div class="page-header-num">${numero}</div>
        </div>
        <div class="page-content">
          <div class="section-title">Garantias Inclusas</div>
          ${renderTexto(txt) || '<p>Todos os serviços executados possuem garantia conforme legislação vigente e especificações técnicas dos fabricantes dos materiais utilizados.</p>'}
        </div>
        <div class="page-footer">
          <div class="page-footer-text">${nomeEmpresa}</div>
          <div class="page-footer-text">${numero}</div>
        </div>
      </div>
    </div>`
  }

  // ── ESCOPO DO SERVIÇO (TABELA DE ITENS) ──────────────────────────
  if (blocoAtivo(blocos, 'escopo_servico')) {
    const itens = itensServico ?? []
    html += `
    <div class="page">
      <div class="page-inner">
        <div class="page-header">
          <div class="page-header-title">Escopo do Serviço</div>
          <div class="page-header-num">${numero}</div>
        </div>
        <div class="page-content">
          <div class="section-title">${tituloServico}</div>
          <table class="tabela-itens">
            <thead>
              <tr>
                <th style="width:40px">#</th>
                <th>Descrição</th>
                <th class="num" style="width:60px">Un.</th>
                <th class="num" style="width:80px">Qtd.</th>
                <th class="num" style="width:100px">Valor Unit.</th>
                <th class="num" style="width:110px">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itens.map((item: any, idx: number) => `
              <tr>
                <td style="color:#8A9BB5;font-size:10px;text-align:center">${idx + 1}</td>
                <td class="descricao">${item.descricao}</td>
                <td class="num">${item.unidade ?? 'un'}</td>
                <td class="num">${fmtN(item.quantidade)}</td>
                <td class="num">${fmt(item.valorUnitario)}</td>
                <td class="num" style="font-weight:600;color:#0E2040">${fmt(item.valorTotal)}</td>
              </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5">Valor Total da Proposta</td>
                <td class="num">${fmt(totalGeral)}</td>
              </tr>
            </tfoot>
          </table>
          <p style="font-size:10px;color:#8A9BB5;margin-top:8px">* Valores em Reais (BRL). Proposta válida até ${dataValidade ?? '—'}.</p>
        </div>
        <div class="page-footer">
          <div class="page-footer-text">${nomeEmpresa}</div>
          <div class="page-footer-text">${numero}</div>
        </div>
      </div>
    </div>`
  }

  // ── CONDIÇÕES COMERCIAIS ─────────────────────────────────────────
  if (blocoAtivo(blocos, 'condicoes_comerciais') && condsAtivas.length > 0) {
    const tipoLabel: Record<string, string> = {
      avista: 'À Vista', parcelado_marcos: 'Parcelado por Marcos', financiamento: 'Financiamento', cartao: 'Cartão de Crédito',
    }
    html += `
    <div class="page">
      <div class="page-inner">
        <div class="page-header">
          <div class="page-header-title">Condições Comerciais</div>
          <div class="page-header-num">${numero}</div>
        </div>
        <div class="page-content">
          <div class="section-title">Formas de Pagamento</div>
          ${condsAtivas.map((cond: any) => {
            const parcelas = cond.parcelas ?? []
            return `
            <div class="cond-card">
              <div class="cond-header">
                <div class="cond-header-title">${tipoLabel[cond.tipo] ?? cond.tipo}${cond.descricao ? ` — ${cond.descricao}` : ''}</div>
                <div class="cond-total">${fmt(cond.valorTotal)}</div>
              </div>
              ${parcelas.length > 0 ? `
              <table class="parcelas-table">
                ${parcelas.map((p: any) => `
                <tr>
                  <td style="color:#0E2040;font-weight:600;width:28px">${p.numeroParcela}.</td>
                  <td>${p.descricaoEvento}</td>
                  <td style="color:#8A9BB5;font-size:10px">${p.prazoDias > 0 ? `${p.prazoDias} dias ${p.tipoPrazo ?? 'corridos'}` : 'Na assinatura'}</td>
                  <td class="valor">${fmt(p.valor)}</td>
                </tr>`).join('')}
              </table>` : ''}
            </div>`
          }).join('')}
        </div>
        <div class="page-footer">
          <div class="page-footer-text">${nomeEmpresa}</div>
          <div class="page-footer-text">${numero}</div>
        </div>
      </div>
    </div>`
  }

  // ── ACEITE ───────────────────────────────────────────────────────
  if (blocoAtivo(blocos, 'aceite')) {
    html += `
    <div class="page">
      <div class="page-inner">
        <div class="page-header">
          <div class="page-header-title">Aceite da Proposta</div>
          <div class="page-header-num">${numero}</div>
        </div>
        <div class="page-content">
          <div class="section-title">Aceite e Assinatura</div>
          <div class="aceite-box">
            <p>Ao assinar este documento, o contratante declara estar de acordo com todos os termos, condições, escopo de serviços e valores descritos nesta proposta comercial.</p>
            <p style="margin-top:12px"><strong>Proposta:</strong> ${numero} &nbsp;&nbsp; <strong>Valor:</strong> ${fmt(totalGeral)}</p>
            <p><strong>Cliente:</strong> ${nomeCliente}</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px">
              <div>
                <div class="assinatura-linha">Contratante — ${nomeCliente}</div>
                <p style="text-align:center;font-size:10px;color:#999;margin-top:4px">Data: ___/___/______</p>
              </div>
              <div>
                <div class="assinatura-linha">Contratada — ${nomeEmpresa}</div>
                <p style="text-align:center;font-size:10px;color:#999;margin-top:4px">Data: ___/___/______</p>
              </div>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <div class="page-footer-text">${nomeEmpresa}${empresa?.telefone ? ` · ${empresa.telefone}` : ''}${empresa?.email ? ` · ${empresa.email}` : ''}</div>
          <div class="page-footer-text">${numero}</div>
        </div>
      </div>
    </div>`
  }

  // ── CONTATO ──────────────────────────────────────────────────────
  if (blocoAtivo(blocos, 'contato')) {
    html += `
    <div class="page">
      <div class="page-inner">
        <div class="page-header">
          <div class="page-header-title">Contato</div>
          <div class="page-header-num">${numero}</div>
        </div>
        <div class="page-content">
          <div class="section-title">Entre em Contato</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:16px">
            ${empresa?.telefone ? `<div><p style="color:#8A9BB5;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Telefone</p><p style="font-size:14px;font-weight:600;color:#0E2040">${empresa.telefone}</p></div>` : ''}
            ${empresa?.email ? `<div><p style="color:#8A9BB5;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">E-mail</p><p style="font-size:14px;font-weight:600;color:#0E2040">${empresa.email}</p></div>` : ''}
            ${empresa?.site ? `<div><p style="color:#8A9BB5;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Site</p><p style="font-size:14px;font-weight:600;color:#0E2040">${empresa.site}</p></div>` : ''}
            ${empresa?.endereco ? `<div><p style="color:#8A9BB5;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Endereço</p><p style="font-size:14px;font-weight:600;color:#0E2040">${empresa.endereco}${empresa.cidade ? `, ${empresa.cidade}/${empresa.estado}` : ''}</p></div>` : ''}
          </div>
        </div>
        <div class="page-footer">
          <div class="page-footer-text">${nomeEmpresa}</div>
          <div class="page-footer-text">${numero}</div>
        </div>
      </div>
    </div>`
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta ${numero} — ${nomeCliente}</title>
  <style>${CSS_SERVICO.replace(/#F5A623/g, cor1).replace(/#2D9C4E/g, cor2)}</style>
</head>
<body>
  ${html}
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 600); };
  </script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) { alert('Permita popups para este site e tente novamente.'); return }
  win.document.write(fullHtml)
  win.document.close()
}
