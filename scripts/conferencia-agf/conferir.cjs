// Cruzamento SÓ LEITURA: extratos OFX × parcelas pagas do AGF (gera concilia_resultado.json).
// Uso: MYSQL_PROD_URL='mysql://root:SENHA@HOST:PORTA/railway' node scripts/conferencia-agf/conferir.cjs
// URL pública do MySQL: railway variables --service MySQL --kv (projeto satisfied-love) — ver CLAUDE.md.
// Depois: node scripts/conferencia-agf/planilha.cjs  → conferencia-agf/Conferencia-AGF-x-extratos.xlsx
const fs = require('fs'); const path = require('path'); const mysql = require('mysql2/promise')

const PASTAS = [
  'H:/Meu Drive/1. ADMINISTRATIVO/5. CONTABILIDADE/BANCOS/INTER/2026',
  'H:/Meu Drive/1. ADMINISTRATIVO/5. CONTABILIDADE/BANCOS/SICOOB',
]
// Período coberto pelos extratos de cada conta (Sicoob jun–out ainda sem OFX)
const COBERTURA = { 1: ['2026-01-01', '2026-10-20'], 2: ['2026-01-01', '2026-10-20'] }
const NOME = { 1: 'SICOOB', 2: 'INTER' }
const JANELA = 3

function lerOfx(arq) {
  const s = fs.readFileSync(arq, 'latin1')
  const banco = (s.match(/<BANKID>(\d+)/) || [])[1]
  const conta = banco === '756' ? 1 : banco === '077' ? 2 : null
  const out = []
  for (const b of s.split('<STMTTRN>').slice(1)) {
    const g = t => ((b.match(new RegExp('<' + t + '>([^<\\r\\n]*)')) || [])[1] || '').trim()
    const d = g('DTPOSTED').slice(0, 8)
    out.push({ conta, data: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, valor: Number(g('TRNAMT')), fitid: g('FITID'), desc: (g('MEMO') + ' ' + g('NAME')).trim() })
  }
  return out
}
const dias = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000)
const eq = (a, b) => Math.abs(a - b) < 0.005

