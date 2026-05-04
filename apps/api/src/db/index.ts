// ═══════════════════════════════════════════════════════════════════
// Conexão do banco para uso no seed e migrations
// Para o servidor em produção, a conexão fica em routers/trpc.ts
// ═══════════════════════════════════════════════════════════════════

import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Verifique o arquivo .env')
}

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
})

export const db = drizzle(pool, { schema, mode: 'default' })

export async function testConnection(): Promise<void> {
  const conn = await pool.getConnection()
  await conn.ping()
  conn.release()
  console.log('✅ MySQL conectado com sucesso')
}

export type DB = typeof db
