import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpc, createTRPCClient } from './lib/trpc'
import { Layout } from './components/layout/Layout'

import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { PropostasPage } from './pages/proposals/PropostasPage'
import { PropostaDetailPage } from './pages/proposals/PropostaDetailPage'
import { NovaPropostaPage } from './pages/proposals/NovaPropostaPage'
import { ClientesPage } from './pages/clients/ClientesPage'
import { ClienteDetailPage } from './pages/clients/ClienteDetailPage'
import { FaturasPage } from './pages/invoices/FaturasPage'
import { NovaFaturaPage } from './pages/invoices/NovaFaturaPage'
import { ConfiguracoesPage } from './pages/settings/ConfiguracoesPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('atomtech_token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

const trpcClient = createTRPCClient()

export default function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth><Layout /></RequireAuth>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/propostas" element={<PropostasPage />} />
              <Route path="/propostas/nova" element={<NovaPropostaPage />} />
              <Route path="/propostas/:id" element={<PropostaDetailPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/clientes/:id" element={<ClienteDetailPage />} />
              <Route path="/faturas" element={<FaturasPage />} />
              <Route path="/faturas/nova" element={<NovaFaturaPage />} />
              <Route path="/configuracoes/*" element={<ConfiguracoesPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
