// ═══════════════════════════════════════════════════════════════════
// Gerador de Comprovante / OS — SIGECO / Atom Finance
// Usa window.print() em uma nova janela para gerar o PDF
// ═══════════════════════════════════════════════════════════════════

export interface EmpresaInfo {
  nome:           string
  cnpj:           string
  telefone:       string | null
  email:          string | null
  logoUrl:        string | null
  cidade:         string
  estado:         string
  endereco:       string | null
  cep:            string | null
  bancoNome:      string | null
  bancoAgencia:   string | null
  bancoConta:     string | null
  bancoTipo:      string | null
  bancoPixTipo:   string | null
  bancoPixChave:  string | null
  rodapeTexto:    string | null
}

export interface TituloInfo {
  id:                  number
  tipo:                'PAGAR' | 'RECEBER'
  descricao:           string
  documento:           string | null
  valorOriginal:       string
  emissao:             string
  observacoes:         string | null
  propostaId:          number | null
  pessoaNome:          string | null
  pessoaFantasia:      string | null
  pessoaCpfCnpj:       string | null
  pessoaTelefone:      string | null
  pessoaEmail:         string | null
  pessoaLogradouro:    string | null
  pessoaNumero:        string | null
  pessoaComplemento:   string | null
  pessoaBairro:        string | null
  pessoaCidade:        string | null
  pessoaEstado:        string | null
  pessoaBanco:         string | null
  pessoaTipoPix:       string | null
  pessoaChavePix:      string | null
  pessoaTipoPagamento: string | null
  planoNome:           string | null
  centroNome:          string | null
}

export interface ParcelaInfo {
  id:            number
  numero:        number
  valor:         string
  vencimento:    string
  status:        string
  dataPagamento: string | null
  valorPago:     string | null
}

