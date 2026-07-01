import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { ContasBancariasPage } from './ContasBancariasPage'
import { PlanoContasPage } from './PlanoContasPage'
import { CentrosCustoPage } from './CentrosCustoPage'
import { CategoriasCustoPage } from './CategoriasCustoPage'
import { UsuariosPage } from './UsuariosPage'
import { PeriodosPage } from './PeriodosPage'
import { C } from '../../components/ui'

const TABS = [
  { path: '/configuracoes/contas',          label: '🏦 Contas Bancárias' },
  { path: '/configuracoes/plano-contas',    label: '📊 Plano de Contas' },
  { path: '/configuracoes/centros-custo',   label: '🏷️ Centros de Custo' },
  { path: '/configuracoes/categorias-custo',label: '🧾 Categorias de Custo' },
  { path: '/configuracoes/periodos',        label: '🔒 Fechamento de Período' },
  { path: '/configuracoes/usuarios',        label: '👥 Usuários' },
]

export function ConfiguracoesPage() {
  const location = useLocation()

  return (
    <div>
      {/* Sub-nav horizontal */}
      <div style={{
        borderBottom: '1px solid ' + C.border,
        background: C.bgMid,
        padding: '0 28px',
        display: 'flex', gap: 0,
      }}>
        {TABS.map(tab => {
          const isActive = location.pathname.startsWith(tab.path)
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              style={{
                padding: '13px 18px', fontSize: 13, textDecoration: 'none',
                color: isActive ? C.emerald : C.textMuted,
                fontWeight: isActive ? 600 : 400,
                borderBottom: isActive ? '2px solid ' + C.emerald : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </NavLink>
          )
        })}
      </div>

      <Routes>
        <Route index element={<ContasBancariasPage />} />
        <Route path="contas" element={<ContasBancariasPage />} />
        <Route path="plano-contas" element={<PlanoContasPage />} />
        <Route path="centros-custo" element={<CentrosCustoPage />} />
        <Route path="categorias-custo" element={<CategoriasCustoPage />} />
        <Route path="periodos" element={<PeriodosPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
      </Routes>
    </div>
  )
}
