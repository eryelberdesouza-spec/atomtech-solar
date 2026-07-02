import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { finRouter } from '../routers/fin.router'
import { finTitulo, finParcela } from '../db/schema'
import {
  createTestContext, testDb, TEST_EMPRESA_ID,
  criarPlanoContasTeste, excluirPlanoContasTeste, excluirTituloTeste, closeTestPool,
} from './testDb'

// Usa datas em 2099 para isolar os totais do teste de qualquer dado real já existente no banco
describe('fin.dre.get — regime caixa vs competência', () => {
  const caller = finRouter.createCaller(createTestContext())
  let planoReceita: number
  let planoDespesa: number
  let tituloReceitaPagaId: number
  let tituloDespesaPagaId: number
  let tituloReceitaAbertaId: number

  beforeAll(async () => {
    planoReceita = await criarPlanoContasTeste('RECEITA', '__VITEST__DRE_R')
    planoDespesa = await criarPlanoContasTeste('DESPESA', '__VITEST__DRE_D')

    // Receita paga em 2099-05 — deve contar no regime CAIXA e no COMPETENCIA
    const [r1] = await testDb.insert(finTitulo).values({
      empresaId: TEST_EMPRESA_ID, tipo: 'RECEBER', descricao: '__VITEST__ receita paga',
      planoContasId: planoReceita, valorOriginal: '1000.00', emissao: '2099-05-01' as any, ativo: true,
    })
    tituloReceitaPagaId = (r1 as any).insertId
    await testDb.insert(finParcela).values({
      tituloId: tituloReceitaPagaId, numero: 1, valor: '1000.00',
      vencimento: '2099-05-05' as any, status: 'PAGA',
      dataPagamento: '2099-05-05' as any, valorPago: '1000.00',
    })

    // Despesa paga em 2099-05
    const [r2] = await testDb.insert(finTitulo).values({
      empresaId: TEST_EMPRESA_ID, tipo: 'PAGAR', descricao: '__VITEST__ despesa paga',
      planoContasId: planoDespesa, valorOriginal: '400.00', emissao: '2099-05-01' as any, ativo: true,
    })
    tituloDespesaPagaId = (r2 as any).insertId
    await testDb.insert(finParcela).values({
      tituloId: tituloDespesaPagaId, numero: 1, valor: '400.00',
      vencimento: '2099-05-10' as any, status: 'PAGA',
      dataPagamento: '2099-05-10' as any, valorPago: '400.00',
    })

    // Receita em ABERTO (não paga) com vencimento em 2099-05 — só deve contar na COMPETENCIA
    const [r3] = await testDb.insert(finTitulo).values({
      empresaId: TEST_EMPRESA_ID, tipo: 'RECEBER', descricao: '__VITEST__ receita em aberto',
      planoContasId: planoReceita, valorOriginal: '300.00', emissao: '2099-05-01' as any, ativo: true,
    })
    tituloReceitaAbertaId = (r3 as any).insertId
    await testDb.insert(finParcela).values({
      tituloId: tituloReceitaAbertaId, numero: 1, valor: '300.00',
      vencimento: '2099-05-20' as any, status: 'ABERTA',
    })
  })

  afterAll(async () => {
    await excluirTituloTeste(tituloReceitaPagaId)
    await excluirTituloTeste(tituloDespesaPagaId)
    await excluirTituloTeste(tituloReceitaAbertaId)
    await excluirPlanoContasTeste(planoReceita)
    await excluirPlanoContasTeste(planoDespesa)
    await closeTestPool()
  })

  it('regime CAIXA soma só o que foi efetivamente pago no período', async () => {
    const dre = await caller.dre.get({ de: '2099-05-01', ate: '2099-05-31', regime: 'CAIXA' })
    expect(dre.receitas.total).toBe(1000)
    expect(dre.despesas.total).toBe(400)
    expect(dre.resultado).toBe(600)
  })

  it('regime COMPETENCIA inclui parcelas em aberto pelo vencimento', async () => {
    const dre = await caller.dre.get({ de: '2099-05-01', ate: '2099-05-31', regime: 'COMPETENCIA' })
    expect(dre.receitas.total).toBe(1300) // 1000 paga + 300 em aberto
    expect(dre.despesas.total).toBe(400)
    expect(dre.resultado).toBe(900)
  })

  it('não conta nada fora do período informado', async () => {
    const dre = await caller.dre.get({ de: '2099-06-01', ate: '2099-06-30', regime: 'CAIXA' })
    expect(dre.receitas.total).toBe(0)
    expect(dre.despesas.total).toBe(0)
  })
})
