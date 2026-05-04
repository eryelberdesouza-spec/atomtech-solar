// ═══════════════════════════════════════════════════════════════════
// Layout — Sidebar + TopBar + Outlet
// ═══════════════════════════════════════════════════════════════════

import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'

const NAV = [
  { path: '/dashboard',     label: 'Dashboard',      icon: '⊞' },
  { path: '/propostas',     label: 'Propostas',      icon: '📄' },
  { path: '/clientes',      label: 'Clientes',       icon: '👥' },
  { path: '/faturas',       label: 'Faturas',        icon: '⚡' },
  { path: '/configuracoes', label: 'Configurações',  icon: '⚙' },
]

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const pageTitle = NAV.find(n => location.pathname.startsWith(n.path))?.label ?? 'Atom Tech'

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0F1923', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 60 : 220,
        background: '#1A2535',
        borderRight: '1px solid #2D3F58',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 20px',
          borderBottom: '1px solid #2D3F58',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #F5A623, #D4881A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', fontWeight: 900,
          }}>A</div>
          {!collapsed && (
            <div>
              <div style={{ color: '#E8EDF5', fontWeight: 800, fontSize: 14, lineHeight: 1 }}>
                <span style={{ color: '#F5A623' }}>ATOM</span>TECH
              </div>
              <div style={{ color: '#2D9C4E', fontSize: 9, letterSpacing: '0.15em' }}>SOLAR</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 9,
                marginBottom: 3,
                textDecoration: 'none',
                background: isActive ? 'rgba(245,166,35,0.12)' : 'transparent',
                color: isActive ? '#F5A623' : '#8A9BB5',
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: 16, minWidth: 20, textAlign: 'center' }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            margin: 8, padding: 8, borderRadius: 8,
            border: '1px solid #2D3F58', background: 'transparent',
            color: '#4A5E7A', cursor: 'pointer', fontSize: 14,
          }}
        >
          {collapsed ? '→' : '←'}
        </button>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* TopBar */}
        <div style={{
          height: 56, background: '#1A2535',
          borderBottom: '1px solid #2D3F58',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          <h1 style={{ color: '#E8EDF5', fontSize: 16, fontWeight: 600, margin: 0 }}>
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
                padding: '6px 14px', borderRadius: 8, border: '1px solid #2D3F58',
                background: 'transparent', color: '#4A5E7A', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
              }}
            >
              ⎋ Sair
            </button>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #F5A623, #2D9C4E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff',
            }} title="Eryelber Correia">E</div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
