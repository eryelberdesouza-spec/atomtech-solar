// ═══════════════════════════════════════════════════════════════════
// Configurações — Empresa, Premissas, Precificação, Textos, Usuários
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { Btn, Input, Select, Toggle, Card, Spinner, C } from '../../components/ui'
import { AbaBlocos } from './AbaBlocos'
// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface ItemAdicional {
  id: string
  descricao: string
  tipoCusto: 'fixo' | 'multiplo' | 'proporcional_kwp'
  valorFixo: number
  ativo: boolean
  unidade: string
}

const TIPO_LABELS: Record<string, string> = {
  fixo:             'Valor Fixo (R$)',
  multiplo:         'Por Unidade (R$/un)',
  proporcional_kwp: 'Por kWp (R$/kWp)',
}

const ITEM_VAZIO: Omit<ItemAdicional, 'id'> = {
  descricao: '', tipoCusto: 'fixo', valorFixo: 0, ativo: true, unidade: 'unidade',
}

// ─── ABA EMPRESA ──────────────────────────────────────────────────────────────

function AbaEmpresa() {
  const { data, isLoading, refetch } = trpc.empresa.get.useQuery()
  const updateMutation = trpc.empresa.update.useMutation({ onSuccess: () => refetch() })
  const [form, setForm] = useState<Record<string, any>>({})

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
  if (!data) return null

  const val = (k: string) => form[k] !== undefined ? form[k] : (data as any)[k] ?? ''
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = () => updateMutation.mutate(form as any)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 780 }}>
      <Card style={{ padding: '20px 24px' }}>
        <p style={{ color: C.solar, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 16px' }}>
          Identificação
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input label="Nome da Empresa" value={val('nome')} onChange={e => set('nome', e.target.value)} />
          <Input label="CNPJ" value={val('cnpj')} onChange={e => set('cnpj', e.target.value)} />
          <Input label="Inscrição Estadual" value={val('inscricaoEstadual')} onChange={e => set('inscricaoEstadual', e.target.value)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <Toggle checked={val('isentoIE') || false} onChange={v => set('isentoIE', v)} />
            <span style={{ color: C.textMuted, fontSize: 13 }}>Isento de IE</span>
          </div>
          <Input label="Estado (UF)" value={val('estado')} onChange={e => set('estado', e.target.value)} />
          <Input label="Cidade" value={val('cidade')} onChange={e => set('cidade', e.target.value)} />
          <Input label="Endereço" value={val('endereco')} onChange={e => set('endereco', e.target.value)} style={{ gridColumn: 'span 2' } as any} />
          <Input label="CEP" value={val('cep')} onChange={e => set('cep', e.target.value)} />
          <Input label="Telefone" value={val('telefone')} onChange={e => set('telefone', e.target.value)} />
          <Input label="E-mail" type="email" value={val('email')} onChange={e => set('email', e.target.value)} />
          <Input label="Site" value={val('site')} onChange={e => set('site', e.target.value)} />
        </div>
      </Card>

      <Card style={{ padding: '20px 24px' }}>
        <p style={{ color: C.solar, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 16px' }}>
          Identidade Visual
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input label="URL do Logotipo" value={val('logoUrl')} onChange={e => set('logoUrl', e.target.value)} placeholder="https://..." />
          <div />
          <Input label="Cor Primária" type="color" value={val('corPrimaria') || '#F5A623'} onChange={e => set('corPrimaria', e.target.value)} />
          <Input label="Cor Secundária" type="color" value={val('corSecundaria') || '#2D9C4E'} onChange={e => set('corSecundaria', e.target.value)} />
        </div>
      </Card>

      <Card style={{ padding: '20px 24px' }}>
        <p style={{ color: C.solar, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 16px' }}>
          Dados Bancários (usados nas condições de pagamento)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Input label="Nome do Banco" value={val('bancoNome')} onChange={e => set('bancoNome', e.target.value)} />
          <Input label="Código do Banco" value={val('bancoCodigo')} onChange={e => set('bancoCodigo', e.target.value)} />
          <Input label="Agência" value={val('bancoAgencia')} onChange={e => set('bancoAgencia', e.target.value)} />
          <Input label="Conta" value={val('bancoConta')} onChange={e => set('bancoConta', e.target.value)} />
          <Select label="Tipo" value={val('bancoTipo') || ''} onChange={e => set('bancoTipo', e.target.value)}
            options={[{ value: '', label: 'Selecione...' }, { value: 'corrente', label: 'Corrente' }, { value: 'poupança', label: 'Poupança' }]} />
          <Select label="Tipo da Chave PIX" value={val('bancoPixTipo') || ''} onChange={e => set('bancoPixTipo', e.target.value)}
            options={[{ value: '', label: 'Selecione...' }, { value: 'cnpj', label: 'CNPJ' }, { value: 'cpf', label: 'CPF' }, { value: 'email', label: 'E-mail' }, { value: 'telefone', label: 'Telefone' }, { value: 'aleatorio', label: 'Aleatória' }]} />
          <Input label="Chave PIX" value={val('bancoPixChave')} onChange={e => set('bancoPixChave', e.target.value)} style={{ gridColumn: 'span 2' } as any} />
        </div>
      </Card>

      <Card style={{ padding: '20px 24px' }}>
        <p style={{ color: C.solar, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 16px' }}>
          Rodapé das Propostas
        </p>
        <textarea
          value={val('rodapeTexto')}
          onChange={e => set('rodapeTexto', e.target.value)}
          rows={2}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            background: C.dark, border: `1px solid ${C.darkBorder}`,
            color: C.text, fontSize: 13, resize: 'vertical', outline: 'none',
          }}
          placeholder="Atom Tech — Energia Solar e Tecnologia | Brasília/DF | contato@atomtech.tec.br"
        />
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {updateMutation.isSuccess && (
          <span style={{ color: C.green, fontSize: 13, fontWeight: 600, alignSelf: 'center' }}>✔ Salvo com sucesso</span>
        )}
        <Btn onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Btn>
      </div>
    </div>
  )
}

// ─── ABA PREMISSAS ────────────────────────────────────────────────────────────

function AbaPremissas() {
  const { data, isLoading, refetch } = trpc.premissas.get.useQuery()
  const updateMutation = trpc.premissas.update.useMutation({ onSuccess: () => refetch() })
  const [form, setForm] = useState<Record<string, any>>({})

  // Estado local para itens adicionais
  const [mostrarFormItem, setMostrarFormItem] = useState(false)
  const [novoItem, setNovoItem] = useState<Omit<ItemAdicional, 'id'>>(ITEM_VAZIO)
  const [editandoItemId, setEditandoItemId] = useState<string | null>(null)
  const [formItem, setFormItem] = useState<Omit<ItemAdicional, 'id'>>(ITEM_VAZIO)

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
  if (!data) return null

  const val = (k: string) => form[k] !== undefined ? form[k] : (data as any)[k] ?? ''
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const num = (k: string) => ({ value: val(k), onChange: (e: any) => set(k, Number(e.target.value)), type: 'number' as const })

  // Itens adicionais — lê do form local ou dos dados do banco
  const itensAdicionais: ItemAdicional[] = (
    form.itensAdicionaisPadrao !== undefined
      ? form.itensAdicionaisPadrao
      : (data as any).itensAdicionaisPadrao ?? []
  )

  const setItens = (novos: ItemAdicional[]) => set('itensAdicionaisPadrao', novos)

  const gerarId = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const adicionarItem = () => {
    if (!novoItem.descricao.trim()) return
    setItens([...itensAdicionais, { ...novoItem, id: gerarId() }])
    setNovoItem(ITEM_VAZIO)
    setMostrarFormItem(false)
  }

  const salvarEdicaoItem = (id: string) => {
    setItens(itensAdicionais.map(i => i.id === id ? { ...i, ...formItem } : i))
    setEditandoItemId(null)
  }

  const removerItem = (id: string) => setItens(itensAdicionais.filter(i => i.id !== id))

  const toggleAtivoItem = (id: string) =>
    setItens(itensAdicionais.map(i => i.id === id ? { ...i, ativo: !i.ativo } : i))

  const handleSave = () => updateMutation.mutate(form as any)

  // Valores de custo para o resumo
  const custoModulo  = Number(val('custoMaoObraModulo')  || (data as any).custoMaoObraModulo  || 70)
  const custoInversor = Number(val('custoMaoObraInversor') || (data as any).custoMaoObraInversor || 150)
  const custoProjeto  = Number(val('custoProjeto')         || (data as any).custoProjeto         || 800)
  const custoAdmin    = Number(val('custoAdmin')           || (data as any).custoAdmin           || 0)

  // Estilos internos
  const inputBaseStyle: React.CSSProperties = {
    width: '100%', background: C.dark, border: `1px solid ${C.darkBorder}`,
    borderRadius: 8, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none',
  }
  const labelBase: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: C.textMuted,
    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4, display: 'block',
  }
  const btnSmall = (color: string, ghost = false): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 7, border: ghost ? `1px solid ${color}40` : 'none',
    background: ghost ? 'transparent' : color, color: ghost ? color : '#fff',
    cursor: 'pointer', fontSize: 12, fontWeight: 600,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>

      {/* Financeiras */}
      <Card style={{ padding: '20px 24px' }}>
        <p style={{ color: C.solar, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 16px' }}>
          Premissas Financeiras
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <Input label="Inflação Energética (% a.a.)" {...num('inflacaoEnergetica')} suffix="%" />
          <Input label="Taxa de Desconto VPL (% a.a.)" {...num('taxaDescontoVpl')} suffix="%" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
            <Toggle
              checked={val('considerarCustoDisponibilidade') ?? true}
              onChange={v => set('considerarCustoDisponibilidade', v)}
            />
            <span style={{ color: C.textMuted, fontSize: 13 }}>Considerar Custo de Disponibilidade</span>
          </div>
        </div>
      </Card>

      {/* Sistema Solar */}
      <Card style={{ padding: '20px 24px' }}>
        <p style={{ color: C.solar, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 16px' }}>
          Premissas do Sistema Solar
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <Input label="Sobredimensionamento (%)" {...num('sobredimensionamentoPadrao')} suffix="%" />
          <Input label="Margem Potência Ideal (%)" {...num('margemPotenciaIdeal')} suffix="%" />
          <Input label="Desvio Azimutal Padrão (°)" {...num('desvioAzimutalPadrao')} suffix="°" />
          <Input label="Inclinação Padrão (°)" {...num('inclinacaoPadrao')} suffix="°" />
          <Input label="Perda Efic. Anual Trad. (%)" {...num('perdaEficienciaAnualTradicional')} suffix="%" />
          <Input label="Perda Efic. Anual Micro. (%)" {...num('perdaEficienciaAnualMicroinversor')} suffix="%" />
          <Input label="Perda Efic. Anual Otim. (%)" {...num('perdaEficienciaAnualOtimizador')} suffix="%" />
          <div />
          <Input label="Taxa Desempenho Trad. (%)" {...num('taxaDesempenhoTradicional')} suffix="%" />
          <Input label="Taxa Desempenho Micro. (%)" {...num('taxaDesempenhoMicroinversor')} suffix="%" />
          <Input label="Taxa Desempenho Otim. (%)" {...num('taxaDesempenhoOtimizador')} suffix="%" />
          <div />
        </div>
      </Card>

      {/* Área por telhado */}
      <Card style={{ padding: '20px 24px' }}>
        <p style={{ color: C.solar, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>
          Área Útil por Tipo de Telhado
        </p>
        <p style={{ color: C.textDim, fontSize: 11, margin: '0 0 14px' }}>
          m² de área necessária por m² de módulo instalado
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            ['Carport', 'areaCarport'], ['Cerâmico', 'areaCeramico'],
            ['Fibrocimento', 'areaFibrocimento'], ['Laje', 'areaLaje'],
            ['Shingle', 'areaShingle'], ['Metálico', 'areaMetalico'],
            ['Zipado', 'areaZipado'], ['Solo', 'areaSolo'],
          ].map(([label, key]) => (
            <Input key={key} label={label} {...num(key)} suffix="m²/m²" />
          ))}
        </div>
      </Card>

      {/* Precificação */}
      <Card style={{ padding: '20px 24px' }}>
        <p style={{ color: C.solar, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 16px' }}>
          Precificação Padrão
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Select
            label="Método de Precificação"
            value={val('metodoPrecificacao') || 'margem_custo'}
            onChange={e => set('metodoPrecificacao', e.target.value)}
            options={[
              { value: 'margem_custo', label: 'Margem sobre o Custo (Markup)' },
              { value: 'margem_venda', label: 'Margem sobre a Venda' },
            ]}
          />
          <Input label="Margem Padrão (%)" {...num('margemPadrao')} suffix="%" />
          <Input label="Imposto sobre Energia (%)" {...num('impostoEnergia')} suffix="%" />
        </div>
      </Card>

      {/* ── COMPOSIÇÃO DE CUSTOS PADRÃO (NOVO) ─────────────────────────────── */}
      <Card style={{ padding: '20px 24px' }}>
        <p style={{ color: C.solar, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>
          Composição de Custos Padrão
        </p>
        <p style={{ color: C.textDim, fontSize: 11, margin: '0 0 16px', lineHeight: 1.6 }}>
          Valores usados automaticamente ao criar uma proposta. Podem ser ajustados individualmente em cada proposta na aba Precificação.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Mão de obra módulos */}
          <div>
            <label style={labelBase}>Mão de Obra — Módulos (R$/módulo)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input style={inputBaseStyle} type="number" min={0} step={5}
                value={val('custoMaoObraModulo') !== '' ? val('custoMaoObraModulo') : custoModulo}
                onChange={e => set('custoMaoObraModulo', Number(e.target.value))} />
              <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' }}>R$/módulo</span>
            </div>
            <p style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>
              Exemplo: 10 módulos × R$ {custoModulo} = R$ {(10 * custoModulo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Mão de obra inversor */}
          <div>
            <label style={labelBase}>Mão de Obra — Inversor (R$/inversor)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input style={inputBaseStyle} type="number" min={0} step={10}
                value={val('custoMaoObraInversor') !== '' ? val('custoMaoObraInversor') : custoInversor}
                onChange={e => set('custoMaoObraInversor', Number(e.target.value))} />
              <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' }}>R$/inversor</span>
            </div>
            <p style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>
              Aplica-se a inversores string e microinversores
            </p>
          </div>

          {/* Projeto de engenharia */}
          <div>
            <label style={labelBase}>Projeto de Engenharia (R$ fixo)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input style={inputBaseStyle} type="number" min={0} step={50}
                value={val('custoProjeto') !== '' ? val('custoProjeto') : custoProjeto}
                onChange={e => set('custoProjeto', Number(e.target.value))} />
              <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' }}>R$</span>
            </div>
            <p style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>
              Custo fixo por proposta, independente do tamanho do sistema
            </p>
          </div>

          {/* Custo administrativo */}
          <div>
            <label style={labelBase}>Custo Administrativo (R$ fixo)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input style={inputBaseStyle} type="number" min={0} step={50}
                value={val('custoAdmin') !== '' ? val('custoAdmin') : custoAdmin}
                onChange={e => set('custoAdmin', Number(e.target.value))} />
              <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' }}>R$</span>
            </div>
            <p style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>
              Incluso na proposta apenas se valor &gt; 0
            </p>
          </div>
        </div>

        {/* Resumo simulado */}
        <div style={{
          background: `${C.dark}cc`, borderRadius: 8, padding: '12px 16px',
          border: `1px solid ${C.darkBorder}`, marginTop: 16,
        }}>
          <p style={{ fontSize: 10, color: C.textMuted, marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Simulação — Sistema 10 módulos / 1 inversor
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[
              { label: 'Kit (informado na proposta)', valor: '—' },
              { label: `Instalação módulos`, valor: `R$ ${(10 * custoModulo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
              { label: `Instalação inversor`, valor: `R$ ${custoInversor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
              { label: 'Projeto de engenharia', valor: `R$ ${custoProjeto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: 9, color: C.textDim, marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: item.valor === '—' ? C.textDim : C.solar, fontWeight: 700 }}>{item.valor}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── ITENS ADICIONAIS (NOVO) ──────────────────────────────────────────── */}
      <Card style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <p style={{ color: C.solar, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>
              Itens Adicionais
            </p>
            <p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>
              Baterias, carregadores veiculares, padrão de entrada, outros serviços
            </p>
          </div>
          <button
            style={btnSmall(C.accent, true)}
            onClick={() => { setMostrarFormItem(!mostrarFormItem); setNovoItem(ITEM_VAZIO) }}
          >
            {mostrarFormItem ? '✕ Cancelar' : '+ Adicionar Item'}
          </button>
        </div>

        {/* Formulário de novo item */}
        {mostrarFormItem && (
          <div style={{
            background: `${C.accent}08`, borderRadius: 10, padding: 16,
            border: `1px solid ${C.accent}30`, marginBottom: 14,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 12 }}>Novo Item Adicional</p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelBase}>Descrição</label>
                <input style={inputBaseStyle} type="text" placeholder="Ex: Bateria de Armazenamento"
                  value={novoItem.descricao} onChange={e => setNovoItem(p => ({ ...p, descricao: e.target.value }))} />
              </div>
              <div>
                <label style={labelBase}>Tipo de Custo</label>
                <select style={{ ...inputBaseStyle, cursor: 'pointer' }} value={novoItem.tipoCusto}
                  onChange={e => setNovoItem(p => ({ ...p, tipoCusto: e.target.value as any }))}>
                  {Object.entries(TIPO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelBase}>Valor (R$)</label>
                <input style={inputBaseStyle} type="number" min={0} step={50}
                  value={novoItem.valorFixo} onChange={e => setNovoItem(p => ({ ...p, valorFixo: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={labelBase}>Unidade</label>
                <input style={inputBaseStyle} type="text" placeholder="conjunto / unidade"
                  value={novoItem.unidade} onChange={e => setNovoItem(p => ({ ...p, unidade: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted, cursor: 'pointer' }}>
                <input type="checkbox" checked={novoItem.ativo}
                  onChange={e => setNovoItem(p => ({ ...p, ativo: e.target.checked }))} />
                Ativo por padrão nas novas propostas
              </label>
              <button style={btnSmall(C.accent)} onClick={adicionarItem} disabled={!novoItem.descricao.trim()}>
                ✓ Adicionar
              </button>
            </div>
          </div>
        )}

        {/* Lista de itens */}
        {itensAdicionais.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '18px 16px',
            border: `1px dashed ${C.darkBorder}`, borderRadius: 8,
            color: C.textDim, fontSize: 12,
          }}>
            Nenhum item adicional configurado. Clique em "+ Adicionar Item" para criar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itensAdicionais.map(item => (
              <div key={item.id} style={{
                background: C.dark, border: `1px solid ${item.ativo ? C.darkBorder : `${C.darkBorder}60`}`,
                borderRadius: 8, padding: '10px 14px', opacity: item.ativo ? 1 : 0.6,
              }}>
                {editandoItemId !== item.id ? (
                  // Visualização
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Toggle ativo */}
                    <button onClick={() => toggleAtivoItem(item.id)} title={item.ativo ? 'Desativar' : 'Ativar'}
                      style={{
                        width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
                        background: item.ativo ? C.green : C.darkBorder, border: 'none', cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3, left: item.ativo ? 19 : 3, transition: 'left 0.2s',
                      }} />
                    </button>

                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{item.descricao}</span>
                      <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 10 }}>
                        {TIPO_LABELS[item.tipoCusto]}:&nbsp;
                        <strong style={{ color: C.solar }}>
                          R$ {Number(item.valorFixo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                        {item.unidade ? ` / ${item.unidade}` : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={btnSmall('#3B82F6', true)} onClick={() => {
                        setEditandoItemId(item.id)
                        setFormItem({ descricao: item.descricao, tipoCusto: item.tipoCusto, valorFixo: item.valorFixo, ativo: item.ativo, unidade: item.unidade })
                      }}>✏ Editar</button>
                      <button style={btnSmall('#EF4444', true)} onClick={() => removerItem(item.id)}>✕</button>
                    </div>
                  </div>
                ) : (
                  // Edição inline
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={labelBase}>Descrição</label>
                        <input style={inputBaseStyle} type="text" value={formItem.descricao}
                          onChange={e => setFormItem(p => ({ ...p, descricao: e.target.value }))} />
                      </div>
                      <div>
                        <label style={labelBase}>Tipo</label>
                        <select style={{ ...inputBaseStyle, cursor: 'pointer' }} value={formItem.tipoCusto}
                          onChange={e => setFormItem(p => ({ ...p, tipoCusto: e.target.value as any }))}>
                          {Object.entries(TIPO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelBase}>Valor (R$)</label>
                        <input style={inputBaseStyle} type="number" min={0} step={50} value={formItem.valorFixo}
                          onChange={e => setFormItem(p => ({ ...p, valorFixo: Number(e.target.value) }))} />
                      </div>
                      <div>
                        <label style={labelBase}>Unidade</label>
                        <input style={inputBaseStyle} type="text" value={formItem.unidade}
                          onChange={e => setFormItem(p => ({ ...p, unidade: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button style={btnSmall(C.textMuted, true)} onClick={() => setEditandoItemId(null)}>Cancelar</button>
                      <button style={btnSmall(C.accent)} onClick={() => salvarEdicaoItem(item.id)}>✓ Salvar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Botão salvar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {updateMutation.isSuccess && (
          <span style={{ color: C.green, fontSize: 13, fontWeight: 600, alignSelf: 'center' }}>✔ Salvo com sucesso</span>
        )}
        <Btn onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Salvando...' : 'Salvar Premissas'}
        </Btn>
      </div>
    </div>
  )
}

// ─── ABA TEXTOS INSTITUCIONAIS ────────────────────────────────────────────────
const CONFIG_ABAS = [
  { path: '',         label: 'Empresa' },
  { path: 'premissas', label: 'Premissas' },
  { path: 'textos',   label: 'Textos Institucionais' },
  { path: 'blocos',   label: 'Blocos da Proposta' },   // ← inserir aqui
  { path: 'catalogo',  label: 'Catálogo de Equip.' },
  { path: 'usuarios', label: 'Usuários' },
]
function AbaTextos() {
  const { data, isLoading, refetch } = trpc.textoInstitucional.list.useQuery()
  const updateMutation = trpc.textoInstitucional.upsert.useMutation({ onSuccess: () => refetch() })
  const [chaveAtiva, setChaveAtiva] = useState('apresentacao_empresa')
  const [conteudo, setConteudo] = useState<Record<string, string>>({})

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>

  const CHAVES = [
    { key: 'apresentacao_empresa', label: 'Apresentação da Empresa' },
    { key: 'o_que_inclui', label: 'O que inclui' },
    { key: 'diferenciais', label: 'Diferenciais' },
    { key: 'garantias', label: 'Garantias' },
    { key: 'fornecedores', label: 'Fornecedores' },
    { key: 'regulamentacao', label: 'Regulamentação' },
    { key: 'como_funciona', label: 'Como funciona' },
    { key: 'consideracoes_gerais', label: 'Considerações Gerais (Padrão)' },
  ]

  const getTexto = (chave: string) => {
    if (conteudo[chave] !== undefined) return conteudo[chave]
    const item = (data as any[])?.find((t: any) => t.chave === chave)
    return item?.conteudo ?? ''
  }

  const handleSave = () => {
    const titulo = CHAVES.find(c => c.key === chaveAtiva)?.label ?? chaveAtiva
    updateMutation.mutate({ chave: chaveAtiva, titulo, conteudo: conteudo[chaveAtiva] ?? getTexto(chaveAtiva) })
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '70vh' }}>
      <div style={{ width: 200, flexShrink: 0 }}>
        {CHAVES.map(c => (
          <button key={c.key} onClick={() => setChaveAtiva(c.key)} style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
            background: chaveAtiva === c.key ? `${C.solar}15` : 'transparent',
            color: chaveAtiva === c.key ? C.solar : C.textMuted,
            textAlign: 'left', fontSize: 12.5, fontWeight: chaveAtiva === c.key ? 600 : 400,
            cursor: 'pointer', marginBottom: 3,
          }}>
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>
          Suporta markdown básico: **negrito**, _itálico_, listas com -
        </p>
        <textarea
          value={getTexto(chaveAtiva)}
          onChange={e => setConteudo(c => ({ ...c, [chaveAtiva]: e.target.value }))}
          style={{
            flex: 1, padding: '12px 14px', borderRadius: 10,
            background: C.dark, border: `1px solid ${C.darkBorder}`,
            color: C.text, fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.7,
          }}
          onFocus={e => e.currentTarget.style.borderColor = C.solar}
          onBlur={e => e.currentTarget.style.borderColor = C.darkBorder}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {updateMutation.isSuccess && (
            <span style={{ color: C.green, fontSize: 13, fontWeight: 600, alignSelf: 'center' }}>✔ Salvo</span>
          )}
          <Btn onClick={handleSave} disabled={updateMutation.isPending || conteudo[chaveAtiva] === undefined}>
            {updateMutation.isPending ? 'Salvando...' : 'Salvar Texto'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ─── ABA USUÁRIOS (stub) ──────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════
// AbaUsuarios — Gestão completa de usuários com níveis de acesso
// Substitui o stub existente na ConfiguracoesPage.tsx
//
// INSTRUÇÕES DE INTEGRAÇÃO:
// 1. Adicione este import no topo da ConfiguracoesPage.tsx:
//    (os hooks do trpc já estão disponíveis)
//
// 2. Substitua a função AbaUsuarios() existente por esta abaixo.
//    A função começa em: function AbaUsuarios() {
//    e termina no segundo } antes de: // ─── LAYOUT DA CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════

const ROLE_LABELS: Record<string, string> = {
  admin:        'Administrador',
  comercial:    'Comercial',
  tecnico:      'Técnico',
  visualizador: 'Visualizador',
}

const ROLE_CORES: Record<string, string> = {
  admin:        '#F5A623',
  comercial:    '#3B82F6',
  tecnico:      '#2D9C4E',
  visualizador: '#6B7280',
}

const ROLE_DESCRICOES: Record<string, string> = {
  admin:        'Acesso total — configurações, usuários, todas as propostas',
  comercial:    'Cria e edita propostas e clientes',
  tecnico:      'Visualiza e edita dimensionamentos, exporta PDFs',
  visualizador: 'Somente leitura — visualiza propostas e clientes',
}

function BadgeRole({ role }: { role: string }) {
  return (
    <span style={{
      background: `${ROLE_CORES[role]}20`,
      color: ROLE_CORES[role],
      border: `1px solid ${ROLE_CORES[role]}40`,
      borderRadius: 20, padding: '2px 10px',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
    }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

const FORM_VAZIO = {
  nome: '', email: '', senha: '', telefone: '', cargo: '',
  role: 'comercial' as const, margemPadrao: 0, comissaoPadrao: 0,
}

function AbaUsuarios() {
  const { data: usuarios, isLoading, refetch } = trpc.usuario.list.useQuery()
  const createMutation        = trpc.usuario.create.useMutation({ onSuccess: () => { refetch(); setModo('lista') } })
  const updateMutation        = trpc.usuario.update.useMutation({ onSuccess: () => { refetch(); setModo('lista') } })
  const toggleAtivoMutation   = trpc.usuario.toggleAtivo.useMutation({ onSuccess: () => refetch() })
  const redefinirSenhaMutation = trpc.usuario.redefinirSenha.useMutation({ onSuccess: () => { setSenhaModal(null) } })

  const { data: meData } = trpc.auth.me.useQuery()
  const meuRole = (meData as any)?.role ?? 'visualizador'
  const isAdmin = meuRole === 'admin'

  const [modo, setModo] = useState<'lista' | 'novo' | 'editar'>('lista')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [senhaModal, setSenhaModal] = useState<{ id: number; nome: string } | null>(null)
  const [novaSenha, setNovaSenha] = useState('')

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const abrirNovo = () => {
    setForm(FORM_VAZIO)
    setEditandoId(null)
    setModo('novo')
  }

  const abrirEditar = (u: any) => {
    setForm({
      nome: u.nome, email: u.email, senha: '',
      telefone: u.telefone ?? '', cargo: u.cargo ?? '',
      role: u.role, margemPadrao: Number(u.margemPadrao ?? 0),
      comissaoPadrao: Number(u.comissaoPadrao ?? 0),
    })
    setEditandoId(u.id)
    setModo('editar')
  }

  const handleSalvar = () => {
    if (modo === 'novo') {
      createMutation.mutate(form as any)
    } else if (modo === 'editar' && editandoId) {
      updateMutation.mutate({ id: editandoId, ...form } as any)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: C.dark, border: `1px solid ${C.darkBorder}`,
    borderRadius: 8, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: C.textMuted,
    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4, display: 'block',
  }

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
  )

  // ── FORMULÁRIO (novo/editar) ──────────────────────────────────────
  if (modo === 'novo' || modo === 'editar') {
    const isPending = createMutation.isPending || updateMutation.isPending
    const erro = createMutation.error?.message || updateMutation.error?.message

    return (
      <div style={{ maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setModo('lista')} style={{
            background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 13,
          }}>← Voltar</button>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>
            {modo === 'novo' ? 'Novo Usuário' : 'Editar Usuário'}
          </h2>
        </div>

        <Card style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Nome completo *</label>
              <input style={inputStyle} type="text" placeholder="Ex: João da Silva"
                value={form.nome} onChange={e => setF('nome', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>E-mail *</label>
              <input style={inputStyle} type="email" placeholder="joao@empresa.com"
                value={form.email} onChange={e => setF('email', e.target.value)} />
            </div>
            {modo === 'novo' && (
              <div>
                <label style={labelStyle}>Senha inicial *</label>
                <input style={inputStyle} type="password" placeholder="Mínimo 6 caracteres"
                  value={form.senha} onChange={e => setF('senha', e.target.value)} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Telefone</label>
              <input style={inputStyle} type="text" placeholder="(61) 99999-9999"
                value={form.telefone} onChange={e => setF('telefone', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Cargo</label>
              <input style={inputStyle} type="text" placeholder="Ex: Engenheiro, Consultor"
                value={form.cargo} onChange={e => setF('cargo', e.target.value)} />
            </div>

            {/* Nível de acesso */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Nível de Acesso *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <button key={value} onClick={() => setF('role', value)} style={{
                    padding: '10px 8px', borderRadius: 9, cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${form.role === value ? ROLE_CORES[value] : C.darkBorder}`,
                    background: form.role === value ? `${ROLE_CORES[value]}15` : C.dark,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: form.role === value ? ROLE_CORES[value] : C.text }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 10, color: C.textDim, marginTop: 4, lineHeight: 1.4 }}>
                      {ROLE_DESCRICOES[value]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Margem e Comissão */}
            <div>
              <label style={labelStyle}>Margem Padrão (%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input style={inputStyle} type="number" min={0} max={100}
                  value={form.margemPadrao}
                  onChange={e => setF('margemPadrao', Number(e.target.value))} />
                <span style={{ color: C.textMuted, fontSize: 12 }}>%</span>
              </div>
              <p style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>
                Se 0, usa a margem padrão da empresa
              </p>
            </div>
            <div>
              <label style={labelStyle}>Comissão Padrão (%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input style={inputStyle} type="number" min={0} max={100}
                  value={form.comissaoPadrao}
                  onChange={e => setF('comissaoPadrao', Number(e.target.value))} />
                <span style={{ color: C.textMuted, fontSize: 12 }}>%</span>
              </div>
              <p style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>
                Aplicada automaticamente nas propostas deste usuário
              </p>
            </div>
          </div>

          {erro && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 8,
              background: '#EF444415', border: '1px solid #EF444440',
              color: '#EF4444', fontSize: 12,
            }}>
              {erro}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModo('lista')} disabled={isPending}>
              Cancelar
            </Btn>
            <Btn onClick={handleSalvar} disabled={isPending}>
              {isPending ? 'Salvando...' : modo === 'novo' ? 'Criar Usuário' : 'Salvar Alterações'}
            </Btn>
          </div>
        </Card>
      </div>
    )
  }

  // ── LISTA ─────────────────────────────────────────────────────────
  const lista = usuarios ?? []

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>
            Usuários da Conta
          </h2>
          <p style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
            {lista.length} usuário{lista.length !== 1 ? 's' : ''} cadastrado{lista.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <Btn onClick={abrirNovo}>+ Novo Usuário</Btn>
        )}
      </div>

      {/* Legenda de roles */}
      <Card style={{ padding: '14px 18px', marginBottom: 14 }}>
        <p style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
          Níveis de Acesso
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <div key={role} style={{
              padding: '8px 12px', borderRadius: 8,
              background: `${ROLE_CORES[role]}10`,
              border: `1px solid ${ROLE_CORES[role]}30`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ROLE_CORES[role], marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.4 }}>{ROLE_DESCRICOES[role]}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Lista de usuários */}
      {lista.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: C.textDim, fontSize: 14 }}>Nenhum usuário cadastrado ainda.</p>
          {isAdmin && <Btn onClick={abrirNovo} style={{ marginTop: 12 }}>+ Criar primeiro usuário</Btn>}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista.map(u => (
            <Card key={u.id} style={{
              padding: '14px 18px',
              opacity: u.ativo ? 1 : 0.55,
              border: `1px solid ${u.ativo ? C.darkBorder : C.darkBorder + '60'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Avatar */}
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                  background: `${ROLE_CORES[u.role]}25`,
                  border: `2px solid ${ROLE_CORES[u.role]}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: ROLE_CORES[u.role],
                }}>
                  {u.nome.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{u.nome}</span>
                    <BadgeRole role={u.role} />
                    {!u.ativo && (
                      <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 600, background: '#EF444415', padding: '2px 8px', borderRadius: 20 }}>
                        INATIVO
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {u.email}
                    {u.cargo ? ` · ${u.cargo}` : ''}
                    {u.telefone ? ` · ${u.telefone}` : ''}
                  </div>
                  {(Number(u.margemPadrao) > 0 || Number(u.comissaoPadrao) > 0) && (
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>
                      {Number(u.margemPadrao) > 0 && `Margem: ${u.margemPadrao}%`}
                      {Number(u.margemPadrao) > 0 && Number(u.comissaoPadrao) > 0 && ' · '}
                      {Number(u.comissaoPadrao) > 0 && `Comissão: ${u.comissaoPadrao}%`}
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {isAdmin && (
                    <button
                      onClick={() => setSenhaModal({ id: u.id, nome: u.nome })}
                      style={{
                        padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.darkBorder}`,
                        background: 'transparent', color: C.textMuted, cursor: 'pointer', fontSize: 11,
                      }}
                      title="Redefinir senha"
                    >
                      🔑 Senha
                    </button>
                  )}
                  {(isAdmin || u.id === (meData as any)?.id) && (
                    <button
                      onClick={() => abrirEditar(u)}
                      style={{
                        padding: '6px 12px', borderRadius: 7, border: `1px solid #3B82F640`,
                        background: '#3B82F610', color: '#3B82F6', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      }}
                    >
                      ✏ Editar
                    </button>
                  )}
                  {isAdmin && u.id !== (meData as any)?.id && (
                    <button
                      onClick={() => toggleAtivoMutation.mutate({ id: u.id })}
                      disabled={toggleAtivoMutation.isPending}
                      style={{
                        padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${u.ativo ? '#EF444440' : '#2D9C4E40'}`,
                        background: u.ativo ? '#EF444410' : '#2D9C4E10',
                        color: u.ativo ? '#EF4444' : '#2D9C4E',
                      }}
                    >
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal redefinir senha */}
      {senhaModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: C.darkCard, border: `1px solid ${C.darkBorder}`,
            borderRadius: 14, padding: '24px 28px', width: 380,
          }}>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>
              Redefinir Senha
            </h3>
            <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 16px' }}>
              Usuário: <strong style={{ color: C.text }}>{senhaModal.nome}</strong>
            </p>
            <label style={labelStyle}>Nova Senha</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              autoFocus
            />
            {redefinirSenhaMutation.error && (
              <p style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>
                {redefinirSenhaMutation.error.message}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => { setSenhaModal(null); setNovaSenha('') }}>
                Cancelar
              </Btn>
              <Btn
                onClick={() => redefinirSenhaMutation.mutate({ id: senhaModal.id, novaSenha })}
                disabled={novaSenha.length < 6 || redefinirSenhaMutation.isPending}
              >
                {redefinirSenhaMutation.isPending ? 'Salvando...' : 'Redefinir Senha'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// ─── ABA CATÁLOGO DE EQUIPAMENTOS ────────────────────────────────────────────

function AbaCatalogo() {
  const [aba, setAba] = useState<'modulos' | 'inversores'>('modulos')
  const [showForm, setShowForm] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)

  // ── Módulos ──
  const { data: modulos, refetch: refetchModulos } = trpc.equipamento.listModulos.useQuery({ apenasAtivos: false })
  const createModulo = trpc.equipamento.createModulo.useMutation({ onSuccess: () => { refetchModulos(); setShowForm(false); resetForm() } })
  const updateModulo = trpc.equipamento.updateModulo.useMutation({ onSuccess: () => { refetchModulos(); setEditandoId(null); resetForm() } })
  const toggleModulo = trpc.equipamento.toggleModulo.useMutation({ onSuccess: () => refetchModulos() })
  const deleteModulo = trpc.equipamento.deleteModulo.useMutation({ onSuccess: () => refetchModulos() })

  // ── Inversores ──
  const { data: inversores, refetch: refetchInversores } = trpc.equipamento.listInversores.useQuery({ apenasAtivos: false })
  const createInversor = trpc.equipamento.createInversor.useMutation({ onSuccess: () => { refetchInversores(); setShowForm(false); resetForm() } })
  const updateInversor = trpc.equipamento.updateInversor.useMutation({ onSuccess: () => { refetchInversores(); setEditandoId(null); resetForm() } })
  const toggleInversor = trpc.equipamento.toggleInversor.useMutation({ onSuccess: () => refetchInversores() })
  const deleteInversor = trpc.equipamento.deleteInversor.useMutation({ onSuccess: () => refetchInversores() })

  const FORM_MOD_VAZIO = { fabricante: '', modelo: '', potenciaWp: 0, eficiencia: 0, garantiaAnos: 12, precoUnitario: 0 }
  const FORM_INV_VAZIO = { fabricante: '', modelo: '', potenciaW: 0, tipo: 'microinversor' as const, garantiaAnos: 12, precoUnitario: 0 }
  const [formMod, setFormMod] = useState(FORM_MOD_VAZIO)
  const [formInv, setFormInv] = useState(FORM_INV_VAZIO)
  const resetForm = () => { setFormMod(FORM_MOD_VAZIO); setFormInv(FORM_INV_VAZIO) }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: C.dark, border: `1px solid ${C.darkBorder}`,
    borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: C.textMuted,
    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4, display: 'block',
  }

  const isModulos = aba === 'modulos'

  const handleSalvar = () => {
    if (isModulos) {
      if (editandoId) updateModulo.mutate({ id: editandoId, ...formMod } as any)
      else createModulo.mutate(formMod as any)
    } else {
      if (editandoId) updateInversor.mutate({ id: editandoId, ...formInv } as any)
      else createInversor.mutate(formInv as any)
    }
  }

  const abrirEditar = (item: any) => {
    setEditandoId(item.id)
    if (isModulos) setFormMod({ fabricante: item.fabricante, modelo: item.modelo, potenciaWp: item.potenciaWp, eficiencia: Number(item.eficiencia ?? 0), garantiaAnos: item.garantiaAnos ?? 12, precoUnitario: Number(item.precoUnitario ?? 0) })
    else setFormInv({ fabricante: item.fabricante, modelo: item.modelo, potenciaW: item.potenciaW, tipo: item.tipo, garantiaAnos: item.garantiaAnos ?? 12, precoUnitario: Number(item.precoUnitario ?? 0) })
    setShowForm(true)
  }

  const lista = isModulos ? (modulos ?? []) : (inversores ?? [])

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>Catálogo de Equipamentos</h2>
          <p style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>Módulos e inversores pré-cadastrados para uso nas propostas</p>
        </div>
        <Btn onClick={() => { setShowForm(!showForm); setEditandoId(null); resetForm() }}>
          {showForm ? '✕ Cancelar' : '+ Adicionar'}
        </Btn>
      </div>

      {/* Sub-abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: C.dark, borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['modulos', 'inversores'] as const).map(t => (
          <button key={t} onClick={() => { setAba(t); setShowForm(false); setEditandoId(null); resetForm() }} style={{
            padding: '7px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: aba === t ? C.solar : 'transparent',
            color: aba === t ? '#000' : C.textMuted, fontWeight: 600, fontSize: 13,
          }}>
            {t === 'modulos' ? '🔆 Módulos' : '⚡ Inversores'}
          </button>
        ))}
      </div>

      {/* Formulário */}
      {showForm && (
        <Card style={{ padding: '18px 20px', marginBottom: 16, border: `1px solid ${C.accent}30` }}>
          <p style={{ color: C.accent, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 14px' }}>
            {editandoId ? 'Editar' : 'Novo'} {isModulos ? 'Módulo' : 'Inversor'}
          </p>
          {isModulos ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 100px 100px 120px', gap: 12 }}>
              <div><label style={labelStyle}>Fabricante *</label><input style={inputStyle} value={formMod.fabricante} onChange={e => setFormMod(f => ({ ...f, fabricante: e.target.value }))} placeholder="Ex: JA Solar" /></div>
              <div><label style={labelStyle}>Modelo *</label><input style={inputStyle} value={formMod.modelo} onChange={e => setFormMod(f => ({ ...f, modelo: e.target.value }))} placeholder="Ex: JAM72S30-620" /></div>
              <div><label style={labelStyle}>Potência (Wp) *</label><input style={inputStyle} type="number" value={formMod.potenciaWp || ''} onChange={e => setFormMod(f => ({ ...f, potenciaWp: Number(e.target.value) }))} /></div>
              <div><label style={labelStyle}>Eficiência (%)</label><input style={inputStyle} type="number" value={formMod.eficiencia || ''} onChange={e => setFormMod(f => ({ ...f, eficiencia: Number(e.target.value) }))} /></div>
              <div><label style={labelStyle}>Garantia (anos)</label><input style={inputStyle} type="number" value={formMod.garantiaAnos || ''} onChange={e => setFormMod(f => ({ ...f, garantiaAnos: Number(e.target.value) }))} /></div>
              <div><label style={labelStyle}>Preço Unit. (R$)</label><input style={inputStyle} type="number" value={formMod.precoUnitario || ''} onChange={e => setFormMod(f => ({ ...f, precoUnitario: Number(e.target.value) }))} /></div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 140px 100px 120px', gap: 12 }}>
              <div><label style={labelStyle}>Fabricante *</label><input style={inputStyle} value={formInv.fabricante} onChange={e => setFormInv(f => ({ ...f, fabricante: e.target.value }))} placeholder="Ex: Hoymiles" /></div>
              <div><label style={labelStyle}>Modelo *</label><input style={inputStyle} value={formInv.modelo} onChange={e => setFormInv(f => ({ ...f, modelo: e.target.value }))} placeholder="Ex: HMS-2250DW-4T" /></div>
              <div><label style={labelStyle}>Potência (W) *</label><input style={inputStyle} type="number" value={formInv.potenciaW || ''} onChange={e => setFormInv(f => ({ ...f, potenciaW: Number(e.target.value) }))} /></div>
              <div>
                <label style={labelStyle}>Tipo *</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={formInv.tipo} onChange={e => setFormInv(f => ({ ...f, tipo: e.target.value as any }))}>
                  <option value="microinversor">Microinversor</option>
                  <option value="string">String</option>
                  <option value="hibrido">Híbrido</option>
                  <option value="otimizador">Otimizador</option>
                </select>
              </div>
              <div><label style={labelStyle}>Garantia (anos)</label><input style={inputStyle} type="number" value={formInv.garantiaAnos || ''} onChange={e => setFormInv(f => ({ ...f, garantiaAnos: Number(e.target.value) }))} /></div>
              <div><label style={labelStyle}>Preço Unit. (R$)</label><input style={inputStyle} type="number" value={formInv.precoUnitario || ''} onChange={e => setFormInv(f => ({ ...f, precoUnitario: Number(e.target.value) }))} /></div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn onClick={handleSalvar} disabled={createModulo.isPending || updateModulo.isPending || createInversor.isPending || updateInversor.isPending}>
              {editandoId ? '✔ Salvar Alterações' : '✔ Adicionar ao Catálogo'}
            </Btn>
          </div>
        </Card>
      )}

      {/* Lista */}
      {lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', border: `1px dashed ${C.darkBorder}`, borderRadius: 12, color: C.textDim }}>
          Nenhum {isModulos ? 'módulo' : 'inversor'} cadastrado ainda. Clique em "+ Adicionar" para começar.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.darkBorder}` }}>
              {(isModulos
                ? ['Fabricante / Modelo', 'Potência', 'Eficiência', 'Garantia', 'Preço Unit.', 'Status', '']
                : ['Fabricante / Modelo', 'Tipo', 'Potência', 'Garantia', 'Preço Unit.', 'Status', '']
              ).map((h, i) => (
                <th key={i} style={{ padding: '8px 12px', color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${C.darkBorder}30`, opacity: item.ativo ? 1 : 0.45 }}>
                <td style={{ padding: '10px 12px' }}>
                  <p style={{ color: C.text, fontWeight: 600, fontSize: 13, margin: '0 0 2px' }}>{item.modelo}</p>
                  <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>{item.fabricante}</p>
                </td>
                {isModulos ? (
                  <>
                    <td style={{ padding: '10px 12px', color: C.solar, fontWeight: 700 }}>{item.potenciaWp} Wp</td>
                    <td style={{ padding: '10px 12px', color: C.textDim }}>{item.eficiencia ? `${item.eficiencia}%` : '—'}</td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: `${C.accent}15`, color: C.accent, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{item.tipo}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: C.solar, fontWeight: 700 }}>{item.potenciaW >= 1000 ? `${(item.potenciaW/1000).toFixed(1)} kW` : `${item.potenciaW} W`}</td>
                  </>
                )}
                <td style={{ padding: '10px 12px', color: C.green }}>{item.garantiaAnos ? `${item.garantiaAnos} anos` : '—'}</td>
                <td style={{ padding: '10px 12px', color: C.textDim }}>{item.precoUnitario ? `R$ ${Number(item.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: '2px 8px', background: item.ativo ? `${C.green}15` : `${C.darkBorder}40`, color: item.ativo ? C.green : C.textMuted }}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => abrirEditar(item)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.accent}40`, background: `${C.accent}10`, color: C.accent, cursor: 'pointer', fontSize: 11 }}>✏</button>
                    <button onClick={() => isModulos ? toggleModulo.mutate({ id: item.id, ativo: !item.ativo }) : toggleInversor.mutate({ id: item.id, ativo: !item.ativo })} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.darkBorder}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', fontSize: 11 }}>
                      {item.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => { if (confirm('Excluir este item?')) isModulos ? deleteModulo.mutate({ id: item.id }) : deleteInversor.mutate({ id: item.id }) }} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid #EF444440`, background: '#EF444410', color: '#EF4444', cursor: 'pointer', fontSize: 11 }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── LAYOUT DA CONFIGURAÇÃO ───────────────────────────────────────────────────

export function ConfiguracoesPage() {
  const navigate = useNavigate()
  const path = window.location.pathname.split('/configuracoes/')[1] ?? ''

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 200, borderRight: `1px solid ${C.darkBorder}`, padding: '20px 12px', flexShrink: 0 }}>
        {CONFIG_ABAS.map(a => {
          const isActive = a.path === '' ? path === '' || path === undefined : path?.startsWith(a.path)
          return (
            <button key={a.path}
              onClick={() => navigate(a.path ? `/configuracoes/${a.path}` : '/configuracoes')}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isActive ? `${C.solar}15` : 'transparent',
                color: isActive ? C.solar : C.textMuted,
                textAlign: 'left', fontSize: 13, fontWeight: isActive ? 600 : 400, marginBottom: 3,
              }}
            >
              {a.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <Routes>
          <Route path=""          element={<AbaEmpresa />} />
          <Route path="premissas" element={<AbaPremissas />} />
          <Route path="textos"    element={<AbaTextos />} />
          <Route path="blocos"    element={<AbaBlocos />} />
          <Route path="usuarios"  element={<AbaUsuarios />} />
          <Route path="catalogo"  element={<AbaCatalogo />} />
        </Routes>
      </div>
    </div>
  )
}
