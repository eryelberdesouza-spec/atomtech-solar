import { z } from 'zod'
import { router, protectedProcedure } from './trpc'
import { textoInstitucional } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export const textoRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { empresaId } = ctx.usuario
    const textos = await ctx.db.select().from(textoInstitucional).where(and(eq(textoInstitucional.empresaId, empresaId), eq(textoInstitucional.ativo, 1 as any)))
    return textos
  }),
  byChave: protectedProcedure.input(z.object({ chave: z.string() })).query(async ({ ctx, input }) => {
    const { empresaId } = ctx.usuario
    const [texto] = await ctx.db.select().from(textoInstitucional).where(and(eq(textoInstitucional.empresaId, empresaId), eq(textoInstitucional.chave, input.chave), eq(textoInstitucional.ativo, 1 as any)))
    return texto ?? null
  }),
  upsert: protectedProcedure.input(z.object({ chave: z.string(), titulo: z.string(), conteudo: z.string() })).mutation(async ({ ctx, input }) => {
    const { empresaId } = ctx.usuario
    const [existing] = await ctx.db.select().from(textoInstitucional).where(and(eq(textoInstitucional.empresaId, empresaId), eq(textoInstitucional.chave, input.chave)))
    if (existing) {
      await ctx.db.update(textoInstitucional).set({ titulo: input.titulo, conteudo: input.conteudo, ativo: 1 as any }).where(eq(textoInstitucional.id, existing.id))
    } else {
      await ctx.db.insert(textoInstitucional).values({ empresaId, chave: input.chave, titulo: input.titulo, conteudo: input.conteudo, versao: 1, ativo: 1 as any })
    }
    return { ok: true }
  }),
})
