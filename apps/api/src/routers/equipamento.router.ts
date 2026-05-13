// ═══════════════════════════════════════════════════════════════════
// Router de Catálogo de Equipamentos (Módulos e Inversores)
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './trpc'
import { catalogoModulo, catalogoInversor } from '../db/schema'

// ─── SCHEMAS ────────────────────────────────────────────────────────

const moduloSchema = z.object({
  fabricante:    z.string().min(1).max(100),
  modelo:        z.string().min(1).max(200),
  potenciaWp:    z.number().int().positive(),
  eficiencia:    z.number().optional(),
  garantiaAnos:  z.number().int().optional(),
  precoUnitario: z.number().optional(),
})

const inversorSchema = z.object({
  fabricante:    z.string().min(1).max(100),
  modelo:        z.string().min(1).max(200),
  potenciaW:     z.number().int().positive(),
  tipo:          z.enum(['microinversor','string','hibrido','otimizador']),
  garantiaAnos:  z.number().int().optional(),
  precoUnitario: z.number().optional(),
})

// ─── ROUTER ─────────────────────────────────────────────────────────

export const equipamentoRouter = router({

  // ── MÓDULOS ────────────────────────────────────────────────────────

  listModulos: protectedProcedure
    .input(z.object({ apenasAtivos: z.boolean().default(true) }).optional())
    .query(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      const rows = await ctx.db
        .select()
        .from(catalogoModulo)
        .where(
          input?.apenasAtivos !== false
            ? and(eq(catalogoModulo.empresaId, empresaId), eq(catalogoModulo.ativo, true))
            : eq(catalogoModulo.empresaId, empresaId)
        )
      return rows
    }),

  createModulo: protectedProcedure
    .input(moduloSchema)
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      const [result] = await ctx.db
        .insert(catalogoModulo)
        .values({ ...input, empresaId })
        .execute()
      const id = (result as { insertId: number }).insertId
      const [novo] = await ctx.db.select().from(catalogoModulo).where(eq(catalogoModulo.id, id)).limit(1)
      return novo
    }),

  updateModulo: protectedProcedure
    .input(moduloSchema.partial().extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...dados } = input
      const { empresaId } = ctx.usuario
      const [existente] = await ctx.db.select({ id: catalogoModulo.id }).from(catalogoModulo)
        .where(and(eq(catalogoModulo.id, id), eq(catalogoModulo.empresaId, empresaId))).limit(1)
      if (!existente) throw new TRPCError({ code: 'NOT_FOUND' })
      await ctx.db.update(catalogoModulo).set(dados).where(eq(catalogoModulo.id, id)).execute()
      const [atualizado] = await ctx.db.select().from(catalogoModulo).where(eq(catalogoModulo.id, id)).limit(1)
      return atualizado
    }),

  toggleModulo: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), ativo: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      await ctx.db.update(catalogoModulo)
        .set({ ativo: input.ativo })
        .where(and(eq(catalogoModulo.id, input.id), eq(catalogoModulo.empresaId, empresaId)))
        .execute()
      return { ok: true }
    }),

  deleteModulo: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      await ctx.db.delete(catalogoModulo)
        .where(and(eq(catalogoModulo.id, input.id), eq(catalogoModulo.empresaId, empresaId)))
        .execute()
      return { ok: true }
    }),

  // ── INVERSORES ─────────────────────────────────────────────────────

  listInversores: protectedProcedure
    .input(z.object({ apenasAtivos: z.boolean().default(true), tipo: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      const rows = await ctx.db
        .select()
        .from(catalogoInversor)
        .where(
          input?.apenasAtivos !== false
            ? and(eq(catalogoInversor.empresaId, empresaId), eq(catalogoInversor.ativo, true))
            : eq(catalogoInversor.empresaId, empresaId)
        )
      return rows
    }),

  createInversor: protectedProcedure
    .input(inversorSchema)
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      const [result] = await ctx.db
        .insert(catalogoInversor)
        .values({ ...input, empresaId })
        .execute()
      const id = (result as { insertId: number }).insertId
      const [novo] = await ctx.db.select().from(catalogoInversor).where(eq(catalogoInversor.id, id)).limit(1)
      return novo
    }),

  updateInversor: protectedProcedure
    .input(inversorSchema.partial().extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...dados } = input
      const { empresaId } = ctx.usuario
      const [existente] = await ctx.db.select({ id: catalogoInversor.id }).from(catalogoInversor)
        .where(and(eq(catalogoInversor.id, id), eq(catalogoInversor.empresaId, empresaId))).limit(1)
      if (!existente) throw new TRPCError({ code: 'NOT_FOUND' })
      await ctx.db.update(catalogoInversor).set(dados).where(eq(catalogoInversor.id, id)).execute()
      const [atualizado] = await ctx.db.select().from(catalogoInversor).where(eq(catalogoInversor.id, id)).limit(1)
      return atualizado
    }),

  toggleInversor: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), ativo: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      await ctx.db.update(catalogoInversor)
        .set({ ativo: input.ativo })
        .where(and(eq(catalogoInversor.id, input.id), eq(catalogoInversor.empresaId, empresaId)))
        .execute()
      return { ok: true }
    }),

  deleteInversor: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      await ctx.db.delete(catalogoInversor)
        .where(and(eq(catalogoInversor.id, input.id), eq(catalogoInversor.empresaId, empresaId)))
        .execute()
      return { ok: true }
    }),
})
