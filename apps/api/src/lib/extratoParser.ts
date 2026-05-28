// ═══════════════════════════════════════════════════════════════════
// Parser de Extrato Bancário — Banco Inter e Sicoob
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
  Janeiro: '01', Fevereiro: '02', Março: '03', Abril: '04',
  Maio:    '05', Junho:    '06', Julho: '07', Agosto: '08',
  Setembro:'09', Outubro:  '10', Novembro:'11', Dezembro:'12',
}

// ─── BANCO INTER ──────────────────────────────────────────────────────────────
// Formato texto extraído:
//   "2 de Janeiro de 2026 Saldo do dia: R$ 963,35  Valor  Saldo por transação"
//   "Pagamento efetuado: "CONSTRUCOES ACNT LTDA"  -R$ 980,43  R$ 2.192,95"
//   "Pix enviado: "Cp :01187961-ATOM TECH"        -R$ 750,00  R$ 1.442,95"
//   "Pix recebido: "Cp :60701190-AMARA..."         R$ 895,00  R$ 1.114,96"
// Crédito = valor sem sinal; Débito = valor com -

export function parseInter(text: string): ExtratoTransacao[] {
  const result: ExtratoTransacao[] = []
  const lines = text.split('\n').map(l => l.trim())

  const SKIP = [
    /^Solicitado em/i, /^Atom Tecnologia/i, /^CPF\/CNPJ/i,
    /^Período/i, /^Saldo (total|disponível|bloqueado)/i,
    /^Fale com a gente/i, /^SAC:/i, /^Ouvidoria:/i,
    /^Deficiência/i, /Valor\s+Saldo/i, /^\s*$/,
  ]

  const VALUE_END = /(-R\$\s*[\d.]+,\d{2}|(?<!\S)R\$\s*[\d.]+,\d{2})\s+R\$\s*[\d.]+,\d{2}\s*$/

  let currentDate = ''
  let buffer: string[] = []

  const flush = () => {
    if (!buffer.length || !currentDate) { buffer = []; return }
    const combined = buffer.join(' ').trim()
    const m = combined.match(/^([\s\S]+?)\s+(-R\$\s*[\d.]+,\d{2}|R\$\s*[\d.]+,\d{2})\s+R\$\s*[\d.]+,\d{2}\s*$/)
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
    // Cabeçalho de data: "2 de Janeiro de 2026"
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
// Formato texto extraído (ordem decrescente):
//   "30/01  41 - 3   RESGATE RDC                        R$ 10.032,40C"
//   "30/01  574248   TARIFA COBRANÇA                    R$ 16,00D"
//   "30/01  Pix      PIX EMITIDO OUTRA IF"
//   "Pagamento Pix ***.494.801-** Valor refeicao..."
//   "R$ 360,00D"
//   "30/01           SALDO DO DIA                       R$ 3.204,67C"  ← ignorar
// Crédito = valor termina com C; Débito = valor termina com D

export function parseSicoob(text: string): ExtratoTransacao[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Extrai o ano do cabeçalho: "Periodo: 01/01/2026 - 31/01/2026"
  let ano = new Date().getFullYear()
  const anoM = text.match(/[Pp]er[íi]odo[^:]*:\s*\d{2}\/\d{2}\/(\d{4})/)
  if (anoM) ano = parseInt(anoM[1])

  // Agrupa linhas em blocos que começam com DD/MM
  const blocks: { date: string; lines: string[] }[] = []
  let cur: { date: string; lines: string[] } | null = null

  for (const line of lines) {
    const dm = line.match(/^(\d{2})\/(\d{2})\s+/)
    if (dm) {
      if (cur) blocks.push(cur)
      cur = { date: `${ano}-${dm[2]}-${dm[1]}`, lines: [line] }
    } else if (cur) {
      cur.lines.push(line)
    }
  }
  if (cur) blocks.push(cur)

  const result: ExtratoTransacao[] = []

  for (const block of blocks) {
    const combined = block.lines.join(' ')

    // Ignora linhas de saldo e resumo
    if (/SALDO DO DIA|SALDO ANTERIOR|SALDO BLOQUEADO|^RESUMO|ENCARGOS|OUTRAS INFORMAÇÕES|^INFORMAÇÕES/i.test(combined)) continue

    // Valor: termina com R$ X,XXC ou R$ X,XXD
    const vm = combined.match(/R\$\s*([\d.]+,\d{2})([CD])\s*$/)
    if (!vm) continue

    const valor = parseFloat(vm[1].replace(/\./g, '').replace(',', '.'))
    const tipo = vm[2] as 'C' | 'D'
    if (isNaN(valor) || valor === 0) continue

    // Descrição: remove DD/MM, número de documento e o valor do final
    let desc = combined
      .replace(/R\$\s*[\d.]+,\d{2}[CD]\s*$/, '')   // remove valor
      .replace(/^\d{2}\/\d{2}\s+/, '')               // remove DD/MM
      .replace(/^(\d[\d\s\-]*|Pix)\s+/, '')          // remove doc/Pix
      .trim()

    if (!desc) continue

    result.push({ data: block.date, descricao: desc, valor, tipo, banco: 'SICOOB' })
  }

  return result.sort((a, b) => a.data.localeCompare(b.data))
}

// ─── Auto-detecta forma de pagamento pela descrição ──────────────────────────

export function detectarFormaPagamento(descricao: string, banco: string): string {
  const d = descricao.toLowerCase()
  if (d.includes('pix')) return 'pix'
  if (d.includes('compra') || d.includes('debito') || d.includes('mastercard') || d.includes('visa')) return 'debito'
  if (d.includes('ted') || d.includes('doc') || d.includes('cred.')) return 'ted_doc'
  if (d.includes('boleto') || d.includes('liquidação cobrança') || d.includes('liquidacao cobranca')) return 'boleto'
  return 'pix' // padrão para transferências
}
