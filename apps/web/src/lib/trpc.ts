// ═══════════════════════════════════════════════════════════════════
// tRPC Client — configuração do frontend
// Type-safe desde a requisição até o componente React
// ═══════════════════════════════════════════════════════════════════

import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@atomtech/api'

// Hook tRPC para uso nos componentes
export const trpc = createTRPCReact<AppRouter>()

// Client HTTP com batching automático de requests
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/trpc',
        // Headers de autenticação — JWT quando implementado
        headers() {
          const token = localStorage.getItem('atomtech_token')
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
      }),
    ],
  })
}
