import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpc, createTRPCClient } from './lib/trpc'
import { Layout } from './components/layout/Layout'

import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { LancamentosPage } from './pages/LancamentosPage'
import { FluxoCaixaPage } from './pages/FluxoCaixaPage'
import { DREPage } from './pages/DREPage'
import { PessoasPage } from './pages/pessoas/PessoasPage'
import { ConfiguracoesPage } from './pages/config/ConfiguracoesPage'
import { PropostasPage } from './pages/PropostasPage'
import { ExtratoPage } from './pages/ExtratoPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  // Aceita token de qualquer das duas plataformas
  const token = localStorage.getItem('atomfin_token') || localStorage.getItem('atomtech_token')
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
              <Route path="/lancamentos" element={<LancamentosPage />} />
              <Route path="/fluxo-caixa" element={<FluxoCaixaPage />} />
              <Route path="/dre" element={<DREPage />} />
              <Route path="/pessoas" element={<PessoasPage />} />
              <Route path="/configuracoes/*" element={<ConfiguracoesPage />} />
              <Route path="/propostas" element={<PropostasPage />} />
              <Route path="/extrato" element={<ExtratoPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
