import { createTRPCReact } from "@trpc/react-query"
import { httpBatchLink } from "@trpc/client"
import type { AppRouter } from "../../api/src/routers/index"

export const trpc = createTRPCReact<AppRouter>()

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: import.meta.env.VITE_API_URL ?? "http://localhost:3001/trpc",
        headers() {
          const token = localStorage.getItem("atomtech_token")
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
      }),
    ],
  })
}