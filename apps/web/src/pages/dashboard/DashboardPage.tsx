// ═══════════════════════════════════════════════════════════════════
// Dashboard — visão geral + Kanban/Funil de Vendas
// ═══════════════════════════════════════════════════════════════════

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatDate } from '../../lib/utils'
import { KpiCard, Card, Badge, Btn, PageWrapper, EmptyState, Spinner, C } from '../../components/ui'

// ── Tipos ─────────────────────────────────────────────────────────
type StatusProposta = 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'expirada'

interface PropostaItem {
  id: number
  numero: string
  status: StatusProposta
  clienteNome: string
  clienteEstado?: string
  dataEmissao: string
  dataValidade?: string
  versao: number
}

// ── Colunas do Kanban (status reais do sistema) ───────────────────
const COLUNAS: { status: StatusProposta; label: string; cor: string; icone: string }[] = [
  { status: 'rascunho',  label: 'Rascunho',  cor: '#6B7280', icone: '📝' },
  { status: 'enviada',   label: 'Enviada',   cor: '#3B82F6', icone: '📤' },
  { status: 'aceita',    label: 'Aceita',    cor: '#2D9C4E', icone: '✅' },
  { status: 'recusada',  label: 'Recusada',  cor: '#EF4444', icone: '❌' },
  { status: 'expirada',  label: 'Expirada',  cor: '#9CA3AF', icone: '⏰' },
]

// ── Card do Kanban ────────────────────────────────────────────────
function KanbanCard({
  proposta,
  onDragStart,
  onClick,
}: {
  proposta: PropostaItem
  onDragStart: (e: React.DragEvent, id: number) => void
  onClick: () => void
}) {
  const diasRestantes = proposta.dataValidade
    ? Math.ceil((new Date(proposta.dataValidade).getTime() - Date.now()) / 86400000)
    : null
  const expirandoEmBreve = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 2
  const expirado = diasRestantes !== null && diasRestantes < 0

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, proposta.id)}
      onClick={onClick}
      style={{
        background: '#1a2235',
        border: `1px solid ${expirandoEmBreve ? '#F5A62360' : expirado ? '#EF444430' : '#2a3448'}`,
        borderRadius: 10,
        padding: '11px 13px',
        cursor: 'grab',
        transition: 'transform 0.15s, box-shadow 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.35)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.accent, fontWeight: 700, marginBottom: 5 }}>
        {proposta.numero}
      </div>
      <div style={{ color: C.text, fontSize: 12, fontWeight: 600, lineHeight: 1.35, marginBottom: 3 }}>
        {proposta.clienteNome}
      </div>
      {proposta.clienteEstado && (
        <div style={{ fontSize: 10, color: C.textMuted }}>📍 {proposta.clienteEstado}</div>
      )}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 8, paddingTop: 7, borderTop: '1px solid #2a344840',
      }}>
        <span style={{ fontSize: 10, color: C.textDim }}>
          {formatDate(proposta.dataEmissao)}
        </span>
        {diasRestantes !== null && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: expirado ? '#EF4444' : expirandoEmBreve ? '#F5A623' : C.textMuted,
          }}>
            {expirado ? '⚠️ Expirada' : diasRestantes === 0 ? '⚠️ Hoje' : `${diasRestantes}d`}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Coluna do Kanban ──────────────────────────────────────────────
