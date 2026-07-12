// ═══════════════════════════════════════════════════════════════════
// Planos de Manutenção Recorrente — AGO
// Ex.: limpeza de painéis a cada 6 meses. Cada plano guarda a próxima
// data; "Gerar OS" cria uma OS avulsa pré-preenchida, e concluir essa
// OS reagenda o plano automaticamente.
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatDate } from '../../lib/utils'
import { Spinner } from '../../components/ui'
import { useIsMobile } from '../../hooks/useIsMobile'

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0C1828', border: '1px solid #1E3050',
  borderRadius: 7, padding: '8px 10px', color: '#C8D8EC',
  fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, color: '#4A6080',
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
}

const PERIODICIDADES = [
  { value: 1,  label: 'Mensal (1 mês)' },
  { value: 3,  label: 'Trimestral (3 meses)' },
  { value: 6,  label: 'Semestral (6 meses)' },
  { value: 12, label: 'Anual (12 meses)' },
  { value: 24, label: 'Bienal (24 meses)' },
]

// Situação do plano conforme a proximidade da data
function situacao(diasRestantes: number): { label: string; color: string } {
  if (diasRestantes < 0)   return { label: `Vencida há ${Math.abs(diasRestantes)}d`, color: '#F85149' }
  if (diasRestantes === 0) return { label: 'Vence hoje', color: '#F85149' }
  if (diasRestantes <= 15) return { label: `Em ${diasRestantes}d`, color: '#F5A623' }
  return { label: `Em ${diasRestantes}d`, color: '#3EBB7A' }
}

