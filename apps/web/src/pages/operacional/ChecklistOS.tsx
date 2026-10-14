// ═══════════════════════════════════════════════════════════════════
// Checklist de execução da OS
// ═══════════════════════════════════════════════════════════════════
// Cada item é ticado como "feito" (com valor medido, quando o item pede) ou
// "não se aplica" (sempre com justificativa), registrando quem e quando — é a
// prova de execução que vai no termo de encerramento. Itens obrigatórios em
// aberto bloqueiam a conclusão da OS (regra também no servidor).
//
// Os modelos (um por tipo de serviço) são editados em Configurações ›
// Checklists de OS; aplicar um modelo COPIA os itens para a OS.

import { useRef, useState } from 'react'
import { trpc, API_BASE } from '../../lib/trpc'
import { Spinner } from '../../components/ui'

export type ItemChecklist = {
  id: number
  modeloId: number | null
  grupo: string
  descricao: string
  obrigatorio: boolean
  unidadeMedida: string | null
  status: 'pendente' | 'feito' | 'nao_aplica'
  valorMedido: string | null
  justificativa: string | null
  anexoId: number | null
  anexoNome: string | null
  concluidoPorNome: string | null
  concluidoEm: string | null
}

const token = () => localStorage.getItem('atomtech_token') || ''

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0C1828', border: '1px solid #1E3050',
  borderRadius: 7, padding: '7px 10px', color: '#C8D8EC',
  fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const btn = (cor: string, cheio = false): React.CSSProperties => ({
  padding: '5px 10px', borderRadius: 6, border: `1px solid ${cor}60`,
  background: cheio ? cor : cor + '18', color: cheio ? '#0C1421' : cor,
  cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
})

