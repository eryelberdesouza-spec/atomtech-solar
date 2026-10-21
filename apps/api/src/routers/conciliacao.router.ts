// ═══════════════════════════════════════════════════════════════════
// Conciliação bancária (AGF) — trpc.fin.conciliacao.*
// ═══════════════════════════════════════════════════════════════════
// O extrato é a fonte da verdade: cada linha importada fica em
// fin_extrato_linha e só sai da fila quando ligada ao AGF (fin_conciliacao)
// ou ignorada. A ligação é N:N:
//   • 1 linha → 1 parcela        (caso normal)
//   • 1 linha → várias parcelas  (1 PIX pagando duas parcelas; boletos do
//                                 Sicoob somados num único crédito)
//   • várias linhas → 1 parcela  (cliente com limite diário de PIX)
// Valor menor que a parcela: ou divide (o resto fica em aberto) ou quita com a
// diferença como desconto/retenção. Importar NUNCA cria lançamento sozinho —
// era assim que o mesmo dinheiro entrava duas vezes (baixa manual + extrato).
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, getRawPool } from './trpc'
import { parseOFX } from '../lib/ofxParser'
import { registrarAuditoria, verificarPeriodoAberto } from '../lib/finHelpers'
import { calcularSaldos } from '../lib/finSaldo'

const r2 = (n: number) => Math.round(n * 100) / 100
const eq = (a: number, b: number) => Math.abs(a - b) < 0.005
const dias = (a: string, b: string) => Math.abs((Date.parse(a) - Date.parse(b)) / 86_400_000)
const somaDias = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10)
const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const digitos = (s: string) => (s || '').replace(/\D/g, '')

const BANCO_POR_ID: Record<string, string> = { '077': 'INTER', '756': 'SICOOB' }
const NOMES_COMUNS = new Set(['MARIA', 'JOSE', 'JOAO', 'ANA', 'SILVA', 'SOUZA', 'SANTOS', 'OLIVEIRA', 'PEREIRA', 'COSTA', 'DA', 'DE', 'DOS', 'DAS', 'DO', 'LTDA', 'ME', 'EIRELI', 'SA'])

function formaPorDescricao(d: string): string {
  const x = d.toLowerCase()
  if (x.includes('cobran') || x.includes('boleto')) return 'boleto'
  if (x.includes('debit') || x.includes('compra no deb') || x.includes('mastercard')) return 'debito'
  if (x.includes('ted') || x.includes('doc ')) return 'ted_doc'
  return 'pix'
}

