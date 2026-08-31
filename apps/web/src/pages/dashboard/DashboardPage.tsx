import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { NovaPropostaDropdown } from '../../components/ui/NovaPropostaDropdown'
import { useIsMobile } from '../../hooks/useIsMobile'

// Extrai ano/mês/dia de uma string "YYYY-MM-DD..." sem passar por conversão de fuso horário.
// Necessário porque dataEmissao vem do banco como DATE puro — `new Date(s)` o interpreta como
// UTC-meia-noite, o que em horários negativos (Brasília, UTC-3) empurra a data para o dia anterior.
function parseDataYMD(s: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!s) return null
  const match = String(s).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

function formatDate(s: string | null | undefined): string {
  const ymd = parseDataYMD(s)
  if (!ymd) return '—'
  return `${String(ymd.d).padStart(2, '0')}/${String(ymd.m).padStart(2, '0')}/${ymd.y}`
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
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// Saudação conforme o horário local: manhã (5h–11h59), tarde (12h–17h59), noite (18h–4h59)
function saudacao(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bom dia! ☀️'
  if (h >= 12 && h < 18) return 'Boa tarde! 🌤️'
  return 'Boa noite! 🌙'
}

function KpiCard({ label, value, valor, sub, icon, color, onClick }: {
  label: string; value: string | number; valor?: number; sub?: string; icon: string; color: string; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      title={onClick ? 'Ver propostas' : undefined}
      style={{
        background: 'linear-gradient(135deg, #111D2E 0%, #0E1A2A 100%)',
        borderRadius: 14, border: '1px solid #1E3050',
        borderTop: '3px solid ' + color,
        padding: '20px 22px', position: 'relative', overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s', cursor: onClick ? 'pointer' : 'default',
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
          <p style={{ color: '#7488A8', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>{label}</p>
          <p style={{ color: '#E2EAF5', fontSize: 30, fontWeight: 800, lineHeight: 1, margin: '0 0 4px' }}>{value}</p>
          {valor !== undefined && valor > 0 && (
            <p style={{ color: color, fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>{fmtBRL(valor)}</p>
          )}
          {sub && <p style={{ color: '#7488A8', fontSize: 11, margin: 0 }}>{sub}</p>}
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

function FunilBar({ label, count, valor, total, color, icon, onClick }: { label: string; count: number; valor: number; total: number; color: string; icon: string; onClick?: () => void }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div onClick={onClick} title={onClick ? 'Ver propostas' : undefined} style={{ marginBottom: 14, cursor: onClick ? 'pointer' : 'default', borderRadius: 8, padding: '4px 6px', margin: '0 -6px 10px' }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = color + '10' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>{icon}</span>
          <span style={{ color: '#9FB0C9', fontSize: 13 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {valor > 0 && <span style={{ color: '#7488A8', fontSize: 11, fontWeight: 500 }}>{fmtBRL(valor)}</span>}
          <span style={{ color: color, fontWeight: 700, fontSize: 14, minWidth: 16, textAlign: 'right' }}>{count}</span>
          <span style={{ color: '#6A80A2', fontSize: 11, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
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

// Data de corte no fuso de QUEM olha a tela: "mês atual" é o mês do calendário
// do usuário. O servidor roda em UTC no Railway, então mandar a data pronta
// daqui evita errar a virada do mês pra quem está em -03.
function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function desdeDoPeriodo(periodo: Periodo): string | undefined {
  const d = new Date()
  if (periodo === 'tudo') return undefined
  if (periodo === 'mes') return isoLocal(new Date(d.getFullYear(), d.getMonth(), 1))
  if (periodo === 'ano') return isoLocal(new Date(d.getFullYear(), 0, 1))
  const q = new Date(); q.setDate(q.getDate() - 15); return isoLocal(q)
}

export function DashboardPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const desde = useMemo(() => desdeDoPeriodo(periodo), [periodo])

  // Os números vêm AGREGADOS do servidor (proposta.resumo). Contar no cliente
  // exigia baixar todas as propostas, e a paginação truncava silenciosamente:
  // o painel media só as 20 mais recentes e mostrava 4 aceitas em agosto/2026
  // quando existiam 15. Agregando em SQL não há página pra truncar.
  const { data: resumo, isLoading } = (trpc as any).proposta.resumo.useQuery({ desde })
  const { data: ultimas } = (trpc as any).proposta.list.useQuery({
    pagina: 1, porPagina: 5, isTemplate: false, desde,
  })
  const { data: empresa } = (trpc as any).empresa.get.useQuery()

  // Alerta de vencimento: NÃO usa o filtro de período — vencimento é sempre
  // sobre o que vem à frente, e some da tela se ficar preso ao recorte.
  const { data: aVencer } = (trpc as any).proposta.aVencer.useQuery({ dias: 7 })
  const propostasAVencer: any[] = aVencer ?? []

  const propostas: any[] = ultimas?.data ?? []

  const stats = useMemo(() => ({
    total:           resumo?.total ?? 0,
    aguardando:      resumo?.aguardando ?? 0,
    aceitas:         resumo?.aceitas ?? 0,
    conversao:       resumo?.conversao ?? 0,
    valorTotal:      resumo?.valorTotal ?? 0,
    valorAguardando: resumo?.valorAguardando ?? 0,
    valorAceitas:    resumo?.valorAceitas ?? 0,
    fechadas:        resumo?.fechadas ?? 0,
    valorFechadas:   resumo?.valorFechadas ?? 0,
    semDataAceite:   resumo?.aceitasSemDataAceite ?? 0,
    funil: {
      rascunho: { count: resumo?.funil?.rascunho?.quantidade ?? 0, valor: resumo?.funil?.rascunho?.valor ?? 0 },
      enviada:  { count: resumo?.funil?.enviada?.quantidade  ?? 0, valor: resumo?.funil?.enviada?.valor  ?? 0 },
      aceita:   { count: resumo?.funil?.aceita?.quantidade   ?? 0, valor: resumo?.funil?.aceita?.valor   ?? 0 },
      recusada: { count: resumo?.funil?.recusada?.quantidade ?? 0, valor: resumo?.funil?.recusada?.valor ?? 0 },
      expirada: { count: resumo?.funil?.expirada?.quantidade ?? 0, valor: resumo?.funil?.expirada?.valor ?? 0 },
    },
  }), [resumo])

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
          <h2 style={{ color: '#E2EAF5', fontSize: isMobile ? 18 : 22, fontWeight: 800, margin: '0 0 4px' }}>{saudacao()}</h2>
          <p style={{ color: '#7488A8', fontSize: 13, margin: 0 }}>
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
                color: periodo === p.id ? '#F5A623' : '#7488A8',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards — 2 colunas no mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16, marginBottom: isMobile ? 16 : 28 }}>
        <KpiCard label="Volume Total Orçado"  value={stats.total}              valor={stats.valorTotal}     sub="todas as propostas"    icon="💰" color="#F5A623" onClick={() => navigate('/propostas?status=todos')} />
        <KpiCard label="Aguardando Resposta"  value={stats.aguardando}         valor={stats.valorAguardando} sub="propostas enviadas"    icon="📤" color="#58A6FF" onClick={() => navigate('/propostas?status=enviada')} />
        {/* Só troca pra base "data de aceite" quando NÃO sobrar aceita sem data
            no período. Trocar assim que aparecesse a primeira datada fazia o
            número despencar (17 aceitas viravam "1 fechada · +16 sem data"):
            certo na definição, enganoso na leitura — e leitura enganosa no
            painel foi exatamente o problema que originou esta correção.
            Até lá mostra a coorte por emissão, que é completa, e informa
            quantas já têm data pra dar pra acompanhar a virada. */}
        <KpiCard
          label="Propostas Aceitas"
          value={stats.semDataAceite === 0 ? stats.fechadas : stats.aceitas}
          valor={stats.semDataAceite === 0 ? stats.valorFechadas : stats.valorAceitas}
          sub={stats.semDataAceite === 0
            ? 'fechadas no período'
            : stats.fechadas > 0
              ? `por emissão · ${stats.fechadas} já com data de aceite`
              : 'por data de emissão'}
          icon="✅" color="#3EBB7A" onClick={() => navigate('/propostas?status=aceita')} />
        <KpiCard label="Taxa de Conversão"    value={stats.conversao + '%'}                                 sub={`${stats.aceitas} de ${stats.total} propostas`} icon="📊" color="#BC8CFF" onClick={() => navigate('/propostas?status=aceita')} />
      </div>

      {/* Alerta de propostas perto de vencer — some quando não há nenhuma */}
      {propostasAVencer.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #2A1F0B, #1F1808)',
          border: '1px solid #D2992255', borderLeft: '4px solid #D29922',
          borderRadius: 12, padding: isMobile ? '14px 16px' : '16px 20px',
          marginBottom: isMobile ? 16 : 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 16 }}>⏰</span>
              <div>
                <div style={{ color: '#F0D48A', fontSize: isMobile ? 13 : 14, fontWeight: 700 }}>
                  {propostasAVencer.length} proposta{propostasAVencer.length !== 1 ? 's' : ''} vence{propostasAVencer.length !== 1 ? 'm' : ''} nos próximos 7 dias
                </div>
                <div style={{ color: '#A8905C', fontSize: 11, marginTop: 2 }}>
                  Sem retorno até a validade, o sistema marca como expirada automaticamente
                </div>
              </div>
            </div>
            <div style={{ color: '#F0D48A', fontSize: 13, fontWeight: 700 }}>
              {fmtBRL(propostasAVencer.reduce((s: number, p: any) => s + Number(p.valorFinal ?? 0), 0))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {propostasAVencer.map((p: any) => {
              const d = Number(p.diasRestantes ?? 0)
              const urgente = d <= 2
              const prazo = d === 0 ? 'vence hoje' : d === 1 ? 'vence amanhã' : `em ${d} dias`
              return (
                <div key={p.id} onClick={() => navigate('/propostas/' + p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                    background: '#0E1A2A80', border: '1px solid #3A2E14',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = '#1A2D4560')}
                  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = '#0E1A2A80')}
                >
                  <span style={{ color: '#F5A623', fontSize: 12, fontWeight: 700, minWidth: 116 }}>{p.numero}</span>
                  <span style={{
                    color: '#C8D8EC', fontSize: 12.5, flex: 1, minWidth: 120,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.clienteNome ?? '—'}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase',
                    background: p.status === 'enviada' ? '#58A6FF1E' : '#8B949E1E',
                    color: p.status === 'enviada' ? '#58A6FF' : '#8B949E',
                  }}>{p.status === 'enviada' ? 'Enviada' : 'Rascunho'}</span>
                  <span style={{ color: '#7488A8', fontSize: 12, minWidth: 92, textAlign: 'right' }}>
                    {Number(p.valorFinal ?? 0) > 0 ? fmtBRL(Number(p.valorFinal)) : '—'}
                  </span>
                  <span style={{
                    color: urgente ? '#F85149' : '#D29922', fontSize: 11.5,
                    fontWeight: 700, minWidth: 84, textAlign: 'right',
                  }}>{prazo}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Row — coluna única no mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 20 }}>

        {/* Tabela propostas */}
        <div style={{ background: 'linear-gradient(135deg, #111D2E, #0E1A2A)', borderRadius: 14, border: '1px solid #1E3050', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #1A2D45' }}>
            <div>
              <h3 style={{ color: '#E2EAF5', fontSize: 15, fontWeight: 700, margin: 0 }}>Últimas Propostas</h3>
              <p style={{ color: '#6A80A2', fontSize: 11, margin: '2px 0 0' }}>{stats.total} proposta{stats.total !== 1 ? 's' : ''} no período</p>
            </div>
            <button onClick={() => navigate('/propostas')}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #1E3050', background: 'transparent', color: '#F5A623', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5A62310'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#F5A62344' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E3050' }}
            >Ver todas →</button>
          </div>

          {propostas.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6A80A2' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <p style={{ margin: '0 0 16px', fontSize: 14 }}>Nenhuma proposta ainda.</p>
              <NovaPropostaDropdown label="+ Criar primeira proposta" />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Nº', 'Cliente', 'Valor', 'Status', 'Data', ''].map(c => (
                  <th key={c} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, color: '#6A80A2', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #1A2D45' }}>{c}</th>
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
                      <td style={{ padding: '13px 16px', fontSize: 12, color: v > 0 ? '#3EBB7A' : '#6A80A2', fontWeight: v > 0 ? 600 : 400, borderBottom: border, whiteSpace: 'nowrap' }}>{v > 0 ? fmtBRL(v) : '—'}</td>
                      <td style={{ padding: '13px 16px', borderBottom: border }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: st.bg, color: st.color, textTransform: 'uppercase' }}>
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: '#7488A8', borderBottom: border }}>{formatDate(p.dataEmissao)}</td>
                      <td style={{ padding: '13px 16px', color: '#6A80A2', borderBottom: border }}>›</td>
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
            <FunilBar label="Rascunho" count={stats.funil.rascunho.count} valor={stats.funil.rascunho.valor} total={stats.total} color="#8B949E" icon="📝" onClick={() => navigate('/propostas?status=rascunho')} />
            <FunilBar label="Enviada"  count={stats.funil.enviada.count}  valor={stats.funil.enviada.valor}  total={stats.total} color="#58A6FF" icon="📤" onClick={() => navigate('/propostas?status=enviada')} />
            <FunilBar label="Aceita"   count={stats.funil.aceita.count}   valor={stats.funil.aceita.valor}   total={stats.total} color="#3EBB7A" icon="✅" onClick={() => navigate('/propostas?status=aceita')} />
            <FunilBar label="Recusada" count={stats.funil.recusada.count} valor={stats.funil.recusada.valor} total={stats.total} color="#F85149" icon="❌" onClick={() => navigate('/propostas?status=recusada')} />
            <FunilBar label="Expirada" count={stats.funil.expirada.count} valor={stats.funil.expirada.valor} total={stats.total} color="#D29922" icon="⏰" onClick={() => navigate('/propostas?status=expirada')} />
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
                  background: 'transparent', color: '#9FB0C9',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  fontFamily: 'inherit', transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = a.color + '12'; (e.currentTarget as HTMLButtonElement).style.color = a.color; (e.currentTarget as HTMLButtonElement).style.borderColor = a.color + '40' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9FB0C9'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E3050' }}
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
