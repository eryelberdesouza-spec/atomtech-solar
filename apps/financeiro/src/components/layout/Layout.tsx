import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { C } from '../ui'

const NAV = [
  { path: '/dashboard',    label: 'Dashboard',     icon: '◈', color: '#34D399', desc: 'Visão geral' },
  { path: '/lancamentos',  label: 'Lançamentos',   icon: '↕', color: '#60A5FA', desc: 'CP / CR / Extrato' },
  { path: '/fluxo-caixa', label: 'Fluxo de Caixa',icon: '⇌', color: '#F59E0B', desc: 'Projeção de caixa' },
  { path: '/dre',         label: 'DRE',           icon: '◫', color: '#34D399', desc: 'Resultado do exercício' },
  { path: '/pessoas',      label: 'Pessoas',       icon: '◉', color: '#A78BFA', desc: 'Clientes e Fornecedores' },
  { path: '/propostas',    label: 'Propostas',     icon: '◑', color: '#F59E0B', desc: 'Importar propostas aceitas' },
  { path: '/extrato',      label: 'Extrato',       icon: '⇅', color: '#60A5FA', desc: 'Importar extrato bancário' },
  { path: '/relatorios',   label: 'Relatórios',    icon: '📊', color: '#A78BFA', desc: 'Relatórios e gráficos' },
  { path: '/configuracoes',label: 'Configurações', icon: '◎', color: '#6B9E87', desc: 'Contas, Plano, Custos' },
]

// Logo Atom Tech — sol com raios (identidade SIGECO)
const IconAtom = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="80" fill="#0D1C17"/>
    <circle cx="256" cy="210" r="80" fill="#F5A623"/>
    <g stroke="#F5A623" strokeWidth="18" strokeLinecap="round">
      <line x1="256" y1="90"  x2="256" y2="58"/>
      <line x1="256" y1="362" x2="256" y2="330"/>
      <line x1="136" y1="210" x2="104" y2="210"/>
      <line x1="408" y1="210" x2="376" y2="210"/>
      <line x1="171" y1="125" x2="149" y2="103"/>
      <line x1="363" y1="317" x2="341" y2="295"/>
      <line x1="341" y1="125" x2="363" y2="103"/>
      <line x1="149" y1="317" x2="171" y2="295"/>
    </g>
    <rect x="100" y="355" width="312" height="88" rx="12" fill="#10B981" opacity="0.25"/>
    <line x1="204" y1="355" x2="204" y2="443" stroke="#10B981" strokeWidth="2" opacity="0.4"/>
    <line x1="308" y1="355" x2="308" y2="443" stroke="#10B981" strokeWidth="2" opacity="0.4"/>
    <line x1="100" y1="399" x2="412" y2="399" stroke="#10B981" strokeWidth="2" opacity="0.4"/>
  </svg>
)

const IconLogout = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

function NavItem({ item, collapsed }: { item: typeof NAV[0]; collapsed: boolean }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(item.path)
  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      style={{
        display: 'flex', alignItems: 'center',
        gap: 12,
        padding: collapsed ? '10px 0' : '10px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 10, marginBottom: 2, textDecoration: 'none',
        background: isActive ? item.color + '14' : 'transparent',
        color: isActive ? item.color : C.textMuted,
        fontWeight: isActive ? 700 : 400, fontSize: 13.5,
        transition: 'all 0.15s',
        borderLeft: isActive && !collapsed ? '3px solid ' + item.color : '3px solid transparent',
        paddingLeft: isActive && !collapsed ? 9 : 12,
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: isActive ? item.color + '22' : 'transparent',
        border: '1px solid ' + (isActive ? item.color + '44' : 'transparent'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, color: isActive ? item.color : C.textDim,
        transition: 'all 0.15s',
        boxShadow: isActive ? '0 0 12px ' + item.color + '30' : 'none',
      }}>
        {item.icon}
      </div>
      {!collapsed && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ lineHeight: 1.2 }}>{item.label}</div>
          {isActive && (
            <div style={{ fontSize: 10, color: item.color + 'AA', fontWeight: 400, marginTop: 1 }}>{item.desc}</div>
          )}
        </div>
      )}
      {isActive && !collapsed && (
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: item.color,
          boxShadow: '0 0 8px ' + item.color,
          flexShrink: 0,
        }} />
      )}
    </NavLink>
  )
}