/** Nome (ou CNPJ) de quem pagou/recebeu, tirado da descrição do extrato. */
export function extrairContraparte(desc: string): string {
  let s = desc
  if (s.includes(' — ')) s = s.split(' — ').slice(1).join(' ')
  const cp = desc.match(/Cp :\d+-([^"]+)/)
  if (cp) s = cp[1]
  s = s.replace(/^(Recebimento|Pagamento) Pix\s+/i, '')
  return norm(s).slice(0, 60)
}

type Pessoa = { id: number; nome: string; doc: string; tokens: string[] }
function pessoasNaDescricao(desc: string, pessoas: Pessoa[], aliases: { pessoaId: number; alias: string }[]): Set<number> {
  const d = norm(desc)
  const achadas = new Set<number>()
  for (const a of aliases) if (a.alias && d.includes(a.alias)) achadas.add(a.pessoaId)
  // CNPJ/CPF completo ("17.302.990 0001-15") ou CPF mascarado do Sicoob ("***.204.431-**")
  const docs = (desc.match(/\d[\d.\-\/ ]{9,}\d/g) || []).map(digitos).filter(x => x.length === 11 || x.length === 14)
  const meioCpf = [...desc.matchAll(/\*\*\*\.(\d{3})\.(\d{3})-\*\*/g)].map(m => m[1] + m[2])
  for (const p of pessoas) {
    if (p.doc && (docs.includes(p.doc) || (p.doc.length === 11 && meioCpf.includes(p.doc.slice(3, 9))))) { achadas.add(p.id); continue }
    const fortes = p.tokens.filter(t => !NOMES_COMUNS.has(t))
    const presentes = p.tokens.filter(t => d.includes(t))
    if (presentes.length >= 2 && fortes.some(t => d.includes(t))) achadas.add(p.id)
  }
  return achadas
}

async function carregarLinhas(empresaId: number, ids: number[]) {
  const pool = getRawPool()
  const [rows]: any = await pool.query(
    `SELECT id, conta_id AS contaId, fitid, DATE_FORMAT(data, '%Y-%m-%d') AS data, valor, descricao, status
     FROM fin_extrato_linha WHERE empresa_id = ? AND id IN (?)`,
    [empresaId, ids],
  )
  const linhas = (rows as any[]).map(r => ({ ...r, valor: Number(r.valor) }))
  if (linhas.length !== ids.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Linha do extrato não encontrada' })
  return linhas
}

async function saldoBancoAgf(empresaId: number) {
  const pool = getRawPool()
  const [lotes]: any = await pool.query(
    `SELECT l.conta_id AS contaId, l.saldo_banco AS saldoBanco, DATE_FORMAT(l.data_saldo, '%Y-%m-%d') AS dataSaldo
     FROM fin_extrato_lote l
     JOIN (SELECT conta_id, MAX(data_saldo) AS ds FROM fin_extrato_lote WHERE empresa_id = ? AND saldo_banco IS NOT NULL GROUP BY conta_id) u
       ON u.conta_id = l.conta_id AND u.ds = l.data_saldo
     WHERE l.empresa_id = ? AND l.saldo_banco IS NOT NULL
     ORDER BY l.id DESC`,
    [empresaId, empresaId],
  )
  const porConta = new Map<number, { saldoBanco: number; dataSaldo: string; saldoAgf: number }>()
  for (const l of lotes as any[]) {
    if (porConta.has(l.contaId)) continue
    const { contas } = await calcularSaldos(empresaId, l.dataSaldo)
    const agf = contas.find(c => c.contaId === l.contaId)?.saldo ?? 0
    porConta.set(l.contaId, { saldoBanco: Number(l.saldoBanco), dataSaldo: l.dataSaldo, saldoAgf: agf })
  }
  return porConta
}

const itemConciliacao = z.object({
  parcelaId: z.number().int().positive(),
  valor:     z.number().positive(),
  // Valor menor que a parcela: true = quita e a diferença vira desconto/retenção;
  // false = divide a parcela e o restante continua em aberto.
  quitar:    z.boolean().default(false),
})

export const conciliacaoRouter = router({
  // ── Contas + saúde (saldo do banco × saldo do AGF) ──────────────────────
  contas: protectedProcedure.query(async ({ ctx }) => {
    const empId = ctx.usuario.empresaId
    const pool = getRawPool()
    const { contas, semConta } = await calcularSaldos(empId)
    const [pend]: any = await pool.query(
      `SELECT conta_id AS contaId, COUNT(*) AS n, MIN(DATE_FORMAT(data, '%Y-%m-%d')) AS desde
       FROM fin_extrato_linha WHERE empresa_id = ? AND status = 'pendente' GROUP BY conta_id`,
      [empId],
    )
    const saude = await saldoBancoAgf(empId)
    return {
      semConta,
      contas: contas.map(c => {
        const p = (pend as any[]).find(x => x.contaId === c.contaId)
        const s = saude.get(c.contaId)
        return {
          ...c,
          pendentes: Number(p?.n ?? 0),
          pendentesDesde: p?.desde ?? null,
          banco: s ? { saldo: s.saldoBanco, data: s.dataSaldo, saldoAgf: s.saldoAgf, diferenca: r2(s.saldoAgf - s.saldoBanco) } : null,
        }
      }),
    }
  }),

  // ── Importar OFX: vira fila, não lançamento ──────────────────────────────
  importar: protectedProcedure
    .input(z.object({
      contaId:        z.number().int().positive(),
      arquivo:        z.string().max(200).optional(),
      conteudoBase64: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId
      const pool = getRawPool()
      const [cRows]: any = await pool.query(`SELECT id, nome, banco FROM fin_conta_bancaria WHERE id = ? AND empresa_id = ? LIMIT 1`, [input.contaId, empId])
      const conta = (cRows as any[])[0]
      if (!conta) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta não encontrada' })

      const ofx = parseOFX(Buffer.from(input.conteudoBase64, 'base64').toString('latin1'))
      if (!ofx.total) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nenhuma transação no arquivo. Confira se é um OFX válido.' })
      // Trava de conta errada: era uma das fontes de "conta trocada".
      const bancoArq = BANCO_POR_ID[ofx.bancoId]
      const bancoConta = norm(`${conta.banco ?? ''} ${conta.nome ?? ''}`)
      if (bancoArq && !bancoConta.includes(bancoArq)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Este arquivo é do ${bancoArq}, mas a conta escolhida é ${conta.nome}.` })
      }

      const [lote]: any = await pool.query(
        `INSERT INTO fin_extrato_lote (empresa_id, conta_id, arquivo, periodo_ini, periodo_fim, saldo_banco, data_saldo, total_linhas, usuario_nome)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [empId, input.contaId, input.arquivo ?? null, ofx.periodoInicio || null, ofx.periodoFim || null, ofx.saldoBanco, ofx.dataSaldo, ofx.total, ctx.usuario.nome],
      )
      const loteId = (lote as any).insertId
      let novas = 0
      for (const t of ofx.transacoes) {
        const [ins]: any = await pool.query(
          `INSERT IGNORE INTO fin_extrato_linha (empresa_id, conta_id, lote_id, fitid, data, valor, descricao)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [empId, input.contaId, loteId, t.fitid, t.data, t.tipo === 'C' ? t.valor : -t.valor, t.descricao.slice(0, 500)],
        )
        novas += (ins as any).affectedRows
      }
      await pool.query(`UPDATE fin_extrato_lote SET novas_linhas = ? WHERE id = ?`, [novas, loteId])

      // Linhas que já tinham virado lançamento pelo importador antigo (o FITID
      // ficou gravado na parcela) entram conciliadas automaticamente.
      const [legado]: any = await pool.query(
        `SELECT l.id AS linhaId, l.valor, p.id AS parcelaId, p.conta_id AS parcelaConta
         FROM fin_extrato_linha l
         JOIN fin_parcela p ON p.extrato_fingerprint = l.fitid AND p.status = 'PAGA'
         JOIN fin_titulo t ON t.id = p.titulo_id AND t.empresa_id = l.empresa_id AND t.ativo = 1
         WHERE l.empresa_id = ? AND l.conta_id = ? AND l.status = 'pendente'
           AND ABS(ABS(l.valor) - p.valor_pago) < 0.01
           AND (p.conta_id = l.conta_id OR p.conta_id IS NULL)
           AND NOT EXISTS (SELECT 1 FROM fin_conciliacao c WHERE c.parcela_id = p.id)`,
        [empId, input.contaId],
      )
      let auto = 0
      const usadas = new Set<number>()
      for (const g of legado as any[]) {
        if (usadas.has(g.linhaId)) continue
        usadas.add(g.linhaId)
        if (g.parcelaConta == null) await pool.query(`UPDATE fin_parcela SET conta_id = ? WHERE id = ?`, [input.contaId, g.parcelaId])
        await pool.query(`INSERT INTO fin_conciliacao (empresa_id, linha_id, parcela_id, valor, usuario_nome) VALUES (?, ?, ?, ?, 'automático (importação anterior)')`,
          [empId, g.linhaId, g.parcelaId, g.valor])
        await pool.query(`UPDATE fin_extrato_linha SET status = 'conciliado', conciliado_por_nome = 'automático', conciliado_em = ? WHERE id = ?`, [new Date(), g.linhaId])
        auto++
      }

      let saldo: null | { banco: number; data: string; agf: number; diferenca: number } = null
      if (ofx.saldoBanco != null && ofx.dataSaldo) {
        const { contas } = await calcularSaldos(empId, ofx.dataSaldo)
        const agf = contas.find(c => c.contaId === input.contaId)?.saldo ?? 0
        saldo = { banco: ofx.saldoBanco, data: ofx.dataSaldo, agf, diferenca: r2(agf - ofx.saldoBanco) }
      }
      return { total: ofx.total, novas, repetidas: ofx.total - novas, autoConciliadas: auto, saldo }
    }),

  // ── Fila com sugestões ────────────────────────────────────────────────────
  fila: protectedProcedure
    .input(z.object({
      contaId: z.number().int().positive(),
      status:  z.enum(['pendente', 'conciliado', 'ignorado']).default('pendente'),
      limite:  z.number().int().min(1).max(600).default(150),
      // Texto (descrição) ou valor ("3250", "3.250,00")
      busca:   z.string().trim().max(100).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId
      const pool = getRawPool()
      const filtros: string[] = []
      const params: any[] = [empId, input.contaId, input.status]
      if (input.busca) {
        const num = Number(input.busca.replace(/\./g, '').replace(',', '.'))
        if (!Number.isNaN(num) && /\d/.test(input.busca)) { filtros.push('(ABS(ABS(valor) - ?) < 0.01 OR descricao LIKE ?)'); params.push(Math.abs(num), `%${input.busca}%`) }
        else { filtros.push('descricao LIKE ?'); params.push(`%${input.busca}%`) }
      }
      const where = `empresa_id = ? AND conta_id = ? AND status = ?${filtros.map(f => ' AND ' + f).join('')}`
      const [cnt]: any = await pool.query(`SELECT COUNT(*) AS n FROM fin_extrato_linha WHERE ${where}`, params)
      const total = Number((cnt as any[])[0]?.n ?? 0)
      const [lRows]: any = await pool.query(
        `SELECT id, conta_id AS contaId, fitid, DATE_FORMAT(data, '%Y-%m-%d') AS data, valor, descricao, status, observacao, conciliado_por_nome AS conciliadoPor
         FROM fin_extrato_linha WHERE ${where}
         ORDER BY data ${input.status === 'pendente' ? 'ASC' : 'DESC'}, id LIMIT ?`,
        [...params, input.limite],
      )
      const linhas = (lRows as any[]).map(r => ({ ...r, valor: Number(r.valor) }))
      if (input.status !== 'pendente') {
        if (!linhas.length) return { linhas: [], total }
        const [lig]: any = await pool.query(
          `SELECT c.linha_id AS linhaId, c.valor, c.parcela_id AS parcelaId, c.transferencia_id AS transferenciaId, t.descricao
           FROM fin_conciliacao c LEFT JOIN fin_parcela p ON p.id = c.parcela_id LEFT JOIN fin_titulo t ON t.id = p.titulo_id
           WHERE c.linha_id IN (?)`, [linhas.map(l => l.id)],
        )
        return { linhas: linhas.map(l => ({ ...l, ligacoes: (lig as any[]).filter(x => x.linhaId === l.id), sugestoes: [] })), total }
      }
      if (!linhas.length) return { linhas: [], total }

      const ini = somaDias(linhas[0].data, -120), fim = somaDias(linhas[linhas.length - 1].data, 120)
      const [abertas]: any = await pool.query(
        `SELECT p.id, p.numero, p.valor, DATE_FORMAT(p.vencimento, '%Y-%m-%d') AS venc, t.tipo, t.descricao, t.pessoa_id AS pessoaId,
                pe.nome AS pessoaNome, (SELECT COUNT(*) FROM fin_parcela x WHERE x.titulo_id = t.id) AS nParcelas
         FROM fin_parcela p JOIN fin_titulo t ON t.id = p.titulo_id LEFT JOIN fin_pessoa pe ON pe.id = t.pessoa_id
         WHERE t.empresa_id = ? AND t.ativo = 1 AND p.status = 'ABERTA' AND p.vencimento BETWEEN ? AND ?`,
        [empId, ini, fim],
      )
      const [pagasLivres]: any = await pool.query(
        `SELECT p.id, p.numero, p.valor_pago AS valor, DATE_FORMAT(p.data_pagamento, '%Y-%m-%d') AS dataPag, p.conta_id AS contaId,
                t.tipo, t.descricao, t.pessoa_id AS pessoaId, pe.nome AS pessoaNome
         FROM fin_parcela p JOIN fin_titulo t ON t.id = p.titulo_id LEFT JOIN fin_pessoa pe ON pe.id = t.pessoa_id
         WHERE t.empresa_id = ? AND t.ativo = 1 AND p.status = 'PAGA' AND (p.conta_id = ? OR p.conta_id IS NULL)
           AND p.data_pagamento BETWEEN ? AND ?
           AND NOT EXISTS (SELECT 1 FROM fin_conciliacao c WHERE c.parcela_id = p.id)`,
        [empId, input.contaId, somaDias(linhas[0].data, -10), somaDias(linhas[linhas.length - 1].data, 10)],
      )
      const [outras]: any = await pool.query(
        `SELECT l.id, l.conta_id AS contaId, cb.nome AS contaNome, DATE_FORMAT(l.data, '%Y-%m-%d') AS data, l.valor, l.descricao
         FROM fin_extrato_linha l JOIN fin_conta_bancaria cb ON cb.id = l.conta_id
         WHERE l.empresa_id = ? AND l.conta_id <> ? AND l.status = 'pendente' AND l.data BETWEEN ? AND ?`,
        [empId, input.contaId, somaDias(linhas[0].data, -3), somaDias(linhas[linhas.length - 1].data, 3)],
      )
      const [pRows]: any = await pool.query(`SELECT id, nome, cpf_cnpj FROM fin_pessoa WHERE empresa_id = ?`, [empId])
      const pessoas: Pessoa[] = (pRows as any[]).map(p => ({ id: p.id, nome: p.nome, doc: digitos(p.cpf_cnpj ?? ''), tokens: norm(p.nome).split(' ').filter(t => t.length >= 3) }))
      const [aRows]: any = await pool.query(`SELECT pessoa_id AS pessoaId, alias FROM fin_pessoa_alias WHERE empresa_id = ?`, [empId])
      const [regras]: any = await pool.query(
        `SELECT r.id, r.padrao, r.sinal, r.plano_contas_id AS planoContasId, r.centro_custo_id AS centroCustoId, r.pessoa_id AS pessoaId, r.descricao, pc.nome AS planoNome
         FROM fin_extrato_regra r LEFT JOIN fin_plano_contas pc ON pc.id = r.plano_contas_id
         WHERE r.empresa_id = ? AND r.ativo = 1`, [empId],
      )
      const A = (abertas as any[]).map(a => ({ ...a, valor: Number(a.valor) }))
      const P = (pagasLivres as any[]).map(a => ({ ...a, valor: Number(a.valor) }))
      const O = (outras as any[]).map(a => ({ ...a, valor: Number(a.valor) }))
      const rotulo = (x: any) => `${x.descricao}${x.nParcelas > 1 ? ` — parc. ${x.numero}` : ''}`

      const resultado = linhas.map(l => {
        const tipo = l.valor > 0 ? 'RECEBER' : 'PAGAR'
        const v = Math.abs(l.valor)
        const quem = pessoasNaDescricao(l.descricao, pessoas, aRows as any[])
        const sug: any[] = []

        for (const p of P.filter(p => p.tipo === tipo && eq(p.valor, v) && dias(p.dataPag, l.data) <= 5)) {
          const notas = [p.contaId == null ? 'sem conta — será definida' : '', p.dataPag !== l.data ? `data será corrigida de ${p.dataPag} para ${l.data}` : ''].filter(Boolean)
          sug.push({ tipo: 'ja_baixado', score: 100 - dias(p.dataPag, l.data) * 4 + (quem.has(p.pessoaId) ? 10 : 0),
            titulo: `Já baixado no AGF: ${rotulo(p)}`, detalhe: notas.join(' · '), itens: [{ parcelaId: p.id, valor: v, quitar: false }] })
        }
        for (const a of A.filter(a => a.tipo === tipo && eq(a.valor, v) && dias(a.venc, l.data) <= 60)) {
          sug.push({ tipo: 'aberta', score: 80 - dias(a.venc, l.data) / 3 + (quem.has(a.pessoaId) ? 15 : 0),
            titulo: `Baixar: ${rotulo(a)}`, detalhe: `vence ${a.venc}${a.pessoaNome ? ' · ' + a.pessoaNome : ''}`, itens: [{ parcelaId: a.id, valor: v, quitar: false }] })
        }
        for (const a of A.filter(a => a.tipo === tipo && quem.has(a.pessoaId) && a.valor > v + 0.005)) {
          const resto = r2(a.valor - v)
          if (v >= a.valor * 0.85) {
            sug.push({ tipo: 'retencao', score: 68, titulo: `Quitar ${rotulo(a)} com diferença`,
              detalhe: `recebido ${v.toFixed(2)} de ${a.valor.toFixed(2)} — R$ ${resto.toFixed(2)} como retenção/desconto`, itens: [{ parcelaId: a.id, valor: v, quitar: true }] })
          }
          sug.push({ tipo: 'parcial', score: 62, titulo: `Recebimento parcial: ${rotulo(a)}`,
            detalhe: `R$ ${resto.toFixed(2)} continua em aberto`, itens: [{ parcelaId: a.id, valor: v, quitar: false }] })
        }
        // Combinação de 2–3 parcelas da mesma pessoa (ou vencendo perto)
        const cand = A.filter(a => a.tipo === tipo && a.valor < v && (quem.has(a.pessoaId) || dias(a.venc, l.data) <= 15)).slice(0, 40)
        let combo: any[] | null = null
        for (let i = 0; i < cand.length && !combo; i++) for (let j = i + 1; j < cand.length && !combo; j++) {
          if (eq(cand[i].valor + cand[j].valor, v)) combo = [cand[i], cand[j]]
          else for (let k = j + 1; k < cand.length && !combo; k++) if (eq(cand[i].valor + cand[j].valor + cand[k].valor, v)) combo = [cand[i], cand[j], cand[k]]
        }
        if (combo) sug.push({ tipo: 'combinacao', score: 72 + (combo.every(c => quem.has(c.pessoaId)) ? 10 : 0),
          titulo: `Uma entrada, ${combo.length} parcelas`, detalhe: combo.map(c => `${rotulo(c)} (${c.valor.toFixed(2)})`).join(' + '),
          itens: combo.map(c => ({ parcelaId: c.id, valor: c.valor, quitar: false })) })
        // Duas linhas do extrato somando uma parcela (limite diário de PIX)
        for (const l2 of linhas.filter(x => x.id !== l.id && Math.sign(x.valor) === Math.sign(l.valor) && dias(x.data, l.data) <= 5)) {
          const total = v + Math.abs(l2.valor)
          for (const a of A.filter(a => a.tipo === tipo && eq(a.valor, total))) {
            sug.push({ tipo: 'varias_linhas', score: 74 + (quem.has(a.pessoaId) ? 12 : 0), titulo: `Junto com ${l2.data} (R$ ${Math.abs(l2.valor).toFixed(2)}): ${rotulo(a)}`,
              detalhe: 'duas entradas pagando a mesma parcela', linhaIds: [l.id, l2.id], itens: [{ parcelaId: a.id, valor: total, quitar: false }] })
          }
        }
        for (const o of O.filter(o => eq(o.valor, -l.valor) && dias(o.data, l.data) <= 3)) {
          const propria = /MESMA TIT|ATOM TEC|ATOM TECH/i.test(l.descricao + ' ' + o.descricao)
          sug.push({ tipo: 'transferencia', score: propria ? 92 : 70, titulo: `Transferência ${l.valor < 0 ? 'para' : 'de'} ${o.contaNome}`,
            detalhe: `${o.data} · ${o.descricao}`, linhaParId: o.id })
        }
        const dN = norm(l.descricao)
        for (const rg of (regras as any[]).filter(rg => rg.sinal === (l.valor > 0 ? 'C' : 'D') && dN.includes(norm(rg.padrao)))) {
          sug.push({ tipo: 'regra', score: 86, titulo: `Lançar como ${rg.descricao || rg.planoNome || rg.padrao}`,
            detalhe: rg.planoNome ? `plano: ${rg.planoNome}` : 'regra sem plano de contas', regra: rg })
        }
        sug.sort((x, y) => y.score - x.score)
        const pessoaId = quem.size === 1 ? [...quem][0] : null
        return { ...l, contraparte: extrairContraparte(l.descricao), pessoaSugerida: pessoaId ? pessoas.find(p => p.id === pessoaId)?.nome ?? null : null,
          pessoaSugeridaId: pessoaId, sugestoes: sug.slice(0, 5) }
      })
      return { linhas: resultado, total }
    }),

  // ── Busca manual de parcelas para alocar ────────────────────────────────
  buscarParcelas: protectedProcedure
    .input(z.object({
      tipo:   z.enum(['RECEBER', 'PAGAR']),
      contaId: z.number().int().positive(),
      termo:  z.string().max(100).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const pool = getRawPool()
      const termo = input.termo?.trim() ? `%${input.termo.trim()}%` : null
      const [rows]: any = await pool.query(
        `SELECT p.id, p.numero, p.valor, p.status, p.valor_pago AS valorPago, DATE_FORMAT(p.vencimento, '%Y-%m-%d') AS venc,
                DATE_FORMAT(p.data_pagamento, '%Y-%m-%d') AS dataPag, p.conta_id AS contaId, t.descricao, pe.nome AS pessoaNome
         FROM fin_parcela p JOIN fin_titulo t ON t.id = p.titulo_id LEFT JOIN fin_pessoa pe ON pe.id = t.pessoa_id
         WHERE t.empresa_id = ? AND t.ativo = 1 AND t.tipo = ?
           AND (p.status = 'ABERTA' OR (p.status = 'PAGA' AND (p.conta_id = ? OR p.conta_id IS NULL)
                AND NOT EXISTS (SELECT 1 FROM fin_conciliacao c WHERE c.parcela_id = p.id)))
           ${termo ? 'AND (t.descricao LIKE ? OR pe.nome LIKE ? OR CAST(p.valor AS CHAR) LIKE ?)' : ''}
         ORDER BY p.status = 'ABERTA' DESC, p.vencimento DESC LIMIT 60`,
        termo ? [ctx.usuario.empresaId, input.tipo, input.contaId, termo, termo, termo] : [ctx.usuario.empresaId, input.tipo, input.contaId],
      )
      return (rows as any[]).map(r => ({ ...r, valor: Number(r.valor), valorPago: r.valorPago != null ? Number(r.valorPago) : null }))
    }),

  // ── Conciliar (N:N) ───────────────────────────────────────────────────────
  conciliar: protectedProcedure
    .input(z.object({
      linhaIds:     z.array(z.number().int().positive()).min(1),
      itens:        z.array(itemConciliacao).min(1),
      salvarApelido: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId
      const linhas = await carregarLinhas(empId, input.linhaIds)
      if (linhas.some(l => l.status !== 'pendente')) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Há linha já conciliada ou ignorada na seleção.' })
      if (new Set(linhas.map(l => l.contaId)).size > 1) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selecione linhas de uma única conta.' })
      const sinal = Math.sign(linhas[0].valor)
      if (linhas.some(l => Math.sign(l.valor) !== sinal)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não misture entradas e saídas na mesma conciliação.' })
      const totalLinhas = r2(linhas.reduce((s, l) => s + Math.abs(l.valor), 0))
      const totalItens = r2(input.itens.reduce((s, i) => s + i.valor, 0))
      if (!eq(totalLinhas, totalItens)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `O extrato soma R$ ${totalLinhas.toFixed(2)} e as parcelas R$ ${totalItens.toFixed(2)} — os valores precisam bater.` })
      }
      const contaId = linhas[0].contaId
      const dataPag = linhas.map(l => l.data).sort().pop()!
      await verificarPeriodoAberto(ctx.db, empId, dataPag)
      const tipoEsperado = sinal > 0 ? 'RECEBER' : 'PAGAR'
      const forma = formaPorDescricao(linhas[0].descricao)
      const fitid = linhas[0].fitid

      const conn = await getRawPool().getConnection()
      const pessoasEnvolvidas = new Set<number>()
      try {
        await conn.beginTransaction()
        for (const it of input.itens) {
          const [pr]: any = await conn.query(
            `SELECT p.id, p.titulo_id AS tituloId, p.numero, p.valor, p.status, p.valor_pago AS valorPago, DATE_FORMAT(p.vencimento, '%Y-%m-%d') AS venc,
                    t.tipo, t.pessoa_id AS pessoaId
             FROM fin_parcela p JOIN fin_titulo t ON t.id = p.titulo_id
             WHERE p.id = ? AND t.empresa_id = ? AND t.ativo = 1 FOR UPDATE`, [it.parcelaId, empId],
          )
          const p = (pr as any[])[0]
          if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: `Parcela ${it.parcelaId} não encontrada` })
          if (p.tipo !== tipoEsperado) throw new TRPCError({ code: 'BAD_REQUEST', message: `A parcela ${it.parcelaId} é de ${p.tipo === 'RECEBER' ? 'recebimento' : 'pagamento'}, mas o extrato é ${sinal > 0 ? 'entrada' : 'saída'}.` })
          if (p.pessoaId) pessoasEnvolvidas.add(p.pessoaId)
          const valorParc = Number(p.valor)

          if (p.status === 'PAGA') {
            // Baixa manual já existente: só vincula (e corrige conta/data) — sem novo lançamento.
            const [ja]: any = await conn.query(`SELECT id FROM fin_conciliacao WHERE parcela_id = ? LIMIT 1`, [p.id])
            if ((ja as any[]).length) throw new TRPCError({ code: 'BAD_REQUEST', message: `A parcela ${p.id} já está conciliada com outra linha do extrato.` })
            if (!eq(Number(p.valorPago), it.valor)) throw new TRPCError({ code: 'BAD_REQUEST', message: `A parcela ${p.id} foi baixada por R$ ${Number(p.valorPago).toFixed(2)}, diferente do valor alocado.` })
            await conn.query(
              `UPDATE fin_parcela SET conta_id = ?, data_pagamento = ?, extrato_fingerprint = COALESCE(extrato_fingerprint, ?) WHERE id = ?`,
              [contaId, dataPag, fitid, p.id],
            )
          } else if (p.status === 'ABERTA') {
            if (it.valor >= valorParc - 0.005) {
              await conn.query(
                `UPDATE fin_parcela SET status = 'PAGA', conta_id = ?, data_pagamento = ?, valor_pago = ?, juros = ?, multa = 0, desconto = 0,
                        forma_pagamento = ?, extrato_fingerprint = ? WHERE id = ?`,
                [contaId, dataPag, it.valor.toFixed(2), Math.max(0, r2(it.valor - valorParc)).toFixed(2), forma, fitid, p.id],
              )
            } else if (it.quitar) {
              await conn.query(
                `UPDATE fin_parcela SET status = 'PAGA', conta_id = ?, data_pagamento = ?, valor_pago = ?, juros = 0, multa = 0, desconto = ?,
                        forma_pagamento = ?, extrato_fingerprint = ? WHERE id = ?`,
                [contaId, dataPag, it.valor.toFixed(2), r2(valorParc - it.valor).toFixed(2), forma, fitid, p.id],
              )
            } else {
              // Baixa parcial: a parcela fica com o valor recebido (paga) e o
              // restante vira nova parcela em aberto no mesmo título/vencimento.
              await conn.query(
                `UPDATE fin_parcela SET valor = ?, status = 'PAGA', conta_id = ?, data_pagamento = ?, valor_pago = ?, juros = 0, multa = 0, desconto = 0,
                        forma_pagamento = ?, extrato_fingerprint = ? WHERE id = ?`,
                [it.valor.toFixed(2), contaId, dataPag, it.valor.toFixed(2), forma, fitid, p.id],
              )
              await conn.query(
                `INSERT INTO fin_parcela (titulo_id, numero, valor, vencimento, status) VALUES (?, ?, ?, ?, 'ABERTA')`,
                [p.tituloId, p.numero, r2(valorParc - it.valor).toFixed(2), p.venc],
              )
            }
          } else {
            throw new TRPCError({ code: 'BAD_REQUEST', message: `A parcela ${p.id} está cancelada.` })
          }
        }

        // Distribui os valores entre linhas e parcelas (greedy) para o vínculo N:N.
        const filaLinhas = linhas.map(l => ({ id: l.id, resta: Math.abs(l.valor) }))
        for (const it of input.itens) {
          let falta = it.valor
          for (const fl of filaLinhas) {
            if (falta < 0.005) break
            if (fl.resta < 0.005) continue
            const parte = r2(Math.min(fl.resta, falta))
            await conn.query(`INSERT INTO fin_conciliacao (empresa_id, linha_id, parcela_id, valor, usuario_nome) VALUES (?, ?, ?, ?, ?)`,
              [empId, fl.id, it.parcelaId, (parte * sinal).toFixed(2), ctx.usuario.nome])
            fl.resta = r2(fl.resta - parte); falta = r2(falta - parte)
          }
        }
        await conn.query(`UPDATE fin_extrato_linha SET status = 'conciliado', conciliado_por_nome = ?, conciliado_em = ? WHERE id IN (?)`,
          [ctx.usuario.nome, new Date(), input.linhaIds])

        // Aprende quem é o pagador: da próxima vez a sugestão já vem com a pessoa.
        if (input.salvarApelido && pessoasEnvolvidas.size === 1) {
          const pessoaId = [...pessoasEnvolvidas][0]
          for (const l of linhas) {
            const ap = extrairContraparte(l.descricao)
            if (ap.length >= 6 && !/^(PIX|TED|DOC|CRED|DEB|TARIFA)/.test(ap)) {
              await conn.query(`INSERT IGNORE INTO fin_pessoa_alias (empresa_id, pessoa_id, alias) VALUES (?, ?, ?)`, [empId, pessoaId, ap])
            }
          }
        }
        await conn.commit()
      } catch (e) {
        await conn.rollback()
        throw e
      } finally {
        conn.release()
      }

      await registrarAuditoria(ctx.db, ctx, {
        acao: 'BAIXA', entidade: 'fin_conciliacao', entidadeId: input.linhaIds[0],
        dadosDepois: { origem: 'conciliacao_extrato', linhas: input.linhaIds, itens: input.itens, dataPagamento: dataPag, contaId },
      })
      return { ok: true }
    }),

  // ── Novo lançamento a partir da linha (tarifa, despesa sem título etc.) ──
  criarLancamento: protectedProcedure
    .input(z.object({
      linhaId:       z.number().int().positive(),
      descricao:     z.string().trim().min(1).max(300),
      pessoaId:      z.number().int().positive().nullish(),
      planoContasId: z.number().int().positive().nullish(),
      centroCustoId: z.number().int().positive().nullish(),
      criarRegra:    z.object({ padrao: z.string().trim().min(3).max(120) }).nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId
      const [l] = await carregarLinhas(empId, [input.linhaId])
      if (l.status !== 'pendente') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Linha já conciliada ou ignorada.' })
      await verificarPeriodoAberto(ctx.db, empId, l.data)
      const tipo = l.valor > 0 ? 'RECEBER' : 'PAGAR'
      const v = Math.abs(l.valor).toFixed(2)
      const conn = await getRawPool().getConnection()
      let tituloId = 0
      try {
        await conn.beginTransaction()
        const [t]: any = await conn.query(
          `INSERT INTO fin_titulo (empresa_id, tipo, descricao, pessoa_id, plano_contas_id, centro_custo_id, valor_original, emissao, observacoes, ativo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Criado na conciliação do extrato', 1)`,
          [empId, tipo, input.descricao, input.pessoaId ?? null, input.planoContasId ?? null, input.centroCustoId ?? null, v, l.data],
        )
        tituloId = (t as any).insertId
        const [p]: any = await conn.query(
          `INSERT INTO fin_parcela (titulo_id, numero, valor, vencimento, status, data_pagamento, conta_id, valor_pago, juros, multa, desconto, forma_pagamento, extrato_fingerprint)
           VALUES (?, 1, ?, ?, 'PAGA', ?, ?, ?, 0, 0, 0, ?, ?)`,
          [tituloId, v, l.data, l.data, l.contaId, v, formaPorDescricao(l.descricao), l.fitid],
        )
        await conn.query(`INSERT INTO fin_conciliacao (empresa_id, linha_id, parcela_id, valor, usuario_nome) VALUES (?, ?, ?, ?, ?)`,
          [empId, l.id, (p as any).insertId, l.valor, ctx.usuario.nome])
        await conn.query(`UPDATE fin_extrato_linha SET status = 'conciliado', conciliado_por_nome = ?, conciliado_em = ? WHERE id = ?`, [ctx.usuario.nome, new Date(), l.id])
        if (input.criarRegra) {
          await conn.query(
            `INSERT INTO fin_extrato_regra (empresa_id, padrao, sinal, plano_contas_id, centro_custo_id, pessoa_id, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [empId, input.criarRegra.padrao, l.valor > 0 ? 'C' : 'D', input.planoContasId ?? null, input.centroCustoId ?? null, input.pessoaId ?? null, input.descricao],
          )
        }
        if (input.pessoaId) {
          const ap = extrairContraparte(l.descricao)
          if (ap.length >= 6 && !/^(PIX|TED|DOC|CRED|DEB|TARIFA)/.test(ap)) await conn.query(`INSERT IGNORE INTO fin_pessoa_alias (empresa_id, pessoa_id, alias) VALUES (?, ?, ?)`, [empId, input.pessoaId, ap])
        }
        await conn.commit()
      } catch (e) { await conn.rollback(); throw e } finally { conn.release() }
      await registrarAuditoria(ctx.db, ctx, { acao: 'CREATE', entidade: 'fin_titulo', entidadeId: tituloId,
        dadosDepois: { origem: 'conciliacao_extrato', linhaId: l.id, descricao: input.descricao, valor: v, data: l.data } })
      return { ok: true, tituloId }
    }),

  // ── Aplica regras em lote (ex.: todas as tarifas de cobrança) ────────────
  aplicarRegras: protectedProcedure
    .input(z.object({ contaId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId
      const pool = getRawPool()
      const [regras]: any = await pool.query(`SELECT * FROM fin_extrato_regra WHERE empresa_id = ? AND ativo = 1`, [empId])
      const [lRows]: any = await pool.query(
        `SELECT id, DATE_FORMAT(data, '%Y-%m-%d') AS data, valor, descricao, fitid FROM fin_extrato_linha WHERE empresa_id = ? AND conta_id = ? AND status = 'pendente'`,
        [empId, input.contaId],
      )
      let criados = 0, bloqueados = 0
      for (const l of lRows as any[]) {
        const valor = Number(l.valor)
        const rg = (regras as any[]).find(r => r.sinal === (valor > 0 ? 'C' : 'D') && norm(l.descricao).includes(norm(r.padrao)))
        if (!rg) continue
        try { await verificarPeriodoAberto(ctx.db, empId, l.data) } catch { bloqueados++; continue }
        const v = Math.abs(valor).toFixed(2)
        const conn = await pool.getConnection()
        try {
          await conn.beginTransaction()
          const [t]: any = await conn.query(
            `INSERT INTO fin_titulo (empresa_id, tipo, descricao, pessoa_id, plano_contas_id, centro_custo_id, valor_original, emissao, observacoes, ativo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Regra de conciliação', 1)`,
            [empId, valor > 0 ? 'RECEBER' : 'PAGAR', rg.descricao || rg.padrao, rg.pessoa_id, rg.plano_contas_id, rg.centro_custo_id, v, l.data],
          )
          const [p]: any = await conn.query(
            `INSERT INTO fin_parcela (titulo_id, numero, valor, vencimento, status, data_pagamento, conta_id, valor_pago, juros, multa, desconto, forma_pagamento, extrato_fingerprint)
             VALUES (?, 1, ?, ?, 'PAGA', ?, ?, ?, 0, 0, 0, ?, ?)`,
            [(t as any).insertId, v, l.data, l.data, input.contaId, v, formaPorDescricao(l.descricao), l.fitid],
          )
          await conn.query(`INSERT INTO fin_conciliacao (empresa_id, linha_id, parcela_id, valor, usuario_nome) VALUES (?, ?, ?, ?, ?)`, [empId, l.id, (p as any).insertId, valor, ctx.usuario.nome])
          await conn.query(`UPDATE fin_extrato_linha SET status = 'conciliado', conciliado_por_nome = ?, conciliado_em = ? WHERE id = ?`, [`regra: ${rg.padrao}`, new Date(), l.id])
          await conn.commit(); criados++
        } catch (e) { await conn.rollback(); throw e } finally { conn.release() }
      }
      return { ok: true, criados, bloqueados }
    }),

  // ── Transferência entre contas próprias (as duas pontas no extrato) ─────
  transferir: protectedProcedure
    .input(z.object({ linhaId: z.number().int().positive(), linhaParId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId
      const [a, b] = await carregarLinhas(empId, [input.linhaId, input.linhaParId])
      if (a.status !== 'pendente' || b.status !== 'pendente') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Uma das linhas já foi conciliada.' })
      if (a.contaId === b.contaId || !eq(a.valor, -b.valor)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'As duas pontas precisam ser de contas diferentes e com o mesmo valor (uma saída e uma entrada).' })
      const saida = a.valor < 0 ? a : b, entrada = a.valor < 0 ? b : a
      await verificarPeriodoAberto(ctx.db, empId, saida.data)
      const conn = await getRawPool().getConnection()
      try {
        await conn.beginTransaction()
        const [t]: any = await conn.query(
          `INSERT INTO fin_transferencia (empresa_id, conta_origem_id, conta_destino_id, valor, data, descricao) VALUES (?, ?, ?, ?, ?, 'Conciliação do extrato')`,
          [empId, saida.contaId, entrada.contaId, Math.abs(saida.valor).toFixed(2), saida.data],
        )
        const tid = (t as any).insertId
        for (const l of [saida, entrada]) {
          await conn.query(`INSERT INTO fin_conciliacao (empresa_id, linha_id, transferencia_id, valor, usuario_nome) VALUES (?, ?, ?, ?, ?)`, [empId, l.id, tid, l.valor, ctx.usuario.nome])
        }
        await conn.query(`UPDATE fin_extrato_linha SET status = 'conciliado', conciliado_por_nome = ?, conciliado_em = ? WHERE id IN (?)`, [ctx.usuario.nome, new Date(), [saida.id, entrada.id]])
        await conn.commit()
      } catch (e) { await conn.rollback(); throw e } finally { conn.release() }
      return { ok: true }
    }),

  ignorar: protectedProcedure
    .input(z.object({ linhaId: z.number().int().positive(), motivo: z.string().trim().min(3).max(300) }))
    .mutation(async ({ ctx, input }) => {
      const pool = getRawPool()
      const [r]: any = await pool.query(
        `UPDATE fin_extrato_linha SET status = 'ignorado', observacao = ?, conciliado_por_nome = ?, conciliado_em = ? WHERE id = ? AND empresa_id = ? AND status = 'pendente'`,
        [input.motivo, ctx.usuario.nome, new Date(), input.linhaId, ctx.usuario.empresaId],
      )
      if (!(r as any).affectedRows) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Linha não está pendente.' })
      return { ok: true }
    }),

  // Desfaz o vínculo e devolve a linha à fila. A baixa da parcela NÃO é
  // revertida (pode ter sido feita antes, à mão) — estorne no lançamento se
  // for o caso. Transferência criada pela conciliação é removida junto.
  reabrir: protectedProcedure
    .input(z.object({ linhaId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId
      const pool = getRawPool()
      const [l] = await carregarLinhas(empId, [input.linhaId])
      const [lig]: any = await pool.query(`SELECT transferencia_id AS tid FROM fin_conciliacao WHERE linha_id = ? AND transferencia_id IS NOT NULL`, [l.id])
      const tids = (lig as any[]).map(x => x.tid)
      let linhasAfetadas = [l.id]
      if (tids.length) {
        const [outras]: any = await pool.query(`SELECT linha_id AS id FROM fin_conciliacao WHERE transferencia_id IN (?)`, [tids])
        linhasAfetadas = [...new Set([...linhasAfetadas, ...(outras as any[]).map(o => o.id)])]
        await pool.query(`DELETE FROM fin_transferencia WHERE id IN (?) AND empresa_id = ?`, [tids, empId])
      }
      await pool.query(`DELETE FROM fin_conciliacao WHERE linha_id IN (?)`, [linhasAfetadas])
      await pool.query(`UPDATE fin_extrato_linha SET status = 'pendente', observacao = NULL, conciliado_por_nome = NULL, conciliado_em = NULL WHERE id IN (?)`, [linhasAfetadas])
      return { ok: true }
    }),

  // ── Regras ───────────────────────────────────────────────────────────────
  regras: protectedProcedure.query(async ({ ctx }) => {
    const [rows]: any = await getRawPool().query(
      `SELECT r.id, r.padrao, r.sinal, r.plano_contas_id AS planoContasId, r.centro_custo_id AS centroCustoId, r.pessoa_id AS pessoaId,
              r.descricao, r.ativo, pc.nome AS planoNome
       FROM fin_extrato_regra r LEFT JOIN fin_plano_contas pc ON pc.id = r.plano_contas_id
       WHERE r.empresa_id = ? ORDER BY r.padrao`, [ctx.usuario.empresaId],
    )
    return (rows as any[]).map(r => ({ ...r, ativo: Number(r.ativo) === 1 }))
  }),

  salvarRegra: protectedProcedure
    .input(z.object({
      id:            z.number().int().positive().optional(),
      padrao:        z.string().trim().min(3).max(120),
      sinal:         z.enum(['C', 'D']),
      planoContasId: z.number().int().positive().nullish(),
      centroCustoId: z.number().int().positive().nullish(),
      pessoaId:      z.number().int().positive().nullish(),
      descricao:     z.string().trim().max(200).nullish(),
      ativo:         z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const pool = getRawPool()
      const vals = [input.padrao, input.sinal, input.planoContasId ?? null, input.centroCustoId ?? null, input.pessoaId ?? null, input.descricao ?? null, input.ativo ? 1 : 0]
      if (input.id) {
        await pool.query(`UPDATE fin_extrato_regra SET padrao = ?, sinal = ?, plano_contas_id = ?, centro_custo_id = ?, pessoa_id = ?, descricao = ?, ativo = ? WHERE id = ? AND empresa_id = ?`,
          [...vals, input.id, ctx.usuario.empresaId])
        return { ok: true, id: input.id }
      }
      const [r]: any = await pool.query(`INSERT INTO fin_extrato_regra (padrao, sinal, plano_contas_id, centro_custo_id, pessoa_id, descricao, ativo, empresa_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [...vals, ctx.usuario.empresaId])
      return { ok: true, id: (r as any).insertId }
    }),

  excluirRegra: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await getRawPool().query(`DELETE FROM fin_extrato_regra WHERE id = ? AND empresa_id = ?`, [input.id, ctx.usuario.empresaId])
      return { ok: true }
    }),
})
