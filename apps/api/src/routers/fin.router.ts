// ═══════════════════════════════════════════════════════════════════
// Router Financeiro — agrupa todos os sub-routers de finanças
// Namespace: trpc.fin.*
// ═══════════════════════════════════════════════════════════════════

import { router } from './trpc'
import { z } from 'zod'
import { eq, and, like, or, asc, desc, sql, isNull } from 'drizzle-orm'
import { protectedProcedure } from './trpc'
import {
  finContaBancaria,
  finPlanoContas,
  finCentroCusto,
  finPessoa,
  finTitulo,
  finParcela,
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
      tipoPessoa:   z.enum(['FISICA', 'JURIDICA']),
      nome:         z.string().min(1),
      fantasia:     z.string().nullish(),
      cpfCnpj:      z.string().nullish(),
      email:        z.string().email().nullish().or(z.literal('')),
      telefone:     z.string().nullish(),
      isCliente:    z.boolean(),
      isFornecedor: z.boolean(),
      cep:          z.string().nullish(),
      logradouro:   z.string().nullish(),
      numero:       z.string().nullish(),
      complemento:  z.string().nullish(),
      bairro:       z.string().nullish(),
      cidade:       z.string().nullish(),
      estado:       z.string().nullish(),
      regime:       z.string().nullish(),
      observacoes:  z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(finPessoa).values({
        empresaId: ctx.usuario.empresaId, ...input,
        email: input.email || null,
      })
      return { ok: true }
    }),

  update: protectedProcedure
    .input(z.object({
      id:           z.number(),
      tipoPessoa:   z.enum(['FISICA', 'JURIDICA']),
      nome:         z.string().min(1),
      fantasia:     z.string().nullish(),
      cpfCnpj:      z.string().nullish(),
      email:        z.string().email().nullish().or(z.literal('')),
      telefone:     z.string().nullish(),
      isCliente:    z.boolean(),
      isFornecedor: z.boolean(),
      cep:          z.string().nullish(),
      logradouro:   z.string().nullish(),
      numero:       z.string().nullish(),
      complemento:  z.string().nullish(),
      bairro:       z.string().nullish(),
      cidade:       z.string().nullish(),
      estado:       z.string().nullish(),
      regime:       z.string().nullish(),
      observacoes:  z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      await ctx.db
        .update(finPessoa)
        .set({ ...data, email: data.email || null, updatedAt: new Date() })
        .where(and(eq(finPessoa.id, id), eq(finPessoa.empresaId, ctx.usuario.empresaId)))
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

    return {
      saldoTotal,
      aReceber,
      aPagar,
      resultado: aReceber - aPagar,
      vencendoHoje,
      vencidos,
      contasResume,
    }
  }),
})

// ─── ROUTER PRINCIPAL ─────────────────────────────────────────────────────────

export const finRouter = router({
  conta:        contaRouter,
  planoContas:  planoContasRouter,
  centroCusto:  centroCustoRouter,
  pessoa:       pessoaRouter,
  dashboard:    dashboardRouter,
})
