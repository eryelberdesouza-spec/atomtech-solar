import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatDate } from '../../lib/utils'
import { Spinner } from '../../components/ui'

const STATUS_OS = [
  { id: 'todos',        label: 'Todas',        color: '#8A9BB5' },
  { id: 'aberta',       label: 'Aberta',       color: '#58A6FF' },
  { id: 'em_execucao',  label: 'Em execução',  color: '#F5A623' },
  { id: 'concluida',    label: 'Concluída',    color: '#3EBB7A' },
  { id: 'cancelada',    label: 'Cancelada',    color: '#F85149' },
]

const STATUS_COLOR: Record<string, string> = {
  aberta:      '#58A6FF',
  em_execucao: '#F5A623',
  concluida:   '#3EBB7A',
  cancelada:   '#F85149',
}

const STATUS_LABEL: Record<string, string> = {
  aberta:      'Aberta',
  em_execucao: 'Em Execução',
  concluida:   'Concluída',
  cancelada:   'Cancelada',
}

function ProgressBar({ feitos, total }: { feitos: number; total: number }) {
  const pct = total > 0 ? Math.round((feitos / total) * 100) : 0
  const color = pct === 100 ? '#3EBB7A' : pct > 50 ? '#F5A623' : '#58A6FF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height: 4, background: '#1E3050', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 2,
          transition: 'width 0.3s',
        }} />
      </div>
      <span style={{ fontSize: 10, color: '#4A6080', fontFamily: 'monospace', flexShrink: 0 }}>
        {feitos}/{total}
      </span>
    </div>
  )
}

export function OrdensServicoPage() {
  const navigate = useNavigate()
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busca, setBusca] = useState('')

  const { data, isLoading } = (trpc as any).os.list.useQuery(
    { porPagina: 100 },
    { staleTime: 0 },
  )
  const lista: any[] = data?.data ?? []

  const contagem = STATUS_OS.slice(1).reduce((acc: any, s) => ({
    ...acc,
    [s.id]: lista.filter((o: any) => o.status === s.id).length,
  }), {} as Record<string, number>)

  const filtradas = lista.filter((o: any) => {
    const passaStatus = filtroStatus === 'todos' || o.status === filtroStatus
    const passaBusca = !busca
      || o.numero?.toLowerCase().includes(busca.toLowerCase())
      || o.clienteNome?.toLowerCase().includes(busca.toLowerCase())
      || o.titulo?.toLowerCase().includes(busca.toLowerCase())
    return passaStatus && passaBusca
  })

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
      }}>
        <div>
          <h2 style={{ color: '#E2EAF5', fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>
            Ordens de Serviço
          </h2>
          <p style={{ color: '#4A6080', fontSize: 13, margin: 0 }}>
            {lista.length} OS {lista.length !== 1 ? 'cadastradas' : 'cadastrada'} · Módulo Operacional
          </p>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && lista.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20,
        }}>
          {STATUS_OS.slice(1).map(s => (
            <button
              key={s.id}
              onClick={() => setFiltroStatus(filtroStatus === s.id ? 'todos' : s.id)}
              style={{
                background: filtroStatus === s.id ? s.color + '18' : '#111D2E',
                border: `1px solid ${filtroStatus === s.id ? s.color + '60' : '#1E3050'}`,
                borderRadius: 10, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                fontSize: 20, fontWeight: 800,
                color: filtroStatus === s.id ? s.color : '#E2EAF5', lineHeight: 1,
              }}>
                {contagem[s.id] ?? 0}
              </div>
              <div style={{
                fontSize: 10, color: filtroStatus === s.id ? s.color : '#4A6080',
                marginTop: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {s.label}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Busca */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por número, cliente ou título..."
          style={{
            width: '100%', maxWidth: 420,
            background: '#111D2E', border: '1px solid #1E3050',
            borderRadius: 8, padding: '8px 12px', color: '#C8D8EC',
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner />
        </div>
      ) : filtradas.length === 0 ? (
        <div style={{
          background: '#111D2E', border: '1px solid #1E3050',
          borderRadius: 12, padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          <p style={{ color: '#4A6080', fontSize: 14, margin: 0 }}>
            {lista.length === 0
              ? 'Nenhuma Ordem de Serviço criada ainda. As OS são geradas a partir de propostas formalizadas.'
              : 'Nenhuma OS encontrada para este filtro.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtradas.map((os: any) => {
            const cor = STATUS_COLOR[os.status] ?? '#8A9BB5'
            const totalMarcos = Number(os.totalMarcos ?? 0)
            const marcosFeitos = Number(os.marcosFeitos ?? 0)
            return (
              <div
                key={os.id}
                onClick={() => navigate(`/ordens-servico/${os.id}`)}
                style={{
                  background: '#111D2E', border: '1px solid #1E3050',
                  borderLeft: `3px solid ${cor}`,
                  borderRadius: 10, padding: '14px 18px',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px 140px 120px',
                  gap: 16, alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#131F30')}
                onMouseLeave={e => (e.currentTarget.style.background = '#111D2E')}
              >
                {/* Info principal */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      color: cor, fontFamily: 'monospace', fontSize: 13, fontWeight: 800,
                    }}>{os.numero}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                      background: cor + '18', color: cor, border: `1px solid ${cor}40`,
                    }}>{STATUS_LABEL[os.status] ?? os.status}</span>
                    {Number(os.totalAgendamentos) > 0 && (
                      <span style={{
                        fontSize: 10, color: '#4A6080', background: '#1E3050',
                        borderRadius: 20, padding: '1px 7px',
                      }}>📅 {os.totalAgendamentos} agend.</span>
                    )}
                  </div>
                  <div style={{ color: '#C8D8EC', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                    {os.clienteNome ?? '—'}
                  </div>
                  {os.titulo && (
                    <div style={{ color: '#4A6080', fontSize: 12 }}>{os.titulo}</div>
                  )}
                </div>

                {/* Progresso marcos */}
                <div>
                  <div style={{ fontSize: 10, color: '#4A6080', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Marcos
                  </div>
                  <ProgressBar feitos={marcosFeitos} total={totalMarcos} />
                </div>

                {/* Datas */}
                <div>
                  <div style={{ fontSize: 10, color: '#4A6080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    Previsão
                  </div>
                  <div style={{ fontSize: 12, color: '#8A9BB5' }}>
                    {os.dataPrevistaInicio
                      ? formatDate(String(os.dataPrevistaInicio).slice(0, 10))
                      : '—'}
                    {os.dataPrevistaFim && (
                      <> → {formatDate(String(os.dataPrevistaFim).slice(0, 10))}</>
                    )}
                  </div>
                </div>

                {/* Técnico */}
                <div>
                  <div style={{ fontSize: 10, color: '#4A6080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    Técnico
                  </div>
                  <div style={{ fontSize: 12, color: '#8A9BB5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {os.tecnicoResponsavel ?? '—'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
