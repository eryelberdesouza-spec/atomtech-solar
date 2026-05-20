// ═══════════════════════════════════════════════════════════════════
// Router de Clientes
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { eq, and, like, or, ne } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './trpc'
import { cliente, empresa } from '../db/schema'

// ─── SCHEMA DE VALIDAÇÃO ─────────────────────────────────────────────

// Aceita string, undefined OU null (null vira undefined no transform)
const ns = (max: number) => z.string().max(max).nullable().optional().transform(v => v ?? undefined)

const clienteCreateSchema = z.object({
  tipoPessoa: z.enum(['fisica', 'juridica']).default('fisica'),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(200),
  razaoSocial:     ns(200),
  cpfCnpj:         ns(18),
  nomeResponsavel: ns(200),
  telefone:        ns(20),
  email: z.string().email('E-mail inválido').max(150).nullable().optional().transform(v => v || undefined).or(z.literal('').transform(() => undefined)),
  cep:          ns(9),
  endereco:     ns(300),
  numero:       ns(10),
  complemento:  ns(100),
  bairro:       ns(100),
  cidade:       ns(100),
  estado:       ns(2),
  distribuidora: ns(100),
  observacoes: z.string().nullable().optional().transform(v => v ?? undefined),
})

const clienteUpdateSchema = clienteCreateSchema.partial().extend({
  id: z.number().int().positive(),
})

// ─── ROUTER ─────────────────────────────────────────────────────────

