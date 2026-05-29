// ═══════════════════════════════════════════════════════════════════
// Parser de Extrato Bancário — Banco Inter e Sicoob
// Testado contra PDFs reais de Janeiro 2026
// ═══════════════════════════════════════════════════════════════════

export interface ExtratoTransacao {
  data: string        // YYYY-MM-DD
  descricao: string
  valor: number       // sempre positivo
  tipo: 'C' | 'D'    // C = crédito/entrada   D = débito/saída
  banco: 'INTER' | 'SICOOB'
}

// ─── Meses em PT-BR ──────────────────────────────────────────────────────────

const MESES: Record<string, string> = {
  Janeiro: '01', Fevereiro: '02', 'Março': '03', Abril: '04',
  Maio:    '05', Junho:    '06', Julho: '07', Agosto: '08',
  Setembro:'09', Outubro:  '10', Novembro:'11', Dezembro:'12',
}

// ─── BANCO INTER ──────────────────────────────────────────────────────────────
// Formato real extraído pelo pdf-parse:
//   "2 de Janeiro de 2026 Saldo do dia: R$ 963,35"
//   "Pagamento efetuado: \"CONSTRUCOES ACNT LTDA\"-R$ 980,43R$ 2.192,95"
//   "Pix recebido: \"Cp :60701190-AMARA NET ZERO\"R$ 895,00R$ 1.114,96"
//   "Pix enviado: \"Cp :00000000-CONSELHO...\nGOIAS\"\n-R$ 108,39R$ 319,96"
//
// Observação importante: NÃO há espaço entre valor e saldo. Ex: "-R$ 980,43R$ 2.192,95"
// Crédito = valor sem sinal; Débito = valor com prefixo -

export function parseInter(text: string): ExtratoTransacao[] {
  const result: ExtratoTransacao[] = []
  const lines = text.split('\n').map(l => l.trim())

  const SKIP = [
    /^Solicitado em/i, /^Atom Tecnologia/i, /^CPF\/CNPJ/i,
    /^Per[íi]odo/i, /^Saldo (total|dispon[íi]vel|bloqueado)/i,
    /^Fale com a gente/i, /^SAC:/i, /^Ouvidoria:/i,
    /^Defici[êe]ncia/i, /Valor\s*Saldo/i, /^\s*$/,
  ]

  // Dois R$ consecutivos sem espaço obrigatório: "-R$ 980,43R$ 2.192,95" ou "R$ 895,00R$ 1.114,96"
  const VALUE_END = /(-R\$\s*[\d.]+,\d{2}|R\$\s*[\d.]+,\d{2})\s*R\$\s*[\d.]+,\d{2}\s*$/

  let currentDate = ''
  let buffer: string[] = []

  const flush = () => {
    if (!buffer.length || !currentDate) { buffer = []; return }
    const combined = buffer.join(' ').trim()
    // Captura: (descrição)(valor)(saldo) — greedy para desc, sem espaço obrigatório entre valores
    const m = combined.match(
      /^([\s\S]+?)\s*(-R\$\s*[\d.]+,\d{2}|R\$\s*[\d.]+,\d{2})\s*R\$\s*[\d.]+,\d{2}\s*$/
    )
    if (m) {
      const valStr = m[2].replace(/[R$\s.]/g, '').replace(',', '.')
      const val = parseFloat(valStr)
      const desc = m[1].trim()
      if (!isNaN(val) && desc && !desc.match(/^(Fale|SAC|Saldo)/i)) {
        result.push({
          data: currentDate,
          descricao: desc,
          valor: Math.abs(val),
          tipo: val < 0 ? 'D' : 'C',
          banco: 'INTER',
        })
      }
    }
    buffer = []
  }

  for (const line of lines) {
    const dm = line.match(/^(\d+) de (\w+) de (\d{4})/)
    if (dm) {
      flush()
      const mes = MESES[dm[2]]
      if (mes) currentDate = `${dm[3]}-${mes}-${dm[1].padStart(2, '0')}`
      continue
    }
    if (SKIP.some(p => p.test(line))) { flush(); continue }
    if (!currentDate) continue

    buffer.push(line)
    if (VALUE_END.test(buffer.join(' '))) flush()
  }
  flush()

  return result.sort((a, b) => a.data.localeCompare(b.data))
}

