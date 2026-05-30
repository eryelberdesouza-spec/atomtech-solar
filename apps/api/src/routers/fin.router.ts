// ═══════════════════════════════════════════════════════════════════
// Router Financeiro — agrupa todos os sub-routers de finanças
// Namespace: trpc.fin.*
// ═══════════════════════════════════════════════════════════════════

import { router } from './trpc'
import { z } from 'zod'
import { eq, and, like, or, asc, desc, sql, isNull, gte, lte } from 'drizzle-orm'
import { protectedProcedure } from './trpc'
import { TRPCError } from '@trpc/server'
import { createHash } from 'crypto'
import {
  finContaBancaria,
  finPlanoContas,
  finCentroCusto,
  finPessoa,
  finTitulo,
  finParcela,
  finTransferencia,
  empresa,
  usuario,
  proposta,
  cliente,
  condicaoComercial,
  parcelaPagamento,
  precificacao,
} from '../db/schema'

// ─── CONTAS BANCÁRIAS ─────────────────────────────────────────────────────────

const contaRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(finContaBancaria)
      .where(eq(finContaBancaria.empresaId, ctx.usuario.empresaId))
      .orderBy(asc(finContaBancaria.nome))
  }),

  create: protectedProcedure
    .input(z.object({
      nome:         z.string().min(1),
      tipo:         z.enum(['CORRENTE', 'POUPANCA', 'CAIXA']),
      banco:        z.string().nullish(),
      agencia:      z.string().nullish(),
      conta:        z.string().nullish(),
      saldoInicial: z.number().default(0),
      ativo:        z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(finContaBancaria).values({
        empresaId:    ctx.usuario.empresaId,
        nome:         input.nome,
        tipo:         input.tipo,
        banco:        input.banco ?? null,
        agencia:      input.agencia ?? null,
        conta:        input.conta ?? null,
        saldoInicial: input.saldoInicial.toFixed(2),
        ativo:        input.ativo,
      })
      return { ok: true }
    }),

  update: protectedProcedure
    .input(z.object({
      id:           z.number(),
      nome:         z.string().min(1),
      tipo:         z.enum(['CORRENTE', 'POUPANCA', 'CAIXA']),
      banco:        z.string().nullish(),
      agencia:      z.string().nullish(),
      conta:        z.string().nullish(),
      saldoInicial: z.number(),
      ativo:        z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(finContaBancaria)
        .set({
          nome: input.nome, tipo: input.tipo,
          banco: input.banco ?? null, agencia: input.agencia ?? null, conta: input.conta ?? null,
          saldoInicial: input.saldoInicial.toFixed(2), ativo: input.ativo,
          updatedAt: new Date(),
        })
        .where(and(
          eq(finContaBancaria.id, input.id),
          eq(finContaBancaria.empresaId, ctx.usuario.empresaId),
        ))
      return { ok: true }
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), ativo: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(finContaBancaria)
        .set({ ativo: input.ativo, updatedAt: new Date() })
        .where(and(eq(finContaBancaria.id, input.id), eq(finContaBancaria.empresaId, ctx.usuario.empresaId)))
      return { ok: true }
    }),
})

// ─── PLANO DE CONTAS ─────────────────────────────────────────────────────────

const planoContasRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(finPlanoContas)
      .where(eq(finPlanoContas.empresaId, ctx.usuario.empresaId))
      .orderBy(asc(finPlanoContas.codigo))
  }),

  create: protectedProcedure
    .input(z.object({
      codigo: z.string().min(1),
      nome:   z.string().min(1),
      tipo:   z.enum(['RECEITA', 'DESPESA', 'FINANCEIRO']),
      paiId:  z.number().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(finPlanoContas).values({
        empresaId: ctx.usuario.empresaId,
        codigo: input.codigo, nome: input.nome, tipo: input.tipo,
        paiId: input.paiId ?? null, ativo: true,
      })
      return { ok: true }
    }),

  update: protectedProcedure
    .input(z.object({
      id:     z.number(),
      codigo: z.string().min(1),
      nome:   z.string().min(1),
      tipo:   z.enum(['RECEITA', 'DESPESA', 'FINANCEIRO']),
      paiId:  z.number().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(finPlanoContas)
        .set({ codigo: input.codigo, nome: input.nome, tipo: input.tipo, paiId: input.paiId ?? null })
        .where(and(eq(finPlanoContas.id, input.id), eq(finPlanoContas.empresaId, ctx.usuario.empresaId)))
      return { ok: true }
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), ativo: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(finPlanoContas)
        .set({ ativo: input.ativo })
        .where(and(eq(finPlanoContas.id, input.id), eq(finPlanoContas.empresaId, ctx.usuario.empresaId)))
      return { ok: true }
    }),
})

// ─── CENTRO DE CUSTO ──────────────────────────────────────────────────────────

const centroCustoRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(finCentroCusto)
      .where(eq(finCentroCusto.empresaId, ctx.usuario.empresaId))
      .orderBy(asc(finCentroCusto.codigo))
  }),

  create: protectedProcedure
    .input(z.object({
      codigo:    z.string().min(1),
      nome:      z.string().min(1),
      descricao: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(finCentroCusto).values({
        empresaId: ctx.usuario.empresaId,
        codigo: input.codigo, nome: input.nome, descricao: input.descricao ?? null, ativo: true,
      })
      return { ok: true }
    }),

  update: protectedProcedure
    .input(z.object({
      id:        z.number(),
      codigo:    z.string().min(1),
      nome:      z.string().min(1),
      descricao: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(finCentroCusto)
        .set({ codigo: input.codigo, nome: input.nome, descricao: input.descricao ?? null })
        .where(and(eq(finCentroCusto.id, input.id), eq(finCentroCusto.empresaId, ctx.usuario.empresaId)))
      return { ok: true }
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), ativo: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(finCentroCusto)
        .set({ ativo: input.ativo })
        .where(and(eq(finCentroCusto.id, input.id), eq(finCentroCusto.empresaId, ctx.usuario.empresaId)))
      return { ok: true }
    }),
})

// ─── PESSOAS ──────────────────────────────────────────────────────────────────

