import { createTRPCReact } from "@trpc/react-query"
import { httpBatchLink } from "@trpc/client"
import type { AppRouter } from "../../api/src/routers/index"

export const trpc = createTRPCReact<AppRouter>()

const API_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "https://atomtech-solar-production.up.railway.app/trpc"
  : "http://localhost:3001/trpc"

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: API_URL,
        headers() {
          const token = localStorage.getItem("atomtech_token")
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
      }),
    ],
  })
}