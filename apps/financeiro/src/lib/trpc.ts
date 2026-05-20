import { createTRPCReact } from "@trpc/react-query"
import { httpBatchLink } from "@trpc/client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<any>() as any

const API_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "https://atomtech-solar-production.up.railway.app/trpc"
  : "http://localhost:3001/trpc"

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: API_URL,
        headers() {
          const token = localStorage.getItem("atomfin_token")
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
      }),
    ],
  })
}
