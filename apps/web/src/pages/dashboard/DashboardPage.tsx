import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { NAV } from '../../components/layout/Layout'
import { useIsMobile } from '../../hooks/useIsMobile'

// ═══════════════════════════════════════════════════════════════════
// Dashboard = HUB de navegação (redesenhado em 2026-09-09)
//
// Antes esta tela era um painel de propostas: KPIs, funil e últimas
// propostas. Ficou desconectada do resto conforme a plataforma cresceu —
// era "a tela de propostas" ocupando o lugar da tela inicial, enquanto
// Operacional, Relatórios e Clientes não apareciam em lugar nenhum aqui.
//
// Agora a primeira tela é um ponto de partida: os mesmos destinos do menu
// lateral, como botões grandes. O resumo comercial que vivia aqui foi para
// dentro de Propostas, que é onde ele tem contexto.
// ═══════════════════════════════════════════════════════════════════

function saudacao(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bom dia! ☀️'
  if (h >= 12 && h < 18) return 'Boa tarde! 🌤️'
  return 'Boa noite! 🌙'
}

const AGF_URL = 'https://financeiro-two-mu.vercel.app'

export function DashboardPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const { data: empresa } = (trpc as any).empresa.get.useQuery()

  const usuario: any = (() => {
    try { return JSON.parse(localStorage.getItem('atomtech_usuario') || '{}') } catch { return {} }
  })()
  const isTecnico = usuario?.role === 'tecnico'
  const isAdmin = usuario?.role === 'admin'

  // Único número que sobrou na tela inicial: propostas prestes a vencer.
  // O resto do resumo foi pra Propostas, mas este é o que perde o sentido
  // se depender de alguém lembrar de ir olhar — proposta vencida vira
  // "expirada" sozinha, e expirada é o maior grupo do funil.
  const { data: aVencer } = (trpc as any).proposta.aVencer.useQuery(
    { dias: 7 },
    { enabled: !isTecnico },
  )
  const qtdAVencer: number = (aVencer ?? []).length

  // Técnico só enxerga Operacional (mesma regra do menu lateral).
  const destinos = (isTecnico ? NAV.filter(n => n.path === '/ordens-servico') : NAV)
    .filter(n => n.path !== '/dashboard')

  // No celular o card é uma faixa horizontal (ícone à esquerda, texto à
  // direita) — cabe mais item na tela. No desktop é vertical e alto: preenche
  // a altura disponível em vez de deixar os botões achatados no topo com meia
  // tela vazia embaixo.
  const cardBase: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: isMobile ? 'row' : 'column',
    alignItems: isMobile ? 'center' : 'flex-start',
    justifyContent: isMobile ? 'flex-start' : 'center',
    gap: isMobile ? 14 : 16,
    padding: isMobile ? '18px 16px' : '28px 26px',
    minHeight: isMobile ? 76 : 168,
    background: 'linear-gradient(135deg, #111D2E, #0E1A2A)',
    border: '1px solid #1E3050',
    borderRadius: 14,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
    width: '100%',
  }

  return (
    // Sem maxWidth apertado: os botões devem ocupar a largura da tela. O teto
    // de 1600 existe só pra não esticarem demais em monitor ultrawide.
    <div style={{ padding: isMobile ? '16px 14px' : '28px 32px', maxWidth: 1600 }}>

      <div style={{ marginBottom: isMobile ? 18 : 28 }}>
        <h2 style={{ color: '#E2EAF5', fontSize: isMobile ? 19 : 23, fontWeight: 800, margin: '0 0 4px' }}>
          {saudacao()}
        </h2>
        <p style={{ color: '#7488A8', fontSize: 13, margin: 0 }}>
          {(empresa as any)?.nome ?? 'Atom Tech'} · Por onde você quer começar?
        </p>
      </div>

      <div style={{
        display: 'grid',
        // auto-FIT (não auto-fill): sem colunas fantasmas sobrando, os botões
        // esticam pra preencher a linha. 340px de mínimo dá 4 colunas em tela
        // cheia — 7 destinos viram 4+3, que fica equilibrado.
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: isMobile ? 10 : 16,
      }}>
        {destinos.map(item => {
          const { Icon } = item
          const alerta = item.path === '/propostas' && qtdAVencer > 0
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{ ...cardBase, borderLeft: `3px solid ${item.color}` }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.background = '#16243A'
                el.style.borderColor = item.color + '55'
                el.style.borderLeftColor = item.color
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.background = 'linear-gradient(135deg, #111D2E, #0E1A2A)'
                el.style.borderColor = '#1E3050'
                el.style.borderLeftColor = item.color
              }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: isMobile ? 44 : 54, height: isMobile ? 44 : 54, borderRadius: 13, flexShrink: 0,
                background: item.color + '18', color: item.color,
              }}>
                <Icon />
              </span>

              <span style={{ flex: isMobile ? 1 : undefined, width: isMobile ? undefined : '100%', minWidth: 0 }}>
                <span style={{ display: 'block', color: '#E2EAF5', fontSize: isMobile ? 15 : 18, fontWeight: 700 }}>
                  {item.label}
                </span>
                <span style={{ display: 'block', color: '#7488A8', fontSize: isMobile ? 12 : 13, marginTop: 4 }}>
                  {alerta
                    ? `${qtdAVencer} proposta${qtdAVencer !== 1 ? 's' : ''} vencendo em até 7 dias`
                    : item.desc}
                </span>
              </span>

              {/* No desktop, contador e seta vão pro canto superior direito —
                  em coluna eles empilhariam abaixo do texto. */}
              <span style={{
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                ...(isMobile ? {} : { position: 'absolute', top: 18, right: 20 }),
              }}>
                {alerta && (
                  <span style={{
                    padding: '3px 9px', borderRadius: 20,
                    background: '#D2992220', color: '#D29922',
                    fontSize: 12, fontWeight: 800,
                  }}>{qtdAVencer}</span>
                )}
                <span style={{ color: '#3D5170', fontSize: 22 }}>›</span>
              </span>
            </button>
          )
        })}

        {/* AGF é outro sistema (Vercel à parte), por isso link e não navigate. */}
        {!isTecnico && (
          <a
            href={isAdmin ? AGF_URL : undefined}
            onClick={!isAdmin ? e => {
              e.preventDefault()
              alert('Acesso ao módulo Financeiro é restrito a administradores.\n\nSeu perfil: ' + (usuario?.role || 'desconhecido'))
            } : undefined}
            style={{
              ...cardBase,
              borderLeft: '3px solid #10B981',
              textDecoration: 'none',
              opacity: isAdmin ? 1 : 0.55,
              cursor: isAdmin ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={isAdmin ? e => {
              const el = e.currentTarget
              el.style.background = '#16243A'
              el.style.borderColor = '#10B98155'
              el.style.borderLeftColor = '#10B981'
            } : undefined}
            onMouseLeave={isAdmin ? e => {
              const el = e.currentTarget
              el.style.background = 'linear-gradient(135deg, #111D2E, #0E1A2A)'
              el.style.borderColor = '#1E3050'
              el.style.borderLeftColor = '#10B981'
            } : undefined}
            title={isAdmin ? 'Abrir AGF — Atom Gestão Financeira' : 'Acesso restrito a administradores'}
          >
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: isMobile ? 44 : 54, height: isMobile ? 44 : 54, borderRadius: 13, flexShrink: 0,
              background: '#10B98118', color: '#10B981', fontSize: isMobile ? 19 : 23,
            }}>◈</span>
            <span style={{ flex: isMobile ? 1 : undefined, width: isMobile ? undefined : '100%', minWidth: 0 }}>
              <span style={{ display: 'block', color: '#E2EAF5', fontSize: isMobile ? 15 : 18, fontWeight: 700 }}>
                AGF Financeiro
              </span>
              <span style={{ display: 'block', color: '#7488A8', fontSize: isMobile ? 12 : 13, marginTop: 4 }}>
                {isAdmin ? 'Contas a pagar e receber' : 'Restrito a administradores'}
              </span>
            </span>
            <span style={{
              color: '#3D5170', fontSize: 22, flexShrink: 0,
              ...(isMobile ? {} : { position: 'absolute', top: 18, right: 20 }),
            }}>
              {isAdmin ? '↗' : '🔒'}
            </span>
          </a>
        )}
      </div>
    </div>
  )
}
