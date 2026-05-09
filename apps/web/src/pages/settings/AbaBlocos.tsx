import { useState, useEffect } from 'react'
import { trpc } from '../../lib/trpc'

const GRUPOS: Record<string, { label: string; cor: string }> = {
  estrutura:  { label: 'Estrutura',       cor: '#6B7280' },
  empresa:    { label: 'Sobre a Empresa', cor: '#2D9C4E' },
  tecnico:    { label: 'Técnico',         cor: '#1565C0' },
  financeiro: { label: 'Financeiro',      cor: '#F5A623' },
  comercial:  { label: 'Comercial',       cor: '#9333EA' },
}

interface Bloco {
  tipoBloco: string
  titulo:    string
  grupo:     string
  ativo:     boolean
  ordem:     number
}

export function AbaBlocos() {
  const { data: templateData, isLoading } = (trpc as any).bloco.getTemplate.useQuery()
  const saveMut = (trpc as any).bloco.saveTemplate.useMutation()
  const [blocos,   setBlocos]   = useState<Bloco[]>([])
  const [saved,    setSaved]    = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  useEffect(() => { if (templateData) setBlocos(templateData as Bloco[]) }, [templateData])

  function toggle(idx: number) {
    setBlocos(prev => prev.map((b, i) => i === idx ? { ...b, ativo: !b.ativo } : b))
  }
  function ativarTodos()  { setBlocos(prev => prev.map(b => ({ ...b, ativo: true  }))) }
  function ocultarTodos() { setBlocos(prev => prev.map(b => ({ ...b, ativo: false }))) }
  function onDragStart(idx: number) { setDragging(idx) }
  function onDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); setDragOver(idx) }
  function onDrop(idx: number) {
    if (dragging === null || dragging === idx) { setDragging(null); setDragOver(null); return }
    const next = [...blocos]
    const [moved] = next.splice(dragging, 1)
    next.splice(idx, 0, moved)
    setBlocos(next.map((b, i) => ({ ...b, ordem: i + 1 })))
    setDragging(null); setDragOver(null)
  }
  async function salvar() {
    try {
      await saveMut.mutateAsync(blocos)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert('Erro ao salvar: ' + (e as any)?.message) }
  }

  if (isLoading) return <div style={{ padding: 48, color: '#888' }}>Carregando blocos...</div>

  return (
    <div style={{ maxWidth: 740 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E2040', margin: '0 0 6px' }}>Blocos da Proposta</h2>
        <p style={{ fontSize: 13, color: '#666', margin: 0, lineHeight: 1.6 }}>
          Configure quais seções aparecem no PDF. Arraste para reordenar.
          Este template é aplicado a todas as novas propostas por padrão.
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {Object.entries(GRUPOS).map(([key, g]) => (
          <span key={key} style={{ padding: '2px 10px', borderRadius: 12, background: g.cor + '18', color: g.cor, fontSize: 11, fontWeight: 700 }}>{g.label}</span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888', alignSelf: 'center' }}>
          {blocos.filter(b => b.ativo).length}/{blocos.length} ativos
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={ativarTodos} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#2D9C4E', cursor: 'pointer', fontWeight: 600 }}>Ativar todos</button>
        <button onClick={ocultarTodos} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#888', cursor: 'pointer' }}>Ocultar todos</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {blocos.map((bloco, idx) => {
          const grupo = GRUPOS[bloco.grupo] ?? { label: bloco.grupo, cor: '#888' }
          const isSub = bloco.titulo.startsWith('\u21b3')
          return (
            <div key={bloco.tipoBloco} draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={() => onDrop(idx)}
              onDragEnd={() => { setDragging(null); setDragOver(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: dragging === idx ? '#f0f4ff' : dragOver === idx ? '#fef9e7' : '#fff',
                border: `1px solid ${dragOver === idx ? '#F5A623' : '#e8e8e8'}`,
                borderRadius: 8, cursor: 'grab',
                opacity: bloco.ativo ? 1 : 0.6, transition: 'all 0.15s',
                marginLeft: isSub ? 16 : 0,
              }}>
              <span style={{ color: '#ccc', fontSize: 18, flexShrink: 0 }}>⠿</span>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#f5f5f5', color: '#999', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</span>
              <span style={{ padding: '2px 8px', borderRadius: 12, background: grupo.cor + '18', color: grupo.cor, fontSize: 10, fontWeight: 700, flexShrink: 0, minWidth: 72, textAlign: 'center' }}>{grupo.label}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: isSub ? 400 : 600, color: bloco.ativo ? '#1a1a2e' : '#bbb' }}>{bloco.titulo}</span>
              <div onClick={() => toggle(idx)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: bloco.ativo ? '#2D9C4E' : '#bbb', minWidth: 38, textAlign: 'right' }}>{bloco.ativo ? 'Ativo' : 'Oculto'}</span>
                <div style={{ width: 40, height: 22, borderRadius: 11, background: bloco.ativo ? '#2D9C4E' : '#ddd', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, left: bloco.ativo ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24 }}>
        <button onClick={salvar} disabled={saveMut.isPending}
          style={{ background: saveMut.isPending ? '#ccc' : '#F5A623', color: '#0E2040', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: saveMut.isPending ? 'not-allowed' : 'pointer' }}>
          {saveMut.isPending ? 'Salvando...' : 'Salvar Template'}
        </button>
        {saved && <span style={{ color: '#2D9C4E', fontSize: 13, fontWeight: 600 }}>✓ Template salvo!</span>}
      </div>
      <div style={{ marginTop: 20, padding: '12px 16px', background: '#f8f9fc', borderRadius: 8, borderLeft: '3px solid #F5A623', fontSize: 12, color: '#666', lineHeight: 1.7 }}>
        <strong style={{ color: '#0E2040' }}>Como funciona:</strong>{' '}
        Blocos "Oculto" não aparecem no PDF. Sub-blocos (↳) dependem do bloco pai estar ativo. Arraste para reordenar. Mudanças valem para novas propostas.
      </div>
    </div>
  )
}