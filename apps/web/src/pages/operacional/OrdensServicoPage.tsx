import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { trpc } from '../../lib/trpc'
import { formatDate } from '../../lib/utils'
import { Spinner } from '../../components/ui'
import { useIsMobile } from '../../hooks/useIsMobile'

const STATUS_OS = [
  { id: 'aberta',       label: 'Aberta',       color: '#58A6FF', icon: '📋' },
  { id: 'em_execucao',  label: 'Em Execução',  color: '#F5A623', icon: '🔧' },
  { id: 'concluida',    label: 'Concluída',    color: '#3EBB7A', icon: '✅' },
  { id: 'cancelada',    label: 'Cancelada',    color: '#F85149', icon: '✕' },
]

const CORES_ETIQUETA = ['#58A6FF', '#F5A623', '#3EBB7A', '#F85149', '#A371F7', '#39C5CF', '#FF7B72']

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

// ─── Modal Contratos Históricos ──────────────────────────────────────────────

const LINHA_VAZIA = () => ({
  clienteNome: '', valorContrato: '', descricao: '', dataInicio: '',
  dataConclusao: '', status: 'concluida' as const, tecnicoResponsavel: '',
  numeroContratoExterno: '', observacoes: '',
})

function ModalHistorico({ onClose, onSucesso }: { onClose: () => void; onSucesso: () => void }) {
  const isMobile = useIsMobile()
  const [aba, setAba] = useState<'individual' | 'lote'>('individual')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [erro, setErro] = useState('')

  // ── Individual ──
  const [form, setForm] = useState({
    clienteNome: '', valorContrato: '', descricao: '', dataInicio: '',
    dataConclusao: '', status: 'em_execucao' as 'aberta' | 'em_execucao' | 'concluida',
    tecnicoResponsavel: '', numeroContratoExterno: '', observacoes: '',
  })

  // ── Lote ──
  const [linhas, setLinhas] = useState([LINHA_VAZIA(), LINHA_VAZIA(), LINHA_VAZIA()])
  const fileRef = useRef<HTMLInputElement>(null)

  const utils = (trpc as any).useUtils()
  const criarHistorico      = (trpc as any).os.criarHistorico.useMutation()
  const importarLote        = (trpc as any).os.importarLoteHistorico.useMutation()

  const fmtValor = (v: string) => v.replace(/[^\d,\.]/g, '').replace(',', '.')
  const parseValor = (v: string) => parseFloat(fmtValor(v)) || 0

  const inputStyle = {
    padding: '7px 10px', borderRadius: 7, border: '1px solid #1E3050',
    background: '#0C1828', color: '#C8D8EC', fontSize: 12, fontFamily: 'inherit',
    outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: 11, color: '#4A6080', fontWeight: 700, display: 'block' as const, marginBottom: 3 }

  const setLinha = (i: number, field: string, val: string) =>
    setLinhas(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))

  const adicionarLinhas = (n = 5) =>
    setLinhas(prev => [...prev, ...Array.from({ length: n }, LINHA_VAZIA)])

  const removerLinha = (i: number) =>
    setLinhas(prev => prev.filter((_, idx) => idx !== i))

  const enviarIndividual = async () => {
    setErro(''); setResultado(null)
    if (!form.clienteNome.trim()) { setErro('Informe o nome do cliente'); return }
    if (!form.dataInicio)         { setErro('Informe a data de início'); return }
    if (!parseValor(form.valorContrato)) { setErro('Informe o valor do contrato'); return }
    setEnviando(true)
    try {
      const res = await criarHistorico.mutateAsync({
        clienteNome:           form.clienteNome.trim(),
        valorContrato:         parseValor(form.valorContrato),
        descricao:             form.descricao || undefined,
        dataInicio:            form.dataInicio,
        dataConclusao:         form.dataConclusao || undefined,
        status:                form.status,
        tecnicoResponsavel:    form.tecnicoResponsavel || undefined,
        numeroContratoExterno: form.numeroContratoExterno || undefined,
        observacoes:           form.observacoes || undefined,
      })
      setResultado({ tipo: 'individual', numero: res.numero })
      utils.os.list.invalidate()
    } catch (e: any) { setErro(e.message) }
    finally { setEnviando(false) }
  }

  const enviarLote = async () => {
    setErro(''); setResultado(null)
    const validas = linhas.filter(l => l.clienteNome.trim() && l.dataInicio && parseValor(l.valorContrato) > 0)
    if (!validas.length) { setErro('Preencha ao menos uma linha completa (cliente, data e valor)'); return }
    setEnviando(true)
    try {
      const res = await importarLote.mutateAsync({
        contratos: validas.map(l => ({
          clienteNome:           l.clienteNome.trim(),
          valorContrato:         parseValor(l.valorContrato),
          descricao:             l.descricao || undefined,
          dataInicio:            l.dataInicio,
          dataConclusao:         l.dataConclusao || undefined,
          status:                l.status,
          tecnicoResponsavel:    l.tecnicoResponsavel || undefined,
          numeroContratoExterno: l.numeroContratoExterno || undefined,
          observacoes:           l.observacoes || undefined,
        })),
      })
      setResultado({ tipo: 'lote', ...res })
      utils.os.list.invalidate()
    } catch (e: any) { setErro(e.message) }
    finally { setEnviando(false) }
  }

  const S = { // estilos reutilizados
    overlay: { position: 'fixed' as const, inset: 0, background: '#000000CC', zIndex: 3000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 },
    box:     { background: '#0F1A29', border: '1px solid #1E3050', borderRadius: isMobile ? '16px 16px 0 0' : 14, width: '100%', maxWidth: isMobile ? '100%' : 860, maxHeight: isMobile ? '92vh' : '90vh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
    header:  { padding: isMobile ? '16px 18px' : '18px 24px', borderBottom: '1px solid #1E3050', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    body:    { padding: isMobile ? '16px 14px' : '20px 24px', overflowY: 'auto' as const, flex: 1 },
    footer:  { padding: isMobile ? '12px 14px' : '14px 24px', borderTop: '1px solid #1E3050', display: 'flex', justifyContent: 'flex-end', gap: 8 },
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.box}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <h2 style={{ color: '#C8D8EC', fontSize: 15, fontWeight: 800, margin: 0 }}>📦 Registrar Contratos Históricos</h2>
            <p style={{ color: '#4A6080', fontSize: 11, margin: '2px 0 0' }}>Contratos firmados antes da plataforma — serão geradas OS automaticamente</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4A6080', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1E3050', padding: '0 24px' }}>
          {([['individual', '📝 Cadastro Individual'], ['lote', '📋 Importação em Lote']] as const).map(([id, label]) => (
            <button key={id} onClick={() => { setAba(id); setErro(''); setResultado(null) }}
              style={{ padding: '10px 16px', border: 'none', borderBottom: `2px solid ${aba === id ? '#F5A623' : 'transparent'}`, background: 'none', color: aba === id ? '#F5A623' : '#4A6080', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={S.body}>
          {/* ── Resultado ── */}
          {resultado && (
            <div style={{ background: '#3EBB7A18', border: '1px solid #3EBB7A40', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              {resultado.tipo === 'individual' ? (
                <div style={{ color: '#3EBB7A', fontSize: 13, fontWeight: 700 }}>
                  ✅ OS <span style={{ fontFamily: 'monospace' }}>{resultado.numero}</span> criada com sucesso!
                  <button onClick={onSucesso} style={{ marginLeft: 12, padding: '4px 12px', borderRadius: 6, background: '#3EBB7A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Ver na lista</button>
                </div>
              ) : (
                <div>
                  <div style={{ color: '#3EBB7A', fontSize: 13, fontWeight: 700 }}>✅ {resultado.importados} contrato(s) importado(s) com sucesso!</div>
                  {resultado.erros > 0 && <div style={{ color: '#F5A623', fontSize: 12, marginTop: 4 }}>⚠️ {resultado.erros} linha(s) com erro</div>}
                  {resultado.resultados?.filter((r: any) => !r.ok).map((r: any) => (
                    <div key={r.linha} style={{ color: '#F85149', fontSize: 11, marginTop: 2 }}>Linha {r.linha}: {r.erro}</div>
                  ))}
                  <button onClick={onSucesso} style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6, background: '#3EBB7A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Ver na lista</button>
                </div>
              )}
            </div>
          )}

          {erro && (
            <div style={{ background: '#F8514912', border: '1px solid #F8514940', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#F85149', fontSize: 12 }}>{erro}</div>
          )}

          {/* ── ABA: Individual ── */}
          {aba === 'individual' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Cliente *</label>
                <input style={inputStyle} placeholder="Nome do cliente" value={form.clienteNome} onChange={e => setForm(f => ({ ...f, clienteNome: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Valor do Contrato (R$) *</label>
                <input style={inputStyle} placeholder="Ex: 25000" value={form.valorContrato} onChange={e => setForm(f => ({ ...f, valorContrato: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Nº Contrato Externo</label>
                <input style={inputStyle} placeholder="Ex: CT-2024-001" value={form.numeroContratoExterno} onChange={e => setForm(f => ({ ...f, numeroContratoExterno: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Data de Início *</label>
                <input type="date" style={inputStyle} value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Data de Conclusão</label>
                <input type="date" style={inputStyle} value={form.dataConclusao} onChange={e => setForm(f => ({ ...f, dataConclusao: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Status Atual *</label>
                <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                  <option value="em_execucao">🔧 Em Execução</option>
                  <option value="concluida">✅ Concluído</option>
                  <option value="aberta">📋 Aberto (aguardando início)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Técnico Responsável</label>
                <input style={inputStyle} placeholder="Nome do técnico" value={form.tecnicoResponsavel} onChange={e => setForm(f => ({ ...f, tecnicoResponsavel: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Descrição do Serviço</label>
                <textarea style={{ ...inputStyle, height: 70, resize: 'vertical' }} placeholder="Ex: Instalação de sistema fotovoltaico 8,25 kWp" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Observações</label>
                <textarea style={{ ...inputStyle, height: 55, resize: 'vertical' }} placeholder="Informações adicionais, pendências, garantias..." value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
          )}

          {/* ── ABA: Lote ── */}
          {aba === 'lote' && (
            <div>
              <div style={{ background: '#58A6FF10', border: '1px solid #58A6FF30', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 11, color: '#58A6FF' }}>
                💡 Preencha uma linha por contrato. Campos obrigatórios: <strong>Cliente</strong>, <strong>Data Início</strong> e <strong>Valor</strong>. Linhas em branco são ignoradas.
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E3050' }}>
                      {['#', 'Cliente *', 'Nº Contrato', 'Valor R$ *', 'Data Início *', 'Data Conclusão', 'Status', 'Técnico', ''].map(h => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#4A6080', fontWeight: 700, whiteSpace: 'nowrap', fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1E305030' }}>
                        <td style={{ padding: '4px 8px', color: '#4A6080', fontSize: 10 }}>{i + 1}</td>
                        <td style={{ padding: '3px 4px' }}><input style={{ ...inputStyle, minWidth: 150 }} placeholder="Nome" value={l.clienteNome} onChange={e => setLinha(i, 'clienteNome', e.target.value)} /></td>
                        <td style={{ padding: '3px 4px' }}><input style={{ ...inputStyle, minWidth: 100 }} placeholder="CT-0001" value={l.numeroContratoExterno} onChange={e => setLinha(i, 'numeroContratoExterno', e.target.value)} /></td>
                        <td style={{ padding: '3px 4px' }}><input style={{ ...inputStyle, minWidth: 90 }} placeholder="25000" value={l.valorContrato} onChange={e => setLinha(i, 'valorContrato', e.target.value)} /></td>
                        <td style={{ padding: '3px 4px' }}><input type="date" style={{ ...inputStyle, minWidth: 130 }} value={l.dataInicio} onChange={e => setLinha(i, 'dataInicio', e.target.value)} /></td>
                        <td style={{ padding: '3px 4px' }}><input type="date" style={{ ...inputStyle, minWidth: 130 }} value={l.dataConclusao} onChange={e => setLinha(i, 'dataConclusao', e.target.value)} /></td>
                        <td style={{ padding: '3px 4px' }}>
                          <select style={{ ...inputStyle, minWidth: 110 }} value={l.status} onChange={e => setLinha(i, 'status', e.target.value)}>
                            <option value="em_execucao">Em Execução</option>
                            <option value="concluida">Concluído</option>
                            <option value="aberta">Aberto</option>
                          </select>
                        </td>
                        <td style={{ padding: '3px 4px' }}><input style={{ ...inputStyle, minWidth: 110 }} placeholder="Técnico" value={l.tecnicoResponsavel} onChange={e => setLinha(i, 'tecnicoResponsavel', e.target.value)} /></td>
                        <td style={{ padding: '3px 4px' }}>
                          <button onClick={() => removerLinha(i)} style={{ background: 'none', border: 'none', color: '#F85149', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => adicionarLinhas(5)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #1E3050', background: 'transparent', color: '#8A9BB5', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                  + 5 linhas
                </button>
                <button onClick={() => adicionarLinhas(10)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #1E3050', background: 'transparent', color: '#8A9BB5', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                  + 10 linhas
                </button>
                <span style={{ fontSize: 11, color: '#4A6080', alignSelf: 'center', marginLeft: 4 }}>
                  {linhas.filter(l => l.clienteNome.trim() && l.dataInicio && parseValor(l.valorContrato) > 0).length} linha(s) válida(s)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #1E3050', background: 'transparent', color: '#8A9BB5', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
            Fechar
          </button>
          <button
            onClick={aba === 'individual' ? enviarIndividual : enviarLote}
            disabled={enviando}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: enviando ? '#F5A62360' : '#F5A623', color: '#0C1421', cursor: enviando ? 'default' : 'pointer', fontSize: 12, fontWeight: 800, fontFamily: 'inherit' }}
          >
            {enviando ? '⏳ Processando...' : aba === 'individual' ? '✅ Registrar Contrato' : '📦 Importar Lote'}
          </button>
        </div>
        <input ref={fileRef} type="file" style={{ display: 'none' }} />
      </div>
    </div>
  )
}

// ─── Modal de Etiquetas ──────────────────────────────────────────────────────

function ModalEtiquetasOS({ os, onClose }: { os: any; onClose: () => void }) {
  const isMobile = useIsMobile()
  const [aba, setAba] = useState<'aplicar' | 'gerenciar'>('aplicar')
  const [novoNome, setNovoNome] = useState('')
  const [novaCor, setNovaCor] = useState(CORES_ETIQUETA[0])
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editCor, setEditCor] = useState('')

  const utils = (trpc as any).useUtils()
  const { data: etiquetas = [] } = (trpc as any).os.etiqueta.list.useQuery()
  const criar       = (trpc as any).os.etiqueta.criar.useMutation({ onSuccess: () => utils.os.etiqueta.list.invalidate() })
  const atualizar   = (trpc as any).os.etiqueta.atualizar.useMutation({ onSuccess: () => utils.os.etiqueta.list.invalidate() })
  const excluir     = (trpc as any).os.etiqueta.excluir.useMutation({ onSuccess: () => { utils.os.etiqueta.list.invalidate(); utils.os.list.invalidate() } })
  const vincular    = (trpc as any).os.etiqueta.vincular.useMutation({ onSuccess: () => utils.os.list.invalidate() })
  const desvincular = (trpc as any).os.etiqueta.desvincular.useMutation({ onSuccess: () => utils.os.list.invalidate() })

  const idsAtuais: number[] = (os.etiquetas ?? []).map((e: any) => e.id)

  const toggleEtiqueta = (etId: number) => {
    if (idsAtuais.includes(etId)) desvincular.mutate({ ordemServicoId: os.id, etiquetaId: etId })
    else vincular.mutate({ ordemServicoId: os.id, etiquetaId: etId })
  }

  const criarEtiqueta = () => {
    if (!novoNome.trim()) return
    criar.mutate({ nome: novoNome.trim(), cor: novaCor })
    setNovoNome('')
  }

  const salvarEdicao = () => {
    if (editandoId == null) return
    atualizar.mutate({ id: editandoId, nome: editNome.trim(), cor: editCor })
    setEditandoId(null)
  }

  const inputStyle = {
    padding: '7px 10px', borderRadius: 7, border: '1px solid #1E3050',
    background: '#0C1828', color: '#C8D8EC', fontSize: 12, fontFamily: 'inherit',
    outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }

  const ColorPicker = ({ value, onChange }: { value: string; onChange: (c: string) => void }) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {CORES_ETIQUETA.map(c => (
        <button key={c} onClick={() => onChange(c)} type="button"
          style={{ width: 22, height: 22, borderRadius: 6, background: c, border: value === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', boxShadow: value === c ? '0 0 0 1px #1E3050' : 'none' }} />
      ))}
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #1E3050', padding: 0, cursor: 'pointer', background: 'transparent' }} />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000CC', zIndex: 3000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#0F1A29', border: '1px solid #1E3050', borderRadius: isMobile ? '16px 16px 0 0' : 14, width: '100%', maxWidth: isMobile ? '100%' : 420, maxHeight: isMobile ? '85vh' : '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid #1E3050', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#C8D8EC', fontSize: 14, fontWeight: 800, margin: 0 }}>🏷️ Etiquetas — {os.numero}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4A6080', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #1E3050', padding: '0 20px' }}>
          {([['aplicar', 'Aplicar'], ['gerenciar', 'Gerenciar']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)}
              style={{ padding: '9px 14px', border: 'none', borderBottom: `2px solid ${aba === id ? '#F5A623' : 'transparent'}`, background: 'none', color: aba === id ? '#F5A623' : '#4A6080', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', overflowY: 'auto', flex: 1 }}>
          {aba === 'aplicar' && (
            <div>
              {etiquetas.length === 0 && (
                <div style={{ color: '#4A6080', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Nenhuma etiqueta criada. Vá em "Gerenciar" para criar uma.</div>
              )}
              {etiquetas.map((et: any) => {
                const ativa = idsAtuais.includes(et.id)
                return (
                  <label key={et.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={ativa} onChange={() => toggleEtiqueta(et.id)} />
                    <span style={{ flex: 1, padding: '5px 10px', borderRadius: 6, background: et.cor + '30', color: et.cor, fontSize: 12, fontWeight: 700, border: `1px solid ${et.cor}60` }}>{et.nome}</span>
                  </label>
                )
              })}
            </div>
          )}

          {aba === 'gerenciar' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#4A6080', fontWeight: 700, marginBottom: 6 }}>Nova etiqueta</div>
                <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Nome da etiqueta" value={novoNome} onChange={e => setNovoNome(e.target.value)} />
                <div style={{ marginBottom: 8 }}><ColorPicker value={novaCor} onChange={setNovaCor} /></div>
                <button onClick={criarEtiqueta} disabled={!novoNome.trim()}
                  style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: novoNome.trim() ? '#F5A623' : '#F5A62360', color: '#0C1421', cursor: novoNome.trim() ? 'pointer' : 'default', fontSize: 11, fontWeight: 800, fontFamily: 'inherit' }}>
                  + Criar etiqueta
                </button>
              </div>

              <div style={{ borderTop: '1px solid #1E3050', paddingTop: 12 }}>
                {etiquetas.map((et: any) => (
                  <div key={et.id} style={{ marginBottom: 10 }}>
                    {editandoId === et.id ? (
                      <div style={{ background: '#0C1828', border: '1px solid #1E3050', borderRadius: 8, padding: 10 }}>
                        <input style={{ ...inputStyle, marginBottom: 8 }} value={editNome} onChange={e => setEditNome(e.target.value)} />
                        <div style={{ marginBottom: 8 }}><ColorPicker value={editCor} onChange={setEditCor} /></div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={salvarEdicao} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#3EBB7A', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>Salvar</button>
                          <button onClick={() => setEditandoId(null)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #1E3050', background: 'transparent', color: '#8A9BB5', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: 1, padding: '5px 10px', borderRadius: 6, background: et.cor + '30', color: et.cor, fontSize: 12, fontWeight: 700, border: `1px solid ${et.cor}60` }}>{et.nome}</span>
                        <button onClick={() => { setEditandoId(et.id); setEditNome(et.nome); setEditCor(et.cor) }} style={{ background: 'none', border: 'none', color: '#4A6080', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                        <button onClick={() => excluir.mutate({ id: et.id })} style={{ background: 'none', border: 'none', color: '#F85149', cursor: 'pointer', fontSize: 13 }}>🗑️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EtiquetaChips({ etiquetas }: { etiquetas: { id: number; nome: string; cor: string }[] }) {
  if (!etiquetas?.length) return null
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
      {etiquetas.map(et => (
        <span key={et.id} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: et.cor + '30', color: et.cor, border: `1px solid ${et.cor}60` }}>{et.nome}</span>
      ))}
    </div>
  )
}

function OSCard({ os, onClick, onAbrirEtiquetas, dragHandleProps, isDragging }: {
  os: any
  onClick: () => void
  onAbrirEtiquetas?: () => void
  dragHandleProps?: any
  isDragging?: boolean
}) {
  const status = STATUS_OS.find(s => s.id === os.status) ?? STATUS_OS[0]
  const isHistorico = os.origem === 'historico'
  return (
    <div
      {...dragHandleProps}
      onClick={onClick}
      style={{
        background: '#111D2E', border: '1px solid #1E3050', borderRadius: 10,
        padding: '12px 14px', cursor: dragHandleProps ? 'grab' : 'pointer', marginBottom: 8,
        borderLeft: `3px solid ${status.color}`,
        transition: 'all 0.15s',
        opacity: isDragging ? 0.4 : 1,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = status.color; (e.currentTarget as HTMLDivElement).style.background = '#131F30' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1E3050'; (e.currentTarget as HTMLDivElement).style.borderLeftColor = status.color; (e.currentTarget as HTMLDivElement).style.background = '#111D2E' }}
    >
      <EtiquetaChips etiquetas={os.etiquetas ?? []} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: status.color, fontWeight: 700 }}>{os.numero}</span>
          {isHistorico && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: '#8A9BB520', color: '#8A9BB5', border: '1px solid #8A9BB540' }}>HIST</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {os.totalAgendamentos > 0 && (
            <span style={{ fontSize: 10, color: '#58A6FF' }}>📅 {os.totalAgendamentos}</span>
          )}
          {onAbrirEtiquetas && (
            <button onClick={e => { e.stopPropagation(); onAbrirEtiquetas() }}
              style={{ background: 'none', border: 'none', color: '#4A6080', cursor: 'pointer', fontSize: 12, padding: 0 }}
              title="Gerenciar etiquetas">🏷️</button>
          )}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#C8D8EC', marginBottom: 4, lineHeight: 1.3 }}>
        {os.clienteNome ?? '—'}
      </div>
      {os.titulo && (
        <div style={{ fontSize: 11, color: '#4A6080', marginBottom: 6 }}>{os.titulo}</div>
      )}
      {os.resumoServico && (
        <div style={{
          fontSize: 11, color: '#8A9BB5', marginBottom: 6, lineHeight: 1.4,
          background: '#F5A62310', border: '1px solid #F5A62325', borderRadius: 6,
          padding: '5px 8px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }} title={os.resumoServico}>
          🛠 {os.resumoServico}
        </div>
      )}
      {os.localizacao && (
        <a
          href={/^https?:\/\//i.test(os.localizacao) ? os.localizacao : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(os.localizacao)}`}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ display: 'inline-block', fontSize: 10, color: '#3EBB7A', textDecoration: 'none', marginBottom: 6 }}
          title={os.localizacao}
        >
          📍 Abrir rota no Maps
        </a>
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

function DraggableOSCard({ os, onClick, onAbrirEtiquetas }: { os: any; onClick: () => void; onAbrirEtiquetas: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: String(os.id), data: { os } })
  return (
    <div ref={setNodeRef}>
      <OSCard os={os} onClick={onClick} onAbrirEtiquetas={onAbrirEtiquetas} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  )
}

function DroppableColuna({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} style={{ minHeight: 60, background: isOver ? '#F5A62310' : 'transparent', borderRadius: 10, transition: 'background 0.15s' }}>
      {children}
    </div>
  )
}

export function OrdensServicoPage() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const [busca, setBusca] = useState('')
  const [view, setView]   = useState<'kanban' | 'lista'>(isMobile ? 'lista' : 'kanban')
  const [kanbanCol, setKanbanCol] = useState(0) // coluna ativa no kanban mobile
  const [showModalHistorico, setShowModalHistorico] = useState(false)
  const [osEtiquetas, setOsEtiquetas] = useState<any | null>(null) // OS aberta no modal de etiquetas
  const [draggingOs, setDraggingOs] = useState<any | null>(null)

  const utils = (trpc as any).useUtils()
  const { data, isLoading } = (trpc as any).os.list.useQuery(
    { porPagina: 200 },
    { staleTime: 0 },
  )
  const updateStatus = (trpc as any).os.updateStatus.useMutation({ onSuccess: () => utils.os.list.invalidate() })
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const lista: any[] = data?.data ?? []

  const handleDragStart = (e: DragStartEvent) => setDraggingOs(e.active.data.current?.os ?? null)
  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingOs(null)
    const novoStatus = e.over?.id as string | undefined
    const os = e.active.data.current?.os
    if (!novoStatus || !os || os.status === novoStatus) return
    updateStatus.mutate({ id: os.id, status: novoStatus })
  }

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
    <div style={{ padding: isMobile ? '16px 14px' : '24px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 16 }}>
        {/* Linha 1: título + ações principais */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 10 : 0 }}>
          <div>
            <h1 style={{ color: '#E2EAF5', fontSize: isMobile ? 17 : 20, fontWeight: 800, margin: 0 }}>Operacional</h1>
            <p style={{ color: '#4A6080', fontSize: 11, margin: '2px 0 0' }}>
              {total} ordem{total !== 1 ? 's' : ''} de serviço
            </p>
          </div>
          {/* Botões lado direito — desktop */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setShowModalHistorico(true)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #8A9BB540', background: '#8A9BB510', color: '#8A9BB5', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>📦 Contratos Históricos</button>
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar OS, cliente..."
                style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #1E3050', background: '#0C1828', color: '#C8D8EC', fontSize: 13, outline: 'none', width: 220, fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', border: '1px solid #1E3050', borderRadius: 8, overflow: 'hidden' }}>
                {[{ id: 'kanban', label: '⊞ Kanban' }, { id: 'lista', label: '☰ Lista' }].map(v => (
                  <button key={v.id} onClick={() => setView(v.id as any)}
                    style={{ padding: '6px 12px', border: 'none', cursor: 'pointer', background: view === v.id ? '#F5A623' : 'transparent', color: view === v.id ? '#0C1421' : '#4A6080', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}
                  >{v.label}</button>
                ))}
              </div>
            </div>
          )}
          {/* Mobile: só o botão histórico como ícone */}
          {isMobile && (
            <button onClick={() => setShowModalHistorico(true)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #8A9BB540', background: '#8A9BB510', color: '#8A9BB5', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>📦</button>
          )}
        </div>

        {/* Linha 2 mobile: busca + toggle */}
        {isMobile && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar OS ou cliente..."
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #1E3050', background: '#0C1828', color: '#C8D8EC', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', border: '1px solid #1E3050', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              {[{ id: 'kanban', label: '⊞' }, { id: 'lista', label: '☰' }].map(v => (
                <button key={v.id} onClick={() => setView(v.id as any)}
                  style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', background: view === v.id ? '#F5A623' : 'transparent', color: view === v.id ? '#0C1421' : '#4A6080', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}
                >{v.label}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Resumo KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 10, marginBottom: isMobile ? 14 : 20 }}>
        {resumo.map(s => (
          <div key={s.id} style={{ background: '#111D2E', border: `1px solid ${s.color}30`, borderRadius: 10, padding: isMobile ? '8px 12px' : '10px 14px', borderTop: `2px solid ${s.color}` }}>
            <div style={{ fontSize: isMobile ? 10 : 11, color: '#4A6080', fontWeight: 700, marginBottom: 2 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, color: s.color }}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* ── KANBAN ── */}
      {view === 'kanban' && !isMobile && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, flex: 1, overflowY: 'auto', alignItems: 'flex-start' }}>
            {colunas.map(col => (
              <div key={col.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: col.color + '12', border: `1px solid ${col.color}30` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>{col.icon} {col.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: col.color, background: col.color + '20', borderRadius: 12, padding: '1px 8px' }}>{col.itens.length}</span>
                </div>
                <DroppableColuna id={col.id}>
                  {col.itens.length === 0 ? (
                    <div style={{ border: `1px dashed ${col.color}30`, borderRadius: 10, padding: '20px', textAlign: 'center', color: '#2A3F55', fontSize: 12 }}>Nenhuma OS</div>
                  ) : (
                    col.itens.map((os: any) => (
                      <DraggableOSCard key={os.id} os={os} onClick={() => navigate(`/ordens-servico/${os.id}`)} onAbrirEtiquetas={() => setOsEtiquetas(os)} />
                    ))
                  )}
                </DroppableColuna>
              </div>
            ))}
          </div>
          <DragOverlay>
            {draggingOs ? <div style={{ width: 260 }}><OSCard os={draggingOs} onClick={() => {}} /></div> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── KANBAN MOBILE — abas por coluna ── */}
      {view === 'kanban' && isMobile && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Seletor de colunas */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {colunas.map((col, i) => (
              <button key={col.id} onClick={() => setKanbanCol(i)}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${col.color}${kanbanCol === i ? 'AA' : '30'}`, background: kanbanCol === i ? col.color + '20' : 'transparent', color: kanbanCol === i ? col.color : '#4A6080', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {col.icon} {col.label} <span style={{ background: col.color + '30', borderRadius: 10, padding: '0 6px', marginLeft: 3 }}>{col.itens.length}</span>
              </button>
            ))}
          </div>
          {/* Cards da coluna ativa */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {colunas[kanbanCol]?.itens.length === 0 ? (
              <div style={{ border: `1px dashed ${colunas[kanbanCol].color}30`, borderRadius: 10, padding: '32px', textAlign: 'center', color: '#2A3F55', fontSize: 13 }}>Nenhuma OS nesta etapa</div>
            ) : (
              colunas[kanbanCol]?.itens.map((os: any) => <OSCard key={os.id} os={os} onClick={() => navigate(`/ordens-servico/${os.id}`)} onAbrirEtiquetas={() => setOsEtiquetas(os)} />)
            )}
          </div>
        </div>
      )}

      {/* ── LISTA desktop ── */}
      {view === 'lista' && !isMobile && (
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
                  <tr key={os.id} onClick={() => navigate(`/ordens-servico/${os.id}`)}
                    style={{ borderBottom: '1px solid #1E305050', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#131F30'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: status.color, fontWeight: 700 }}>{os.numero}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#C8D8EC' }}>{os.clienteNome ?? '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#4A6080' }}>{os.titulo ?? '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#4A6080' }}>{os.tecnicoResponsavel ?? '—'}</td>
                    <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: status.color + '18', color: status.color }}>{status.icon} {status.label}</span></td>
                    <td style={{ padding: '10px 12px', width: 120 }}><ProgressBar feitos={os.marcosFeitos ?? 0} total={os.totalMarcos ?? 0} /></td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#4A6080' }}>{os.dataPrevistaFim ? formatDate(String(os.dataPrevistaFim).slice(0, 10)) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LISTA mobile — cards empilhados ── */}
      {view === 'lista' && isMobile && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtradas.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4A6080', padding: 40, fontSize: 13 }}>Nenhuma OS encontrada</div>
          ) : (
            filtradas.map((os: any) => <OSCard key={os.id} os={os} onClick={() => navigate(`/ordens-servico/${os.id}`)} onAbrirEtiquetas={() => setOsEtiquetas(os)} />)
          )}
        </div>
      )}

      {/* ── Modal Histórico ── */}
      {showModalHistorico && (
        <ModalHistorico
          onClose={() => setShowModalHistorico(false)}
          onSucesso={() => setShowModalHistorico(false)}
        />
      )}

      {/* ── Modal Etiquetas ── */}
      {osEtiquetas && (
        <ModalEtiquetasOS
          os={lista.find((o: any) => o.id === osEtiquetas.id) ?? osEtiquetas}
          onClose={() => setOsEtiquetas(null)}
        />
      )}
    </div>
  )
}
