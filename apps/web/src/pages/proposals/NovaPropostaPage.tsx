import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatCurrency } from '../../lib/utils'
import { Btn, Input, Select, Card, Spinner, C, PageWrapper } from '../../components/ui'
import { useIsMobile } from '../../hooks/useIsMobile'

// ─── AUTOCOMPLETE DE CLIENTE ────────────────────────────────────────
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

// ─── SELETOR DO CATÁLOGO ─────────────────────────────────────────────
function CatalogoSelect({ label, itens, onSelect, cor }: {
  label: string
  itens: { id: number; fabricante: string; modelo: string; potenciaWp?: number; potenciaW?: number; tipo?: string; garantiaAnos?: number }[]
  onSelect: (item: any) => void
  cor?: string
}) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const c = cor ?? C.accent

  const filtrados = busca.length >= 1
    ? itens.filter(i => `${i.fabricante} ${i.modelo}`.toLowerCase().includes(busca.toLowerCase())).slice(0, 6)
    : itens.slice(0, 6)

  if (itens.length === 0) return null

  return (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      <label style={{ display: 'block', color: C.textDim, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        📦 {label} <span style={{ color: c, fontWeight: 700 }}>— selecionar do catálogo</span>
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: 12, pointerEvents: 'none' }}>🔍</span>
        <input
          value={busca}
          onChange={e => { setBusca(e.target.value); setAberto(true) }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          placeholder={`Buscar ${label.toLowerCase()} cadastrado...`}
          style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: 8, background: `${c}08`, border: `1px solid ${c}30`, color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      {aberto && filtrados.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60, background: C.darkCard, border: `1px solid ${C.darkBorder}`, borderRadius: 10, marginTop: 3, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {filtrados.map(item => (
            <div key={item.id} onMouseDown={() => { onSelect(item); setBusca(''); setAberto(false) }}
              style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.darkBorder}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = `${c}10`)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div>
                <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: '0 0 1px' }}>{item.modelo}</p>
                <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>{item.fabricante}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: c, fontSize: 12, fontWeight: 700, margin: '0 0 1px' }}>
                  {item.potenciaWp ? `${item.potenciaWp} Wp` : item.potenciaW ? `${item.potenciaW >= 1000 ? `${(item.potenciaW/1000).toFixed(1)} kW` : `${item.potenciaW} W`}` : ''}
                </p>
                {item.tipo && <p style={{ color: C.textDim, fontSize: 10, margin: 0 }}>{item.tipo}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CONSTANTES ─────────────────────────────────────────────────────
const TOPOLOGIA_OPTIONS = [
  { value: 'microinversor', label: 'Microinversor (recomendado)' },
  { value: 'tradicional',   label: 'Tradicional (String)'        },
  { value: 'otimizador',    label: 'Otimizador de Potência'       },
]
const TELHADO_OPTIONS = [
  { value: 'ceramico',     label: 'Cerâmico'              },
  { value: 'fibrocimento', label: 'Fibrocimento'           },
  { value: 'metalico',     label: 'Metálico'               },
  { value: 'laje',         label: 'Laje'                   },
  { value: 'shingle',      label: 'Shingle'                },
  { value: 'carport',      label: 'Carport'                },
  { value: 'zipado',       label: 'Zipado (Standing Seam)' },
  { value: 'solo',         label: 'Solo'                   },
]

const hoje     = new Date().toISOString().split('T')[0]
const validade = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]

const MARCOES_PADRAO = [
  { descricao: 'Entrada — assinatura do contrato',      percentual: 50, prazoDias: 2,  tipoPrazo: 'uteis'    },
  { descricao: '2ª parcela — entrega dos equipamentos', percentual: 20, prazoDias: 2,  tipoPrazo: 'uteis'    },
  { descricao: '3ª parcela — conclusão dos serviços',   percentual: 20, prazoDias: 2,  tipoPrazo: 'uteis'    },
  { descricao: '4ª parcela — 28 dias corridos após 3ª', percentual: 10, prazoDias: 28, tipoPrazo: 'corridos' },
]

const FORM_INICIAL = {
  clienteId: '', dataEmissao: hoje, dataValidade: validade,
  modoCalculo: 'kwh', potenciaKwpManual: 0, consumoMensalKwh: 0,
  sobredimensionamento: 50, topologia: 'microinversor', tipoTelhado: 'ceramico',
  desvioAzimutal: 0, inclinacaoGraus: 20,
  fabricanteModulo: '', modeloModulo: '', potenciaModuloWp: 620, quantidadeModulosManual: 0,
  fabricanteInversor: '', modeloInversor: '', potenciaInversorKw: 0,
  overloadInversor: 0, entradasPorMicro: 1, quantidadeInversoresManual: 0,
  custoKitFotovoltaico: 0, comissao: 0, descontoAvista: 0,
  marcoParcelas: MARCOES_PADRAO,
  observacoes: '',
}

