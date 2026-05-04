
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatCurrency } from '../../lib/utils'
import { Btn, Input, Select, Card, Spinner, C, PageWrapper } from '../../components/ui'

const TOPOLOGIA_OPTIONS = [
  { value: 'microinversor', label: 'Microinversor (recomendado)' },
  { value: 'tradicional', label: 'Tradicional (String)' },
  { value: 'otimizador', label: 'Otimizador de Potência' },
]

const TELHADO_OPTIONS = [
  { value: 'ceramico', label: 'Cerâmico' },
  { value: 'fibrocimento', label: 'Fibrocimento' },
  { value: 'metalico', label: 'Metálico' },
  { value: 'laje', label: 'Laje' },
  { value: 'shingle', label: 'Shingle' },
  { value: 'carport', label: 'Carport' },
  { value: 'zipado', label: 'Zipado (Standing Seam)' },
  { value: 'solo', label: 'Solo' },
]

const hoje = new Date().toISOString().split('T')[0]
const validade = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]

const FORM_INICIAL = {
  clienteId: '', dataEmissao: hoje, dataValidade: validade,
  modoCalculo: 'kwh', potenciaKwpManual: 0, consumoMensalKwh: 0,
  sobredimensionamento: 50, topologia: 'microinversor', tipoTelhado: 'ceramico',
  desvioAzimutal: 0, inclinacaoGraus: 20,
  fabricanteModulo: '', modeloModulo: '', potenciaModuloWp: 620, quantidadeModulosManual: 0,
  fabricanteInversor: '', modeloInversor: '', potenciaInversorKw: 0,
  overloadInversor: 0, entradasPorMicro: 1, quantidadeInversoresManual: 0,
  custoKitFotovoltaico: 0, comissao: 0, descontoAvista: 0,
  marcoParcelas: [
    { descricao: 'Entrada — assinatura do contrato', percentual: 50, prazoDias: 2, tipoPrazo: 'uteis' },
    { descricao: '2ª parcela — entrega dos equipamentos', percentual: 20, prazoDias: 2, tipoPrazo: 'uteis' },
    { descricao: '3ª parcela — conclusão dos serviços', percentual: 20, prazoDias: 2, tipoPrazo: 'uteis' },
    { descricao: '4ª parcela — 28 dias corridos após 3ª', percentual: 10, prazoDias: 28, tipoPrazo: 'corridos' },
  ],
  observacoes: '',
}

const STEPS = ['Cliente', 'Dados Técnicos', 'Precificação']

