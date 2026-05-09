import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { trpc } from '../../lib/trpc'

const NAV = [
  { path: '/dashboard',    label: 'Dashboard',     icon: 'â—ˆ',  color: '#F5A623', desc: 'VisÃ£o geral' },
  { path: '/propostas',    label: 'Propostas',     icon: 'â—§',  color: '#58A6FF', desc: 'GestÃ£o comercial' },
  { path: '/clientes',     label: 'Clientes',      icon: 'â—‰',  color: '#3EBB7A', desc: 'Base de clientes' },
  { path: '/faturas',      label: 'Faturas',       icon: 'â—ˆ',  color: '#BC8CFF', desc: 'Contas de energia' },
  { path: '/configuracoes',label: 'ConfiguraÃ§Ãµes', icon: 'â—Ž',  color: '#8B949E', desc: 'Sistema' },
]

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()
  const { data: empresa } = (trpc as any).empresa.get.useQuery()

  const current  = NAV.find(n => location.pathname.startsWith(n.path))
  const pageTitle = current?.label ?? 'Atom Tech'
  const pageColor = current?.color ?? '#F5A623'

  function logout() {
    localStorage.removeItem('atomtech_token')
    localStorage.removeItem('atomtech_usuario')
    window.location.href = '/login'
  }

  const usuario = (() => {
    try { return JSON.parse(localStorage.getItem('atomtech_usuario') || '{}') } catch { return {} }
  })()

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: '#0C1421',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    }}>

      {/* â”€â”€ SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside style={{
        width: collapsed ? 68 : 240,
        background: 'linear-gradient(180deg, #111D2E 0%, #0D1828 100%)',
        borderRight: '1px solid #1E3050',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}>

        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 20px',
          borderBottom: '1px solid #1E3050',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 12,
          minHeight: 70,
        }}>
          {empresa?.logoUrl ? (
            <img
              src={empresa.logoUrl}
              alt="Logo"
              style={{
                height: collapsed ? 30 : 38,
                maxWidth: collapsed ? 30 : 160,
                objectFit: 'contain',
                transition: 'all 0.25s',
              }}
            />
          ) : (
            <>
              <div style={{
                width: 38, height: 38,
                borderRadius: 10,
                flexShrink: 0,
                background: 'linear-gradient(135deg, #F5A623 0%, #E8720C 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, color: '#fff', fontWeight: 900,
                boxShadow: '0 4px 16px rgba(245,166,35,0.4)',
              }}>A</div>
              {!collapsed && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#E2EAF5', lineHeight: 1.1 }}>
                    <span style={{ color: '#F5A623' }}>ATOM</span>TECH
                  </div>
                  <div style={{ fontSize: 9, color: '#3EBB7A', letterSpacing: '0.18em', marginTop: 3, fontWeight: 700 }}>
                    ENERGIA SOLAR
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
          {!collapsed && (
            <div style={{
              fontSize: 9, color: '#3A5070', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '4px 10px 10px',
            }}>Menu</div>
          )}

          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '12px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 10,
                marginBottom: 2,
                textDecoration: 'none',
                background: isActive ? `${item.color}14` : 'transparent',
                color: isActive ? item.color : '#5A7090',
                fontWeight: isActive ? 700 : 400,
                fontSize: 13.5,
                transition: 'all 0.15s',
                borderLeft: isActive && !collapsed ? `3px solid ${item.color}` : '3px solid transparent',
                paddingLeft: isActive && !collapsed ? 9 : 12,
              })}
            >
              {({ isActive }) => (
                <>
                  <div style={{
                    width: 34, height: 34,
                    borderRadius: 9,
                    flexShrink: 0,
                    background: isActive ? `${item.color}22` : 'transparent',
                    border: isActive ? `1px solid ${item.color}44` : '1px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15,
                    color: isActive ? item.color : '#4A6080',
                    transition: 'all 0.15s',
                    boxShadow: isActive ? `0 0 12px ${item.color}30` : 'none',
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
                      boxShadow: `0 0 8px ${item.color}`,
                      flexShrink: 0,
                    }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + Collapse */}
        <div style={{ borderTop: '1px solid #1E3050', padding: '12px 8px' }}>
          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', marginBottom: 8,
              borderRadius: 10, background: '#0C1828',
              border: '1px solid #1E3050',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #F5A623, #3EBB7A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>
                {(usuario?.nome || 'U')[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#C8D8EC', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {usuario?.nome?.split(' ')[0] || 'UsuÃ¡rio'}
                </div>
                <div style={{ fontSize: 10, color: '#3A5070' }}>Admin</div>
              </div>
              <button
                onClick={logout}
                title="Sair"
                style={{
                  background: 'none', border: 'none',
                  color: '#3A5070', cursor: 'pointer',
                  fontSize: 14, padding: 4,
                  borderRadius: 6, transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F85149')}
                onMouseLeave={e => (e.currentTarget.style.color = '#3A5070')}
              >â†—</button>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '100%', padding: '8px',
              borderRadius: 8, border: '1px solid #1E3050',
              background: 'transparent', color: '#3A5070',
              cursor: 'pointer', fontSize: 12,
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F5A623'; e.currentTarget.style.borderColor = '#F5A62344' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#3A5070'; e.currentTarget.style.borderColor = '#1E3050' }}
          >
            {collapsed ? 'â†’' : 'â† Recolher'}
          </button>
        </div>
      </aside>

      {/* â”€â”€ MAIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TopBar */}
        <div style={{
          height: 62,
          background: '#111D2E',
          borderBottom: '1px solid #1E3050',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 4, height: 20, borderRadius: 2,
              background: `linear-gradient(180deg, ${pageColor}, ${pageColor}88)`,
            }} />
            <div>
              <h1 style={{ color: '#E2EAF5', fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                {pageTitle}
              </h1>
              <div style={{ fontSize: 10, color: '#3A5070', marginTop: 1 }}>
                Atom Tech Â· Sistema de Propostas Fotovoltaicas
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate('/propostas/nova')}
              style={{
                padding: '7px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #F5A623, #E8720C)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'inherit',
                boxShadow: '0 2px 10px rgba(245,166,35,0.35)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              + Nova Proposta
            </button>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #F5A623, #3EBB7A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(245,166,35,0.3)',
            }}>
              {(usuario?.nome || 'E')[0].toUpperCase()}
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