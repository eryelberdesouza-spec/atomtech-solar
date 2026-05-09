import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { trpc } from '../../lib/trpc'

const NAV = [
  { path: '/dashboard',     label: 'Dashboard',       icon: '⊞', color: '#F0A500' },
  { path: '/propostas',     label: 'Propostas',       icon: '📄', color: '#58A6FF' },
  { path: '/clientes',      label: 'Clientes',        icon: '👥', color: '#3FB950' },
  { path: '/faturas',       label: 'Faturas',         icon: '⚡', color: '#BC8CFF' },
  { path: '/configuracoes', label: 'Configurações',   icon: '⚙️', color: '#8B949E' },
]

const C = {
  bg:      '#0D1117', bg2: '#161B22', bg3: '#1C2333',
  border:  '#30363D', border2: '#21262D',
  text:    '#E6EDF3', text2: '#8B949E', text3: '#6E7681',
  solar:   '#F0A500', green: '#3FB950', blue: '#58A6FF',
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { data: empresa } = trpc.empresa.get.useQuery()

  const pageTitle = NAV.find(n => location.pathname.startsWith(n.path))?.label ?? 'Atom Tech'

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 220, background: C.bg2,
        borderRight: `1px solid ${C.border2}`,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '16px 0' : '16px 18px',
          borderBottom: `1px solid ${C.border2}`,
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start', gap: 10,
          minHeight: 64,
        }}>
          {empresa?.logoUrl ? (
            <img
              src={empresa.logoUrl}
              alt="Logo"
              style={{
                height: collapsed ? 32 : 36,
                maxWidth: collapsed ? 32 : 160,
                objectFit: 'contain',
                transition: 'all 0.2s',
              }}
            />
          ) : (
            <>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: 'linear-gradient(135deg, #F0A500, #E8720C)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: '#fff', fontWeight: 900,
                boxShadow: '0 4px 12px rgba(240,165,0,0.35)',
              }}>A</div>
              {!collapsed && (
                <div>
                  <div style={{ color: C.text, fontWeight: 800, fontSize: 14, lineHeight: 1 }}>
                    <span style={{ color: C.solar }}>ATOM</span>TECH
                  </div>
                  <div style={{ color: C.green, fontSize: 9, letterSpacing: '0.15em', marginTop: 2 }}>SOLAR</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '14px 8px', flex: 1 }}>
          {!collapsed && (
            <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px 8px' }}>
              Menu
            </div>
          )}
          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center',
                gap: 10,
                padding: collapsed ? '11px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 9, marginBottom: 3,
                textDecoration: 'none',
                background: isActive ? `${item.color}18` : 'transparent',
                color: isActive ? item.color : C.text2,
                fontWeight: isActive ? 600 : 400,
                fontSize: 13.5,
                transition: 'all 0.15s',
                position: 'relative' as any,
                borderLeft: isActive && !collapsed ? `3px solid ${item.color}` : '3px solid transparent',
              })}
              title={collapsed ? item.label : undefined}
            >
              <span style={{ fontSize: 16, minWidth: 20, textAlign: 'center' }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            margin: 8, padding: 8, borderRadius: 8,
            border: `1px solid ${C.border2}`, background: 'transparent',
            color: C.text3, cursor: 'pointer', fontSize: 14,
            transition: 'all 0.15s',
          }}
        >
          {collapsed ? '→' : '←'}
        </button>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* TopBar */}
        <div style={{
          height: 58, background: C.bg2,
          borderBottom: `1px solid ${C.border2}`,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px', flexShrink: 0,
        }}>
          <h1 style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: 0 }}>
            {pageTitle}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                localStorage.removeItem('atomtech_token')
                localStorage.removeItem('atomtech_usuario')
                window.location.href = '/login'
              }}
              style={{
                padding: '7px 16px', borderRadius: 8, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.text2, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'all 0.15s',
              }}
            >
              Sair
            </button>
            <div style={{
              width: 35, height: 35, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.solar}, ${C.green})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff',
              cursor: 'pointer',
            }}>E</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
