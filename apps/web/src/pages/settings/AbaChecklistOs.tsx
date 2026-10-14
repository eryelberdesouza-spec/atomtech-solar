// ═══════════════════════════════════════════════════════════════════
// Configurações › Checklists de OS — modelos por tipo de serviço
// ═══════════════════════════════════════════════════════════════════
// Aplicar um modelo numa OS COPIA os itens: editar aqui não muda OS em
// andamento nem termo já assinado.

import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { Btn, Spinner, C } from '../../components/ui'

type ItemForm = { descricao: string; obrigatorio: boolean; unidadeMedida: string }
type ModeloForm = { id?: number; nome: string; ativo: boolean; itens: ItemForm[] }

const inputStyle: React.CSSProperties = {
  width: '100%', background: C.dark, border: `1px solid ${C.darkBorder}`,
  borderRadius: 8, padding: '7px 10px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const miniBtn: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 6, border: `1px solid ${C.darkBorder}`, background: 'transparent',
  color: C.textMuted, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
}

function EditorModelo({ inicial, onFechar }: { inicial: ModeloForm; onFechar: () => void }) {
  const [form, setForm] = useState<ModeloForm>(inicial)
  const [erro, setErro] = useState('')
  const utils = (trpc as any).useUtils()
  const salvarMut = (trpc as any).os.checklist.modelo.salvar.useMutation({
    onSuccess: () => { utils.os.checklist.modelo.list.invalidate(); onFechar() },
    onError: (e: any) => setErro(e.message),
  })

  const setItem = (i: number, patch: Partial<ItemForm>) =>
    setForm(f => ({ ...f, itens: f.itens.map((it, j) => j === i ? { ...it, ...patch } : it) }))
  const mover = (i: number, d: -1 | 1) => setForm(f => {
    const j = i + d
    if (j < 0 || j >= f.itens.length) return f
    const itens = [...f.itens];
    [itens[i], itens[j]] = [itens[j], itens[i]]
    return { ...f, itens }
  })

  const salvar = () => {
    setErro('')
    const itens = form.itens.filter(it => it.descricao.trim())
    if (!form.nome.trim()) return setErro('Dê um nome ao modelo.')
    if (!itens.length) return setErro('Inclua pelo menos um item.')
    salvarMut.mutate({
      id: form.id, nome: form.nome.trim(), ativo: form.ativo,
      itens: itens.map(it => ({ descricao: it.descricao.trim(), obrigatorio: it.obrigatorio, unidadeMedida: it.unidadeMedida.trim() || null })),
    })
  }

  return (
    <div style={{ background: C.darkCard, border: `1px solid ${C.solar}50`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do modelo (ex.: Sistema fotovoltaico — microinversor)" style={{ ...inputStyle, fontWeight: 700 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} /> Ativo
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 120px 84px', gap: 6, fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        <span>Item</span><span>Obrigatório</span><span>Medição (unid.)</span><span />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {form.itens.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 120px 84px', gap: 6, alignItems: 'center' }}>
            <input value={it.descricao} onChange={e => setItem(i, { descricao: e.target.value })} placeholder="Descrição do item" style={inputStyle} />
            <label style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={it.obrigatorio} onChange={e => setItem(i, { obrigatorio: e.target.checked })} />
            </label>
            <input value={it.unidadeMedida} onChange={e => setItem(i, { unidadeMedida: e.target.value })} placeholder="—" title="Preencha (V, A, Ω...) se o item exige valor medido" style={inputStyle} />
            <div style={{ display: 'flex', gap: 2 }}>
              <button type="button" onClick={() => mover(i, -1)} style={miniBtn} title="Subir">↑</button>
              <button type="button" onClick={() => mover(i, 1)} style={miniBtn} title="Descer">↓</button>
              <button type="button" onClick={() => setForm(f => ({ ...f, itens: f.itens.filter((_, j) => j !== i) }))} style={{ ...miniBtn, color: C.danger }} title="Remover">✕</button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setForm(f => ({ ...f, itens: [...f.itens, { descricao: '', obrigatorio: false, unidadeMedida: '' }] }))} style={{ ...miniBtn, marginTop: 8, color: C.solar, borderColor: C.solar + '60' }}>
        + Item
      </button>

      {erro && <div style={{ color: C.danger, fontSize: 12, marginTop: 10 }}>{erro}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <Btn variant="ghost" size="sm" onClick={onFechar}>Cancelar</Btn>
        <Btn size="sm" onClick={salvar} disabled={salvarMut.isPending}>{salvarMut.isPending ? 'Salvando...' : 'Salvar modelo'}</Btn>
      </div>
    </div>
  )
}

