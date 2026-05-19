import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { NovaPropostaDropdown } from '../../components/ui/NovaPropostaDropdown'

function formatDate(s: string | null | undefined): string {
  if (!s) return '—'
  try { const d = new Date(s); return d.toLocaleDateString('pt-BR') } catch { return '—' }
}

const S: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  rascunho: { label: 'Rascunho',  color: '#8B949E', bg: '#8B949E18', icon: '📝' },
  enviada:  { label: 'Enviada',   color: '#58A6FF', bg: '#58A6FF18', icon: '📤' },
  aceita:   { label: 'Aceita',    color: '#3EBB7A', bg: '#3EBB7A18', icon: '✅' },
  recusada: { label: 'Recusada', color: '#F85149', bg: '#F8514918', icon: '❌' },
  expirada: { label: 'Expirada', color: '#D29922', bg: '#D2992218', icon: '⏰' },
}

function KpiCard({ label, value, sub, trend, icon, color }: {
  label: string; value: string | number; sub?: string; trend?: number; icon: string; color: string
}) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #111D2E 0%, #0E1A2A 100%)',
        borderRadius: 14, border: '1px solid #1E3050',
        borderTop: '3px solid ' + color,
        padding: '22px 24px', position: 'relative', overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px ' + color + '20';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: color + '10', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#4A6080', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>{label}</p>
          <p style={{ color: '#E2EAF5', fontSize: 32, fontWeight: 800, lineHeight: 1, margin: '0 0 6px' }}>{value}</p>
          {sub && <p style={{ color: '#4A6080', fontSize: 12, margin: '0 0 10px' }}>{sub}</p>}
          {trend !== undefined && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: trend >= 0 ? '#3EBB7A18' : '#F8514918',
              color: trend >= 0 ? '#3EBB7A' : '#F85149',
            }}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs. mês anterior
            </div>
          )}
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 13, flexShrink: 0,
          background: color + '18', border: '1px solid ' + color + '30',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, boxShadow: '0 4px 16px ' + color + '20',
        }}>{icon}</div>
      </div>
    </div>
  )
}

