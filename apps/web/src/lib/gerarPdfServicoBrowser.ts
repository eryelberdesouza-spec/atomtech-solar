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

// Grupo linhas em itens: linha com bullet ou numeração própria inicia item; demais são corpo
function agruparItens(txt: string): { titulo: string; corpo: string[] }[] {
  const items: { titulo: string; corpo: string[] }[] = []
  for (const line of txt.split('\n').map(l => l.trim())) {
    if (!line) continue
    // Início de item: bullet (- •), numeração (1. 2.), letra (a. b. c.) ou linha toda em maiúsculas
    const isTitle = /^[-•]\s/.test(line)
      || /^\d+\.\s/.test(line)
      || /^[a-zA-Z]\.\s/.test(line)
      || (line === line.toUpperCase() && line.length > 3 && /[A-ZÁÉÍÓÚÃÕÇ]/.test(line))
    if (isTitle || items.length === 0) {
      items.push({ titulo: line, corpo: [] })
    } else {
      items[items.length - 1].corpo.push(line)
    }
  }
  return items
}

const stripPrefix = (s: string) => s.replace(/^[-•]\s*|^\*(?!\*)\s+|^\d+\.\s*|^[a-zA-Z]\.\s*/, '')

function renderListaNumerada(txt: string, cor1: string): string {
  const bold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  return agruparItens(txt).map(({ titulo, corpo }, idx) => {
    const tituloHtml = bold(stripPrefix(titulo))
    const corpoHtml  = corpo.map(l => bold(l)).join('<br>')
    return `<div style="display:flex;gap:12px;margin-bottom:8px;align-items:flex-start;padding-bottom:8px;border-bottom:1px solid #EEF2F7;page-break-inside:avoid;break-inside:avoid">
      <span style="min-width:24px;height:24px;background:${cor1}18;color:#0E2040;border:1px solid ${cor1}40;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;margin-top:3px">${idx + 1}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:300;color:#333;line-height:1.85">${tituloHtml}</div>
        ${corpoHtml ? `<div style="font-size:12.5px;color:#555;margin-top:2px;line-height:1.75">${corpoHtml}</div>` : ''}
      </div>
    </div>`
  }).join('')
}