export const clienteRouter = router({

  // Lista todos os clientes da empresa com busca opcional
  list: protectedProcedure
    .input(
      z.object({
        busca: z.string().optional(),
        pagina: z.number().int().default(1),
        porPagina: z.number().int().default(20),
        estado: z.string().optional(),
        distribuidora: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const { busca, pagina = 1, porPagina = 20 } = input ?? {}
      const offset = (pagina - 1) * porPagina
      const { empresaId } = ctx.usuario

      let query = ctx.db
        .select()
        .from(cliente)
        .where(eq(cliente.empresaId, empresaId))

      if (busca) {
        query = query.where(
          and(
            eq(cliente.empresaId, empresaId),
            or(
              like(cliente.nome, `%${busca}%`),
              like(cliente.cpfCnpj, `%${busca}%`),
              like(cliente.email, `%${busca}%`),
              like(cliente.telefone, `%${busca}%`),
            ),
          ),
        ) as typeof query
      }

      const clientes = await query.limit(porPagina).offset(offset)

      return {
        data: clientes,
        pagina,
        porPagina,
        total: clientes.length, // Em produção use COUNT(*)
      }
    }),

  // Busca cliente por ID
  byId: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select()
        .from(cliente)
        .where(
          and(
            eq(cliente.id, input.id),
            eq(cliente.empresaId, ctx.usuario.empresaId),
          ),
        )
        .limit(1)

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cliente não encontrado',
        })
      }

      return result
    }),

  // Verifica duplicidade antes de criar
  checkDuplicidade: protectedProcedure
    .input(
      z.object({
        nome: z.string().optional(),
        cpfCnpj: z.string().optional(),
        email: z.string().optional(),
        telefone: z.string().optional(),
        ignorarId: z.number().optional(), // Para edição
      }),
    )
    .query(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario

      // Carrega regras da empresa
      const [emp] = await ctx.db
        .select()
        .from(empresa)
        .where(eq(empresa.id, empresaId))
        .limit(1)

      if (!emp) throw new TRPCError({ code: 'NOT_FOUND' })

      const conflitos: string[] = []

      // Checa duplicidade de nome
      if (emp.bloquearDupNome && input.nome) {
        const [dup] = await ctx.db
          .select({ id: cliente.id })
          .from(cliente)
          .where(
            and(
              eq(cliente.empresaId, empresaId),
              like(cliente.nome, input.nome.trim()),
              input.ignorarId ? ne(cliente.id, input.ignorarId) : undefined,
            ),
          )
          .limit(1)

        if (dup) conflitos.push('Nome já cadastrado')
      }

      // Checa duplicidade de CPF/CNPJ
      if (emp.bloquearDupCpfCnpj && input.cpfCnpj) {
        const cpfClean = input.cpfCnpj.replace(/\D/g, '')
        const [dup] = await ctx.db
          .select({ id: cliente.id })
          .from(cliente)
          .where(
            and(
              eq(cliente.empresaId, empresaId),
              like(cliente.cpfCnpj, `%${cpfClean}%`),
              input.ignorarId ? ne(cliente.id, input.ignorarId) : undefined,
            ),
          )
          .limit(1)

        if (dup) conflitos.push('CPF/CNPJ já cadastrado')
      }

      // Checa duplicidade de e-mail
      if (emp.bloquearDupEmail && input.email) {
        const [dup] = await ctx.db
          .select({ id: cliente.id })
          .from(cliente)
          .where(
            and(
              eq(cliente.empresaId, empresaId),
              eq(cliente.email, input.email),
              input.ignorarId ? ne(cliente.id, input.ignorarId) : undefined,
            ),
          )
          .limit(1)

        if (dup) conflitos.push('E-mail já cadastrado')
      }

      return { temConflito: conflitos.length > 0, conflitos }
    }),

  // Cria novo cliente
  create: protectedProcedure
    .input(clienteCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { empresaId, id: createdBy } = ctx.usuario

      // Valida campos obrigatórios da empresa
      const [emp] = await ctx.db
        .select()
        .from(empresa)
        .where(eq(empresa.id, empresaId))
        .limit(1)

      if (emp) {
        const erros: string[] = []
        if (emp.obrigatorioTelefone && !input.telefone) erros.push('Telefone é obrigatório')
        if (emp.obrigatorioCep && !input.cep) erros.push('CEP é obrigatório')
        if (emp.obrigatorioEmpresa && !input.razaoSocial) erros.push('Razão Social é obrigatória')
        if (emp.obrigatorioCpfCnpj && !input.cpfCnpj) erros.push('CPF/CNPJ é obrigatório')
        if (emp.obrigatorioEmail && !input.email) erros.push('E-mail é obrigatório')

        if (erros.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: erros.join('; '),
          })
        }
      }

      const [result] = await ctx.db
        .insert(cliente)
        .values({
          ...input,
          empresaId,
          createdBy,
          email: input.email || undefined,
        })
        .execute()

      const novoId = (result as { insertId: number }).insertId

      const [novo] = await ctx.db
        .select()
        .from(cliente)
        .where(eq(cliente.id, novoId))
        .limit(1)

      return novo
    }),

  // Atualiza cliente existente
  update: protectedProcedure
    .input(clienteUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...dados } = input
      const { empresaId } = ctx.usuario

      // Verifica que o cliente pertence à empresa
      const [existente] = await ctx.db
        .select({ id: cliente.id })
        .from(cliente)
        .where(
          and(
            eq(cliente.id, id),
            eq(cliente.empresaId, empresaId),
          ),
        )
        .limit(1)

      if (!existente) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cliente não encontrado',
        })
      }

      await ctx.db
        .update(cliente)
        .set({ ...dados, email: dados.email || undefined })
        .where(eq(cliente.id, id))
        .execute()

      const [atualizado] = await ctx.db
        .select()
        .from(cliente)
        .where(eq(cliente.id, id))
        .limit(1)

      return atualizado
    }),

  // Exclui cliente (apenas se sem propostas)
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario

      const [existente] = await ctx.db
        .select({ id: cliente.id })
        .from(cliente)
        .where(
          and(
            eq(cliente.id, input.id),
            eq(cliente.empresaId, empresaId),
          ),
        )
        .limit(1)

      if (!existente) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cliente não encontrado',
        })
      }

      // TODO: Verificar se tem propostas associadas antes de excluir

      await ctx.db.delete(cliente).where(eq(cliente.id, input.id)).execute()

      return { ok: true }
    }),
})