export function AbaChecklistOs() {
  const [editando, setEditando] = useState<ModeloForm | null>(null)
  const utils = (trpc as any).useUtils()
  const { data: modelos = [], isLoading } = (trpc as any).os.checklist.modelo.list.useQuery({ incluirInativos: true })
  const excluirMut = (trpc as any).os.checklist.modelo.excluir.useMutation({
    onSuccess: () => utils.os.checklist.modelo.list.invalidate(),
    onError: (e: any) => alert(e.message),
  })
  const padraoMut = (trpc as any).os.checklist.modelo.carregarPadrao.useMutation({
    onSuccess: (r: any) => {
      utils.os.checklist.modelo.list.invalidate()
      alert(r.criados.length ? `Modelos carregados: ${r.criados.join(', ')}` : 'Todos os modelos padrão já existem.')
    },
    onError: (e: any) => alert(e.message),
  })

  if (isLoading) return <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Spinner /></div>

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>Checklists de OS</h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>
            Modelos por tipo de serviço. Na OS, o técnico aplica o modelo e tica cada item — obrigatórios em aberto
            impedem a conclusão, e o checklist executado sai no termo de encerramento.
            Alterar um modelo não muda OS que já o aplicaram.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Btn variant="secondary" size="sm" onClick={() => padraoMut.mutate()} disabled={padraoMut.isPending}>
            {padraoMut.isPending ? 'Carregando...' : 'Carregar modelos padrão'}
          </Btn>
          <Btn size="sm" onClick={() => setEditando({ nome: '', ativo: true, itens: [{ descricao: '', obrigatorio: true, unidadeMedida: '' }] })}>+ Novo modelo</Btn>
        </div>
      </div>

      {editando && !editando.id && <EditorModelo inicial={editando} onFechar={() => setEditando(null)} />}

      {(modelos as any[]).length === 0 && !editando && (
        <div style={{ border: `1px dashed ${C.darkBorder}`, borderRadius: 12, padding: 32, textAlign: 'center', color: C.textDim, fontSize: 13 }}>
          Nenhum modelo cadastrado. Use "Carregar modelos padrão" (fotovoltaico string e micro, wallbox, CFTV, infraestrutura) ou crie um novo.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(modelos as any[]).map(m => editando && editando.id === m.id ? (
          <EditorModelo key={m.id} inicial={editando} onFechar={() => setEditando(null)} />
        ) : (
          <div key={m.id} style={{ background: C.darkMid, border: `1px solid ${C.darkBorder}`, borderRadius: 10, padding: '12px 14px', opacity: m.ativo ? 1 : 0.55 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div>
                <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{m.nome}</span>
                <span style={{ color: C.textDim, fontSize: 12, marginLeft: 8 }}>
                  {m.itens.length} itens · {m.itens.filter((i: any) => i.obrigatorio).length} obrigatórios
                  {!m.ativo && ' · inativo'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" style={miniBtn} onClick={() => setEditando({
                  id: m.id, nome: m.nome, ativo: m.ativo,
                  itens: m.itens.map((i: any) => ({ descricao: i.descricao, obrigatorio: i.obrigatorio, unidadeMedida: i.unidadeMedida ?? '' })),
                })}>Editar</button>
                <button type="button" style={{ ...miniBtn, color: C.danger }} onClick={() => { if (window.confirm(`Excluir o modelo "${m.nome}"? OS que já o aplicaram não são afetadas.`)) excluirMut.mutate({ id: m.id }) }}>Excluir</button>
              </div>
            </div>
            <ol style={{ margin: '8px 0 0', paddingLeft: 20, color: C.textMuted, fontSize: 12, lineHeight: 1.7 }}>
              {m.itens.map((i: any) => (
                <li key={i.id}>
                  {i.descricao}
                  {i.obrigatorio && <span style={{ color: C.solar, fontSize: 10, fontWeight: 700, marginLeft: 6 }}>OBRIGATÓRIO</span>}
                  {i.unidadeMedida && <span style={{ color: C.accent, fontSize: 10, fontWeight: 700, marginLeft: 6 }}>medir ({i.unidadeMedida})</span>}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  )
}
