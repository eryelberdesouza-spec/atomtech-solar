import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import {
  formatCurrency, formatKwh, formatKwp,
  formatPayback, formatDate, formatPct,
} from '../../lib/utils'
import {
  Btn, Badge, Card, Tabs, Spinner, Toggle,
  EmptyState, PageWrapper, C, Input,
} from '../../components/ui'
import { abrirPdfNoNavegador } from '../../lib/gerarPdfBrowser'

const TABS = [
  { id: 'dimensionamento', label: 'Dimensionamento' },
  { id: 'financeiro',      label: 'AnÃ¡lise Financeira' },
  { id: 'precificacao',    label: 'PrecificaÃ§Ã£o' },
  { id: 'pagamento',       label: 'CondiÃ§Ãµes Comerciais' },
  { id: 'blocos',          label: 'Blocos da Proposta' },
]

function TabDimensionamento({ dim, equips, propostaId }: any) {
  const utils = trpc.useUtils()
  const updateDim = trpc.proposta.updateDimensionamento.useMutation({
    onSuccess: () => { utils.proposta.byId.invalidate({ id: propostaId }); setEditando(false) },
    onError: (e) => alert('Erro: ' + e.message),
  })

  const modulo = equips?.find((e: any) => e.tipo === 'modulo')
  const inversor = equips?.find((e: any) => e.tipo === 'inversor' || e.tipo === 'microinversor')

  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({
    potenciaFinalKwp: Number(dim?.potenciaFinalKwp ?? 0),
    quantidadeModulos: modulo?.quantidade ?? 0,
    fabricanteModulo: modulo?.fabricante ?? '',
    modeloModulo: modulo?.modelo ?? '',
    potenciaModuloWp: modulo?.potenciaWp ?? 620,
    quantidadeInversores: inversor?.quantidade ?? 0,
    fabricanteInversor: inversor?.fabricante ?? '',
    modeloInversor: inversor?.modelo ?? '',
    potenciaInversorWp: inversor?.potenciaWp ?? 0,
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  if (!dim) return <EmptyState icon="â˜€ï¸" title="Dimensionamento nÃ£o calculado" />

  const kpis = [
    { label: 'PotÃªncia Final',    value: formatKwp(dim.potenciaFinalKwp),           color: C.solar },
    { label: 'PotÃªncia Recom.',   value: formatKwp(dim.potenciaRecomendadaKwp),     color: C.textMuted },
    { label: 'GeraÃ§Ã£o Anual',     value: formatKwh(dim.geracaoAnualKwh),            color: C.green },
    { label: 'GeraÃ§Ã£o/MÃªs',       value: formatKwh(Number(dim.geracaoAnualKwh)/12), color: C.green },
    { label: 'Ãrea Estimada',     value: `${Number(dim.areaEstimadaM2).toFixed(1)} mÂ²`, color: C.accent },
    { label: '% CompensaÃ§Ã£o',     value: formatPct(dim.percentualCompensacao),      color: C.success },
    { label: 'MÃ³dulos',           value: dim.quantidadeModulos ?? 'â€”',              color: C.text },
    { label: 'Economia/MÃªs Est.', value: formatCurrency(dim.economiaMensalEstimada), color: C.solar },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: C.dark, borderRadius: 10, padding: '12px 16px', border: `1px solid ${C.darkBorder}` }}>
            <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>{k.label}</p>
            <p style={{ color: k.color, fontSize: 17, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>{k.value}</p>
          </div>
        ))}
      </div>

      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>ParÃ¢metros TÃ©cnicos</p>
          <Btn size="sm" variant="ghost" onClick={() => setEditando(!editando)}>{editando ? 'âœ– Cancelar' : 'âœï¸ Editar'}</Btn>
        </div>
        {!editando ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              ['Topologia', dim.topologia], ['Tipo de Sistema', dim.tipoSistema?.replace('_', ' ')],
              ['Tipo de Telhado', dim.tipoTelhado], ['Desvio Azimutal', `${dim.desvioAzimutal ?? 0}Â°`],
              ['InclinaÃ§Ã£o', `${dim.inclinacaoGraus ?? 0}Â°`],
              ['Tarifa Usada', dim.tarifaUsada ? `R$ ${Number(dim.tarifaUsada).toFixed(4)}/kWh` : 'â€”'],
            ].map(([k, v]) => (
              <div key={k} style={{ borderBottom: `1px solid ${C.darkBorder}`, paddingBottom: 8 }}>
                <span style={{ color: C.textDim, fontSize: 11 }}>{k}: </span>
                <span style={{ color: C.text, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{v ?? 'â€”'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="PotÃªncia Final (kWp)" type="number" value={form.potenciaFinalKwp} onChange={e => set('potenciaFinalKwp', Number(e.target.value))} />
              <Input label="Qtd. MÃ³dulos" type="number" value={form.quantidadeModulos} onChange={e => set('quantidadeModulos', Number(e.target.value))} />
            </div>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: '4px 0 0' }}>MÃ³dulos</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 12 }}>
              <Input label="Fabricante" value={form.fabricanteModulo} onChange={e => set('fabricanteModulo', e.target.value)} placeholder="Ex: JA Solar" />
              <Input label="Modelo" value={form.modeloModulo} onChange={e => set('modeloModulo', e.target.value)} placeholder="Ex: JAM72S30-620" />
              <Input label="PotÃªncia (Wp)" type="number" value={form.potenciaModuloWp} onChange={e => set('potenciaModuloWp', Number(e.target.value))} />
            </div>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: '4px 0 0' }}>Inversores / Microinversores</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px', gap: 12 }}>
              <Input label="Fabricante" value={form.fabricanteInversor} onChange={e => set('fabricanteInversor', e.target.value)} placeholder="Ex: Sungrow" />
              <Input label="Modelo" value={form.modeloInversor} onChange={e => set('modeloInversor', e.target.value)} placeholder="Ex: SG5.0RT" />
              <Input label="PotÃªncia (Wp)" type="number" value={form.potenciaInversorWp} onChange={e => set('potenciaInversorWp', Number(e.target.value))} />
              <Input label="Quantidade" type="number" value={form.quantidadeInversores} onChange={e => set('quantidadeInversores', Number(e.target.value))} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setEditando(false)}>Cancelar</Btn>
              <Btn onClick={() => updateDim.mutate({ propostaId, ...form })} disabled={updateDim.isPending}>
                {updateDim.isPending ? 'â³ Salvando...' : 'âœ” Salvar AlteraÃ§Ãµes'}
              </Btn>
            </div>
          </div>
        )}
      </Card>

      {equips?.length > 0 && !editando && (
        <Card style={{ padding: '16px 20px' }}>
          <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>Equipamentos</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.dark }}>
                {['Tipo', 'Fabricante / Modelo', 'Qtd.', 'PotÃªncia', 'Garantia'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equips.map((eq: any) => (
                <tr key={eq.id} style={{ borderTop: `1px solid ${C.darkBorder}` }}>
                  <td style={{ padding: '10px 12px', color: C.text, fontWeight: 600 }}>{eq.tipo === 'modulo' ? 'MÃ³dulos Fotovoltaicos' : eq.tipo === 'microinversor' ? 'Microinversor(es)' : 'Inversor(es)'}</td>
                  <td style={{ padding: '10px 12px', color: C.textMuted }}>{[eq.fabricante, eq.modelo].filter(Boolean).join(' â€” ') || 'â€”'}</td>
                  <td style={{ padding: '10px 12px', color: C.solar, fontWeight: 700 }}>{eq.quantidade}</td>
                  <td style={{ padding: '10px 12px', color: C.text }}>{eq.potenciaWp ? `${eq.tipo === 'modulo' ? eq.potenciaWp + ' Wp' : (eq.potenciaWp/1000).toFixed(1) + ' kW'}` : 'â€”'}</td>
                  <td style={{ padding: '10px 12px', color: C.green }}>{eq.garantiaAnos ? `${eq.garantiaAnos} anos` : 'â€”'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function TabFinanceiro({ af }: any) {
  if (!af) return <EmptyState icon="ðŸ“ˆ" title="AnÃ¡lise financeira nÃ£o disponÃ­vel" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: `${C.solar}10`, border: `1px solid ${C.solar}30`, borderRadius: 10, padding: '14px 18px' }}>
        <p style={{ color: C.textDim, fontSize: 12, margin: '0 0 4px' }}>A anÃ¡lise financeira Ã© recalculada automaticamente quando vocÃª edita a precificaÃ§Ã£o ou o dimensionamento.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Payback Simples', value: formatPayback(af.paybackSimplesMeses), color: C.solar },
          { label: 'VPL (25 anos)', value: formatCurrency(af.vpl ?? af.vpl25Anos), color: C.green },
          { label: 'TIR', value: `${Number(af.tir).toFixed(2)}%`, color: C.accent },
          { label: 'GeraÃ§Ã£o Anual', value: formatKwh(af.geracaoAnualKwh ?? af.investimentoTotal), color: C.green },
          { label: 'Economia Ano 1', value: formatCurrency(af.economiaAnualAno1 ?? af.economiaAno1), color: C.solar },
          { label: 'Saldo 25 Anos', value: formatCurrency(af.saldo25Anos ?? af.saldoAcumulado25Anos), color: C.green },
        ].map(k => (
          <div key={k.label} style={{ background: C.dark, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.darkBorder}` }}>
            <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', margin: '0 0 4px' }}>{k.label}</p>
            <p style={{ color: k.color, fontSize: 18, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabPrecificacao({ prec, propostaId }: any) {
  const utils = trpc.useUtils()
  const updatePrec = trpc.proposta.updatePrecificacao.useMutation({
    onSuccess: () => { utils.proposta.byId.invalidate({ id: propostaId }); setEditando(false) },
    onError: (e) => alert('Erro: ' + e.message),
  })

  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({
    custoKit: Number(prec?.custoTotal ?? 0),
    custoInstalacaoModulos: 0,
    custoInstalacaoInversor: 0,
    custoProjeto: 0,
    comissao: 0,
    margemOverride: Number(prec?.margemAplicada ?? 33),
    descontoAplicado: Number(prec?.descontoAplicado ?? 0),
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  if (!prec) return <EmptyState icon="ðŸ’°" title="PrecificaÃ§Ã£o nÃ£o disponÃ­vel" />

  const custoTotal = form.custoKit + form.custoInstalacaoModulos + form.custoInstalacaoInversor + form.custoProjeto
  const precoVenda = custoTotal * (1 + form.margemOverride / 100)
  const precoFinal = precoVenda * (1 - form.descontoAplicado / 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>ComposiÃ§Ã£o de PreÃ§o</p>
          <Btn size="sm" variant="ghost" onClick={() => setEditando(!editando)}>{editando ? 'âœ– Cancelar' : 'âœï¸ Editar'}</Btn>
        </div>

        {!editando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: 'Custo Total', value: prec.custoTotal, color: C.text },
              { label: 'Margem Aplicada', value: `${Number(prec.margemAplicada).toFixed(1)}%`, color: C.textMuted, isPercent: true },
              { label: 'PreÃ§o de Venda', value: prec.precoVenda, color: C.text },
              { label: 'Desconto Aplicado', value: prec.descontoAplicado, color: C.danger },
            ].map(r => (
              (Number(r.value) !== 0 || r.label === 'Custo Total' || r.label === 'PreÃ§o de Venda') && (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.darkBorder}40` }}>
                  <span style={{ color: C.textMuted, fontSize: 13 }}>{r.label}</span>
                  <span style={{ color: r.color, fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
                    {r.isPercent ? r.value : formatCurrency(r.value)}
                  </span>
                </div>
              )
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', borderTop: `1px solid ${C.darkBorder}`, marginTop: 6 }}>
              <span style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>PreÃ§o Final</span>
              <span style={{ color: C.solar, fontSize: 18, fontWeight: 800, fontFamily: 'monospace' }}>{formatCurrency(prec.precoFinal)}</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Custo do Kit (R$)" type="number" value={form.custoKit || ''} onChange={e => set('custoKit', Number(e.target.value))} />
              <Input label="Custo InstalaÃ§Ã£o MÃ³dulos (R$)" type="number" value={form.custoInstalacaoModulos || ''} onChange={e => set('custoInstalacaoModulos', Number(e.target.value))} placeholder="0" />
              <Input label="Custo InstalaÃ§Ã£o Inversor (R$)" type="number" value={form.custoInstalacaoInversor || ''} onChange={e => set('custoInstalacaoInversor', Number(e.target.value))} placeholder="0" />
              <Input label="Custo de Projeto (R$)" type="number" value={form.custoProjeto || ''} onChange={e => set('custoProjeto', Number(e.target.value))} placeholder="0" />
              <Input label="Margem (%)" type="number" value={form.margemOverride || ''} onChange={e => set('margemOverride', Number(e.target.value))} suffix="%" />
              <Input label="ComissÃ£o (%)" type="number" value={form.comissao || ''} onChange={e => set('comissao', Number(e.target.value))} placeholder="0" suffix="%" />
              <Input label="Desconto Ã  Vista (%)" type="number" value={form.descontoAplicado || ''} onChange={e => set('descontoAplicado', Number(e.target.value))} placeholder="0" suffix="%" />
            </div>
            <div style={{ background: `${C.solar}10`, border: `1px solid ${C.solar}30`, borderRadius: 10, padding: '12px 16px' }}>
              <p style={{ color: C.solar, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 8px' }}>Preview do Novo PreÃ§o</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div><p style={{ color: C.textDim, fontSize: 10, margin: '0 0 2px' }}>Custo Total</p><p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{formatCurrency(custoTotal)}</p></div>
                <div><p style={{ color: C.textDim, fontSize: 10, margin: '0 0 2px' }}>PreÃ§o de Venda</p><p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{formatCurrency(precoVenda)}</p></div>
                <div><p style={{ color: C.textDim, fontSize: 10, margin: '0 0 2px' }}>PreÃ§o Final</p><p style={{ color: C.solar, fontSize: 14, fontWeight: 700, margin: 0 }}>{formatCurrency(precoFinal)}</p></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setEditando(false)}>Cancelar</Btn>
              <Btn onClick={() => updatePrec.mutate({ propostaId, ...form })} disabled={updatePrec.isPending}>
                {updatePrec.isPending ? 'â³ Salvando...' : 'âœ” Salvar AlteraÃ§Ãµes'}
              </Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function TabPagamento({ condicoes, propostaId }: any) {
  const utils = trpc.useUtils()
  const updateCond = trpc.proposta.updateCondicoes.useMutation({
    onSuccess: () => { utils.proposta.byId.invalidate({ id: propostaId }); setEditandoId(null) },
    onError: (e) => alert('Erro ao salvar: ' + e.message),
  })

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [formParcelas, setFormParcelas] = useState<any[]>([])
  const [formAvista, setFormAvista] = useState({ desconto: 0, prazoDias: 0, tipoPrazo: 'corridos' })

  const tipos: Record<string, string> = {
    avista: 'ðŸ’° Ã€ Vista',
    parcelado_marcos: 'ðŸ“‹ Parcelado por Marcos',
    financiamento: 'ðŸª Financiamento BancÃ¡rio',
    cartao: 'ðŸ’³ CartÃ£o de CrÃ©dito',
  }

  const iniciarEdicao = (c: any) => {
    if (c.tipo === 'avista') {
      setFormAvista({ desconto: 0, prazoDias: c.parcelas?.[0]?.prazoDias ?? 0, tipoPrazo: c.parcelas?.[0]?.tipoPrazo ?? 'corridos' })
    } else {
      setFormParcelas((c.parcelas ?? []).map((p: any) => ({
        id: p.id, numeroParcela: p.numeroParcela, descricaoEvento: p.descricaoEvento,
        percentualDoTotal: Number(p.percentualDoTotal), prazoDias: p.prazoDias ?? 0,
        tipoPrazo: p.tipoPrazo ?? 'corridos', valor: Number(p.valor),
      })))
    }
    setEditandoId(c.id)
  }

  if (!condicoes?.length) return <EmptyState icon="ðŸ’³" title="CondiÃ§Ãµes comerciais nÃ£o configuradas" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {condicoes.map((c: any, i: number) => {
        const isEditando = editandoId === c.id
        const podeEditar = c.tipo === 'avista' || c.tipo === 'parcelado_marcos'
        const totalPct = formParcelas.reduce((s, p) => s + Number(p.percentualDoTotal), 0)

        return (
          <Card key={c.id ?? i} style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 4, height: 20, borderRadius: 2, background: i === 0 ? C.solar : i === 1 ? C.green : C.accent }} />
                <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{tipos[c.tipo] ?? c.tipo}</span>
                {c.tipo === 'parcelado_marcos' && (
                  <span style={{ fontSize: 10, color: C.solar, background: `${C.solar}18`, padding: '2px 8px', borderRadius: 20 }}>PadrÃ£o Atom Tech</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: C.solar, fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(c.valorTotal)}</span>
                {podeEditar && (
                  <Btn size="sm" variant="ghost" onClick={() => isEditando ? setEditandoId(null) : iniciarEdicao(c)}>
                    {isEditando ? 'âœ– Cancelar' : 'âœï¸ Editar'}
                  </Btn>
                )}
              </div>
            </div>

            {!isEditando && (c.parcelas ?? []).map((p: any, j: number) => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: `1px solid ${C.darkBorder}40` }}>
                <div>
                  <span style={{ color: C.text, fontSize: 12, fontWeight: 500 }}>{p.descricaoEvento}</span>
                  {p.prazoDias > 0 && <span style={{ color: C.textDim, fontSize: 11, marginLeft: 8 }}>(atÃ© {p.prazoDias} dias {p.tipoPrazo})</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: C.text, fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(p.valor)}</span>
                  {p.percentualDoTotal && <span style={{ color: C.textDim, fontSize: 11, marginLeft: 6 }}>({Number(p.percentualDoTotal).toFixed(0)}%)</span>}
                </div>
              </div>
            ))}

            {isEditando && c.tipo === 'avista' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 110px 110px', gap: 12 }}>
                  <div>
                    <label style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Desconto (%)</label>
                    <input type="number" min={0} max={30} step={0.5} value={formAvista.desconto}
                      onChange={e => setFormAvista(f => ({ ...f, desconto: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.solar, fontSize: 14, fontWeight: 700, outline: 'none' }} />
                    {formAvista.desconto > 0 && <p style={{ color: C.green, fontSize: 12, margin: '4px 0 0', fontWeight: 600 }}>â†’ {formatCurrency(Number(c.valorTotal) * (1 - formAvista.desconto / 100))}</p>}
                  </div>
                  <div>
                    <label style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Prazo (dias)</label>
                    <input type="number" min={0} value={formAvista.prazoDias}
                      onChange={e => setFormAvista(f => ({ ...f, prazoDias: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Tipo</label>
                    <select value={formAvista.tipoPrazo} onChange={e => setFormAvista(f => ({ ...f, tipoPrazo: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.textMuted, fontSize: 12, outline: 'none' }}>
                      <option value="uteis">Dias Ãšteis</option>
                      <option value="corridos">Dias Corridos</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Btn variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Btn>
                  <Btn onClick={() => {
                    const valorFinal = formAvista.desconto > 0 ? Number(c.valorTotal) * (1 - formAvista.desconto / 100) : Number(c.valorTotal)
                    updateCond.mutate({ propostaId, condicaoId: c.id,
                      descricao: formAvista.desconto > 0 ? `Pagamento Ã  Vista â€” ${formAvista.desconto}% de desconto` : 'Pagamento Ã  Vista',
                      valorTotal: valorFinal,
                      parcelas: [{ numeroParcela: 1, descricaoEvento: formAvista.desconto > 0 ? `Ã€ vista com ${formAvista.desconto}% de desconto` : 'Pagamento Ã  vista',
                        percentualDoTotal: 100, valor: valorFinal, prazoDias: formAvista.prazoDias, tipoPrazo: formAvista.tipoPrazo as any }],
                    })
                  }} disabled={updateCond.isPending}>
                    {updateCond.isPending ? 'â³ Salvando...' : 'âœ” Salvar'}
                  </Btn>
                </div>
              </div>
            )}

            {isEditando && c.tipo === 'parcelado_marcos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                {formParcelas.map((p, j) => (
                  <div key={j} style={{ display: 'grid', gridTemplateColumns: '1fr 65px 65px 90px', gap: 8, alignItems: 'center' }}>
                    <input value={p.descricaoEvento} onChange={e => { const n = [...formParcelas]; n[j] = { ...n[j], descricaoEvento: e.target.value }; setFormParcelas(n) }}
                      style={{ padding: '7px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none' }} />
                    <input type="number" min={0} max={100} value={p.percentualDoTotal}
                      onChange={e => { const n = [...formParcelas]; n[j] = { ...n[j], percentualDoTotal: Number(e.target.value) }; setFormParcelas(n) }}
                      style={{ width: '100%', padding: '7px 6px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.solar, fontSize: 13, fontWeight: 700, outline: 'none' }} />
                    <input type="number" min={0} value={p.prazoDias}
                      onChange={e => { const n = [...formParcelas]; n[j] = { ...n[j], prazoDias: Number(e.target.value) }; setFormParcelas(n) }}
                      style={{ width: '100%', padding: '7px 6px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none' }} />
                    <select value={p.tipoPrazo} onChange={e => { const n = [...formParcelas]; n[j] = { ...n[j], tipoPrazo: e.target.value }; setFormParcelas(n) }}
                      style={{ padding: '7px 6px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.textMuted, fontSize: 11, outline: 'none' }}>
                      <option value="uteis">Ãºteis</option>
                      <option value="corridos">corridos</option>
                    </select>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: `1px solid ${C.darkBorder}` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: Math.abs(totalPct - 100) < 0.01 ? C.green : C.danger }}>
                    Total: {totalPct.toFixed(0)}% {Math.abs(totalPct - 100) < 0.01 ? 'âœ”' : 'âš  deve ser 100%'}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Btn>
                    <Btn disabled={Math.abs(totalPct - 100) > 0.01 || updateCond.isPending}
                      onClick={() => updateCond.mutate({ propostaId, condicaoId: c.id, parcelas: formParcelas })}>
                      {updateCond.isPending ? 'â³ Salvando...' : 'âœ” Salvar'}
                    </Btn>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function TabBlocos({ blocos, propostaId }: any) {
  const utils = trpc.useUtils()
  const updateBlocos = trpc.proposta.updateBlocos.useMutation({
    onSuccess: () => utils.proposta.byId.invalidate({ id: propostaId }),
  })

  const [estado, setEstado] = useState<any[]>(blocos ?? [])

  const LABELS: Record<string, string> = {
    capa: 'Capa', apresentacao_empresa: 'ApresentaÃ§Ã£o da Empresa',
    o_que_inclui: 'O que inclui', como_funciona: 'Como funciona',
    regulamentacao: 'RegulamentaÃ§Ã£o', diferenciais: 'Diferenciais',
    garantias: 'Garantias', fornecedores: 'Fornecedores',
    dimensionamento: 'Dimensionamento', equipamentos: 'Equipamentos',
    cronograma: 'Cronograma', analise_financeira: 'AnÃ¡lise Financeira',
    indicadores_financeiros: 'Indicadores Financeiros', fluxo_caixa: 'Fluxo de Caixa',
    reducao_conta: 'ReduÃ§Ã£o da Conta', condicoes_comerciais: 'CondiÃ§Ãµes Comerciais',
    formas_pagamento: 'Formas de Pagamento', aceite: 'Aceite da Proposta',
    contato: 'Contato e EndereÃ§o',
  }

  const toggle = (id: number) => {
    const novos = estado.map(b => b.id === id ? { ...b, ativo: !b.ativo } : b)
    setEstado(novos)
    updateBlocos.mutate({ propostaId, blocos: novos.map(b => ({ id: b.id, ativo: b.ativo, ordem: b.ordem })) })
  }

  return (
    <div>
      <p style={{ color: C.textMuted, fontSize: 12, marginBottom: 16 }}>Ative ou desative os blocos que aparecerÃ£o no PDF.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {estado.map((b, i) => (
          <Card key={b.id ?? i} style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: b.ativo ? 1 : 0.45, transition: 'opacity 0.2s' }}>
            <span style={{ color: C.textDim, fontSize: 11, fontFamily: 'monospace', minWidth: 24 }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ flex: 1, color: b.ativo ? C.text : C.textMuted, fontSize: 13 }}>{LABELS[b.tipoBloco] ?? b.tipoBloco}</span>
            <Toggle checked={b.ativo} onChange={() => toggle(b.id)} />
          </Card>
        ))}
      </div>
    </div>
  )
}

export function PropostaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('dimensionamento')
  const [gerandoPdf, setGerandoPdf] = useState(false)

  const propostaId = Number(id)
  const { data, isLoading } = trpc.proposta.byId.useQuery({ id: propostaId }, { enabled: !!propostaId })
  const { data: empresa } = trpc.empresa.get.useQuery()
  const { data: textosData } = trpc.textoInstitucional.list.useQuery()
  const updateStatus = trpc.proposta.updateStatus.useMutation()
  const utils = trpc.useUtils()

  const handleGerarPdf = () => {
    if (!data) { alert('Dados da proposta ainda nÃ£o carregados.'); return }
    setGerandoPdf(true)
    setTimeout(() => {
      try {
        // Monta objeto de textos indexado por chave
        const textos: Record<string, any> = {}
        if (textosData) {
          textosData.forEach((t: any) => { textos[t.chave] = t })
        }
        abrirPdfNoNavegador({ ...data, empresa: { ...data.empresa, ...empresa }, textos })
      } catch (e) {
        alert('Erro ao gerar PDF. Verifique se popups estÃ£o permitidos neste site.')
        console.error(e)
      } finally {
        setGerandoPdf(false)
      }
    }, 100)
  }

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <Spinner size={36} />
    </div>
  )
  if (!data) return <EmptyState icon="â˜¹" title="Proposta nÃ£o encontrada" />

  const { proposta, dimensionamento, equipamentos, precificacao, analiseFinanceira, condicoesComerciais, blocos } = data

  const handleStatus = (status: any) => {
    updateStatus.mutate({ id: propostaId, status }, {
      onSuccess: () => utils.proposta.byId.invalidate({ id: propostaId })
    })
  }

  const nextStatus: Record<string, { label: string; status: string; color: string }> = {
    rascunho:  { label: 'Marcar como Enviada', status: 'enviada',  color: C.accent },
    enviada:   { label: 'Marcar como Aceita',  status: 'aceita',   color: C.green },
    aceita:    { label: 'Proposta Aceita âœ”',   status: 'aceita',   color: C.green },
    recusada:  { label: 'Reabrir',             status: 'rascunho', color: C.textMuted },
    expirada:  { label: 'Reabrir',             status: 'rascunho', color: C.textMuted },
  }

  const next = nextStatus[proposta.status] ?? nextStatus.rascunho

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 24px', borderBottom: `1px solid ${C.darkBorder}`, background: C.darkMid, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => navigate('/propostas')} style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.darkBorder}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', fontSize: 12 }}>â† Voltar</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: C.accent, fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{proposta.numero}</span>
            <Badge status={proposta.status} />
            <span style={{ fontSize: 11, color: C.textDim }}>v{proposta.versao}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
            <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>Proposta {proposta.numero}</span>
            <span style={{ color: C.textDim, fontSize: 12 }}>
              EmissÃ£o: {formatDate(proposta.dataEmissao)}{proposta.dataValidade && ` Â· Validade: ${formatDate(proposta.dataValidade)}`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {proposta.status !== 'aceita' && (
            <Btn variant="ghost" size="sm" onClick={() => handleStatus(next.status)} style={{ color: next.color, borderColor: next.color + '50' }}>{next.label}</Btn>
          )}
          <Btn variant="ghost" size="sm" onClick={() => handleStatus('recusada')} style={{ color: C.danger, borderColor: C.danger + '50' }}>Recusar</Btn>
          <Btn size="sm" onClick={handleGerarPdf} disabled={gerandoPdf}>
            {gerandoPdf ? 'â³ Gerando...' : 'â†¯ Exportar PDF'}
          </Btn>
        </div>
      </div>

      <div style={{ background: C.darkMid, padding: '0 24px', borderBottom: `1px solid ${C.darkBorder}` }}>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
        {tab === 'dimensionamento' && <TabDimensionamento dim={dimensionamento} equips={equipamentos} propostaId={propostaId} />}
        {tab === 'financeiro'      && <TabFinanceiro af={analiseFinanceira} />}
        {tab === 'precificacao'    && <TabPrecificacao prec={precificacao} propostaId={propostaId} />}
        {tab === 'pagamento'       && <TabPagamento condicoes={condicoesComerciais} propostaId={propostaId} />}
        {tab === 'blocos'          && <TabBlocos blocos={blocos} propostaId={propostaId} />}
      </div>
    </div>
  )
}

