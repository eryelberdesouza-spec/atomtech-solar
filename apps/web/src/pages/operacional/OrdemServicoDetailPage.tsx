import { useState, useRef } from 'react'
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

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0C1828', border: '1px solid #1E3050',
  borderRadius: 7, padding: '7px 10px', color: '#C8D8EC',
  fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
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
const microBtnStyle: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 5, border: '1px solid',
  background: 'transparent', cursor: 'pointer',
  fontSize: 10, fontWeight: 600, fontFamily: 'inherit',
}
const sectionActionStyle: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6, border: '1px solid #F5A62360',
  background: '#F5A62318', color: '#F5A623', cursor: 'pointer',
  fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
}

// ─── Modal: Novo Agendamento ──────────────────────────────────────────────────
function ModalAgendamento({ osId, onClose, onSuccess }: { osId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ dataAgendada: '', horaInicio: '', horaFim: '', tipo: 'instalacao', tecnico: '', endereco: '', observacoes: '' })
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
    criarMut.mutate({ ordemServicoId: osId, dataAgendada: form.dataAgendada, horaInicio: form.horaInicio || undefined, horaFim: form.horaFim || undefined, tipo: form.tipo as any, tecnico: form.tecnico || undefined, endereco: form.endereco || undefined, observacoes: form.observacoes || undefined })
  }
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} style={{ background: '#131F30', border: '1px solid #1E3050', borderRadius: 14, padding: 28, width: 440, maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ color: '#E2EAF5', fontSize: 16, fontWeight: 700, margin: 0 }}>📅 Novo Agendamento</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={labelStyle}>Tipo *</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={inputStyle}>
              {Object.entries(TIPO_AG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div><label style={labelStyle}>Data *</label><input type="date" value={form.dataAgendada} onChange={e => set('dataAgendada', e.target.value)} style={inputStyle} required /></div>
          <div><label style={labelStyle}>Hora início</label><input type="time" value={form.horaInicio} onChange={e => set('horaInicio', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Hora fim</label><input type="time" value={form.horaFim} onChange={e => set('horaFim', e.target.value)} style={inputStyle} /></div>
        </div>
        <div><label style={labelStyle}>Técnico</label><input value={form.tecnico} onChange={e => set('tecnico', e.target.value)} placeholder="Nome do técnico" style={inputStyle} /></div>
        <div><label style={labelStyle}>Endereço / Local</label><input value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Local da visita" style={inputStyle} /></div>
        <div><label style={labelStyle}>Observações</label><textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
          <button type="submit" disabled={salvando} style={saveBtnStyle}>{salvando ? '⏳...' : '📅 Agendar'}</button>
        </div>
      </form>
    </div>
  )
}

// ─── Modal: Adicionar Marco ───────────────────────────────────────────────────
function ModalMarco({ osId, onClose, onSuccess }: { osId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ titulo: '', descricao: '', dataPrevista: '', responsavel: '' })
  const [salvando, setSalvando] = useState(false)

  const criarMut = (trpc as any).os.marco.criar.useMutation({
    onSuccess: () => { onSuccess(); onClose() },
    onError:   (e: any) => alert('Erro: ' + e.message),
    onSettled: () => setSalvando(false),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim()) return alert('Informe o título')
    setSalvando(true)
    criarMut.mutate({ ordemServicoId: osId, titulo: form.titulo, descricao: form.descricao || undefined, dataPrevista: form.dataPrevista || undefined, responsavel: form.responsavel || undefined })
  }
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} style={{ background: '#131F30', border: '1px solid #1E3050', borderRadius: 14, padding: 28, width: 400, maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ color: '#E2EAF5', fontSize: 16, fontWeight: 700, margin: 0 }}>✦ Novo Marco / Etapa</h3>
        <div><label style={labelStyle}>Título *</label><input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Documentação entregue" style={inputStyle} required /></div>
        <div><label style={labelStyle}>Descrição</label><textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={labelStyle}>Data prevista</label><input type="date" value={form.dataPrevista} onChange={e => set('dataPrevista', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Responsável</label><input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} style={inputStyle} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
          <button type="submit" disabled={salvando} style={saveBtnStyle}>{salvando ? '⏳...' : '✦ Adicionar'}</button>
        </div>
      </form>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: '#111D2E', border: '1px solid #1E3050', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E3050', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
      <span style={{ fontSize: 11, color: '#4A6080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#C8D8EC', fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit', maxWidth: '65%', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

// ─── Aba: Visão Geral ─────────────────────────────────────────────────────────
function AbaVisaoGeral({ os, osId, onRefresh, onShowModalMarco }: any) {
  const totalMarcos  = os.marcos?.length ?? 0
  const marcosFeitos = os.marcos?.filter((m: any) => Number(m.concluido) === 1).length ?? 0
  const progresso    = totalMarcos > 0 ? Math.round((marcosFeitos / totalMarcos) * 100) : 0

  const marcoUpdateMut = (trpc as any).os.marco.update.useMutation({
    onSuccess: onRefresh,
    onError: (e: any) => alert('Erro ao atualizar marco: ' + e.message),
  })

  const toggleMarco = (marco: any) => {
    if (os.status === 'cancelada') return
    const novoConcluido = Number(marco.concluido) !== 1
    marcoUpdateMut.mutate({ id: marco.id, concluido: novoConcluido, dataRealizada: novoConcluido ? new Date().toISOString().slice(0, 10) : undefined })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Coluna esquerda: Informações */}
      <div>
        <Section title="Informações da OS">
          <InfoRow label="Proposta" value={os.propostaNome} mono />
          <InfoRow label="Cliente" value={os.clienteNome} />
          {os.clienteTelefone && <InfoRow label="Telefone" value={os.clienteTelefone} />}
          {os.clienteEmail && <InfoRow label="E-mail" value={os.clienteEmail} />}
          {os.clienteEndereco && <InfoRow label="Endereço" value={os.clienteEndereco} />}
          <InfoRow label="Técnico responsável" value={os.tecnicoResponsavel || '—'} />
          <InfoRow label="Criada em" value={formatDate(String(os.createdAt).slice(0, 10))} />
          {os.dataInicio && <InfoRow label="Início" value={formatDate(String(os.dataInicio).slice(0, 10))} />}
          {os.dataConclusao && <InfoRow label="Conclusão" value={formatDate(String(os.dataConclusao).slice(0, 10))} />}
          {os.dataPrevistaInicio && <InfoRow label="Previsão início" value={formatDate(String(os.dataPrevistaInicio).slice(0, 10))} />}
          {os.dataPrevistaFim && <InfoRow label="Previsão fim" value={formatDate(String(os.dataPrevistaFim).slice(0, 10))} />}
          {os.descricao && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, color: '#4A6080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Descrição</div>
              <p style={{ color: '#8A9BB5', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{os.descricao}</p>
            </div>
          )}
        </Section>
      </div>

      {/* Coluna direita: Marcos */}
      <div>
        <Section
          title={`Marcos / Etapas (${marcosFeitos}/${totalMarcos})`}
          action={
            os.status !== 'concluida' && os.status !== 'cancelada' ? (
              <button onClick={onShowModalMarco} style={sectionActionStyle}>+ Etapa</button>
            ) : undefined
          }
        >
          {/* Barra de progresso */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#4A6080', fontWeight: 600 }}>Progresso</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: progresso === 100 ? '#3EBB7A' : '#F5A623' }}>{progresso}%</span>
            </div>
            <div style={{ height: 6, background: '#1E3050', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${progresso}%`, height: '100%', borderRadius: 3, background: progresso === 100 ? '#3EBB7A' : '#F5A623', transition: 'width 0.4s' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(os.marcos ?? []).map((marco: any, idx: number) => {
              const feito = Number(marco.concluido) === 1
              return (
                <div
                  key={marco.id}
                  onClick={() => toggleMarco(marco)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    background: feito ? '#3EBB7A08' : '#0C1828', borderRadius: 8, padding: '10px 12px',
                    border: `1px solid ${feito ? '#3EBB7A30' : '#1E3050'}`,
                    cursor: os.status === 'cancelada' ? 'default' : 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: `2px solid ${feito ? '#3EBB7A' : '#2A3F55'}`, background: feito ? '#3EBB7A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1, fontSize: 12, color: '#fff' }}>
                    {feito && '✓'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: feito ? 400 : 600, color: feito ? '#4A6080' : '#C8D8EC', textDecoration: feito ? 'line-through' : 'none' }}>
                      <span style={{ color: '#4A6080', fontFamily: 'monospace', marginRight: 6 }}>{String(idx + 1).padStart(2, '0')}.</span>
                      {marco.titulo}
                    </div>
                    {marco.descricao && <div style={{ fontSize: 11, color: '#4A6080', marginTop: 2 }}>{marco.descricao}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                      {marco.dataPrevista && <span style={{ fontSize: 10, color: '#4A6080' }}>📅 Previsto: {formatDate(String(marco.dataPrevista).slice(0, 10))}</span>}
                      {feito && marco.dataRealizada && <span style={{ fontSize: 10, color: '#3EBB7A' }}>✔ Concluído: {formatDate(String(marco.dataRealizada).slice(0, 10))}</span>}
                      {marco.responsavel && <span style={{ fontSize: 10, color: '#4A6080' }}>👤 {marco.responsavel}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      </div>
    </div>
  )
}

// ─── Aba: Agendamentos ────────────────────────────────────────────────────────
function AbaAgendamentos({ os, osId, onRefresh, onShowModal }: any) {
  const agStatusMut = (trpc as any).os.agendamento.updateStatus.useMutation({ onSuccess: onRefresh, onError: (e: any) => alert('Erro: ' + e.message) })
  const agDeletarMut = (trpc as any).os.agendamento.deletar.useMutation({ onSuccess: onRefresh, onError: (e: any) => alert('Erro: ' + e.message) })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ color: '#C8D8EC', fontSize: 14, fontWeight: 700, margin: 0 }}>Agendamentos</h3>
          <p style={{ color: '#4A6080', fontSize: 12, margin: '3px 0 0' }}>{(os.agendamentos ?? []).length} agendamento(s) registrado(s)</p>
        </div>
        {(os.status === 'aberta' || os.status === 'em_execucao') && (
          <button onClick={onShowModal} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #58A6FF60', background: '#58A6FF18', color: '#58A6FF', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
            📅 + Novo Agendamento
          </button>
        )}
      </div>

      {(!os.agendamentos || os.agendamentos.length === 0) ? (
        <div style={{ background: '#111D2E', border: '1px dashed #1E3050', borderRadius: 12, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <div style={{ color: '#4A6080', fontSize: 13 }}>Nenhum agendamento ainda.</div>
          {(os.status === 'aberta' || os.status === 'em_execucao') && (
            <button onClick={onShowModal} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: '1px solid #58A6FF60', background: '#58A6FF18', color: '#58A6FF', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
              + Criar primeiro agendamento
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {os.agendamentos.map((ag: any) => {
            const agCor = AG_STATUS_COLOR[ag.status] ?? '#8A9BB5'
            return (
              <div key={ag.id} style={{ background: '#111D2E', borderRadius: 10, padding: '14px 16px', border: `1px solid ${agCor}30`, borderLeft: `3px solid ${agCor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#C8D8EC' }}>{TIPO_AG_LABEL[ag.tipo] ?? ag.tipo}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: agCor + '18', color: agCor }}>{AG_STATUS_LABEL[ag.status] ?? ag.status}</span>
                </div>
                <div style={{ fontSize: 13, color: '#8A9BB5', marginBottom: 4 }}>
                  📅 {formatDate(String(ag.dataAgendada).slice(0, 10))}
                  {ag.horaInicio && ` · ${ag.horaInicio}`}
                  {ag.horaFim    && ` – ${ag.horaFim}`}
                </div>
                {ag.tecnico  && <div style={{ fontSize: 12, color: '#4A6080', marginBottom: 2 }}>👤 {ag.tecnico}</div>}
                {ag.endereco && <div style={{ fontSize: 12, color: '#4A6080', marginBottom: 2 }}>📍 {ag.endereco}</div>}
                {ag.observacoes && <div style={{ fontSize: 12, color: '#4A6080', marginTop: 4, fontStyle: 'italic' }}>{ag.observacoes}</div>}
                {ag.status !== 'cancelado' && ag.status !== 'realizado' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {ag.status === 'agendado' && (
                      <button onClick={() => agStatusMut.mutate({ id: ag.id, status: 'confirmado' })} style={{ ...microBtnStyle, color: '#3EBB7A', borderColor: '#3EBB7A40' }}>✔ Confirmar</button>
                    )}
                    {(ag.status === 'agendado' || ag.status === 'confirmado') && (
                      <button onClick={() => agStatusMut.mutate({ id: ag.id, status: 'realizado' })} style={{ ...microBtnStyle, color: '#10B981', borderColor: '#10B98140' }}>✅ Realizado</button>
                    )}
                    <button onClick={() => window.confirm('Excluir este agendamento?') && agDeletarMut.mutate({ id: ag.id })} style={{ ...microBtnStyle, color: '#F85149', borderColor: '#F8514940' }}>✕ Excluir</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Aba: Diário de Campo ─────────────────────────────────────────────────────
function AbaDiarioCampo({ os, osId, onRefresh }: any) {
  const [texto, setTexto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const usuario: any = (() => { try { return JSON.parse(localStorage.getItem('atomtech_usuario') || '{}') } catch { return {} } })()

  const criarNota = (trpc as any).os.nota.criar.useMutation({
    onSuccess: () => { setTexto(''); setSalvando(false); onRefresh() },
    onError: (e: any) => { alert('Erro: ' + e.message); setSalvando(false) },
  })

  const deletarNota = (trpc as any).os.nota.deletar.useMutation({
    onSuccess: onRefresh,
    onError: (e: any) => alert('Erro: ' + e.message),
  })

  const handleSalvar = () => {
    if (!texto.trim()) return
    setSalvando(true)
    criarNota.mutate({ ordemServicoId: osId, texto: texto.trim(), autor: usuario?.nome || undefined })
  }

  const notas: any[] = os.notas ?? []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ color: '#C8D8EC', fontSize: 14, fontWeight: 700, margin: 0 }}>📓 Diário de Campo</h3>
          <p style={{ color: '#4A6080', fontSize: 12, margin: '3px 0 0' }}>Registro cronológico de atividades, observações e eventos em campo</p>
        </div>
      </div>

      {/* Formulário de nova nota */}
      {os.status !== 'cancelada' && (
        <div style={{ background: '#111D2E', border: '1px solid #1E3050', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <label style={{ ...labelStyle, marginBottom: 8 }}>Nova entrada no diário</label>
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Descreva o que foi realizado, observado ou qualquer informação relevante da visita de campo..."
            rows={4}
            style={{
              width: '100%', background: '#0C1828', border: '1px solid #1E3050',
              borderRadius: 8, padding: '10px 14px', color: '#C8D8EC',
              fontSize: 13, outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5,
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.ctrlKey) handleSalvar()
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 11, color: '#2A3F55' }}>Ctrl+Enter para salvar</span>
            <button
              onClick={handleSalvar}
              disabled={salvando || !texto.trim()}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: texto.trim() ? '#F5A623' : '#1E3050',
                color: texto.trim() ? '#0C1421' : '#2A3F55',
                cursor: texto.trim() ? 'pointer' : 'default',
                fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {salvando ? '⏳ Salvando...' : '📝 Registrar'}
            </button>
          </div>
        </div>
      )}

      {/* Timeline de notas */}
      {notas.length === 0 ? (
        <div style={{ background: '#111D2E', border: '1px dashed #1E3050', borderRadius: 12, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📓</div>
          <div style={{ color: '#4A6080', fontSize: 13 }}>Nenhuma entrada no diário ainda.</div>
          <div style={{ color: '#2A3F55', fontSize: 12, marginTop: 4 }}>Use o campo acima para registrar atividades de campo.</div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Linha da timeline */}
          <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 2, background: '#1E3050' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...notas].reverse().map((nota: any) => {
              const dt = new Date(nota.createdAt)
              const dataStr = `${dt.toLocaleDateString('pt-BR')} às ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              return (
                <div key={nota.id} style={{ display: 'flex', gap: 14, paddingLeft: 8 }}>
                  {/* Ponto da timeline */}
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F5A62318', border: '2px solid #F5A623', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, zIndex: 1 }}>
                    ✎
                  </div>
                  <div style={{ flex: 1, background: '#111D2E', border: '1px solid #1E3050', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        {nota.autor && <span style={{ fontSize: 12, fontWeight: 700, color: '#F5A623', marginRight: 8 }}>👤 {nota.autor}</span>}
                        <span style={{ fontSize: 11, color: '#4A6080' }}>{dataStr}</span>
                      </div>
                      {os.status !== 'cancelada' && (
                        <button
                          onClick={() => window.confirm('Excluir esta entrada?') && deletarNota.mutate({ id: nota.id })}
                          style={{ background: 'none', border: 'none', color: '#2A3F55', cursor: 'pointer', fontSize: 12, padding: '2px 6px', borderRadius: 4 }}
                          title="Excluir"
                        >✕</button>
                      )}
                    </div>
                    <p style={{ color: '#C8D8EC', fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{nota.texto}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Aba: Anexos ─────────────────────────────────────────────────────────────
const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? 'https://atomtech-solar-production.up.railway.app'
  : 'http://localhost:3001'

function getToken() {
  return localStorage.getItem('atomtech_token') || ''
}

function fmtTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function AbaAnexos({ osId, osStatus }: { osId: number; osStatus: string }) {
  const [uploading,    setUploading]    = useState(false)
  const [erro,         setErro]         = useState('')
  const [preview,      setPreview]      = useState<{ id: number; nome: string; tipoMime: string } | null>(null)
  const [dragOver,     setDragOver]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const utils  = (trpc as any).useUtils()
  const refresh = () => utils.os.anexo.list.invalidate({ ordemServicoId: osId })

  const { data: anexos = [], isLoading } = (trpc as any).os.anexo.list.useQuery(
    { ordemServicoId: osId },
    { staleTime: 30_000 },
  )

  const deletarAnexo = (trpc as any).os.anexo.deletar.useMutation({
    onSuccess: refresh,
    onError: (e: any) => alert('Erro: ' + e.message),
  })

  const uploadFile = async (file: File) => {
    setErro('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('arquivo', file)
      const resp = await fetch(`${API_BASE}/os/${osId}/anexo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const data = await resp.json()
      if (!data.ok) throw new Error(data.error || 'Erro ao enviar arquivo')
      refresh()
    } catch (e: any) {
      setErro(e.message || 'Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return
    Array.from(files).forEach(f => uploadFile(f))
  }

  const fileUrl = (id: number) =>
    `${API_BASE}/os-anexo/${id}?token=${encodeURIComponent(getToken())}`

  const isImage = (mime: string) => mime.startsWith('image/')
  const isPDF   = (mime: string) => mime === 'application/pdf'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ color: '#C8D8EC', fontSize: 14, fontWeight: 700, margin: 0 }}>📎 Anexos</h3>
          <p style={{ color: '#4A6080', fontSize: 12, margin: '3px 0 0' }}>{anexos.length} arquivo(s) — fotos e PDFs do serviço</p>
        </div>
        {osStatus !== 'cancelada' && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #F5A62360', background: '#F5A62318', color: '#F5A623', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
          >
            {uploading ? '⏳ Enviando...' : '📎 + Anexar arquivo'}
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

      {erro && (
        <div style={{ background: '#F8514912', border: '1px solid #F8514940', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#F85149', marginBottom: 12 }}>{erro}</div>
      )}

      {/* Drop zone */}
      {osStatus !== 'cancelada' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#F5A623' : '#1E3050'}`,
            borderRadius: 10, padding: '16px', textAlign: 'center',
            cursor: 'pointer', marginBottom: 16, transition: 'all 0.15s',
            background: dragOver ? '#F5A62308' : 'transparent',
          }}
        >
          <span style={{ fontSize: 11, color: dragOver ? '#F5A623' : '#2A3F55' }}>
            {uploading ? '⏳ Enviando arquivos...' : '📂 Arraste fotos ou PDFs aqui, ou clique para selecionar'}
          </span>
        </div>
      )}

      {/* Grid de anexos */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
      ) : anexos.length === 0 ? (
        <div style={{ background: '#111D2E', border: '1px dashed #1E3050', borderRadius: 12, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
          <div style={{ color: '#4A6080', fontSize: 13 }}>Nenhum anexo ainda.</div>
          <div style={{ color: '#2A3F55', fontSize: 12, marginTop: 4 }}>Adicione fotos ou PDFs do serviço.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {(anexos as any[]).map((a: any) => (
            <div
              key={a.id}
              style={{
                background: '#111D2E', border: '1px solid #1E3050', borderRadius: 10,
                overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#F5A623'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#1E3050'}
            >
              {/* Thumbnail / preview */}
              <div
                onClick={() => setPreview({ id: a.id, nome: a.nome, tipoMime: a.tipoMime })}
                style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#0C1828' }}
              >
                {isImage(a.tipoMime) ? (
                  <img
                    src={fileUrl(a.id)}
                    alt={a.nome}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                ) : isPDF(a.tipoMime) ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48 }}>📄</div>
                    <div style={{ fontSize: 10, color: '#4A6080', marginTop: 4 }}>PDF</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 40 }}>📎</div>
                )}
              </div>

              {/* Info + ações */}
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 11, color: '#C8D8EC', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.nome}>
                  {a.nome}
                </div>
                <div style={{ fontSize: 10, color: '#4A6080', marginTop: 2 }}>{fmtTamanho(a.tamanho)}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  <button
                    onClick={() => setPreview({ id: a.id, nome: a.nome, tipoMime: a.tipoMime })}
                    style={{ flex: 1, padding: '4px', borderRadius: 5, border: '1px solid #1E3050', background: '#0C1828', color: '#8A9BB5', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}
                  >👁 Ver</button>
                  <a
                    href={fileUrl(a.id)}
                    download={a.nome}
                    style={{ flex: 1, padding: '4px', borderRadius: 5, border: '1px solid #1E3050', background: '#0C1828', color: '#8A9BB5', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >⬇</a>
                  {osStatus !== 'cancelada' && (
                    <button
                      onClick={() => window.confirm(`Excluir "${a.nome}"?`) && deletarAnexo.mutate({ id: a.id })}
                      style={{ padding: '4px 6px', borderRadius: 5, border: '1px solid #F8514940', background: 'transparent', color: '#F85149', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}
                    >✕</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Preview */}
      {preview && (
        <div
          style={{ position: 'fixed', inset: 0, background: '#000000CC', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setPreview(null)}
        >
          {/* Barra de controles */}
          <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
            <a href={fileUrl(preview.id)} download={preview.nome} style={{ padding: '8px 14px', borderRadius: 8, background: '#1E3050', color: '#C8D8EC', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>⬇ Baixar</a>
            <a href={fileUrl(preview.id)} target="_blank" rel="noreferrer" style={{ padding: '8px 14px', borderRadius: 8, background: '#1E3050', color: '#C8D8EC', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>↗ Abrir</a>
            <button onClick={() => setPreview(null)} style={{ padding: '8px 14px', borderRadius: 8, background: '#F85149', color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>✕ Fechar</button>
          </div>

          {/* Nome do arquivo */}
          <div style={{ position: 'absolute', top: 16, left: 16, color: '#C8D8EC', fontSize: 13, fontWeight: 600, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📎 {preview.nome}
          </div>

          {/* Conteúdo */}
          <div style={{ maxWidth: '90vw', maxHeight: '80vh', marginTop: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isImage(preview.tipoMime) ? (
              <img
                src={fileUrl(preview.id)}
                alt={preview.nome}
                style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.8)', objectFit: 'contain' }}
              />
            ) : isPDF(preview.tipoMime) ? (
              <iframe
                src={fileUrl(preview.id)}
                style={{ width: '80vw', height: '78vh', borderRadius: 8, border: 'none', background: '#fff' }}
                title={preview.nome}
              />
            ) : (
              <div style={{ color: '#C8D8EC', textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>📎</div>
                <div>{preview.nome}</div>
                <a href={fileUrl(preview.id)} download={preview.nome} style={{ color: '#F5A623', marginTop: 12, display: 'block' }}>Baixar arquivo</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export function OrdemServicoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const osId = Number(id)
  const navigate = useNavigate()

  const utils = (trpc as any).useUtils()
  const refresh = () => utils.os.byId.invalidate({ id: osId })

  const { data: os, isLoading } = (trpc as any).os.byId.useQuery({ id: osId }, { enabled: !!osId, staleTime: 0 })

  const [aba, setAba] = useState<'geral' | 'agendamentos' | 'diario' | 'anexos'>('geral')
  const [showModalAg, setShowModalAg]       = useState(false)
  const [showModalMarco, setShowModalMarco] = useState(false)
  const [mudandoStatus, setMudandoStatus]   = useState(false)

  const updateStatusMut = (trpc as any).os.updateStatus.useMutation({
    onSuccess: () => utils.os.byId.invalidate({ id: osId }),
    onError:   (e: any) => alert('Erro: ' + e.message),
    onSettled: () => setMudandoStatus(false),
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}><Spinner /></div>
  if (!os) return <div style={{ padding: 32, color: '#F85149', fontSize: 14 }}>OS não encontrada.</div>

  const cor = STATUS_COLOR[os.status] ?? '#8A9BB5'
  const totalMarcos  = os.marcos?.length ?? 0
  const marcosFeitos = os.marcos?.filter((m: any) => Number(m.concluido) === 1).length ?? 0
  const progresso    = totalMarcos > 0 ? Math.round((marcosFeitos / totalMarcos) * 100) : 0
  const FLUXO: Record<string, string> = { aberta: 'em_execucao', em_execucao: 'concluida' }
  const proximoStatus = FLUXO[os.status]

  const handleAvancarStatus = () => {
    if (!proximoStatus) return
    const labels: Record<string, string> = { em_execucao: 'Iniciar execução desta OS?', concluida: 'Marcar esta OS como concluída?' }
    if (!window.confirm(labels[proximoStatus])) return
    setMudandoStatus(true)
    updateStatusMut.mutate({ id: osId, status: proximoStatus })
  }

  const handleCancelar = () => {
    if (!window.confirm('Cancelar esta OS?')) return
    setMudandoStatus(true)
    updateStatusMut.mutate({ id: osId, status: 'cancelada' })
  }

  const { data: anexos = [] } = (trpc as any).os.anexo.list.useQuery(
    { ordemServicoId: osId },
    { staleTime: 30_000 },
  )

  const ABAS = [
    { id: 'geral',        label: '📋 Visão Geral' },
    { id: 'agendamentos', label: `📅 Agendamentos${os.agendamentos?.length ? ` (${os.agendamentos.length})` : ''}` },
    { id: 'diario',       label: `📓 Diário de Campo${os.notas?.length ? ` (${os.notas.length})` : ''}` },
    { id: 'anexos',       label: `📎 Anexos${(anexos as any[]).length ? ` (${(anexos as any[]).length})` : ''}` },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── HEADER ── */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #1E3050', background: '#111D2E', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <button onClick={() => navigate('/ordens-servico')} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #1E3050', background: '#1E305030', color: '#4A6080', cursor: 'pointer', fontSize: 12 }}>← Voltar</button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ color: cor, fontFamily: 'monospace', fontSize: 16, fontWeight: 800 }}>{os.numero}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: cor + '18', color: cor, border: `1px solid ${cor}40` }}>{STATUS_LABEL[os.status] ?? os.status}</span>
              {progresso > 0 && <span style={{ fontSize: 11, color: '#4A6080' }}>{marcosFeitos}/{totalMarcos} etapas · {progresso}%</span>}
            </div>
            <div style={{ color: '#C8D8EC', fontSize: 14, fontWeight: 600 }}>
              {os.clienteNome ?? '—'}
              {os.titulo && <span style={{ color: '#4A6080', fontWeight: 400, marginLeft: 8 }}>· {os.titulo}</span>}
            </div>
          </div>

          {/* Pipeline de status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {['aberta', 'em_execucao', 'concluida'].map((s, i) => {
              const ativo = os.status === s
              const passado = ['aberta', 'em_execucao', 'concluida'].indexOf(os.status) > i
              const c = STATUS_COLOR[s]
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <div style={{ width: 20, height: 1, background: passado ? c : '#1E3050' }} />}
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: (ativo || passado) ? c : '#1E3050', boxShadow: ativo ? `0 0 8px ${c}` : 'none' }} />
                </div>
              )
            })}
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {(os.status === 'aberta' || os.status === 'em_execucao') && (
              <>
                <button onClick={() => { setAba('agendamentos'); setShowModalAg(true) }} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #58A6FF50', background: '#58A6FF18', color: '#58A6FF', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  📅 Agendar
                </button>
                {proximoStatus && (
                  <button onClick={handleAvancarStatus} disabled={mudandoStatus} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${cor}60`, background: cor + '18', color: cor, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    {mudandoStatus ? '⏳...' : proximoStatus === 'em_execucao' ? '▶ Iniciar' : '✔ Concluir'}
                  </button>
                )}
                <button onClick={handleCancelar} disabled={mudandoStatus} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #F8514960', background: '#F8514918', color: '#F85149', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  ✕ Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 4, borderBottom: 'none' }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id as any)} style={{ padding: '7px 16px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: aba === a.id ? 700 : 400, color: aba === a.id ? cor : '#4A6080', borderBottom: aba === a.id ? `2px solid ${cor}` : '2px solid transparent', transition: 'all 0.15s' }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {aba === 'geral'        && <AbaVisaoGeral os={os} osId={osId} onRefresh={refresh} onShowModalMarco={() => setShowModalMarco(true)} />}
        {aba === 'agendamentos' && <AbaAgendamentos os={os} osId={osId} onRefresh={refresh} onShowModal={() => setShowModalAg(true)} />}
        {aba === 'diario'       && <AbaDiarioCampo os={os} osId={osId} onRefresh={refresh} />}
        {aba === 'anexos'       && <AbaAnexos osId={osId} osStatus={os.status} />}
      </div>

      {/* Modais */}
      {showModalAg    && <ModalAgendamento osId={osId} onClose={() => setShowModalAg(false)}    onSuccess={refresh} />}
      {showModalMarco && <ModalMarco       osId={osId} onClose={() => setShowModalMarco(false)} onSuccess={refresh} />}
    </div>
  )
}
