// ═══════════════════════════════════════════════════════════════════
// tRPC — Configuração base, contexto e procedimentos
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// tRPC — Contexto, procedimentos e middleware de autenticação
// ctx.usuario é injetado em todas as rotas protegidas
// ═══════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from '@trpc/server'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from '../db/schema'

// Conexão compartilhada — singleton
let _db:   ReturnType<typeof drizzle> | null = null
let _pool: ReturnType<typeof mysql.createPool> | null = null

function getDb() {
  if (!_db) {
    _pool = mysql.createPool({
      uri: process.env.DATABASE_URL ?? 'mysql://root:@localhost:3306/atomtech_solar',
      waitForConnections: true,
      connectionLimit: 10,
    })
    _db = drizzle(_pool, { schema, mode: 'default' })
  }
  return _db
}

/** Pool mysql2 bruto — para queries que o Drizzle não gera corretamente */
export function getRawPool() {
  getDb() // garante inicialização
  return _pool!
}

export type Usuario = {
  id: number
  empresaId: number
  role: string
  nome: string
  email: string
}

export interface Context {
  req: Request
  res: Response
  db: ReturnType<typeof getDb>
  usuario?: Usuario
}

// Cria contexto para cada requisição
export async function createContext({ req, res }: { req: Request; res: Response }): Promise<Context> {
  const db = getDb()

  // ── Autenticação JWT (stub de desenvolvimento) ──
  // Em produção: validar JWT real e buscar usuário no banco
  let usuario: Usuario | undefined

  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      // Decode simples de payload JWT base64 (sem verificação — apenas dev)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'))
      if (payload.userId && payload.empresaId) {
        usuario = {
          id: payload.userId,
          empresaId: payload.empresaId,
          role: payload.role ?? 'comercial',
          nome: payload.nome ?? '',
          email: payload.email ?? '',
        }
      }
    } catch { /* token inválido */ }
  }

  // Fallback de desenvolvimento — usuário admin Atom Tech
  if (!usuario && process.env.NODE_ENV !== 'production') {
    usuario = {
      id: 1,
      empresaId: 1,
      role: 'admin',
      nome: 'Eryelber Correia de Souza',
      email: 'eryelber@atomtech.tec.br',
    }
  }

  return { req, res, db, usuario }
}

// Testa conexão (chamado no boot)
export async function testConnection(): Promise<void> {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL ?? 'mysql://root:@localhost:3306/atomtech_solar',
  })
  const conn = await pool.getConnection()
  await conn.ping()
  conn.release()
  await pool.end()
  console.log('✅ MySQL conectado com sucesso')
}

// ─── tRPC ────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.code === 'BAD_REQUEST' && error.cause instanceof z.ZodError
          ? error.cause.flatten()
          : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

// Requer usuário autenticado
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.usuario) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Não autenticado' })
  }
  return next({ ctx: { ...ctx, usuario: ctx.usuario } })
})

// Requer role admin
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.usuario.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores' })
  }
  return next({ ctx })
})