function FunilBar({ label, count, total, color, icon }: { label: string; count: number; total: number; color: string; icon: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>{icon}</span>
          <span style={{ color: '#8A9BB5', fontSize: 13 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: color, fontWeight: 700, fontSize: 15 }}>{count}</span>
          <span style={{ color: '#3A5070', fontSize: 11 }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#1E3050' }}>
        <div style={{
          height: '100%', width: pct + '%', borderRadius: 3,
          background: 'linear-gradient(90deg, ' + color + ', ' + color + '88)',
          boxShadow: '0 0 8px ' + color + '60',
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: raw, isLoading } = (trpc as any).proposta.list.useQuery({ page: 1, pageSize: 100 })
  const { data: empresa } = (trpc as any).empresa.get.useQuery()
  const propostas: any[] = raw?.data ?? []

  const stats = useMemo(() => {
    const t      = propostas.filter(p => !p.isTemplate).length
    const aceitas = propostas.filter(p => p.status === 'aceita').length
    return {
      abertas:    propostas.filter(p => ['rascunho','enviada'].includes(p.status)).length,
      aguardando: propostas.filter(p => p.status === 'enviada').length,
      aceitas,
      conversao:  t > 0 ? Math.round((aceitas / t) * 100) : 0,
      total: t,
      funil: {
        rascunho: propostas.filter(p => p.status === 'rascunho').length,
        enviada:  propostas.filter(p => p.status === 'enviada').length,
        aceita:   propostas.filter(p => p.status === 'aceita').length,
        recusada: propostas.filter(p => p.status === 'recusada').length,
        expirada: propostas.filter(p => p.status === 'expirada').length,
      },
    }
  }, [propostas])

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #1E3050', borderTopColor: '#F5A623', animation: 'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  )

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: '#E2EAF5', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Bom dia! ☀️</h2>
        <p style={{ color: '#4A6080', fontSize: 14, margin: 0 }}>
          {(empresa as any)?.nome ?? 'Atom Tech'} · Aqui está o resumo de hoje
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KpiCard label="Propostas Abertas"    value={stats.abertas}            sub="rascunhos + enviadas"   trend={12}  icon="📋" color="#F5A623" />
        <KpiCard label="Aguardando Resposta"  value={stats.aguardando}         sub="propostas enviadas"                 icon="📤" color="#58A6FF" />
        <KpiCard label="Taxa de Conversão"    value={stats.conversao + '%'}    sub="aceitas / total"        trend={-3}  icon="📊" color="#BC8CFF" />
        <KpiCard label="Propostas Aceitas"    value={stats.aceitas}            sub="no período carregado"              icon="✅" color="#3EBB7A" />
      </div>

      {/* Main Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Tabela propostas */}
        <div style={{ background: 'linear-gradient(135deg, #111D2E, #0E1A2A)', borderRadius: 14, border: '1px solid #1E3050', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #1A2D45' }}>
            <div>
              <h3 style={{ color: '#E2EAF5', fontSize: 15, fontWeight: 700, margin: 0 }}>Últimas Propostas</h3>
              <p style={{ color: '#3A5070', fontSize: 11, margin: '2px 0 0' }}>{propostas.length} proposta{propostas.length !== 1 ? 's' : ''} no total</p>
            </div>
            <button onClick={() => navigate('/propostas')}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #1E3050', background: 'transparent', color: '#F5A623', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5A62310'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#F5A62344' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E3050' }}
            >Ver todas →</button>
          </div>

          {propostas.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#3A5070' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <p style={{ margin: '0 0 16px', fontSize: 14 }}>Nenhuma proposta ainda.</p>
              <NovaPropostaDropdown label="+ Criar primeira proposta" />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Nº', 'Cliente', 'Status', 'Data', ''].map(c => (
                  <th key={c} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, color: '#3A5070', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #1A2D45' }}>{c}</th>
                ))}</tr>
              </thead>
              <tbody>
                {propostas.slice(0,5).map((p: any, i: number) => {
                  const st = S[p.status] ?? S.rascunho
                  return (
                    <tr key={p.id} onClick={() => navigate('/propostas/' + p.id)}
                      style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = '#1A2D4540')}
                      onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                    >
                      <td style={{ padding: '13px 16px', fontSize: 12, color: '#F5A623', fontWeight: 700, borderBottom: i < 4 ? '1px solid #1A2D4550' : 'none' }}>{p.numero}</td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: '#C8D8EC', borderBottom: i < 4 ? '1px solid #1A2D4550' : 'none', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.clienteNome}</td>
                      <td style={{ padding: '13px 16px', borderBottom: i < 4 ? '1px solid #1A2D4550' : 'none' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: st.bg, color: st.color, textTransform: 'uppercase' }}>
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: '#4A6080', borderBottom: i < 4 ? '1px solid #1A2D4550' : 'none' }}>{formatDate(p.dataEmissao)}</td>
                      <td style={{ padding: '13px 16px', color: '#3A5070', borderBottom: i < 4 ? '1px solid #1A2D4550' : 'none' }}>›</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Coluna direita */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Funil */}
          <div style={{ background: 'linear-gradient(135deg, #111D2E, #0E1A2A)', borderRadius: 14, border: '1px solid #1E3050', padding: '20px 22px' }}>
            <h3 style={{ color: '#E2EAF5', fontSize: 14, fontWeight: 700, margin: '0 0 18px' }}>Funil de Propostas</h3>
            <FunilBar label="Rascunho" count={stats.funil.rascunho} total={stats.total} color="#8B949E" icon="📝" />
            <FunilBar label="Enviada"  count={stats.funil.enviada}  total={stats.total} color="#58A6FF" icon="📤" />
            <FunilBar label="Aceita"   count={stats.funil.aceita}   total={stats.total} color="#3EBB7A" icon="✅" />
            <FunilBar label="Recusada" count={stats.funil.recusada} total={stats.total} color="#F85149" icon="❌" />
            <FunilBar label="Expirada" count={stats.funil.expirada} total={stats.total} color="#D29922" icon="⏰" />
          </div>

          {/* Ações Rápidas */}
          <div style={{ background: 'linear-gradient(135deg, #111D2E, #0E1A2A)', borderRadius: 14, border: '1px solid #1E3050', padding: '20px 22px' }}>
            <h3 style={{ color: '#E2EAF5', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>Ações Rápidas</h3>
            <div style={{ marginBottom: 6 }}>
              <NovaPropostaDropdown label="+ Nova Proposta" size="md" />
            </div>
            {[
              { label: '+ Novo Cliente',   path: '/clientes',       color: '#3EBB7A', icon: '👤' },
              { label: '+ Nova Fatura',    path: '/faturas/nova',   color: '#BC8CFF', icon: '⚡' },
              { label: '⚙ Configurações', path: '/configuracoes',  color: '#8B949E', icon: '⚙️' },
            ].map(a => (
              <button key={a.path} onClick={() => navigate(a.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 12px', marginBottom: 6,
                  borderRadius: 9, border: '1px solid #1E3050',
                  background: 'transparent', color: '#8A9BB5',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  fontFamily: 'inherit', transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = a.color + '12'; (e.currentTarget as HTMLButtonElement).style.color = a.color; (e.currentTarget as HTMLButtonElement).style.borderColor = a.color + '40' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#8A9BB5'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E3050' }}
              >
                <span style={{ fontSize: 16 }}>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
