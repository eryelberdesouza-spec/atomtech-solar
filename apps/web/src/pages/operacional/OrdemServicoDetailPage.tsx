import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatDate } from '../../lib/utils'
import { Btn, Spinner, C } from '../../components/ui'

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

const AG_STATUS_COLOR: Record<string, string> = {
  agendado:   '#58A6FF',
  confirmado: '#3EBB7A',
  realizado:  '#10B981',
  cancelado:  '#F85149',
}

const AG_STATUS_LABEL: Record<string, string> = {
  agendado:   'Agendado',
  confirmado: 'Confirmado',
  realizado:  'Realizado',
  cancelado:  'Cancelado',
}

const TIPO_AG_LABEL: Record<string, string> = {
  vistoria:    '🔍 Vistoria',
  instalacao:  '🔧 Instalação',
  manutencao:  '🛠 Manutenção',
  revisao:     '📋 Revisão',
  entrega:     '📦 Entrega',
}

// ─── Modal: Novo Agendamento ──────────────────────────────────────────
function ModalAgendamento({
  osId, onClose, onSuccess,
}: { osId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    dataAgendada: '',
    horaInicio:   '',
    horaFim:      '',
    tipo:         'instalacao' as string,
    tecnico:      '',
    endereco:     '',
    observacoes:  '',
  })
  const [salvando, setSalvando] = useState(false)

  const criarMut = (trpc as any).os.agendamento.criar.useMutation({
    onSuccess: () => { onSuccess(); onClose() },
    onError:   (e: any) => alert('Erro: ' + e.message),
    onSettled: () => setSalvando(false),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.dataAgendada) return alert('Informe a data do agendamento')
    setSalvando(true)
    criarMut.mutate({
      ordemServicoId: osId,
      dataAgendada:   form.dataAgendada,
      horaInicio:     form.horaInicio || undefined,
      horaFim:        form.horaFim    || undefined,
      tipo:           form.tipo as any,
      tecnico:        form.tecnico     || undefined,
      endereco:       form.endereco    || undefined,
      observacoes:    form.observacoes || undefined,
    })
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={handleSubmit} style={{
        background: '#131F30', border: '1px solid #1E3050', borderRadius: 14,
        padding: 28, width: 440, maxWidth: '90vw',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <h3 style={{ color: '#E2EAF5', fontSize: 16, fontWeight: 700, margin: 0 }}>
          📅 Novo Agendamento
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Tipo *</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={inputStyle}>
              {Object.entries(TIPO_AG_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Data *</label>
            <input type="date" value={form.dataAgendada} onChange={e => set('dataAgendada', e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Hora início</label>
            <input type="time" value={form.horaInicio} onChange={e => set('horaInicio', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Hora fim</label>
            <input type="time" value={form.horaFim} onChange={e => set('horaFim', e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Técnico</label>
          <input value={form.tecnico} onChange={e => set('tecnico', e.target.value)} placeholder="Nome do técnico" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Endereço</label>
          <input value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Local da visita" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Observações</label>
          <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
            rows={2} placeholder="Observações..." style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
          <button type="submit" disabled={salvando} style={saveBtnStyle}>
            {salvando ? '⏳ Salvando...' : '📅 Agendar'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Modal: Adicionar Marco ───────────────────────────────────────────
function ModalMarco({
  osId, onClose, onSuccess,
}: { osId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ titulo: '', descricao: '', dataPrevista: '', responsavel: '' })
  const [salvando, setSalvando] = useState(false)

  const criarMut = (trpc as any).os.marco.criar.useMutation({
    onSuccess: () => { onSuccess(); onClose() },
    onError:   (e: any) => alert('Erro: ' + e.message),
    onSettled: () => setSalvando(false),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim()) return alert('Informe o título do marco')
    setSalvando(true)
    criarMut.mutate({
      ordemServicoId: osId,
      titulo:         form.titulo,
      descricao:      form.descricao     || undefined,
      dataPrevista:   form.dataPrevista  || undefined,
      responsavel:    form.responsavel   || undefined,
    })
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={handleSubmit} style={{
        background: '#131F30', border: '1px solid #1E3050', borderRadius: 14,
        padding: 28, width: 400, maxWidth: '90vw',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <h3 style={{ color: '#E2EAF5', fontSize: 16, fontWeight: 700, margin: 0 }}>
          ✦ Novo Marco
        </h3>
        <div>
          <label style={labelStyle}>Título *</label>
          <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
            placeholder="Ex: Documentação entregue" style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Descrição</label>
          <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)}
            rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Data prevista</label>
            <input type="date" value={form.dataPrevista} onChange={e => set('dataPrevista', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Responsável</label>
            <input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
          <button type="submit" disabled={salvando} style={saveBtnStyle}>
            {salvando ? '⏳...' : '✦ Adicionar'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Shared styles ───────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0C1828', border: '1px solid #1E3050',
  borderRadius: 7, padding: '7px 10px', color: '#C8D8EC',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, color: '#4A6080',
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 7, border: '1px solid #1E3050',
  background: 'transparent', color: '#4A6080', cursor: 'pointer',
  fontSize: 12, fontFamily: 'inherit',
}
const saveBtnStyle: React.CSSProperties = {
  padding: '7px 18px', borderRadius: 7, border: 'none',
  background: '#F5A623', color: '#0C1421', cursor: 'pointer',
  fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
}

// ─── Main Page ───────────────────────────────────────────────────────
export function OrdemServicoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const osId = Number(id)
  const navigate = useNavigate()

  const utils = (trpc as any).useUtils()
  const invalidar = () => (trpc as any).os.byId.invalidate({ id: osId })

  const { data: os, isLoading } = (trpc as any).os.byId.useQuery(
    { id: osId },
    { enabled: !!osId, staleTime: 0 },
  )

  const [showModalAg, setShowModalAg]     = useState(false)
  const [showModalMarco, setShowModalMarco] = useState(false)
  const [mudandoStatus, setMudandoStatus] = useState(false)

  const updateStatusMut = (trpc as any).os.updateStatus.useMutation({
    onSuccess: () => utils.os.byId.invalidate({ id: osId }),
    onError:   (e: any) => alert('Erro: ' + e.message),
    onSettled: () => setMudandoStatus(false),
  })

  const marcoUpdateMut = (trpc as any).os.marco.update.useMutation({
    onSuccess: () => utils.os.byId.invalidate({ id: osId }),
    onError:   (e: any) => alert('Erro ao atualizar marco: ' + e.message),
  })

  const agStatusMut = (trpc as any).os.agendamento.updateStatus.useMutation({
    onSuccess: () => utils.os.byId.invalidate({ id: osId }),
    onError:   (e: any) => alert('Erro: ' + e.message),
  })

  const agDeletarMut = (trpc as any).os.agendamento.deletar.useMutation({
    onSuccess: () => utils.os.byId.invalidate({ id: osId }),
    onError:   (e: any) => alert('Erro: ' + e.message),
  })

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
      <Spinner />
    </div>
  )

  if (!os) return (
    <div style={{ padding: 32, color: '#F85149', fontSize: 14 }}>
      OS não encontrada.
    </div>
  )

  const cor = STATUS_COLOR[os.status] ?? '#8A9BB5'
  const totalMarcos  = os.marcos?.length ?? 0
  const marcosFeitos = os.marcos?.filter((m: any) => Number(m.concluido) === 1).length ?? 0
  const progresso    = totalMarcos > 0 ? Math.round((marcosFeitos / totalMarcos) * 100) : 0

  // Próximo status possível
  const FLUXO: Record<string, string> = {
    aberta:      'em_execucao',
    em_execucao: 'concluida',
  }
  const proximoStatus = FLUXO[os.status]

  const handleAvancarStatus = () => {
    if (!proximoStatus) return
    const labels: Record<string, string> = {
      em_execucao: 'Iniciar execução desta OS?',
      concluida:   'Marcar esta OS como concluída?',
    }
    if (!window.confirm(labels[proximoStatus])) return
    setMudandoStatus(true)
    updateStatusMut.mutate({ id: osId, status: proximoStatus })
  }

  const handleCancelar = () => {
    if (!window.confirm('Cancelar esta Ordem de Serviço? Esta ação não pode ser desfeita.')) return
    setMudandoStatus(true)
    updateStatusMut.mutate({ id: osId, status: 'cancelada' })
  }

  const toggleMarco = (marco: any) => {
    const novoConcluido = Number(marco.concluido) !== 1
    marcoUpdateMut.mutate({
      id:            marco.id,
      concluido:     novoConcluido,
      dataRealizada: novoConcluido ? new Date().toISOString().slice(0, 10) : undefined,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid #1E3050',
        background: '#111D2E', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <button
          onClick={() => navigate('/ordens-servico')}
          style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid #1E3050',
            background: '#1E305030', color: '#4A6080', cursor: 'pointer', fontSize: 12,
          }}
        >← Voltar</button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ color: cor, fontFamily: 'monospace', fontSize: 16, fontWeight: 800 }}>
              {os.numero}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
              background: cor + '18', color: cor, border: `1px solid ${cor}40`,
            }}>{STATUS_LABEL[os.status] ?? os.status}</span>
          </div>
          <div style={{ color: '#C8D8EC', fontSize: 14, fontWeight: 600 }}>
            {os.clienteNome ?? '—'}
            {os.titulo && <span style={{ color: '#4A6080', fontWeight: 400, marginLeft: 8 }}>· {os.titulo}</span>}
          </div>
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {os.status === 'aberta' || os.status === 'em_execucao' ? (
            <>
              {os.temAgendamento && (
                <button
                  onClick={() => setShowModalAg(true)}
                  style={{
                    padding: '7px 14px', borderRadius: 8, border: '1px solid #58A6FF50',
                    background: '#58A6FF18', color: '#58A6FF', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}
                >📅 Agendar Visita</button>
              )}
              {proximoStatus && (
                <button
                  onClick={handleAvancarStatus}
                  disabled={mudandoStatus}
                  style={{
                    padding: '7px 14px', borderRadius: 8, border: `1px solid ${cor}60`,
                    background: cor + '18', color: cor, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  }}
                >
                  {mudandoStatus ? '⏳...' : (proximoStatus === 'em_execucao' ? '▶ Iniciar' : '✔ Concluir')}
                </button>
              )}
              <button
                onClick={handleCancelar}
                disabled={mudandoStatus}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: '1px solid #F8514960',
                  background: '#F8514918', color: '#F85149', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}
              >✕ Cancelar OS</button>
            </>
          ) : null}
        </div>
      </div>

      {/* ── CONTEÚDO ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 1100 }}>

          {/* ── Coluna esquerda ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Informações gerais */}
            <Section title="Informações da OS">
              <InfoRow label="Proposta" value={os.propostaNome} mono />
              <InfoRow label="Cliente" value={os.clienteNome} />
              {os.clienteTelefone && <InfoRow label="Telefone" value={os.clienteTelefone} />}
              {os.clienteEmail && <InfoRow label="E-mail" value={os.clienteEmail} />}
              {os.clienteEndereco && <InfoRow label="Endereço" value={os.clienteEndereco} />}
              <InfoRow label="Técnico responsável" value={os.tecnicoResponsavel || '—'} />
              <InfoRow label="Criada em" value={formatDate(String(os.createdAt).slice(0, 10))} />
              {os.dataInicio && (
                <InfoRow label="Início" value={formatDate(String(os.dataInicio).slice(0, 10))} />
              )}
              {os.dataConclusao && (
                <InfoRow label="Conclusão" value={formatDate(String(os.dataConclusao).slice(0, 10))} />
              )}
              {os.dataPrevistaInicio && (
                <InfoRow label="Previsão início" value={formatDate(String(os.dataPrevistaInicio).slice(0, 10))} />
              )}
              {os.dataPrevistaFim && (
                <InfoRow label="Previsão fim" value={formatDate(String(os.dataPrevistaFim).slice(0, 10))} />
              )}
              {os.descricao && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: '#4A6080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Descrição
                  </div>
                  <p style={{ color: '#8A9BB5', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{os.descricao}</p>
                </div>
              )}
            </Section>

            {/* Agendamentos */}
            {os.temAgendamento && (
              <Section
                title="Agendamentos"
                action={
                  (os.status === 'aberta' || os.status === 'em_execucao') ? (
                    <button onClick={() => setShowModalAg(true)} style={sectionActionStyle}>
                      + Agendar
                    </button>
                  ) : undefined
                }
              >
                {(!os.agendamentos || os.agendamentos.length === 0) ? (
                  <p style={{ color: '#4A6080', fontSize: 13, margin: '8px 0' }}>
                    Nenhum agendamento ainda.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {os.agendamentos.map((ag: any) => {
                      const agCor = AG_STATUS_COLOR[ag.status] ?? '#8A9BB5'
                      return (
                        <div key={ag.id} style={{
                          background: '#0C1828', borderRadius: 8, padding: '10px 12px',
                          border: `1px solid ${agCor}30`, borderLeft: `3px solid ${agCor}`,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#C8D8EC' }}>
                              {TIPO_AG_LABEL[ag.tipo] ?? ag.tipo}
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                              background: agCor + '18', color: agCor,
                            }}>{AG_STATUS_LABEL[ag.status] ?? ag.status}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#8A9BB5', marginBottom: 4 }}>
                            {formatDate(String(ag.dataAgendada).slice(0, 10))}
                            {ag.horaInicio && ` · ${ag.horaInicio}`}
                            {ag.horaFim    && ` – ${ag.horaFim}`}
                            {ag.tecnico    && ` · ${ag.tecnico}`}
                          </div>
                          {ag.endereco && (
                            <div style={{ fontSize: 11, color: '#4A6080', marginBottom: 6 }}>📍 {ag.endereco}</div>
                          )}
                          {/* Ações do agendamento */}
                          {ag.status !== 'cancelado' && ag.status !== 'realizado' && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                              {ag.status === 'agendado' && (
                                <button onClick={() => agStatusMut.mutate({ id: ag.id, status: 'confirmado' })}
                                  style={{ ...microBtnStyle, color: '#3EBB7A', borderColor: '#3EBB7A40' }}>
                                  ✔ Confirmar
                                </button>
                              )}
                              {(ag.status === 'agendado' || ag.status === 'confirmado') && (
                                <button onClick={() => agStatusMut.mutate({ id: ag.id, status: 'realizado' })}
                                  style={{ ...microBtnStyle, color: '#10B981', borderColor: '#10B98140' }}>
                                  ✅ Realizado
                                </button>
                              )}
                              <button
                                onClick={() => window.confirm('Excluir este agendamento?') && agDeletarMut.mutate({ id: ag.id })}
                                style={{ ...microBtnStyle, color: '#F85149', borderColor: '#F8514940' }}>
                                ✕ Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Section>
            )}
          </div>

          {/* ── Coluna direita: Marcos ── */}
          <div>
            <Section
              title={`Marcos de Execução (${marcosFeitos}/${totalMarcos})`}
              action={
                (os.status !== 'concluida' && os.status !== 'cancelada') ? (
                  <button onClick={() => setShowModalMarco(true)} style={sectionActionStyle}>
                    + Marco
                  </button>
                ) : undefined
              }
            >
              {/* Barra de progresso */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#4A6080', fontWeight: 600 }}>Progresso</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: progresso === 100 ? '#3EBB7A' : '#F5A623' }}>
                    {progresso}%
                  </span>
                </div>
                <div style={{ height: 6, background: '#1E3050', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${progresso}%`, height: '100%', borderRadius: 3,
                    background: progresso === 100 ? '#3EBB7A' : '#F5A623',
                    transition: 'width 0.4s',
                  }} />
                </div>
              </div>

              {/* Lista de marcos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(os.marcos ?? []).map((marco: any, idx: number) => {
                  const feito = Number(marco.concluido) === 1
                  return (
                    <div
                      key={marco.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        background: feito ? '#3EBB7A08' : '#0C1828',
                        borderRadius: 8, padding: '10px 12px',
                        border: `1px solid ${feito ? '#3EBB7A30' : '#1E3050'}`,
                        cursor: os.status === 'cancelada' ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onClick={() => {
                        if (os.status === 'cancelada') return
                        toggleMarco(marco)
                      }}
                    >
                      {/* Checkbox visual */}
                      <div style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${feito ? '#3EBB7A' : '#2A3F55'}`,
                        background: feito ? '#3EBB7A' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginTop: 1,
                        fontSize: 12, color: '#fff',
                      }}>
                        {feito && '✓'}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: feito ? 400 : 600,
                          color: feito ? '#4A6080' : '#C8D8EC',
                          textDecoration: feito ? 'line-through' : 'none',
                        }}>
                          <span style={{ color: '#4A6080', fontFamily: 'monospace', marginRight: 6 }}>
                            {String(idx + 1).padStart(2, '0')}.
                          </span>
                          {marco.titulo}
                        </div>
                        {marco.descricao && (
                          <div style={{ fontSize: 11, color: '#4A6080', marginTop: 2 }}>{marco.descricao}</div>
                        )}
                        <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                          {marco.dataPrevista && (
                            <span style={{ fontSize: 10, color: '#4A6080' }}>
                              📅 Previsto: {formatDate(String(marco.dataPrevista).slice(0, 10))}
                            </span>
                          )}
                          {feito && marco.dataRealizada && (
                            <span style={{ fontSize: 10, color: '#3EBB7A' }}>
                              ✔ Concluído: {formatDate(String(marco.dataRealizada).slice(0, 10))}
                            </span>
                          )}
                          {marco.responsavel && (
                            <span style={{ fontSize: 10, color: '#4A6080' }}>👤 {marco.responsavel}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          </div>
        </div>
      </div>

      {/* Modais */}
      {showModalAg && (
        <ModalAgendamento
          osId={osId}
          onClose={() => setShowModalAg(false)}
          onSuccess={() => utils.os.byId.invalidate({ id: osId })}
        />
      )}
      {showModalMarco && (
        <ModalMarco
          osId={osId}
          onClose={() => setShowModalMarco(false)}
          onSuccess={() => utils.os.byId.invalidate({ id: osId })}
        />
      )}
    </div>
  )
}

// ─── Sub-componentes auxiliares ───────────────────────────────────────

function Section({
  title, children, action,
}: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{
      background: '#111D2E', border: '1px solid #1E3050', borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #1E3050',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h3 style={{ color: '#C8D8EC', fontSize: 13, fontWeight: 700, margin: 0 }}>{title}</h3>
        {action}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: '#4A6080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{
        fontSize: 13, color: '#C8D8EC', fontWeight: 500,
        fontFamily: mono ? 'monospace' : 'inherit',
        maxWidth: '65%', textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  )
}

const sectionActionStyle: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6, border: '1px solid #F5A62360',
  background: '#F5A62318', color: '#F5A623', cursor: 'pointer',
  fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
}

const microBtnStyle: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 5, border: '1px solid',
  background: 'transparent', cursor: 'pointer',
  fontSize: 10, fontWeight: 600, fontFamily: 'inherit',
}
