import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatDate } from '../../lib/utils'
import { Spinner } from '../../components/ui'

const STATUS_OS = [
  { id: 'aberta',       label: 'Aberta',       color: '#58A6FF', icon: '📋' },
  { id: 'em_execucao',  label: 'Em Execução',  color: '#F5A623', icon: '🔧' },
  { id: 'concluida',    label: 'Concluída',    color: '#3EBB7A', icon: '✅' },
  { id: 'cancelada',    label: 'Cancelada',    color: '#F85149', icon: '✕' },
]

function ProgressBar({ feitos, total }: { feitos: number; total: number }) {
  const pct = total > 0 ? Math.round((feitos / total) * 100) : 0
  const color = pct === 100 ? '#3EBB7A' : pct > 50 ? '#F5A623' : '#58A6FF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 3, background: '#1E3050', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 10, color: '#4A6080', fontFamily: 'monospace', flexShrink: 0 }}>{feitos}/{total}</span>
    </div>
  )
}

function OSCard({ os, onClick }: { os: any; onClick: () => void }) {
  const status = STATUS_OS.find(s => s.id === os.status) ?? STATUS_OS[0]
  return (
    <div
      onClick={onClick}
      style={{
        background: '#111D2E', border: '1px solid #1E3050', borderRadius: 10,
        padding: '12px 14px', cursor: 'pointer', marginBottom: 8,
        borderLeft: `3px solid ${status.color}`,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = status.color; (e.currentTarget as HTMLDivElement).style.background = '#131F30' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1E3050'; (e.currentTarget as HTMLDivElement).style.borderLeftColor = status.color; (e.currentTarget as HTMLDivElement).style.background = '#111D2E' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: status.color, fontWeight: 700 }}>{os.numero}</span>
        {os.totalAgendamentos > 0 && (
          <span style={{ fontSize: 10, color: '#58A6FF' }}>📅 {os.totalAgendamentos}</span>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#C8D8EC', marginBottom: 4, lineHeight: 1.3 }}>
        {os.clienteNome ?? '—'}
      </div>
      {os.titulo && (
        <div style={{ fontSize: 11, color: '#4A6080', marginBottom: 6 }}>{os.titulo}</div>
      )}
      {(os.totalMarcos ?? 0) > 0 && (
        <ProgressBar feitos={os.marcosFeitos ?? 0} total={os.totalMarcos ?? 0} />
      )}
      {(os.dataPrevistaFim || os.tecnicoResponsavel) && (
        <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          {os.tecnicoResponsavel && (
            <span style={{ fontSize: 10, color: '#4A6080' }}>👤 {os.tecnicoResponsavel}</span>
          )}
          {os.dataPrevistaFim && (
            <span style={{ fontSize: 10, color: '#4A6080' }}>🗓 {formatDate(String(os.dataPrevistaFim).slice(0, 10))}</span>
          )}
        </div>
      )}
    </div>
  )
}

export function OrdensServicoPage() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [view, setView] = useState<'kanban' | 'lista'>('kanban')

  const { data, isLoading } = (trpc as any).os.list.useQuery(
    { porPagina: 200 },
    { staleTime: 0 },
  )
  const lista: any[] = data?.data ?? []

  const filtradas = lista.filter((o: any) =>
    !busca
    || o.numero?.toLowerCase().includes(busca.toLowerCase())
    || o.clienteNome?.toLowerCase().includes(busca.toLowerCase())
    || o.titulo?.toLowerCase().includes(busca.toLowerCase())
  )

  const colunas = STATUS_OS.map(s => ({
    ...s,
    itens: filtradas.filter((o: any) => o.status === s.id),
  }))

  const total = filtradas.length
  const resumo = STATUS_OS.map(s => ({
    ...s,
    count: filtradas.filter((o: any) => o.status === s.id).length,
  }))

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <Spinner />
    </div>
  )

  return (
    <div style={{ padding: '24px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: '#E2EAF5', fontSize: 20, fontWeight: 800, margin: 0 }}>Operacional</h1>
          <p style={{ color: '#4A6080', fontSize: 12, margin: '3px 0 0' }}>
            {total} ordem{total !== 1 ? 's' : ''} de serviço
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Busca */}
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar OS, cliente..."
            style={{
              padding: '7px 12px', borderRadius: 8, border: '1px solid #1E3050',
              background: '#0C1828', color: '#C8D8EC', fontSize: 13, outline: 'none',
              width: 220, fontFamily: 'inherit',
            }}
          />
          {/* Toggle view */}
          <div style={{ display: 'flex', border: '1px solid #1E3050', borderRadius: 8, overflow: 'hidden' }}>
            {[
              { id: 'kanban', label: '⊞ Kanban' },
              { id: 'lista',  label: '☰ Lista' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id as any)}
                style={{
                  padding: '6px 12px', border: 'none', cursor: 'pointer',
                  background: view === v.id ? '#F5A623' : 'transparent',
                  color: view === v.id ? '#0C1421' : '#4A6080',
                  fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                }}
              >{v.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Resumo KPIs ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {resumo.map(s => (
          <div key={s.id} style={{
            flex: 1, background: '#111D2E', border: `1px solid ${s.color}30`,
            borderRadius: 10, padding: '10px 14px',
            borderTop: `2px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 11, color: '#4A6080', fontWeight: 700, marginBottom: 2 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* ── KANBAN ── */}
      {view === 'kanban' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14, flex: 1, overflowY: 'auto',
          alignItems: 'flex-start',
        }}>
          {colunas.map(col => (
            <div key={col.id}>
              {/* Cabeçalho da coluna */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 10,
                padding: '8px 12px', borderRadius: 8,
                background: col.color + '12',
                border: `1px solid ${col.color}30`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>
                  {col.icon} {col.label}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 800, color: col.color,
                  background: col.color + '20', borderRadius: 12,
                  padding: '1px 8px',
                }}>
                  {col.itens.length}
                </span>
              </div>

              {/* Cards */}
              {col.itens.length === 0 ? (
                <div style={{
                  border: `1px dashed ${col.color}30`, borderRadius: 10,
                  padding: '20px', textAlign: 'center',
                  color: '#2A3F55', fontSize: 12,
                }}>
                  Nenhuma OS
                </div>
              ) : (
                col.itens.map((os: any) => (
                  <OSCard key={os.id} os={os} onClick={() => navigate(`/ordens-servico/${os.id}`)} />
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── LISTA ── */}
      {view === 'lista' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E3050' }}>
                {['Número', 'Cliente', 'Título', 'Técnico', 'Status', 'Progresso', 'Previsão'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: '#4A6080', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((os: any) => {
                const status = STATUS_OS.find(s => s.id === os.status) ?? STATUS_OS[0]
                return (
                  <tr
                    key={os.id}
                    onClick={() => navigate(`/ordens-servico/${os.id}`)}
                    style={{ borderBottom: '1px solid #1E305050', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#131F30'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: status.color, fontWeight: 700 }}>{os.numero}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#C8D8EC' }}>{os.clienteNome ?? '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#4A6080' }}>{os.titulo ?? '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#4A6080' }}>{os.tecnicoResponsavel ?? '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: status.color + '18', color: status.color }}>
                        {status.icon} {status.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', width: 120 }}>
                      <ProgressBar feitos={os.marcosFeitos ?? 0} total={os.totalMarcos ?? 0} />
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#4A6080' }}>
                      {os.dataPrevistaFim ? formatDate(String(os.dataPrevistaFim).slice(0, 10)) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
