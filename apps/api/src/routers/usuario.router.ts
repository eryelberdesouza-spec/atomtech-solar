// ═══════════════════════════════════════════════════════════════════
// Router de Usuários — CRUD com controle de acesso por role
// Apenas admins podem criar/editar/desativar usuários
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './trpc'
import { usuario } from '../db/schema'
import { hashSenha } from './auth.router'

// ─── Guard: apenas admins ─────────────────────────────────────────────────────

function assertAdmin(role: string) {
  if (role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Apenas administradores podem realizar esta ação',
    })
  }
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────

export const usuarioRouter = router({

  // Lista todos os usuários da empresa
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const { empresaId } = ctx.usuario

      const usuarios = await ctx.db
        .select({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          telefone: usuario.telefone,
          cargo: usuario.cargo,
          role: usuario.role,
          margemPadrao: usuario.margemPadrao,
          comissaoPadrao: usuario.comissaoPadrao,
          ativo: usuario.ativo,
          createdAt: usuario.createdAt,
        })
        .from(usuario)
        .where(eq(usuario.empresaId, empresaId))
        .orderBy(usuario.nome)

      return usuarios
    }),

  // Busca um usuário pelo ID
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario

      const [user] = await ctx.db
        .select({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          telefone: usuario.telefone,
          cargo: usuario.cargo,
          role: usuario.role,
          margemPadrao: usuario.margemPadrao,
          comissaoPadrao: usuario.comissaoPadrao,
          ativo: usuario.ativo,
          createdAt: usuario.createdAt,
        })
        .from(usuario)
        .where(and(eq(usuario.id, input.id), eq(usuario.empresaId, empresaId)))
        .limit(1)

      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' })
      return user
    }),

  // Cria novo usuário — apenas admin
  create: protectedProcedure
    .input(z.object({
      nome:           z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
      email:          z.string().email('E-mail inválido'),
      senha:          z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
      telefone:       z.string().optional(),
      cargo:          z.string().optional(),
      role:           z.enum(['admin', 'comercial', 'tecnico', 'visualizador']).default('comercial'),
      margemPadrao:   z.number().min(0).max(100).optional(),
      comissaoPadrao: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.usuario.role)

      const { empresaId } = ctx.usuario

      // Verifica duplicata de e-mail
      const [existente] = await ctx.db
        .select({ id: usuario.id })
        .from(usuario)
        .where(eq(usuario.email, input.email))
        .limit(1)

      if (existente) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Já existe um usuário com este e-mail' })
      }

      await ctx.db.insert(usuario).values({
        empresaId,
        nome:           input.nome,
        email:          input.email,
        senhaHash:      hashSenha(input.senha),
        telefone:       input.telefone,
        cargo:          input.cargo,
        role:           input.role,
        margemPadrao:   input.margemPadrao ? String(input.margemPadrao) : undefined,
        comissaoPadrao: input.comissaoPadrao ? String(input.comissaoPadrao) : undefined,
        ativo:          true,
      }).execute()

      return { ok: true }
    }),

  // Atualiza usuário — admin pode tudo, usuário pode editar só a si mesmo (sem trocar role)
  update: protectedProcedure
    .input(z.object({
      id:             z.number().int().positive(),
      nome:           z.string().min(2).optional(),
      email:          z.string().email().optional(),
      telefone:       z.string().optional(),
      cargo:          z.string().optional(),
      role:           z.enum(['admin', 'comercial', 'tecnico', 'visualizador']).optional(),
      margemPadrao:   z.number().min(0).max(100).optional(),
      comissaoPadrao: z.number().min(0).max(100).optional(),
      ativo:          z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId, role: roleAtual, id: idAtual } = ctx.usuario
      const isAdmin = roleAtual === 'admin'
      const isSelf  = input.id === idAtual

      // Não-admin só pode editar a si mesmo e não pode trocar role
      if (!isAdmin && !isSelf) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para editar outro usuário' })
      }
      if (!isAdmin && input.role) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas admins podem alterar o nível de acesso' })
      }
      if (!isAdmin && input.ativo !== undefined) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas admins podem ativar/desativar usuários' })
      }

      // Valida que pertence à empresa
      const [user] = await ctx.db
        .select({ id: usuario.id })
        .from(usuario)
        .where(and(eq(usuario.id, input.id), eq(usuario.empresaId, empresaId)))
        .limit(1)

      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' })

      // Verifica duplicata de e-mail se estiver trocando
      if (input.email) {
        const [dup] = await ctx.db
          .select({ id: usuario.id })
          .from(usuario)
          .where(eq(usuario.email, input.email))
          .limit(1)
        if (dup && dup.id !== input.id) {
          throw new TRPCError({ code: 'CONFLICT', message: 'E-mail já em uso por outro usuário' })
        }
      }

      const updates: Record<string, any> = {}
      if (input.nome           !== undefined) updates.nome           = input.nome
      if (input.email          !== undefined) updates.email          = input.email
      if (input.telefone       !== undefined) updates.telefone       = input.telefone
      if (input.cargo          !== undefined) updates.cargo          = input.cargo
      if (input.role           !== undefined) updates.role           = input.role
      if (input.margemPadrao   !== undefined) updates.margemPadrao   = String(input.margemPadrao)
      if (input.comissaoPadrao !== undefined) updates.comissaoPadrao = String(input.comissaoPadrao)
      if (input.ativo          !== undefined) updates.ativo          = input.ativo

      if (Object.keys(updates).length > 0) {
        await ctx.db
          .update(usuario)
          .set(updates)
          .where(eq(usuario.id, input.id))
          .execute()
      }

      return { ok: true }
    }),

  // Redefine senha — admin redefine de qualquer usuário, usuário redefine a própria
  redefinirSenha: protectedProcedure
    .input(z.object({
      id:        z.number().int().positive(),
      novaSenha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId, role: roleAtual, id: idAtual } = ctx.usuario
      const isAdmin = roleAtual === 'admin'
      const isSelf  = input.id === idAtual

      if (!isAdmin && !isSelf) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para redefinir senha de outro usuário' })
      }

      const [user] = await ctx.db
        .select({ id: usuario.id })
        .from(usuario)
        .where(and(eq(usuario.id, input.id), eq(usuario.empresaId, empresaId)))
        .limit(1)

      if (!user) throw new TRPCError({ code: 'NOT_FOUND' })

      await ctx.db
        .update(usuario)
        .set({ senhaHash: hashSenha(input.novaSenha) })
        .where(eq(usuario.id, input.id))
        .execute()

      return { ok: true }
    }),

  // Ativa/desativa — apenas admin
  toggleAtivo: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.usuario.role)

      const { empresaId, id: idAtual } = ctx.usuario

      if (input.id === idAtual) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Você não pode desativar sua própria conta' })
      }

      const [user] = await ctx.db
        .select({ id: usuario.id, ativo: usuario.ativo })
        .from(usuario)
        .where(and(eq(usuario.id, input.id), eq(usuario.empresaId, empresaId)))
        .limit(1)

      if (!user) throw new TRPCError({ code: 'NOT_FOUND' })

      await ctx.db
        .update(usuario)
        .set({ ativo: !user.ativo })
        .where(eq(usuario.id, input.id))
        .execute()

      return { ok: true, ativo: !user.ativo }
    }),
})
