// ═══════════════════════════════════════════════════════════════════
// Router Financeiro — agrupa todos os sub-routers de finanças
// Namespace: trpc.fin.*
// ═══════════════════════════════════════════════════════════════════

import { router } from './trpc'
import { z } from 'zod'
import { eq, and, like, or, asc, desc, sql, isNull, gte, lte } from 'drizzle-orm'
import { protectedProcedure } from './trpc'
import { TRPCError } from '@trpc/server'
import {
  finContaBancaria,
  finPlanoContas,
  finCentroCusto,
  finPessoa,
  finTitulo,
  finParcela,
  finTransferencia,
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
          valorPago:     finParcela.valorPago,
          juros:         finParcela.juros,
          multa:         finParcela.multa,
          desconto:      finParcela.desconto,
          contaId:       finParcela.contaId,
          tituloId:      finTitulo.id,
          tipo:          finTitulo.tipo,
          descricao:     finTitulo.descricao,
          documento:     finTitulo.documento,
          valorOriginal: finTitulo.valorOriginal,
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

  // Exclui título (e cascata parcelas)
  delete: protectedProcedure
    .input(z.object({ tituloId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId
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
      parcelaId:     z.number(),
      contaId:       z.number(),
      dataPagamento: z.string(),  // YYYY-MM-DD
      valorPago:     z.number().positive(),
      juros:         z.number().min(0).default(0),
      multa:         z.number().min(0).default(0),
      desconto:      z.number().min(0).default(0),
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
          status:        'PAGA',
          contaId:       input.contaId,
          dataPagamento: input.dataPagamento as any,
          valorPago:     input.valorPago.toFixed(2),
          juros:         input.juros.toFixed(2),
          multa:         input.multa.toFixed(2),
          desconto:      input.desconto.toFixed(2),
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
          status:        'ABERTA',
          contaId:       null,
          dataPagamento: null,
          valorPago:     null,
          juros:         '0',
          multa:         '0',
          desconto:      '0',
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

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const empId = ctx.usuario.empresaId

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

// ─── ROUTER PRINCIPAL ─────────────────────────────────────────────────────────

export const finRouter = router({
  conta:         contaRouter,
  planoContas:   planoContasRouter,
  centroCusto:   centroCustoRouter,
  pessoa:        pessoaRouter,
  dashboard:     dashboardRouter,
  titulo:        tituloRouter,
  parcela:       parcelaRouter,
  transferencia: transferenciaRouter,
})