function renderListaLetras(txt: string): string {
  const letras = 'abcdefghijklmnopqrstuvwxyz'
  const bold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  return agruparItens(txt).map(({ titulo, corpo }, idx) => {
    const tituloHtml = bold(stripPrefix(titulo))
    const corpoHtml  = corpo.map(l => bold(l)).join('<br>')
    return `<div style="display:flex;gap:12px;margin-bottom:8px;align-items:flex-start;page-break-inside:avoid;break-inside:avoid">
      <span style="min-width:24px;height:24px;background:#0E2040;color:#F5A623;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;margin-top:3px">${letras[idx] ?? String(idx + 1)}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:300;color:#333;line-height:1.85">${tituloHtml}</div>
        ${corpoHtml ? `<div style="font-size:12.5px;color:#555;margin-top:2px;line-height:1.75">${corpoHtml}</div>` : ''}
      </div>
    </div>`
  }).join('')
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS_SERVICO = `
  @import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
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

  /* ─── CAPA: página inteira, quebra obrigatória depois ───────────── */
  .capa {
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    background: linear-gradient(160deg, #0A1628 0%, #0E2040 55%, #102A50 100%);
    display: flex; flex-direction: column;
    page-break-after: always; break-after: page;
  }
  .capa-top {
    padding: 30px 40px 0;
    display: flex; justify-content: space-between; align-items: flex-start;
  }
  .capa-body {
    flex: 1; padding: 0 40px 48px; /* padding-bottom = altura do footer fixo */
    display: flex; flex-direction: column; justify-content: center;
  }
  .capa-pretitle {
    font-size: 10px; font-weight: 500; color: #F5A623;
    letter-spacing: 5px; text-transform: uppercase; margin-bottom: 18px;
  }
  .capa-title { font-size: 40px; font-weight: 700; color: #FFFFFF; line-height: 1.1; margin-bottom: 8px; }
  .capa-divider { width: 60px; height: 3px; background: #F5A623; margin: 22px 0; border-radius: 2px; }
  .capa-cliente-label {
    font-size: 10px; font-weight: 300;
    color: rgba(255,255,255,0.7); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 10px;
  }
  .capa-cliente-nome { font-size: 30px; font-weight: 600; color: #fff; line-height: 1.2; }
  .capa-meta { display: flex; gap: 36px; margin-top: 28px; }
  .capa-meta-label { font-size: 10px; font-weight: 300; color: rgba(255,255,255,0.6); letter-spacing: 2px; text-transform: uppercase; }
  .capa-meta-value { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.95); margin-top: 4px; }

  /* ─── TABELA DE DOCUMENTO: <thead> repete em cada página impressa ── */
  .doc-table {
    width: 210mm;
    border-collapse: collapse;
    border-spacing: 0;
  }
  .doc-table thead { display: table-header-group; }
  .doc-table tbody { display: table-row-group; }
  .doc-thead-cell { padding: 0 0 20px 0; border: none; } /* padding-bottom cria espaço abaixo do header em todas as páginas */
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
  .header-tag { font-size: 9px; font-weight: 400; color: rgba(255,255,255,0.6); letter-spacing: 2px; text-transform: uppercase; }

  /* ─── FOOTER FIXO: aparece em todas as páginas impressas ────────── */
  .footer {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: 48px;
    background: #0E2040;
    padding: 0 36px;
    display: flex; align-items: center; justify-content: space-between;
    z-index: 100;
  }
  .footer-text { font-size: 10px; font-weight: 400; color: rgba(255,255,255,0.7); }
  .footer-numero { font-size: 9px; color: rgba(255,255,255,0.5); }

  /* ─── SEÇÕES DE CONTEÚDO (fluem naturalmente no tbody) ──────────── */
  .doc-content { padding: 0 36px 8px; } /* sem padding-top — o thead-cell já faz esse papel */
  .section { margin-bottom: 24px; }
  .section-title {
    font-size: 17px; font-weight: 600; color: #0E2040;
    border-left: 4px solid #F5A623; padding-left: 12px;
    margin-bottom: 14px; line-height: 1.2;
    page-break-after: avoid; break-after: avoid;
  }
  .section-divider { border: none; border-top: 1px solid #E8EDF4; margin: 18px 0; }

  /* ─── TABELA DE ITENS ──────────────────────────────────────────── */
  .tabela-itens { width: 100%; border-collapse: collapse; margin-bottom: 14px; page-break-inside: auto; }
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
  .tabela-itens tfoot tr { background: #0E2040; }
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
  .aceite-box { background: #F5F8FC; border-radius: 10px; padding: 24px; margin-bottom: 8px; }
  .assinatura-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; margin-top: 120px; }
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

  @media print {
    body { margin: 0; }
    /* margem inferior em todas as páginas reserva espaço para o footer fixo */
    @page          { size: A4; margin: 0 0 48px 0; }
    /* primeira página (capa) não tem margem — capa é exatamente 297mm */
    @page :first   { margin: 0; }
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
  return `<div class="header-interno">
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
  return `<div class="footer">
    <div class="footer-text">${partes}</div>
    <div class="footer-numero">${numero}</div>
  </div>`
}

function sec(titulo: string, conteudo: string): string {
  return `<div class="section"><div class="section-title">${titulo}</div>${conteudo}</div>`
}