export function fmtDataHora(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Agrupa mantendo a ordem em que os grupos aparecem. */
export function agruparChecklist(itens: ItemChecklist[]): { grupo: string; modeloId: number | null; itens: ItemChecklist[] }[] {
  const grupos: { grupo: string; modeloId: number | null; itens: ItemChecklist[] }[] = []
  for (const it of itens) {
    let g = grupos.find(x => x.grupo === it.grupo && x.modeloId === it.modeloId)
    if (!g) { g = { grupo: it.grupo, modeloId: it.modeloId, itens: [] }; grupos.push(g) }
    g.itens.push(it)
  }
  return grupos
}

/** Obrigatórios ainda em aberto — o que impede concluir. */
export function obrigatoriosPendentes(itens: ItemChecklist[]): ItemChecklist[] {
  return itens.filter(i => i.obrigatorio && i.status === 'pendente')
}

// ─── Linha de item ───────────────────────────────────────────────────
function LinhaItem({ item, osId, travado, onRefresh }: { item: ItemChecklist; osId: number; travado: boolean; onRefresh: () => void }) {
  const [modo, setModo] = useState<null | 'feito' | 'nao_aplica'>(null)
  const [valor, setValor] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)

  const onErr = (e: any) => alert(e.message)
  const marcarMut     = (trpc as any).os.checklist.marcar.useMutation({ onSuccess: () => { setModo(null); onRefresh() }, onError: onErr })
  const desmarcarMut  = (trpc as any).os.checklist.desmarcar.useMutation({ onSuccess: onRefresh, onError: onErr })
  const fotoMut       = (trpc as any).os.checklist.definirFoto.useMutation({ onSuccess: onRefresh, onError: onErr })
  const removerMut    = (trpc as any).os.checklist.removerItem.useMutation({ onSuccess: onRefresh, onError: onErr })

  const pendente = item.status === 'pendente'
  const cor = item.status === 'feito' ? '#3EBB7A' : item.status === 'nao_aplica' ? '#7488A8' : (item.obrigatorio ? '#F5A623' : '#2A3F55')

  // Sem medição, "feito" é um clique só. Com medição, abre o campo do valor.
  const clicarFeito = () => {
    if (item.unidadeMedida) { setValor(''); setModo('feito'); return }
    marcarMut.mutate({ id: item.id, status: 'feito' })
  }

  const enviarFoto = async (file: File) => {
    setEnviandoFoto(true)
    try {
      const form = new FormData()
      form.append('arquivo', file)
      const resp = await fetch(`${API_BASE}/os/${osId}/anexo`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: form,
      })
      const data = await resp.json()
      if (!data.ok) throw new Error(data.error || 'Erro ao enviar foto')
      await fotoMut.mutateAsync({ id: item.id, anexoId: data.id })
    } catch (e: any) {
      alert(e.message || 'Erro ao enviar foto')
    } finally {
      setEnviandoFoto(false)
      if (fotoRef.current) fotoRef.current.value = ''
    }
  }

  const fotoUrl = item.anexoId ? `${API_BASE}/os-anexo/${item.anexoId}?token=${encodeURIComponent(token())}` : null
  const ocupado = marcarMut.isPending || desmarcarMut.isPending

  return (
    <div style={{ background: pendente ? '#0C1828' : cor + '0A', border: `1px solid ${pendente ? '#1E3050' : cor + '35'}`, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1, border: `2px solid ${cor}`, background: item.status === 'feito' ? cor : 'transparent', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
          {item.status === 'feito' ? '✓' : item.status === 'nao_aplica' ? <span style={{ color: cor, fontSize: 9 }}>N/A</span> : ''}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: item.status === 'nao_aplica' ? '#7488A8' : '#C8D8EC', fontWeight: pendente ? 600 : 400 }}>
            {item.descricao}
            {item.obrigatorio && <span title="Obrigatório para concluir a OS" style={{ marginLeft: 6, fontSize: 10, color: '#F5A623', fontWeight: 700 }}>OBRIGATÓRIO</span>}
            {item.unidadeMedida && <span style={{ marginLeft: 6, fontSize: 10, color: '#58A6FF', fontWeight: 700 }}>medir ({item.unidadeMedida})</span>}
          </div>

          {item.status === 'feito' && item.valorMedido && (
            <div style={{ fontSize: 12, color: '#3EBB7A', marginTop: 3, fontWeight: 600 }}>Medido: {item.valorMedido} {item.unidadeMedida}</div>
          )}
          {item.status === 'nao_aplica' && item.justificativa && (
            <div style={{ fontSize: 12, color: '#9FB0C9', marginTop: 3, fontStyle: 'italic' }}>Não se aplica: {item.justificativa}</div>
          )}
          {!pendente && item.concluidoPorNome && (
            <div style={{ fontSize: 10, color: '#7488A8', marginTop: 3 }}>👤 {item.concluidoPorNome} · {fmtDataHora(item.concluidoEm)}</div>
          )}
          {fotoUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <a href={fotoUrl} target="_blank" rel="noreferrer">
                <img src={fotoUrl} alt="Foto do item" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #1E3050', display: 'block' }} />
              </a>
              {!travado && (
                <button type="button" onClick={() => fotoMut.mutate({ id: item.id, anexoId: null })} style={{ ...btn('#7488A8'), padding: '3px 8px', fontSize: 10 }}>
                  desvincular foto
                </button>
              )}
            </div>
          )}

          {/* Editor inline: valor medido ou justificativa */}
          {modo && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {modo === 'feito' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input autoFocus value={valor} onChange={e => setValor(e.target.value)} placeholder={`Valor medido (${item.unidadeMedida}) — vários: separe por ;`} style={inputStyle}
                    onKeyDown={e => { if (e.key === 'Enter' && valor.trim()) marcarMut.mutate({ id: item.id, status: 'feito', valorMedido: valor.trim() }) }} />
                  <span style={{ color: '#7488A8', fontSize: 12 }}>{item.unidadeMedida}</span>
                </div>
              ) : (
                <textarea autoFocus value={justificativa} onChange={e => setJustificativa(e.target.value)} rows={2} placeholder="Por que este item não se aplica? (obrigatório)" style={{ ...inputStyle, resize: 'vertical' }} />
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" disabled={ocupado}
                  onClick={() => modo === 'feito'
                    ? (valor.trim() ? marcarMut.mutate({ id: item.id, status: 'feito', valorMedido: valor.trim() }) : alert(`Informe o valor medido (${item.unidadeMedida}).`))
                    : (justificativa.trim() ? marcarMut.mutate({ id: item.id, status: 'nao_aplica', justificativa: justificativa.trim() }) : alert('Justifique por que o item não se aplica.'))}
                  style={btn(modo === 'feito' ? '#3EBB7A' : '#9FB0C9', true)}>
                  {ocupado ? '⏳' : 'Confirmar'}
                </button>
                <button type="button" onClick={() => setModo(null)} style={btn('#7488A8')}>Cancelar</button>
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        {!travado && !modo && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 210 }}>
            {pendente ? (
              <>
                <button type="button" disabled={ocupado} onClick={clicarFeito} style={btn('#3EBB7A')}>✔ Feito</button>
                <button type="button" disabled={ocupado} onClick={() => { setJustificativa(''); setModo('nao_aplica') }} style={btn('#9FB0C9')}>N/A</button>
              </>
            ) : (
              <button type="button" disabled={ocupado} onClick={() => desmarcarMut.mutate({ id: item.id })} style={btn('#7488A8')}>↺ Desfazer</button>
            )}
            <button type="button" disabled={enviandoFoto} onClick={() => fotoRef.current?.click()} title={item.anexoId ? 'Trocar foto' : 'Anexar foto de comprovação'} style={btn('#58A6FF')}>
              {enviandoFoto ? '⏳' : '📷'}
            </button>
            {!(item.obrigatorio && item.modeloId) && (
              <button type="button" onClick={() => { if (window.confirm('Remover este item do checklist?')) removerMut.mutate({ id: item.id }) }} title="Remover item" style={btn('#F85149')}>✕</button>
            )}
            <input ref={fotoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) enviarFoto(f) }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Aba ─────────────────────────────────────────────────────────────