// ─── SICOOB ───────────────────────────────────────────────────────────────────
// Formato real extraído pelo pdf-parse (sem espaço entre DD/MM e doc/hist):
//   "30/0141 - 3RESGATE RDC"          → header numa linha
//   "R$ 10.032,40C"                   → valor numa linha separada
//   "30/01574248TARIFA COBRANÇA"
//   "R$ 16,00D"
//   "30/01PixPIX EMITIDO OUTRA IF"    → PIX pode ter 1-3 linhas de descrição
//   "Pagamento Pix ***.494.801-** ..."
//   "R$ 360,00D"
//   "30/01SALDO DO DIA"               → ignorar
//   "R$ 3.204,67C"
//
// Estratégia: bloco inicia em qualquer linha DD/MM; encerra na linha R$ X,XXC/D

export function parseSicoob(text: string): ExtratoTransacao[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Ano vem do cabeçalho "Periodo:01/01/2026 - 31/01/2026"
  let ano = new Date().getFullYear()
  const anoM = text.match(/[Pp]er[íi]odo[^:]*:\s*\d{2}\/\d{2}\/(\d{4})/)
  if (anoM) ano = parseInt(anoM[1])

  const result: ExtratoTransacao[] = []
  let blockDate = ''
  let blockLines: string[] = []

  // Linha de valor: R$ X,XXC ou R$ X,XXD (sem espaço antes do C/D)
  const VALUE_RE = /R\$\s*([\d.]+,\d{2})([CD])\s*$/

  // Descrições que devem ser ignoradas
  const SKIP_DESC = /SALDO DO DIA|SALDO ANTERIOR|SALDO BLOQUEADO|^RESUMO|ENCARGOS|OUTRAS INFORMA/i

  const flushBlock = () => {
    if (!blockDate || !blockLines.length) { blockDate = ''; blockLines = []; return }

    // Linha de valor é a primeira linha que termina com R$ X,XXC/D
    const valueLine = blockLines.find(l => VALUE_RE.test(l))
    if (!valueLine) { blockDate = ''; blockLines = []; return }

    const vm = valueLine.match(VALUE_RE)!
    const valor = parseFloat(vm[1].replace(/\./g, '').replace(',', '.'))
    const tipo = vm[2] as 'C' | 'D'
    if (isNaN(valor) || valor === 0) { blockDate = ''; blockLines = []; return }

    // Descrição: header (sem DD/MM e sem número de doc) + linhas de continuação
    let headerRest = blockLines[0]
      .replace(/^\d{2}\/\d{2}/, '')                  // remove DD/MM
      .replace(/^(\d[\d\s\-]*|Pix)\s*/i, '')          // remove doc/Pix prefix
      .trim()

    const contLines = blockLines.slice(1).filter(l => l !== valueLine)
    const desc = contLines.length > 0
      ? (headerRest + ' ' + contLines.join(' ')).trim()
      : headerRest

    if (!desc || SKIP_DESC.test(desc)) { blockDate = ''; blockLines = []; return }

    result.push({ data: blockDate, descricao: desc, valor, tipo, banco: 'SICOOB' })
    blockDate = ''
    blockLines = []
  }

  for (const line of lines) {
    if (/^\d{2}\/\d{2}/.test(line)) {
      flushBlock()
      const dm = line.match(/^(\d{2})\/(\d{2})/)!
      blockDate = `${ano}-${dm[2]}-${dm[1]}`
      blockLines = [line]
      // Transação de linha única (valor e tipo na mesma linha do header)
      if (VALUE_RE.test(line)) flushBlock()
    } else if (blockDate) {
      blockLines.push(line)
      if (VALUE_RE.test(line)) flushBlock()
    }
    // Linhas antes do primeiro DD/MM (cabeçalho, rodapé) são ignoradas
  }
  flushBlock()

  return result.sort((a, b) => a.data.localeCompare(b.data))
}

// ─── Auto-detecta forma de pagamento pela descrição ──────────────────────────

export function detectarFormaPagamento(descricao: string, banco: string): string {
  const d = descricao.toLowerCase()
  if (d.includes('pix')) return 'pix'
  if (d.includes('compra') || d.includes('debito') || d.includes('mastercard') || d.includes('visa')) return 'debito'
  if (d.includes('ted') || d.includes('doc') || d.includes('cred.')) return 'ted_doc'
  if (d.includes('boleto') || d.includes('liquidação cobrança') || d.includes('liquidacao cobranca')) return 'boleto'
  return 'pix'
}
