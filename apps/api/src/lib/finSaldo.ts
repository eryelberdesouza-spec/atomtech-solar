// Saldo das contas bancárias do AGF — fonte única para dashboard, fluxo de
// caixa e conciliação.
//
// saldo = saldo_inicial
//       + recebimentos pagos − pagamentos pagos   (a partir de data_saldo_inicial)
//       + transferências recebidas − enviadas      (idem)
//
// Antes (até out/2026) o painel somava TODO pagamento já registrado, de qualquer
// data, e ignorava a tabela de transferências — lançamento anterior ao saldo
// inicial entrava em dobro e transferência não movia dinheiro entre contas.
import { getRawPool } from '../routers/trpc'

export type SaldoConta = { contaId: number; nome: string; saldoInicial: number; dataSaldoInicial: string | null; saldo: number }

export async function calcularSaldos(empresaId: number, ate?: string): Promise<{ contas: SaldoConta[]; semConta: number }> {
  const pool = getRawPool()
  const limite = ate ?? '9999-12-31'
  const [contas]: any = await pool.query(
    `SELECT id, nome, saldo_inicial, DATE_FORMAT(data_saldo_inicial, '%Y-%m-%d') AS dsi
     FROM fin_conta_bancaria WHERE empresa_id = ? AND ativo = 1 ORDER BY id`,
    [empresaId],
  )
  const [movs]: any = await pool.query(
    `SELECT p.conta_id AS contaId,
            SUM(CASE WHEN t.tipo = 'RECEBER' THEN p.valor_pago ELSE -p.valor_pago END) AS total
     FROM fin_parcela p
     JOIN fin_titulo t ON t.id = p.titulo_id
     LEFT JOIN fin_conta_bancaria c ON c.id = p.conta_id
     WHERE t.empresa_id = ? AND t.ativo = 1 AND p.status = 'PAGA'
       AND p.data_pagamento <= ?
       AND (c.data_saldo_inicial IS NULL OR p.data_pagamento >= c.data_saldo_inicial)
     GROUP BY p.conta_id`,
    [empresaId, limite],
  )
  const [transf]: any = await pool.query(
    `SELECT conta_origem_id AS origem, conta_destino_id AS destino, valor, DATE_FORMAT(data, '%Y-%m-%d') AS data
     FROM fin_transferencia WHERE empresa_id = ? AND data <= ?`,
    [empresaId, limite],
  )
  const lista: SaldoConta[] = (contas as any[]).map(c => {
    const dsi: string | null = c.dsi ?? null
    const mov = Number((movs as any[]).find(m => m.contaId === c.id)?.total ?? 0)
    const t = (transf as any[]).filter(x => !dsi || x.data >= dsi)
    const entra = t.filter(x => x.destino === c.id).reduce((s, x) => s + Number(x.valor), 0)
    const sai = t.filter(x => x.origem === c.id).reduce((s, x) => s + Number(x.valor), 0)
    const saldo = Number(c.saldo_inicial ?? 0) + mov + entra - sai
    return { contaId: c.id, nome: c.nome, saldoInicial: Number(c.saldo_inicial ?? 0), dataSaldoInicial: dsi, saldo: Math.round(saldo * 100) / 100 }
  })
  const semConta = Number((movs as any[]).find(m => m.contaId == null)?.total ?? 0)
  return { contas: lista, semConta: Math.round(semConta * 100) / 100 }
}