const STEPS = ['Cliente', 'Dados Técnicos', 'Precificação']

function estimarCustosInstalacao(qtdModulos: number, qtdInversores: number) {
  const maoObraModulo = 70; const maoObraInversor = 150; const projeto = 800
  return { instModulos: qtdModulos * maoObraModulo, instInversor: qtdInversores * maoObraInversor, projeto, total: qtdModulos * maoObraModulo + qtdInversores * maoObraInversor + projeto }
}

export function NovaPropostaPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(FORM_INICIAL)
  const [mostrarParcelamento, setMostrarParcela] = useState(false)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const { data: clientes }   = trpc.cliente.list.useQuery({ porPagina: 200 }, { staleTime: 0 })
  const { data: catModulos } = trpc.equipamento.listModulos.useQuery({ apenasAtivos: true }, { enabled: step === 2 })
  const { data: catInversores } = trpc.equipamento.listInversores.useQuery({ apenasAtivos: true }, { enabled: step === 2 })

  const { data: sizingPreview, isLoading: loadingSizing } = trpc.calculo.sizing.useQuery(
    { consumoMedioMensalKwh: form.modoCalculo === 'kwh' ? form.consumoMensalKwh : undefined, potenciaFinalKwpManual: form.modoCalculo === 'kwp' ? form.potenciaKwpManual : undefined, topologia: form.topologia, tipoTelhado: form.tipoTelhado, desvioAzimutal: form.desvioAzimutal, inclinacaoGraus: form.inclinacaoGraus, sobredimensionamento: form.sobredimensionamento, empresaId: 1 },
    { enabled: step >= 2 && ((form.modoCalculo === 'kwh' && form.consumoMensalKwh > 0) || (form.modoCalculo === 'kwp' && form.potenciaKwpManual > 0)) }
  )

  const createMutation = trpc.proposta.create.useMutation({ onSuccess: (data: any) => navigate(`/propostas/${data.propostaId}`) })

  const handleCreate = () => {
    if (!form.clienteId || form.custoKitFotovoltaico <= 0) return
    createMutation.mutate({
      clienteId: Number(form.clienteId),
      consumoMedioMensalKwh: form.modoCalculo === 'kwh' ? form.consumoMensalKwh : undefined,
      potenciaFinalKwpManual: form.modoCalculo === 'kwp' ? form.potenciaKwpManual : undefined,
      topologia: form.topologia, tipoTelhado: form.tipoTelhado,
      desvioAzimutal: form.desvioAzimutal, inclinacaoGraus: form.inclinacaoGraus,
      sobredimensionamento: form.sobredimensionamento,
      custoKitFotovoltaico: form.custoKitFotovoltaico, comissao: form.comissao,
      dataEmissao: form.dataEmissao, dataValidade: form.dataValidade,
      fabricanteModulo: form.fabricanteModulo || undefined, modeloModulo: form.modeloModulo || undefined,
      potenciaModuloWp: form.potenciaModuloWp,
      quantidadeModulosManual: form.quantidadeModulosManual || undefined,
      fabricanteInversor: form.fabricanteInversor || undefined, modeloInversor: form.modeloInversor || undefined,
      potenciaInversorKw: form.potenciaInversorKw || undefined,
      overloadInversor: form.overloadInversor || 0, entradasPorMicro: form.entradasPorMicro || 1,
      quantidadeInversoresManual: form.quantidadeInversoresManual || undefined,
      observacoesInternas: form.observacoes || undefined, descontoAvista: form.descontoAvista || undefined,
      marcoParcelas: form.marcoParcelas,
    } as any)
  }

  const qtdModulos    = (sizingPreview as any)?.quantidadeModulosAproximada ?? 0
  const qtdInversores = form.topologia === 'microinversor' ? Math.ceil(qtdModulos / (form.entradasPorMicro || 1)) : sizingPreview ? 1 : 0
  const instEstimativa     = qtdModulos > 0 ? estimarCustosInstalacao(qtdModulos, qtdInversores) : null
  const custoTotalEstimado = form.custoKitFotovoltaico + (instEstimativa?.total ?? 0)
  const MARGEM_PADRAO      = 33
  const precoVendaEstimado = custoTotalEstimado * (1 + MARGEM_PADRAO / 100)
  const comissaoEstimada   = precoVendaEstimado * (form.comissao / 100)
  const precoFinalEstimado = precoVendaEstimado + comissaoEstimada

  const StepBar = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {STEPS.map((s, i) => {
        const n = i + 1, done = step > n, active = step === n
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: done ? C.green : active ? C.solar : C.darkBorder, color: done || active ? '#fff' : C.textDim }}>{done ? '✓' : n}</div>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? C.text : C.textMuted }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: done ? C.green : C.darkBorder, margin: '0 12px' }} />}
          </div>
        )
      })}
    </div>
  )

  return (
    <PageWrapper>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/propostas')} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 20 }}>←</button>
        <h2 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: 0 }}>Nova Proposta</h2>
      </div>

      <Card style={{ padding: isMobile ? '18px 16px' : '28px 32px', maxWidth: isMobile ? '100%' : 820 }}>
        <StepBar />

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Selecione o Cliente</h3>
            <ClienteAutocomplete clientes={clientes?.data ?? []} value={form.clienteId} onChange={id => set('clienteId', id)} />
            {form.clienteId && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <Input label="Data de Emissão"  type="date" value={form.dataEmissao}  onChange={(e: any) => set('dataEmissao',  e.target.value)} />
                <Input label="Data de Validade" type="date" value={form.dataValidade} onChange={(e: any) => set('dataValidade', e.target.value)} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn disabled={!form.clienteId} onClick={() => setStep(2)}>Próximo →</Btn>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Dados Técnicos do Sistema</h3>

            <div>
              <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>Como dimensionar?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ value: 'kwh', label: '⚡ Por Consumo (kWh/mês)', desc: 'Informa o consumo médio e o sistema calcula a potência' }, { value: 'kwp', label: '☀️ Por Potência (kWp)', desc: 'Informa diretamente a potência desejada do sistema' }].map(opt => (
                  <div key={opt.value} onClick={() => set('modoCalculo', opt.value)} style={{ flex: 1, padding: '14px 16px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${form.modoCalculo === opt.value ? C.solar : C.darkBorder}`, background: form.modoCalculo === opt.value ? `${C.solar}10` : C.dark }}>
                    <p style={{ color: form.modoCalculo === opt.value ? C.solar : C.text, fontWeight: 600, fontSize: 13, margin: '0 0 4px' }}>{opt.label}</p>
                    <p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {form.modoCalculo === 'kwh' ? (
              <div>
                <Input label="Consumo Médio Mensal (kWh) *" type="number" value={form.consumoMensalKwh || ''} onChange={(e: any) => set('consumoMensalKwh', Number(e.target.value))} placeholder="Ex: 1500" />
                <p style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>Consumo médio dos últimos 12 meses ou valor atual da conta de energia</p>
              </div>
            ) : (
              <div>
                <Input label="Potência do Sistema (kWp) *" type="number" value={form.potenciaKwpManual || ''} onChange={(e: any) => set('potenciaKwpManual', Number(e.target.value))} placeholder="Ex: 10.5" />
                <p style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>Potência total desejada para o sistema fotovoltaico</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <Select label="Topologia"       options={TOPOLOGIA_OPTIONS} value={form.topologia}   onChange={(e: any) => set('topologia',   e.target.value)} />
              <Select label="Tipo de Telhado" options={TELHADO_OPTIONS}   value={form.tipoTelhado} onChange={(e: any) => set('tipoTelhado', e.target.value)} />
              <Input label="Desvio Azimutal (°)" type="number" value={form.desvioAzimutal}  onChange={(e: any) => set('desvioAzimutal',  Number(e.target.value))} suffix="°" />
              <Input label="Inclinação (°)"       type="number" value={form.inclinacaoGraus} onChange={(e: any) => set('inclinacaoGraus', Number(e.target.value))} suffix="°" />
            </div>

            <div>
              <label style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>Sobredimensionamento (50% a 80%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="range" min={50} max={80} step={5} value={form.sobredimensionamento} onChange={(e: any) => set('sobredimensionamento', Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ color: C.solar, fontWeight: 700, fontSize: 16, minWidth: 40, fontFamily: 'monospace' }}>{form.sobredimensionamento}%</span>
              </div>
            </div>

            {loadingSizing && <div style={{ textAlign: 'center', padding: 20 }}><Spinner /></div>}
            {sizingPreview && !loadingSizing && (
              <div style={{ background: `${C.green}10`, borderRadius: 10, padding: '14px 18px', border: `1px solid ${C.green}30` }}>
                <p style={{ color: C.green, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 10px' }}>Preview do Dimensionamento</p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10 }}>
                  {[{ label: 'Potência Final', value: `${Number((sizingPreview as any).potenciaFinalKwp).toFixed(2)} kWp`, color: C.solar }, { label: 'Geração Anual', value: `${Number((sizingPreview as any).geracaoAnualKwh).toLocaleString('pt-BR')} kWh`, color: C.green }, { label: 'Área Estimada', value: `${Number((sizingPreview as any).areaEstimadaM2).toFixed(0)} m²`, color: C.text }, { label: '% Compensação', value: `${Number((sizingPreview as any).percentualCompensacao).toFixed(0)}%`, color: C.accent }].map((k: any) => (
                    <div key={k.label} style={{ textAlign: 'center' }}>
                      <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', margin: '0 0 2px' }}>{k.label}</p>
                      <p style={{ color: k.color, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>{k.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MÓDULOS ── */}
            <div style={{ borderTop: `1px solid ${C.darkBorder}`, paddingTop: 16 }}>
              <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>Módulos Fotovoltaicos</p>

              <CatalogoSelect
                label="Módulo"
                itens={catModulos ?? []}
                cor={C.solar}
                onSelect={m => setForm(f => ({ ...f, fabricanteModulo: m.fabricante, modeloModulo: m.modelo, potenciaModuloWp: m.potenciaWp ?? f.potenciaModuloWp }))}
              />

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 110px 110px', gap: 12, marginBottom: 16 }}>
                <Input label="Fabricante"    value={form.fabricanteModulo}        onChange={(e: any) => set('fabricanteModulo',       e.target.value)} placeholder="Ex: JA Solar" />
                <Input label="Modelo"        value={form.modeloModulo}            onChange={(e: any) => set('modeloModulo',           e.target.value)} placeholder="Ex: JAM72S30-620" />
                <Input label="Potência (Wp)" type="number" value={form.potenciaModuloWp || ''}        onChange={(e: any) => set('potenciaModuloWp',       Number(e.target.value))} placeholder="620" />
                <Input label="Qtd. Manual"   type="number" value={form.quantidadeModulosManual || ''} onChange={(e: any) => set('quantidadeModulosManual', Number(e.target.value))} placeholder="Auto" />
              </div>

              {/* ── INVERSORES ── */}
              <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>
                {form.topologia === 'microinversor' ? 'Microinversores' : 'Inversores'}
              </p>

              <CatalogoSelect
                label={form.topologia === 'microinversor' ? 'Microinversor' : 'Inversor'}
                itens={(catInversores ?? []).filter((i: any) => form.topologia === 'microinversor' ? i.tipo === 'microinversor' : i.tipo !== 'microinversor')}
                cor={C.accent}
                onSelect={inv => setForm(f => ({ ...f, fabricanteInversor: inv.fabricante, modeloInversor: inv.modelo, potenciaInversorKw: inv.potenciaW ? (form.topologia === 'microinversor' ? inv.potenciaW : inv.potenciaW / 1000) : f.potenciaInversorKw }))}
              />

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 110px 110px', gap: 12 }}>
                <Input label="Fabricante" value={form.fabricanteInversor} onChange={(e: any) => set('fabricanteInversor', e.target.value)} placeholder="Ex: Sungrow" />
                <Input label="Modelo"     value={form.modeloInversor}     onChange={(e: any) => set('modeloInversor',     e.target.value)} placeholder="Ex: SG5.0RT" />
                <Input label={form.topologia === 'microinversor' ? 'Potência (Wp)' : 'Potência (kW)'} type="number" value={form.potenciaInversorKw || ''} onChange={(e: any) => set('potenciaInversorKw', Number(e.target.value))} placeholder={form.topologia === 'microinversor' ? '2000' : '12'} />
                {form.topologia === 'microinversor' ? (
                  <div>
                    <Input label="Entradas/Micro" type="number" value={form.entradasPorMicro || ''} onChange={(e: any) => set('entradasPorMicro', Number(e.target.value))} placeholder="1" />
                    {sizingPreview && form.entradasPorMicro > 0 && <p style={{ color: C.textDim, fontSize: 11, margin: '2px 0 0' }}>Auto: {Math.ceil((sizingPreview as any).quantidadeModulosAproximada / form.entradasPorMicro)}</p>}
                  </div>
                ) : (
                  <div>
                    <Input label="Overload (%)" type="number" value={form.overloadInversor || ''} onChange={(e: any) => set('overloadInversor', Number(e.target.value))} placeholder="Ex: 80" />
                    {form.potenciaInversorKw > 0 && form.overloadInversor > 0 && <p style={{ color: C.green, fontSize: 11, margin: '2px 0 0' }}>Cap: {(form.potenciaInversorKw * (1 + form.overloadInversor / 100)).toFixed(1)} kW</p>}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setStep(1)}>← Voltar</Btn>
              <Btn disabled={(form.modoCalculo === 'kwh' && form.consumoMensalKwh <= 0) || (form.modoCalculo === 'kwp' && form.potenciaKwpManual <= 0)} onClick={() => setStep(3)}>Próximo →</Btn>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Precificação e Condições</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <div>
                <Input label="Custo do Kit Fotovoltaico (R$) *" type="number" value={form.custoKitFotovoltaico || ''} onChange={(e: any) => set('custoKitFotovoltaico', Number(e.target.value))} placeholder="Ex: 18500" />
                <p style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>Custo dos equipamentos (kit). Instalação e projeto são calculados automaticamente.</p>
              </div>
              <div>
                <Input label="Comissão do Vendedor (%)" type="number" value={form.comissao || ''} onChange={(e: any) => set('comissao', Number(e.target.value))} placeholder="0" suffix="%" />
                <p style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>Adicionada ao preço de venda. Deixe 0 se não houver comissão.</p>
              </div>
            </div>

            {form.custoKitFotovoltaico > 0 && (
              <div style={{ background: `${C.solar}10`, borderRadius: 10, padding: '16px 18px', border: `1px solid ${C.solar}30` }}>
                <p style={{ color: C.solar, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 12px' }}>Estimativa de Preço — Margem padrão de {MARGEM_PADRAO}%</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.textDim, fontSize: 12 }}>Custo do Kit</span><span style={{ color: C.text, fontSize: 12, fontFamily: 'monospace' }}>{formatCurrency(form.custoKitFotovoltaico)}</span></div>
                  {instEstimativa && (<>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.textDim, fontSize: 12 }}>Instalação estimada ({qtdModulos} mód. + {qtdInversores} inv.)</span><span style={{ color: C.textDim, fontSize: 12, fontFamily: 'monospace' }}>{formatCurrency(instEstimativa.instModulos + instEstimativa.instInversor)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.textDim, fontSize: 12 }}>Projeto de engenharia</span><span style={{ color: C.textDim, fontSize: 12, fontFamily: 'monospace' }}>{formatCurrency(instEstimativa.projeto)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.darkBorder}40`, paddingTop: 6 }}><span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>Custo Total Estimado</span><span style={{ color: C.text, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(custoTotalEstimado)}</span></div>
                  </>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.textDim, fontSize: 12 }}>Markup {MARGEM_PADRAO}%</span><span style={{ color: C.textDim, fontSize: 12, fontFamily: 'monospace' }}>+{formatCurrency(custoTotalEstimado * MARGEM_PADRAO / 100)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.textDim, fontSize: 12 }}>Preço de Venda</span><span style={{ color: C.text, fontSize: 12, fontFamily: 'monospace' }}>{formatCurrency(precoVendaEstimado)}</span></div>
                  {form.comissao > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.textDim, fontSize: 12 }}>Comissão {form.comissao}%</span><span style={{ color: C.textDim, fontSize: 12, fontFamily: 'monospace' }}>+{formatCurrency(comissaoEstimada)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.solar}40`, paddingTop: 6, marginTop: 2 }}><span style={{ color: C.solar, fontSize: 14, fontWeight: 700 }}>Preço Final Estimado</span><span style={{ color: C.solar, fontSize: 16, fontWeight: 800, fontFamily: 'monospace' }}>{formatCurrency(precoFinalEstimado)}</span></div>
                  <p style={{ color: C.textDim, fontSize: 10, margin: '4px 0 0', fontStyle: 'italic' }}>* Estimativa. A margem definitiva pode ser ajustada após criar a proposta.</p>
                </div>
              </div>
            )}

            <div style={{ background: C.dark, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.darkBorder}` }}>
              <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>💰 Desconto à Vista</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="number" min={0} max={30} value={form.descontoAvista || ''} onChange={(e: any) => set('descontoAvista', Number(e.target.value))} placeholder="0" style={{ width: 80, padding: '8px 10px', borderRadius: 7, background: C.darkCard, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none' }} />
                <span style={{ color: C.textMuted }}>%</span>
                {form.descontoAvista > 0 && form.custoKitFotovoltaico > 0 && <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>À vista: {formatCurrency(precoFinalEstimado * (1 - form.descontoAvista / 100))}</span>}
              </div>
              <p style={{ color: C.textDim, fontSize: 11, margin: '4px 0 0' }}>Aplicado apenas na condição de pagamento à vista.</p>
            </div>

            <div style={{ background: C.dark, borderRadius: 10, border: `1px solid ${C.darkBorder}` }}>
              <button onClick={() => setMostrarParcela(!mostrarParcelamento)} style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}>
                <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>📋 Parcelamento por Marcos</span>
                <span style={{ color: C.textMuted, fontSize: 12 }}>{mostrarParcelamento ? '▲ Recolher' : '▼ Personalizar (opcional)'}</span>
              </button>
              {!mostrarParcelamento && <div style={{ padding: '0 16px 14px' }}><p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>Padrão Atom Tech: 50% entrada · 20% entrega · 20% conclusão · 10% após 28 dias.</p></div>}
              {mostrarParcelamento && (
                <div style={{ padding: '0 16px 16px' }}>
                  {form.marcoParcelas.map((p: any, i: number) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 55px 55px' : '1fr 60px 60px 90px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <input value={p.descricao} onChange={(e: any) => { const n = [...form.marcoParcelas]; (n[i] as any) = { ...n[i], descricao: e.target.value }; set('marcoParcelas', n) }} style={{ padding: '6px 10px', borderRadius: 7, background: C.darkCard, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><input type="number" min={1} max={100} value={p.percentual} onChange={(e: any) => { const n = [...form.marcoParcelas]; (n[i] as any) = { ...n[i], percentual: Number(e.target.value) }; set('marcoParcelas', n) }} style={{ width: '100%', padding: '6px', borderRadius: 7, background: C.darkCard, border: `1px solid ${C.darkBorder}`, color: C.solar, fontSize: 13, fontWeight: 700, outline: 'none' }} /><span style={{ color: C.textDim, fontSize: 10 }}>%</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><input type="number" min={0} value={p.prazoDias} onChange={(e: any) => { const n = [...form.marcoParcelas]; (n[i] as any) = { ...n[i], prazoDias: Number(e.target.value) }; set('marcoParcelas', n) }} style={{ width: '100%', padding: '6px', borderRadius: 7, background: C.darkCard, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none' }} /><span style={{ color: C.textDim, fontSize: 10 }}>d</span></div>
                      <select value={p.tipoPrazo} onChange={(e: any) => { const n = [...form.marcoParcelas]; (n[i] as any) = { ...n[i], tipoPrazo: e.target.value }; set('marcoParcelas', n) }} style={{ padding: '6px', borderRadius: 7, background: C.darkCard, border: `1px solid ${C.darkBorder}`, color: C.textMuted, fontSize: 11, outline: 'none' }}><option value="uteis">úteis</option><option value="corridos">corridos</option></select>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', paddingTop: 6, borderTop: `1px solid ${C.darkBorder}` }}>
                    {(() => { const total = form.marcoParcelas.reduce((s: number, p: any) => s + p.percentual, 0); return <span style={{ fontSize: 12, fontWeight: 700, color: total === 100 ? C.green : C.danger }}>Total: {total}% {total !== 100 ? '⚠ deve ser 100%' : '✓'}</span> })()}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Observações</label>
              <textarea value={form.observacoes} onChange={(e: any) => set('observacoes', e.target.value)} rows={2} placeholder="Informações adicionais ou peculiaridades da instalação..." style={{ width: '100%', padding: '10px 14px', borderRadius: 9, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {createMutation.error && <div style={{ background: '#3A1A1A', border: `1px solid ${C.danger}`, borderRadius: 8, padding: '10px 14px', color: C.danger, fontSize: 13 }}>{(createMutation.error as any).message}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setStep(2)}>← Voltar</Btn>
              <Btn onClick={handleCreate} disabled={form.custoKitFotovoltaico <= 0 || createMutation.isLoading}>{createMutation.isLoading ? '⏳ Criando...' : '✓ Criar Proposta'}</Btn>
            </div>
          </div>
        )}
      </Card>
    </PageWrapper>
  )
}