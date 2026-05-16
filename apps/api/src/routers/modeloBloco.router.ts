import { z } from 'zod'
import { router, protectedProcedure } from './trpc'
import { modeloBloco } from '../db/schema'
import { eq, and, asc } from 'drizzle-orm'

export const modeloBlocoRouter = router({
  list: protectedProcedure
    .input(z.object({ tipoBloco: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      const wheres: any[] = [eq(modeloBloco.empresaId, empresaId), eq(modeloBloco.ativo, 1 as any)]
      if (input?.tipoBloco) wheres.push(eq(modeloBloco.tipoBloco, input.tipoBloco))
      return ctx.db.select().from(modeloBloco)
        .where(and(...wheres))
        .orderBy(asc(modeloBloco.tipoBloco), asc(modeloBloco.ordem))
    }),

  create: protectedProcedure
    .input(z.object({
      tipoBloco: z.string(),
      titulo:    z.string().min(1),
      conteudo:  z.string().min(1),
      ordem:     z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      await ctx.db.insert(modeloBloco).values({
        empresaId,
        tipoBloco: input.tipoBloco,
        titulo:    input.titulo,
        conteudo:  input.conteudo,
        ordem:     input.ordem ?? 0,
        ativo:     1 as any,
      })
      return { ok: true }
    }),

  update: protectedProcedure
    .input(z.object({
      id:       z.number(),
      titulo:   z.string().min(1).optional(),
      conteudo: z.string().min(1).optional(),
      ordem:    z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      const { id, ...data } = input
      await ctx.db.update(modeloBloco)
        .set(data)
        .where(and(eq(modeloBloco.id, id), eq(modeloBloco.empresaId, empresaId)))
      return { ok: true }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      await ctx.db.delete(modeloBloco)
        .where(and(eq(modeloBloco.id, input.id), eq(modeloBloco.empresaId, empresaId)))
      return { ok: true }
    }),
})
