// ═══════════════════════════════════════════════════════════════════
// Router de Premissas — configurações globais da empresa
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './trpc'
import { premissasConfig } from '../db/schema'

// ─── Schema do Item Adicional ─────────────────────────────────────────────────

const itemAdicionalSchema = z.object({
  id:          z.string(),
  descricao:   z.string().min(1, 'Informe a descrição do item'),
  tipoCusto:   z.enum(['fixo', 'multiplo', 'proporcional_kwp']),
  valorFixo:   z.number().min(0),
  ativo:       z.boolean(),
  unidade:     z.string().optional().default('unidade'),
})

export type ItemAdicionalPremissa = z.infer<typeof itemAdicionalSchema>

// ─── ROUTER ───────────────────────────────────────────────────────────────────

export const premissasRouter = router({

  // Busca premissas da empresa logada
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const { empresaId } = ctx.usuario

      const [prem] = await ctx.db
        .select()
        .from(premissasConfig)
        .where(eq(premissasConfig.empresaId, empresaId))
        .limit(1)

      if (!prem) {
        // Cria premissas padrão se não existir
        await ctx.db.insert(premissasConfig).values({
          empresaId,
          itensAdicionaisPadrao: [
            { id: 'item-bat-001', descricao: 'Bateria de Armazenamento', tipoCusto: 'fixo', valorFixo: 0, ativo: false, unidade: 'conjunto' },
            { id: 'item-evse-001', descricao: 'Carregador Veicular (EVSE)', tipoCusto: 'fixo', valorFixo: 0, ativo: false, unidade: 'unidade' },
            { id: 'item-pad-001', descricao: 'Padrão de Entrada', tipoCusto: 'fixo', valorFixo: 0, ativo: false, unidade: 'conjunto' },
          ],
        } as any)

        const [novo] = await ctx.db
          .select()
          .from(premissasConfig)
          .where(eq(premissasConfig.empresaId, empresaId))
          .limit(1)
        return novo
      }

      return prem
    }),

  // Atualiza premissas
  update: protectedProcedure
    .input(z.object({
      // Financeiras
      inflacaoEnergetica:              z.number().min(0).max(50).optional(),
      taxaDescontoVpl:                 z.number().min(0).max(50).optional(),
      considerarCustoDisponibilidade:  z.boolean().optional(),
      // Sistema
      baseIrradiacao:                  z.string().optional(),
      sobredimensionamentoPadrao:      z.number().min(0).max(100).optional(),
      perdaEficienciaAnualTradicional: z.number().min(0).max(5).optional(),
      perdaEficienciaAnualMicroinversor: z.number().min(0).max(5).optional(),
      perdaEficienciaAnualOtimizador:  z.number().min(0).max(5).optional(),
      trocaInversorAnosTradicional:    z.number().int().min(0).optional(),
      trocaInversorAnosMicroinversor:  z.number().int().min(0).optional(),
      trocaInversorAnosOtimizador:     z.number().int().min(0).optional(),
      custoTrocaInversorTrad:          z.number().min(0).max(100).optional(),
      custoTrocaInversorMicro:         z.number().min(0).max(100).optional(),
      custoTrocaInversorOtim:          z.number().min(0).max(100).optional(),
      margemPotenciaIdeal:             z.number().min(0).max(50).optional(),
      // Área por telhado
      areaCarport:      z.number().min(0).max(1).optional(),
      areaCeramico:     z.number().min(0).max(1).optional(),
      areaFibrocimento: z.number().min(0).max(1).optional(),
      areaLaje:         z.number().min(0).max(1).optional(),
      areaShingle:      z.number().min(0).max(1).optional(),
      areaMetalico:     z.number().min(0).max(1).optional(),
      areaZipado:       z.number().min(0).max(1).optional(),
      areaSolo:         z.number().min(0).max(1).optional(),
      // Tarifas
      grupoTarifarioPadrao: z.enum(['A', 'B']).optional(),
      tarifaPadrao:         z.number().min(0).optional(),
      tePonta:              z.number().min(0).optional(),
      teForaPonta:          z.number().min(0).optional(),
      tusdPonta:            z.number().min(0).optional(),
      tusdForaPonta:        z.number().min(0).optional(),
      tusdFioBBt:           z.number().min(0).optional(),
      faseTensaoRede:       z.string().optional(),
      fatorSimultaneidade:  z.number().min(0).max(1).optional(),
      impostoEnergia:       z.number().min(0).max(100).optional(),
      outrosEncargosAtual:  z.number().min(0).optional(),
      outrosEncargosNovo:   z.number().min(0).optional(),
      // Padrões técnicos
      tipoTelhadoPadrao:          z.string().optional(),
      desvioAzimutalPadrao:       z.number().int().min(-180).max(180).optional(),
      inclinacaoPadrao:           z.number().int().min(0).max(90).optional(),
      topologiasDisponiveis:      z.array(z.string()).optional(),
      tipoSistemaPadrao:          z.string().optional(),
      taxaDesempenhoTradicional:  z.number().min(0).max(100).optional(),
      taxaDesempenhoMicroinversor: z.number().min(0).max(100).optional(),
      taxaDesempenhoOtimizador:   z.number().min(0).max(100).optional(),
      // Precificação
      metodoPrecificacao:  z.enum(['margem_custo', 'margem_venda']).optional(),
      margemPadrao:        z.number().min(0).max(100).optional(),
      margemKitsUsarPadrao: z.boolean().optional(),
      margemKitsValor:     z.number().min(0).max(100).optional(),

      // ── COMPOSIÇÃO DE CUSTOS PADRÃO (NOVOS) ──────────────────────────────
      custoMaoObraModulo:    z.number().min(0).optional(),   // R$/módulo
      custoMaoObraInversor:  z.number().min(0).optional(),   // R$/inversor
      custoProjeto:          z.number().min(0).optional(),   // R$ fixo
      custoAdmin:            z.number().min(0).optional(),   // R$ fixo
      itensAdicionaisPadrao: z.array(itemAdicionalSchema).optional(), // extras
    }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario

      // Busca premissas atuais
      const [prem] = await ctx.db
        .select()
        .from(premissasConfig)
        .where(eq(premissasConfig.empresaId, empresaId))
        .limit(1)

      const updates: Record<string, any> = {}

      // Monta o objeto de updates com apenas os campos informados
      const camposDecimal = [
        'inflacaoEnergetica', 'taxaDescontoVpl', 'sobredimensionamentoPadrao',
        'perdaEficienciaAnualTradicional', 'perdaEficienciaAnualMicroinversor', 'perdaEficienciaAnualOtimizador',
        'custoTrocaInversorTrad', 'custoTrocaInversorMicro', 'custoTrocaInversorOtim',
        'margemPotenciaIdeal', 'areaCarport', 'areaCeramico', 'areaFibrocimento', 'areaLaje',
        'areaShingle', 'areaMetalico', 'areaZipado', 'areaSolo',
        'tarifaPadrao', 'tePonta', 'teForaPonta', 'tusdPonta', 'tusdForaPonta', 'tusdFioBBt',
        'fatorSimultaneidade', 'impostoEnergia', 'outrosEncargosAtual', 'outrosEncargosNovo',
        'margemPadrao', 'margemKitsValor',
        // Novos campos de composição de custos
        'custoMaoObraModulo', 'custoMaoObraInversor', 'custoProjeto', 'custoAdmin',
      ]

      const camposInt = [
        'trocaInversorAnosTradicional', 'trocaInversorAnosMicroinversor', 'trocaInversorAnosOtimizador',
        'desvioAzimutalPadrao', 'inclinacaoPadrao',
      ]

      const camposString = [
        'baseIrradiacao', 'faseTensaoRede', 'tipoTelhadoPadrao', 'tipoSistemaPadrao',
        'metodoPrecificacao', 'grupoTarifarioPadrao',
      ]

      const camposBoolean = ['considerarCustoDisponibilidade', 'margemKitsUsarPadrao']

      const camposJson = ['topologiasDisponiveis', 'itensAdicionaisPadrao']

      for (const campo of camposDecimal) {
        if ((input as any)[campo] !== undefined) {
          updates[campo] = String((input as any)[campo])
        }
      }
      for (const campo of camposInt) {
        if ((input as any)[campo] !== undefined) {
          updates[campo] = (input as any)[campo]
        }
      }
      for (const campo of camposString) {
        if ((input as any)[campo] !== undefined) {
          updates[campo] = (input as any)[campo]
        }
      }
      for (const campo of camposBoolean) {
        if ((input as any)[campo] !== undefined) {
          updates[campo] = (input as any)[campo]
        }
      }
      for (const campo of camposJson) {
        if ((input as any)[campo] !== undefined) {
          updates[campo] = (input as any)[campo]
        }
      }

      updates.updatedAt = new Date()

      if (Object.keys(updates).length <= 1) {
        return { ok: true } // só updatedAt, nada a fazer
      }

      if (prem) {
        await ctx.db
          .update(premissasConfig)
          .set(updates)
          .where(eq(premissasConfig.empresaId, empresaId))
          .execute()
      } else {
        await ctx.db
          .insert(premissasConfig)
          .values({ empresaId, ...updates } as any)
          .execute()
      }

      return { ok: true }
    }),

  // Gerencia itens adicionais individualmente
  addItemAdicional: protectedProcedure
    .input(itemAdicionalSchema)
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario

      const [prem] = await ctx.db.select().from(premissasConfig)
        .where(eq(premissasConfig.empresaId, empresaId)).limit(1)
      if (!prem) throw new TRPCError({ code: 'NOT_FOUND' })

      const itensAtuais = (prem.itensAdicionaisPadrao as any[] ?? [])

      // Verifica duplicata de ID
      if (itensAtuais.some((i: any) => i.id === input.id)) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Item com este ID já existe' })
      }

      const novosItens = [...itensAtuais, input]

      await ctx.db.update(premissasConfig)
        .set({ itensAdicionaisPadrao: novosItens, updatedAt: new Date() })
        .where(eq(premissasConfig.empresaId, empresaId))
        .execute()

      return { ok: true, itens: novosItens }
    }),

  updateItemAdicional: protectedProcedure
    .input(itemAdicionalSchema)
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario

      const [prem] = await ctx.db.select().from(premissasConfig)
        .where(eq(premissasConfig.empresaId, empresaId)).limit(1)
      if (!prem) throw new TRPCError({ code: 'NOT_FOUND' })

      const itensAtuais = (prem.itensAdicionaisPadrao as any[] ?? [])
      const novosItens = itensAtuais.map((i: any) => i.id === input.id ? { ...i, ...input } : i)

      await ctx.db.update(premissasConfig)
        .set({ itensAdicionaisPadrao: novosItens, updatedAt: new Date() })
        .where(eq(premissasConfig.empresaId, empresaId))
        .execute()

      return { ok: true, itens: novosItens }
    }),

  removeItemAdicional: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario

      const [prem] = await ctx.db.select().from(premissasConfig)
        .where(eq(premissasConfig.empresaId, empresaId)).limit(1)
      if (!prem) throw new TRPCError({ code: 'NOT_FOUND' })

      const itensAtuais = (prem.itensAdicionaisPadrao as any[] ?? [])
      const novosItens = itensAtuais.filter((i: any) => i.id !== input.id)

      await ctx.db.update(premissasConfig)
        .set({ itensAdicionaisPadrao: novosItens, updatedAt: new Date() })
        .where(eq(premissasConfig.empresaId, empresaId))
        .execute()

      return { ok: true, itens: novosItens }
    }),
})
