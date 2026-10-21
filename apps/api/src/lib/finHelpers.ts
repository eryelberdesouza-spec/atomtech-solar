// Utilitários compartilhados pelos routers financeiros (fin.router e conciliacao.router).
import { eq, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { finAuditoria, finPeriodoFechado } from '../db/schema'

// ─── DATA — mysql2 devolve colunas DATE como objeto Date (não string), mesmo com
// drizzle mode 'string'; String(dateObj).slice(0,10) corrompe o valor.
// Getters UTC, NÃO locais: o Drizzle entrega meia-noite UTC e a API roda com
// TZ=America/Sao_Paulo — getDate() local devolvia o dia ANTERIOR (recibo com
// vencimento 14/10 para parcela de 15/10, emissão recuando 1 dia a cada
// salvamento). Pool cru (meia-noite local = 03:00Z) dá o mesmo dia em UTC.
export function fmtDateISO(d: unknown): string {
  if (d instanceof Date) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }
  return String(d).slice(0, 10)
}

// ─── AUDITORIA — helper de log ────────────────────────────────────────────────
export async function registrarAuditoria(
  db: any,
  ctx: { usuario: { empresaId: number; id: number; nome: string } },
  params: {
    acao: 'CREATE' | 'UPDATE' | 'DELETE' | 'BAIXA' | 'ESTORNO'
    entidade: string
    entidadeId: number
    dadosAntes?: unknown
    dadosDepois?: unknown
  },
) {
  await db.insert(finAuditoria).values({
    empresaId:   ctx.usuario.empresaId,
    usuarioId:   ctx.usuario.id,
    usuarioNome: ctx.usuario.nome,
    acao:        params.acao,
    entidade:    params.entidade,
    entidadeId:  params.entidadeId,
    dadosAntes:  params.dadosAntes !== undefined ? JSON.stringify(params.dadosAntes) : null,
    dadosDepois: params.dadosDepois !== undefined ? JSON.stringify(params.dadosDepois) : null,
  })
}

// ─── FECHAMENTO DE PERÍODO — helper ───────────────────────────────────────────
// Bloqueia lançar/baixar/estornar/excluir com data dentro de um mês já fechado.
export async function verificarPeriodoAberto(db: any, empresaId: number, dataStr: string | null | undefined) {
  if (!dataStr) return
  const [ano, mes] = String(dataStr).slice(0, 10).split('-').map(Number)
  if (!ano || !mes) return
  const [fechado] = await db
    .select({ id: finPeriodoFechado.id })
    .from(finPeriodoFechado)
    .where(and(
      eq(finPeriodoFechado.empresaId, empresaId),
      eq(finPeriodoFechado.ano, ano),
      eq(finPeriodoFechado.mes, mes),
    ))
    .limit(1)
  if (fechado) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `Período ${String(mes).padStart(2, '0')}/${ano} está fechado. Reabra o período antes de lançar, editar ou excluir.`,
    })
  }
}

