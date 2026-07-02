import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { finRouter } from '../routers/fin.router'
import { finParcela, finTitulo } from '../db/schema'
import {
  createTestContext, testDb, TEST_EMPRESA_ID,
  criarContaTeste, criarPlanoContasTeste,
  excluirContaTeste, excluirPlanoContasTeste, excluirTituloTeste,
  fecharPeriodoTeste, reabrirPeriodoTeste, closeTestPool,
} from './testDb'

describe('fin.parcela.baixar / estornar', () => {
  const caller = finRouter.createCaller(createTestContext())
  let contaId: number
  let planoContasId: number
  let tituloId: number
  let parcelaId: number

  beforeAll(async () => {
    contaId = await criarContaTeste()
    planoContasId = await criarPlanoContasTeste('RECEITA', '__VITEST__R1')

    const [res] = await testDb.insert(finTitulo).values({
      empresaId: TEST_EMPRESA_ID,
      tipo: 'RECEBER',
      descricao: '__VITEST__ titulo teste',
      planoContasId,
      valorOriginal: '500.00',
      emissao: '2099-03-01' as any,
      ativo: true,
    })
    tituloId = (res as any).insertId

    const [resP] = await testDb.insert(finParcela).values({
      tituloId,
      numero: 1,
      valor: '500.00',
      vencimento: '2099-03-10' as any,
      status: 'ABERTA',
    })
    parcelaId = (resP as any).insertId
  })

  afterAll(async () => {
    await excluirTituloTeste(tituloId) // cascade remove a parcela junto
    await excluirContaTeste(contaId)
    await excluirPlanoContasTeste(planoContasId)
    await closeTestPool()
  })

  it('dá baixa numa parcela em aberto', async () => {
    const res = await caller.parcela.baixar({
      parcelaId, contaId,
      dataPagamento: '2099-03-10',
      valorPago: 500,
      juros: 0, multa: 0, desconto: 0,
    })
    expect(res.ok).toBe(true)

    const [parcela] = await testDb.select().from(finParcela).where(eq(finParcela.id, parcelaId))
    expect(parcela.status).toBe('PAGA')
    expect(Number(parcela.valorPago)).toBe(500)
    expect(parcela.contaId).toBe(contaId)
  })

  it('rejeita dar baixa numa parcela que já está paga (evita duplo pagamento)', async () => {
    await expect(caller.parcela.baixar({
      parcelaId, contaId,
      dataPagamento: '2099-03-10',
      valorPago: 500, juros: 0, multa: 0, desconto: 0,
    })).rejects.toThrow('Parcela já está paga')
  })

  it('estorna a parcela paga, voltando pra ABERTA e limpando os dados de pagamento', async () => {
    const res = await caller.parcela.estornar({ parcelaId })
    expect(res.ok).toBe(true)

    const [parcela] = await testDb.select().from(finParcela).where(eq(finParcela.id, parcelaId))
    expect(parcela.status).toBe('ABERTA')
    expect(parcela.valorPago).toBeNull()
    expect(parcela.dataPagamento).toBeNull()
    expect(parcela.contaId).toBeNull()
  })

  it('rejeita estornar uma parcela que já está aberta', async () => {
    await expect(caller.parcela.estornar({ parcelaId }))
      .rejects.toThrow('Somente parcelas pagas podem ser estornadas')
  })

  it('bloqueia a baixa quando o mês do pagamento está com o período fechado', async () => {
    await fecharPeriodoTeste(2099, 3)
    try {
      await expect(caller.parcela.baixar({
        parcelaId, contaId,
        dataPagamento: '2099-03-10',
        valorPago: 500, juros: 0, multa: 0, desconto: 0,
      })).rejects.toThrow(/período/i)
    } finally {
      await reabrirPeriodoTeste(2099, 3)
    }
  })

  it('volta a permitir a baixa normalmente depois de reabrir o período', async () => {
    const res = await caller.parcela.baixar({
      parcelaId, contaId,
      dataPagamento: '2099-03-10',
      valorPago: 500, juros: 0, multa: 0, desconto: 0,
    })
    expect(res.ok).toBe(true)
  })
})
