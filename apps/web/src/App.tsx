import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpc, createTRPCClient } from './lib/trpc'
import { Layout } from './components/layout/Layout'

import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { PropostasPage } from './pages/proposals/PropostasPage'
import { PropostaDetailPage } from './pages/proposals/PropostaDetailPage'
import { NovaPropostaPage } from './pages/proposals/NovaPropostaPage'
import { NovaPropostaServicoPage } from './pages/proposals/NovaPropostaServicoPage'
import { ClientesPage } from './pages/clients/ClientesPage'
import { ClienteDetailPage } from './pages/clients/ClienteDetailPage'
import { FaturasPage } from './pages/invoices/FaturasPage'
import { NovaFaturaPage } from './pages/invoices/NovaFaturaPage'
import { ConfiguracoesPage } from './pages/settings/ConfiguracoesPage'
import { OrdensServicoPage } from './pages/operacional/OrdensServicoPage'
import { OrdemServicoDetailPage } from './pages/operacional/OrdemServicoDetailPage'
import { ManutencoesPage } from './pages/operacional/ManutencoesPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('atomtech_token')
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace />

  // Perfil Técnico: acesso restrito à aba Operacional (roteiro de campo)
  const usuario: any = (() => {
    try { return JSON.parse(localStorage.getItem('atomtech_usuario') || '{}') } catch { return {} }
  })()
  if (usuario?.role === 'tecnico' && !location.pathname.startsWith('/ordens-servico') && !location.pathname.startsWith('/manutencoes')) {
    return <Navigate to="/ordens-servico" replace />
  }

  return <>{children}</>
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, retry: 1, refetchOnWindowFocus: false },
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
              <Route path="/propostas/nova-servico" element={<NovaPropostaServicoPage />} />
              <Route path="/propostas/:id" element={<PropostaDetailPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/clientes/:id" element={<ClienteDetailPage />} />
              <Route path="/faturas" element={<FaturasPage />} />
              <Route path="/faturas/nova" element={<NovaFaturaPage />} />
              <Route path="/operacional" element={<Navigate to="/ordens-servico" replace />} />
              <Route path="/ordens-servico" element={<OrdensServicoPage />} />
              <Route path="/ordens-servico/:id" element={<OrdemServicoDetailPage />} />
              <Route path="/manutencoes" element={<ManutencoesPage />} />
              <Route path="/configuracoes/*" element={<ConfiguracoesPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
