// ═══════════════════════════════════════════════════════════════════
// Gerador de Comprovante PDF — SIGECO / Atom Finance
// Usa window.print() em uma nova janela para gerar o PDF
// ═══════════════════════════════════════════════════════════════════

export interface EmpresaInfo {
  nome:     string
  cnpj:     string
  telefone: string | null
  email:    string | null
  logoUrl:  string | null
  cidade:   string
  estado:   string
}

export interface TituloInfo {
  id:            number
  tipo:          'PAGAR' | 'RECEBER'
  descricao:     string
  documento:     string | null
  valorOriginal: string
  emissao:       string
  observacoes:   string | null
  propostaId:    number | null
  pessoaNome:       string | null
  pessoaCpfCnpj:    string | null
  pessoaBanco:      string | null
  pessoaTipoPix:    string | null
  pessoaChavePix:   string | null
  pessoaTipoPagamento: string | null
  planoNome:     string | null
  centroNome:    string | null
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

function fmtBRL(v: number | string | null | undefined): string {
  const n = Number(v ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(s: string | null | undefined): string {
  if (!s) return '—'
  // MySQL pode retornar "2026-05-21T00:00:00.000Z" — pega só os 10 primeiros chars
  const dateStr = String(s).slice(0, 10)
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return String(s)
  return `${d}/${m}/${y}`
}

// Normaliza a data para comparação (YYYY-MM-DD)
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

// ─── Número do comprovante ────────────────────────────────────────────────────
function numComprovante(tipo: 'PAGAR' | 'RECEBER', id: number, emissao: string | null | undefined): string {
  const mes = emissao ? String(emissao).slice(0, 7) : new Date().toISOString().slice(0, 7)
  const prefix = tipo === 'PAGAR' ? 'PAG' : 'REC'
  return `N° ${prefix}-${mes}-${id}`
}

// ─── HTML do cabeçalho SIGECO ─────────────────────────────────────────────────
function headerHtml(empresa: EmpresaInfo, emissao: string): string {
  const now = new Date()
  const emitidoEm = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const logoTag = empresa.logoUrl
    ? `<img src="${empresa.logoUrl}" alt="Logo" style="height:52px;object-fit:contain;" />`
    : `<div style="width:52px;height:52px;background:#1E40AF;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:18px;">A</div>`

  return `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:4px;">
      ${logoTag}
      <div>
        <div style="font-size:18px;font-weight:900;color:#1E293B;letter-spacing:-0.5px;">${empresa.nome}</div>
        <div style="font-size:11px;color:#475569;margin-top:2px;">
          SIGECO / Sistema Integrado de Gestão de Engenharia, Contratos e Operações
        </div>
        <div style="font-size:11px;color:#475569;margin-top:1px;">
          CNPJ: ${fmtCnpj(empresa.cnpj)}
          ${empresa.telefone ? ` &nbsp;·&nbsp; Tel: ${empresa.telefone}` : ''}
          ${empresa.email    ? ` &nbsp;·&nbsp; ${empresa.email}` : ''}
        </div>
      </div>
      <div style="margin-left:auto;text-align:right;">
        <div style="font-size:10px;color:#94A3B8;">Emitido em</div>
        <div style="font-size:11px;color:#475569;font-weight:600;">${emitidoEm}</div>
      </div>
    </div>
    <hr style="border:none;border-top:2px solid #1E40AF;margin:10px 0 16px;" />
  `
}

// ─── Campo de linha do comprovante ────────────────────────────────────────────
function campo(label: string, value: string | null | undefined): string {
  return `
    <div style="display:flex;border-bottom:1px solid #E2E8F0;padding:7px 0;gap:8px;">
      <div style="flex:0 0 200px;font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;">${label}</div>
      <div style="flex:1;font-size:12px;color:#1E293B;font-weight:500;">${value || '—'}</div>
    </div>
  `
}

// ─── COMPROVANTE DE PAGAMENTO ─────────────────────────────────────────────────
function htmlPagamento(
  empresa: EmpresaInfo,
  titulo: TituloInfo,
  parcela: ParcelaInfo,
  observacoesExtra: string,
): string {
  const statusParcela = parcela.status === 'ABERTA' && normDate(parcela.vencimento) < new Date().toISOString().slice(0, 10)
    ? 'VENCIDA' : parcela.status

  return `
    <div style="font-size:22px;font-weight:900;color:#1E293B;margin-bottom:12px;letter-spacing:-0.5px;">
      COMPROVANTE DE PAGAMENTO
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      <span style="
        display:inline-block;padding:5px 16px;border-radius:20px;
        background:${statusBg(statusParcela)};color:${statusColor(statusParcela)};
        font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;
      ">${statusLabel(statusParcela)}</span>
      <span style="font-size:13px;font-weight:600;color:#475569;">
        ${numComprovante('PAGAR', titulo.id, titulo.emissao)}
      </span>
      ${titulo.documento ? `<span style="font-size:11px;color:#94A3B8;">Doc: ${titulo.documento}</span>` : ''}
    </div>

    ${campo('NOME COMPLETO / RAZÃO SOCIAL', titulo.pessoaNome)}
    ${campo('CPF / CNPJ', fmtCnpj(titulo.pessoaCpfCnpj))}
    ${campo('BANCO', titulo.pessoaBanco)}
    ${campo('TIPO DE CHAVE PIX', titulo.pessoaTipoPix)}
    ${campo('CHAVE PIX', titulo.pessoaChavePix)}
    ${campo('TIPO DE SERVIÇO / PLANO', titulo.planoNome)}
    ${campo('CENTRO DE CUSTO', titulo.centroNome)}
    ${campo('DATA DE PAGAMENTO', fmtData(parcela.dataPagamento ?? parcela.vencimento))}
    ${campo('PARCELA', `${parcela.numero}ª parcela`)}
    ${campo('VALOR', fmtBRL(parcela.valorPago ?? parcela.valor))}
    ${campo('DESCRIÇÃO', titulo.descricao)}
    ${(titulo.observacoes || observacoesExtra) ? campo('OBSERVAÇÕES', observacoesExtra || titulo.observacoes) : ''}

    <!-- Linhas de assinatura -->
    <div style="display:flex;gap:40px;margin-top:48px;">
      <div style="flex:1;border-top:1px solid #CBD5E1;padding-top:8px;text-align:center;">
        <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;">Responsável pelo Pagamento</div>
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
  observacoesExtra: string,
): string {
  const totalParcelas = parcelas.length
  const valorTotal = parcelas.reduce((s, p) => s + Number(p.valor), 0)
  const valorRecebido = parcelas.filter(p => p.status === 'PAGA').reduce((s, p) => s + Number(p.valorPago ?? p.valor), 0)
  const contratoNum = titulo.propostaId
    ? `CTR-${titulo.emissao?.slice(0, 7) ?? ''}-${titulo.propostaId}`
    : (titulo.documento ?? '—')

  // Badge dinâmico baseado no status real das parcelas
  const hoje = new Date().toISOString().slice(0, 10)
  const qtdPagas   = parcelas.filter(p => p.status === 'PAGA').length
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
        <td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:11px;color:#1E293B;font-weight:600;">${fmtBRL(p.valor)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:11px;color:#475569;">${fmtData(p.vencimento)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:11px;color:#475569;">${fmtData(p.dataPagamento)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;">
          <span style="
            padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;
            background:${statusBg(statusP)};color:${statusColor(statusP)};
          ">${statusLabel(statusP)}</span>
        </td>
      </tr>
    `
  }).join('')

  return `
    <div style="font-size:22px;font-weight:900;color:#1E293B;margin-bottom:12px;letter-spacing:-0.5px;">
      COMPROVANTE DE RECEBIMENTO
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      <span style="
        display:inline-block;padding:5px 16px;border-radius:20px;
        background:${badgeBg};color:${badgeColor};
        font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;
      ">${badgeLabel}</span>
      <span style="font-size:13px;font-weight:600;color:#475569;">
        ${numComprovante('RECEBER', titulo.id, titulo.emissao)}
      </span>
    </div>

    ${campo('CONTRATO / DOCUMENTO', contratoNum)}
    ${campo('NOME / RAZÃO SOCIAL', titulo.pessoaNome)}
    ${campo('TIPO DE PAGAMENTO', titulo.pessoaTipoPagamento)}
    ${campo('TOTAL DE PARCELAS', `${totalParcelas}x parcela${totalParcelas !== 1 ? 's' : ''}`)}
    ${campo('VALOR TOTAL', fmtBRL(valorTotal))}
    ${campo('SERVIÇO / PLANO', titulo.planoNome)}
    ${campo('CENTRO DE CUSTO', titulo.centroNome)}
    ${campo('VALOR RECEBIDO', fmtBRL(valorRecebido))}
    ${campo('DESCRIÇÃO', titulo.descricao)}
    ${(titulo.observacoes || observacoesExtra) ? campo('OBSERVAÇÕES', observacoesExtra || titulo.observacoes) : ''}

    <!-- Tabela de parcelas -->
    <div style="margin-top:20px;">
      <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">
        Histórico de Parcelas
      </div>
      <table style="width:100%;border-collapse:collapse;background:#F8FAFC;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#1E293B;">
            <th style="padding:8px;text-align:left;font-size:10px;color:#CBD5E1;text-transform:uppercase;letter-spacing:0.04em;">N°</th>
            <th style="padding:8px;text-align:left;font-size:10px;color:#CBD5E1;text-transform:uppercase;letter-spacing:0.04em;">Valor (R$)</th>
            <th style="padding:8px;text-align:left;font-size:10px;color:#CBD5E1;text-transform:uppercase;letter-spacing:0.04em;">Vencimento</th>
            <th style="padding:8px;text-align:left;font-size:10px;color:#CBD5E1;text-transform:uppercase;letter-spacing:0.04em;">Recebimento</th>
            <th style="padding:8px;text-align:left;font-size:10px;color:#CBD5E1;text-transform:uppercase;letter-spacing:0.04em;">Status</th>
          </tr>
        </thead>
        <tbody>${rowsParcelas}</tbody>
        <tfoot>
          <tr style="background:#F1F5F9;">
            <td colspan="1" style="padding:8px;font-size:11px;font-weight:700;color:#475569;">TOTAL</td>
            <td style="padding:8px;font-size:12px;font-weight:900;color:#1E293B;">${fmtBRL(valorTotal)}</td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `
}

// ─── FUNÇÃO PRINCIPAL: abrir janela de impressão ───────────────────────────────
export function gerarComprovantePdf(params: {
  tipo:             'PAGAR' | 'RECEBER'
  empresa:          EmpresaInfo
  titulo:           TituloInfo
  parcelas:         ParcelaInfo[]
  parcelaAtual?:    ParcelaInfo  // para PAGAR, a parcela específica que está sendo impressa
  observacoesExtra: string
}) {
  const { tipo, empresa, titulo, parcelas, parcelaAtual, observacoesExtra } = params
  const parcela = parcelaAtual ?? parcelas[0]

  const conteudo = tipo === 'PAGAR'
    ? htmlPagamento(empresa, titulo, parcela, observacoesExtra)
    : htmlRecebimento(empresa, titulo, parcelas, observacoesExtra)

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Comprovante — ${empresa.nome}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background: #fff;
          color: #1E293B;
          padding: 32px;
          max-width: 800px;
          margin: 0 auto;
        }
        @media print {
          body { padding: 16px; }
          .no-print { display: none !important; }
          @page { margin: 16mm; }
        }
      </style>
    </head>
    <body>
      ${headerHtml(empresa, titulo.emissao)}
      ${conteudo}

      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #E2E8F0;text-align:center;font-size:9px;color:#94A3B8;">
        Documento gerado pelo SIGECO / ${empresa.nome} &nbsp;·&nbsp; ${new Date().toLocaleDateString('pt-BR')}
      </div>

      <div class="no-print" style="margin-top:24px;text-align:center;">
        <button onclick="window.print()" style="
          padding:12px 32px;background:#1E40AF;color:#fff;border:none;border-radius:8px;
          font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;
        ">🖨 Imprimir / Salvar PDF</button>
        <button onclick="window.close()" style="
          margin-left:12px;padding:12px 20px;background:#F1F5F9;color:#475569;
          border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit;
        ">Fechar</button>
      </div>
    </body>
    </html>
  `

  const win = window.open('', '_blank', 'width=860,height=900,scrollbars=yes')
  if (!win) {
    alert('Por favor, permita popups para gerar o comprovante.')
    return
  }
  win.document.write(html)
  win.document.close()
}
