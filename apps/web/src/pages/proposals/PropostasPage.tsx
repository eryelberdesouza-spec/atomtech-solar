import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatDate } from '../../lib/utils'
import { Btn, Badge, PageWrapper, Spinner, C } from '../../components/ui'
import { NovaPropostaDropdown } from '../../components/ui/NovaPropostaDropdown'

type StatusFiltro = 'todos' | 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'expirada'

const STATUS_FILTROS: { id: StatusFiltro; label: string; color: string }[] = [
  { id: 'todos',    label: 'Todas',    color: '#8A9BB5' },
  { id: 'rascunho', label: 'Rascunho', color: '#8B949E' },
  { id: 'enviada',  label: 'Enviada',  color: '#58A6FF' },
  { id: 'aceita',   label: 'Aceita',   color: '#3EBB7A' },
  { id: 'recusada', label: 'Recusada', color: '#F85149' },
  { id: 'expirada', label: 'Expirada', color: '#D29922' },
]

const STATUS_COLOR: Record<string, string> = {
  rascunho: '#8B949E',
  enviada:  '#58A6FF',
  aceita:   '#3EBB7A',
  recusada: '#F85149',
  expirada: '#D29922',
}

export function PropostasPage() {
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState<StatusFiltro>('todos')
  const [busca, setBusca]   = useState('')

  const { data, isLoading } = trpc.proposta.list.useQuery({ isTemplate: false, porPagina: 100 })
  const lista = data?.data ?? []

  const contagem = STATUS_FILTROS.slice(1).reduce((acc, s) => ({
    ...acc,
    [s.id]: lista.filter(p => p.status === s.id).length,
  }), {} as Record<string, number>)

  const filtradas = lista.filter(p => {
    const passaStatus = filtro === 'todos' || p.status === filtro
    const passaBusca  = !busca || p.clienteNome?.toLowerCase().includes(busca.toLowerCase()) || p.numero.includes(busca)
    return passaStatus && passaBusca
  })

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: '#E2EAF5', fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>Propostas</h2>
          <p style={{ color: '#4A6080', fontSize: 13, margin: 0 }}>{lista.length} proposta{lista.length !== 1 ? 's' : ''} no total</p>
        </div>
        <NovaPropostaDropdown />
      </div>

      {/* Stats */}
      {!isLoading && lista.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
          {STATUS_FILTROS.slice(1).map(s => (
            <button
              key={s.id}
              onClick={() => setFiltro(filtro === s.id ? 'todos' : s.id)}
              style={{
                background: filtro === s.id ? s.color + '18' : '#111D2E',
                border: `1px solid ${filtro === s.id ? s.color + '60' : '#1E3050'}`,
                borderRadius: 10, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: filtro === s.id ? s.color : '#E2EAF5', lineHeight: 1 }}>
                {contagem[s.id] ?? 0}
              </div>
              <div style={{ fontSize: 10, color: filtro === s.id ? s.color : '#4A6080', marginTop: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
          placeholder="Buscar por número ou cliente..."
          style={{
            width: 360, padding: '9px 14px', borderRadius: 9,
            background: '#111D2E', border: '1px solid #1E3050',
            color: '#E2EAF5', fontSize: 13, outline: 'none',
          }}
          onFocus={e => ((e.currentTarget as HTMLInputElement).style.borderColor = '#F5A623')}
          onBlur={e => ((e.currentTarget as HTMLInputElement).style.borderColor = '#1E3050')}
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #1E3050', borderTopColor: '#F5A623', animation: 'spin 0.8s linear infinite' }} />
          <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
        </div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#4A6080' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <p style={{ fontSize: 15, color: '#8A9BB5', margin: 0 }}>
            {busca || filtro !== 'todos' ? 'Nenhuma proposta encontrada com este filtro.' : 'Nenhuma proposta criada ainda.'}
          </p>
          {!busca && filtro === 'todos' && (
            <button
              onClick={() => navigate('/propostas/nova')}
              style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #F5A623, #E8720C)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >+ Criar Proposta</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Cabeçalho da tabela */}
          <div style={{
            display: 'grid', gridTemplateColumns: '140px 1fr 120px 100px 36px',
            padding: '6px 20px', gap: 12,
          }}>
            {['Nº Proposta', 'Cliente', 'Status', 'Data', ''].map(h => (
              <span key={h} style={{ fontSize: 10, color: '#3A5070', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
            ))}
          </div>

          {filtradas.map(p => {
            const cor = STATUS_COLOR[p.status] ?? '#8B949E'
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/propostas/${p.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 120px 100px 36px',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 20px',
                  background: '#111D2E',
                  border: '1px solid #1E3050',
                  borderLeft: `3px solid ${cor}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.background = '#152030';
                  (e.currentTarget as HTMLDivElement).style.borderColor = cor + '60';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = '#111D2E';
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#1E3050';
                  (e.currentTarget as HTMLDivElement).style.borderLeftColor = cor;
                }}
              >
                <div>
                  <span style={{ color: '#F5A623', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{p.numero}</span>
                  <div style={{ marginTop: 3 }}>
                    {p.tipoProposta === 'servico_geral'
                      ? <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#2D9C4E20', color: '#2D9C4E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Serviço</span>
                      : <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#F5A62320', color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Solar</span>
                    }
                  </div>
                </div>
                <div>
                  <div style={{ color: '#C8D8EC', fontSize: 13, fontWeight: 600 }}>{p.clienteNome}</div>
                  {(p.tituloServico || p.clienteEstado) && <div style={{ color: '#3A5070', fontSize: 11, marginTop: 1 }}>{p.tituloServico || p.clienteEstado}</div>}
                </div>
                <Badge status={p.status} />
                <span style={{ color: '#4A6080', fontSize: 12 }}>{formatDate(p.dataEmissao)}</span>
                <span style={{ color: '#3A5070', fontSize: 18 }}>›</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