// ─── Modal Criar/Editar Plano ─────────────────────────────────────────────────
function ModalPlano({ plano, onClose, onSucesso }: { plano: any | null; onClose: () => void; onSucesso: () => void }) {
  const isMobile = useIsMobile()
  const editando = !!plano
  const [form, setForm] = useState({
    clienteId:          plano ? String(plano.clienteId) : '',
    titulo:             plano?.titulo ?? '',
    resumo:             plano?.resumo ?? '',
    localizacao:        plano?.localizacao ?? '',
    periodicidadeMeses: plano ? String(plano.periodicidadeMeses) : '6',
    proximaData:        plano ? String(plano.proximaData).slice(0, 10) : '',
  })
  const [buscaCliente, setBuscaCliente] = useState('')
  const [erro, setErro] = useState('')

  const { data: clientesData } = (trpc as any).cliente.list.useQuery({ porPagina: 200 }, { enabled: !editando })
  const clientes: any[] = (clientesData?.data ?? []).filter((c: any) => !c.cancelado)

  const criarMut = (trpc as any).os.manutencao.criar.useMutation({
    onSuccess: onSucesso,
    onError: (e: any) => setErro(e.message ?? 'Erro ao criar plano'),
  })
  const updateMut = (trpc as any).os.manutencao.update.useMutation({
    onSuccess: onSucesso,
    onError: (e: any) => setErro(e.message ?? 'Erro ao salvar'),
  })

  const clienteSelecionado = clientes.find(c => String(c.id) === form.clienteId)
  const clientesFiltrados = buscaCliente.trim()
    ? clientes.filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase()))
    : []

  const salvar = () => {
    setErro('')
    if (!editando && !form.clienteId) return setErro('Selecione o cliente')
    if (!form.titulo.trim()) return setErro('Informe o título (ex.: Limpeza de painéis)')
    if (!form.proximaData) return setErro('Informe a data da próxima manutenção')

    const payload = {
      titulo:             form.titulo.trim(),
      resumo:             form.resumo.trim() || undefined,
      localizacao:        form.localizacao.trim() || undefined,
      periodicidadeMeses: parseInt(form.periodicidadeMeses),
      proximaData:        form.proximaData,
    }
    if (editando) updateMut.mutate({ id: plano.id, ...payload })
    else criarMut.mutate({ clienteId: parseInt(form.clienteId), ...payload })
  }

  const salvando = criarMut.isLoading || updateMut.isLoading

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#111D2E', borderRadius: 14, border: '1px solid #1E3050', width: isMobile ? '96vw' : 560, maxHeight: '92vh', overflowY: 'auto', padding: isMobile ? 18 : 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ color: '#C8D8EC', fontSize: 15, fontWeight: 800, margin: 0 }}>
            {editando ? '✏ Editar Plano de Manutenção' : '🔁 Novo Plano de Manutenção'}
          </h2>
          <button onClick={onClose} style={{ background: '#1E305040', border: 'none', color: '#4A6080', fontSize: 16, cursor: 'pointer', width: 30, height: 30, borderRadius: 8 }}>×</button>
        </div>

        {erro && (
          <div style={{ background: '#7F1D1D20', border: '1px solid #B91C1C', borderRadius: 8, padding: '9px 14px', marginBottom: 14, color: '#FCA5A5', fontSize: 12 }}>
            ⚠ {erro}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Cliente (só na criação) */}
          {!editando && (
            <div>
              <label style={labelStyle}>Cliente *</label>
              {clienteSelecionado ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#39C5CF12', border: '1px solid #39C5CF40', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontSize: 13, color: '#C8D8EC', fontWeight: 600 }}>{clienteSelecionado.nome}</span>
                  <button onClick={() => setForm(f => ({ ...f, clienteId: '' }))} style={{ background: 'none', border: 'none', color: '#4A6080', cursor: 'pointer', fontSize: 15 }}>×</button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)} placeholder="Buscar cliente..." style={inputStyle} autoFocus />
                  {buscaCliente.trim() && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#111D2E', border: '1px solid #1E3050', borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                      {clientesFiltrados.slice(0, 8).map(c => (
                        <div key={c.id}
                          onClick={() => { setForm(f => ({ ...f, clienteId: String(c.id) })); setBuscaCliente('') }}
                          style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: '#C8D8EC', borderBottom: '1px solid #1E305040' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1E305040')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >{c.nome}</div>
                      ))}
                      {clientesFiltrados.length === 0 && (
                        <div style={{ padding: '10px 12px', fontSize: 12, color: '#4A6080' }}>Nenhum cliente encontrado</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label style={labelStyle}>Título *</label>
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex.: Limpeza de painéis, Revisão preventiva do inversor..." style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Resumo do serviço (vira orientação do técnico na OS)</label>
            <textarea value={form.resumo} onChange={e => setForm(f => ({ ...f, resumo: e.target.value }))}
              placeholder="Ex.: Limpeza dos 12 módulos com água e escova macia, inspeção de conectores e fixações."
              style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
          </div>

          <div>
            <label style={labelStyle}>Localização</label>
            <input value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))}
              placeholder="Endereço, coordenadas ou link do Google Maps" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Periodicidade *</label>
              <select value={form.periodicidadeMeses} onChange={e => setForm(f => ({ ...f, periodicidadeMeses: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                {PERIODICIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Próxima manutenção *</label>
              <input type="date" value={form.proximaData} onChange={e => setForm(f => ({ ...f, proximaData: e.target.value }))} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #1E3050', background: 'transparent', color: '#4A6080', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#39C5CF', color: '#0C1421', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : '✓ Criar Plano'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export function ManutencoesPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [showModal, setShowModal] = useState(false)
  const [editandoPlano, setEditandoPlano] = useState<any | null>(null)

  const utils = (trpc as any).useUtils()
  const { data: planos = [], isLoading } = (trpc as any).os.manutencao.list.useQuery(undefined, { staleTime: 0 })

  const refresh = () => {
    utils.os.manutencao.list.invalidate()
    utils.os.manutencao.count.invalidate()
  }

  const gerarOSMut = (trpc as any).os.manutencao.gerarOS.useMutation({
    onSuccess: (res: any) => {
      refresh()
      utils.os.list.invalidate()
      if (window.confirm(`OS ${res.numero} gerada a partir do plano!\n\nDeseja abrir a OS agora?`)) {
        navigate(`/ordens-servico/${res.id}`)
      }
    },
    onError: (e: any) => alert('Erro ao gerar OS: ' + e.message),
  })
  const toggleMut = (trpc as any).os.manutencao.update.useMutation({
    onSuccess: refresh,
    onError: (e: any) => alert('Erro: ' + e.message),
  })

  const ativos = planos.filter((p: any) => Number(p.ativo) === 1)
  const vencidas  = ativos.filter((p: any) => Number(p.diasRestantes) < 0).length
  const proximas  = ativos.filter((p: any) => Number(p.diasRestantes) >= 0 && Number(p.diasRestantes) <= 15).length
  const emDia     = ativos.filter((p: any) => Number(p.diasRestantes) > 15).length

  return (
    <div style={{ padding: isMobile ? '16px 14px' : '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/ordens-servico')} style={{ background: '#1E305040', border: 'none', color: '#8A9BB5', fontSize: 16, cursor: 'pointer', width: 34, height: 34, borderRadius: 8 }}>←</button>
          <div>
            <h1 style={{ color: '#E2EAF5', fontSize: isMobile ? 17 : 20, fontWeight: 800, margin: 0 }}>🔁 Manutenções Recorrentes</h1>
            <p style={{ color: '#4A6080', fontSize: 11, margin: '2px 0 0' }}>
              Limpezas e revisões programadas — concluir a OS reagenda o plano automaticamente
            </p>
          </div>
        </div>
        <button onClick={() => { setEditandoPlano(null); setShowModal(true) }}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#39C5CF', color: '#0C1421', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
          + Novo Plano
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Vencidas',          valor: vencidas,      cor: '#F85149' },
          { label: 'Próximos 15 dias',  valor: proximas,      cor: '#F5A623' },
          { label: 'Em dia',            valor: emDia,         cor: '#3EBB7A' },
          { label: 'Planos ativos',     valor: ativos.length, cor: '#39C5CF' },
        ].map(k => (
          <div key={k.label} style={{ background: '#111D2E', border: `1px solid ${k.cor}30`, borderLeft: `3px solid ${k.cor}`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, color: '#4A6080', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.cor, marginTop: 2 }}>{k.valor}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : planos.length === 0 ? (
        <div style={{ background: '#111D2E', border: '1px dashed #1E3050', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔁</div>
          <div style={{ color: '#8A9BB5', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Nenhum plano de manutenção ainda</div>
          <div style={{ color: '#4A6080', fontSize: 12, marginBottom: 16 }}>Crie planos recorrentes (ex.: limpeza de painéis a cada 6 meses) e receba alertas quando estiver na hora.</div>
          <button onClick={() => setShowModal(true)} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#39C5CF', color: '#0C1421', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>+ Criar primeiro plano</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {planos.map((p: any) => {
            const ativo = Number(p.ativo) === 1
            const sit = situacao(Number(p.diasRestantes))
            return (
              <div key={p.id} style={{
                background: '#111D2E', border: '1px solid #1E3050', borderRadius: 10,
                borderLeft: `3px solid ${ativo ? sit.color : '#4A6080'}`,
                padding: '14px 16px', opacity: ativo ? 1 : 0.55,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#C8D8EC' }}>{p.titulo}</span>
                      {ativo ? (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sit.color + '20', color: sit.color, border: `1px solid ${sit.color}50` }}>
                          {sit.label}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#4A608020', color: '#4A6080' }}>PAUSADO</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#8A9BB5', marginBottom: 4 }}>👤 {p.clienteNome}</div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#4A6080' }}>
                      <span>🔁 A cada {p.periodicidadeMeses} {Number(p.periodicidadeMeses) === 1 ? 'mês' : 'meses'}</span>
                      <span>📅 Próxima: <strong style={{ color: sit.color }}>{formatDate(String(p.proximaData).slice(0, 10))}</strong></span>
                      {p.ultimaExecucao && <span>✔ Última: {formatDate(String(p.ultimaExecucao).slice(0, 10))}</span>}
                    </div>
                    {p.resumo && <div style={{ fontSize: 11, color: '#4A6080', marginTop: 5, fontStyle: 'italic' }}>{p.resumo}</div>}
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {ativo && (p.osAbertaId ? (
                      <button onClick={() => navigate(`/ordens-servico/${p.osAbertaId}`)}
                        style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #F5A62360', background: '#F5A62315', color: '#F5A623', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
                        📋 OS em andamento ({p.osAbertaNumero})
                      </button>
                    ) : (
                      <button onClick={() => gerarOSMut.mutate({ planoId: p.id })} disabled={gerarOSMut.isLoading}
                        style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: '#39C5CF', color: '#0C1421', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
                        🛠 Gerar OS
                      </button>
                    ))}
                    <button onClick={() => { setEditandoPlano(p); setShowModal(true) }}
                      style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #1E3050', background: 'transparent', color: '#8A9BB5', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>✏</button>
                    <button onClick={() => toggleMut.mutate({ id: p.id, ativo: !ativo })}
                      title={ativo ? 'Pausar plano' : 'Reativar plano'}
                      style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #1E3050', background: 'transparent', color: ativo ? '#F85149' : '#3EBB7A', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                      {ativo ? '⏸' : '▶'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <ModalPlano
          plano={editandoPlano}
          onClose={() => { setShowModal(false); setEditandoPlano(null) }}
          onSucesso={() => { setShowModal(false); setEditandoPlano(null); refresh() }}
        />
      )}
    </div>
  )
}
