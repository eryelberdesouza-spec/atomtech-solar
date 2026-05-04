// ═══════════════════════════════════════════════════════════════════
// Router de Faturas de Energia
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './trpc'
import { fatura, historicoConsumo, cliente } from '../db/schema'

const faturaCreateSchema = z.object({
  clienteId: z.number().int().positive(),
  distribuidora: z.string().max(100).optional(),
  referencia: z.string().max(7).optional(),          // MM/YYYY
  codigoUC: z.string().max(30).optional(),
  codigoInstalacao: z.string().max(30).optional(),
  tipoFornecimento: z.string().max(50).optional(),
  classificacao: z.string().max(100).optional(),
  grupoTarifario: z.enum(['A', 'B']).default('B'),
  subgrupo: z.string().max(10).optional(),
  consumoKwh: z.number().positive().optional(),
  valorTotal: z.number().positive().optional(),
  tarifaMedia: z.number().positive().optional(),
  cip: z.number().min(0).optional(),
  icmsAliquota: z.number().min(0).max(100).optional(),
  icmsValor: z.number().min(0).optional(),
  pisAliquota: z.number().min(0).optional(),
  pisValor: z.number().min(0).optional(),
  cofinsAliquota: z.number().min(0).optional(),
  cofinsValor: z.number().min(0).optional(),
  tensaoNominal: z.string().max(20).optional(),
  dataLeituraAnterior: z.string().optional(),
  dataLeituraAtual: z.string().optional(),
  diasFaturados: z.number().int().min(1).max(45).optional(),
  observacoes: z.string().optional(),
  // Histórico de consumo (até 13 meses)
  historicoConsumo: z.array(z.object({
    referencia: z.string().max(7),
    consumoKwh: z.number().positive(),
    dias: z.number().int().optional(),
    ordem: z.number().int(),
  })).optional(),
})

export const faturaRouter = router({
  // Lista faturas de um cliente
  byCliente: protectedProcedure
    .input(z.object({ clienteId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      // Valida que o cliente pertence à empresa
      const [cli] = await ctx.db
        .select({ id: cliente.id })
        .from(cliente)
        .where(
          and(
            eq(cliente.id, input.clienteId),
            eq(cliente.empresaId, ctx.usuario.empresaId),
          ),
        )
        .limit(1)

      if (!cli) throw new TRPCError({ code: 'NOT_FOUND' })

      const faturas = await ctx.db
        .select()
        .from(fatura)
        .where(eq(fatura.clienteId, input.clienteId))
        .orderBy(desc(fatura.createdAt))

      return faturas
    }),

  // Fatura completa com histórico
  byId: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [fat] = await ctx.db
        .select()
        .from(fatura)
        .where(eq(fatura.id, input.id))
        .limit(1)

      if (!fat) throw new TRPCError({ code: 'NOT_FOUND' })

      // Valida acesso via cliente → empresa
      const [cli] = await ctx.db
        .select({ empresaId: cliente.empresaId })
        .from(cliente)
        .where(eq(cliente.id, fat.clienteId))
        .limit(1)

      if (!cli || cli.empresaId !== ctx.usuario.empresaId) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const historico = await ctx.db
        .select()
        .from(historicoConsumo)
        .where(eq(historicoConsumo.faturaId, input.id))
        .orderBy(historicoConsumo.ordem)

      return { ...fat, historicoConsumo: historico }
    }),

  // Cria fatura com cálculo automático da tarifa média
  create: protectedProcedure
    .input(faturaCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Valida cliente
      const [cli] = await ctx.db
        .select({ id: cliente.id })
        .from(cliente)
        .where(
          and(
            eq(cliente.id, input.clienteId),
            eq(cliente.empresaId, ctx.usuario.empresaId),
          ),
        )
        .limit(1)

      if (!cli) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' })

      // Calcula tarifa média se não informada
      let tarifaMedia = input.tarifaMedia
      if (!tarifaMedia && input.consumoKwh && input.valorTotal && input.cip !== undefined) {
        // Tarifa = (Valor Total - CIP) / Consumo kWh
        const valorSemCIP = input.valorTotal - (input.cip ?? 0)
        tarifaMedia = valorSemCIP > 0 && input.consumoKwh > 0
          ? valorSemCIP / input.consumoKwh
          : undefined
      }

      const { historicoConsumo: historico, ...dadosFatura } = input

      const [result] = await ctx.db.insert(fatura).values({
        ...dadosFatura,
        tarifaMedia: tarifaMedia ? String(tarifaMedia) : undefined,
        consumoKwh: input.consumoKwh ? String(input.consumoKwh) : undefined,
        valorTotal: input.valorTotal ? String(input.valorTotal) : undefined,
        cip: input.cip !== undefined ? String(input.cip) : undefined,
        icmsAliquota: input.icmsAliquota ? String(input.icmsAliquota) : undefined,
        icmsValor: input.icmsValor ? String(input.icmsValor) : undefined,
        pisAliquota: input.pisAliquota ? String(input.pisAliquota) : undefined,
        pisValor: input.pisValor ? String(input.pisValor) : undefined,
        cofinsAliquota: input.cofinsAliquota ? String(input.cofinsAliquota) : undefined,
        cofinsValor: input.cofinsValor ? String(input.cofinsValor) : undefined,
      }).execute()

      const faturaId = (result as { insertId: number }).insertId

      // Insere histórico de consumo
      if (historico && historico.length > 0) {
        for (const h of historico) {
          await ctx.db.insert(historicoConsumo).values({
            faturaId,
            referencia: h.referencia,
            consumoKwh: String(h.consumoKwh),
            dias: h.dias,
            ordem: h.ordem,
          }).execute()
        }
      }

      const [nova] = await ctx.db
        .select()
        .from(fatura)
        .where(eq(fatura.id, faturaId))
        .limit(1)

      const hist = await ctx.db
        .select()
        .from(historicoConsumo)
        .where(eq(historicoConsumo.faturaId, faturaId))
        .orderBy(historicoConsumo.ordem)

      return { ...nova, historicoConsumo: hist }
    }),

  // Exclui fatura
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [fat] = await ctx.db
        .select()
        .from(fatura)
        .where(eq(fatura.id, input.id))
        .limit(1)

      if (!fat) throw new TRPCError({ code: 'NOT_FOUND' })

      // Valida acesso
      const [cli] = await ctx.db
        .select({ empresaId: cliente.empresaId })
        .from(cliente)
        .where(eq(cliente.id, fat.clienteId))
        .limit(1)

      if (!cli || cli.empresaId !== ctx.usuario.empresaId) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      await ctx.db.delete(fatura).where(eq(fatura.id, input.id)).execute()
      return { ok: true }
    }),
})
