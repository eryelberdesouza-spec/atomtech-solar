// ═══════════════════════════════════════════════════════════════════
// Router de Cálculo — executa motores sem persistir
// Usado para preview em tempo real antes de salvar
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './trpc'
import { premissasConfig } from '../db/schema'
import { calcularDimensionamento } from '../engines/sizing.engine'
import { calcularFinanceiro } from '../engines/financial.engine'
import { calcularPrecificacao } from '../engines/pricing.engine'

export const calculoRouter = router({
  // Calcula dimensionamento em tempo real (sem salvar)
  sizing: protectedProcedure
    .input(z.object({
      // Aceita consumo como número único ou array de meses
      consumoMedioMensalKwh: z.number().min(0).optional(),
      consumoMensalKwh: z.array(z.number().min(0)).optional(),
      // Potência manual (kWp) — bypassa cálculo por consumo
      potenciaFinalKwpManual: z.number().optional(),
      tarifaMediaKwh: z.number().optional(),
      cip: z.number().min(0).default(0),
      topologia: z.enum(['tradicional', 'microinversor', 'otimizador']),
      tipoTelhado: z.enum(['carport', 'ceramico', 'fibrocimento', 'laje', 'shingle', 'metalico', 'zipado', 'solo']),
      desvioAzimutal: z.number().int().min(-90).max(90).default(0),
      inclinacaoGraus: z.number().int().min(0).max(60).default(20),
      sobredimensionamento: z.number().optional(),
      empresaId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const [prem] = await ctx.db
        .select()
        .from(premissasConfig)
        .where(eq(premissasConfig.empresaId, ctx.usuario.empresaId))
        .limit(1)

      if (!prem) throw new TRPCError({ code: 'NOT_FOUND', message: 'Configure as premissas primeiro' })

      // Monta array de consumo mensal
      let consumoMensalKwh: number[]
      if (input.potenciaFinalKwpManual && input.potenciaFinalKwpManual > 0) {
        // Modo por potência — usa array simulado para o engine
        const kwpParaKwh = input.potenciaFinalKwpManual * 5.0 * 0.77 * 30 // estimativa
        consumoMensalKwh = Array(12).fill(kwpParaKwh)
      } else if (input.consumoMedioMensalKwh && input.consumoMedioMensalKwh > 0) {
        consumoMensalKwh = Array(12).fill(input.consumoMedioMensalKwh)
      } else if (input.consumoMensalKwh && input.consumoMensalKwh.length > 0) {
        consumoMensalKwh = input.consumoMensalKwh
      } else {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Informe o consumo ou a potência desejada' })
      }

      // Aplica sobredimensionamento customizado se informado
      const premComOverride = input.sobredimensionamento
        ? { ...prem, sobredimensionamentoPadrao: String(input.sobredimensionamento) }
        : prem

      const tarifaMediaKwh = input.tarifaMediaKwh ?? Number(prem.tarifaPadrao) ?? 1.0684

      const resultado = calcularDimensionamento({
        consumoMensalKwh,
        tarifaMediaKwh,
        cip: input.cip,
        topologia: input.topologia,
        tipoTelhado: input.tipoTelhado,
        desvioAzimutal: input.desvioAzimutal,
        inclinacaoGraus: input.inclinacaoGraus,
        premissas: premComOverride as any,
      })

      // Se modo potência manual, sobrescreve o resultado com a potência informada
      if (input.potenciaFinalKwpManual && input.potenciaFinalKwpManual > 0) {
        return calcularDimensionamento({
          consumoMensalKwh: Array(12).fill(999999), // dummy
          tarifaMediaKwh,
          cip: input.cip,
          topologia: input.topologia,
          tipoTelhado: input.tipoTelhado,
          desvioAzimutal: input.desvioAzimutal,
          inclinacaoGraus: input.inclinacaoGraus,
          potenciaFinalKwpManual: input.potenciaFinalKwpManual,
          premissas: premComOverride as any,
        })
      }

      return resultado
    }),

  // Calcula indicadores financeiros em tempo real
  financeiro: protectedProcedure
    .input(z.object({
      investimentoTotal: z.number().positive(),
      geracaoAnualKwh: z.number().positive(),
      tarifaInicialKwh: z.number().positive(),
      topologia: z.enum(['tradicional', 'microinversor', 'otimizador']).default('tradicional'),
    }))
    .query(async ({ ctx, input }) => {
      const [prem] = await ctx.db
        .select()
        .from(premissasConfig)
        .where(eq(premissasConfig.empresaId, ctx.usuario.empresaId))
        .limit(1)

      if (!prem) throw new TRPCError({ code: 'NOT_FOUND' })

      return calcularFinanceiro({
        investimentoTotal: input.investimentoTotal,
        geracaoAnualKwh: input.geracaoAnualKwh,
        tarifaInicialKwh: input.tarifaInicialKwh,
        topologia: input.topologia,
        premissas: {
          inflacaoEnergetica: Number(prem.inflacaoEnergetica),
          taxaDescontoVpl: Number(prem.taxaDescontoVpl),
          perdaEficienciaAnualTradicional: Number(prem.perdaEficienciaAnualTradicional),
          trocaInversorAnosTradicional: Number(prem.trocaInversorAnosTradicional),
          custoTrocaInversorTrad: Number(prem.custoTrocaInversorTrad),
        },
      })
    }),

  // Calcula precificação em tempo real
  precificacao: protectedProcedure
    .input(z.object({
      itens: z.array(z.object({
        descricao: z.string(),
        tipoCusto: z.enum(['fixo', 'multiplo', 'avancado', 'proporcional_kwp']),
        valorFixo: z.number().optional(),
        valorPorUnidade: z.number().optional(),
        quantidade: z.number().optional(),
        valorAvancado: z.number().optional(),
        valorPorKwp: z.number().optional(),
        margemOverride: z.number().nullable().optional(),
        incluso: z.boolean(),
      })),
      potenciaKwp: z.number().positive(),
      quantidadeModulos: z.number().int().positive(),
      quantidadeInversores: z.number().int().positive(),
      margemPadrao: z.number().min(0).max(100),
      comissao: z.number().min(0).max(100).default(0),
      descontoManual: z.number().min(0).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const [prem] = await ctx.db
        .select({ metodoPrecificacao: premissasConfig.metodoPrecificacao })
        .from(premissasConfig)
        .where(eq(premissasConfig.empresaId, ctx.usuario.empresaId))
        .limit(1)

      if (!prem) throw new TRPCError({ code: 'NOT_FOUND' })

      return calcularPrecificacao({
        ...input,
        metodoPrecificacao: prem.metodoPrecificacao as any,
      })
    }),
})
