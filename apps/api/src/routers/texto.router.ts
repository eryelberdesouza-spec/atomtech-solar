import { z } from 'zod'
import { router, protectedProcedure } from './trpc'
import { db } from '../db'
import { textoInstitucional } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export const textoRouter = router({
  // Lista todos os textos ativos da empresa
  list: protectedProcedure.query(async ({ ctx }) => {
    const empresaId = ctx.user.empresaId ?? 1
    const textos = await db
      .select()
      .from(textoInstitucional)
      .where(and(eq(textoInstitucional.empresaId, empresaId), eq(textoInstitucional.ativo, true)))
    return textos
  }),

  // Busca texto por chave
  byChave: protectedProcedure
    .input(z.object({ chave: z.string() }))
    .query(async ({ ctx, input }) => {
      const empresaId = ctx.user.empresaId ?? 1
      const [texto] = await db
        .select()
        .from(textoInstitucional)
        .where(
          and(
            eq(textoInstitucional.empresaId, empresaId),
            eq(textoInstitucional.chave, input.chave),
            eq(textoInstitucional.ativo, true)
          )
        )
      return texto ?? null
    }),

  // Atualiza ou cria texto
  upsert: protectedProcedure
    .input(z.object({
      chave: z.string(),
      titulo: z.string(),
      conteudo: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empresaId = ctx.user.empresaId ?? 1
      const [existing] = await db
        .select()
        .from(textoInstitucional)
        .where(and(eq(textoInstitucional.empresaId, empresaId), eq(textoInstitucional.chave, input.chave)))

      if (existing) {
        await db.update(textoInstitucional)
          .set({ titulo: input.titulo, conteudo: input.conteudo, ativo: true })
          .where(eq(textoInstitucional.id, existing.id))
      } else {
        await db.insert(textoInstitucional).values({
          empresaId,
          chave: input.chave,
          titulo: input.titulo,
          conteudo: input.conteudo,
          versao: 1,
          ativo: true,
        })
      }
      return { ok: true }
    }),
})