function logout() {
  localStorage.removeItem('atomfin_token')
  localStorage.removeItem('atomfin_usuario')
  window.location.href = '/login'
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const current   = NAV.find(n => location.pathname.startsWith(n.path))
  const pageTitle = current?.label ?? 'Financeiro'
  const pageColor = current?.color ?? C.emerald

  const usuario: any = (() => {
    try { return JSON.parse(localStorage.getItem('atomfin_usuario') || localStorage.getItem('atomtech_usuario') || '{}') } catch { return {} }
  })()

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: C.bg, overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    }}>

      {/* ── SIDEBAR ──────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 68 : 240,
        background: 'linear-gradient(180deg, #0D1C17 0%, #091410 100%)',
        borderRight: '1px solid ' + C.border,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0, zIndex: 10,
      }}>

        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 20px',
          borderBottom: '1px solid ' + C.border,
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 12, minHeight: 70,
        }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconAtom size={38} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
                <span style={{ color: '#F5A623' }}>SIGE</span><span style={{ color: C.emerald }}>CO</span>
              </div>
              <div style={{ fontSize: 9, color: C.emeraldFg, letterSpacing: '0.18em', marginTop: 3, fontWeight: 700 }}>
                GESTÃO
              </div>
            </div>
          )}
        </div>

        {/* Badge da plataforma */}
        {!collapsed && (
          <div style={{
            margin: '10px 12px 0',
            padding: '6px 10px',
            background: C.emerald + '10',
            border: '1px solid ' + C.emerald + '30',
            borderRadius: 8,
            fontSize: 9, color: C.emerald,
            fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            textAlign: 'center',
          }}>
            SIGECO · Gestão Financeira
          </div>
        )}

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          {!collapsed && (
            <div style={{
              fontSize: 9, color: C.textDim, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '4px 10px 10px',
            }}>Menu</div>
          )}
          {NAV.map(item => (
            <NavItem key={item.path} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Usuário + Sair + Recolher */}
        <div style={{ borderTop: '1px solid ' + C.border, padding: '12px 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10,
            padding: collapsed ? '8px 0' : '10px 12px',
            marginBottom: 8, borderRadius: 10,
            background: C.bg, border: '1px solid ' + C.border,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #60A5FA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {(usuario?.nome || 'U')[0].toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {usuario?.nome?.split(' ')[0] || 'Usuário'}
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim }}>Financeiro</div>
                </div>
                <button
                  onClick={logout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: '1px solid ' + C.border,
                    color: C.textMuted, cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                    padding: '5px 8px', borderRadius: 6, flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#F8717116'
                    ;(e.currentTarget as HTMLButtonElement).style.color = C.danger
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = C.danger + '40'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'none'
                    ;(e.currentTarget as HTMLButtonElement).style.color = C.textMuted
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = C.border
                  }}
                >
                  <IconLogout />
                  Sair
                </button>
              </>
            )}
          </div>

          {collapsed && (
            <button
              onClick={logout}
              title="Sair"
              style={{
                width: '100%', padding: '7px 0', borderRadius: 8,
                border: '1px solid ' + C.border, background: 'transparent',
                color: C.textDim, cursor: 'pointer', marginBottom: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#F8717116'
                ;(e.currentTarget as HTMLButtonElement).style.color = C.danger
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color = C.textDim
              }}
            >
              <IconLogout />
            </button>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '100%', padding: '8px', borderRadius: 8,
              border: '1px solid ' + C.border, background: 'transparent',
              color: C.textDim, cursor: 'pointer', fontSize: 12,
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            {collapsed ? '→' : '← Recolher'}
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TopBar */}
        <div style={{
          height: 62, background: C.bgMid,
          borderBottom: '1px solid ' + C.border,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 4, height: 20, borderRadius: 2,
              background: 'linear-gradient(180deg, ' + pageColor + ', ' + pageColor + '88)',
            }} />
            <div>
              <h1 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                {pageTitle}
              </h1>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>
                SIGECO · Gestão Financeira
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Link para a plataforma de propostas */}
            <a
              href="https://atomtech-solar-web.vercel.app"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 7,
                border: '1px solid ' + C.border,
                color: C.textMuted, fontSize: 11, fontWeight: 600,
                textDecoration: 'none', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.borderColor = C.emerald + '60'
                el.style.color = C.emerald
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.borderColor = C.border
                el.style.color = C.textMuted
              }}
              title="Ir para SIGECO Propostas"
            >
              ☀ SIGECO Propostas
            </a>

            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #60A5FA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}>
              {(usuario?.nome || 'U')[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
