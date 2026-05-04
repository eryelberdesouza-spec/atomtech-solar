// ═══════════════════════════════════════════════════════════════════
// Router de Autenticação — Login com JWT
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from './trpc'
import { usuario } from '../db/schema'
import crypto from 'crypto'

// Gera JWT simples sem dependência externa
function gerarToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url')
  const secret = process.env.JWT_SECRET ?? 'atomtech-solar-secret-2026'
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

function verificarToken(token: string): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split('.')
    const secret = process.env.JWT_SECRET ?? 'atomtech-solar-secret-2026'
    const sigEsperada = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
    if (sig !== sigEsperada) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'))
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

// Verifica senha com hash simples (bcrypt seria melhor em produção)
function verificarSenha(senha: string, hash: string): boolean {
  // Se ainda é o placeholder do seed, aceita qualquer senha para o admin
  if (hash === '$2b$12$atomtech_placeholder') return true
  // Hash SHA256 simples para desenvolvimento
  const senhaHash = crypto.createHash('sha256').update(senha + 'atomtech_salt').digest('hex')
  return senhaHash === hash
}

export function hashSenha(senha: string): string {
  return crypto.createHash('sha256').update(senha + 'atomtech_salt').digest('hex')
}

export { verificarToken }

export const authRouter = router({
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      senha: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Busca usuário pelo email
      const [user] = await ctx.db
        .select()
        .from(usuario)
        .where(eq(usuario.email, input.email))
        .limit(1)

      if (!user || !user.ativo) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'E-mail ou senha incorretos',
        })
      }

      if (!verificarSenha(input.senha, user.senhaHash)) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'E-mail ou senha incorretos',
        })
      }

      const token = gerarToken({
        userId: user.id,
        empresaId: user.empresaId,
        role: user.role,
        nome: user.nome,
        email: user.email,
      })

      return {
        token,
        usuario: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role,
          empresaId: user.empresaId,
        },
      }
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.usuario) return null
    return ctx.usuario
  }),

  alterarSenha: publicProcedure
    .input(z.object({
      email: z.string().email(),
      senhaAtual: z.string(),
      novaSenha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
    }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select()
        .from(usuario)
        .where(eq(usuario.email, input.email))
        .limit(1)

      if (!user) throw new TRPCError({ code: 'NOT_FOUND' })
      if (!verificarSenha(input.senhaAtual, user.senhaHash)) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Senha atual incorreta' })
      }

      await ctx.db
        .update(usuario)
        .set({ senhaHash: hashSenha(input.novaSenha) })
        .where(eq(usuario.id, user.id))
        .execute()

      return { ok: true }
    }),
})