export interface AgendamentoInfo {
  dataAgendada:  string   // "2026-05-30"
  horaAgendada:  string   // "09:00"
  tecnico:       string
  enderecoServico: string
  observacoes:   string
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtBRL(v: number | string | null | undefined): string {
  const n = Number(v ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(s: string | null | undefined): string {
  if (!s) return '—'
  const dateStr = String(s).slice(0, 10)
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return String(s)
  return `${d}/${m}/${y}`
}

function normDate(s: string | null | undefined): string {
  return s ? String(s).slice(0, 10) : ''
}

function fmtCnpj(v: string | null | undefined): string {
  if (!v) return '—'
  const n = v.replace(/\D/g, '')
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return v
}

function fmtCep(v: string | null | undefined): string {
  if (!v) return ''
  const n = v.replace(/\D/g, '')
  return n.length === 8 ? n.replace(/(\d{5})(\d{3})/, '$1-$2') : v
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PAGA: 'Pago', ABERTA: 'Pendente', VENCIDA: 'Vencida', CANCELADA: 'Cancelado',
  }
  return map[status] ?? status
}
function statusColor(status: string): string {
  const map: Record<string, string> = {
    PAGA: '#064E3B', ABERTA: '#1E3A5F', VENCIDA: '#7C2D12', CANCELADA: '#374151',
  }
  return map[status] ?? '#374151'
}
function statusBg(status: string): string {
  const map: Record<string, string> = {
    PAGA: '#D1FAE5', ABERTA: '#DBEAFE', VENCIDA: '#FEE2E2', CANCELADA: '#F3F4F6',
  }
  return map[status] ?? '#F3F4F6'
}

function numComprovante(tipo: 'PAGAR' | 'RECEBER', id: number, emissao: string | null | undefined): string {
  const mes = emissao ? String(emissao).slice(0, 7) : new Date().toISOString().slice(0, 7)
  const prefix = tipo === 'PAGAR' ? 'PAG' : 'REC'
  return `${prefix}-${mes}-${String(id).padStart(4, '0')}`
}

// ─── Endereço completo da pessoa ──────────────────────────────────────────────

function enderecoPessoa(t: TituloInfo): string {
  const partes: string[] = []
  if (t.pessoaLogradouro) {
    let linha = t.pessoaLogradouro
    if (t.pessoaNumero)      linha += `, ${t.pessoaNumero}`
    if (t.pessoaComplemento) linha += ` — ${t.pessoaComplemento}`
    partes.push(linha)
  }
  if (t.pessoaBairro) partes.push(t.pessoaBairro)
  if (t.pessoaCidade && t.pessoaEstado) partes.push(`${t.pessoaCidade} / ${t.pessoaEstado}`)
  return partes.join(', ') || '—'
}

// ─── Cabeçalho da empresa ─────────────────────────────────────────────────────

function headerHtml(empresa: EmpresaInfo): string {
  const now = new Date()
  const emitidoEm = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const logoTag = empresa.logoUrl
    ? `<img src="${empresa.logoUrl}" alt="Logo" style="height:56px;object-fit:contain;" />`
    : `<div style="width:56px;height:56px;background:#1E40AF;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:20px;">A</div>`

  // Endereço da empresa
  const endEmp: string[] = []
  if (empresa.endereco) endEmp.push(empresa.endereco)
  const cidEst = [empresa.cidade, empresa.estado].filter(Boolean).join(' / ')
  if (cidEst) endEmp.push(cidEst)
  if (empresa.cep) endEmp.push(`CEP ${fmtCep(empresa.cep)}`)

  // Banco / PIX da empresa (para comprovante de recebimento)
  const pixLabel = empresa.bancoPixTipo
    ? `PIX (${empresa.bancoPixTipo}): ${empresa.bancoPixChave ?? ''}`
    : null

  return `
    <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:8px;">
      ${logoTag}
      <div style="flex:1;">
        <div style="font-size:19px;font-weight:900;color:#1E293B;letter-spacing:-0.5px;line-height:1.1;">
          ${empresa.nome}
        </div>
        <div style="font-size:10px;color:#64748B;margin-top:2px;letter-spacing:0.02em;">
          SIGECO — Sistema Integrado de Gestão de Engenharia, Contratos e Operações
        </div>
        <div style="margin-top:5px;font-size:10.5px;color:#475569;line-height:1.6;">
          CNPJ: ${fmtCnpj(empresa.cnpj)}
          ${empresa.telefone ? ` &nbsp;·&nbsp; Tel: ${empresa.telefone}` : ''}
          ${empresa.email    ? ` &nbsp;·&nbsp; ${empresa.email}` : ''}
        </div>
        ${endEmp.length ? `<div style="font-size:10px;color:#64748B;line-height:1.5;">${endEmp.join(' &nbsp;·&nbsp; ')}</div>` : ''}
        ${pixLabel         ? `<div style="font-size:10px;color:#1D4ED8;margin-top:2px;">${pixLabel}</div>` : ''}
        ${empresa.bancoNome ? `<div style="font-size:10px;color:#475569;">Banco: ${empresa.bancoNome}${empresa.bancoAgencia ? ` &nbsp;Ag: ${empresa.bancoAgencia}` : ''}${empresa.bancoConta ? ` &nbsp;Conta: ${empresa.bancoConta}` : ''}${empresa.bancoTipo ? ` (${empresa.bancoTipo})` : ''}</div>` : ''}
      </div>
      <div style="text-align:right;min-width:120px;">
        <div style="font-size:9px;color:#94A3B8;text-transform:uppercase;letter-spacing:0.06em;">Emitido em</div>
        <div style="font-size:11px;color:#475569;font-weight:600;">${emitidoEm}</div>
      </div>
    </div>
    <hr style="border:none;border-top:2px solid #1E40AF;margin:10px 0 14px;" />
  `
}

// ─── Campo de linha ───────────────────────────────────────────────────────────

function campo(label: string, value: string | null | undefined, destaque = false): string {
  if (!value || value === '—') return ''
  return `
    <div style="display:flex;border-bottom:1px solid #E2E8F0;padding:6px 0;gap:8px;${destaque ? 'background:#EFF6FF;margin:0 -4px;padding:6px 4px;' : ''}">
      <div style="flex:0 0 190px;font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;">${label}</div>
      <div style="flex:1;font-size:12px;color:#1E293B;font-weight:${destaque ? '700' : '500'};">${value}</div>
    </div>
  `
}

function secaoTitulo(label: string): string {
  return `<div style="font-size:9px;font-weight:800;color:#1E40AF;text-transform:uppercase;letter-spacing:0.1em;margin:14px 0 6px;border-left:3px solid #1E40AF;padding-left:8px;">${label}</div>`
}

// ─── Bloco de agendamento ─────────────────────────────────────────────────────

function agendamentoHtml(ag: AgendamentoInfo | null): string {
  if (!ag || (!ag.dataAgendada && !ag.tecnico && !ag.enderecoServico)) return ''
  const dataFmt = ag.dataAgendada ? fmtData(ag.dataAgendada) + (ag.horaAgendada ? ` às ${ag.horaAgendada}` : '') : '—'
  return `
    ${secaoTitulo('Dados do Agendamento')}
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px 14px;margin-bottom:4px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div>
          <div style="font-size:9px;font-weight:700;color:#1D4ED8;text-transform:uppercase;letter-spacing:0.05em;">Data / Horário</div>
          <div style="font-size:13px;font-weight:800;color:#1E293B;margin-top:2px;">${dataFmt}</div>
        </div>
        ${ag.tecnico ? `
        <div>
          <div style="font-size:9px;font-weight:700;color:#1D4ED8;text-transform:uppercase;letter-spacing:0.05em;">Técnico Responsável</div>
          <div style="font-size:12px;font-weight:600;color:#1E293B;margin-top:2px;">${ag.tecnico}</div>
        </div>` : ''}
      </div>
      ${ag.enderecoServico ? `
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #BFDBFE;">
        <div style="font-size:9px;font-weight:700;color:#1D4ED8;text-transform:uppercase;letter-spacing:0.05em;">Local de Execução</div>
        <div style="font-size:12px;color:#1E293B;margin-top:2px;">${ag.enderecoServico}</div>
      </div>` : ''}
      ${ag.observacoes ? `
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #BFDBFE;">
        <div style="font-size:9px;font-weight:700;color:#1D4ED8;text-transform:uppercase;letter-spacing:0.05em;">Observações</div>
        <div style="font-size:11px;color:#334155;margin-top:2px;">${ag.observacoes}</div>
      </div>` : ''}
    </div>
  `
}

// ─── COMPROVANTE DE PAGAMENTO ─────────────────────────────────────────────────

function htmlPagamento(
  empresa: EmpresaInfo,
  titulo: TituloInfo,
  parcela: ParcelaInfo,
  agendamento: AgendamentoInfo | null,
): string {
  const statusParcela = parcela.status === 'ABERTA' && normDate(parcela.vencimento) < new Date().toISOString().slice(0, 10)
    ? 'VENCIDA' : parcela.status

  const numDoc = numComprovante('PAGAR', titulo.id, titulo.emissao)

  return `
    <!-- Título + badge -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;">
      <div>
        <div style="font-size:20px;font-weight:900;color:#1E293B;letter-spacing:-0.5px;">SOLICITAÇÃO DE PAGAMENTO</div>
        <div style="font-size:11px;color:#64748B;margin-top:3px;">${titulo.descricao}</div>
      </div>
      <div style="text-align:right;">
        <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:${statusBg(statusParcela)};color:${statusColor(statusParcela)};font-size:11px;font-weight:700;text-transform:uppercase;">${statusLabel(statusParcela)}</span>
        <div style="font-size:10px;color:#94A3B8;margin-top:4px;">N° ${numDoc}</div>
        ${titulo.documento ? `<div style="font-size:10px;color:#94A3B8;">Doc: ${titulo.documento}</div>` : ''}
      </div>
    </div>

    ${agendamentoHtml(agendamento)}

    ${secaoTitulo('Beneficiário / Fornecedor')}
    ${campo('Nome / Razão Social', titulo.pessoaNome)}
    ${campo('Nome Fantasia', titulo.pessoaFantasia)}
    ${campo('CPF / CNPJ', fmtCnpj(titulo.pessoaCpfCnpj))}
    ${campo('Telefone', titulo.pessoaTelefone)}
    ${campo('E-mail', titulo.pessoaEmail)}
    ${campo('Endereço', enderecoPessoa(titulo))}

    ${secaoTitulo('Dados Bancários para Pagamento')}
    ${campo('Banco', titulo.pessoaBanco)}
    ${campo('Tipo de Chave PIX', titulo.pessoaTipoPix)}
    ${campo('Chave PIX', titulo.pessoaChavePix)}
    ${campo('Forma de Pagamento', titulo.pessoaTipoPagamento)}

    ${secaoTitulo('Informações do Lançamento')}
    ${campo('Plano de Contas', titulo.planoNome)}
    ${campo('Centro de Custo', titulo.centroNome)}
    ${campo('Parcela', `${parcela.numero}ª parcela`)}
    ${campo('Vencimento', fmtData(parcela.vencimento))}
    ${parcela.dataPagamento ? campo('Data de Pagamento', fmtData(parcela.dataPagamento)) : ''}
    ${campo('Valor', fmtBRL(parcela.valorPago ?? parcela.valor), true)}
    ${titulo.observacoes ? campo('Observações do Lançamento', titulo.observacoes) : ''}

    <!-- Assinaturas -->
    <div style="display:flex;gap:40px;margin-top:48px;">
      <div style="flex:1;border-top:1px solid #CBD5E1;padding-top:8px;text-align:center;">
        <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;">Solicitante / Responsável</div>
      </div>
      <div style="flex:1;border-top:1px solid #CBD5E1;padding-top:8px;text-align:center;">
        <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;">Beneficiário / Recebedor</div>
      </div>
    </div>
  `
}

// ─── COMPROVANTE DE RECEBIMENTO ───────────────────────────────────────────────

function htmlRecebimento(
  empresa: EmpresaInfo,
  titulo: TituloInfo,
  parcelas: ParcelaInfo[],
  agendamento: AgendamentoInfo | null,
): string {
  const hoje = new Date().toISOString().slice(0, 10)
  const totalParcelas   = parcelas.length
  const valorTotal      = parcelas.reduce((s, p) => s + Number(p.valor), 0)
  const valorRecebido   = parcelas.filter(p => p.status === 'PAGA').reduce((s, p) => s + Number(p.valorPago ?? p.valor), 0)
  const valorPendente   = valorTotal - valorRecebido
  const contratoNum     = titulo.propostaId
    ? `CTR-${titulo.emissao?.slice(0, 7) ?? ''}-${String(titulo.propostaId).padStart(4, '0')}`
    : (titulo.documento ?? '—')

  const qtdPagas    = parcelas.filter(p => p.status === 'PAGA').length
  const qtdVencidas = parcelas.filter(p => p.status === 'ABERTA' && normDate(p.vencimento) < hoje).length
  let badgeLabel: string, badgeBg: string, badgeColor: string
  if (qtdPagas === totalParcelas) {
    badgeLabel = 'Recebido';  badgeBg = '#D1FAE5'; badgeColor = '#064E3B'
  } else if (qtdPagas > 0) {
    badgeLabel = 'Parcial';   badgeBg = '#FEF3C7'; badgeColor = '#92400E'
  } else if (qtdVencidas > 0) {
    badgeLabel = 'Vencido';   badgeBg = '#FEE2E2'; badgeColor = '#7C2D12'
  } else {
    badgeLabel = 'Pendente';  badgeBg = '#DBEAFE'; badgeColor = '#1E3A5F'
  }

  const rowsParcelas = parcelas.map(p => {
    const statusP = p.status === 'ABERTA' && normDate(p.vencimento) < hoje ? 'VENCIDA' : p.status
    return `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:11px;color:#475569;">${p.numero}ª</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:11px;font-weight:600;color:#1E293B;">${fmtBRL(p.valor)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:11px;color:#475569;">${fmtData(p.vencimento)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:11px;color:#475569;">${fmtData(p.dataPagamento)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;">
          <span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:${statusBg(statusP)};color:${statusColor(statusP)};">${statusLabel(statusP)}</span>
        </td>
      </tr>
    `
  }).join('')

  return `
    <!-- Título + badge -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;">
      <div>
        <div style="font-size:20px;font-weight:900;color:#1E293B;letter-spacing:-0.5px;">COBRANÇA / RECEBIMENTO</div>
        <div style="font-size:11px;color:#64748B;margin-top:3px;">${titulo.descricao}</div>
      </div>
      <div style="text-align:right;">
        <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:${badgeBg};color:${badgeColor};font-size:11px;font-weight:700;text-transform:uppercase;">${badgeLabel}</span>
        <div style="font-size:10px;color:#94A3B8;margin-top:4px;">N° ${numComprovante('RECEBER', titulo.id, titulo.emissao)}</div>
        <div style="font-size:10px;color:#94A3B8;">Contrato: ${contratoNum}</div>
      </div>
    </div>

    ${agendamentoHtml(agendamento)}

    ${secaoTitulo('Dados do Cliente')}
    ${campo('Nome / Razão Social', titulo.pessoaNome)}
    ${campo('Nome Fantasia', titulo.pessoaFantasia)}
    ${campo('CPF / CNPJ', fmtCnpj(titulo.pessoaCpfCnpj))}
    ${campo('Telefone', titulo.pessoaTelefone)}
    ${campo('E-mail', titulo.pessoaEmail)}
    ${campo('Endereço', enderecoPessoa(titulo))}

    ${secaoTitulo('Dados Financeiros')}
    ${campo('Plano de Contas', titulo.planoNome)}
    ${campo('Centro de Custo', titulo.centroNome)}
    ${campo('Forma de Pagamento Acordada', titulo.pessoaTipoPagamento)}
    ${campo('Total de Parcelas', `${totalParcelas}x`)}
    ${campo('Valor Total', fmtBRL(valorTotal), true)}
    ${valorRecebido > 0 ? campo('Valor Recebido', fmtBRL(valorRecebido)) : ''}
    ${valorPendente > 0 ? campo('Valor Pendente', fmtBRL(valorPendente), true) : ''}
    ${titulo.observacoes ? campo('Observações', titulo.observacoes) : ''}

    <!-- Tabela de parcelas -->
    <div style="margin-top:16px;">
      <div style="font-size:9px;font-weight:800;color:#1E40AF;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;border-left:3px solid #1E40AF;padding-left:8px;">Cronograma de Parcelas</div>
      <table style="width:100%;border-collapse:collapse;font-family:inherit;">
        <thead>
          <tr style="background:#1E293B;">
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#CBD5E1;text-transform:uppercase;letter-spacing:0.04em;">N°</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#CBD5E1;text-transform:uppercase;letter-spacing:0.04em;">Valor</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#CBD5E1;text-transform:uppercase;letter-spacing:0.04em;">Vencimento</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#CBD5E1;text-transform:uppercase;letter-spacing:0.04em;">Recebimento</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#CBD5E1;text-transform:uppercase;letter-spacing:0.04em;">Status</th>
          </tr>
        </thead>
        <tbody>${rowsParcelas}</tbody>
        <tfoot>
          <tr style="background:#F1F5F9;">
            <td style="padding:7px 8px;font-size:11px;font-weight:700;color:#475569;">TOTAL</td>
            <td style="padding:7px 8px;font-size:12px;font-weight:900;color:#1E293B;">${fmtBRL(valorTotal)}</td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Dados bancários da empresa para depósito -->
    ${(empresa.bancoNome || empresa.bancoPixChave) ? `
    <div style="margin-top:16px;padding:10px 14px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;">
      <div style="font-size:9px;font-weight:800;color:#065F46;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Dados para Pagamento — ${empresa.nome}</div>
      ${empresa.bancoPixChave ? `<div style="font-size:11px;color:#1E293B;font-weight:600;">PIX (${empresa.bancoPixTipo ?? ''}): <span style="color:#065F46;">${empresa.bancoPixChave}</span></div>` : ''}
      ${empresa.bancoNome ? `<div style="font-size:10.5px;color:#475569;margin-top:3px;">Banco: ${empresa.bancoNome}${empresa.bancoAgencia ? ` — Ag: ${empresa.bancoAgencia}` : ''}${empresa.bancoConta ? ` — Conta: ${empresa.bancoConta}` : ''}${empresa.bancoTipo ? ` (${empresa.bancoTipo})` : ''}</div>` : ''}
    </div>` : ''}

    <!-- Assinaturas -->
    <div style="display:flex;gap:40px;margin-top:40px;">
      <div style="flex:1;border-top:1px solid #CBD5E1;padding-top:8px;text-align:center;">
        <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;">${empresa.nome}</div>
      </div>
      <div style="flex:1;border-top:1px solid #CBD5E1;padding-top:8px;text-align:center;">
        <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;">Cliente / Responsável</div>
      </div>
    </div>
  `
}

// ─── FUNÇÃO PRINCIPAL ─────────────────────────────────────────────────────────

export function gerarComprovantePdf(params: {
  tipo:          'PAGAR' | 'RECEBER'
  empresa:       EmpresaInfo
  titulo:        TituloInfo
  parcelas:      ParcelaInfo[]
  parcelaAtual?: ParcelaInfo
  agendamento:   AgendamentoInfo | null
}) {
  const { tipo, empresa, titulo, parcelas, parcelaAtual, agendamento } = params
  const parcela = parcelaAtual ?? parcelas[0]

  const conteudo = tipo === 'PAGAR'
    ? htmlPagamento(empresa, titulo, parcela, agendamento)
    : htmlRecebimento(empresa, titulo, parcelas, agendamento)

  const rodape = empresa.rodapeTexto
    ? `<div style="margin-top:6px;font-size:9px;color:#94A3B8;font-style:italic;">${empresa.rodapeTexto}</div>`
    : ''

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>SIGECO — ${empresa.nome}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background: #fff;
          color: #1E293B;
          padding: 28px 32px;
          max-width: 820px;
          margin: 0 auto;
          font-size: 12px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
          @page { margin: 14mm 16mm; }
        }
      </style>
    </head>
    <body>
      ${headerHtml(empresa)}
      ${conteudo}

      <div style="margin-top:28px;padding-top:12px;border-top:1px solid #E2E8F0;text-align:center;font-size:9px;color:#94A3B8;">
        SIGECO / ${empresa.nome} &nbsp;·&nbsp; Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      ${rodape}

      <div class="no-print" style="margin-top:24px;text-align:center;padding:16px;border-top:1px solid #E2E8F0;">
        <button onclick="window.print()" style="
          padding:11px 28px;background:#1E40AF;color:#fff;border:none;border-radius:8px;
          font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-right:8px;
        ">🖨 Imprimir / Salvar PDF</button>
        <button onclick="window.close()" style="
          padding:11px 20px;background:#F1F5F9;color:#475569;
          border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit;
        ">Fechar</button>
      </div>
    </body>
    </html>
  `

  const win = window.open('', '_blank', 'width=880,height=940,scrollbars=yes')
  if (!win) {
    alert('Por favor, permita popups para gerar o comprovante.')
    return
  }
  win.document.write(html)
  win.document.close()
}