function KanbanColuna({
  coluna,
  propostas,
  onDragStart,
  onDrop,
  onDragOver,
  onDragLeave,
  onCardClick,
  isDragOver,
}: {
  coluna: typeof COLUNAS[number]
  propostas: PropostaItem[]
  onDragStart: (e: React.DragEvent, id: number) => void
  onDrop: (e: React.DragEvent, status: StatusProposta) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onCardClick: (id: number) => void
  isDragOver: boolean
}) {
  return (
    <div
      onDrop={e => onDrop(e, coluna.status)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      style={{
        minWidth: 210,
        flex: '1 1 210px',
        display: 'flex',
        flexDirection: 'column',
        background: isDragOver ? `${coluna.cor}12` : '#151e2d',
        border: `1.5px solid ${isDragOver ? coluna.cor : '#2a3448'}`,
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 13px',
        borderBottom: `2px solid ${coluna.cor}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: `${coluna.cor}18`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>{coluna.icone}</span>
          <span style={{ color: coluna.cor, fontWeight: 700, fontSize: 11, letterSpacing: '0.05em' }}>
            {coluna.label.toUpperCase()}
          </span>
        </div>
        <span style={{
          background: `${coluna.cor}28`, color: coluna.cor,
          borderRadius: 20, padding: '1px 8px',
          fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
        }}>
          {propostas.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{
        flex: 1, padding: 9,
        display: 'flex', flexDirection: 'column', gap: 7,
        minHeight: 100, maxHeight: 500, overflowY: 'auto',
      }}>
        {propostas.length === 0 ? (
          <div style={{
            textAlign: 'center', color: '#3a4558', fontSize: 11,
            padding: '20px 8px', border: '1px dashed #2a3448',
            borderRadius: 8, marginTop: 4,
          }}>
            {isDragOver ? '⬇ Solte aqui' : 'Vazio'}
          </div>
        ) : (
          propostas.map(p => (
            <KanbanCard
              key={p.id}
              proposta={p}
              onDragStart={onDragStart}
              onClick={() => onCardClick(p.id)}
            />
          ))
        )}
        {isDragOver && propostas.length > 0 && (
          <div style={{
            border: `2px dashed ${coluna.cor}60`, borderRadius: 10, height: 50, opacity: 0.6,
          }} />
        )}
      </div>
    </div>
  )
}

// ── Dashboard Principal ───────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<'lista' | 'kanban'>('lista')
  const [dragOverStatus, setDragOverStatus] = useState<StatusProposta | null>(null)
  const dragId = useRef<number | null>(null)

  const { data: propostas, isLoading } = trpc.proposta.list.useQuery({
    porPagina: 100,
    isTemplate: false,
  })

  const utils = trpc.useUtils()
  const updateStatus = trpc.proposta.updateStatus.useMutation({
    onSuccess: () => utils.proposta.list.invalidate(),
  })

  const lista: PropostaItem[] = (propostas?.data ?? []) as PropostaItem[]

  // KPIs
  const abertas   = lista.filter(p => p.status === 'rascunho' || p.status === 'enviada').length
  const aceitas   = lista.filter(p => p.status === 'aceita').length
  const taxaConv  = lista.length > 0 ? Math.round((aceitas / lista.length) * 100) : 0
  const enviadas  = lista.filter(p => p.status === 'enviada').length

  // ── Drag & Drop ───────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: number) => {
    dragId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, status: StatusProposta) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  const handleDragLeave = () => {
    setDragOverStatus(null)
  }

  const handleDrop = async (e: React.DragEvent, novoStatus: StatusProposta) => {
    e.preventDefault()
    setDragOverStatus(null)
    if (dragId.current === null) return
    const proposta = lista.find(p => p.id === dragId.current)
    if (!proposta || proposta.status === novoStatus) { dragId.current = null; return }
    await updateStatus.mutateAsync({ id: dragId.current, status: novoStatus })
    dragId.current = null
  }

  return (
    <PageWrapper>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard
          label="Propostas Abertas"
          value={String(abertas)}
          sub="rascunhos + enviadas"
          color={C.accent}
          trend={12}
        />
        <KpiCard
          label="Aguardando Resposta"
          value={String(enviadas)}
          sub="propostas enviadas"
          color={C.solar}
        />
        <KpiCard
          label="Taxa de Conversão"
          value={`${taxaConv}%`}
          sub="aceitas / total"
          color={C.green}
          trend={-3}
        />
        <KpiCard
          label="Propostas Aceitas"
          value={String(aceitas)}
          sub="no período carregado"
          color={C.warning}
        />
      </div>

      {/* Toggle Lista / Kanban */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>
          {view === 'lista' ? 'Últimas Propostas' : 'Funil de Vendas — Kanban'}
        </h2>
        <div style={{ display: 'flex', gap: 4, background: '#151e2d', borderRadius: 10, padding: 4, border: '1px solid #2a3448' }}>
          {([
            { v: 'lista',   icon: '☰', label: 'Lista'  },
            { v: 'kanban',  icon: '⊞', label: 'Kanban' },
          ] as const).map(({ v, icon, label }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: view === v ? C.accent : 'transparent',
                color: view === v ? '#fff' : C.textMuted,
                transition: 'all 0.15s',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── VISTA LISTA ────────────────────────────────────────── */}
      {view === 'lista' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
          <Card>
            <div style={{
              padding: '16px 20px 12px', borderBottom: `1px solid ${C.darkBorder}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Últimas Propostas</h3>
              <Btn variant="ghost" size="sm" onClick={() => navigate('/propostas')}>Ver todas →</Btn>
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
            ) : lista.length === 0 ? (
              <EmptyState
                icon="📄"
                title="Nenhuma proposta ainda"
                description="Crie sua primeira proposta para um cliente"
                action={<Btn onClick={() => navigate('/propostas/nova')}>Nova Proposta</Btn>}
              />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Nº', 'Cliente', 'Status', 'Data', ''].map(h => (
                      <th key={h} style={{
                        padding: '9px 14px', textAlign: 'left', fontSize: 10,
                        color: C.textDim, fontWeight: 600, letterSpacing: '0.08em',
                        textTransform: 'uppercase', borderBottom: `1px solid ${C.darkBorder}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.slice(0, 10).map((p, i) => (
                    <tr
                      key={p.id}
                      style={{ borderBottom: i < 9 ? `1px solid ${C.darkBorder}40` : 'none', cursor: 'pointer' }}
                      onClick={() => navigate(`/propostas/${p.id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = `${C.darkBorder}40`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 14px', color: C.accent, fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                        {p.numero}
                      </td>
                      <td style={{ padding: '11px 14px', color: C.text, fontSize: 13 }}>{p.clienteNome}</td>
                      <td style={{ padding: '11px 14px' }}><Badge status={p.status} /></td>
                      <td style={{ padding: '11px 14px', color: C.textMuted, fontSize: 12 }}>{formatDate(p.dataEmissao)}</td>
                      <td style={{ padding: '11px 14px' }}><span style={{ color: C.textDim, fontSize: 14 }}>›</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Ações rápidas + resumo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card style={{ padding: '16px 18px' }}>
              <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                Ações Rápidas
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: '+ Nova Proposta', color: C.solar,    path: '/propostas/nova' },
                  { label: '+ Novo Cliente',  color: C.green,    path: '/clientes' },
                  { label: '+ Lançar Fatura', color: C.accent,   path: '/faturas/nova' },
                  { label: '⚙ Configurações', color: C.textMuted, path: '/configuracoes' },
                ].map(a => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.path)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 9,
                      background: `${a.color}12`, border: `1px solid ${a.color}30`,
                      color: a.color, cursor: 'pointer', textAlign: 'left',
                      fontSize: 13, fontWeight: 600, transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${a.color}22`}
                    onMouseLeave={e => e.currentTarget.style.background = `${a.color}12`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </Card>

            <Card style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                  Funil
                </p>
                <button
                  onClick={() => setView('kanban')}
                  style={{ fontSize: 10, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Ver Kanban →
                </button>
              </div>
              {COLUNAS.map(col => {
                const count = lista.filter(p => p.status === col.status).length
                const pct = lista.length > 0 ? (count / lista.length) * 100 : 0
                return (
                  <div key={col.status} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: col.cor, fontWeight: 600 }}>
                        {col.icone} {col.label}
                      </span>
                      <span style={{ fontSize: 11, color: C.text, fontFamily: 'monospace', fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: '#2a3448', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, background: col.cor,
                        borderRadius: 4, transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </Card>
          </div>
        </div>
      )}

      {/* ── VISTA KANBAN ───────────────────────────────────────── */}
      {view === 'kanban' && (
        <div>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
          ) : (
            <>
              {updateStatus.isPending && (
                <div style={{
                  padding: '8px 16px', marginBottom: 10,
                  background: `${C.accent}15`, border: `1px solid ${C.accent}30`,
                  borderRadius: 8, color: C.accent, fontSize: 12, textAlign: 'center',
                }}>
                  ⏳ Atualizando status...
                </div>
              )}

              <p style={{ color: C.textDim, fontSize: 11, marginBottom: 12, textAlign: 'center' }}>
                🖱️ Arraste os cards entre colunas para alterar o status
              </p>

              {/* Colunas Kanban */}
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
                {COLUNAS.map(col => (
                  <KanbanColuna
                    key={col.status}
                    coluna={col}
                    propostas={lista.filter(p => p.status === col.status)}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    onDragOver={e => handleDragOver(e, col.status)}
                    onDragLeave={handleDragLeave}
                    onCardClick={id => navigate(`/propostas/${id}`)}
                    isDragOver={dragOverStatus === col.status}
                  />
                ))}
              </div>

              {/* Resumo funil */}
              <Card style={{ marginTop: 14, padding: '14px 20px' }}>
                <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                  Visão do Funil
                </p>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {COLUNAS.map((col, i) => {
                    const count = lista.filter(p => p.status === col.status).length
                    const pct = lista.length > 0 ? Math.round((count / lista.length) * 100) : 0
                    return (
                      <div key={col.status} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: col.cor, fontFamily: 'monospace' }}>{count}</div>
                          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{col.label}</div>
                          <div style={{ fontSize: 10, color: col.cor, fontWeight: 600 }}>{pct}%</div>
                        </div>
                        {i < COLUNAS.length - 1 && (
                          <span style={{ color: '#2a3448', fontSize: 20, flexShrink: 0 }}>›</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </PageWrapper>
  )
}
