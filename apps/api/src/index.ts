import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './routers'
import { createContext, testConnection } from './routers/trpc'

const app = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://atomtech-solar-web.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static('uploads'))

app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
  onError({ path, error }) {
    if (error.code !== 'NOT_FOUND' && error.code !== 'BAD_REQUEST') {
      console.error(`tRPC error em "${path}":`, error)
    }
  },
}))

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// TEMP: run migration — remove after confirmed
app.get('/run-migration-prazo', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    await conn.execute('ALTER TABLE proposta ADD COLUMN prazo_execucao VARCHAR(300) NULL AFTER titulo_servico')
    await conn.end()
    res.json({ ok: true, results: ['prazo_execucao: OK'] })
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      res.json({ ok: true, results: ['prazo_execucao: já existia'] })
    } else {
      res.status(500).json({ ok: false, error: e.message })
    }
  }
})


app.get('/run-migration-modelo-bloco', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS modelo_bloco (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id  INT NOT NULL,
        tipo_bloco  VARCHAR(60) NOT NULL,
        titulo      VARCHAR(200) NOT NULL,
        conteudo    TEXT NOT NULL,
        ativo       TINYINT(1) NOT NULL DEFAULT 1,
        ordem       INT NOT NULL DEFAULT 0,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mb_empresa_tipo (empresa_id, tipo_bloco)
      )
    `)
    await conn.end()
    res.json({ ok: true, message: 'tabela modelo_bloco pronta' })
  } catch (e: any) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      res.json({ ok: true, message: 'tabela já existia' })
    } else {
      res.status(500).json({ ok: false, error: e.message })
    }
  }
})

async function main() {
  await testConnection()
  app.listen(PORT, () => {
    console.log(`\n🚀 Atom Tech API → http://localhost:${PORT}`)
    console.log(`   tRPC: http://localhost:${PORT}/trpc\n`)
  })
}

main().catch(err => { console.error(err); process.exit(1) })
export type { AppRouter } from './routers'
