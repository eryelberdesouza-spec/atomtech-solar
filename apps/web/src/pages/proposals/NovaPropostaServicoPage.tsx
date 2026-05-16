import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatCurrency } from '../../lib/utils'
import { Btn, Input, Card, Spinner, C, PageWrapper } from '../../components/ui'

function ClienteAutocomplete({ clientes, value, onChange }: {
  clientes: { id: number; nome: string; cpfCnpj?: string; cidade?: string; estado?: string }[]
  value: string
  onChange: (id: string) => void
}) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const selecionado = clientes.find(c => String(c.id) === value)
  const filtrados = busca.length >= 1
    ? clientes.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || (c.cpfCnpj ?? '').includes(busca)).slice(0, 8)
    : clientes.slice(0, 8)
  const selecionar = (c: typeof clientes[0]) => { onChange(String(c.id)); setBusca(''); setAberto(false) }
  const limpar = () => { onChange(''); setBusca(''); setAberto(false) }

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ display: 'block', color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Cliente *</label>
      {selecionado && !aberto ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 9, background: C.dark, border: `2px solid ${C.solar}50`, cursor: 'pointer' }} onClick={() => setAberto(true)}>
          <div>
            <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{selecionado.nome}</p>
            {(selecionado.cidade || selecionado.cpfCnpj) && <p style={{ color: C.textDim, fontSize: 11, margin: '2px 0 0' }}>{[selecionado.cpfCnpj, selecionado.cidade && selecionado.estado ? `${selecionado.cidade}/${selecionado.estado}` : null].filter(Boolean).join(' · ')}</p>}
          </div>
          <button onClick={e => { e.stopPropagation(); limpar() }} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: 13, pointerEvents: 'none' }}>🔍</span>
          <input autoFocus={aberto} value={busca} onChange={e => { setBusca(e.target.value); setAberto(true) }} onFocus={() => setAberto(true)} onBlur={() => setTimeout(() => setAberto(false), 150)} placeholder="Digite o nome do cliente..."
            style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 9, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      )}
      {aberto && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: C.darkCard, border: `1px solid ${C.darkBorder}`, borderRadius: 10, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {filtrados.length === 0 ? <div style={{ padding: '12px 16px', color: C.textDim, fontSize: 13 }}>Nenhum cliente encontrado</div>
            : filtrados.map(c => (
              <div key={c.id} onMouseDown={() => selecionar(c)} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: `1px solid ${C.darkBorder}30` }}
                onMouseEnter={e => (e.currentTarget.style.background = `${C.solar}10`)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{c.nome}</p>
                <p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>{[c.cpfCnpj, c.cidade && c.estado ? `${c.cidade}/${c.estado}` : null].filter(Boolean).join(' · ')}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

type ItemServico = {
  id: number
  descricao: string
  unidade: string
  quantidade: string
  valorUnitario: string
}

const itemVazio = (): ItemServico => ({
  id: Date.now(),
  descricao: '',
  unidade: 'un',
  quantidade: '1',
  valorUnitario: '',
})

const UNIDADES = ['un', 'm', 'm²', 'm³', 'h', 'km', 'kg', 'l', 'pc', 'vb']

export function NovaPropostaServicoPage() {
  const navigate = useNavigate()
  const hoje = new Date().toISOString().split('T')[0]
  const validade = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [clienteId, setClienteId]           = useState('')
  const [tituloServico, setTituloServico]   = useState('')
  const [dataEmissao, setDataEmissao]       = useState(hoje)
  const [dataValidade, setDataValidade]     = useState(validade)
  const [observacoes, setObservacoes]       = useState('')
  const [itens, setItens]                   = useState<ItemServico[]>([itemVazio()])
  const [erro, setErro]                     = useState('')

  const { data: clientesData, isLoading: carregandoClientes } = trpc.cliente.list.useQuery({ porPagina: 500 })
  const clientes = (clientesData?.data ?? []).map(c => ({
    id: c.id,
    nome: c.nome,
    cpfCnpj: c.cpfCnpj ?? undefined,
    cidade: c.cidade ?? undefined,
    estado: c.estado ?? undefined,
  }))

  const criar = trpc.proposta.createServico.useMutation({
    onSuccess: (data) => navigate(`/propostas/${data.propostaId}`),
    onError: (e) => setErro(e.message),
  })

  const adicionarItem = () => setItens(prev => [...prev, itemVazio()])

  const removerItem = (id: number) => {
    if (itens.length === 1) return
    setItens(prev => prev.filter(i => i.id !== id))
  }

  const atualizarItem = (id: number, campo: keyof ItemServico, valor: string) => {
    setItens(prev => prev.map(i => i.id === id ? { ...i, [campo]: valor } : i))
  }

  const totalItem = (item: ItemServico) => {
    const qtd = parseFloat(item.quantidade) || 0
    const val = parseFloat(item.valorUnitario) || 0
    return qtd * val
  }

  const totalGeral = itens.reduce((s, i) => s + totalItem(i), 0)

  const submeter = () => {
    setErro('')
    if (!clienteId)        return setErro('Selecione o cliente')
    if (!tituloServico.trim()) return setErro('Informe o título do serviço')
    const itensValidos = itens.filter(i => i.descricao.trim() && parseFloat(i.quantidade) > 0 && parseFloat(i.valorUnitario) >= 0)
    if (itensValidos.length === 0) return setErro('Adicione ao menos um item com descrição e quantidade')

    criar.mutate({
      clienteId: parseInt(clienteId),
      tituloServico: tituloServico.trim(),
      dataEmissao,
      dataValidade: dataValidade || undefined,
      observacoesInternas: observacoes || undefined,
      itens: itensValidos.map(i => ({
        descricao: i.descricao.trim(),
        unidade: i.unidade,
        quantidade: parseFloat(i.quantidade),
        valorUnitario: parseFloat(i.valorUnitario),
      })),
    })
  }

  if (carregandoClientes) return <PageWrapper><Spinner /></PageWrapper>

  return (
    <div style={{ padding: '24px 32px', maxWidth: 860 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>Nova Proposta de Serviço</h2>
          <p style={{ color: C.textDim, fontSize: 13, margin: 0 }}>CFTV, Carregadores Veiculares, Instalações Elétricas, Manutenção e outros serviços</p>
        </div>
        <button onClick={() => navigate('/propostas')} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 13, padding: '6px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Voltar
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Dados básicos */}
        <Card style={{ padding: 20 }}>
          <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dados da Proposta</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ClienteAutocomplete clientes={clientes} value={clienteId} onChange={setClienteId} />

            <div>
              <label style={{ display: 'block', color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Título do Serviço *</label>
              <input
                value={tituloServico}
                onChange={e => setTituloServico(e.target.value)}
                placeholder="Ex: Instalação de CFTV, Carregadores Veiculares..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Data de Emissão</label>
                <input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 9, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Válida até</label>
                <input type="date" value={dataValidade} onChange={e => setDataValidade(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 9, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Observações Internas</label>
              <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} placeholder="Notas internas (não aparecem na proposta)"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>
        </Card>

        {/* Itens do serviço */}
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Itens e Serviços</h3>
            <Btn onClick={adicionarItem} style={{ fontSize: 12, padding: '6px 14px' }}>+ Adicionar Item</Btn>
          </div>

          {/* Cabeçalho da tabela */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px 100px 32px', gap: 8, marginBottom: 8, padding: '0 4px' }}>
            {['Descrição', 'Un.', 'Qtd.', 'Valor Unit.', 'Total', ''].map(h => (
              <span key={h} style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itens.map((item, idx) => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px 100px 32px', gap: 8, alignItems: 'center', padding: '10px 4px', borderRadius: 8, background: idx % 2 === 0 ? 'transparent' : `${C.solar}05` }}>
                <input
                  value={item.descricao}
                  onChange={e => atualizarItem(item.id, 'descricao', e.target.value)}
                  placeholder="Descrição do item ou serviço"
                  style={{ padding: '8px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
                <select
                  value={item.unidade}
                  onChange={e => atualizarItem(item.id, 'unidade', e.target.value)}
                  style={{ padding: '8px 6px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none', width: '100%' }}
                >
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input
                  type="number" min="0" step="0.001"
                  value={item.quantidade}
                  onChange={e => atualizarItem(item.id, 'quantidade', e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box', textAlign: 'right' }}
                />
                <input
                  type="number" min="0" step="0.01"
                  value={item.valorUnitario}
                  onChange={e => atualizarItem(item.id, 'valorUnitario', e.target.value)}
                  placeholder="0,00"
                  style={{ padding: '8px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box', textAlign: 'right' }}
                />
                <div style={{ color: totalItem(item) > 0 ? C.text : C.textMuted, fontSize: 12, fontWeight: 600, textAlign: 'right' }}>
                  {totalItem(item) > 0 ? formatCurrency(totalItem(item)) : '—'}
                </div>
                <button onClick={() => removerItem(item.id)} disabled={itens.length === 1}
                  style={{ background: 'none', border: 'none', color: itens.length === 1 ? C.textMuted : '#F85149', cursor: itens.length === 1 ? 'default' : 'pointer', fontSize: 16, fontWeight: 700, lineHeight: 1, padding: 4 }}>
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.darkBorder}` }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total da Proposta</div>
              <div style={{ color: C.solar, fontSize: 22, fontWeight: 800 }}>{formatCurrency(totalGeral)}</div>
            </div>
          </div>
        </Card>

        {/* Erro e submit */}
        {erro && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F8514920', border: '1px solid #F85149', color: '#F85149', fontSize: 13 }}>
            {erro}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={() => navigate('/propostas')} style={{ padding: '10px 20px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.darkBorder}`, color: C.textDim, fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
          <Btn onClick={submeter} disabled={criar.isPending}>
            {criar.isPending ? <Spinner size={14} /> : 'Criar Proposta'}
          </Btn>
        </div>

      </div>
    </div>
  )
}
