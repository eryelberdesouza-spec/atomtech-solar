// ═══════════════════════════════════════════════════════════════════
// Router de Propostas — o núcleo do sistema
// Integra: dimensionamento, precificação, financeiro, pagamentos
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { eq, and, desc, like, not } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './trpc'
import {
  proposta,
  dimensionamento,
  dimensionamento as dimTable,
  precificacao as precTable,
  itemCustoProposta as itemPrecTable,
  analiseFinanceira as afTable,
  condicaoComercial as ccTable,
  condicaoComercial as condicaoComercialTable,
  parcelaPagamento as ppTable,
  parcelaPagamento as parcelaCondicaoTable,
  blocoProposta as blocoTable,
  premissasConfig,
  premissasSnapshot,
  equipamentoProposta,
  fatura,
  cliente,
  empresa,
  historicoConsumo,
} from '../db/schema'
import { calcularDimensionamento } from '../engines/sizing.engine'
import { calcularFinanceiro } from '../engines/financial.engine'
import { calcularPrecificacao, gerarItensCustomizadosPadrao } from '../engines/pricing.engine'
import { gerarCondicoesCompletasAtomTech } from '../engines/payment.engine'
import { BLOCOS_PADRAO } from '../shared'

// ─── GERADOR DE NÚMERO DA PROPOSTA ───────────────────────────────────────────

async function gerarNumeroProposta(db: any, empresaId: number): Promise<string> {
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth() + 1).padStart(2, '0')

  const propostas = await db
    .select({ numero: proposta.numero })
    .from(proposta)
    .where(eq(proposta.empresaId, empresaId))

  const sequenciais = propostas
    .map((p: any) => p.numero as string)
    .filter((n: string) => n.startsWith('AT-') && n.includes(`${ano}`))
    .map((n: string) => {
      const partes = n.split('-')
      if (partes.length >= 3) {
        const sufixo = partes[2]
        if (sufixo.length >= 3) {
          return parseInt(sufixo.slice(-3), 10)
        }
      }
      return parseInt(n.split('-').pop() ?? '0', 10)
    })
    .filter((n: number) => !isNaN(n) && n > 0)

  const proximo = sequenciais.length > 0 ? Math.max(...sequenciais) + 1 : 1
  return `AT-${ano}-${mes}${String(proximo).padStart(3, '0')}`
}

// ─── DESCRICOES DOS ITENS ADICIONAIS (instalação e projeto) ──────────────────
// O item do KIT tem descrição 'Custo de Material%' — nunca deve ser deletado
// na edição. Apenas os itens abaixo são substituídos ao editar precificação.
const DESC_INSTALACAO_MODULOS  = 'Instalação dos Módulos'
const DESC_INSTALACAO_INVERSOR = 'Instalação do Inversor'
const DESC_PROJETO             = 'Projeto de Engenharia'

const DESCRICOES_ADICIONAIS = [DESC_INSTALACAO_MODULOS, DESC_INSTALACAO_INVERSOR, DESC_PROJETO]

// ─── ROUTER ───────────────────────────────────────────────────────────────────

