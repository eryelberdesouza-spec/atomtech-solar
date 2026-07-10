import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { C } from '../ui'
import { trpc } from '../../lib/trpc'
import { useIsMobile } from '../../hooks/useIsMobile'

// ── Ícones SVG por seção — mesmo padrão do apps/web (Feather-style, 24x24, stroke) ──
const s = (w = 18, h = 18) => ({ width: w, height: h, display: 'block' as const })

// Dashboard — barras + linha de tendência
const IcoDashboard = () => (
  <svg {...s()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="12" width="4" height="9" rx="1"/>
    <rect x="10" y="7" width="4" height="14" rx="1"/>
    <rect x="17" y="3" width="4" height="18" rx="1"/>
    <polyline points="3 6 9 3 15 5 21 2" strokeWidth="1.5"/>
  </svg>
)

// Lançamentos — setas opostas (entra/sai, pagar/receber)
const IcoLancamentos = () => (
  <svg {...s()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 1l4 4-4 4"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <path d="M7 23l-4-4 4-4"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
)

// Fluxo de Caixa — linha de projeção subindo
const IcoFluxoCaixa = () => (
  <svg {...s()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
)

// DRE — documento com linhas de resultado
const IcoDRE = () => (
  <svg {...s()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="13" y2="17"/>
  </svg>
)

// Projetos — pasta
const IcoProjetos = () => (
  <svg {...s()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)

// Pessoas — dois usuários
const IcoPessoas = () => (
  <svg {...s()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

// Propostas — documento com aprovação
const IcoPropostas = () => (
  <svg {...s()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="13" x2="15" y2="13"/>
    <line x1="9" y1="17" x2="13" y2="17"/>
    <polyline points="9 9 10 9" strokeWidth="2"/>
  </svg>
)

// Extrato — banco (colunas)
const IcoExtrato = () => (
  <svg {...s()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="21" x2="21" y2="21"/>
    <line x1="5" y1="21" x2="5" y2="10"/>
    <line x1="10" y1="21" x2="10" y2="10"/>
    <line x1="14" y1="21" x2="14" y2="10"/>
    <line x1="19" y1="21" x2="19" y2="10"/>
    <polygon points="12 2 21 8 3 8"/>
  </svg>
)

// Relatórios — gráfico de pizza
const IcoRelatorios = () => (
  <svg {...s()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
)

// Auditoria — lupa
const IcoAuditoria = () => (
  <svg {...s()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

// Configurações — engrenagem
const IcoConfiguracoes = () => (
  <svg {...s()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

const NAV = [
  { path: '/dashboard',    label: 'Dashboard',     Icon: IcoDashboard,     color: '#34D399', desc: 'Visão geral' },
  { path: '/lancamentos',  label: 'Lançamentos',   Icon: IcoLancamentos,   color: '#60A5FA', desc: 'CP / CR / Extrato' },
  { path: '/fluxo-caixa', label: 'Fluxo de Caixa',Icon: IcoFluxoCaixa,     color: '#F59E0B', desc: 'Projeção de caixa' },
  { path: '/dre',         label: 'DRE',           Icon: IcoDRE,           color: '#34D399', desc: 'Resultado do exercício' },
  { path: '/projetos',    label: 'Projetos',      Icon: IcoProjetos,      color: '#FBBF24', desc: 'Orçamento por contrato' },
  { path: '/pessoas',      label: 'Pessoas',       Icon: IcoPessoas,       color: '#A78BFA', desc: 'Clientes e Fornecedores' },
  { path: '/propostas',    label: 'Propostas',     Icon: IcoPropostas,     color: '#F59E0B', desc: 'Importar propostas aceitas' },
  { path: '/extrato',      label: 'Extrato',       Icon: IcoExtrato,       color: '#60A5FA', desc: 'Importar extrato bancário' },
  { path: '/relatorios',   label: 'Relatórios',    Icon: IcoRelatorios,    color: '#A78BFA', desc: 'Relatórios e gráficos' },
  { path: '/auditoria',    label: 'Auditoria',     Icon: IcoAuditoria,     color: '#FCA5A5', desc: 'Quem alterou o quê' },
  { path: '/configuracoes',label: 'Configurações', Icon: IcoConfiguracoes, color: '#6B9E87', desc: 'Contas, Plano, Custos' },
]

// Logo Atom Tech — sol com raios (identidade AGF)
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

function NavItem({ item, collapsed, badge }: { item: typeof NAV[0]; collapsed: boolean; badge?: number }) {
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
        color: isActive ? item.color : C.textDim,
        transition: 'all 0.15s',
        boxShadow: isActive ? '0 0 12px ' + item.color + '30' : 'none',
      }}>
        <item.Icon />
      </div>
      {!collapsed && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ lineHeight: 1.2 }}>{item.label}</div>
          {isActive && (
            <div style={{ fontSize: 10, color: item.color + 'AA', fontWeight: 400, marginTop: 1 }}>{item.desc}</div>
          )}
        </div>
      )}
      {/* Badge de alertas — !! evita renderizar o número 0 como texto */}
      {!!badge && badge > 0 && !collapsed && (
        <div style={{
          minWidth: 18, height: 18, borderRadius: 9,
          background: '#EF4444', color: '#fff',
          fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 5px', flexShrink: 0,
          boxShadow: '0 0 8px #EF444480',
        }}>{badge > 99 ? '99+' : badge}</div>
      )}
      {!!badge && badge > 0 && collapsed && (
        <div style={{
          position: 'absolute', top: 2, right: 2,
          width: 8, height: 8, borderRadius: '50%',
          background: '#EF4444',
          boxShadow: '0 0 6px #EF4444',
        }} />
      )}
      {isActive && !collapsed && (!badge || badge === 0) && (
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
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Fecha a sidebar mobile ao trocar de rota
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  // Badge de alertas não lidos (OS concluídas com recebimento pendente)
  const { data: alertaCount } = (trpc as any).fin.alerta.count.useQuery(
    undefined,
    { staleTime: 60_000, refetchInterval: 5 * 60 * 1000 } // revalida a cada 5 min
  )
  const totalAlertas = Number((alertaCount as any)?.total ?? 0)

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

      {/* ── OVERLAY MOBILE ───────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: '#00000070', zIndex: 40 }}
        />
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────── */}
      <aside style={{
        width: isMobile ? 240 : (collapsed ? 68 : 240),
        background: 'linear-gradient(180deg, #0D1C17 0%, #091410 100%)',
        borderRight: '1px solid ' + C.border,
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
                <span style={{ color: '#F5A623' }}>A</span><span style={{ color: C.emerald }}>GF</span>
              </div>
              <div style={{ fontSize: 9, color: C.emeraldFg, letterSpacing: '0.18em', marginTop: 3, fontWeight: 700 }}>
                GESTÃO FINANCEIRA
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
            AGF · Atom Gestão Financeira
          </div>
        )}

        {/* Nav — overflowY + minHeight:0 garantem rolagem própria em telas baixas (notebook) */}
        <nav style={{ padding: '12px 8px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {!collapsed && (
            <div style={{
              fontSize: 9, color: C.textDim, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '4px 10px 10px',
            }}>Menu</div>
          )}
          {NAV.map(item => (
            <NavItem
              key={item.path}
              item={item}
              collapsed={collapsed}
              badge={item.path === '/dashboard' ? totalAlertas : undefined}
            />
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

          {!isMobile && (
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
          )}
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
          padding: isMobile ? '0 14px' : '0 28px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, minWidth: 0 }}>
            {/* Hambúrguer — só mobile */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(v => !v)}
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'transparent', border: '1px solid ' + C.border,
                  color: C.textMuted, cursor: 'pointer', flexShrink: 0,
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
              <h1 style={{ color: C.text, fontSize: isMobile ? 14 : 16, fontWeight: 700, margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pageTitle}
              </h1>
              {!isMobile && (
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>
                  AGF · Atom Gestão Financeira
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexShrink: 0 }}>
            {/* Link para a plataforma de propostas — some no mobile pra economizar espaço */}
            {!isMobile && (
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
                title="Ir para AGO — Atom Gestão Operacional"
              >
                ☀ AGO Operacional
              </a>
            )}

            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #60A5FA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)', flexShrink: 0,
            }}>
              {(usuario?.nome || 'U')[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: C.bg }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
