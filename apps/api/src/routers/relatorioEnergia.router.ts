// ═══════════════════════════════════════════════════════════════════
// Router de Relatório de Energia — config técnica por cliente (usada
// pelo serviço apps/relatorio-energia) + histórico dos últimos 12 meses.
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { router, protectedProcedure } from './trpc'
import { clienteEnergiaSolar, relatorioEnergiaGerado } from '../db/schema'

const configSchema = z.object({
  clienteId: z.number().int().positive(),
  potenciaKwp: z.string().min(1, 'Informe a potência instalada').max(20),
  nomeL1: z.string().max(100).nullable().optional(),
  nomeL2: z.string().max(100).nullable().optional(),
  nomeL3: z.string().max(100).nullable().optional(),
  nomeL4: z.string().max(100).nullable().optional(),
})

// mysql2 devolve colunas DATE como objeto Date (às vezes como string, a
// depender da config do driver) — nunca usar String(valor) direto (vira
// "Invalid Date"); sempre passar por aqui.
function chaveDoMes(valor: unknown): string {
  const d = valor instanceof Date ? valor : new Date(String(valor))
  return d.toISOString().slice(0, 7) // "2026-06"
}

export const relatorioEnergiaRouter = router({
  config: router({
    get: protectedProcedure
      .input(z.object({ clienteId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const [result] = await ctx.db
          .select()
          .from(clienteEnergiaSolar)
          .where(and(
            eq(clienteEnergiaSolar.clienteId, input.clienteId),
            eq(clienteEnergiaSolar.empresaId, ctx.usuario.empresaId),
          ))
          .limit(1)
        return result ?? null
      }),

    upsert: protectedProcedure
      .input(configSchema)
      .mutation(async ({ ctx, input }) => {
        const { empresaId } = ctx.usuario
        await ctx.db
          .insert(clienteEnergiaSolar)
          .values({
            clienteId: input.clienteId,
            empresaId,
            potenciaKwp: input.potenciaKwp,
            nomeL1: input.nomeL1 ?? undefined,
            nomeL2: input.nomeL2 ?? undefined,
            nomeL3: input.nomeL3 ?? undefined,
            nomeL4: input.nomeL4 ?? undefined,
          })
          .onDuplicateKeyUpdate({
            set: {
              potenciaKwp: input.potenciaKwp,
              nomeL1: input.nomeL1 ?? undefined,
              nomeL2: input.nomeL2 ?? undefined,
              nomeL3: input.nomeL3 ?? undefined,
              nomeL4: input.nomeL4 ?? undefined,
              updatedAt: new Date(),
            },
          })
        return { ok: true }
      }),
  }),

  historico: router({
    // Últimos 12 meses (mais antigo → mais recente), cada um marcado como
    // gerado ou não. Regenerar o mesmo cliente/mês substitui a linha
    // anterior (UNIQUE KEY em cliente_id+referencia_mes), então cada mês
    // tem no máximo um relatório.
    list: protectedProcedure
      .input(z.object({ clienteId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { empresaId } = ctx.usuario
        const hoje = new Date()
        const meses = Array.from({ length: 12 }, (_, i) =>
          new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1),
        )

        const gerados = await ctx.db
          .select()
          .from(relatorioEnergiaGerado)
          .where(and(
            eq(relatorioEnergiaGerado.clienteId, input.clienteId),
            eq(relatorioEnergiaGerado.empresaId, empresaId),
          ))

        const porMes = new Map(gerados.map(g => [chaveDoMes(g.referenciaMes), g]))

        return meses.map(d => {
          const chave = chaveDoMes(d)
          const g = porMes.get(chave)
          return {
            mes: chave,
            gerado: !!g,
            id: g?.id ?? null,
            arquivoNome: g?.arquivoNome ?? null,
            arquivoTamanho: g?.arquivoTamanho ?? null,
            createdAt: g?.createdAt ?? null,
          }
        })
      }),
  }),
})
