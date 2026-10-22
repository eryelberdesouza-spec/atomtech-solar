const ExcelJS = require('exceljs'); const path = require('path')
const { A, faltando } = require(path.join(__dirname, 'concilia_resultado.json'))
const N = { 1: 'SICOOB', 2: 'INTER', null: '(sem conta)' }
const br = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : ''
const wb = new ExcelJS.Workbook(); wb.creator = 'AGF — conferência'
const FONTE = { name: 'Arial', size: 10 }
function aba(nome, colunas, linhas, nota) {
  const ws = wb.addWorksheet(nome)
  let r = 1
  if (nota) { ws.getCell('A1').value = nota; ws.getCell('A1').font = { ...FONTE, italic: true, color: { argb: 'FF555555' } }; r = 3 }
  ws.getRow(r).values = colunas.map(c => c.t)
  ws.getRow(r).font = { ...FONTE, bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(r).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E2040' } }
  colunas.forEach((c, i) => { ws.getColumn(i + 1).width = c.w })
  linhas.forEach((l, i) => {
    const row = ws.getRow(r + 1 + i); row.values = l; row.font = FONTE
    colunas.forEach((c, j) => { if (c.money) row.getCell(j + 1).numFmt = '#,##0.00;[Red]-#,##0.00' })
    const dec = colunas.findIndex(c => c.t === 'Decisão'); if (dec >= 0) row.getCell(dec + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
  })
  ws.views = [{ state: 'frozen', ySplit: r }]
  ws.autoFilter = { from: { row: r, column: 1 }, to: { row: r, column: colunas.length } }
}
const COLS = [
  { t: 'Data (AGF)', w: 11 }, { t: 'Conta (AGF)', w: 12 }, { t: 'Valor', w: 13, money: true }, { t: 'Lanç. AGF', w: 9 },
  { t: 'Descrição no AGF', w: 46 }, { t: 'Correspondência', w: 62 }, { t: 'Ação sugerida', w: 38 }, { t: 'Decisão', w: 18 },
]
const corr = a => !a.ref ? '' : a.ref.desc != null ? `${N[a.ref.conta]} ${br(a.ref.data)} — ${a.ref.desc}` : `duplica o lanç. #${a.ref.id} (${br(a.ref.data)}) ${a.ref.descricao || ''}`
const acao = a => ({
  'duplicado': 'Excluir este lançamento (duplicado)',
  'duplicado (outra conta)': 'Excluir (já lançado e conciliado na outra conta)',
  'conta trocada': `Trocar conta para ${N[a.ref && a.ref.conta]}`,
  'data errada (dia/mês invertido)': `Corrigir data para ${br(a.ref && a.ref.data)} (dia/mês invertido)`,
  'data errada': `Corrigir data para ${br(a.ref && a.ref.data)}`,
  'sobrando no AGF': 'Verificar: não aparece no extrato',
  'sem conta (casou)': `Definir conta ${N[a.ref && a.ref.conta]}`,
  'sem conta (não achado)': 'Definir a conta (não achado em nenhum extrato — verificar)',
}[a.cat] || '')
const linhaA = a => [br(a.data), N[a.conta], a.valor, '#' + a.id, a.descricao || '', corr(a), acao(a), '']
const ord = (x, y) => x.data.localeCompare(y.data)
const pega = (...cats) => A.filter(a => cats.includes(a.cat)).sort(ord).map(linhaA)

// Resumo
const ws = wb.addWorksheet('Resumo', { properties: { tabColor: { argb: 'FFF5A623' } } })
ws.getColumn(1).width = 34; for (let c = 2; c <= 8; c++) ws.getColumn(c).width = 14
const put = (r, vals, bold) => { ws.getRow(r).values = vals; ws.getRow(r).font = { ...FONTE, bold: !!bold } }
put(1, ['Conferência AGF × extratos bancários (só leitura — nada foi alterado)'], true)
put(2, ['Cobertura: Inter e Sicoob de 01/01 a 20/10/2026 (extratos OFX completos).'])
put(4, ['Categoria', 'Itens', 'Valor (R$)'], true)
const cats = [
  ['Duplicados (excluir)', ['duplicado', 'duplicado (outra conta)']],
  ['Conta trocada', ['conta trocada']],
  ['Data errada', ['data errada', 'data errada (dia/mês invertido)']],
  ['Sobrando no AGF (verificar)', ['sobrando no AGF']],
  ['Pagos sem conta', ['sem conta (casou)', 'sem conta (não achado)']],
]
let r = 5
for (const [t, cs] of cats) { const l = A.filter(a => cs.includes(a.cat)); put(r, [t, l.length, l.reduce((s, a) => s + a.valor, 0)]); ws.getRow(r).getCell(3).numFmt = '#,##0.00;[Red]-#,##0.00'; r++ }
put(r, ['Faltando no AGF (lançar)', faltando.length, faltando.reduce((s, b) => s + b.valor, 0)]); ws.getRow(r).getCell(3).numFmt = '#,##0.00;[Red]-#,##0.00'
r += 2
put(r, ['Lançamentos que bateram com o extrato', A.filter(a => a.cat && a.cat.startsWith('ok')).length]); r += 2
put(r, ['Como usar: em cada aba, preencha a coluna "Decisão" (OK / não / observação). Depois disso eu aplico as correções aprovadas.'])

aba('Duplicados', COLS, pega('duplicado', 'duplicado (outra conta)'))
aba('Conta trocada', COLS, pega('conta trocada'))
aba('Data errada', COLS, pega('data errada', 'data errada (dia/mês invertido)'))
aba('Sobrando no AGF', COLS, pega('sobrando no AGF'), 'Estão no AGF como pagos, mas não aparecem no extrato da conta indicada.')
aba('Sem conta', COLS, pega('sem conta (casou)', 'sem conta (não achado)'), 'Parcelas marcadas como pagas sem conta bancária — entram no saldo total mas em nenhuma conta.')
aba('Faltando no AGF', [{ t: 'Data', w: 11 }, { t: 'Conta', w: 10 }, { t: 'Valor', w: 13, money: true }, { t: 'Descrição no extrato', w: 80 }, { t: 'Decisão', w: 18 }],
  faltando.sort((x, y) => x.conta - y.conta || x.data.localeCompare(y.data)).map(b => [br(b.data), N[b.conta], b.valor, b.desc, '']),
  'Movimentos do extrato sem lançamento correspondente no AGF.')
require('fs').mkdirSync(path.join(__dirname, '../../conferencia-agf'), { recursive: true }); wb.xlsx.writeFile(path.join(__dirname, '../../conferencia-agf/Conferencia-AGF-x-extratos.xlsx')).then(() => console.log('ok'))