// ─── GERADOR PRINCIPAL ───────────────────────────────────────────────────────

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

  // ── CAPA ─────────────────────────────────────────────────────────
  let capaHtml = ''
  if (blocoAtivo(blocos, 'capa')) {
    capaHtml = `
    <div class="capa">
      <div class="capa-top">
        <div>
          ${logoUrl
            ? `<img src="${logoUrl}" style="height:72px;max-width:200px;object-fit:contain;" alt="Logo"/>`
            : `<div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:2px">${nomeEmpresa}</div>
               <div style="font-size:9px;font-weight:400;color:#F5A623;letter-spacing:5px;text-transform:uppercase;margin-top:4px">Proposta de Serviços</div>`
          }
        </div>
        <div style="text-align:right;line-height:1.7">
          ${empresa?.cidade ? `<div style="font-size:10px;color:rgba(255,255,255,0.5)">${empresa.cidade}/${empresa.estado ?? ''}</div>` : ''}
          <div style="font-size:9px;color:rgba(255,255,255,0.3)">${numero}</div>
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
    </div>`
  }

  // ── CONTEÚDO (flui naturalmente, thead repete em cada página) ─────
  const tipoLabel: Record<string, string> = {
    avista: 'À Vista', parcelado_marcos: 'Parcelado por Marcos', financiamento: 'Financiamento', cartao: 'Cartão de Crédito',
  }

  let sections = ''

  // Apresentação + Diferenciais
  const temApres = blocoAtivo(blocos, 'apresentacao_empresa')
  const temDif   = blocoAtivo(blocos, 'diferenciais')
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
    if (temApres) sections += sec('Quem Somos', renderTexto(txtApres) || defaultApres)
    if (temDif)   sections += sec('Por que nos escolher?', renderTexto(txtDif) || defaultDif)
  }

  // Como Funciona + Regulamentação
  const temCF  = blocoAtivo(blocos, 'como_funciona')
  const temReg = blocoAtivo(blocos, 'regulamentacao')
  if (temCF) {
    const txt = textoBloco(blocos, 'como_funciona', textos ?? {}, 'como_funciona')
    sections += sec('Como Funciona', renderTexto(txt) || '<p>Informações sobre o funcionamento do serviço proposto.</p>')
  }
  if (temReg) {
    const txt = textoBloco(blocos, 'regulamentacao', textos ?? {}, 'regulamentacao')
    sections += sec('Regulamentação', renderTexto(txt) || '<p>O serviço é prestado em conformidade com as normas técnicas e legislação vigente aplicáveis.</p>')
  }

  // Fornecedores
  if (blocoAtivo(blocos, 'fornecedores')) {
    const txt = textoBloco(blocos, 'fornecedores', textos ?? {}, 'fornecedores')
    sections += sec('Fornecedores e Parceiros', renderTexto(txt) || '<p>Trabalhamos com fornecedores homologados que atendem aos mais altos padrões de qualidade e procedência.</p>')
  }

  // O que Propomos Entregar
  const temEntregas = blocoAtivo(blocos, 'escopo_entregas')
  const txtEntregas = textoBloco(blocos, 'escopo_entregas', textos ?? {}, 'escopo_entregas')
  if (temEntregas && txtEntregas) {
    sections += sec('O que Propomos Entregar', renderListaLetras(txtEntregas))
  }

  // Escopo do Serviço (tabela de itens)
  const temEscopo = blocoAtivo(blocos, 'escopo_servico')
  if (temEscopo) {
    const itens = itensServico ?? []
    sections += sec(tituloServico, `
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
            <td style="color:#8A9BB5;font-size:11px;text-align:center">${idx + 1}</td>
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
      <p style="font-size:11px;color:#8A9BB5;margin-top:4px">* Valores em Reais (BRL). Proposta válida até ${dataValidade ?? '—'}.</p>
    `)
  }

  // Condições de Pagamento
  const temConds = blocoAtivo(blocos, 'condicoes_comerciais') && condsAtivas.length > 0
  if (temConds) {
    sections += sec('Condições de Pagamento', condsAtivas.map((cond: any) => {
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
            <td style="color:#8A9BB5;font-size:11px">${p.prazoDias > 0 ? `${p.prazoDias} dias ${p.tipoPrazo ?? 'corridos'}` : 'Na assinatura'}</td>
            <td class="valor">${fmt(p.valor)}</td>
          </tr>`).join('')}
        </table>` : ''}
      </div>`
    }).join(''))
  }

  // Garantias
  if (blocoAtivo(blocos, 'garantias')) {
    const txt = textoBloco(blocos, 'garantias', textos ?? {}, 'garantias')
    sections += sec('Garantias Inclusas', renderTexto(txt) || `<p>Todos os serviços executados possuem garantia conforme a legislação vigente e as especificações técnicas dos fabricantes dos materiais utilizados. Nosso compromisso vai além da entrega — estamos presentes no pós-serviço.</p>`)
  }

  // Considerações Gerais
  const DEFAULT_CONSIDERACOES = `- **Atendimento:** Prestado em horário comercial, de segunda a sexta-feira das 8h às 18h.
- **Autoria do Orçamento:** Este documento é de uso exclusivo desta negociação e não deve ser repassado a terceiros.
- **Encargos e Taxas:** Eventuais taxas, licenças ou liberações necessárias são de responsabilidade do contratante.
- **Etapa Única:** Os serviços serão executados de forma contínua e em etapa única, salvo acordo formal em contrário.
- **Garantia:** Os serviços possuem garantia de 90 dias contra defeitos de execução.
- **Horário Comercial:** A execução ocorrerá em horário comercial; serviços noturnos ou em fins de semana serão cobrados à parte.`

  if (blocoAtivo(blocos, 'consideracoes_gerais')) {
    const fixedTxt   = (textos ?? {})?.['consideracoes_gerais']?.conteudo || DEFAULT_CONSIDERACOES
    const customBloco = (blocos ?? []).find((b: any) => b.tipoBloco === 'consideracoes_gerais')
    const customTxt  = customBloco?.textoOverride?.trim() || ''
    sections += sec('LEIA COM ATENÇÃO — Informações Importantes', renderListaNumerada(customTxt || fixedTxt, cor1))
  }

  // Aceite + Contato
  const temAceite  = blocoAtivo(blocos, 'aceite')
  const temContato = blocoAtivo(blocos, 'contato')
  if (temAceite) {
    sections += sec('Aceite e Assinatura', `
      <div class="aceite-box">
        <p>Ao assinar este documento, o contratante declara estar de acordo com todos os termos, condições, escopo de serviços e valores descritos nesta proposta comercial.</p>
        <p style="margin-top:10px"><strong>Proposta:</strong> ${numero} &nbsp;&nbsp; <strong>Valor Total:</strong> ${fmt(totalGeral)}</p>
        <p><strong>Cliente:</strong> ${nomeCliente}</p>
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
      </div>`)
  }
  if (temContato) {
    sections += sec('Entre em Contato', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:10px">
        ${empresa?.telefone ? `<div>
          <p style="color:#8A9BB5;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px">Telefone</p>
          <p style="font-size:16px;font-weight:600;color:#0E2040;margin:0">${empresa.telefone}</p>
        </div>` : ''}
        ${empresa?.email ? `<div>
          <p style="color:#8A9BB5;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px">E-mail</p>
          <p style="font-size:16px;font-weight:600;color:#0E2040;margin:0">${empresa.email}</p>
        </div>` : ''}
        ${empresa?.site ? `<div>
          <p style="color:#8A9BB5;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px">Site</p>
          <p style="font-size:16px;font-weight:600;color:#0E2040;margin:0">${empresa.site}</p>
        </div>` : ''}
        ${empresa?.endereco ? `<div style="grid-column:1/-1">
          <p style="color:#8A9BB5;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px">Endereço</p>
          <p style="font-size:16px;font-weight:600;color:#0E2040;margin:0">${empresa.endereco}${empresa.cidade ? `, ${empresa.cidade}/${empresa.estado}` : ''}</p>
        </div>` : ''}
      </div>`)
  }

  const footerHtml = footerServico(numero, empresa)
  const headerHtml = headerInterno(numero, nomeEmpresa, logoUrl)

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proposta ${numero} — ${nomeCliente}</title>
  <style>${CSS_SERVICO.replace(/#F5A623/g, cor1).replace(/#2D9C4E/g, cor2)}</style>
</head>
<body>
  ${capaHtml}
  ${sections ? `
  <table class="doc-table">
    <thead><tr><td class="doc-thead-cell">${headerHtml}</td></tr></thead>
    <tbody><tr><td class="doc-tbody-cell">
      <div class="doc-content">${sections}</div>
    </td></tr></tbody>
  </table>` : ''}
  ${footerHtml}
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