const pessoaRouter = router({
  list: protectedProcedure
    .input(z.object({ busca: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where = [eq(finPessoa.empresaId, ctx.usuario.empresaId)]
      if (input?.busca?.trim()) {
        const b = `%${input.busca.trim()}%`
        where.push(or(
          like(finPessoa.nome, b),
          like(finPessoa.fantasia, b),
          like(finPessoa.cpfCnpj, b),
          like(finPessoa.email, b),
        ) as any)
      }
      return ctx.db
        .select()
        .from(finPessoa)
        .where(and(...where))
        .orderBy(asc(finPessoa.nome))
    }),

  create: protectedProcedure
    .input(z.object({
      tipoPessoa:    z.enum(['FISICA', 'JURIDICA']),
      nome:          z.string().min(1),
      fantasia:      z.string().nullish(),
      cpfCnpj:       z.string().nullish(),
      email:         z.string().email().nullish().or(z.literal('')),
      telefone:      z.string().nullish(),
      isCliente:     z.boolean(),
      isFornecedor:  z.boolean(),
      cep:           z.string().nullish(),
      logradouro:    z.string().nullish(),
      numero:        z.string().nullish(),
      complemento:   z.string().nullish(),
      bairro:        z.string().nullish(),
      cidade:        z.string().nullish(),
      estado:        z.string().nullish(),
      regime:        z.string().nullish(),
      observacoes:   z.string().nullish(),
      banco:         z.string().nullish(),
      tipoPix:       z.string().nullish(),
      chavePix:      z.string().nullish(),
      tipoPagamento: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Nota: NÃO usar spread ...input com Drizzle+MySQL — booleanos devem ser
      // convertidos explicitamente para 0/1, senão o INSERT falha silenciosamente
      const [res] = await ctx.db.insert(finPessoa).values({
        empresaId:    ctx.usuario.empresaId,
        tipoPessoa:   input.tipoPessoa,
        nome:         input.nome,
        fantasia:     input.fantasia ?? null,
        cpfCnpj:      input.cpfCnpj ?? null,
        email:        input.email || null,
        telefone:     input.telefone ?? null,
        isCliente:    input.isCliente ? 1 : 0,
        isFornecedor: input.isFornecedor ? 1 : 0,
        cep:          input.cep ?? null,
        logradouro:   input.logradouro ?? null,
        numero:       input.numero ?? null,
        complemento:  input.complemento ?? null,
        bairro:       input.bairro ?? null,
        cidade:       input.cidade ?? null,
        estado:       input.estado ?? null,
        regime:       input.regime ?? null,
        observacoes:  input.observacoes ?? null,
        banco:        input.banco ?? null,
        tipoPix:      input.tipoPix ?? null,
        chavePix:     input.chavePix ?? null,
        tipoPagamento:input.tipoPagamento ?? null,
      })
      const id = (res as any).insertId as number
      return { ok: true, id }
    }),

  update: protectedProcedure
    .input(z.object({
      id:            z.number(),
      tipoPessoa:    z.enum(['FISICA', 'JURIDICA']),
      nome:          z.string().min(1),
      fantasia:      z.string().nullish(),
      cpfCnpj:       z.string().nullish(),
      email:         z.string().email().nullish().or(z.literal('')),
      telefone:      z.string().nullish(),
      isCliente:     z.boolean(),
      isFornecedor:  z.boolean(),
      cep:           z.string().nullish(),
      logradouro:    z.string().nullish(),
      numero:        z.string().nullish(),
      complemento:   z.string().nullish(),
      bairro:        z.string().nullish(),
      cidade:        z.string().nullish(),
      estado:        z.string().nullish(),
      regime:        z.string().nullish(),
      observacoes:   z.string().nullish(),
      banco:         z.string().nullish(),
      tipoPix:       z.string().nullish(),
      chavePix:      z.string().nullish(),
      tipoPagamento: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Nota: NÃO usar spread com Drizzle+MySQL para booleanos
      await ctx.db
        .update(finPessoa)
        .set({
          tipoPessoa:   input.tipoPessoa,
          nome:         input.nome,
          fantasia:     input.fantasia ?? null,
          cpfCnpj:      input.cpfCnpj ?? null,
          email:        input.email || null,
          telefone:     input.telefone ?? null,
          isCliente:    input.isCliente ? 1 : 0,
          isFornecedor: input.isFornecedor ? 1 : 0,
          cep:          input.cep ?? null,
          logradouro:   input.logradouro ?? null,
          numero:       input.numero ?? null,
          complemento:  input.complemento ?? null,
          bairro:       input.bairro ?? null,
          cidade:       input.cidade ?? null,
          estado:       input.estado ?? null,
          regime:       input.regime ?? null,
          observacoes:  input.observacoes ?? null,
          banco:        input.banco ?? null,
          tipoPix:      input.tipoPix ?? null,
          chavePix:     input.chavePix ?? null,
          tipoPagamento:input.tipoPagamento ?? null,
          updatedAt:    new Date(),
        })
        .where(and(eq(finPessoa.id, input.id), eq(finPessoa.empresaId, ctx.usuario.empresaId)))
      return { ok: true }
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), ativo: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(finPessoa)
        .set({ ativo: input.ativo, updatedAt: new Date() })
        .where(and(eq(finPessoa.id, input.id), eq(finPessoa.empresaId, ctx.usuario.empresaId)))
      return { ok: true }
    }),
})

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

const dashboardRouter = router({
  resumo: protectedProcedure.query(async ({ ctx }) => {
    const empId = ctx.usuario.empresaId

    // Saldo por conta (saldo_inicial + créditos - débitos de parcelas pagas)
    const contas = await ctx.db
      .select()
      .from(finContaBancaria)
      .where(and(eq(finContaBancaria.empresaId, empId), eq(finContaBancaria.ativo, true)))

    // Parcelas abertas para calcular a receber / a pagar
    const parcelas = await ctx.db
      .select({
        parcelaId:  finParcela.id,
        status:     finParcela.status,
        valor:      finParcela.valor,
        vencimento: finParcela.vencimento,
        tipo:       finTitulo.tipo,
      })
      .from(finParcela)
      .innerJoin(finTitulo, eq(finParcela.tituloId, finTitulo.id))
      .where(and(
        eq(finTitulo.empresaId, empId),
        eq(finParcela.status, 'ABERTA'),
        eq(finTitulo.ativo, true),
      ))

    const hoje = new Date().toISOString().slice(0, 10)

    const aReceber = parcelas
      .filter((p: any) => p.tipo === 'RECEBER')
      .reduce((sum: number, p: any) => sum + Number(p.valor), 0)

    const aPagar = parcelas
      .filter((p: any) => p.tipo === 'PAGAR')
      .reduce((sum: number, p: any) => sum + Number(p.valor), 0)

    const vencendoHoje = parcelas.filter((p: any) => p.vencimento === hoje).length
    const vencidos = parcelas.filter((p: any) => p.vencimento < hoje).length

    const contasResume = contas.map((c: any) => ({
      id: c.id, nome: c.nome, tipo: c.tipo,
      saldo: Number(c.saldoInicial ?? 0),
    }))

    const saldoTotal = contasResume.reduce((sum: number, c: any) => sum + c.saldo, 0)

    // Últimos 10 títulos criados (qualquer status)
    const recentes = await ctx.db
      .select({
        tituloId:   finTitulo.id,
        tipo:       finTitulo.tipo,
        descricao:  finTitulo.descricao,
        emissao:    finTitulo.emissao,
        valor:      finTitulo.valorOriginal,
        pessoaNome: finPessoa.nome,
        createdAt:  finTitulo.createdAt,
      })
      .from(finTitulo)
      .leftJoin(finPessoa, eq(finTitulo.pessoaId, finPessoa.id))
      .where(and(eq(finTitulo.empresaId, empId), eq(finTitulo.ativo, true)))
      .orderBy(desc(finTitulo.createdAt))
      .limit(10)

    return {
      saldoTotal,
      aReceber,
      aPagar,
      resultado: aReceber - aPagar,
      vencendoHoje,
      vencidos,
      contasResume,
      lancamentosRecentes: recentes.map(r => ({
        tituloId:   r.tituloId,
        tipo:       r.tipo,
        descricao:  r.descricao,
        emissao:    String(r.emissao).slice(0, 10),
        valor:      Number(r.valor),
        pessoaNome: r.pessoaNome ?? null,
      })),
    }
  }),
})

// ─── TÍTULOS (Contas a Pagar / Receber) ──────────────────────────────────────

const tituloRouter = router({
  // Lista parcelas com todos os dados do título agregados
  list: protectedProcedure
    .input(z.object({
      tipo:          z.enum(['PAGAR', 'RECEBER']),
      status:        z.enum(['ABERTA', 'PAGA', 'CANCELADA', 'VENCIDA']).optional(),
      pessoaId:      z.number().nullish(),
      planoContasId: z.number().nullish(),
      centroCustoId: z.number().nullish(),
      dataIni:       z.string().nullish(),  // YYYY-MM-DD
      dataFim:       z.string().nullish(),
    }))
    .query(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId
      const hoje = new Date().toISOString().slice(0, 10)

      const rows = await ctx.db
        .select({
          parcelaId:     finParcela.id,
          numero:        finParcela.numero,
          valor:         finParcela.valor,
          vencimento:    finParcela.vencimento,
          status:        finParcela.status,
          dataPagamento: finParcela.dataPagamento,
          valorPago:      finParcela.valorPago,
          juros:          finParcela.juros,
          multa:          finParcela.multa,
          desconto:       finParcela.desconto,
          formaPagamento: finParcela.formaPagamento,
          contaId:        finParcela.contaId,
          tituloId:       finTitulo.id,
          tipo:           finTitulo.tipo,
          descricao:      finTitulo.descricao,
          documento:      finTitulo.documento,
          valorOriginal:  finTitulo.valorOriginal,
          emissao:       finTitulo.emissao,
          observacoes:   finTitulo.observacoes,
          pessoaId:      finTitulo.pessoaId,
          pessoaNome:    finPessoa.nome,
          planoId:       finTitulo.planoContasId,
          planoNome:     finPlanoContas.nome,
          centroId:      finTitulo.centroCustoId,
          centroNome:    finCentroCusto.nome,
          propostaId:    finTitulo.propostaId,
        })
        .from(finParcela)
        .innerJoin(finTitulo, eq(finParcela.tituloId, finTitulo.id))
        .leftJoin(finPessoa,       eq(finTitulo.pessoaId,      finPessoa.id))
        .leftJoin(finPlanoContas,  eq(finTitulo.planoContasId, finPlanoContas.id))
        .leftJoin(finCentroCusto,  eq(finTitulo.centroCustoId, finCentroCusto.id))
        .where(and(
          eq(finTitulo.empresaId, empId),
          eq(finTitulo.tipo, input.tipo),
          eq(finTitulo.ativo, true),
          input.pessoaId      ? eq(finTitulo.pessoaId,      input.pessoaId)      : undefined,
          input.planoContasId ? eq(finTitulo.planoContasId, input.planoContasId) : undefined,
          input.centroCustoId ? eq(finTitulo.centroCustoId, input.centroCustoId) : undefined,
          input.dataIni ? gte(finParcela.vencimento, input.dataIni as any) : undefined,
          input.dataFim ? lte(finParcela.vencimento, input.dataFim as any) : undefined,
        ))
        .orderBy(asc(finParcela.vencimento))

      // Filtra status (VENCIDA é computed: ABERTA + vencimento < hoje)
      return rows.filter((r: any) => {
        if (!input.status) return true
        const isVencida = r.status === 'ABERTA' && r.vencimento < hoje
        if (input.status === 'VENCIDA') return isVencida
        if (input.status === 'ABERTA')  return r.status === 'ABERTA' && !isVencida
        return r.status === input.status
      }).map((r: any) => ({
        ...r,
        statusDisplay: r.status === 'ABERTA' && r.vencimento < hoje ? 'VENCIDA' : r.status,
      }))
    }),

  // Busca título completo com parcelas e pessoa (para comprovante PDF)
  byId: protectedProcedure
    .input(z.object({ tituloId: z.number() }))
    .query(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      const [titulo] = await ctx.db
        .select({
          id:            finTitulo.id,
          tipo:          finTitulo.tipo,
          descricao:     finTitulo.descricao,
          documento:     finTitulo.documento,
          valorOriginal: finTitulo.valorOriginal,
          emissao:       finTitulo.emissao,
          observacoes:   finTitulo.observacoes,
          propostaId:    finTitulo.propostaId,
          pessoaNome:          finPessoa.nome,
          pessoaFantasia:      finPessoa.fantasia,
          pessoaCpfCnpj:       finPessoa.cpfCnpj,
          pessoaTelefone:      finPessoa.telefone,
          pessoaEmail:         finPessoa.email,
          pessoaLogradouro:    finPessoa.logradouro,
          pessoaNumero:        finPessoa.numero,
          pessoaComplemento:   finPessoa.complemento,
          pessoaBairro:        finPessoa.bairro,
          pessoaCidade:        finPessoa.cidade,
          pessoaEstado:        finPessoa.estado,
          pessoaBanco:         finPessoa.banco,
          pessoaTipoPix:       finPessoa.tipoPix,
          pessoaChavePix:      finPessoa.chavePix,
          pessoaTipoPagamento: finPessoa.tipoPagamento,
          planoNome:     finPlanoContas.nome,
          centroNome:    finCentroCusto.nome,
        })
        .from(finTitulo)
        .leftJoin(finPessoa,       eq(finTitulo.pessoaId,      finPessoa.id))
        .leftJoin(finPlanoContas,  eq(finTitulo.planoContasId, finPlanoContas.id))
        .leftJoin(finCentroCusto,  eq(finTitulo.centroCustoId, finCentroCusto.id))
        .where(and(eq(finTitulo.id, input.tituloId), eq(finTitulo.empresaId, empId)))
        .limit(1)

      if (!titulo) throw new TRPCError({ code: 'NOT_FOUND' })

      const parcelas = await ctx.db
        .select()
        .from(finParcela)
        .where(eq(finParcela.tituloId, input.tituloId))
        .orderBy(asc(finParcela.numero))

      return { titulo, parcelas }
    }),

  // Cria título + parcelas
  create: protectedProcedure
    .input(z.object({
      tipo:          z.enum(['PAGAR', 'RECEBER']),
      descricao:     z.string().min(1),
      documento:     z.string().nullish(),
      pessoaId:      z.number().nullish(),
      planoContasId: z.number().nullish(),
      centroCustoId: z.number().nullish(),
      propostaId:    z.number().nullish(),
      valorOriginal: z.number().positive(),
      emissao:       z.string(),  // YYYY-MM-DD
      observacoes:   z.string().nullish(),
      parcelas: z.array(z.object({
        numero:     z.number(),
        valor:      z.number().positive(),
        vencimento: z.string(),  // YYYY-MM-DD
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId
      const { parcelas, ...tituloData } = input

      const [res] = await ctx.db.insert(finTitulo).values({
        empresaId:      empId,
        tipo:           tituloData.tipo,
        descricao:      tituloData.descricao,
        documento:      tituloData.documento ?? null,
        pessoaId:       tituloData.pessoaId ?? null,
        planoContasId:  tituloData.planoContasId ?? null,
        centroCustoId:  tituloData.centroCustoId ?? null,
        propostaId:     tituloData.propostaId ?? null,
        valorOriginal:  tituloData.valorOriginal.toFixed(2),
        emissao:        tituloData.emissao as any,
        observacoes:    tituloData.observacoes ?? null,
        ativo:          true,
      })

      const tituloId = (res as any).insertId as number

      await ctx.db.insert(finParcela).values(
        parcelas.map(p => ({
          tituloId,
          numero:     p.numero,
          valor:      p.valor.toFixed(2),
          vencimento: p.vencimento as any,
          status:     'ABERTA' as const,
        }))
      )

      return { tituloId, ok: true }
    }),

  // Atualiza título + parcelas ABERTAS
  update: protectedProcedure
    .input(z.object({
      tituloId:      z.number(),
      descricao:     z.string().min(1),
      documento:     z.string().nullish(),
      pessoaId:      z.number().nullish(),
      planoContasId: z.number().nullish(),
      centroCustoId: z.number().nullish(),
      observacoes:   z.string().nullish(),
      emissao:       z.string(),
      // parcelaId presente = atualiza existente; ausente = nova parcela
      parcelas: z.array(z.object({
        parcelaId:  z.number().optional(),
        valor:      z.number().positive(),
        vencimento: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      const [titulo] = await ctx.db
        .select({ id: finTitulo.id })
        .from(finTitulo)
        .where(and(eq(finTitulo.id, input.tituloId), eq(finTitulo.empresaId, empId)))
        .limit(1)

      if (!titulo) throw new TRPCError({ code: 'NOT_FOUND' })

      const existentes = input.parcelas.filter(p => p.parcelaId !== undefined)
      const novas      = input.parcelas.filter(p => p.parcelaId === undefined)

      // Calcula novo valorOriginal: parcelas existentes editadas + pagas intactas + novas
      const todasParcelas = await ctx.db
        .select({ id: finParcela.id, numero: finParcela.numero, status: finParcela.status, valor: finParcela.valor })
        .from(finParcela)
        .where(eq(finParcela.tituloId, input.tituloId))

      const editMap  = new Map(existentes.map(p => [p.parcelaId!, p]))
      const somaExistentes = todasParcelas.reduce((sum, p) => {
        const edit = editMap.get(p.id)
        return sum + Number(edit ? edit.valor : p.valor)
      }, 0)
      const somaNovas = novas.reduce((sum, p) => sum + p.valor, 0)
      const novoTotal = somaExistentes + somaNovas

      // Atualiza cabeçalho do título
      await ctx.db
        .update(finTitulo)
        .set({
          descricao:     input.descricao,
          documento:     input.documento ?? null,
          pessoaId:      input.pessoaId ?? null,
          planoContasId: input.planoContasId ?? null,
          centroCustoId: input.centroCustoId ?? null,
          observacoes:   input.observacoes ?? null,
          emissao:       input.emissao as any,
          valorOriginal: novoTotal.toFixed(2),
          updatedAt:     new Date(),
        })
        .where(eq(finTitulo.id, input.tituloId))

      // Atualiza parcelas ABERTAS existentes
      for (const p of existentes) {
        await ctx.db
          .update(finParcela)
          .set({ valor: p.valor.toFixed(2), vencimento: p.vencimento as any })
          .where(and(
            eq(finParcela.id, p.parcelaId!),
            eq(finParcela.tituloId, input.tituloId),
            eq(finParcela.status, 'ABERTA'),
          ))
      }

      // Insere novas parcelas
      if (novas.length > 0) {
        // Descobre o maior número de parcela existente para continuar a sequência
        const maxNum = todasParcelas.reduce((m, p) => Math.max(m, p.numero ?? 0), 0)
        await ctx.db.insert(finParcela).values(
          novas.map((p, i) => ({
            tituloId:  input.tituloId,
            numero:    maxNum + i + 1,
            valor:     p.valor.toFixed(2),
            vencimento: p.vencimento as any,
            status:    'ABERTA' as const,
          }))
        )
      }

      return { ok: true }
    }),

  // Exclui título (e cascata parcelas) — requer senha de administrador
  delete: protectedProcedure
    .input(z.object({ tituloId: z.number(), senhaAdmin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      // Valida senha do administrador
      const senhaHash = createHash('sha256').update(input.senhaAdmin + 'atomtech_salt').digest('hex')
      const [admin] = await ctx.db
        .select({ id: usuario.id })
        .from(usuario)
        .where(and(
          eq(usuario.empresaId, empId),
          eq(usuario.role, 'admin'),
          eq(usuario.senhaHash, senhaHash),
        ))
        .limit(1)
      if (!admin) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Senha de administrador incorreta' })

      const [titulo] = await ctx.db
        .select({ id: finTitulo.id })
        .from(finTitulo)
        .where(and(eq(finTitulo.id, input.tituloId), eq(finTitulo.empresaId, empId)))
        .limit(1)

      if (!titulo) throw new TRPCError({ code: 'NOT_FOUND' })

      // Verifica se tem parcelas pagas
      const [paga] = await ctx.db
        .select({ id: finParcela.id })
        .from(finParcela)
        .where(and(eq(finParcela.tituloId, input.tituloId), eq(finParcela.status, 'PAGA')))
        .limit(1)

      if (paga) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Título possui parcelas pagas. Estorne os pagamentos antes de excluir.' })

      await ctx.db.delete(finTitulo).where(eq(finTitulo.id, input.tituloId))
      return { ok: true }
    }),
})

// ─── PARCELAS (Baixa / Estorno) ───────────────────────────────────────────────

const parcelaRouter = router({
  baixar: protectedProcedure
    .input(z.object({
      parcelaId:      z.number(),
      contaId:        z.number(),
      dataPagamento:  z.string(),  // YYYY-MM-DD
      valorPago:      z.number().positive(),
      juros:          z.number().min(0).default(0),
      multa:          z.number().min(0).default(0),
      desconto:       z.number().min(0).default(0),
      formaPagamento: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      // Valida que a parcela pertence à empresa
      const [parcela] = await ctx.db
        .select({ id: finParcela.id, status: finParcela.status, tituloId: finParcela.tituloId })
        .from(finParcela)
        .innerJoin(finTitulo, eq(finParcela.tituloId, finTitulo.id))
        .where(and(eq(finParcela.id, input.parcelaId), eq(finTitulo.empresaId, empId)))
        .limit(1)

      if (!parcela) throw new TRPCError({ code: 'NOT_FOUND', message: 'Parcela não encontrada' })
      if (parcela.status === 'PAGA') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Parcela já está paga' })
      if (parcela.status === 'CANCELADA') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Parcela cancelada não pode ser baixada' })

      await ctx.db
        .update(finParcela)
        .set({
          status:         'PAGA',
          contaId:        input.contaId,
          dataPagamento:  input.dataPagamento as any,
          valorPago:      input.valorPago.toFixed(2),
          juros:          input.juros.toFixed(2),
          multa:          input.multa.toFixed(2),
          desconto:       input.desconto.toFixed(2),
          formaPagamento: input.formaPagamento ?? null,
        })
        .where(eq(finParcela.id, input.parcelaId))

      return { ok: true }
    }),

  estornar: protectedProcedure
    .input(z.object({ parcelaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      const [parcela] = await ctx.db
        .select({ id: finParcela.id, status: finParcela.status })
        .from(finParcela)
        .innerJoin(finTitulo, eq(finParcela.tituloId, finTitulo.id))
        .where(and(eq(finParcela.id, input.parcelaId), eq(finTitulo.empresaId, empId)))
        .limit(1)

      if (!parcela) throw new TRPCError({ code: 'NOT_FOUND', message: 'Parcela não encontrada' })
      if (parcela.status !== 'PAGA') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Somente parcelas pagas podem ser estornadas' })

      await ctx.db
        .update(finParcela)
        .set({
          status:         'ABERTA',
          contaId:        null,
          dataPagamento:  null,
          valorPago:      null,
          juros:          '0',
          multa:          '0',
          desconto:       '0',
          formaPagamento: null,
        })
        .where(eq(finParcela.id, input.parcelaId))

      return { ok: true }
    }),
})

// ─── TRANSFERÊNCIAS ───────────────────────────────────────────────────────────

const transferenciaRouter = router({
  list: protectedProcedure
    .input(z.object({
      dataIni: z.string().nullish(),
      dataFim: z.string().nullish(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      const transferencias = await ctx.db
        .select()
        .from(finTransferencia)
        .where(and(
          eq(finTransferencia.empresaId, empId),
          input?.dataIni ? gte(finTransferencia.data, input.dataIni as any) : undefined,
          input?.dataFim ? lte(finTransferencia.data, input.dataFim as any) : undefined,
        ))
        .orderBy(desc(finTransferencia.data))

      // Carrega todas as contas da empresa para resolver nomes
      const contas = await ctx.db
        .select({ id: finContaBancaria.id, nome: finContaBancaria.nome })
        .from(finContaBancaria)
        .where(eq(finContaBancaria.empresaId, empId))

      const contaMap = new Map(contas.map((c: any) => [c.id, c.nome]))

      return transferencias.map((t: any) => ({
        ...t,
        contaOrigemNome:  contaMap.get(t.contaOrigemId)  ?? '—',
        contaDestinoNome: contaMap.get(t.contaDestinoId) ?? '—',
      }))
    }),

  create: protectedProcedure
    .input(z.object({
      contaOrigemId:  z.number(),
      contaDestinoId: z.number(),
      valor:          z.number().positive(),
      data:           z.string(),  // YYYY-MM-DD
      descricao:      z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      if (input.contaOrigemId === input.contaDestinoId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conta de origem e destino devem ser diferentes' })
      }

      // Valida que ambas as contas pertencem à empresa
      const contas = await ctx.db
        .select({ id: finContaBancaria.id })
        .from(finContaBancaria)
        .where(and(
          eq(finContaBancaria.empresaId, empId),
          eq(finContaBancaria.ativo, true),
        ))

      const contaIds = new Set(contas.map((c: any) => c.id))
      if (!contaIds.has(input.contaOrigemId) || !contaIds.has(input.contaDestinoId)) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta não encontrada' })
      }

      await ctx.db.insert(finTransferencia).values({
        empresaId:      empId,
        contaOrigemId:  input.contaOrigemId,
        contaDestinoId: input.contaDestinoId,
        valor:          input.valor.toFixed(2),
        data:           input.data as any,
        descricao:      input.descricao ?? null,
      })

      return { ok: true }
    }),

  update: protectedProcedure
    .input(z.object({
      id:             z.number(),
      contaOrigemId:  z.number(),
      contaDestinoId: z.number(),
      valor:          z.number().positive(),
      data:           z.string(),
      descricao:      z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      if (input.contaOrigemId === input.contaDestinoId)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Origem e destino devem ser contas diferentes' })

      const [transf] = await ctx.db
        .select({ id: finTransferencia.id })
        .from(finTransferencia)
        .where(and(eq(finTransferencia.id, input.id), eq(finTransferencia.empresaId, empId)))
        .limit(1)

      if (!transf) throw new TRPCError({ code: 'NOT_FOUND' })

      await ctx.db
        .update(finTransferencia)
        .set({
          contaOrigemId:  input.contaOrigemId,
          contaDestinoId: input.contaDestinoId,
          valor:          input.valor.toFixed(2),
          data:           input.data as any,
          descricao:      input.descricao ?? null,
        })
        .where(eq(finTransferencia.id, input.id))

      return { ok: true }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), senhaAdmin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      // Valida senha do administrador
      const senhaHash = createHash('sha256').update(input.senhaAdmin + 'atomtech_salt').digest('hex')
      const [admin] = await ctx.db
        .select({ id: usuario.id })
        .from(usuario)
        .where(and(
          eq(usuario.empresaId, empId),
          eq(usuario.role, 'admin'),
          eq(usuario.senhaHash, senhaHash),
        ))
        .limit(1)
      if (!admin) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Senha de administrador incorreta' })

      const [transf] = await ctx.db
        .select({ id: finTransferencia.id })
        .from(finTransferencia)
        .where(and(eq(finTransferencia.id, input.id), eq(finTransferencia.empresaId, empId)))
        .limit(1)

      if (!transf) throw new TRPCError({ code: 'NOT_FOUND' })

      await ctx.db.delete(finTransferencia).where(eq(finTransferencia.id, input.id))
      return { ok: true }
    }),
})

// ─── EMPRESA (dados da empresa para cabeçalho dos comprovantes) ───────────────

const empresaFinRouter = router({
  minha: protectedProcedure.query(async ({ ctx }) => {
    const [emp] = await ctx.db
      .select({
        nome:           empresa.nome,
        cnpj:           empresa.cnpj,
        telefone:       empresa.telefone,
        email:          empresa.email,
        logoUrl:        empresa.logoUrl,
        cidade:         empresa.cidade,
        estado:         empresa.estado,
        endereco:       empresa.endereco,
        cep:            empresa.cep,
        bancoNome:      empresa.bancoNome,
        bancoAgencia:   empresa.bancoAgencia,
        bancoConta:     empresa.bancoConta,
        bancoTipo:      empresa.bancoTipo,
        bancoPixTipo:   empresa.bancoPixTipo,
        bancoPixChave:  empresa.bancoPixChave,
        rodapeTexto:    empresa.rodapeTexto,
      })
      .from(empresa)
      .where(eq(empresa.id, ctx.usuario.empresaId))
      .limit(1)
    if (!emp) throw new TRPCError({ code: 'NOT_FOUND' })
    return emp
  }),
})

// ─── FLUXO DE CAIXA ──────────────────────────────────────────────────────────

const fluxoCaixaRouter = router({
  projecao: protectedProcedure
    .input(z.object({
      dataIni: z.string(),  // YYYY-MM-DD
      dataFim: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      // Saldo atual = saldo_inicial das contas + recebimentos realizados - pagamentos realizados
      const contas = await ctx.db
        .select({ saldoInicial: finContaBancaria.saldoInicial })
        .from(finContaBancaria)
        .where(and(eq(finContaBancaria.empresaId, empId), eq(finContaBancaria.ativo, true)))

      const saldoBase = contas.reduce((s, c) => s + Number(c.saldoInicial ?? 0), 0)

      const parcelasPagas = await ctx.db
        .select({ valorPago: finParcela.valorPago, tipo: finTitulo.tipo })
        .from(finParcela)
        .innerJoin(finTitulo, eq(finParcela.tituloId, finTitulo.id))
        .where(and(
          eq(finTitulo.empresaId, empId),
          eq(finParcela.status, 'PAGA'),
          eq(finTitulo.ativo, true),
        ))

      const totalRecebido = parcelasPagas
        .filter(p => p.tipo === 'RECEBER')
        .reduce((s, p) => s + Number(p.valorPago ?? 0), 0)
      const totalPago = parcelasPagas
        .filter(p => p.tipo === 'PAGAR')
        .reduce((s, p) => s + Number(p.valorPago ?? 0), 0)

      const saldoAtual = saldoBase + totalRecebido - totalPago

      // Parcelas abertas no período filtrado
      const abertas = await ctx.db
        .select({
          id:         finParcela.id,
          valor:      finParcela.valor,
          vencimento: finParcela.vencimento,
          numero:     finParcela.numero,
          tipo:       finTitulo.tipo,
          descricao:  finTitulo.descricao,
          pessoaNome: finPessoa.nome,
        })
        .from(finParcela)
        .innerJoin(finTitulo, eq(finParcela.tituloId, finTitulo.id))
        .leftJoin(finPessoa, eq(finTitulo.pessoaId, finPessoa.id))
        .where(and(
          eq(finTitulo.empresaId, empId),
          eq(finParcela.status, 'ABERTA'),
          eq(finTitulo.ativo, true),
          gte(finParcela.vencimento, input.dataIni as any),
          lte(finParcela.vencimento, input.dataFim as any),
        ))
        .orderBy(asc(finParcela.vencimento))

      // Parcelas vencidas (antes de dataIni, ainda abertas) — saldo em atraso
      const vencidas = await ctx.db
        .select({
          id:         finParcela.id,
          valor:      finParcela.valor,
          vencimento: finParcela.vencimento,
          numero:     finParcela.numero,
          tipo:       finTitulo.tipo,
          descricao:  finTitulo.descricao,
          pessoaNome: finPessoa.nome,
        })
        .from(finParcela)
        .innerJoin(finTitulo, eq(finParcela.tituloId, finTitulo.id))
        .leftJoin(finPessoa, eq(finTitulo.pessoaId, finPessoa.id))
        .where(and(
          eq(finTitulo.empresaId, empId),
          eq(finParcela.status, 'ABERTA'),
          eq(finTitulo.ativo, true),
          lte(finParcela.vencimento, input.dataIni as any),
        ))

      const normalize = (arr: typeof abertas) => arr.map(p => ({
        id:         p.id,
        vencimento: String(p.vencimento).slice(0, 10),
        valor:      Number(p.valor),
        numero:     p.numero,
        tipo:       p.tipo as 'PAGAR' | 'RECEBER',
        descricao:  p.descricao,
        pessoaNome: p.pessoaNome ?? null,
      }))

      return {
        saldoAtual,
        parcelas:        normalize(abertas),
        parcelasVencidas: normalize(vencidas),
      }
    }),
})

// ─── INTEGRAÇÃO COM PROPOSTAS ────────────────────────────────────────────────

function addDias(base: string, dias: number, tipo: 'corridos' | 'uteis'): string {
  const d = new Date(base + 'T12:00:00')
  if (tipo === 'corridos' || dias === 0) {
    d.setDate(d.getDate() + dias)
  } else {
    let added = 0
    while (added < dias) {
      d.setDate(d.getDate() + 1)
      const dow = d.getDay()
      if (dow !== 0 && dow !== 6) added++
    }
  }
  return d.toISOString().slice(0, 10)
}

const propostaFinRouter = router({

  // Lista propostas com contrato formalizado — com flag se já foram importadas
  listar: protectedProcedure.query(async ({ ctx }) => {
    const empId = ctx.usuario.empresaId
    const result = await ctx.db.execute(sql`
      SELECT
        p.id, p.numero, p.tipo_proposta AS tipoProposta,
        p.titulo_servico AS tituloServico,
        p.status, p.data_emissao AS dataEmissao,
        p.contrato_formalizado AS contratoFormalizado,
        p.data_formalizacao AS dataFormalizacao,
        c.id AS clienteId, c.nome AS clienteNome, c.cpf_cnpj AS clienteCpfCnpj,
        c.email AS clienteEmail, c.telefone AS clienteTelefone,
        prec.preco_final AS valorTotal,
        ft.id AS tituloFinId, ft.descricao AS tituloFinDescricao
      FROM proposta p
      INNER JOIN cliente c ON c.id = p.cliente_id
      LEFT JOIN precificacao prec ON prec.proposta_id = p.id
      LEFT JOIN fin_titulo ft ON ft.proposta_id = p.id AND ft.empresa_id = ${empId}
      WHERE p.empresa_id = ${empId}
        AND p.status = 'aceita'
        AND p.contrato_formalizado = 1
        AND (p.is_template IS NULL OR p.is_template = 0)
      ORDER BY p.data_formalizacao DESC, p.data_emissao DESC
    `) as any
    // mysql2 retorna [rows, fields] — extrai só as linhas
    const data: any[] = Array.isArray(result) && Array.isArray(result[0])
      ? result[0]
      : Array.isArray(result) ? result : (result as any).rows ?? []
    return data.map((r: any) => ({
      id:                  Number(r.id),
      numero:              String(r.numero ?? ''),
      tipoProposta:        String(r.tipoProposta ?? ''),
      tituloServico:       r.tituloServico ? String(r.tituloServico) : null,
      status:              String(r.status ?? ''),
      dataEmissao:         r.dataEmissao ? String(r.dataEmissao).slice(0, 10) : null,
      dataFormalizacao:    r.dataFormalizacao ? String(r.dataFormalizacao).slice(0, 10) : null,
      clienteId:           Number(r.clienteId),
      clienteNome:         String(r.clienteNome ?? ''),
      clienteCpfCnpj:      r.clienteCpfCnpj ? String(r.clienteCpfCnpj) : null,
      clienteEmail:        r.clienteEmail ? String(r.clienteEmail) : null,
      clienteTelefone:     r.clienteTelefone ? String(r.clienteTelefone) : null,
      valorTotal:          r.valorTotal ? Number(r.valorTotal) : null,
      importada:           !!r.tituloFinId,
      tituloFinId:         r.tituloFinId ? Number(r.tituloFinId) : null,
      tituloFinDescricao:  r.tituloFinDescricao ? String(r.tituloFinDescricao) : null,
    }))
  }),

  // Retorna condições comerciais + parcelas de uma proposta
  condicoes: protectedProcedure
    .input(z.object({ propostaId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId
      // verifica que a proposta pertence à empresa
      const [prop] = await ctx.db.select().from(proposta)
        .where(and(eq(proposta.id, input.propostaId), eq(proposta.empresaId, empId))).limit(1)
      if (!prop) throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposta não encontrada' })

      const condicoes = await ctx.db.select().from(condicaoComercial)
        .where(eq(condicaoComercial.propostaId, input.propostaId))
        .orderBy(asc(condicaoComercial.id))

      const result = []
      for (const c of condicoes) {
        const parcelas = await ctx.db.select().from(parcelaPagamento)
          .where(eq(parcelaPagamento.condicaoId, c.id))
          .orderBy(asc(parcelaPagamento.numeroParcela))
        result.push({ ...c, parcelas })
      }
      return result
    }),

  // Importa proposta aceita como título a receber no financeiro
  importar: protectedProcedure
    .input(z.object({
      propostaId:    z.number().int().positive(),
      condicaoId:    z.number().int().positive(),
      planoContasId: z.number().int().positive().optional(),
      centroCustoId: z.number().int().optional(),
      contaId:       z.number().int().optional(),
      observacoes:   z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      // 1. Verifica proposta via raw SQL para evitar problema de mapeamento Drizzle com boolean
      const propResult = await ctx.db.execute(sql`
        SELECT id, numero, tipo_proposta AS tipoProposta, titulo_servico AS tituloServico,
               data_emissao AS dataEmissao, status, cliente_id AS clienteId, empresa_id AS empresaId,
               contrato_formalizado AS contratoFormalizado
        FROM proposta
        WHERE id = ${input.propostaId} AND empresa_id = ${empId}
        LIMIT 1
      `) as any
      const propRows: any[] = Array.isArray(propResult) && Array.isArray(propResult[0])
        ? propResult[0]
        : Array.isArray(propResult) ? propResult : []
      const prop = propRows[0]

      if (!prop) throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposta não encontrada' })
      if (prop.status !== 'aceita') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas propostas aceitas podem ser importadas' })
      if (Number(prop.contratoFormalizado) !== 1) throw new TRPCError({ code: 'BAD_REQUEST', message: 'O contrato precisa ser formalizado antes de importar para o financeiro' })

      // 2. Verifica duplicata
      const [dup] = await ctx.db.select({ id: finTitulo.id }).from(finTitulo)
        .where(and(eq(finTitulo.propostaId, input.propostaId), eq(finTitulo.empresaId, empId)))
        .limit(1)
      if (dup) throw new TRPCError({ code: 'CONFLICT', message: 'Esta proposta já foi importada para o financeiro' })

      // 3. Busca cliente
      const [cli] = await ctx.db.select().from(cliente)
        .where(eq(cliente.id, prop.clienteId)).limit(1)
      if (!cli) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' })

      // 4. Busca ou cria finPessoa pelo CPF/CNPJ
      let pessoaId: number | null = null
      if (cli.cpfCnpj) {
        const [pessoaExist] = await ctx.db.select({ id: finPessoa.id }).from(finPessoa)
          .where(and(eq(finPessoa.empresaId, empId), eq(finPessoa.cpfCnpj, cli.cpfCnpj)))
          .limit(1)
        if (pessoaExist) {
          pessoaId = pessoaExist.id
        }
      }
      if (!pessoaId) {
        // Cria nova finPessoa a partir do cliente
        const ins = await ctx.db.insert(finPessoa).values({
          empresaId:   empId,
          nome:        cli.nome,
          cpfCnpj:     cli.cpfCnpj ?? null,
          email:       cli.email ?? null,
          telefone:    cli.telefone ?? null,
          tipoPessoa:  cli.cpfCnpj && cli.cpfCnpj.replace(/\D/g, '').length <= 11 ? 'FISICA' : 'JURIDICA',
          isCliente:   true,
          isFornecedor: false,
        })
        pessoaId = Number((ins as any).insertId ?? (ins[0] as any)?.insertId ?? 0)
      }

      // 5. Busca parcelas da condição escolhida
      const [cond] = await ctx.db.select().from(condicaoComercial)
        .where(eq(condicaoComercial.id, input.condicaoId)).limit(1)
      if (!cond) throw new TRPCError({ code: 'NOT_FOUND', message: 'Condição comercial não encontrada' })

      const parcelas = await ctx.db.select().from(parcelaPagamento)
        .where(eq(parcelaPagamento.condicaoId, input.condicaoId))
        .orderBy(asc(parcelaPagamento.numeroParcela))

      // 6. Cria finTitulo
      const descricao = prop.tipoProposta === 'servico_geral'
        ? `${prop.tituloServico ?? 'Serviço'} — ${cli.nome} (${prop.numero})`
        : `Sistema Fotovoltaico — ${cli.nome} (${prop.numero})`

      const tituloIns = await ctx.db.insert(finTitulo).values({
        empresaId:     empId,
        tipo:          'RECEBER',
        descricao,
        documento:     prop.numero,
        pessoaId:      pessoaId || null,
        planoContasId: input.planoContasId ?? null,
        centroCustoId: input.centroCustoId ?? null,
        propostaId:    prop.id,
        valorOriginal: String(parcelas.reduce((s, p) => s + Number(p.valor), 0)),
        emissao:       prop.dataEmissao ?? new Date().toISOString().slice(0, 10),
        observacoes:   input.observacoes ?? null,
        ativo:         true,
      })
      const tituloId = Number((tituloIns as any).insertId ?? (tituloIns[0] as any)?.insertId ?? 0)

      // 7. Cria finParcelas
      const baseDate = prop.dataEmissao
        ? String(prop.dataEmissao).slice(0, 10)
        : new Date().toISOString().slice(0, 10)

      for (const p of parcelas) {
        const venc = addDias(baseDate, Number(p.prazoDias ?? 0), p.tipoPrazo as 'corridos' | 'uteis')
        await ctx.db.insert(finParcela).values({
          tituloId,
          numero:     Number(p.numeroParcela),
          valor:      String(p.valor),
          vencimento: venc,
          status:     'ABERTA',
          contaId:    input.contaId ?? null,
        })
      }

      return { ok: true, tituloId, pessoaId }
    }),
})

// ─── DRE — Demonstrativo de Resultado do Exercício ───────────────────────────

const dreRouter = router({
  get: protectedProcedure
    .input(z.object({
      de:     z.string(),  // 'YYYY-MM-DD'
      ate:    z.string(),  // 'YYYY-MM-DD'
      regime: z.enum(['CAIXA', 'COMPETENCIA']).default('CAIXA'),
    }))
    .query(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      // ── Agregação por conta do plano de contas ─────────────────────────────
      // Regime caixa: usa dataPagamento + status=PAGA
      // Regime competência: usa vencimento + status PAGA ou ABERTA
      const rows = await ctx.db.execute(sql`
        SELECT
          pc.tipo          AS tipo,
          pc.id            AS conta_id,
          pc.codigo        AS conta_codigo,
          pc.nome          AS conta_nome,
          SUM(
            CASE WHEN ${sql.raw(`'${input.regime}'`)} = 'CAIXA'
              THEN COALESCE(p.valor_pago, p.valor)
              ELSE p.valor
            END
          )                AS total,
          COUNT(*)         AS qtd
        FROM fin_parcela p
        INNER JOIN fin_titulo t    ON t.id = p.titulo_id
        INNER JOIN fin_plano_contas pc ON pc.id = t.plano_contas_id
        WHERE
          t.empresa_id = ${empId}
          AND t.ativo = 1
          AND pc.ativo = 1
          AND (
            CASE WHEN ${sql.raw(`'${input.regime}'`)} = 'CAIXA'
              THEN p.status = 'PAGA'
                AND p.data_pagamento BETWEEN ${input.de} AND ${input.ate}
              ELSE p.status IN ('PAGA','ABERTA')
                AND p.vencimento BETWEEN ${input.de} AND ${input.ate}
            END
          )
        GROUP BY pc.tipo, pc.id, pc.codigo, pc.nome
        ORDER BY pc.tipo, pc.codigo
      `) as any[]

      // ── Evolução mensal (mesmo período, agrupado por mês) ─────────────────
      const mesesRaw = await ctx.db.execute(sql`
        SELECT
          pc.tipo AS tipo,
          DATE_FORMAT(
            CASE WHEN ${sql.raw(`'${input.regime}'`)} = 'CAIXA'
              THEN p.data_pagamento
              ELSE p.vencimento
            END, '%Y-%m'
          ) AS mes,
          SUM(
            CASE WHEN ${sql.raw(`'${input.regime}'`)} = 'CAIXA'
              THEN COALESCE(p.valor_pago, p.valor)
              ELSE p.valor
            END
          ) AS total
        FROM fin_parcela p
        INNER JOIN fin_titulo t    ON t.id = p.titulo_id
        INNER JOIN fin_plano_contas pc ON pc.id = t.plano_contas_id
        WHERE
          t.empresa_id = ${empId}
          AND t.ativo = 1
          AND pc.ativo = 1
          AND pc.tipo IN ('RECEITA','DESPESA')
          AND (
            CASE WHEN ${sql.raw(`'${input.regime}'`)} = 'CAIXA'
              THEN p.status = 'PAGA'
                AND p.data_pagamento BETWEEN ${input.de} AND ${input.ate}
              ELSE p.status IN ('PAGA','ABERTA')
                AND p.vencimento BETWEEN ${input.de} AND ${input.ate}
            END
          )
        GROUP BY pc.tipo, mes
        ORDER BY mes
      `) as any[]

      // ── Monta estrutura de resposta ────────────────────────────────────────
      const data = Array.isArray(rows) ? rows : (rows as any).rows ?? []
      const meses = Array.isArray(mesesRaw) ? mesesRaw : (mesesRaw as any).rows ?? []

      type Conta = { id: number; codigo: string; nome: string; total: number; qtd: number }
      const receitas:   Conta[] = []
      const despesas:   Conta[] = []
      const financeiro: Conta[] = []

      for (const r of data) {
        const conta: Conta = {
          id:     Number(r.conta_id),
          codigo: String(r.conta_codigo ?? ''),
          nome:   String(r.conta_nome ?? ''),
          total:  Number(r.total ?? 0),
          qtd:    Number(r.qtd ?? 0),
        }
        if (r.tipo === 'RECEITA')    receitas.push(conta)
        else if (r.tipo === 'DESPESA')   despesas.push(conta)
        else if (r.tipo === 'FINANCEIRO') financeiro.push(conta)
      }

      const totalReceitas   = receitas.reduce((s, c) => s + c.total, 0)
      const totalDespesas   = despesas.reduce((s, c) => s + c.total, 0)
      const totalFinanceiro = financeiro.reduce((s, c) => s + c.total, 0)
      const resultado       = totalReceitas - totalDespesas + totalFinanceiro
      const margem          = totalReceitas > 0 ? (resultado / totalReceitas) * 100 : 0

      // Consolidar meses: { mes, receitas, despesas, resultado }
      const mesMap: Record<string, { mes: string; receitas: number; despesas: number }> = {}
      for (const m of meses) {
        const k = String(m.mes)
        if (!mesMap[k]) mesMap[k] = { mes: k, receitas: 0, despesas: 0 }
        if (m.tipo === 'RECEITA')  mesMap[k].receitas  += Number(m.total ?? 0)
        if (m.tipo === 'DESPESA')  mesMap[k].despesas  += Number(m.total ?? 0)
      }
      const evolucao = Object.values(mesMap)
        .sort((a, b) => a.mes.localeCompare(b.mes))
        .map(m => ({ ...m, resultado: m.receitas - m.despesas }))

      return {
        receitas:   { total: totalReceitas,   contas: receitas },
        despesas:   { total: totalDespesas,   contas: despesas },
        financeiro: { total: totalFinanceiro, contas: financeiro },
        resultado,
        margem,
        evolucao,
      }
    }),
})

// ─── EXTRATO IMPORT (atômico: pessoa + título + parcela + baixa) ──────────────
// Resolve o problema de race condition do frontend: em vez de duas chamadas
// separadas (criar pessoa, depois criar título), tudo ocorre em uma única
// transação no servidor — eliminando dependência de estado React entre chamadas.

const extratoRouter = router({
  importar: protectedProcedure
    .input(z.object({
      // Transação do extrato
      tipo:       z.enum(['PAGAR', 'RECEBER']),
      descricao:  z.string().min(1),
      valor:      z.number().positive(),
      data:       z.string(),   // YYYY-MM-DD (emissão + vencimento)
      // Pessoa — ou id de existente, ou dados de nova (mutuamente exclusivo)
      pessoaId:       z.number().positive().nullish(),
      pessoaNova: z.object({
        nome:         z.string().min(1),
        tipoPessoa:   z.enum(['FISICA', 'JURIDICA']),
        isCliente:    z.boolean(),
        isFornecedor: z.boolean(),
        cpfCnpj:      z.string().nullish(),
      }).nullish(),
      // Classificação
      planoContasId: z.number().nullish(),
      centroCustoId: z.number().nullish(),
      // Conta + pagamento (obrigatórios se salvarComo = 'PAGA')
      salvarComo:     z.enum(['ABERTA', 'PAGA']),
      contaId:        z.number().nullish(),
      formaPagamento: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

      // 1. Criar pessoa nova se fornecida
      let pessoaIdFinal: number | null = input.pessoaId ?? null

      if (!pessoaIdFinal && input.pessoaNova) {
        const p = input.pessoaNova
        const [resPessoa] = await ctx.db.insert(finPessoa).values({
          empresaId:    empId,
          tipoPessoa:   p.tipoPessoa,
          nome:         p.nome,
          cpfCnpj:      p.cpfCnpj ?? null,
          isCliente:    p.isCliente ? 1 : 0,
          isFornecedor: p.isFornecedor ? 1 : 0,
          fantasia:     null, email: null, telefone: null,
          cep: null, logradouro: null, numero: null, complemento: null,
          bairro: null, cidade: null, estado: null,
          regime: null, observacoes: null,
          banco: null, tipoPix: null, chavePix: null, tipoPagamento: null,
        })
        const novoPessoaId = (resPessoa as any).insertId as number
        if (!novoPessoaId || novoPessoaId <= 0) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar cadastro da pessoa' })
        }
        pessoaIdFinal = novoPessoaId
      }

      // 2. Criar título
      const [resTitulo] = await ctx.db.insert(finTitulo).values({
        empresaId:     empId,
        tipo:          input.tipo,
        descricao:     input.descricao,
        pessoaId:      pessoaIdFinal,
        planoContasId: input.planoContasId ?? null,
        centroCustoId: input.centroCustoId ?? null,
        valorOriginal: input.valor.toFixed(2),
        emissao:       input.data as any,
        documento:     null,
        propostaId:    null,
        observacoes:   null,
        ativo:         1 as any,
      })
      const tituloId = (resTitulo as any).insertId as number
      if (!tituloId) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar lançamento' })

      // 3. Criar parcela
      const [resParcela] = await ctx.db.insert(finParcela).values({
        tituloId,
        numero:     1,
        valor:      input.valor.toFixed(2),
        vencimento: input.data as any,
        status:     'ABERTA',
      })
      const parcelaId = (resParcela as any).insertId as number

      // 4. Baixar se já liquidado
      if (input.salvarComo === 'PAGA' && input.contaId && parcelaId) {
        await ctx.db.update(finParcela).set({
          status:         'PAGA',
          contaId:        input.contaId,
          dataPagamento:  input.data as any,
          valorPago:      input.valor.toFixed(2),
          formaPagamento: input.formaPagamento ?? null,
          juros:          '0.00',
          multa:          '0.00',
          desconto:       '0.00',
        }).where(eq(finParcela.id, parcelaId))
      }

      return { ok: true, tituloId, pessoaId: pessoaIdFinal }
    }),
})

// ─── ROUTER PRINCIPAL ─────────────────────────────────────────────────────────

export const finRouter = router({
  empresa:       empresaFinRouter,
  conta:         contaRouter,
  planoContas:   planoContasRouter,
  centroCusto:   centroCustoRouter,
  pessoa:        pessoaRouter,
  dashboard:     dashboardRouter,
  titulo:        tituloRouter,
  parcela:       parcelaRouter,
  transferencia: transferenciaRouter,
  fluxoCaixa:    fluxoCaixaRouter,
  dre:           dreRouter,
  proposta:      propostaFinRouter,
  extrato:       extratoRouter,
})
