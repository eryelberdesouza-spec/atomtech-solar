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
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Calibri Light', Calibri, Candara, 'Segoe UI', sans-serif;
    font-weight: 300; font-size: 13.5px; line-height: 1.75;
    color: #1C1C2E; background: white;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    -webkit-font-smoothing: antialiased;
  }
  p { font-size: 13.5px; font-weight: 300; color: #333; line-height: 1.85; margin-bottom: 10px; }
  strong, b { font-family: 'Inter', Calibri, sans-serif; font-weight: 600; color: #0E2040; }
  ul { padding-left: 20px; margin: 8px 0 12px; }
  li { font-size: 13.5px; font-weight: 300; color: #444; line-height: 1.9; margin-bottom: 4px; }

  /* ─── PÁGINAS A4 ───────────────────────────────────────────────── */
  .page {
    width: 210mm; min-height: 297mm; position: relative;
    display: flex; flex-direction: column;
    page-break-after: always; break-after: page;
  }
  .page:last-child { page-break-after: avoid; break-after: avoid; }

  /* ─── CAPA ─────────────────────────────────────────────────────── */
  .capa { background: linear-gradient(160deg, #0A1628 0%, #0E2040 55%, #102A50 100%); }
  .capa-top { padding: 28px 36px 0; display: flex; justify-content: space-between; align-items: flex-start; }
  .capa-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 40px; }
  .capa-pretitle {
    font-family: 'Inter', Calibri, sans-serif; font-size: 10px; font-weight: 500;
    color: #F5A623; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 18px;
  }
  .capa-title {
    font-family: 'Inter', Calibri, sans-serif; font-size: 40px; font-weight: 700;
    color: #FFFFFF; line-height: 1.1; margin-bottom: 8px;
  }
  .capa-divider { width: 60px; height: 3px; background: #F5A623; margin: 20px 0; border-radius: 2px; }
  .capa-cliente-label {
    font-size: 9px; font-weight: 300;
    color: rgba(255,255,255,0.5); letter-spacing: 4px; text-transform: uppercase; margin-bottom: 10px;
  }
  .capa-cliente-nome {
    font-family: 'Inter', Calibri, sans-serif; font-size: 28px; font-weight: 600;
    color: #fff; line-height: 1.2;
  }
  .capa-meta { display: flex; gap: 32px; margin-top: 24px; }
  .capa-meta-label {
    font-size: 9px; font-weight: 300;
    color: rgba(255,255,255,0.4); letter-spacing: 2px; text-transform: uppercase;
  }
  .capa-meta-value {
    font-family: 'Inter', Calibri, sans-serif; font-size: 14px; font-weight: 400;
    color: rgba(255,255,255,0.85); margin-top: 3px;
  }
  .capa-footer { padding: 22px 40px; display: flex; justify-content: space-between; align-items: flex-end; }
  .capa-footer-left { font-size: 10px; font-weight: 300; color: rgba(255,255,255,0.35); line-height: 1.6; }
  .capa-footer-right { font-size: 9px; font-weight: 300; color: rgba(255,255,255,0.25); text-align: right; }

  /* ─── HEADER INTERNO ───────────────────────────────────────────── */
  .header-interno {
    background: #0E2040;
    padding: 12px 36px;
    display: flex; justify-content: space-between; align-items: center;
    flex-shrink: 0;
  }
  .header-logo {
    font-family: 'Inter', Calibri, sans-serif;
    font-size: 14px; font-weight: 700; color: #fff; letter-spacing: 1px;
  }
  .header-logo span { color: #F5A623; }
  .header-logo small { font-size: 9px; font-weight: 300; color: rgba(255,255,255,0.4); margin-left: 8px; }
  .header-tag {
    font-size: 9px; font-weight: 300;
    color: rgba(255,255,255,0.4); letter-spacing: 3px; text-transform: uppercase;
  }

  /* ─── FOOTER ───────────────────────────────────────────────────── */
  .footer {
    background: #0E2040;
    padding: 12px 36px;
    display: flex; justify-content: space-between; align-items: center;
    flex-shrink: 0; margin-top: auto;
  }
  .footer-text { font-size: 9px; font-weight: 300; color: rgba(255,255,255,0.45); line-height: 1.5; }
  .footer-numero { font-size: 9px; color: rgba(255,255,255,0.3); font-family: 'Inter', Calibri, monospace; }

  /* ─── CONTEÚDO ─────────────────────────────────────────────────── */
  .page-content { padding: 26px 36px; flex: 1; }
  .section-title {
    font-family: 'Inter', Calibri, sans-serif; font-size: 18px; font-weight: 600;
    color: #0E2040; border-left: 4px solid #F5A623; padding-left: 12px;
    margin-bottom: 16px; line-height: 1.2;
  }
  .section-sub {
    font-family: 'Inter', Calibri, sans-serif; font-size: 14px; font-weight: 600;
    color: #0E2040; margin: 20px 0 10px;
  }
  .section-divider { border: none; border-top: 1px solid #E8EDF4; margin: 24px 0; }

  /* ─── TABELA DE ITENS ──────────────────────────────────────────── */
  .tabela-itens { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  .tabela-itens thead tr { background: #0E2040; }
  .tabela-itens thead th {
    padding: 10px 12px; text-align: left; color: #FFFFFF;
    font-family: 'Inter', Calibri, sans-serif; font-size: 10px;
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .tabela-itens thead th:last-child { text-align: right; }
  .tabela-itens thead th.num { text-align: right; }
  .tabela-itens tbody tr:nth-child(odd) { background: #F8FAFD; }
  .tabela-itens tbody tr:nth-child(even) { background: #FFFFFF; }
  .tabela-itens tbody td {
    padding: 10px 12px; color: #2C3E50; font-size: 12.5px;
    border-bottom: 1px solid #EEF2F7;
  }
  .tabela-itens tbody td.num { text-align: right; font-family: 'Inter', Calibri, monospace; }
  .tabela-itens tbody td.descricao { font-weight: 400; }
  .tabela-itens tfoot tr { background: #0E2040; }
  .tabela-itens tfoot td {
    padding: 11px 12px; color: white;
    font-family: 'Inter', Calibri, sans-serif; font-size: 13px; font-weight: 600;
  }
  .tabela-itens tfoot td.num { text-align: right; color: #F5A623; font-size: 15px; }

  /* ─── CONDIÇÕES COMERCIAIS ─────────────────────────────────────── */
  .cond-card {
    border: 1px solid #E8EDF4; border-radius: 10px; overflow: hidden; margin-bottom: 16px;
    break-inside: avoid; page-break-inside: avoid;
  }
  .cond-header {
    padding: 12px 18px; background: #F5F8FC;
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid #E8EDF4;
  }
  .cond-header-title { font-size: 13px; font-weight: 600; color: #0E2040; }
  .cond-total { font-size: 15px; font-weight: 700; color: #F5A623; }
  .parcelas-table { width: 100%; border-collapse: collapse; }
  .parcelas-table td { padding: 9px 18px; font-size: 12.5px; color: #444; border-bottom: 1px solid #EEF2F7; }
  .parcelas-table td.valor { text-align: right; font-weight: 600; color: #0E2040; }
  .parcelas-table tr:last-child td { border-bottom: none; }

  /* ─── ACEITE ───────────────────────────────────────────────────── */
  .aceite-box { background: #F5F8FC; border-radius: 10px; padding: 24px; margin: 8px 0; }
  .assinatura-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 56px; }
  .assinatura-linha {
    border-top: 1px solid #333; padding-top: 8px; text-align: center;
    font-size: 11px; font-weight: 300; color: #555;
  }

  /* ─── CAIXAS INFO ──────────────────────────────────────────────── */
  .info-box {
    background: linear-gradient(135deg, #fff8e8, #fff3d0);
    border-left: 4px solid #F5A623;
    padding: 13px 18px; border-radius: 0 8px 8px 0;
    margin: 8px 0 16px;
  }
  .info-box p { margin: 0; font-weight: 400; color: #0E2040; font-size: 13px; }

  @media print {
    body { margin: 0; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
    @page { size: A4; margin: 0; }
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

function headerInterno(numero: string, nomeEmpresa: string, logoUrl?: string | null) {
  return `<div class="header-interno">
    <div class="header-logo">
      ${logoUrl
        ? `<img src="${logoUrl}" style="height:24px;max-width:140px;object-fit:contain;vertical-align:middle;" alt="Logo"/>`
        : `${nomeEmpresa}<small>Proposta de Serviços</small>`
      }
    </div>
    <div class="header-tag">Proposta de Serviços &middot; ${numero}</div>
  </div>`
}

function footerServico(numero: string, empresa: any) {
  const tel    = empresa?.telefone ?? ''
  const email  = empresa?.email ?? ''
  const cidade = empresa?.cidade ? `${empresa.cidade}/${empresa.estado ?? ''}` : ''
  const partes = [empresa?.nome, cidade, email, tel].filter(Boolean).join(' · ')
  return `<div class="footer">
    <div class="footer-text">${partes}</div>
    <div class="footer-numero">${numero}</div>
  </div>`
}

export function abrirPdfServicoNoNavegador(data: any): void {
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

  let html = ''

  // ── CAPA ─────────────────────────────────────────────────────────
  if (blocoAtivo(blocos, 'capa')) {
    html += `
    <div class="page capa">
      <div class="capa-top">
        <div>
          ${logoUrl
            ? `<img src="${logoUrl}" style="height:56px;max-width:180px;object-fit:contain;" alt="Logo"/>`
            : `<div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:2px">${nomeEmpresa}</div>
               <div style="font-size:9px;font-weight:400;color:#F5A623;letter-spacing:5px;text-transform:uppercase;margin-top:3px">Proposta de Serviços</div>`
          }
        </div>
        <div style="font-size:9px;color:rgba(255,255,255,0.3);text-align:right;line-height:1.7">
          ${empresa?.cidade ? `${empresa.cidade}/${empresa.estado ?? ''}<br>` : ''}
          ${numero}
        </div>
      </div>
      <div class="capa-body">
        <div class="capa-pretitle">Proposta Comercial</div>
        <div class="capa-title">${tituloServico}</div>
        <div class="capa-divider"></div>
        <div class="capa-cliente-label">Preparado exclusivamente para</div>
        <div class="capa-cliente-nome">${nomeCliente}</div>
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
      </div>
      <div class="capa-footer">
        <div class="capa-footer-left">${nomeEmpresa}${empresa?.cidade ? ` · ${empresa.cidade}/${empresa.estado ?? ''}` : ''}</div>
        <div class="capa-footer-right">${empresa?.email ?? ''}${empresa?.telefone ? `<br>${empresa.telefone}` : ''}</div>
      </div>
    </div>`
  }

  // ── PÁGINA 2: APRESENTAÇÃO + DIFERENCIAIS ────────────────────────
  const temApres = blocoAtivo(blocos, 'apresentacao_empresa')
  const temDif   = blocoAtivo(blocos, 'diferenciais')

  if (temApres || temDif) {
    const txtApres = textoBloco(blocos, 'apresentacao_empresa', textos ?? {}, 'apresentacao_empresa')
    const txtDif   = textoBloco(blocos, 'diferenciais', textos ?? {}, 'diferenciais')

    html += `
    <div class="page">
      ${H(numero)}
      <div class="page-content">
        ${temApres ? `
          <div class="section-title">Quem Somos</div>
          ${renderTexto(txtApres) || `<p>${nomeEmpresa} é uma empresa especializada em soluções elétricas e de automação, com foco em qualidade, segurança e satisfação do cliente.</p>`}
        ` : ''}
        ${temApres && temDif ? `<hr class="section-divider">` : ''}
        ${temDif ? `
          <div class="section-title" style="margin-top:${temApres ? '0' : '0'}">Por que nos escolher?</div>
          ${renderTexto(txtDif) || `<ul>
            <li>Equipe técnica qualificada e certificada</li>
            <li>Materiais de alta qualidade com garantia do fabricante</li>
            <li>Pontualidade e comprometimento com prazos</li>
            <li>Atendimento personalizado e suporte pós-serviço</li>
          </ul>`}
        ` : ''}
      </div>
      ${F(numero)}
    </div>`
  }

  // ── GARANTIAS ────────────────────────────────────────────────────
  if (blocoAtivo(blocos, 'garantias')) {
    const txt = textoBloco(blocos, 'garantias', textos ?? {}, 'garantias')
    html += `
    <div class="page">
      ${H(numero)}
      <div class="page-content">
        <div class="section-title">Garantias Inclusas</div>
        ${renderTexto(txt) || '<p>Todos os serviços executados possuem garantia conforme legislação vigente e as especificações técnicas dos fabricantes dos materiais utilizados. Nosso compromisso vai além da entrega — estamos presentes no pós-serviço.</p>'}
      </div>
      ${F(numero)}
    </div>`
  }

  // ── O QUE PROPOMOS ENTREGAR ───────────────────────────────────────
  if (blocoAtivo(blocos, 'escopo_entregas')) {
    const txt = textoBloco(blocos, 'escopo_entregas', textos ?? {}, 'escopo_entregas')
    if (txt) {
      const letras = 'abcdefghijklmnopqrstuvwxyz'
      const linhas = txt.split('\n').map((l: string) => l.trim()).filter(Boolean)
      const itensHtml = linhas.map((linha: string, idx: number) => {
        const texto = linha.replace(/^[-*•]\s*/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        return `<div style="display:flex;gap:14px;margin-bottom:14px;align-items:flex-start">
          <span style="min-width:26px;height:26px;background:#0E2040;color:#F5A623;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:'Inter',Calibri,sans-serif;flex-shrink:0;margin-top:2px">${letras[idx] ?? String(idx + 1)}</span>
          <span style="font-size:13.5px;font-weight:300;color:#333;line-height:1.8">${texto}</span>
        </div>`
      }).join('')
      html += `
      <div class="page">
        ${H(numero)}
        <div class="page-content">
          <div class="section-title">O que Propomos Entregar</div>
          ${itensHtml}
        </div>
        ${F(numero)}
      </div>`
    }
  }

  // ── ESCOPO DO SERVIÇO (TABELA DE ITENS) ──────────────────────────
  if (blocoAtivo(blocos, 'escopo_servico')) {
    const itens = itensServico ?? []
    html += `
    <div class="page">
      ${H(numero)}
      <div class="page-content">
        <div class="section-title">${tituloServico}</div>
        <table class="tabela-itens">
          <thead>
            <tr>
              <th style="width:36px">#</th>
              <th>Descrição</th>
              <th class="num" style="width:52px">Un.</th>
              <th class="num" style="width:72px">Qtd.</th>
              <th class="num" style="width:100px">Valor Unit.</th>
              <th class="num" style="width:110px">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itens.map((item: any, idx: number) => `
            <tr>
              <td style="color:#8A9BB5;font-size:11px;text-align:center">${idx + 1}</td>
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
        ${prazoExecucao ? `
        <div class="info-box">
          <p><strong>⏱ Prazo de Execução:</strong> ${prazoExecucao}</p>
        </div>` : ''}
        <p style="font-size:11px;color:#8A9BB5;margin-top:6px">* Valores em Reais (BRL). Proposta válida até ${dataValidade ?? '—'}.</p>
      </div>
      ${F(numero)}
    </div>`
  }

  // ── CONDIÇÕES COMERCIAIS ─────────────────────────────────────────
  if (blocoAtivo(blocos, 'condicoes_comerciais') && condsAtivas.length > 0) {
    const tipoLabel: Record<string, string> = {
      avista: 'À Vista', parcelado_marcos: 'Parcelado por Marcos', financiamento: 'Financiamento', cartao: 'Cartão de Crédito',
    }
    html += `
    <div class="page">
      ${H(numero)}
      <div class="page-content">
        <div class="section-title">Condições de Pagamento</div>
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
                <td style="color:#8A9BB5;font-size:11px">${p.prazoDias > 0 ? `${p.prazoDias} dias ${p.tipoPrazo ?? 'corridos'}` : 'Na assinatura'}</td>
                <td class="valor">${fmt(p.valor)}</td>
              </tr>`).join('')}
            </table>` : ''}
          </div>`
        }).join('')}
      </div>
      ${F(numero)}
    </div>`
  }

  // ── CONSIDERAÇÕES GERAIS ─────────────────────────────────────────
  const DEFAULT_CONSIDERACOES = `- **Atendimento:** Prestado em horário comercial, de segunda a sexta-feira das 8h às 18h.
- **Autoria do Orçamento:** Este documento é de uso exclusivo desta negociação e não deve ser repassado a terceiros.
- **Encargos e Taxas:** Eventuais taxas, licenças ou liberações necessárias são de responsabilidade do contratante.
- **Etapa Única:** Os serviços serão executados de forma contínua e em etapa única, salvo acordo formal em contrário.
- **Garantia:** Os serviços possuem garantia de 90 dias contra defeitos de execução.
- **Horário Comercial:** A execução ocorrerá em horário comercial; serviços noturnos ou em fins de semana serão cobrados à parte.`

  if (blocoAtivo(blocos, 'consideracoes_gerais')) {
    const txt = textoBloco(blocos, 'consideracoes_gerais', textos ?? {}, 'consideracoes_gerais') || DEFAULT_CONSIDERACOES
    const linhas = txt.split('\n').map((l: string) => l.trim()).filter(Boolean)
    const itensHtml = linhas.map((linha: string, idx: number) => {
      const texto = linha.replace(/^[-*•]\s*/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      return `<div style="display:flex;gap:14px;margin-bottom:14px;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid #EEF2F7">
        <span style="min-width:26px;height:26px;background:#F5A62318;color:#0E2040;border:1px solid #F5A62345;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:'Inter',Calibri,sans-serif;flex-shrink:0;margin-top:2px">${idx + 1}</span>
        <span style="font-size:13px;font-weight:300;color:#333;line-height:1.8">${texto}</span>
      </div>`
    }).join('')
    html += `
    <div class="page">
      ${H(numero)}
      <div class="page-content">
        <div class="section-title">LEIA COM ATENÇÃO — Informações Importantes</div>
        ${itensHtml}
      </div>
      ${F(numero)}
    </div>`
  }

  // ── ACEITE + CONTATO ─────────────────────────────────────────────
  const temAceite  = blocoAtivo(blocos, 'aceite')
  const temContato = blocoAtivo(blocos, 'contato')

  if (temAceite || temContato) {
    html += `
    <div class="page">
      ${H(numero)}
      <div class="page-content">
        ${temAceite ? `
          <div class="section-title">Aceite e Assinatura</div>
          <div class="aceite-box">
            <p>Ao assinar este documento, o contratante declara estar de acordo com todos os termos, condições, escopo de serviços e valores descritos nesta proposta comercial.</p>
            <p style="margin-top:10px"><strong>Proposta:</strong> ${numero} &nbsp;&nbsp; <strong>Valor:</strong> ${fmt(totalGeral)}</p>
            <p><strong>Cliente:</strong> ${nomeCliente}</p>
            <div class="assinatura-grid">
              <div>
                <div class="assinatura-linha">Contratante — ${nomeCliente}</div>
                <p style="text-align:center;font-size:11px;color:#999;margin-top:6px">Data: ___/___/______</p>
              </div>
              <div>
                <div class="assinatura-linha">Contratada — ${nomeEmpresa}</div>
                <p style="text-align:center;font-size:11px;color:#999;margin-top:6px">Data: ___/___/______</p>
              </div>
            </div>
          </div>
        ` : ''}
        ${temAceite && temContato ? `<hr class="section-divider">` : ''}
        ${temContato ? `
          <div class="section-title" style="margin-top:${temAceite ? '0' : '0'}">Entre em Contato</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:8px">
            ${empresa?.telefone ? `<div>
              <p style="color:#8A9BB5;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Telefone</p>
              <p style="font-size:15px;font-weight:600;color:#0E2040;margin:0">${empresa.telefone}</p>
            </div>` : ''}
            ${empresa?.email ? `<div>
              <p style="color:#8A9BB5;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">E-mail</p>
              <p style="font-size:15px;font-weight:600;color:#0E2040;margin:0">${empresa.email}</p>
            </div>` : ''}
            ${empresa?.site ? `<div>
              <p style="color:#8A9BB5;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Site</p>
              <p style="font-size:15px;font-weight:600;color:#0E2040;margin:0">${empresa.site}</p>
            </div>` : ''}
            ${empresa?.endereco ? `<div style="grid-column:1/-1">
              <p style="color:#8A9BB5;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Endereço</p>
              <p style="font-size:15px;font-weight:600;color:#0E2040;margin:0">${empresa.endereco}${empresa.cidade ? `, ${empresa.cidade}/${empresa.estado}` : ''}</p>
            </div>` : ''}
          </div>
        ` : ''}
      </div>
      ${F(numero)}
    </div>`
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proposta ${numero} — ${nomeCliente}</title>
  <style>${CSS_SERVICO.replace(/#F5A623/g, cor1).replace(/#2D9C4E/g, cor2)}</style>
</head>
<body>
  ${html}
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 800); };
  </script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) { alert('Permita popups para este site e tente novamente.'); return }
  win.document.write(fullHtml)
  win.document.close()
}
