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

// ROTA TEMPORÁRIA — remover após executar a migration em produção
app.get('/run-migration-servico', async (_, res) => {
  try {
    const mysql = await import('mysql2/promise')
    const conn = await mysql.default.createConnection(process.env.DATABASE_URL!)
    const results: string[] = []

    try {
      await conn.execute(`ALTER TABLE proposta ADD COLUMN tipo_proposta ENUM('fotovoltaico','servico_geral') NOT NULL DEFAULT 'fotovoltaico' AFTER numero, ADD COLUMN titulo_servico VARCHAR(200) NULL AFTER data_validade`)
      results.push('ALTER TABLE proposta: OK')
    } catch (e: any) {
      results.push('ALTER TABLE proposta: ' + (e.code === 'ER_DUP_FIELDNAME' ? 'já existe (OK)' : e.message))
    }

    try {
      await conn.execute(`CREATE TABLE IF NOT EXISTS item_servico_proposta (id INT NOT NULL AUTO_INCREMENT, proposta_id INT NOT NULL, descricao VARCHAR(300) NOT NULL, unidade VARCHAR(30) NOT NULL DEFAULT 'un', quantidade DECIMAL(10,3) NOT NULL, valor_unitario DECIMAL(10,2) NOT NULL, valor_total DECIMAL(10,2) NOT NULL, ordem INT NOT NULL DEFAULT 0, PRIMARY KEY (id), CONSTRAINT fk_isp_proposta FOREIGN KEY (proposta_id) REFERENCES proposta(id) ON DELETE CASCADE)`)
      results.push('CREATE TABLE item_servico_proposta: OK')
    } catch (e: any) {
      results.push('CREATE TABLE item_servico_proposta: ' + e.message)
    }

    await conn.end()
    res.json({ ok: true, results })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
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