export function NovaPropostaPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(FORM_INICIAL)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { data: clientes } = trpc.cliente.list.useQuery({ porPagina: 200 })

  const { data: sizingPreview, isLoading: loadingSizing } = trpc.calculo.sizing.useQuery(
    {
      consumoMedioMensalKwh: form.modoCalculo === 'kwh' ? form.consumoMensalKwh : undefined,
      potenciaFinalKwpManual: form.modoCalculo === 'kwp' ? form.potenciaKwpManual : undefined,
      topologia: form.topologia, tipoTelhado: form.tipoTelhado,
      desvioAzimutal: form.desvioAzimutal, inclinacaoGraus: form.inclinacaoGraus,
      sobredimensionamento: form.sobredimensionamento, empresaId: 1,
    },
    {
      enabled: step >= 2 && (
        (form.modoCalculo === 'kwh' && form.consumoMensalKwh > 0) ||
        (form.modoCalculo === 'kwp' && form.potenciaKwpManual > 0)
      ),
    }
  )

  const createMutation = trpc.proposta.create.useMutation({
    onSuccess: (data) => navigate(`/propostas/${data.propostaId}`),
  })

  const handleCreate = () => {
    if (!form.clienteId || form.custoKitFotovoltaico <= 0) return
    createMutation.mutate({
      clienteId: Number(form.clienteId),
      faturaId: undefined,
      consumoMedioMensalKwh: form.modoCalculo === 'kwh' ? form.consumoMensalKwh : undefined,
      potenciaFinalKwpManual: form.modoCalculo === 'kwp' ? form.potenciaKwpManual : undefined,
      topologia: form.topologia, tipoTelhado: form.tipoTelhado,
      desvioAzimutal: form.desvioAzimutal, inclinacaoGraus: form.inclinacaoGraus,
      sobredimensionamento: form.sobredimensionamento,
      custoKitFotovoltaico: form.custoKitFotovoltaico, comissao: form.comissao,
      dataEmissao: form.dataEmissao, dataValidade: form.dataValidade,
      fabricanteModulo: form.fabricanteModulo || undefined,
      modeloModulo: form.modeloModulo || undefined,
      potenciaModuloWp: form.potenciaModuloWp,
      quantidadeModulosManual: form.quantidadeModulosManual || undefined,
      fabricanteInversor: form.fabricanteInversor || undefined,
      modeloInversor: form.modeloInversor || undefined,
      potenciaInversorKw: form.potenciaInversorKw || undefined,
      overloadInversor: form.overloadInversor || 0,
      entradasPorMicro: form.entradasPorMicro || 1,
      quantidadeInversoresManual: form.quantidadeInversoresManual || undefined,
      observacoesInternas: form.observacoes || undefined,
      descontoAvista: form.descontoAvista || undefined,
      marcoParcelas: form.marcoParcelas,
    })
  }

  const clienteOptions = [
    { value: '', label: 'Selecione o cliente...' },
    ...(clientes?.data ?? []).map(c => ({ value: String(c.id), label: c.nome })),
  ]

  const StepBar = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {STEPS.map((s, i) => {
        const n = i + 1, done = step > n, active = step === n
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: done ? C.green : active ? C.solar : C.darkBorder, color: done || active ? '#fff' : C.textDim }}>
                {done ? '✓' : n}
              </div>
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

      <Card style={{ padding: '28px 32px', maxWidth: 820 }}>
        <StepBar />

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Selecione o Cliente</h3>
            <Select label="Cliente *" options={clienteOptions} value={form.clienteId} onChange={e => set('clienteId', e.target.value)} />
            {form.clienteId && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Input label="Data de Emissão" type="date" value={form.dataEmissao} onChange={e => set('dataEmissao', e.target.value)} />
                <Input label="Data de Validade" type="date" value={form.dataValidade} onChange={e => set('dataValidade', e.target.value)} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn disabled={!form.clienteId} onClick={() => setStep(2)}>Próximo →</Btn>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Dados Técnicos do Sistema</h3>

            <div>
              <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>Como dimensionar?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { value: 'kwh', label: '⚡ Por Consumo (kWh/mês)', desc: 'Informa o consumo médio e o sistema calcula a potência' },
                  { value: 'kwp', label: '☀️ Por Potência (kWp)', desc: 'Informa diretamente a potência desejada do sistema' },
                ].map(opt => (
                  <div key={opt.value} onClick={() => set('modoCalculo', opt.value)} style={{ flex: 1, padding: '14px 16px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${form.modoCalculo === opt.value ? C.solar : C.darkBorder}`, background: form.modoCalculo === opt.value ? `${C.solar}10` : C.dark }}>
                    <p style={{ color: form.modoCalculo === opt.value ? C.solar : C.text, fontWeight: 600, fontSize: 13, margin: '0 0 4px' }}>{opt.label}</p>
                    <p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {form.modoCalculo === 'kwh' ? (
              <div>
                <Input label="Consumo Médio Mensal (kWh) *" type="number" value={form.consumoMensalKwh || ''} onChange={e => set('consumoMensalKwh', Number(e.target.value))} placeholder="Ex: 1500" />
                <p style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>Consumo médio dos últimos 12 meses ou valor atual da conta de energia</p>
              </div>
            ) : (
              <div>
                <Input label="Potência do Sistema (kWp) *" type="number" value={form.potenciaKwpManual || ''} onChange={e => set('potenciaKwpManual', Number(e.target.value))} placeholder="Ex: 10.5" />
                <p style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>Potência total desejada para o sistema fotovoltaico</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Select label="Topologia" options={TOPOLOGIA_OPTIONS} value={form.topologia} onChange={e => set('topologia', e.target.value)} />
              <Select label="Tipo de Telhado" options={TELHADO_OPTIONS} value={form.tipoTelhado} onChange={e => set('tipoTelhado', e.target.value)} />
              <Input label="Desvio Azimutal (°)" type="number" value={form.desvioAzimutal} onChange={e => set('desvioAzimutal', Number(e.target.value))} suffix="°" />
              <Input label="Inclinação (°)" type="number" value={form.inclinacaoGraus} onChange={e => set('inclinacaoGraus', Number(e.target.value))} suffix="°" />
            </div>

            <div>
              <label style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>
                Sobredimensionamento (50% a 80%)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="range" min={50} max={80} step={5} value={form.sobredimensionamento} onChange={e => set('sobredimensionamento', Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ color: C.solar, fontWeight: 700, fontSize: 16, minWidth: 40, fontFamily: 'monospace' }}>{form.sobredimensionamento}%</span>
              </div>
            </div>

            {loadingSizing && <div style={{ textAlign: 'center', padding: 20 }}><Spinner /></div>}
            {sizingPreview && !loadingSizing && (
              <div style={{ background: `${C.green}10`, borderRadius: 10, padding: '14px 18px', border: `1px solid ${C.green}30` }}>
                <p style={{ color: C.green, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 10px' }}>Preview do Dimensionamento</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Potência Final', value: `${Number(sizingPreview.potenciaFinalKwp).toFixed(2)} kWp`, color: C.solar },
                    { label: 'Geração Anual', value: `${Number(sizingPreview.geracaoAnualKwh).toLocaleString('pt-BR')} kWh`, color: C.green },
                    { label: 'Área Estimada', value: `${Number(sizingPreview.areaEstimadaM2).toFixed(0)} m²`, color: C.text },
                    { label: '% Compensação', value: `${Number(sizingPreview.percentualCompensacao).toFixed(0)}%`, color: C.accent },
                  ].map(k => (
                    <div key={k.label} style={{ textAlign: 'center' }}>
                      <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', margin: '0 0 2px' }}>{k.label}</p>
                      <p style={{ color: k.color, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>{k.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: `1px solid ${C.darkBorder}`, paddingTop: 16 }}>
              <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>Módulos Fotovoltaicos</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px 110px', gap: 12, marginBottom: 16 }}>
                <Input label="Fabricante" value={form.fabricanteModulo} onChange={e => set('fabricanteModulo', e.target.value)} placeholder="Ex: JA Solar" />
                <Input label="Modelo" value={form.modeloModulo} onChange={e => set('modeloModulo', e.target.value)} placeholder="Ex: JAM72S30-620" />
                <Input label="Potência (Wp)" type="number" value={form.potenciaModuloWp || ''} onChange={e => set('potenciaModuloWp', Number(e.target.value))} placeholder="620" />
                <Input label="Qtd. Manual" type="number" value={form.quantidadeModulosManual || ''} onChange={e => set('quantidadeModulosManual', Number(e.target.value))} placeholder="Auto" />
              </div>

              <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>
                {form.topologia === 'microinversor' ? 'Microinversores' : 'Inversores'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px 110px', gap: 12 }}>
                <Input label="Fabricante" value={form.fabricanteInversor} onChange={e => set('fabricanteInversor', e.target.value)} placeholder="Ex: Sungrow" />
                <Input label="Modelo" value={form.modeloInversor} onChange={e => set('modeloInversor', e.target.value)} placeholder="Ex: SG5.0RT" />
                <Input label={form.topologia === 'microinversor' ? 'Potência (Wp)' : 'Potência (kW)'} type="number" value={form.potenciaInversorKw || ''} onChange={e => set('potenciaInversorKw', Number(e.target.value))} placeholder={form.topologia === 'microinversor' ? '2000' : '12'} />
                {form.topologia === 'microinversor' ? (
                  <div>
                    <Input label="Entradas/Micro" type="number" value={form.entradasPorMicro || ''} onChange={e => set('entradasPorMicro', Number(e.target.value))} placeholder="1" />
                    {sizingPreview && form.entradasPorMicro > 0 && (
                      <p style={{ color: C.textDim, fontSize: 11, margin: '2px 0 0' }}>Auto: {Math.ceil(sizingPreview.quantidadeModulosAproximada / form.entradasPorMicro)}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Input label="Overload (%)" type="number" value={form.overloadInversor || ''} onChange={e => set('overloadInversor', Number(e.target.value))} placeholder="Ex: 80" />
                    {form.potenciaInversorKw > 0 && form.overloadInversor > 0 && (
                      <p style={{ color: C.green, fontSize: 11, margin: '2px 0 0' }}>Cap: {(form.potenciaInversorKw * (1 + form.overloadInversor / 100)).toFixed(1)} kW</p>
                    )}
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

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Precificação e Condições</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Input label="Custo do Kit Fotovoltaico (R$) *" type="number" value={form.custoKitFotovoltaico || ''} onChange={e => set('custoKitFotovoltaico', Number(e.target.value))} placeholder="Ex: 18500" />
              <Input label="Comissão do Vendedor (%)" type="number" value={form.comissao || ''} onChange={e => set('comissao', Number(e.target.value))} placeholder="0" suffix="%" />
            </div>

            {form.custoKitFotovoltaico > 0 && (
              <div style={{ background: `${C.solar}10`, borderRadius: 10, padding: '14px 18px', border: `1px solid ${C.solar}30` }}>
                <p style={{ color: C.solar, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 10px' }}>Estimativa com Margem de 33%</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div>
                    <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', margin: '0 0 2px' }}>Custo Total</p>
                    <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{formatCurrency(form.custoKitFotovoltaico)}</p>
                  </div>
                  <div>
                    <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', margin: '0 0 2px' }}>Preço de Venda</p>
                    <p style={{ color: C.solar, fontSize: 14, fontWeight: 700, margin: 0 }}>{formatCurrency(form.custoKitFotovoltaico * 1.33)}</p>
                  </div>
                  {sizingPreview && (
                    <div>
                      <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', margin: '0 0 2px' }}>Payback Est.</p>
                      <p style={{ color: C.green, fontSize: 14, fontWeight: 700, margin: 0 }}>~{Math.round((form.custoKitFotovoltaico * 1.33) / Number(sizingPreview.economiaMensalEstimada))} meses</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ background: C.dark, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.darkBorder}` }}>
              <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>💰 Desconto à Vista</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="number" min={0} max={30} value={form.descontoAvista || ''} onChange={e => set('descontoAvista', Number(e.target.value))} placeholder="0"
                  style={{ width: 80, padding: '8px 10px', borderRadius: 7, background: C.darkCard, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none' }} />
                <span style={{ color: C.textMuted }}>%</span>
                {form.descontoAvista > 0 && form.custoKitFotovoltaico > 0 && (
                  <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>→ {formatCurrency(form.custoKitFotovoltaico * 1.33 * (1 - form.descontoAvista / 100))}</span>
                )}
              </div>
            </div>

            <div style={{ background: C.dark, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.darkBorder}` }}>
              <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>📋 Parcelamento por Marcos</p>
              {form.marcoParcelas.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 90px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input value={p.descricao} onChange={e => { const n = [...form.marcoParcelas]; n[i] = { ...n[i], descricao: e.target.value }; set('marcoParcelas', n) }}
                    style={{ padding: '6px 10px', borderRadius: 7, background: C.darkCard, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <input type="number" min={1} max={100} value={p.percentual} onChange={e => { const n = [...form.marcoParcelas]; n[i] = { ...n[i], percentual: Number(e.target.value) }; set('marcoParcelas', n) }}
                      style={{ width: '100%', padding: '6px 6px', borderRadius: 7, background: C.darkCard, border: `1px solid ${C.darkBorder}`, color: C.solar, fontSize: 13, fontWeight: 700, outline: 'none' }} />
                    <span style={{ color: C.textDim, fontSize: 10 }}>%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <input type="number" min={0} value={p.prazoDias} onChange={e => { const n = [...form.marcoParcelas]; n[i] = { ...n[i], prazoDias: Number(e.target.value) }; set('marcoParcelas', n) }}
                      style={{ width: '100%', padding: '6px 6px', borderRadius: 7, background: C.darkCard, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none' }} />
                    <span style={{ color: C.textDim, fontSize: 10 }}>d</span>
                  </div>
                  <select value={p.tipoPrazo} onChange={e => { const n = [...form.marcoParcelas]; n[i] = { ...n[i], tipoPrazo: e.target.value }; set('marcoParcelas', n) }}
                    style={{ padding: '6px 6px', borderRadius: 7, background: C.darkCard, border: `1px solid ${C.darkBorder}`, color: C.textMuted, fontSize: 11, outline: 'none' }}>
                    <option value="uteis">úteis</option>
                    <option value="corridos">corridos</option>
                  </select>
                </div>
              ))}
              <div style={{ textAlign: 'right', paddingTop: 6, borderTop: `1px solid ${C.darkBorder}` }}>
                {(() => { const total = form.marcoParcelas.reduce((s, p) => s + p.percentual, 0); return <span style={{ fontSize: 12, fontWeight: 700, color: total === 100 ? C.green : C.danger }}>Total: {total}% {total !== 100 ? '⚠ deve ser 100%' : '✓'}</span> })()}
              </div>
            </div>

            <div>
              <label style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Observações</label>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3}
                placeholder="Informações adicionais ou peculiaridades da instalação..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {createMutation.error && (
              <div style={{ background: '#3A1A1A', border: `1px solid ${C.danger}`, borderRadius: 8, padding: '10px 14px', color: C.danger, fontSize: 13 }}>
                {createMutation.error.message}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setStep(2)}>← Voltar</Btn>
              <Btn onClick={handleCreate} disabled={form.custoKitFotovoltaico <= 0 || createMutation.isPending}>
                {createMutation.isPending ? '⏳ Criando...' : '✓ Criar Proposta'}
              </Btn>
            </div>
          </div>
        )}
      </Card>
    </PageWrapper>
  )
}
