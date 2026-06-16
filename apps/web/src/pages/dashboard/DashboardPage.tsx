import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { NovaPropostaDropdown } from '../../components/ui/NovaPropostaDropdown'
import { useIsMobile } from '../../hooks/useIsMobile'

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

function fmtBRL(v: number): string {
  if (v === 0) return '—'
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function KpiCard({ label, value, valor, sub, icon, color }: {
  label: string; value: string | number; valor?: number; sub?: string; icon: string; color: string
}) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #111D2E 0%, #0E1A2A 100%)',
        borderRadius: 14, border: '1px solid #1E3050',
        borderTop: '3px solid ' + color,
        padding: '20px 22px', position: 'relative', overflow: 'hidden',
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
          <p style={{ color: '#4A6080', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>{label}</p>
          <p style={{ color: '#E2EAF5', fontSize: 30, fontWeight: 800, lineHeight: 1, margin: '0 0 4px' }}>{value}</p>
          {valor !== undefined && valor > 0 && (
            <p style={{ color: color, fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>{fmtBRL(valor)}</p>
          )}
          {sub && <p style={{ color: '#4A6080', fontSize: 11, margin: 0 }}>{sub}</p>}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: color + '18', border: '1px solid ' + color + '30',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, boxShadow: '0 4px 16px ' + color + '20',
        }}>{icon}</div>
      </div>
    </div>
  )
}

function FunilBar({ label, count, valor, total, color, icon }: { label: string; count: number; valor: number; total: number; color: string; icon: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>{icon}</span>
          <span style={{ color: '#8A9BB5', fontSize: 13 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {valor > 0 && <span style={{ color: '#4A6080', fontSize: 11, fontWeight: 500 }}>{fmtBRL(valor)}</span>}
          <span style={{ color: color, fontWeight: 700, fontSize: 14, minWidth: 16, textAlign: 'right' }}>{count}</span>
          <span style={{ color: '#3A5070', fontSize: 11, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: '#1E3050' }}>
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

type Periodo = 'mes' | 'quinzena' | 'ano' | 'tudo'
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'mes',      label: 'Mês atual'  },
  { id: 'quinzena', label: 'Quinzena'   },
  { id: 'ano',      label: 'Este ano'   },
  { id: 'tudo',     label: 'Todo período' },
]

function inicioDoMes() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) }
function inicioDoAno()  { const d = new Date(); return new Date(d.getFullYear(), 0, 1) }
function quinzenaAtras(){ const d = new Date(); d.setDate(d.getDate() - 15); return d }

function filtrarPorPeriodo(propostas: any[], periodo: Periodo) {
  if (periodo === 'tudo') return propostas
  const corte = periodo === 'mes' ? inicioDoMes() : periodo === 'quinzena' ? quinzenaAtras() : inicioDoAno()
  return propostas.filter(p => {
    const d = p.dataEmissao ? new Date(p.dataEmissao) : null
    return d && d >= corte
  })
}

export function DashboardPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const { data: raw, isLoading } = (trpc as any).proposta.list.useQuery({ page: 1, pageSize: 500 })
  const { data: empresa } = (trpc as any).empresa.get.useQuery()
  const todasPropostas: any[] = raw?.data ?? []
  const propostas = useMemo(() => filtrarPorPeriodo(todasPropostas.filter((p: any) => !p.isTemplate), periodo), [todasPropostas, periodo])

  const stats = useMemo(() => {
    const reais = propostas  // já filtradas por período e sem templates
    const t = reais.length
    const val = (status: string) => reais
      .filter(p => p.status === status)
      .reduce((s: number, p: any) => s + Number(p.valorFinal ?? 0), 0)
    const cnt = (status: string) => reais.filter(p => p.status === status).length
    const aceitas = cnt('aceita')
    return {
      total: t,
      abertas:    cnt('rascunho') + cnt('enviada'),
      aguardando: cnt('enviada'),
      aceitas,
      conversao:  t > 0 ? Math.round((aceitas / t) * 100) : 0,
      valorTotal:     reais.reduce((s: number, p: any) => s + Number(p.valorFinal ?? 0), 0),
      valorAbertas:   val('rascunho') + val('enviada'),
      valorAguardando:val('enviada'),
      valorAceitas:   val('aceita'),
      funil: {
        rascunho: { count: cnt('rascunho'), valor: val('rascunho') },
        enviada:  { count: cnt('enviada'),  valor: val('enviada')  },
        aceita:   { count: cnt('aceita'),   valor: val('aceita')   },
        recusada: { count: cnt('recusada'), valor: val('recusada') },
        expirada: { count: cnt('expirada'), valor: val('expirada') },
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
    <div style={{ padding: isMobile ? '16px 14px' : '28px 32px' }}>

      {/* Greeting + filtro período */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? 16 : 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: '#E2EAF5', fontSize: isMobile ? 18 : 22, fontWeight: 800, margin: '0 0 4px' }}>Bom dia! ☀️</h2>
          <p style={{ color: '#4A6080', fontSize: 13, margin: 0 }}>
            {(empresa as any)?.nome ?? 'Atom Tech'} · Aqui está o resumo de hoje
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PERIODOS.map(p => (
            <button key={p.id} onClick={() => setPeriodo(p.id)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1px solid ${periodo === p.id ? '#F5A623' : '#1E3050'}`,
                background: periodo === p.id ? '#F5A62318' : 'transparent',
                color: periodo === p.id ? '#F5A623' : '#4A6080',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards — 2 colunas no mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16, marginBottom: isMobile ? 16 : 28 }}>
        <KpiCard label="Volume Total Orçado"  value={stats.total}              valor={stats.valorTotal}     sub="todas as propostas"    icon="💰" color="#F5A623" />
        <KpiCard label="Aguardando Resposta"  value={stats.aguardando}         valor={stats.valorAguardando} sub="propostas enviadas"    icon="📤" color="#58A6FF" />
        <KpiCard label="Propostas Aceitas"    value={stats.aceitas}            valor={stats.valorAceitas}   sub="volume aprovado"       icon="✅" color="#3EBB7A" />
        <KpiCard label="Taxa de Conversão"    value={stats.conversao + '%'}                                 sub={`${stats.aceitas} de ${stats.total} propostas`} icon="📊" color="#BC8CFF" />
      </div>

      {/* Main Row — coluna única no mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 20 }}>

        {/* Tabela propostas */}
        <div style={{ background: 'linear-gradient(135deg, #111D2E, #0E1A2A)', borderRadius: 14, border: '1px solid #1E3050', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #1A2D45' }}>
            <div>
              <h3 style={{ color: '#E2EAF5', fontSize: 15, fontWeight: 700, margin: 0 }}>Últimas Propostas</h3>
              <p style={{ color: '#3A5070', fontSize: 11, margin: '2px 0 0' }}>{propostas.length} proposta{propostas.length !== 1 ? 's' : ''} no período</p>
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
                <tr>{['Nº', 'Cliente', 'Valor', 'Status', 'Data', ''].map(c => (
                  <th key={c} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, color: '#3A5070', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #1A2D45' }}>{c}</th>
                ))}</tr>
              </thead>
              <tbody>
                {propostas.slice(0,5).map((p: any, i: number) => {
                  const st = S[p.status] ?? S.rascunho
                  const border = i < 4 ? '1px solid #1A2D4550' : 'none'
                  const v = Number(p.valorFinal ?? 0)
                  return (
                    <tr key={p.id} onClick={() => navigate('/propostas/' + p.id)}
                      style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = '#1A2D4540')}
                      onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                    >
                      <td style={{ padding: '13px 16px', fontSize: 12, color: '#F5A623', fontWeight: 700, borderBottom: border }}>{p.numero}</td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: '#C8D8EC', borderBottom: border, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.clienteNome}</td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: v > 0 ? '#3EBB7A' : '#3A5070', fontWeight: v > 0 ? 600 : 400, borderBottom: border, whiteSpace: 'nowrap' }}>{v > 0 ? fmtBRL(v) : '—'}</td>
                      <td style={{ padding: '13px 16px', borderBottom: border }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: st.bg, color: st.color, textTransform: 'uppercase' }}>
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: '#4A6080', borderBottom: border }}>{formatDate(p.dataEmissao)}</td>
                      <td style={{ padding: '13px 16px', color: '#3A5070', borderBottom: border }}>›</td>
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
            <FunilBar label="Rascunho" count={stats.funil.rascunho.count} valor={stats.funil.rascunho.valor} total={stats.total} color="#8B949E" icon="📝" />
            <FunilBar label="Enviada"  count={stats.funil.enviada.count}  valor={stats.funil.enviada.valor}  total={stats.total} color="#58A6FF" icon="📤" />
            <FunilBar label="Aceita"   count={stats.funil.aceita.count}   valor={stats.funil.aceita.valor}   total={stats.total} color="#3EBB7A" icon="✅" />
            <FunilBar label="Recusada" count={stats.funil.recusada.count} valor={stats.funil.recusada.valor} total={stats.total} color="#F85149" icon="❌" />
            <FunilBar label="Expirada" count={stats.funil.expirada.count} valor={stats.funil.expirada.valor} total={stats.total} color="#D29922" icon="⏰" />
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