;(async () => {
  // 1. Extrato (dedup por conta+fitid: há arquivos money/unix repetidos)
  const banco = new Map()
  for (const p of PASTAS) for (const f of fs.readdirSync(p).filter(f => f.toLowerCase().endsWith('.ofx'))) {
    for (const t of lerOfx(path.join(p, f))) {
      const [ini, fim] = COBERTURA[t.conta]
      if (t.data < ini || t.data > fim) continue
      banco.set(t.conta + '|' + t.fitid, t)
    }
  }
  const B = [...banco.values()].map((t, i) => ({ ...t, id: 'B' + i, par: null }))

  // 2. AGF
  const c = await mysql.createConnection({ uri: process.env.MYSQL_PROD_URL, dateStrings: true })
  const [rows] = await c.query(`
    SELECT p.id, p.conta_id conta, p.data_pagamento data, CASE WHEN t.tipo='RECEBER' THEN p.valor_pago ELSE -p.valor_pago END valor,
           p.extrato_fingerprint fp, t.id titulo, t.descricao, t.proposta_id prop, pc.nome plano
    FROM fin_parcela p JOIN fin_titulo t ON t.id=p.titulo_id LEFT JOIN fin_plano_contas pc ON pc.id=t.plano_contas_id
    WHERE t.empresa_id=1 AND t.ativo=1 AND p.status='PAGA'`)
  await c.end()
  const cobre = (conta, data) => conta && COBERTURA[conta] && data >= COBERTURA[conta][0] && data <= COBERTURA[conta][1]
  const A = rows.map(r => ({ ...r, valor: Number(r.valor), cat: null, ref: null }))
    .filter(a => cobre(a.conta, a.data) || (a.conta == null && a.data >= '2026-01-01'))

  const livreB = b => !b.par
  // 3a. FITID na mesma conta
  for (const a of A) {
    if (!a.fp) continue
    const b = B.find(b => livreB(b) && b.fitid === a.fp && (b.conta === a.conta || a.conta == null) && eq(b.valor, a.valor))
    if (b) { b.par = a.id; a.cat = a.conta == null ? 'sem conta (casou)' : 'ok'; a.ref = b }
  }
  // 3b. valor + data, mesma conta, o mais próximo
  for (const a of A.filter(a => !a.cat && a.conta).sort((x, y) => x.data.localeCompare(y.data))) {
    const cand = B.filter(b => livreB(b) && b.conta === a.conta && eq(b.valor, a.valor) && dias(b.data, a.data) <= JANELA)
      .sort((x, y) => dias(x.data, a.data) - dias(y.data, a.data))[0]
    if (cand) { cand.par = a.id; a.cat = 'ok'; a.ref = cand }
  }
  // 3c. combinações: 1 extrato = 2..3 lançamentos AGF  |  2 extratos = 1 lançamento AGF
  const somaCombos = (lst, alvo, max) => {
    for (let i = 0; i < lst.length; i++) for (let j = i + 1; j < lst.length; j++) {
      if (eq(lst[i].valor + lst[j].valor, alvo)) return [lst[i], lst[j]]
      if (max >= 3) for (let k = j + 1; k < lst.length; k++) if (eq(lst[i].valor + lst[j].valor + lst[k].valor, alvo)) return [lst[i], lst[j], lst[k]]
    }
    return null
  }
  for (const b of B.filter(livreB)) {
    const cand = A.filter(a => !a.cat && a.conta === b.conta && Math.sign(a.valor) === Math.sign(b.valor) && dias(a.data, b.data) <= 5)
    const combo = somaCombos(cand, b.valor, 3)
    if (combo) { b.par = combo.map(a => a.id).join('+'); combo.forEach(a => { a.cat = 'ok (1 extrato → várias parcelas)'; a.ref = b }) }
  }
  for (const a of A.filter(a => !a.cat && a.conta)) {
    const cand = B.filter(b => livreB(b) && b.conta === a.conta && Math.sign(a.valor) === Math.sign(b.valor) && dias(a.data, b.data) <= 5)
    const combo = somaCombos(cand, a.valor, 2)
    if (combo) { combo.forEach(b => (b.par = a.id)); a.cat = 'ok (vários extratos → 1 parcela)'; a.ref = combo[0] }
  }
  // 3d. o que sobrou no AGF
  for (const a of A.filter(a => !a.cat)) {
    if (a.conta == null) {
      const b = B.find(b => livreB(b) && eq(b.valor, a.valor) && dias(b.data, a.data) <= JANELA)
      if (b) { b.par = a.id; a.cat = 'sem conta (casou)'; a.ref = b } else a.cat = 'sem conta (não achado)'
      continue
    }
    const outra = B.find(b => livreB(b) && b.conta !== a.conta && eq(b.valor, a.valor) && dias(b.data, a.data) <= JANELA)
    if (outra) { outra.par = a.id; a.cat = 'conta trocada'; a.ref = outra; continue }
    const outraDup = B.find(b => b.par && b.conta !== a.conta && eq(b.valor, a.valor) && dias(b.data, a.data) <= JANELA)
    if (outraDup) { a.cat = 'duplicado (outra conta)'; a.ref = outraDup; continue }
    const dupDe = A.find(x => x !== a && x.cat && x.cat.startsWith('ok') && x.conta === a.conta && eq(x.valor, a.valor) && dias(x.data, a.data) <= JANELA)
    if (dupDe) { a.cat = 'duplicado'; a.ref = dupDe; continue }
    a.cat = 'sobrando no AGF'
  }
  const inverte = d => d.slice(0,5) + d.slice(8,10) + '-' + d.slice(5,7)
  for (const a of A.filter(a => a.cat === 'sobrando no AGF')) {
    const lst = B.filter(b => livreB(b) && b.conta === a.conta && eq(b.valor, a.valor))
    const b = lst.find(b => b.data === inverte(a.data)) || lst.sort((x, y) => dias(x.data, a.data) - dias(y.data, a.data))[0]
    if (b) { b.par = a.id; a.cat = b.data === inverte(a.data) ? 'data errada (dia/mês invertido)' : 'data errada'; a.ref = b }
  }
  const faltando = B.filter(livreB)

  // 4. Resumo
  const mes = d => d.slice(0, 7)
  const linhas = []
  for (const conta of [1, 2]) {
    const meses = [...new Set(B.filter(b => b.conta === conta).map(b => mes(b.data)))].sort()
    for (const m of meses) {
      const am = A.filter(a => a.conta === conta && mes(a.data) === m)
      const s = cat => am.filter(a => a.cat === cat)
      const tot = l => l.reduce((x, a) => x + a.valor, 0)
      const f = faltando.filter(b => b.conta === conta && mes(b.data) === m)
      linhas.push({ conta: NOME[conta], mes: m,
        extrato: B.filter(b => b.conta === conta && mes(b.data) === m).length,
        ok: am.filter(a => a.cat.startsWith('ok')).length,
        dup_n: s('duplicado').length + s('duplicado (outra conta)').length, dup_R$: (tot(s('duplicado')) + tot(s('duplicado (outra conta)'))).toFixed(2), data_n: am.filter(a => a.cat.startsWith('data errada')).length,
        trocada_n: s('conta trocada').length, trocada_R$: tot(s('conta trocada')).toFixed(2),
        sobra_n: s('sobrando no AGF').length, sobra_R$: tot(s('sobrando no AGF')).toFixed(2),
        falta_n: f.length, falta_R$: tot(f).toFixed(2) })
    }
  }
  console.table(linhas)
  const semConta = A.filter(a => a.conta == null)
  console.log('Pagos SEM conta:', semConta.length, '— casaram com extrato:', semConta.filter(a => a.cat === 'sem conta (casou)').length)
  fs.writeFileSync(path.join(__dirname, 'concilia_resultado.json'), JSON.stringify({ A, faltando, B }, null, 1))
})().catch(e => { console.error(e); process.exit(1) })
