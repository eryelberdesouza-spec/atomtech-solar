import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { trpc } from '../../lib/trpc'
import { NovaPropostaDropdown } from '../ui/NovaPropostaDropdown'
import { useIsMobile } from '../../hooks/useIsMobile'

// Logo Atom Tech — identidade SIGECO
const IconAtom = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="80" fill="#111D2E"/>
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
    <rect x="100" y="355" width="312" height="88" rx="12" fill="#3EBB7A" opacity="0.25"/>
    <line x1="204" y1="355" x2="204" y2="443" stroke="#3EBB7A" strokeWidth="2" opacity="0.4"/>
    <line x1="308" y1="355" x2="308" y2="443" stroke="#3EBB7A" strokeWidth="2" opacity="0.4"/>
    <line x1="100" y1="399" x2="412" y2="399" stroke="#3EBB7A" strokeWidth="2" opacity="0.4"/>
  </svg>
)

const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const NAV = [
  { path: '/dashboard',      label: 'Dashboard',    icon: '◈', color: '#F5A623', desc: 'Visão geral'       },
  { path: '/propostas',      label: 'Propostas',    icon: '◧', color: '#58A6FF', desc: 'Gestão comercial'  },
  { path: '/clientes',       label: 'Clientes',     icon: '◉', color: '#3EBB7A', desc: 'Base de clientes'  },
  { path: '/faturas',        label: 'Faturas',      icon: '◈', color: '#BC8CFF', desc: 'Contas de energia' },
  { path: '/ordens-servico', label: 'Operacional',  icon: '⚙', color: '#FB923C', desc: 'Ordens de serviço' },
  { path: '/configuracoes',  label: 'Configurações',icon: '◎', color: '#8B949E', desc: 'Sistema'           },
]

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
        color: isActive ? item.color : '#5A7090',
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
        fontSize: 16, color: isActive ? item.color : '#4A6080',
        transition: 'all 0.15s',
        boxShadow: isActive ? '0 0 12px ' + item.color + '30' : 'none',
      }}>
        {item.icon}
      </div>
      {!collapsed && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ lineHeight: 1.2 }}>{item.label}</div>
          {isActive && (
            <div style={{ fontSize: 10, color: item.color + 'AA', fontWeight: 400, marginTop: 1 }}>
              {item.desc}
            </div>
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

export function Layout() {
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { data: empresa } = (trpc as any).empresa.get.useQuery()

  const current   = NAV.find(n => location.pathname.startsWith(n.path))
  const pageTitle = current?.label ?? 'Atom Tech'
  const pageColor = current?.color ?? '#F5A623'

  // Fecha sidebar mobile ao trocar de rota
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  function logout() {
    localStorage.removeItem('atomtech_token')
    localStorage.removeItem('atomtech_usuario')
    window.location.href = '/login'
  }

  const usuario: any = (() => {
    try { return JSON.parse(localStorage.getItem('atomtech_usuario') || '{}') } catch { return {} }
  })()

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: '#0C1421', overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    }}>

      {/* ── OVERLAY MOBILE ───────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: '#00000070',
            zIndex: 40,
          }}
        />
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────── */}
      <aside style={{
        width: isMobile ? 240 : (collapsed ? 68 : 240),
        background: 'linear-gradient(180deg, #111D2E 0%, #0D1828 100%)',
        borderRight: '1px solid #1E3050',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0, zIndex: 50,
        ...(isMobile ? {
          position: 'fixed', top: 0, left: 0, bottom: 0,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        } : {}),
      }}>

        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 20px',
          borderBottom: '1px solid #1E3050',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 12, minHeight: 70,
        }}>
          {empresa?.logoUrl ? (
            <img src={empresa.logoUrl} alt="Logo" style={{
              height: collapsed ? 30 : 38,
              maxWidth: collapsed ? 30 : 160,
              objectFit: 'contain', transition: 'all 0.25s',
            }} />
          ) : (
            <>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconAtom size={38} />
              </div>
              {!collapsed && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#E2EAF5', lineHeight: 1.1 }}>
                    <span style={{ color: '#F5A623' }}>SIGE</span><span style={{ color: '#3EBB7A' }}>CO</span>
                  </div>
                  <div style={{ fontSize: 9, color: '#3EBB7A', letterSpacing: '0.18em', marginTop: 3, fontWeight: 700 }}>
                    PROPOSTAS
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          {!collapsed && (
            <div style={{
              fontSize: 9, color: '#3A5070', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '4px 10px 10px',
            }}>Menu</div>
          )}
          {NAV.map(item => (
            <NavItem key={item.path} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Usuário + Logout + Recolher */}
        <div style={{ borderTop: '1px solid #1E3050', padding: '12px 8px' }}>

          {/* Card do usuário — sempre visível, adapta ao estado */}
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10,
            padding: collapsed ? '8px 0' : '10px 12px',
            marginBottom: 8, borderRadius: 10,
            background: '#0C1828', border: '1px solid #1E3050',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #F5A623, #3EBB7A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {(usuario?.nome || 'U')[0].toUpperCase()}
            </div>

            {/* Nome + cargo (só expandido) */}
            {!collapsed && (
              <>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: '#C8D8EC',
                    lineHeight: 1.2, whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {usuario?.nome?.split(' ')[0] || 'Usuário'}
                  </div>
                  <div style={{ fontSize: 10, color: '#3A5070' }}>Admin</div>
                </div>

                {/* Botão Sair — expandido: ícone + texto */}
                <button
                  onClick={logout}
                  title="Sair da plataforma"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: '1px solid #2A3F55',
                    color: '#7A92AA', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                    padding: '5px 8px', borderRadius: 6, flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#FF444416'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#FF6B6B'
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#FF444440'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'none'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#7A92AA'
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#2A3F55'
                  }}
                >
                  <IconLogout />
                  Sair
                </button>
              </>
            )}
          </div>

          {/* Botão Sair separado (só recolhido) */}
          {collapsed && (
            <button
              onClick={logout}
              title="Sair da plataforma"
              style={{
                width: '100%', padding: '7px 0', borderRadius: 8,
                border: '1px solid #1E3050', background: 'transparent',
                color: '#3A5070', cursor: 'pointer', marginBottom: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#FF444416'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#FF6B6B'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#FF444440'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#3A5070'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#1E3050'
              }}
            >
              <IconLogout />
            </button>
          )}

          {/* Botão recolher/expandir — apenas desktop */}
          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                width: '100%', padding: '8px', borderRadius: 8,
                border: '1px solid #1E3050', background: 'transparent',
                color: '#3A5070', cursor: 'pointer', fontSize: 12,
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}
            >
              {collapsed ? '→' : '← Recolher'}
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        marginLeft: isMobile ? 0 : undefined,
      }}>

        {/* TopBar */}
        <div style={{
          height: 62, background: '#111D2E',
          borderBottom: '1px solid #1E3050',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 14px' : '0 28px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
            {/* Hambúrguer — só mobile */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(v => !v)}
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'transparent', border: '1px solid #1E3050',
                  color: '#8A9BB5', cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, lineHeight: 1,
                }}
              >☰</button>
            )}
            <div style={{
              width: 4, height: 20, borderRadius: 2, flexShrink: 0,
              background: 'linear-gradient(180deg, ' + pageColor + ', ' + pageColor + '88)',
            }} />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ color: '#E2EAF5', fontSize: isMobile ? 14 : 16, fontWeight: 700, margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pageTitle}
              </h1>
              {!isMobile && (
                <div style={{ fontSize: 10, color: '#3A5070', marginTop: 1 }}>
                  SIGECO · Plataforma Comercial
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
            {!isMobile && <NovaPropostaDropdown />}

            {/* Link para Financeiro — visível apenas para admin */}
            {!isMobile && (() => {
              const isAdmin = usuario?.role === 'admin'
              return (
                <a
                  href={isAdmin ? 'https://financeiro-two-mu.vercel.app' : undefined}
                  onClick={!isAdmin ? (e) => {
                    e.preventDefault()
                    alert('Acesso ao módulo Financeiro é restrito a administradores.\n\nSeu perfil: ' + (usuario?.role || 'desconhecido'))
                  } : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 7,
                    border: '1px solid ' + (isAdmin ? '#1E4033' : '#1E2D3A'),
                    color: isAdmin ? '#10B981' : '#3A5070',
                    fontSize: 11, fontWeight: 600, textDecoration: 'none',
                    transition: 'all 0.15s', cursor: isAdmin ? 'pointer' : 'not-allowed',
                    opacity: isAdmin ? 1 : 0.5,
                  }}
                  onMouseEnter={isAdmin ? e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.background = '#10B98114'
                    el.style.borderColor = '#10B98140'
                  } : undefined}
                  onMouseLeave={isAdmin ? e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.background = 'transparent'
                    el.style.borderColor = '#1E4033'
                  } : undefined}
                  title={isAdmin ? 'Abrir SIGECO Gestão' : 'Acesso restrito a administradores'}
                >
                  ◈ SIGECO Gestão
                  {!isAdmin && <span style={{ fontSize: 9, color: '#4A6080' }}>🔒</span>}
                </a>
              )
            })()}

            {/* Avatar com dropdown de usuário */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                title="Menu do usuário"
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F5A623, #3EBB7A)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: '#fff',
                  boxShadow: '0 2px 8px rgba(245,166,35,0.3)',
                  border: showUserMenu ? '2px solid #F5A623' : '2px solid transparent',
                  cursor: 'pointer', transition: 'border 0.15s',
                }}
              >
                {(usuario?.nome || 'E')[0].toUpperCase()}
              </button>

              {/* Dropdown */}
              {showUserMenu && (
                <div style={{
                  position: 'absolute', top: 44, right: 0, zIndex: 100,
                  background: '#131F30', border: '1px solid #1E3050',
                  borderRadius: 10, padding: 6, minWidth: 180,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                  {/* Info do usuário */}
                  <div style={{
                    padding: '8px 10px 10px', borderBottom: '1px solid #1E3050', marginBottom: 4,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#C8D8EC' }}>
                      {usuario?.nome || 'Usuário'}
                    </div>
                    <div style={{ fontSize: 10, color: '#3A5070', marginTop: 2 }}>
                      {usuario?.email || 'Admin'}
                    </div>
                  </div>

                  {/* Botão Sair */}
                  <button
                    onClick={logout}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 7, border: 'none',
                      background: 'transparent', color: '#FF6B6B',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      fontFamily: 'inherit', transition: 'background 0.15s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FF444420')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <IconLogout />
                    Sair da plataforma
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#0C1421' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
