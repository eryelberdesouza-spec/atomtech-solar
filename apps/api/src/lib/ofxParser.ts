// ═══════════════════════════════════════════════════════════════════
// Parser de Extrato OFX/QFX — Banco Inter, Sicoob e outros
// Suporta OFX 1.x (SGML) e OFX 2.x (XML)
// Cada transação tem FITID único → deduplicação 100% confiável
// ═══════════════════════════════════════════════════════════════════

export interface OFXTransacao {
  fitid:    string    // ID único atribuído pelo banco — nunca repete
  data:     string    // YYYY-MM-DD
  descricao: string
  valor:    number    // sempre positivo
  tipo:     'C' | 'D' // C = crédito/entrada   D = débito/saída
  banco:    string    // nome do banco extraído do OFX
  conta:    string    // número da conta
  sugestaoTipo:     'RECEBER' | 'PAGAR'
  sugestaoCategoria: string  // nome sugerido de categoria (plano de contas)
}

export interface OFXParseResult {
  transacoes:    OFXTransacao[]
  total:         number
  totalEntradas: number
  totalSaidas:   number
  banco:         string
  conta:         string
  periodoInicio: string
  periodoFim:    string
}

// ─── Extrai valor de uma tag OFX (funciona em SGML e XML) ────────────────────
function tag(text: string, tagName: string): string {
  // XML: <TAG>valor</TAG>
  const xmlM = text.match(new RegExp(`<${tagName}>([^<]+)<\/${tagName}>`, 'i'))
  if (xmlM) return xmlM[1].trim()
  // SGML: <TAG>valor\n (sem fechamento)
  const sgmlM = text.match(new RegExp(`<${tagName}>([^\r\n<]+)`, 'i'))
  if (sgmlM) return sgmlM[1].trim()
  return ''
}

// ─── Converte data OFX para YYYY-MM-DD ───────────────────────────────────────
// Formatos: 20260114, 20260114120000, 20260114120000[-3:BRT]
function parseDataOFX(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '').substring(0, 8)
  if (digits.length < 8) return new Date().toISOString().slice(0, 10)
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

// ─── Auto-categorização por padrão da descrição ──────────────────────────────
// Retorna o nome do grupo de plano de contas sugerido.
// No frontend fazemos fuzzy match com os planos cadastrados.
export function sugerirCategoria(descricao: string, tipo: 'C' | 'D'): string {
  const d = descricao.toLowerCase()

  if (tipo === 'C') {
    // Resgate/aplicação e transferência entre contas próprias vêm ANTES das regras
    // de receita comum — senão "resgate"/"transferência" cai em receita operacional
    // e distorce o DRE (dinheiro que já foi contabilizado, não é faturamento novo).
    if (/resgat|^aplicaç[aã]o|rdc|cdb/i.test(d))                     return 'Investimentos'
    if (/transfer[êe]ncia de recursos|transf\.? de recursos|mesma titularidade|mesma tit\.?/i.test(d)) return 'Transferência de Recursos'
    if (/juros|rendimento/i.test(d))                                return 'Juros Recebidos'
    if (/pix receb|recebimento pix|pix recebido/i.test(d))         return 'Recebimentos PIX'
    if (/pagamento proposta|energia solar|instalação|manut/i.test(d)) return 'Receita de Serviços'
    if (/liquidação cobrança|boleto|cobrança/i.test(d))            return 'Recebimentos'
    return 'Receitas Diversas'
  }

  // Débitos
  if (/resgat|^aplicaç[aã]o|rdc|cdb/i.test(d))                            return 'Investimentos'
  if (/transfer[êe]ncia de recursos|transf\.? de recursos/i.test(d))      return 'Transferência de Recursos'
  if (/folha|salário|salario|pagamento func|adiantamento/i.test(d))      return 'Pessoal'
  if (/fgts|inss|irrf|contribuição/i.test(d))                            return 'Encargos Trabalhistas'
  if (/tarifa|cpmf|iof|taxa manuten|taxa cob|anuidade/i.test(d))         return 'Encargos Bancários'
  if (/compra|débito|debito|mastercard|visa|elo|hipercard/i.test(d))     return 'Cartão de Débito'
  if (/pix emiti|pix enviad|pix pagamento/i.test(d))                     return 'Pagamentos PIX'
  if (/boleto|liquidação cobrança|liquidacao cobranca/i.test(d))         return 'Fornecedores'
  if (/ted|doc|transferência/i.test(d))                                  return 'Transferências'
  if (/combustível|gasolina|posto/i.test(d))                             return 'Combustível'
  if (/aluguel|locação|locacao/i.test(d))                               return 'Aluguel'
  if (/internet|telefone|tim|claro|vivo|oi |energia|água|água|luz/i.test(d)) return 'Utilidades'
  if (/material|equipamento|ferramenta|painel|inversor/i.test(d))        return 'Materiais'
  if (/marketing|publicidade|propaganda/i.test(d))                       return 'Marketing'
  if (/contabilidade|contador|juridico|advogado/i.test(d))               return 'Serviços Profissionais'
  return 'Despesas Diversas'
}