export function AbaChecklist({ osId, osStatus }: { osId: number; osStatus: string }) {
  const travado = osStatus === 'concluida' || osStatus === 'cancelada'
  const [modeloSel, setModeloSel] = useState('')
  const [novoItem, setNovoItem] = useState({ aberto: false, descricao: '', obrigatorio: false, unidadeMedida: '' })

  const utils = (trpc as any).useUtils()
  const refresh = () => {
    utils.os.checklist.list.invalidate({ ordemServicoId: osId })
    utils.os.anexo.list.invalidate({ ordemServicoId: osId })
  }

  const { data: itens = [], isLoading } = (trpc as any).os.checklist.list.useQuery({ ordemServicoId: osId }, { staleTime: 10_000 })
  const { data: modelos = [] } = (trpc as any).os.checklist.modelo.list.useQuery(undefined, { staleTime: 60_000 })

  const onErr = (e: any) => alert(e.message)
  const aplicarMut = (trpc as any).os.checklist.aplicarModelo.useMutation({ onSuccess: () => { setModeloSel(''); refresh() }, onError: onErr })
  const removerModeloMut = (trpc as any).os.checklist.removerModelo.useMutation({ onSuccess: refresh, onError: onErr })
  const adicionarMut = (trpc as any).os.checklist.adicionarItem.useMutation({
    onSuccess: () => { setNovoItem({ aberto: false, descricao: '', obrigatorio: false, unidadeMedida: '' }); refresh() },
    onError: onErr,
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>

  const lista = itens as ItemChecklist[]
  const grupos = agruparChecklist(lista)
  const aplicados = new Set(lista.map(i => i.modeloId).filter(Boolean))
  const disponiveis = (modelos as any[]).filter(m => !aplicados.has(m.id))
  const feitos = lista.filter(i => i.status !== 'pendente').length
  const pendObr = obrigatoriosPendentes(lista).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ color: '#C8D8EC', fontSize: 14, fontWeight: 700, margin: 0 }}>✅ Checklist de execução</h3>
          <p style={{ color: '#7488A8', fontSize: 12, margin: '3px 0 0' }}>
            {lista.length ? `${feitos}/${lista.length} itens verificados` : 'Nenhum checklist nesta OS'}
            {pendObr > 0 && <span style={{ color: '#F5A623', fontWeight: 700 }}> · {pendObr} obrigatório(s) em aberto</span>}
          </p>
        </div>
        {!travado && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={modeloSel} onChange={e => setModeloSel(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 200 }}>
              <option value="">Aplicar checklist...</option>
              {disponiveis.map(m => <option key={m.id} value={m.id}>{m.nome} ({m.itens.length} itens)</option>)}
            </select>
            <button type="button" disabled={!modeloSel || aplicarMut.isPending}
              onClick={() => aplicarMut.mutate({ ordemServicoId: osId, modeloId: Number(modeloSel) })}
              style={{ ...btn('#F5A623'), padding: '7px 12px', opacity: modeloSel ? 1 : 0.5 }}>
              {aplicarMut.isPending ? '⏳' : 'Aplicar'}
            </button>
            <button type="button" onClick={() => setNovoItem(s => ({ ...s, aberto: !s.aberto }))} style={{ ...btn('#58A6FF'), padding: '7px 12px' }}>+ Item avulso</button>
          </div>
        )}
      </div>

      {!travado && (modelos as any[]).length === 0 && (
        <div style={{ fontSize: 12, color: '#7488A8', background: '#111D2E', border: '1px solid #1E3050', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
          Nenhum modelo de checklist cadastrado — crie em <b>Configurações › Checklists de OS</b>. Itens avulsos funcionam mesmo sem modelo.
        </div>
      )}

      {novoItem.aberto && !travado && (
        <div style={{ background: '#111D2E', border: '1px solid #1E3050', borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input autoFocus value={novoItem.descricao} onChange={e => setNovoItem(s => ({ ...s, descricao: e.target.value }))} placeholder="Descrição do item" style={inputStyle} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9FB0C9', cursor: 'pointer' }}>
              <input type="checkbox" checked={novoItem.obrigatorio} onChange={e => setNovoItem(s => ({ ...s, obrigatorio: e.target.checked }))} />
              Obrigatório para concluir
            </label>
            <input value={novoItem.unidadeMedida} onChange={e => setNovoItem(s => ({ ...s, unidadeMedida: e.target.value }))} placeholder="Unidade, se pede medição (V, A, Ω...)" style={{ ...inputStyle, width: 240 }} />
            <button type="button" disabled={!novoItem.descricao.trim() || adicionarMut.isPending}
              onClick={() => adicionarMut.mutate({ ordemServicoId: osId, descricao: novoItem.descricao.trim(), obrigatorio: novoItem.obrigatorio, unidadeMedida: novoItem.unidadeMedida.trim() || null })}
              style={btn('#3EBB7A', true)}>
              Adicionar
            </button>
          </div>
        </div>
      )}

      {lista.length === 0 ? (
        <div style={{ background: '#111D2E', border: '1px dashed #1E3050', borderRadius: 12, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>☑️</div>
          <div style={{ color: '#7488A8', fontSize: 13 }}>Aplique o checklist do tipo de serviço para registrar a execução item a item.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {grupos.map(g => {
            const feitosG = g.itens.filter(i => i.status !== 'pendente').length
            const nadaTicado = feitosG === 0
            return (
              <div key={`${g.modeloId ?? 'avulso'}-${g.grupo}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#9FB0C9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {g.grupo} <span style={{ color: '#7488A8', fontWeight: 400 }}>· {feitosG}/{g.itens.length}</span>
                  </div>
                  {!travado && g.modeloId && nadaTicado && (
                    <button type="button" onClick={() => { if (window.confirm(`Remover o checklist "${g.grupo}" desta OS?`)) removerModeloMut.mutate({ ordemServicoId: osId, modeloId: g.modeloId }) }}
                      style={{ ...btn('#F85149'), padding: '3px 8px', fontSize: 10 }}>
                      remover checklist
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {g.itens.map(it => <LinhaItem key={it.id} item={it} osId={osId} travado={travado} onRefresh={refresh} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
