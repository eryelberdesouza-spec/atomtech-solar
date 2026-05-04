import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './routers'
import { createContext, testConnection } from './routers/trpc'

const app = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true }))
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

async function main() {
  await testConnection()
  app.listen(PORT, () => {
    console.log(`\n🚀 Atom Tech API → http://localhost:${PORT}`)
    console.log(`   tRPC: http://localhost:${PORT}/trpc\n`)
  })
}

main().catch(err => { console.error(err); process.exit(1) })
export type { AppRouter } from './routers'