// ─── Parser principal ─────────────────────────────────────────────────────────
export function parseOFX(content: string): OFXParseResult {
  // Normaliza quebras de linha
  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Metadados da conta
  const banco = tag(text, 'ORG') || tag(text, 'FI') || tag(text, 'BANKID') || 'Banco'
  const conta = tag(text, 'ACCTID') || ''
  const periodoInicio = parseDataOFX(tag(text, 'DTSTART') || '')
  const periodoFim    = parseDataOFX(tag(text, 'DTEND')   || '')

  // Extrai blocos de transação — entre <STMTTRN> ... </STMTTRN> (XML)
  // ou <STMTTRN> ... <STMTTRN> (SGML — próximo início = fim do anterior)
  const transacoes: OFXTransacao[] = []

  // Estratégia universal: fatia o texto em blocos por <STMTTRN>
  const blocos = text.split(/<STMTTRN>/i).slice(1)

  for (const bloco of blocos) {
    // Pega até o fechamento </STMTTRN> ou o próximo início de tag principal
    const corpo = bloco.split(/<\/STMTTRN>/i)[0]

    const fitid     = tag(corpo, 'FITID')
    const dtposted  = tag(corpo, 'DTPOSTED')
    const trnamt    = tag(corpo, 'TRNAMT')
    const trntype   = tag(corpo, 'TRNTYPE').toUpperCase()
    const memo      = tag(corpo, 'MEMO') || tag(corpo, 'NAME') || ''

    if (!fitid || !dtposted || !trnamt) continue

    const valorRaw = parseFloat(trnamt.replace(',', '.'))
    if (isNaN(valorRaw) || valorRaw === 0) continue

    // Tipo: pelo TRNTYPE ou pelo sinal do valor
    let tipo: 'C' | 'D'
    if (trntype === 'CREDIT') {
      tipo = 'C'
    } else if (trntype === 'DEBIT') {
      tipo = 'D'
    } else {
      tipo = valorRaw >= 0 ? 'C' : 'D'
    }

    const valor = Math.abs(valorRaw)
    const data  = parseDataOFX(dtposted)

    transacoes.push({
      fitid,
      data,
      descricao: memo.trim(),
      valor,
      tipo,
      banco,
      conta,
      sugestaoTipo:      tipo === 'C' ? 'RECEBER' : 'PAGAR',
      sugestaoCategoria: sugerirCategoria(memo, tipo),
    })
  }

  // Ordena por data
  transacoes.sort((a, b) => a.data.localeCompare(b.data))

  const totalEntradas = transacoes.filter(t => t.tipo === 'C').reduce((s, t) => s + t.valor, 0)
  const totalSaidas   = transacoes.filter(t => t.tipo === 'D').reduce((s, t) => s + t.valor, 0)

  return {
    transacoes,
    total: transacoes.length,
    totalEntradas,
    totalSaidas,
    banco,
    conta,
    periodoInicio,
    periodoFim,
  }
}