export const propostaRouter = router({

  // Lista propostas com filtros
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['rascunho', 'enviada', 'aceita', 'recusada', 'expirada']).optional(),
        clienteId: z.number().optional(),
        usuarioId: z.number().optional(),
        isTemplate: z.boolean().optional(),
        pagina: z.number().int().default(1),
        porPagina: z.number().int().default(20),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      const { pagina = 1, porPagina = 20, status, clienteId, isTemplate } = input ?? {}
      const offset = (pagina - 1) * porPagina

      const propostas = await ctx.db
        .select({
          id: proposta.id,
          numero: proposta.numero,
          status: proposta.status,
          versao: proposta.versao,
          dataEmissao: proposta.dataEmissao,
          dataValidade: proposta.dataValidade,
          isTemplate: proposta.isTemplate,
          nomeTemplate: proposta.nomeTemplate,
          createdAt: proposta.createdAt,
          clienteId: proposta.clienteId,
          clienteNome: cliente.nome,
          clienteEstado: cliente.estado,
        })
        .from(proposta)
        .leftJoin(cliente, eq(proposta.clienteId, cliente.id))
        .where(
          and(
            eq(proposta.empresaId, empresaId),
            status ? eq(proposta.status, status) : undefined,
            clienteId ? eq(proposta.clienteId, clienteId) : undefined,
            isTemplate !== undefined ? eq(proposta.isTemplate, isTemplate) : undefined,
          ),
        )
        .orderBy(desc(proposta.createdAt))
        .limit(porPagina)
        .offset(offset)

      return { data: propostas, pagina, porPagina }
    }),

  // Proposta completa com todos os relacionamentos
  byId: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario

      const [prop] = await ctx.db
        .select()
        .from(proposta)
        .where(and(eq(proposta.id, input.id), eq(proposta.empresaId, empresaId)))
        .limit(1)

      if (!prop) throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposta não encontrada' })

      const [
        dim, prec, itens, af, condComerciais, blocos, equips, snapshot,
      ] = await Promise.all([
        ctx.db.select().from(dimTable).where(eq(dimTable.propostaId, input.id)).limit(1),
        ctx.db.select().from(precTable).where(eq(precTable.propostaId, input.id)).limit(1),
        ctx.db.select().from(itemPrecTable).where(eq(itemPrecTable.propostaId, input.id)),
        ctx.db.select().from(afTable).where(eq(afTable.propostaId, input.id)).limit(1),
        ctx.db.select().from(ccTable).where(eq(ccTable.propostaId, input.id)).orderBy(ccTable.ordem),
        ctx.db.select().from(blocoTable).where(eq(blocoTable.propostaId, input.id)).orderBy(blocoTable.ordem),
        ctx.db.select().from(equipamentoProposta).where(eq(equipamentoProposta.propostaId, input.id)).orderBy(equipamentoProposta.ordem),
        ctx.db.select().from(premissasSnapshot).where(eq(premissasSnapshot.propostaId, input.id)).limit(1),
      ])

      const parcelasMap: Record<number, any[]> = {}
      for (const cond of condComerciais) {
        if (cond.id) {
          parcelasMap[cond.id] = await ctx.db
            .select()
            .from(ppTable)
            .where(eq(ppTable.condicaoId, cond.id))
            .orderBy(ppTable.numeroParcela)
        }
      }

      return {
        proposta: prop,
        dimensionamento: dim[0] ?? null,
        precificacao: prec[0] ? { ...prec[0], itens } : null,
        analiseFinanceira: af[0] ?? null,
        condicoesComerciais: condComerciais.map((c) => ({
          ...c,
          parcelas: c.id ? (parcelasMap[c.id] ?? []) : [],
        })),
        blocos,
        equipamentos: equips,
        premissasSnapshot: snapshot[0]?.dadosJson ?? null,
      }
    }),

  // Cria nova proposta com cálculo automático completo
  create: protectedProcedure
    .input(
      z.object({
        clienteId: z.number().int().positive(),
        faturaId: z.number().int().positive().optional(),
        dataEmissao: z.string(),
        dataValidade: z.string().optional(),
        topologia: z.enum(['tradicional', 'microinversor', 'otimizador']).default('microinversor'),
        tipoTelhado: z.enum(['carport', 'ceramico', 'fibrocimento', 'laje', 'shingle', 'metalico', 'zipado', 'solo']).default('ceramico'),
        desvioAzimutal: z.number().default(0),
        inclinacaoGraus: z.number().default(20),
        custoKitFotovoltaico: z.number().positive('Informe o custo do kit'),
        margemOverride: z.number().optional(),
        comissao: z.number().default(0),
        templateOrigemId: z.number().optional(),
        observacoesInternas: z.string().optional(),
        sobredimensionamento: z.number().min(0).max(100).default(50),
        descontoAvista: z.number().optional(),
        marcoParcelas: z.array(z.object({
          descricao: z.string(),
          percentual: z.number(),
          prazoDias: z.number(),
          tipoPrazo: z.enum(['uteis', 'corridos']),
        })).optional(),
        fabricanteModulo: z.string().optional(),
        modeloModulo: z.string().optional(),
        potenciaModuloWp: z.number().default(620),
        fabricanteInversor: z.string().optional(),
        modeloInversor: z.string().optional(),
        potenciaInversorKw: z.number().optional(),
        overloadInversor: z.number().min(0).max(100).default(0),
        entradasPorMicro: z.number().default(1),
        quantidadeModulosManual: z.number().optional(),
        quantidadeInversoresManual: z.number().optional(),
        portasMicroinversor: z.number().default(1),
        consumoMedioMensalKwh: z.number().optional(),
        potenciaFinalKwpManual: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { empresaId, id: usuarioId } = ctx.usuario

      const [cli] = await ctx.db
        .select()
        .from(cliente)
        .where(and(eq(cliente.id, input.clienteId), eq(cliente.empresaId, empresaId)))
        .limit(1)
      if (!cli) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' })

      const consumoInformado = input.consumoMedioMensalKwh && input.consumoMedioMensalKwh > 0
        ? input.consumoMedioMensalKwh : null

      let consumoMensal: number[] = consumoInformado ? Array(12).fill(consumoInformado) : [1000]
      let tarifaMedia = 1.0684
      let cip = 0

      if (input.faturaId) {
        const [fat] = await ctx.db.select().from(fatura).where(eq(fatura.id, input.faturaId)).limit(1)
        if (fat) {
          tarifaMedia = Number(fat.tarifaMedia) || tarifaMedia
          cip = Number(fat.cip) || 0
          const historico = await ctx.db.select().from(historicoConsumo)
            .where(eq(historicoConsumo.faturaId, input.faturaId)).orderBy(historicoConsumo.ordem)
          if (historico.length > 0) {
            consumoMensal = historico.map((h) => Number(h.consumoKwh))
          } else if (fat.consumoKwh) {
            consumoMensal = [Number(fat.consumoKwh)]
          }
        }
      }

      const [prem] = await ctx.db.select().from(premissasConfig)
        .where(eq(premissasConfig.empresaId, empresaId)).limit(1)
      if (!prem) throw new TRPCError({ code: 'NOT_FOUND', message: 'Configure as premissas antes de criar propostas' })

      if (!input.faturaId && prem.tarifaPadrao) {
        tarifaMedia = Number(prem.tarifaPadrao)
      }

      if (input.potenciaFinalKwpManual && input.potenciaFinalKwpManual > 0) {
        const geracaoEstimada = input.potenciaFinalKwpManual * 5.6 * 0.77 * 30
        consumoMensal = Array(12).fill(geracaoEstimada)
      }

      const sizingResult = calcularDimensionamento({
        consumoMensalKwh: consumoMensal,
        tarifaMediaKwh: tarifaMedia,
        cip,
        potenciaFinalKwpManual: input.potenciaFinalKwpManual,
        topologia: input.topologia,
        tipoTelhado: input.tipoTelhado,
        desvioAzimutal: input.desvioAzimutal,
        inclinacaoGraus: input.inclinacaoGraus,
        premissas: prem as any,
      })

      const quantidadeModulos = input.quantidadeModulosManual && input.quantidadeModulosManual > 0
        ? input.quantidadeModulosManual : sizingResult.quantidadeModulosAproximada
      const portasMicro = input.entradasPorMicro ?? input.portasMicroinversor ?? 1
      const quantidadeInversores = input.quantidadeInversoresManual && input.quantidadeInversoresManual > 0
        ? input.quantidadeInversoresManual
        : input.topologia === 'microinversor'
          ? Math.ceil(quantidadeModulos / portasMicro)
          : input.potenciaInversorKw && input.potenciaInversorKw > 0
            ? (() => {
                const overloadFator = 1 + (input.overloadInversor ?? 0) / 100
                const capacidadeRealKw = input.potenciaInversorKw * overloadFator
                return Math.ceil(sizingResult.potenciaFinalKwp / capacidadeRealKw)
              })()
            : Math.ceil(sizingResult.potenciaFinalKwp / 6)

      const margemAplicada = input.margemOverride ?? Number(prem.margemPadrao)
      const itensCustomizados = gerarItensCustomizadosPadrao(
        sizingResult.potenciaFinalKwp, quantidadeModulos, quantidadeInversores, input.custoKitFotovoltaico,
      )

      const pricingResult = calcularPrecificacao({
        itens: itensCustomizados,
        potenciaKwp: sizingResult.potenciaFinalKwp,
        quantidadeModulos,
        quantidadeInversores,
        metodoPrecificacao: prem.metodoPrecificacao as any,
        margemPadrao: margemAplicada,
        comissao: input.comissao,
      })

      const financialResult = calcularFinanceiro({
        investimentoTotal: pricingResult.precoFinal,
        geracaoAnualKwh: sizingResult.geracaoAnualKwh,
        tarifaInicialKwh: tarifaMedia,
        premissas: {
          inflacaoEnergetica: Number(prem.inflacaoEnergetica),
          taxaDescontoVpl: Number(prem.taxaDescontoVpl),
          perdaEficienciaAnualTradicional: Number(
            input.topologia === 'microinversor'
              ? prem.perdaEficienciaAnualMicroinversor
              : prem.perdaEficienciaAnualTradicional,
          ),
          trocaInversorAnosTradicional: Number(prem.trocaInversorAnosTradicional),
          custoTrocaInversorTrad: Number(prem.custoTrocaInversorTrad),
        },
        topologia: input.topologia,
      })

      const numero = await gerarNumeroProposta(ctx.db, empresaId)

      const [propostaResult] = await ctx.db.insert(proposta).values({
        empresaId, numero,
        clienteId: input.clienteId,
        faturaId: input.faturaId,
        usuarioId, status: 'rascunho', versao: 1,
        dataEmissao: input.dataEmissao,
        dataValidade: input.dataValidade,
        templateOrigemId: input.templateOrigemId,
        observacoesInternas: input.observacoesInternas,
        createdBy: usuarioId,
      }).execute()

      const propostaId = (propostaResult as { insertId: number }).insertId

      await ctx.db.insert(premissasSnapshot).values({
        propostaId,
        dadosJson: { ...prem, congeladoEm: new Date().toISOString() },
      }).execute()

      await ctx.db.insert(dimTable).values({
        propostaId,
        consumoMedioMensalKwh: String(sizingResult.consumoMedioMensal),
        consumoMensalReferencia: consumoMensal,
        tarifaUsada: String(tarifaMedia),
        tipoTelhado: input.tipoTelhado,
        desvioAzimutal: input.desvioAzimutal,
        inclinacaoGraus: input.inclinacaoGraus,
        topologia: input.topologia,
        tipoSistema: 'on_grid',
        potenciaRecomendadaKwp: String(sizingResult.potenciaRecomendadaKwp),
        potenciaFinalKwp: String(sizingResult.potenciaFinalKwp),
        quantidadeModulos,
        potenciaModuloWp: input.potenciaModuloWp ?? 620,
        areaEstimadaM2: String(sizingResult.areaEstimadaM2),
        geracaoMensalKwh: sizingResult.geracaoMensalKwh,
        geracaoAnualKwh: String(sizingResult.geracaoAnualKwh),
        percentualCompensacao: String(sizingResult.percentualCompensacao),
        economiaMensalEstimada: String(sizingResult.economiaMensalEstimada),
        calculadoAutomaticamente: true,
      }).execute()

      if (input.modeloModulo || input.fabricanteModulo) {
        await ctx.db.insert(equipamentoProposta).values({
          propostaId, tipo: 'modulo',
          fabricante: input.fabricanteModulo || undefined,
          modelo: input.modeloModulo || undefined,
          potenciaWp: input.potenciaModuloWp ?? 620,
          quantidade: quantidadeModulos, garantiaAnos: 12, ordem: 1,
        }).execute()
      }

      if (input.modeloInversor || input.fabricanteInversor) {
        await ctx.db.insert(equipamentoProposta).values({
          propostaId,
          tipo: input.topologia === 'microinversor' ? 'microinversor' : 'inversor',
          fabricante: input.fabricanteInversor || undefined,
          modelo: input.modeloInversor || undefined,
          quantidade: quantidadeInversores,
          potenciaWp: input.potenciaInversorKw && input.potenciaInversorKw > 0
            ? input.topologia === 'microinversor'
              ? Math.round(input.potenciaInversorKw)
              : Math.round(input.potenciaInversorKw * 1000)
            : undefined,
          garantiaAnos: input.topologia === 'microinversor' ? 12 : 10,
          ordem: 2,
        }).execute()
      }

      await ctx.db.insert(precTable).values({
        propostaId,
        metodo: prem.metodoPrecificacao as any,
        margemAplicada: String(margemAplicada),
        comissaoAplicada: String(input.comissao),
        custoTotal: String(pricingResult.custoTotal),
        precoVenda: String(pricingResult.precoVenda),
        lucroBruto: String(pricingResult.lucro),
        descontoAplicado: '0',
        precoFinal: String(pricingResult.precoFinal),
      }).execute()

      for (const item of pricingResult.itensDetalhados) {
        await ctx.db.insert(itemPrecTable).values({
          propostaId,
          descricao: item.descricao,
          tipoCusto: item.tipoCusto,
          quantidade: item.quantidade ? String(item.quantidade) : undefined,
          custoUnitario: item.valorPorUnidade ? String(item.valorPorUnidade) : undefined,
          custoTotal: String(item.custoCalculado),
          margem: String(item.margemEfetiva),
          incluso: item.incluso,
        }).execute()
      }

      await ctx.db.insert(afTable).values({
        propostaId,
        investimentoTotal: String(pricingResult.precoFinal),
        economiaMensalAno1: String(financialResult.economiaMensalAno1),
        economiaAnualAno1: String(financialResult.economiaAnualAno1),
        paybackSimplesMeses: financialResult.paybackSimplesMeses,
        paybackDescontadoMeses: financialResult.paybackDescontadoMeses,
        vpl: String(financialResult.vpl),
        tir: String(financialResult.tir),
        rendimentoPrimeiroAnoPct: String(financialResult.rendimentoPrimeiroAnoPct),
        saldo25Anos: String(financialResult.saldo25Anos),
        comparativoPoupanca25a: String(financialResult.comparativoPoupanca25a),
        comparativoRendaFixa25a: String(financialResult.comparativoRendaFixa25a),
        fluxoCaixaJson: financialResult.fluxoCaixa as any,
      }).execute()

      const [emp] = await ctx.db
        .select({ bancoPixChave: empresa.bancoPixChave, bancoNome: empresa.bancoNome })
        .from(empresa).where(eq(empresa.id, empresaId)).limit(1)

      const dadosBancarios = { banco: emp?.bancoNome ?? undefined, pixChave: emp?.bancoPixChave ?? undefined }

      const condicoes = gerarCondicoesCompletasAtomTech(
        propostaId, pricingResult.precoFinal, dadosBancarios, input.descontoAvista, input.marcoParcelas,
      )

      for (const cond of condicoes) {
        const [condResult] = await ctx.db.insert(ccTable).values({
          propostaId, tipo: cond.tipo, descricao: cond.descricao,
          valorTotal: String(cond.valorTotal), ativa: cond.ativa, ordem: cond.ordem,
        }).execute()

        const condId = (condResult as { insertId: number }).insertId

        for (const parcela of cond.parcelas) {
          await ctx.db.insert(ppTable).values({
            condicaoId: condId,
            numeroParcela: parcela.numeroParcela,
            descricaoEvento: parcela.descricaoEvento,
            valor: String(parcela.valor),
            percentualDoTotal: parcela.percentualDoTotal ? String(parcela.percentualDoTotal) : undefined,
            prazoDias: parcela.prazoDias,
            tipoPrazo: parcela.tipoPrazo,
            referenciaEvento: parcela.referenciaEvento,
            meiosPagamento: parcela.meiosPagamento,
            dadosBancariosJson: parcela.dadosBancarios as any,
          }).execute()
        }
      }

      for (const bloco of BLOCOS_PADRAO) {
        await ctx.db.insert(blocoTable).values({
          propostaId, tipoBloco: bloco.tipo, ativo: true, ordem: bloco.ordem,
        }).execute()
      }

      return { propostaId, numero, ok: true }
    }),

  // ─── EDIÇÃO DO DIMENSIONAMENTO ────────────────────────────────────────────
  updateDimensionamento: protectedProcedure
    .input(z.object({
      propostaId: z.number().int().positive(),
      fabricanteModulo: z.string().optional(),
      modeloModulo: z.string().optional(),
      potenciaModuloWp: z.number().optional(),
      quantidadeModulos: z.number().int().positive().optional(),
      fabricanteInversor: z.string().optional(),
      modeloInversor: z.string().optional(),
      potenciaInversorWp: z.number().optional(),
      quantidadeInversores: z.number().int().positive().optional(),
      potenciaFinalKwp: z.number().positive().optional(),
      desvioAzimutal: z.number().optional(),
      inclinacaoGraus: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { propostaId } = input

      const [prop] = await ctx.db.select().from(proposta)
        .where(and(eq(proposta.id, propostaId), eq(proposta.empresaId, ctx.usuario.empresaId)))
        .limit(1)
      if (!prop) throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposta não encontrada' })

      if (input.potenciaFinalKwp) {
        await ctx.db.update(dimTable)
          .set({ potenciaFinalKwp: String(input.potenciaFinalKwp) })
          .where(eq(dimTable.propostaId, propostaId)).execute()
      }

      const equipsAtuais = await ctx.db.select()
        .from(equipamentoProposta).where(eq(equipamentoProposta.propostaId, propostaId))

      for (const equip of equipsAtuais) {
        if (equip.tipo === 'modulo') {
          const updates: any = {}
          if (input.fabricanteModulo !== undefined) updates.fabricante = input.fabricanteModulo
          if (input.modeloModulo !== undefined) updates.modelo = input.modeloModulo
          if (input.potenciaModuloWp !== undefined) updates.potenciaWp = input.potenciaModuloWp
          if (input.quantidadeModulos !== undefined) updates.quantidade = input.quantidadeModulos
          if (Object.keys(updates).length > 0) {
            await ctx.db.update(equipamentoProposta).set(updates)
              .where(eq(equipamentoProposta.id, equip.id)).execute()
          }
        } else if (equip.tipo === 'inversor' || equip.tipo === 'microinversor') {
          const updates: any = {}
          if (input.fabricanteInversor !== undefined) updates.fabricante = input.fabricanteInversor
          if (input.modeloInversor !== undefined) updates.modelo = input.modeloInversor
          if (input.potenciaInversorWp !== undefined) updates.potenciaWp = input.potenciaInversorWp
          if (input.quantidadeInversores !== undefined) updates.quantidade = input.quantidadeInversores
          if (Object.keys(updates).length > 0) {
            await ctx.db.update(equipamentoProposta).set(updates)
              .where(eq(equipamentoProposta.id, equip.id)).execute()
          }
        }
      }

      return { ok: true }
    }),

  // ─── EDIÇÃO DA PRECIFICAÇÃO ───────────────────────────────────────────────
  //
  // ESTRATÉGIA CORRETA (após análise de impacto completa):
  //
  // A tabela itemCustoProposta contém dois grupos de itens por proposta:
  //   1. Item do KIT (descricao LIKE 'Custo de Material%', tipoCusto 'avancado')
  //      → NUNCA deve ser deletado na edição. Apenas atualizado se custoKit mudou.
  //   2. Itens adicionais (Instalação Módulos, Instalação Inversor, Projeto)
  //      → PODEM ser deletados e reinseridos na edição.
  //
  // O bug anterior deletava TODOS os itens (inclusive o kit), causando:
  //   - Aba Precificação sem composição de custos
  //   - custoTotal inconsistente no banco
  //   - Cálculos financeiros baseados em precoFinal incorreto
  //
  updatePrecificacao: protectedProcedure
    .input(z.object({
      propostaId: z.number().int().positive(),
      custoKit: z.number().positive().optional(),
      custoInstalacaoModulos: z.number().min(0).optional(),
      custoInstalacaoInversor: z.number().min(0).optional(),
      custoProjeto: z.number().min(0).optional(),
      comissao: z.number().min(0).optional(),
      margemOverride: z.number().min(0).max(100).optional(),
      descontoAplicado: z.number().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { propostaId } = input

      // Valida proposta
      const [prop] = await ctx.db.select().from(proposta)
        .where(and(eq(proposta.id, propostaId), eq(proposta.empresaId, ctx.usuario.empresaId)))
        .limit(1)
      if (!prop) throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposta não encontrada' })

      // Carrega precificação atual
      const [prec] = await ctx.db.select().from(precTable)
        .where(eq(precTable.propostaId, propostaId)).limit(1)
      if (!prec) throw new TRPCError({ code: 'NOT_FOUND', message: 'Precificação não encontrada' })

      // Carrega itens atuais para calcular custo correto
      const itensAtuais = await ctx.db.select().from(itemPrecTable)
        .where(eq(itemPrecTable.propostaId, propostaId))

      // Identifica o item do kit (nunca deletar)
      const itemKit = itensAtuais.find(i =>
        i.descricao.toLowerCase().includes('kit') ||
        i.descricao.toLowerCase().includes('material') ||
        i.tipoCusto === 'avancado'
      )

      // Custo do kit: usa o novo valor se informado, senão mantém o atual
      const custoKitAtual = itemKit ? Number(itemKit.custoTotal) : Number(prec.custoTotal)
      const custoKit = input.custoKit !== undefined ? input.custoKit : custoKitAtual

      // Custo dos itens adicionais
      const custoAdicional = (input.custoInstalacaoModulos ?? 0) +
                              (input.custoInstalacaoInversor ?? 0) +
                              (input.custoProjeto ?? 0)

      const custoTotal = custoKit + custoAdicional
      const margem = input.margemOverride !== undefined ? input.margemOverride : Number(prec.margemAplicada)
      const comissao = input.comissao !== undefined ? input.comissao : Number(prec.comissaoAplicada ?? 0)
      const desconto = input.descontoAplicado !== undefined ? input.descontoAplicado : Number(prec.descontoAplicado ?? 0)

      const precoVenda = custoTotal * (1 + margem / 100)
      const comissaoValor = precoVenda * (comissao / 100)
      const precoFinal = Number((precoVenda + comissaoValor).toFixed(2))

      // 1. Atualiza tabela de precificação principal
      await ctx.db.update(precTable).set({
        custoTotal: String(custoTotal),
        margemAplicada: String(margem),
        comissaoAplicada: String(comissao),
        precoVenda: String(precoVenda),
        precoFinal: String(precoFinal),
        descontoAplicado: String(desconto),
      }).where(eq(precTable.propostaId, propostaId)).execute()

      // 2. Se custoKit foi alterado, atualiza apenas o item do kit no banco
      if (input.custoKit !== undefined && itemKit && itemKit.id) {
        await ctx.db.update(itemPrecTable)
          .set({ custoTotal: String(custoKit) })
          .where(eq(itemPrecTable.id, itemKit.id))
          .execute()
      }

      // 3. Substitui APENAS os itens adicionais (instalação e projeto)
      //    O item do kit é preservado intacto.
      if (input.custoInstalacaoModulos !== undefined ||
          input.custoInstalacaoInversor !== undefined ||
          input.custoProjeto !== undefined) {

        // Deleta somente os itens adicionais pelo padrão de descrição
        // (nunca toca no item do kit)
        const itensAdicionaisAtuais = itensAtuais.filter(i =>
          DESCRICOES_ADICIONAIS.some(desc => i.descricao.startsWith(desc))
        )

        for (const item of itensAdicionaisAtuais) {
          if (item.id) {
            await ctx.db.delete(itemPrecTable)
              .where(eq(itemPrecTable.id, item.id))
              .execute()
          }
        }

        // Reinsere itens adicionais com os novos valores
        const novosItens: any[] = []

        if (input.custoInstalacaoModulos && input.custoInstalacaoModulos > 0) {
          novosItens.push({
            propostaId,
            descricao: DESC_INSTALACAO_MODULOS,
            tipoCusto: 'fixo' as any,
            custoTotal: String(input.custoInstalacaoModulos),
            margem: '0',
            incluso: true,
          })
        }

        if (input.custoInstalacaoInversor && input.custoInstalacaoInversor > 0) {
          novosItens.push({
            propostaId,
            descricao: DESC_INSTALACAO_INVERSOR,
            tipoCusto: 'fixo' as any,
            custoTotal: String(input.custoInstalacaoInversor),
            margem: '0',
            incluso: true,
          })
        }

        if (input.custoProjeto && input.custoProjeto > 0) {
          novosItens.push({
            propostaId,
            descricao: DESC_PROJETO,
            tipoCusto: 'fixo' as any,
            custoTotal: String(input.custoProjeto),
            margem: '0',
            incluso: true,
          })
        }

        if (novosItens.length > 0) {
          await ctx.db.insert(itemPrecTable).values(novosItens).execute()
        }
      }

      // ── Atualiza condições comerciais proporcionalmente ao novo preço ──────
      const precAnteriorValor = Number(prec.precoFinal)
      if (precAnteriorValor > 0 && Math.abs(precoFinal - precAnteriorValor) > 0.01) {
        const ratio = precoFinal / precAnteriorValor
        const condicoesList = await ctx.db
          .select()
          .from(ccTable)
          .where(eq(ccTable.propostaId, propostaId))

        for (const cond of condicoesList) {
          const novoValorCond = Number(cond.valorTotal) * ratio
          await ctx.db
            .update(ccTable)
            .set({ valorTotal: String(novoValorCond) })
            .where(eq(ccTable.id, cond.id!))
            .execute()

          if (cond.id) {
            const parcelas = await ctx.db
              .select()
              .from(ppTable)
              .where(eq(ppTable.condicaoId, cond.id))

            for (const p of parcelas) {
              await ctx.db
                .update(ppTable)
                .set({ valor: String(Number(p.valor) * ratio) })
                .where(eq(ppTable.id, p.id!))
                .execute()
            }
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      return { ok: true, precoFinal }
    }),

  // ─── EDIÇÃO DAS CONDIÇÕES COMERCIAIS ─────────────────────────────────────
  updateCondicoes: protectedProcedure
    .input(z.object({
      propostaId: z.number().int().positive(),
      condicaoId: z.number().int().positive(),
      descricao: z.string().optional(),
      valorTotal: z.number().optional(),
      parcelas: z.array(z.object({
        id: z.number().int().positive().optional(),
        numeroParcela: z.number().int(),
        descricaoEvento: z.string(),
        valor: z.number(),
        percentualDoTotal: z.number(),
        prazoDias: z.number().default(0),
        tipoPrazo: z.enum(['uteis', 'corridos']).default('corridos'),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { propostaId, condicaoId } = input

      const [prop] = await ctx.db.select().from(proposta)
        .where(and(eq(proposta.id, propostaId), eq(proposta.empresaId, ctx.usuario.empresaId)))
        .limit(1)
      if (!prop) throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposta não encontrada' })

      if (input.parcelas && input.parcelas.length > 0) {
        const totalPct = input.parcelas.reduce((s, p) => s + p.percentualDoTotal, 0)
        if (Math.abs(totalPct - 100) > 0.01) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `A soma dos percentuais deve ser 100%. Atual: ${totalPct.toFixed(1)}%`,
          })
        }
      }

      const updates: any = {}
      if (input.descricao) updates.descricao = input.descricao
      if (input.valorTotal) updates.valorTotal = String(input.valorTotal)
      if (Object.keys(updates).length > 0) {
        await ctx.db.update(condicaoComercialTable).set(updates)
          .where(eq(condicaoComercialTable.id, condicaoId)).execute()
      }

      if (input.parcelas && input.parcelas.length > 0) {
        const valorBase = input.valorTotal ?? Number(
          (await ctx.db.select().from(condicaoComercialTable)
            .where(eq(condicaoComercialTable.id, condicaoId)).limit(1))[0]?.valorTotal ?? 0
        )

        await ctx.db.delete(parcelaCondicaoTable)
          .where(eq(parcelaCondicaoTable.condicaoId, condicaoId)).execute()

        await ctx.db.insert(parcelaCondicaoTable).values(
          input.parcelas.map(p => ({
            condicaoId,
            numeroParcela: p.numeroParcela,
            descricaoEvento: p.descricaoEvento,
            valor: String((valorBase * p.percentualDoTotal) / 100),
            percentualDoTotal: String(p.percentualDoTotal),
            prazoDias: p.prazoDias,
            tipoPrazo: p.tipoPrazo,
            referenciaEvento: `marco_${p.numeroParcela}`,
            meiosPagamento: JSON.stringify(['pix', 'transferencia']),
            dadosBancariosJson: null,
          }))
        ).execute()
      }

      return { ok: true }
    }),

  // Atualiza status
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(['rascunho', 'enviada', 'aceita', 'recusada', 'expirada']),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(proposta)
        .set({ status: input.status })
        .where(and(eq(proposta.id, input.id), eq(proposta.empresaId, ctx.usuario.empresaId)))
        .execute()
      return { ok: true }
    }),

  // Atualiza blocos (ativar/desativar/reordenar)
  updateBlocos: protectedProcedure
    .input(z.object({
      propostaId: z.number().int().positive(),
      blocos: z.array(z.object({
        id: z.number().int().positive(),
        ativo: z.boolean(),
        ordem: z.number().int(),
        textoOverride: z.string().optional().nullable(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      for (const bloco of input.blocos) {
        await ctx.db
          .update(blocoTable)
          .set({ ativo: bloco.ativo, ordem: bloco.ordem, textoOverride: bloco.textoOverride ?? undefined })
          .where(eq(blocoTable.id, bloco.id))
          .execute()
      }
      return { ok: true }
    }),

  // Duplica uma proposta existente (nova versão)
  duplicate: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId, id: usuarioId } = ctx.usuario

      const [original] = await ctx.db
        .select().from(proposta)
        .where(and(eq(proposta.id, input.id), eq(proposta.empresaId, empresaId)))
        .limit(1)

      if (!original) throw new TRPCError({ code: 'NOT_FOUND' })

      const numero = await gerarNumeroProposta(ctx.db, empresaId)
      const hoje = new Date().toISOString().split('T')[0]

      const [result] = await ctx.db.insert(proposta).values({
        ...original,
        id: undefined, numero, status: 'rascunho',
        versao: original.versao + 1,
        propostaPaiId: original.id,
        dataEmissao: hoje,
        createdBy: usuarioId,
        createdAt: undefined,
        updatedAt: undefined,
      }).execute()

      const novoId = (result as { insertId: number }).insertId
      return { propostaId: novoId, numero, ok: true }
    }),

  // Recalcula com novas premissas/inputs
  recalculate: protectedProcedure
    .input(z.object({
      propostaId: z.number().int().positive(),
      consumoMensal: z.array(z.number()).optional(),
      topologia: z.enum(['tradicional', 'microinversor', 'otimizador']).optional(),
      potenciaFinalKwpManual: z.number().optional(),
      custoKitFotovoltaico: z.number().optional(),
      margemOverride: z.number().optional(),
      comissao: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [snap] = await ctx.db.select().from(premissasSnapshot)
        .where(eq(premissasSnapshot.propostaId, input.propostaId)).limit(1)
      if (!snap) throw new TRPCError({ code: 'NOT_FOUND', message: 'Snapshot de premissas não encontrado' })

      const [dimAtual] = await ctx.db.select().from(dimTable)
        .where(eq(dimTable.propostaId, input.propostaId)).limit(1)

      const [precAtual] = await ctx.db.select().from(precTable)
        .where(eq(precTable.propostaId, input.propostaId)).limit(1)

      const premissas = snap.dadosJson as any
      const consumoMensal = input.consumoMensal
        ?? (dimAtual?.consumoMensalReferencia as number[])
        ?? [500]
      const topologia = input.topologia ?? (dimAtual?.topologia as any) ?? 'microinversor'
      const tarifaMedia = Number(dimAtual?.tarifaUsada) || 1.0684

      let novoSizing
      if (input.potenciaFinalKwpManual) {
        const geracaoAnual = input.potenciaFinalKwpManual * 5.6 * 0.785 * 365
        novoSizing = {
          consumoMedioMensal: consumoMensal.reduce((a, b) => a + b, 0) / consumoMensal.length,
          geracaoNecessariaKwh: 0,
          potenciaRecomendadaKwp: input.potenciaFinalKwpManual,
          potenciaFinalKwp: input.potenciaFinalKwpManual,
          quantidadeModulosAproximada: Math.ceil((input.potenciaFinalKwpManual * 1000) / 620),
          areaEstimadaM2: Math.ceil((input.potenciaFinalKwpManual * 1000) / 620) * 2.3 * 1.2,
          geracaoMensalKwh: Array(12).fill(geracaoAnual / 12),
          geracaoAnualKwh: geracaoAnual,
          percentualCompensacao: 100,
          economiaMensalEstimada: (geracaoAnual / 12) * tarifaMedia,
          fatorIrradiacao: 5.6,
          taxaDesempenho: 78.5,
        }
      } else {
        novoSizing = calcularDimensionamento({
          consumoMensalKwh: consumoMensal,
          tarifaMediaKwh: tarifaMedia,
          cip: 0,
          topologia,
          tipoTelhado: (dimAtual?.tipoTelhado as any) ?? 'ceramico',
          desvioAzimutal: dimAtual?.desvioAzimutal ?? 0,
          inclinacaoGraus: dimAtual?.inclinacaoGraus ?? 20,
          premissas,
        })
      }

      await ctx.db.update(dimTable).set({
        consumoMedioMensalKwh: String(novoSizing.consumoMedioMensal),
        potenciaFinalKwp: String(novoSizing.potenciaFinalKwp),
        quantidadeModulos: novoSizing.quantidadeModulosAproximada,
        geracaoAnualKwh: String(novoSizing.geracaoAnualKwh),
        geracaoMensalKwh: novoSizing.geracaoMensalKwh,
        economiaMensalEstimada: String(novoSizing.economiaMensalEstimada),
        calculadoAutomaticamente: !input.potenciaFinalKwpManual,
        editadoEm: input.potenciaFinalKwpManual ? new Date() : undefined,
        editadoPor: input.potenciaFinalKwpManual ? ctx.usuario.id : undefined,
      }).where(eq(dimTable.propostaId, input.propostaId)).execute()

      return { ok: true, sizing: novoSizing }
    }),
// Exclui proposta e todos os registros relacionados
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario

      const [prop] = await ctx.db
        .select()
        .from(proposta)
        .where(and(eq(proposta.id, input.id), eq(proposta.empresaId, empresaId)))
        .limit(1)

      if (!prop) throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposta não encontrada' })

      // Cascata manual: parcelas → condicoes → itens → prec → af → blocos → equips → dim → snapshot → proposta
      const conds = await ctx.db.select({ id: ccTable.id }).from(ccTable).where(eq(ccTable.propostaId, input.id))
      for (const c of conds) {
        await ctx.db.delete(ppTable).where(eq(ppTable.condicaoId, c.id!)).execute()
      }
      await ctx.db.delete(ccTable)             .where(eq(ccTable.propostaId,            input.id)).execute()
      await ctx.db.delete(itemPrecTable)        .where(eq(itemPrecTable.propostaId,       input.id)).execute()
      await ctx.db.delete(precTable)            .where(eq(precTable.propostaId,           input.id)).execute()
      await ctx.db.delete(afTable)              .where(eq(afTable.propostaId,             input.id)).execute()
      await ctx.db.delete(blocoTable)           .where(eq(blocoTable.propostaId,          input.id)).execute()
      await ctx.db.delete(equipamentoProposta)  .where(eq(equipamentoProposta.propostaId, input.id)).execute()
      await ctx.db.delete(dimTable)             .where(eq(dimTable.propostaId,            input.id)).execute()
      await ctx.db.delete(premissasSnapshot)    .where(eq(premissasSnapshot.propostaId,   input.id)).execute()
      await ctx.db.delete(proposta)             .where(eq(proposta.id,                    input.id)).execute()

      return { ok: true }
    }),
  })
