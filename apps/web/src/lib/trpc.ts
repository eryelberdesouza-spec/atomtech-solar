import { createTRPCReact } from "@trpc/react-query"
import { httpBatchLink } from "@trpc/client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<any>()

export const API_BASE = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "https://atomtech-solar-production.up.railway.app"
  : "http://localhost:3001"

const API_URL = `${API_BASE}/trpc`

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