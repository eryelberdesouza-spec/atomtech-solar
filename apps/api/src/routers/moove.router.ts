// ═══════════════════════════════════════════════════════════════════
// Router de Relatório de Recargas (Moove) — leitura de cadastro de
// estações e histórico de relatórios gerados. Upload/geração ficam em
// endpoints Express (multipart não dá em tRPC) — ver apps/api/src/index.ts.
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { router, protectedProcedure } from './trpc'
import { mooveEstacao, mooveRelatorioGerado, cliente } from '../db/schema'

export const mooveRouter = router({
  estacao: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return ctx.db
        .select({
          id: mooveEstacao.id,
          nomeEstacao: mooveEstacao.nomeEstacao,
          local: mooveEstacao.local,
          comissaoAtomPercentual: mooveEstacao.comissaoAtomPercentual,
          clienteId: mooveEstacao.clienteId,
          clienteNome: cliente.nome,
        })
        .from(mooveEstacao)
        .innerJoin(cliente, eq(cliente.id, mooveEstacao.clienteId))
        .where(eq(mooveEstacao.empresaId, ctx.usuario.empresaId))
    }),
  }),

  historico: router({
    list: protectedProcedure
      .input(z.object({ clienteId: z.number().int().positive().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const condicoes = [eq(mooveRelatorioGerado.empresaId, ctx.usuario.empresaId)]
        if (input?.clienteId) condicoes.push(eq(mooveRelatorioGerado.clienteId, input.clienteId))

        return ctx.db
          .select({
            id: mooveRelatorioGerado.id,
            clienteId: mooveRelatorioGerado.clienteId,
            clienteNome: cliente.nome,
            periodoInicio: mooveRelatorioGerado.periodoInicio,
            periodoFim: mooveRelatorioGerado.periodoFim,
            arquivoNome: mooveRelatorioGerado.arquivoNome,
            arquivoTamanho: mooveRelatorioGerado.arquivoTamanho,
            createdAt: mooveRelatorioGerado.createdAt,
          })
          .from(mooveRelatorioGerado)
          .innerJoin(cliente, eq(cliente.id, mooveRelatorioGerado.clienteId))
          .where(and(...condicoes))
          .orderBy(desc(mooveRelatorioGerado.createdAt))
          .limit(50)
      }),
  }),
})
