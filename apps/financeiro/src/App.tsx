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
import { PessoaDetailPage } from './pages/pessoas/PessoaDetailPage'
import { ConfiguracoesPage } from './pages/config/ConfiguracoesPage'
import { PropostasPage } from './pages/PropostasPage'
import { ExtratoPage } from './pages/ExtratoPage'
import { RelatoriosPage } from './pages/RelatoriosPage'
import { ProjetosPage } from './pages/projetos/ProjetosPage'
import { ProjetoDetailPage } from './pages/projetos/ProjetoDetailPage'
import { AuditoriaPage } from './pages/AuditoriaPage'

const PROPOSTAS_URL = 'https://atomtech-solar-web.vercel.app'

function getUsuario() {
  try {
    return JSON.parse(
      localStorage.getItem('atomfin_usuario') ||
      localStorage.getItem('atomtech_usuario') ||
      '{}'
    )
  } catch { return {} }
}

function AcessoBloqueado() {
  const usuario = getUsuario()
  const roleLabel: Record<string, string> = {
    comercial:   'Comercial',
    tecnico:     'Técnico',
    visualizador:'Visualizador',
    admin:       'Admin',
  }
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #091410 0%, #0D1C17 100%)',
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      padding: 24,
    }}>
      <div style={{
        maxWidth: 440, width: '100%', textAlign: 'center',
        background: '#0D1C17', border: '1px solid #1E4033',
        borderRadius: 16, padding: '40px 32px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h1 style={{ color: '#E2F0EB', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>
          Acesso Restrito
        </h1>
        <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
          O <strong style={{ color: '#10B981' }}>AGF — Atom Gestão Financeira</strong> é exclusivo para
          administradores do sistema.
        </p>
        <div style={{
          background: '#091410', border: '1px solid #1E3A2E',
          borderRadius: 8, padding: '10px 14px', marginBottom: 24,
          fontSize: 12, color: '#64748B',
        }}>
          Você está logado como{' '}
          <strong style={{ color: '#E2F0EB' }}>{usuario?.nome || 'Usuário'}</strong>
          {' '}— perfil{' '}
          <strong style={{ color: '#F59E0B' }}>
            {roleLabel[usuario?.role] ?? usuario?.role ?? 'desconhecido'}
          </strong>
        </div>
        <a
          href={PROPOSTAS_URL}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', borderRadius: 8,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#022C22', fontWeight: 700, fontSize: 13,
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
          }}
        >
          ☀ Voltar para o AGO
        </a>
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('atomfin_token') || localStorage.getItem('atomtech_token')
  if (!token) return <Navigate to="/login" replace />
  const usuario = getUsuario()
  if (usuario?.role && usuario.role !== 'admin') return <AcessoBloqueado />
  return <>{children}</>
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           60_000,   // 60s — evita refetch desnecessário ao trocar aba
      gcTime:             300_000,   // 5min — mantém cache em memória
      retry:                    1,
      refetchOnWindowFocus:  false,  // não refetch ao focar janela
      refetchOnReconnect:    false,
    },
  },
})

// ── Warm-up + Keep-alive da API Railway ───────────────────────────────────────
// Railway adormece após inatividade. Esta função acorda a API ao abrir o sistema
// e pinga a cada 4 minutos para mantê-la ativa durante o uso.
const API_HEALTH = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? 'https://atomtech-solar-production.up.railway.app/health'
  : null

if (API_HEALTH) {
  // Warm-up imediato ao carregar o app
  fetch(API_HEALTH).catch(() => {})

  // Keep-alive a cada 4 minutos (Railway dorme após ~5 min sem atividade)
  setInterval(() => fetch(API_HEALTH).catch(() => {}), 4 * 60 * 1000)
}

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
              <Route path="/pessoas/:id" element={<PessoaDetailPage />} />
              <Route path="/configuracoes/*" element={<ConfiguracoesPage />} />
              <Route path="/propostas" element={<PropostasPage />} />
              <Route path="/extrato" element={<ExtratoPage />} />
              <Route path="/relatorios" element={<RelatoriosPage />} />
              <Route path="/projetos" element={<ProjetosPage />} />
              <Route path="/projetos/:id" element={<ProjetoDetailPage />} />
              <Route path="/auditoria" element={<AuditoriaPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
