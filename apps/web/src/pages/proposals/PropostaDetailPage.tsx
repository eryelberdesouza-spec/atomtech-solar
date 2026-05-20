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
import { abrirPdfServicoNoNavegador } from '../../lib/gerarPdfServicoBrowser'
import { abrirContratoNoNavegador } from '../../lib/gerarContratoBrowser'

const TABS_SOLAR = [
  { id: 'dimensionamento', label: 'Dimensionamento' },
  { id: 'financeiro',      label: 'Análise Financeira' },
  { id: 'precificacao',    label: 'Precificação' },
  { id: 'pagamento',       label: 'Condições Comerciais' },
  { id: 'blocos',          label: 'Blocos da Proposta' },
]

const TABS_SERVICO = [
  { id: 'itens',    label: 'Itens do Serviço' },
  { id: 'pagamento', label: 'Condições Comerciais' },
  { id: 'blocos',    label: 'Blocos da Proposta' },
]

// ─── PILL BADGE ──────────────────────────────────────────────────────
function Pill({ children, color }: { children: React.ReactNode; color?: string }) {
  const c = color ?? C.accent
  return (
    <span style={{
      background: `${c}15`, color: c, border: `1px solid ${c}30`,
      borderRadius: 6, padding: '2px 9px', fontSize: 12, fontWeight: 600,
    }}>{children}</span>
  )
}

// ─── KPI CARD ────────────────────────────────────────────────────────
function KpiCard({ label, value, color, icon, large }: { label: string; value: string; color: string; icon: string; large?: boolean }) {
  return (
    <div style={{
      background: C.dark, borderRadius: 12, padding: large ? '16px 20px' : '12px 16px',
      border: `1px solid ${C.darkBorder}`,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0, fontWeight: 600 }}>{label}</p>
      </div>
      <p style={{ color, fontSize: large ? 22 : 17, fontWeight: 800, margin: 0, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
    </div>
  )
}

function TabDimensionamento({ dim, equips, propostaId }: any) {
  const utils = trpc.useUtils()
  const updateDim = trpc.proposta.updateDimensionamento.useMutation({
    onSuccess: () => { utils.proposta.byId.invalidate({ id: propostaId }); setEditando(false) },
    onError: (e) => alert('Erro: ' + e.message),
  })

  const modulo   = equips?.find((e: any) => e.tipo === 'modulo')
  const inversor = equips?.find((e: any) => e.tipo === 'inversor' || e.tipo === 'microinversor')

  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({
    potenciaFinalKwp:     Number(dim?.potenciaFinalKwp ?? 0),
    quantidadeModulos:    modulo?.quantidade ?? 0,
    fabricanteModulo:     modulo?.fabricante ?? '',
    modeloModulo:         modulo?.modelo ?? '',
    potenciaModuloWp:     modulo?.potenciaWp ?? 620,
    quantidadeInversores: inversor?.quantidade ?? 0,
    fabricanteInversor:   inversor?.fabricante ?? '',
    modeloInversor:       inversor?.modelo ?? '',
    potenciaInversorWp:   inversor?.potenciaWp ?? 0,
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  if (!dim) return <EmptyState icon="☀️" title="Dimensionamento não calculado" />

  const kpisPrincipais = [
    { label: 'Potência Final',    value: formatKwp(dim.potenciaFinalKwp),            color: C.solar,  icon: '⚡', large: true },
    { label: 'Geração Anual',     value: formatKwh(dim.geracaoAnualKwh),             color: C.green,  icon: '📊', large: true },
    { label: 'Geração/Mês',       value: formatKwh(Number(dim.geracaoAnualKwh)/12),  color: C.green,  icon: '📅', large: true },
    { label: 'Economia/Mês Est.', value: formatCurrency(dim.economiaMensalEstimada), color: C.solar,  icon: '💰', large: true },
  ]
  const kpisSecundarios = [
    { label: 'Potência Recom.',  value: formatKwp(dim.potenciaRecomendadaKwp),   color: C.textMuted, icon: '🎯' },
    { label: 'Área Estimada',    value: `${Number(dim.areaEstimadaM2).toFixed(1)} m²`, color: C.accent, icon: '📐' },
    { label: '% Compensação',    value: formatPct(dim.percentualCompensacao),     color: C.green,     icon: '✅' },
    { label: 'Módulos',          value: String(dim.quantidadeModulos ?? '—'),     color: C.text,      icon: '🔲' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPIs principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {kpisPrincipais.map(k => <KpiCard key={k.label} {...k} />)}
      </div>
      {/* KPIs secundários */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {kpisSecundarios.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Parâmetros técnicos */}
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>⚙️</span>
            <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Parâmetros Técnicos</p>
          </div>
          <Btn size="sm" variant="ghost" onClick={() => setEditando(!editando)}>{editando ? '✖ Cancelar' : '✏️ Editar'}</Btn>
        </div>
        {!editando ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              ['Topologia',      dim.topologia],
              ['Tipo de Sistema', dim.tipoSistema?.replace('_', ' ')],
              ['Tipo de Telhado', dim.tipoTelhado],
              ['Desvio Azimutal', `${dim.desvioAzimutal ?? 0}°`],
              ['Inclinação',      `${dim.inclinacaoGraus ?? 0}°`],
              ['Tarifa Usada',    dim.tarifaUsada ? `R$ ${Number(dim.tarifaUsada).toFixed(4)}/kWh` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</span>
                <Pill color={C.accent}>{String(v ?? '—')}</Pill>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Potência Final (kWp)" type="number" value={form.potenciaFinalKwp} onChange={e => set('potenciaFinalKwp', Number(e.target.value))} />
              <Input label="Qtd. Módulos" type="number" value={form.quantidadeModulos} onChange={e => set('quantidadeModulos', Number(e.target.value))} />
            </div>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: '4px 0 0' }}>Módulos</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 12 }}>
              <Input label="Fabricante" value={form.fabricanteModulo} onChange={e => set('fabricanteModulo', e.target.value)} placeholder="Ex: JA Solar" />
              <Input label="Modelo" value={form.modeloModulo} onChange={e => set('modeloModulo', e.target.value)} placeholder="Ex: JAM72S30-620" />
              <Input label="Potência (Wp)" type="number" value={form.potenciaModuloWp} onChange={e => set('potenciaModuloWp', Number(e.target.value))} />
            </div>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: '4px 0 0' }}>Inversores / Microinversores</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px', gap: 12 }}>
              <Input label="Fabricante" value={form.fabricanteInversor} onChange={e => set('fabricanteInversor', e.target.value)} placeholder="Ex: Sungrow" />
              <Input label="Modelo" value={form.modeloInversor} onChange={e => set('modeloInversor', e.target.value)} placeholder="Ex: SG5.0RT" />
              <Input label="Potência (Wp)" type="number" value={form.potenciaInversorWp} onChange={e => set('potenciaInversorWp', Number(e.target.value))} />
              <Input label="Quantidade" type="number" value={form.quantidadeInversores} onChange={e => set('quantidadeInversores', Number(e.target.value))} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setEditando(false)}>Cancelar</Btn>
              <Btn onClick={() => updateDim.mutate({ propostaId, ...form })} disabled={updateDim.isPending}>
                {updateDim.isPending ? '⏳ Salvando...' : '✔ Salvar Alterações'}
              </Btn>
            </div>
          </div>
        )}
      </Card>

      {/* Equipamentos */}
      {equips?.length > 0 && !editando && (
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 14 }}>🔧</span>
            <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Equipamentos</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.darkBorder}` }}>
                {['Tipo', 'Fabricante / Modelo', 'Qtd.', 'Potência', 'Garantia'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equips.map((eq: any) => {
                const isModulo = eq.tipo === 'modulo'
                const isMicro  = eq.tipo === 'microinversor'
                return (
                  <tr key={eq.id} style={{ borderBottom: `1px solid ${C.darkBorder}30` }}>
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{
                        background: isModulo ? `${C.solar}15` : `${C.accent}15`,
                        color: isModulo ? C.solar : C.accent,
                        border: `1px solid ${isModulo ? C.solar : C.accent}30`,
                        borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
                      }}>
                        {isModulo ? '🔆 Módulos' : isMicro ? '⚡ Microinversor' : '⚡ Inversor'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px', color: C.text, fontWeight: 500 }}>{[eq.fabricante, eq.modelo].filter(Boolean).join(' — ') || '—'}</td>
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{ color: C.solar, fontWeight: 800, fontSize: 15, fontFamily: 'monospace' }}>{eq.quantidade}</span>
                    </td>
                    <td style={{ padding: '12px 12px', color: C.text }}>
                      {eq.potenciaWp ? (isModulo ? `${eq.potenciaWp} Wp` : `${(eq.potenciaWp/1000).toFixed(1)} kW`) : '—'}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      {eq.garantiaAnos
                        ? <span style={{ color: C.green, fontWeight: 600 }}>{eq.garantiaAnos} anos</span>
                        : <span style={{ color: C.textMuted }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function TabFinanceiro({ af }: any) {
  if (!af) return <EmptyState icon="📈" title="Análise financeira não disponível" />

  const metricas = [
    { label: 'Payback Simples', value: formatPayback(af.paybackSimplesMeses), color: C.solar,  icon: '⏱', desc: 'Retorno do investimento' },
    { label: 'VPL (25 anos)',   value: formatCurrency(af.vpl ?? af.vpl25Anos), color: C.green,  icon: '📈', desc: 'Valor presente líquido' },
    { label: 'TIR',             value: `${Number(af.tir).toFixed(2)}%`,        color: C.accent, icon: '🎯', desc: 'Taxa interna de retorno' },
    { label: 'Geração Anual',   value: formatKwh(af.geracaoAnualKwh ?? af.investimentoTotal), color: C.green, icon: '⚡', desc: 'Energia gerada por ano' },
    { label: 'Economia Ano 1',  value: formatCurrency(af.economiaAnualAno1 ?? af.economiaAno1), color: C.solar, icon: '💰', desc: 'Economia no primeiro ano' },
    { label: 'Saldo 25 Anos',   value: formatCurrency(af.saldo25Anos ?? af.saldoAcumulado25Anos), color: C.green, icon: '🏦', desc: 'Resultado acumulado' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: `${C.accent}10`, border: `1px solid ${C.accent}25`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>ℹ️</span>
        <p style={{ color: C.textDim, fontSize: 12, margin: 0 }}>A análise financeira é recalculada automaticamente quando você edita a precificação ou o dimensionamento.</p>
      </div>

      {/* Payback em destaque */}
      <div style={{ background: `${C.solar}12`, border: `2px solid ${C.solar}30`, borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>⏱ Payback Simples</p>
          <p style={{ color: C.solar, fontSize: 36, fontWeight: 900, margin: 0, fontFamily: 'monospace', lineHeight: 1 }}>
            {formatPayback(af.paybackSimplesMeses)}
          </p>
          <p style={{ color: C.textDim, fontSize: 12, margin: '6px 0 0' }}>Retorno do investimento</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 4px' }}>TIR</p>
          <p style={{ color: C.accent, fontSize: 22, fontWeight: 800, fontFamily: 'monospace', margin: 0 }}>{Number(af.tir).toFixed(2)}%</p>
        </div>
      </div>

      {/* Demais métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {metricas.filter(m => m.label !== 'Payback Simples' && m.label !== 'TIR').map(k => (
          <div key={k.label} style={{ background: C.dark, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.darkBorder}`, borderLeft: `3px solid ${k.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 13 }}>{k.icon}</span>
              <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, fontWeight: 600 }}>{k.label}</p>
            </div>
            <p style={{ color: k.color, fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>{k.value}</p>
            <p style={{ color: C.textMuted, fontSize: 10, margin: '4px 0 0' }}>{k.desc}</p>
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

  const [editando,       setEditando]       = useState(false)
  const [modoPrecoFinal, setModoPrecoFinal] = useState(false)

  const itens: any[] = prec?.itens ?? []
  const itemKit     = itens.find((i: any) => i.tipoCusto === 'avancado' || (i.descricao && (i.descricao.toLowerCase().includes('material') || i.descricao.toLowerCase().includes('kit'))))
  const itemInstMod = itens.find((i: any) => i.descricao && (i.descricao.toLowerCase().includes('módulo') || i.descricao.toLowerCase().includes('modulo')))
  const itemInstInv = itens.find((i: any) => i.descricao && (i.descricao.toLowerCase().includes('inversor') || i.descricao.toLowerCase().includes('micro')) && !i.descricao.toLowerCase().includes('kit'))
  const itemProjeto = itens.find((i: any) => i.descricao && (i.descricao.toLowerCase().includes('projeto') || i.descricao.toLowerCase().includes('engenhar')))

  const custoKitReal      = Number(itemKit?.custoTotal      ?? prec?.custoTotal ?? 0)
  const custoInstModReal  = Number(itemInstMod?.custoTotal  ?? 0)
  const custoInstInvReal  = Number(itemInstInv?.custoTotal  ?? 0)
  const custoProjetoReal  = Number(itemProjeto?.custoTotal  ?? 0)

  const [form, setForm] = useState({
    custoKit: custoKitReal, custoInstalacaoModulos: custoInstModReal,
    custoInstalacaoInversor: custoInstInvReal, custoProjeto: custoProjetoReal,
    comissao: Number(prec?.comissaoAplicada ?? 0), margemOverride: Number(prec?.margemAplicada ?? 33),
    precoFinalDireto: '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  function abrirEdit() {
    setForm({ custoKit: custoKitReal, custoInstalacaoModulos: custoInstModReal, custoInstalacaoInversor: custoInstInvReal, custoProjeto: custoProjetoReal, comissao: Number(prec?.comissaoAplicada ?? 0), margemOverride: Number(prec?.margemAplicada ?? 33), precoFinalDireto: '' })
    setModoPrecoFinal(false); setEditando(true)
  }

  if (!prec) return <EmptyState icon="💰" title="Precificação não disponível" />

  const custoTotalPreview  = form.custoKit + form.custoInstalacaoModulos + form.custoInstalacaoInversor + form.custoProjeto
  const precoVendaPreview  = custoTotalPreview * (1 + form.margemOverride / 100)
  const comissaoValPreview = precoVendaPreview * (form.comissao / 100)
  const precoFinalPreview  = precoVendaPreview + comissaoValPreview
  const precoFinalDiretoNum = form.precoFinalDireto ? Number(String(form.precoFinalDireto).replace(',', '.')) : 0
  const margemImplicita    = custoTotalPreview > 0 && precoFinalDiretoNum > 0 ? ((precoFinalDiretoNum / custoTotalPreview) - 1) * 100 : null

  const precoVendaReal  = Number(prec.precoVenda  ?? 0)
  const precoFinalReal  = Number(prec.precoFinal  ?? 0)
  const custoTotalReal  = Number(prec.custoTotal  ?? 0)
  const comissaoReal    = Number(prec.comissaoAplicada ?? 0)
  const markupReal      = precoVendaReal - custoTotalReal
  const comissaoValReal = precoVendaReal * comissaoReal / 100

  function handleSalvar() {
    let margemParaEnviar = form.margemOverride, comissaoParaEnviar = form.comissao
    if (modoPrecoFinal && precoFinalDiretoNum > 0 && custoTotalPreview > 0) {
      margemParaEnviar = ((precoFinalDiretoNum / custoTotalPreview) - 1) * 100
      comissaoParaEnviar = 0
    }
    updatePrec.mutate({ propostaId, custoKit: form.custoKit > 0 ? form.custoKit : undefined, custoInstalacaoModulos: form.custoInstalacaoModulos > 0 ? form.custoInstalacaoModulos : undefined, custoInstalacaoInversor: form.custoInstalacaoInversor > 0 ? form.custoInstalacaoInversor : undefined, custoProjeto: form.custoProjeto > 0 ? form.custoProjeto : undefined, comissao: comissaoParaEnviar, margemOverride: margemParaEnviar, descontoAplicado: 0 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>💰</span>
            <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Composição de Preço</p>
          </div>
          <Btn size="sm" variant="ghost" onClick={editando ? () => setEditando(false) : abrirEdit}>{editando ? '✖ Cancelar' : '✏️ Editar'}</Btn>
        </div>

        {!editando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {itens.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, margin: '0 0 8px' }}>Itens de Custo</p>
                {itens.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.darkBorder}18` }}>
                    <span style={{ color: C.textDim, fontSize: 12 }}>{item.descricao}</span>
                    <span style={{ color: C.textMuted, fontSize: 12, fontFamily: 'monospace' }}>{formatCurrency(item.custoTotal)}</span>
                  </div>
                ))}
              </div>
            )}
            {[
              { label: 'Custo Total',                                              value: custoTotalReal,  color: C.text     },
              { label: `+ Markup (${Number(prec.margemAplicada).toFixed(1)}%)`,   value: markupReal,      color: C.textMuted },
              { label: 'Preço de Venda',                                           value: precoVendaReal,  color: C.text     },
              comissaoReal > 0 ? { label: `+ Comissão (${comissaoReal.toFixed(1)}%)`, value: comissaoValReal, color: C.textMuted } : null,
            ].filter(Boolean).map((r: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.darkBorder}40` }}>
                <span style={{ color: C.textMuted, fontSize: 13 }}>{r.label}</span>
                <span style={{ color: r.color, fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{formatCurrency(r.value)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 4 }}>
              <span style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>Preço Final</span>
              <span style={{ color: C.solar, fontSize: 22, fontWeight: 800, fontFamily: 'monospace' }}>{formatCurrency(precoFinalReal)}</span>
            </div>
          </div>
        )}

        {editando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 6, padding: '6px', background: C.dark, borderRadius: 8, border: `1px solid ${C.darkBorder}` }}>
              <button onClick={() => setModoPrecoFinal(false)} style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, background: !modoPrecoFinal ? C.solar : 'transparent', color: !modoPrecoFinal ? '#000' : C.textMuted }}>⚙ Por componentes</button>
              <button onClick={() => setModoPrecoFinal(true)} style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, background: modoPrecoFinal ? C.solar : 'transparent', color: modoPrecoFinal ? '#000' : C.textMuted }}>💰 Definir preço final direto</button>
            </div>

            {modoPrecoFinal && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: `${C.solar}10`, border: `1px solid ${C.solar}30`, borderRadius: 8, padding: '12px 14px' }}>
                  <p style={{ color: C.solar, fontSize: 12, fontWeight: 700, margin: '0 0 4px' }}>Como funciona</p>
                  <p style={{ color: C.textDim, fontSize: 11, margin: 0, lineHeight: 1.6 }}>Informe quanto o cliente pagará. O sistema calcula a margem automaticamente. Neste modo, <strong style={{ color: C.text }}>não há comissão adicional</strong>.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>Custo Total dos Itens</p>
                    <p style={{ color: C.text, fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(custoTotalPreview > 0 ? custoTotalPreview : custoTotalReal)}</p>
                  </div>
                  <div>
                    <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>Preço atual</p>
                    <p style={{ color: C.textMuted, fontSize: 16, fontFamily: 'monospace' }}>{formatCurrency(precoFinalReal)}</p>
                  </div>
                </div>
                <Input label="Preço Final Desejado (R$)" type="number" value={form.precoFinalDireto} onChange={e => set('precoFinalDireto', e.target.value)} placeholder={Number(prec.precoFinal).toFixed(2)} />
                {margemImplicita !== null && (
                  <div style={{ background: margemImplicita > 0 ? `${C.green}10` : `${C.danger}10`, border: `1px solid ${margemImplicita > 0 ? C.green : C.danger}30`, borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ color: margemImplicita > 0 ? C.green : C.danger, fontSize: 12, fontWeight: 600, margin: 0 }}>Markup implícito: {margemImplicita.toFixed(2)}%{margemImplicita < 0 && ' ⚠ Abaixo do custo!'}</p>
                  </div>
                )}
              </div>
            )}

            {!modoPrecoFinal && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Input label="Custo do Kit (R$)"          type="number" value={form.custoKit               || ''} onChange={e => set('custoKit',               Number(e.target.value))} />
                  <Input label="Instalação Módulos (R$)"    type="number" value={form.custoInstalacaoModulos  || ''} onChange={e => set('custoInstalacaoModulos',  Number(e.target.value))} placeholder="0" />
                  <Input label="Instalação Inversor (R$)"   type="number" value={form.custoInstalacaoInversor || ''} onChange={e => set('custoInstalacaoInversor', Number(e.target.value))} placeholder="0" />
                  <Input label="Projeto de Engenharia (R$)" type="number" value={form.custoProjeto            || ''} onChange={e => set('custoProjeto',            Number(e.target.value))} placeholder="0" />
                  <Input label="Markup (%)"                 type="number" value={form.margemOverride          || ''} onChange={e => set('margemOverride',          Number(e.target.value))} suffix="%" />
                  <Input label="Comissão do Vendedor (%)"   type="number" value={form.comissao               || ''} onChange={e => set('comissao',               Number(e.target.value))} placeholder="0" suffix="%" />
                </div>
                <div style={{ background: `${C.solar}10`, border: `1px solid ${C.solar}30`, borderRadius: 10, padding: '14px 16px' }}>
                  <p style={{ color: C.solar, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 10px' }}>Preview do Novo Preço</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      { label: 'Custo Total',              value: custoTotalPreview, color: C.text },
                      { label: `+ Markup ${form.margemOverride}%`, value: custoTotalPreview * form.margemOverride / 100, color: C.textMuted },
                      { label: 'Preço de Venda',           value: precoVendaPreview, color: C.text },
                      form.comissao > 0 ? { label: `+ Comissão ${form.comissao}%`, value: comissaoValPreview, color: C.textMuted } : null,
                    ].filter(Boolean).map((r: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.textMuted, fontSize: 12 }}>{r.label}</span>
                        <span style={{ color: r.color, fontSize: 12, fontFamily: 'monospace' }}>{formatCurrency(r.value)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.solar}40`, paddingTop: 6, marginTop: 2 }}>
                      <span style={{ color: C.solar, fontSize: 13, fontWeight: 700 }}>Preço Final</span>
                      <span style={{ color: C.solar, fontSize: 14, fontWeight: 800, fontFamily: 'monospace' }}>{formatCurrency(precoFinalPreview)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div style={{ background: `${C.accent}10`, border: `1px solid ${C.accent}30`, borderRadius: 8, padding: '8px 14px' }}>
              <p style={{ color: C.accent, fontSize: 11, margin: 0 }}>ℹ As Condições Comerciais serão recalculadas automaticamente com o novo preço.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setEditando(false)}>Cancelar</Btn>
              <Btn onClick={handleSalvar} disabled={updatePrec.isPending || (modoPrecoFinal && !precoFinalDiretoNum)}>
                {updatePrec.isPending ? '⏳ Salvando...' : '✔ Salvar e Recalcular'}
              </Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function TabPagamento({ condicoes, propostaId, isServico, valorReferencia }: any) {
  const utils = trpc.useUtils()
  const updateCond = trpc.proposta.updateCondicoes.useMutation({
    onSuccess: () => { utils.proposta.byId.invalidate({ id: propostaId }); setEditandoId(null) },
    onError: (e) => alert('Erro ao salvar: ' + e.message),
  })
  const addCond = trpc.proposta.addCondicao.useMutation({
    onSuccess: () => { utils.proposta.byId.invalidate({ id: propostaId }); setShowAddForm(false) },
    onError: (e) => alert('Erro: ' + e.message),
  })
  const deleteCond = trpc.proposta.deleteCondicao.useMutation({
    onSuccess: () => utils.proposta.byId.invalidate({ id: propostaId }),
    onError: (e) => alert('Erro: ' + e.message),
  })

  const [editandoId, setEditandoId]     = useState<number | null>(null)
  const [formParcelas, setFormParcelas] = useState<any[]>([])
  const [formAvista, setFormAvista]     = useState({ desconto: 0, prazoDias: 0, tipoPrazo: 'corridos' })
  const [showAddForm, setShowAddForm]   = useState(false)
  const [addForm, setAddForm]           = useState({ tipo: 'avista' as string, descricao: '', valorTotal: valorReferencia ?? 0, numParcelas: 1 })

  const tipos: Record<string, string> = {
    avista: '💰 À Vista', parcelado_marcos: '📋 Parcelado por Marcos',
    financiamento: '🏪 Financiamento Bancário', cartao: '💳 Cartão de Crédito',
  }

  const tiposDisponiveis = isServico
    ? [{ value: 'avista', label: '💰 À Vista' }, { value: 'parcelado_marcos', label: '📋 Parcelado por Marcos' }, { value: 'cartao', label: '💳 Cartão de Crédito' }]
    : [{ value: 'avista', label: '💰 À Vista' }, { value: 'parcelado_marcos', label: '📋 Parcelado por Marcos' }, { value: 'financiamento', label: '🏪 Financiamento Bancário' }, { value: 'cartao', label: '💳 Cartão de Crédito' }]

  const iniciarEdicao = (c: any) => {
    if (c.tipo === 'avista') {
      setFormAvista({ desconto: 0, prazoDias: c.parcelas?.[0]?.prazoDias ?? 0, tipoPrazo: c.parcelas?.[0]?.tipoPrazo ?? 'corridos' })
    } else {
      setFormParcelas((c.parcelas ?? []).map((p: any) => ({ id: p.id, numeroParcela: p.numeroParcela, descricaoEvento: p.descricaoEvento, percentualDoTotal: Number(p.percentualDoTotal), prazoDias: p.prazoDias ?? 0, tipoPrazo: p.tipoPrazo ?? 'corridos', valor: Number(p.valor) })))
    }
    setEditandoId(c.id)
  }

  const handleAddCondicao = () => {
    if (!addForm.valorTotal) { alert('Informe o valor total'); return }
    const parcelas = addForm.tipo === 'parcelado_marcos'
      ? Array.from({ length: addForm.numParcelas }, (_, i) => ({
          numeroParcela: i + 1,
          descricaoEvento: `Parcela ${i + 1}`,
          percentualDoTotal: Number((100 / addForm.numParcelas).toFixed(2)),
          prazoDias: (i + 1) * 30,
          tipoPrazo: 'corridos' as const,
        }))
      : undefined
    addCond.mutate({ propostaId, tipo: addForm.tipo as any, descricao: addForm.descricao || undefined, valorTotal: addForm.valorTotal, parcelas })
  }

  const barColors = [C.solar, C.green, C.accent, '#9B8DEE', '#F97316']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Botão + nova condição */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn size="sm" variant="ghost" onClick={() => { setShowAddForm(!showAddForm); setAddForm({ tipo: 'avista', descricao: '', valorTotal: valorReferencia ?? 0, numParcelas: 1 }) }}>
          {showAddForm ? '✖ Cancelar' : '+ Nova Condição'}
        </Btn>
      </div>

      {/* Formulário de nova condição */}
      {showAddForm && (
        <Card style={{ padding: '16px 20px', border: `1px solid ${C.accent}40` }}>
          <p style={{ color: C.accent, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 12px', letterSpacing: '0.07em' }}>Nova Condição de Pagamento</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ color: C.textDim, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Tipo</label>
              <select value={addForm.tipo} onChange={e => setAddForm(f => ({ ...f, tipo: e.target.value }))}
                style={{ width: '100%', padding: '9px 10px', borderRadius: 8, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none' }}>
                {tiposDisponiveis.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: C.textDim, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Descrição (opcional)</label>
              <input value={addForm.descricao} onChange={e => setAddForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: 50% entrada + 50% entrega"
                style={{ width: '100%', padding: '9px 10px', borderRadius: 8, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ color: C.textDim, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Valor Total (R$)</label>
              <input type="number" min={0} value={addForm.valorTotal} onChange={e => setAddForm(f => ({ ...f, valorTotal: Number(e.target.value) }))}
                style={{ width: '100%', padding: '9px 10px', borderRadius: 8, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.solar, fontSize: 13, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          {addForm.tipo === 'parcelado_marcos' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: C.textDim, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Número de Parcelas</label>
              <input type="number" min={1} max={12} value={addForm.numParcelas} onChange={e => setAddForm(f => ({ ...f, numParcelas: Number(e.target.value) }))}
                style={{ width: 100, padding: '9px 10px', borderRadius: 8, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none' }} />
              <span style={{ color: C.textDim, fontSize: 11, marginLeft: 8 }}>parcelas iguais de {formatCurrency(addForm.valorTotal / (addForm.numParcelas || 1))}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Btn>
            <Btn onClick={handleAddCondicao} disabled={addCond.isPending}>
              {addCond.isPending ? '⏳ Criando...' : '✔ Criar Condição'}
            </Btn>
          </div>
        </Card>
      )}

      {(!condicoes?.length && !showAddForm) && <EmptyState icon="💳" title="Nenhuma condição comercial. Clique em + Nova Condição." />}

      {condicoes?.map((c: any, i: number) => {
        const isEditando = editandoId === c.id
        const podeEditar = c.tipo === 'avista' || c.tipo === 'parcelado_marcos'
        const totalPct   = formParcelas.reduce((s, p) => s + Number(p.percentualDoTotal), 0)
        const barColor   = barColors[i % barColors.length]

        return (
          <Card key={c.id ?? i} style={{ padding: '16px 20px', borderLeft: `3px solid ${barColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{tipos[c.tipo] ?? c.tipo}</span>
                {c.descricao && c.descricao !== tipos[c.tipo]?.replace(/^[^ ]+ /, '') && (
                  <span style={{ fontSize: 11, color: C.textDim }}>{c.descricao}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: C.solar, fontSize: 15, fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(c.valorTotal)}</span>
                {podeEditar && !isEditando && (
                  <Btn size="sm" variant="ghost" onClick={() => iniciarEdicao(c)}>✏️ Editar</Btn>
                )}
                {isEditando && (
                  <Btn size="sm" variant="ghost" onClick={() => setEditandoId(null)}>✖ Cancelar</Btn>
                )}
                <button onClick={() => { if (confirm('Excluir esta condição de pagamento?')) deleteCond.mutate({ propostaId, condicaoId: c.id }) }}
                  style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid #F8514940`, background: '#F8514910', color: '#F85149', cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            </div>

            {!isEditando && (c.parcelas ?? []).map((p: any, j: number) => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: `1px solid ${C.darkBorder}40` }}>
                <div>
                  <span style={{ color: C.text, fontSize: 12, fontWeight: 500 }}>{p.descricaoEvento}</span>
                  {p.prazoDias > 0 && <span style={{ color: C.textDim, fontSize: 11, marginLeft: 8 }}>(até {p.prazoDias} dias {p.tipoPrazo})</span>}
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
                    <input type="number" min={0} max={30} step={0.5} value={formAvista.desconto} onChange={e => setFormAvista(f => ({ ...f, desconto: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.solar, fontSize: 14, fontWeight: 700, outline: 'none' }} />
                    {formAvista.desconto > 0 && <p style={{ color: C.green, fontSize: 12, margin: '4px 0 0', fontWeight: 600 }}>→ {formatCurrency(Number(c.valorTotal) * (1 - formAvista.desconto / 100))}</p>}
                  </div>
                  <div>
                    <label style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Prazo (dias)</label>
                    <input type="number" min={0} value={formAvista.prazoDias} onChange={e => setFormAvista(f => ({ ...f, prazoDias: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Tipo</label>
                    <select value={formAvista.tipoPrazo} onChange={e => setFormAvista(f => ({ ...f, tipoPrazo: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.textMuted, fontSize: 12, outline: 'none' }}>
                      <option value="uteis">Dias Úteis</option>
                      <option value="corridos">Dias Corridos</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Btn variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Btn>
                  <Btn onClick={() => { const valorFinal = formAvista.desconto > 0 ? Number(c.valorTotal) * (1 - formAvista.desconto / 100) : Number(c.valorTotal); updateCond.mutate({ propostaId, condicaoId: c.id, descricao: formAvista.desconto > 0 ? `Pagamento à Vista — ${formAvista.desconto}% de desconto` : 'Pagamento à Vista', valorTotal: valorFinal, parcelas: [{ numeroParcela: 1, descricaoEvento: formAvista.desconto > 0 ? `À vista com ${formAvista.desconto}% de desconto` : 'Pagamento à vista', percentualDoTotal: 100, valor: valorFinal, prazoDias: formAvista.prazoDias, tipoPrazo: formAvista.tipoPrazo as any }] }) }} disabled={updateCond.isPending}>
                    {updateCond.isPending ? '⏳ Salvando...' : '✔ Salvar'}
                  </Btn>
                </div>
              </div>
            )}

            {isEditando && c.tipo === 'parcelado_marcos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '10px 1fr 65px 65px 90px', gap: 8, marginBottom: 4, padding: '0 2px' }}>
                  {['', 'Descrição', '%', 'Dias', 'Tipo'].map(h => (
                    <span key={h} style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                {formParcelas.map((p, j) => (
                  <div key={j} style={{ display: 'grid', gridTemplateColumns: '10px 1fr 65px 65px 90px', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: C.textDim, fontSize: 11, fontWeight: 700 }}>{j + 1}</span>
                    <input value={p.descricaoEvento} onChange={e => { const n = [...formParcelas]; n[j] = { ...n[j], descricaoEvento: e.target.value }; setFormParcelas(n) }}
                      style={{ padding: '7px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none' }} />
                    <input type="number" min={0} max={100} value={p.percentualDoTotal} onChange={e => { const n = [...formParcelas]; n[j] = { ...n[j], percentualDoTotal: Number(e.target.value) }; setFormParcelas(n) }}
                      style={{ width: '100%', padding: '7px 6px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.solar, fontSize: 13, fontWeight: 700, outline: 'none' }} />
                    <input type="number" min={0} value={p.prazoDias} onChange={e => { const n = [...formParcelas]; n[j] = { ...n[j], prazoDias: Number(e.target.value) }; setFormParcelas(n) }}
                      style={{ width: '100%', padding: '7px 6px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none' }} />
                    <select value={p.tipoPrazo} onChange={e => { const n = [...formParcelas]; n[j] = { ...n[j], tipoPrazo: e.target.value }; setFormParcelas(n) }}
                      style={{ padding: '7px 6px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.textMuted, fontSize: 11, outline: 'none' }}>
                      <option value="uteis">úteis</option>
                      <option value="corridos">corridos</option>
                    </select>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <Btn size="sm" variant="ghost" onClick={() => setFormParcelas(f => [...f, { numeroParcela: f.length + 1, descricaoEvento: `Parcela ${f.length + 1}`, percentualDoTotal: 0, prazoDias: 0, tipoPrazo: 'corridos' }])}>+ Parcela</Btn>
                  {formParcelas.length > 1 && <Btn size="sm" variant="ghost" onClick={() => setFormParcelas(f => f.slice(0, -1))}>- Remover</Btn>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: `1px solid ${C.darkBorder}` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: Math.abs(totalPct - 100) < 0.01 ? C.green : C.danger }}>Total: {totalPct.toFixed(0)}% {Math.abs(totalPct - 100) < 0.01 ? '✔' : '⚠ deve ser 100%'}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Btn>
                    <Btn disabled={Math.abs(totalPct - 100) > 0.01 || updateCond.isPending} onClick={() => updateCond.mutate({ propostaId, condicaoId: c.id, parcelas: formParcelas })}>
                      {updateCond.isPending ? '⏳ Salvando...' : '✔ Salvar'}
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

const BLOCOS_TEXTO_EDITAVEL   = new Set(['escopo_entregas', 'consideracoes_gerais', 'observacoes_complementares'])
const BLOCOS_COM_CATALOGO     = new Set(['garantias', 'consideracoes_gerais', 'escopo_entregas', 'fornecedores', 'regulamentacao', 'como_funciona', 'observacoes_complementares'])
const BLOCOS_OBRIGATORIOS_PDF = new Set(['garantias', 'escopo_entregas'])
const BLOCOS_MULTISELECT      = new Set(['consideracoes_gerais', 'escopo_entregas', 'observacoes_complementares'])
const BLOCOS_LABELS: Record<string, string> = {
  capa: 'Capa', apresentacao_empresa: 'Apresentação da Empresa',
  o_que_inclui: 'O que inclui', como_funciona: 'Como funciona',
  regulamentacao: 'Regulamentação', diferenciais: 'Diferenciais',
  garantias: 'Garantias', fornecedores: 'Fornecedores',
  dimensionamento: 'Dimensionamento', equipamentos: 'Equipamentos',
  cronograma: 'Cronograma', analise_financeira: 'Análise Financeira',
  indicadores_financeiros: 'Indicadores Financeiros', fluxo_caixa: 'Fluxo de Caixa',
  reducao_conta: 'Redução da Conta', condicoes_comerciais: 'Condições Comerciais',
  formas_pagamento: 'Formas de Pagamento', aceite: 'Aceite da Proposta',
  contato: 'Contato e Endereço', escopo_servico: 'Escopo do Serviço',
  escopo_entregas: 'O que Propomos Entregar', consideracoes_gerais: 'Considerações Gerais',
  observacoes_complementares: 'Observações Complementares',
}

const DEFAULT_CONSIDERACOES_PREVIEW = `- **Atendimento:** Horário comercial, segunda a sexta das 8h às 18h.
- **Autoria do Orçamento:** Uso exclusivo desta negociação.
- **Encargos e Taxas:** Taxas e licenças são responsabilidade do contratante.
- **Etapa Única:** Execução contínua, salvo acordo formal em contrário.
- **Garantia:** 90 dias contra defeitos de execução.
- **Horário Comercial:** Serviços noturnos ou fins de semana cobrados à parte.`

function TabBlocos({ blocos, propostaId, textos }: any) {
  const utils = trpc.useUtils()
  const updateBlocos = trpc.proposta.updateBlocos.useMutation({
    onSuccess: () => utils.proposta.byId.invalidate({ id: propostaId }),
  })
  const { data: todosModelos } = (trpc as any).modeloBloco.list.useQuery()

  const [estado, setEstado]         = useState<any[]>(blocos ?? [])
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [textoEditando, setTextoEditando] = useState('')
  const [modoCustom, setModoCustom] = useState(false)

  const toggle = (id: number) => {
    const novos = estado.map(b => b.id === id ? { ...b, ativo: !b.ativo } : b)
    setEstado(novos)
    updateBlocos.mutate({ propostaId, blocos: novos.map(b => ({ id: b.id, ativo: b.ativo, ordem: b.ordem })) })
  }

  const abrirPainel = (b: any) => {
    if (editandoId === b.id) { setEditandoId(null); return }
    setTextoEditando(b.textoOverride ?? '')
    setModoCustom(false)
    setEditandoId(b.id)
  }

  const aplicarModelo = (b: any, conteudo: string) => {
    updateBlocos.mutate({ propostaId, blocos: [{ id: b.id, ativo: b.ativo, ordem: b.ordem, textoOverride: conteudo }] })
    setEstado(est => est.map(x => x.id === b.id ? { ...x, textoOverride: conteudo } : x))
    setEditandoId(null)
  }

  const toggleModeloMulti = (m: any) => {
    const conteudo = m.conteudo.trim()
    setTextoEditando(prev => {
      if (prev.includes(conteudo)) {
        return prev.replace(conteudo, '').replace(/\n{3,}/g, '\n\n').trim()
      }
      return prev ? prev.trim() + '\n\n' + conteudo : conteudo
    })
  }

  const salvarTexto = (b: any) => {
    const novoTexto = textoEditando.trim() || null
    updateBlocos.mutate({ propostaId, blocos: [{ id: b.id, ativo: b.ativo, ordem: b.ordem, textoOverride: novoTexto }] })
    setEstado(est => est.map(x => x.id === b.id ? { ...x, textoOverride: novoTexto } : x))
    setEditandoId(null)
  }

  const ativos   = estado.filter(b => b.ativo).length
  const inativos = estado.length - ativos

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>Ative ou desative os blocos. Blocos marcados <span style={{ color: '#F59E0B', fontWeight: 700 }}>OBR</span> exigem modelo selecionado para gerar o PDF.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ background: `${C.green}15`, color: C.green, border: `1px solid ${C.green}30`, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{ativos} ativos</span>
          <span style={{ background: `${C.darkBorder}40`, color: C.textMuted, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{inativos} inativos</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {estado.map((b, i) => {
          const isConsideracoes = b.tipoBloco === 'consideracoes_gerais'
          const isEscopoEntregas = b.tipoBloco === 'escopo_entregas'
          const isMultiselect = BLOCOS_MULTISELECT.has(b.tipoBloco)
          const fixedText: string = textos?.['consideracoes_gerais']?.conteudo || DEFAULT_CONSIDERACOES_PREVIEW
          const temConteudo = b.textoOverride !== null && b.textoOverride !== undefined
          const isObrigatorio = BLOCOS_OBRIGATORIOS_PDF.has(b.tipoBloco)
          const isBloqueado = isObrigatorio && b.ativo && !temConteudo
          const temCatalogo = BLOCOS_COM_CATALOGO.has(b.tipoBloco)
          const modelosBloco = ((todosModelos as any[]) ?? []).filter((m: any) => m.tipoBloco === b.tipoBloco)
          const textoAtual = b.textoOverride

          return (
            <div key={b.id ?? i}>
              <Card style={{
                padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
                opacity: b.ativo ? 1 : 0.45, transition: 'opacity 0.2s',
                borderLeft: isBloqueado ? `3px solid #EF4444` : b.ativo ? `3px solid ${C.green}` : `3px solid ${C.darkBorder}`,
              }}>
                <span style={{ color: C.textDim, fontSize: 11, fontFamily: 'monospace', minWidth: 20, fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ flex: 1, color: b.ativo ? C.text : C.textMuted, fontSize: 13, fontWeight: b.ativo ? 500 : 400 }}>
                  {BLOCOS_LABELS[b.tipoBloco] ?? b.tipoBloco}
                </span>

                {/* Badges de status */}
                {isObrigatorio && b.ativo && (
                  <span style={{ fontSize: 9, background: '#F59E0B15', color: '#F59E0B', border: '1px solid #F59E0B40', borderRadius: 4, padding: '1px 5px', fontWeight: 700, letterSpacing: '0.05em' }}>OBR</span>
                )}
                {isBloqueado && (
                  <span style={{ fontSize: 10, background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440', borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>
                    ⛔ Sem modelo
                  </span>
                )}
                {temConteudo && !isBloqueado && isMultiselect && (
                  <span style={{ fontSize: 10, background: `${C.green}15`, color: C.green, border: `1px solid ${C.green}30`, borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>
                    ✔ {isConsideracoes ? 'Itens específicos' : 'Conteúdo definido'}
                  </span>
                )}
                {temConteudo && !isMultiselect && BLOCOS_COM_CATALOGO.has(b.tipoBloco) && !isBloqueado && (
                  <span style={{ fontSize: 10, background: `${C.green}15`, color: C.green, border: `1px solid ${C.green}30`, borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>
                    ✔ Modelo aplicado
                  </span>
                )}

                {/* Botão expandir painel */}
                {(temCatalogo || BLOCOS_TEXTO_EDITAVEL.has(b.tipoBloco)) && (
                  <button
                    onClick={() => abrirPainel(b)}
                    style={{ background: 'none', border: `1px solid ${editandoId === b.id ? C.solar : C.darkBorder}`, borderRadius: 6, padding: '3px 9px', fontSize: 11, color: editandoId === b.id ? C.solar : C.textDim, cursor: 'pointer' }}
                  >
                    {editandoId === b.id ? '▲ Fechar' : (isConsideracoes ? '✍️ Itens específicos' : temCatalogo ? '📋 Modelos' : '✏️ Texto')}
                  </button>
                )}
                <Toggle checked={b.ativo} onChange={() => toggle(b.id)} />
              </Card>

              {/* Painel expandido */}
              {editandoId === b.id && (
                <div style={{ background: C.dark, border: `1px solid ${C.darkBorder}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {isConsideracoes ? (
                    /* ── CONSIDERAÇÕES GERAIS: fixed + specific items ── */
                    <>
                      <div>
                        <p style={{ color: C.textDim, fontSize: 11, fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          📌 Itens fixos (configuração da empresa)
                        </p>
                        <div style={{ background: '#0A0F1A', border: `1px solid ${C.darkBorder}`, borderRadius: 8, padding: '10px 12px', opacity: 0.6 }}>
                          {fixedText.split('\n').filter(Boolean).map((l, idx) => (
                            <div key={idx} style={{ color: C.textMuted, fontSize: 11.5, fontFamily: 'monospace', lineHeight: 1.7 }}>{l}</div>
                          ))}
                        </div>
                        <p style={{ color: C.textDim, fontSize: 10, margin: '5px 0 0' }}>
                          Editar itens fixos: <strong style={{ color: C.accent }}>Configurações → Textos Institucionais → Considerações Gerais</strong>
                        </p>
                      </div>

                      {/* Modelo picker para itens específicos — multi-select */}
                      {modelosBloco.length > 0 && (
                        <div>
                          <p style={{ color: C.textDim, fontSize: 11, fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            📋 Modelos — selecione quantos quiser
                          </p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {modelosBloco.map((m: any) => {
                              const selecionado = textoEditando.includes(m.conteudo.trim())
                              return (
                                <button key={m.id} onClick={() => toggleModeloMulti(m)} style={{
                                  background: selecionado ? `${C.solar}20` : '#0A0F1A',
                                  border: `1px solid ${selecionado ? C.solar : C.darkBorder}`,
                                  borderRadius: 8, padding: '8px 12px', cursor: 'pointer', textAlign: 'left', maxWidth: 200,
                                  display: 'flex', alignItems: 'flex-start', gap: 8,
                                }}>
                                  <span style={{ fontSize: 13, flexShrink: 0, color: selecionado ? C.solar : C.textDim }}>{selecionado ? '☑' : '☐'}</span>
                                  <div>
                                    <div style={{ color: selecionado ? C.solar : C.text, fontSize: 12, fontWeight: 600 }}>{m.titulo}</div>
                                    <div style={{ color: C.textDim, fontSize: 10, marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 150 }}>
                                      {m.conteudo.split('\n')[0]?.replace(/^[-•*]\s*/, '').substring(0, 50)}
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <p style={{ color: C.textDim, fontSize: 11, fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ✍️ Itens específicos desta proposta
                        </p>
                        <textarea
                          value={textoEditando}
                          onChange={e => setTextoEditando(e.target.value)}
                          rows={6}
                          style={{ width: '100%', background: '#0A0F1A', border: `1px solid ${C.darkBorder}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6, resize: 'vertical' }}
                          placeholder={'- **Acesso ao local:** O contratante garantirá acesso livre.\n- **Materiais excluídos:** Tubulações existentes não incluídas.'}
                        />
                        <p style={{ color: C.textDim, fontSize: 10, margin: '5px 0 0' }}>
                          Use <code style={{ background: C.darkBorder, padding: '1px 4px', borderRadius: 3 }}>- **Título:** texto</code> para cada item.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Btn size="sm" variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Btn>
                        <Btn size="sm" onClick={() => salvarTexto(b)} disabled={updateBlocos.isPending}>{updateBlocos.isPending ? 'Salvando...' : 'Salvar'}</Btn>
                      </div>
                    </>
                  ) : isEscopoEntregas ? (
                    /* ── O QUE PROPOMOS ENTREGAR: multi-select + textarea ── */
                    <>
                      {isBloqueado && (
                        <div style={{ background: '#EF444415', border: '1px solid #EF444430', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 14 }}>⛔</span>
                          <p style={{ color: '#EF4444', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                            Este bloco é <strong>obrigatório</strong>. Selecione modelos abaixo ou escreva itens manualmente. Sem conteúdo, o PDF não poderá ser gerado.
                          </p>
                        </div>
                      )}

                      {modelosBloco.length > 0 ? (
                        <div>
                          <p style={{ color: C.textDim, fontSize: 11, fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            📋 Selecione os itens — múltipla seleção permitida
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {modelosBloco.map((m: any) => {
                              const selecionado = textoEditando.includes(m.conteudo.trim())
                              return (
                                <button key={m.id} onClick={() => toggleModeloMulti(m)} style={{
                                  background: selecionado ? `${C.solar}15` : '#0A0F1A',
                                  border: `2px solid ${selecionado ? C.solar : C.darkBorder}`,
                                  borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                                  display: 'flex', alignItems: 'flex-start', gap: 12,
                                }}>
                                  <span style={{
                                    minWidth: 20, height: 20, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    background: selecionado ? C.solar : C.darkBorder, color: selecionado ? '#000' : C.textDim, fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2,
                                  }}>{selecionado ? '✔' : ''}</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ color: selecionado ? C.solar : C.text, fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{m.titulo}</div>
                                    <div style={{ color: C.textDim, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.6 }}>
                                      {m.conteudo.split('\n').slice(0, 3).map((l: string, idx: number) => (
                                        <div key={idx} style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{l}</div>
                                      ))}
                                      {m.conteudo.split('\n').length > 3 && <div style={{ color: C.textDim, fontSize: 10 }}>+{m.conteudo.split('\n').length - 3} linhas...</div>}
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: '#0A0F1A', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                          <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 6px' }}>Nenhum modelo cadastrado para este bloco.</p>
                          <p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>
                            Crie modelos em <strong style={{ color: C.accent }}>Configurações → Modelos de Bloco</strong>
                          </p>
                        </div>
                      )}

                      <div>
                        <p style={{ color: C.textDim, fontSize: 11, fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ✍️ Adições manuais / editar conteúdo
                        </p>
                        <textarea
                          value={textoEditando}
                          onChange={e => setTextoEditando(e.target.value)}
                          rows={6}
                          style={{ width: '100%', background: '#0A0F1A', border: `1px solid ${C.darkBorder}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6, resize: 'vertical' }}
                          placeholder={'- Fornecimento e instalação dos equipamentos\n- Comissionamento do sistema\n- Documentação técnica'}
                        />
                        <p style={{ color: C.textDim, fontSize: 10, margin: '5px 0 0' }}>
                          Use <code style={{ background: C.darkBorder, padding: '1px 4px', borderRadius: 3 }}>- Item</code> para cada entrega.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          {(textoEditando.trim() || temConteudo) && (
                            <Btn size="sm" variant="ghost" onClick={() => { setTextoEditando(''); aplicarModelo(b, '') }} style={{ color: C.textDim, borderColor: C.darkBorder }}>
                              ✕ Remover tudo
                            </Btn>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Btn size="sm" variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Btn>
                          <Btn size="sm" onClick={() => salvarTexto(b)} disabled={updateBlocos.isPending}>{updateBlocos.isPending ? 'Salvando...' : 'Salvar'}</Btn>
                        </div>
                      </div>
                    </>
                  ) : temCatalogo ? (
                    /* ── BLOCO COM CATÁLOGO (garantias, fornecedores, regulamentacao, como_funciona) ── */
                    <>
                      {isBloqueado && (
                        <div style={{ background: '#EF444415', border: '1px solid #EF444430', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 14 }}>⛔</span>
                          <p style={{ color: '#EF4444', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                            Este bloco é <strong>obrigatório</strong>. Selecione um modelo abaixo ou escreva um texto personalizado. Sem conteúdo, o PDF não poderá ser gerado.
                          </p>
                        </div>
                      )}

                      {!modoCustom ? (
                        <>
                          {modelosBloco.length > 0 ? (
                            <div>
                              <p style={{ color: C.textDim, fontSize: 11, fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                📋 Selecione um modelo
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {modelosBloco.map((m: any) => {
                                  const selecionado = textoAtual === m.conteudo
                                  return (
                                    <button key={m.id} onClick={() => aplicarModelo(b, m.conteudo)} style={{
                                      background: selecionado ? `${C.solar}15` : '#0A0F1A',
                                      border: `2px solid ${selecionado ? C.solar : C.darkBorder}`,
                                      borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                                      display: 'flex', alignItems: 'flex-start', gap: 12,
                                    }}>
                                      <span style={{
                                        minWidth: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        background: selecionado ? C.solar : C.darkBorder, color: selecionado ? '#000' : C.textDim, fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2,
                                      }}>{selecionado ? '✔' : ''}</span>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ color: selecionado ? C.solar : C.text, fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{m.titulo}</div>
                                        <div style={{ color: C.textDim, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.6 }}>
                                          {m.conteudo.split('\n').slice(0, 3).map((l: string, idx: number) => (
                                            <div key={idx} style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{l}</div>
                                          ))}
                                          {m.conteudo.split('\n').length > 3 && <div style={{ color: C.textDim, fontSize: 10 }}>+{m.conteudo.split('\n').length - 3} linhas...</div>}
                                        </div>
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            <div style={{ background: '#0A0F1A', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                              <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 6px' }}>Nenhum modelo cadastrado para este bloco.</p>
                              <p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>
                                Crie modelos em <strong style={{ color: C.accent }}>Configurações → Modelos de Bloco</strong>
                              </p>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {temConteudo && (
                                <Btn size="sm" variant="ghost" onClick={() => aplicarModelo(b, '')} style={{ color: C.textDim, borderColor: C.darkBorder }}>
                                  ✕ Remover conteúdo
                                </Btn>
                              )}
                            </div>
                            <Btn size="sm" variant="ghost" onClick={() => { setTextoEditando(textoAtual ?? ''); setModoCustom(true) }}>
                              ✏️ Escrever personalizado
                            </Btn>
                          </div>
                        </>
                      ) : (
                        /* Modo texto customizado */
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ color: C.textDim, fontSize: 11, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>✏️ Texto personalizado</p>
                            {modelosBloco.length > 0 && (
                              <button onClick={() => setModoCustom(false)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 11, cursor: 'pointer' }}>
                                ← Voltar aos modelos
                              </button>
                            )}
                          </div>
                          <p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>
                            Use <code style={{ background: C.darkBorder, padding: '1px 4px', borderRadius: 3 }}>- Item</code> para listas e <code style={{ background: C.darkBorder, padding: '1px 4px', borderRadius: 3 }}>- **Título:** texto</code> para destaque.
                          </p>
                          <textarea
                            value={textoEditando}
                            onChange={e => setTextoEditando(e.target.value)}
                            rows={8}
                            style={{ width: '100%', background: '#0A0F1A', border: `1px solid ${C.darkBorder}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6, resize: 'vertical' }}
                            placeholder={'- **Garantia do fabricante:** 12 anos para módulos\n- **Garantia de instalação:** 5 anos contra defeitos'}
                          />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Btn size="sm" variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Btn>
                            <Btn size="sm" onClick={() => salvarTexto(b)} disabled={updateBlocos.isPending}>
                              {updateBlocos.isPending ? 'Salvando...' : 'Salvar'}
                            </Btn>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    /* ── BLOCO SEM CATÁLOGO (texto livre simples) ── */
                    <>
                      <p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>
                        Use <code style={{ background: C.darkBorder, padding: '1px 4px', borderRadius: 3 }}>- Item</code> para listas e <code style={{ background: C.darkBorder, padding: '1px 4px', borderRadius: 3 }}>- **Título:** texto</code> para destaque. Deixe vazio para usar o padrão.
                      </p>
                      <textarea
                        value={textoEditando}
                        onChange={e => setTextoEditando(e.target.value)}
                        rows={8}
                        style={{ width: '100%', background: '#0A0F1A', border: `1px solid ${C.darkBorder}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6, resize: 'vertical' }}
                        placeholder={'- Fornecimento e instalação do painel X\n- Configuração do sistema Y'}
                      />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Btn size="sm" variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Btn>
                        <Btn size="sm" onClick={() => salvarTexto(b)} disabled={updateBlocos.isPending}>
                          {updateBlocos.isPending ? 'Salvando...' : 'Salvar'}
                        </Btn>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ABA: ITENS DO SERVIÇO ───────────────────────────────────────────
function TabItensServico({ itens, propostaId, tituloServico }: { itens: any[]; propostaId: number; tituloServico?: string | null }) {
  const utils = trpc.useUtils()
  const updateItens = trpc.proposta.updateItensServico.useMutation({
    onSuccess: () => { utils.proposta.byId.invalidate({ id: propostaId }); setEditando(false) },
    onError: (e) => alert('Erro: ' + e.message),
  })

  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<{ id: number; descricao: string; unidade: string; quantidade: string; valorUnitario: string }[]>(
    (itens ?? []).map((item, i) => ({
      id: i,
      descricao: item.descricao,
      unidade: item.unidade ?? 'un',
      quantidade: String(item.quantidade),
      valorUnitario: String(item.valorUnitario),
    }))
  )

  const UNIDADES = ['un', 'm', 'm²', 'm³', 'h', 'km', 'kg', 'l', 'pc', 'vb']
  const totalItem = (i: typeof form[0]) => (parseFloat(i.quantidade) || 0) * (parseFloat(i.valorUnitario) || 0)
  const totalGeral = (editando ? form : itens ?? []).reduce((s, i) => s + (editando ? totalItem(i as any) : Number(i.valorTotal)), 0)

  const salvar = () => {
    const validos = form.filter(i => i.descricao.trim() && parseFloat(i.quantidade) > 0)
    if (validos.length === 0) { alert('Adicione ao menos um item válido'); return }
    updateItens.mutate({
      propostaId,
      itens: validos.map((i, idx) => ({
        descricao: i.descricao.trim(),
        unidade: i.unidade,
        quantidade: parseFloat(i.quantidade),
        valorUnitario: parseFloat(i.valorUnitario) || 0,
        ordem: idx + 1,
      })),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {tituloServico && (
        <div style={{ padding: '12px 16px', background: `${C.solar}10`, borderRadius: 10, border: `1px solid ${C.solar}30` }}>
          <span style={{ color: C.textDim, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Serviço</span>
          <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: '4px 0 0' }}>{tituloServico}</p>
        </div>
      )}

      <Card style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Itens e Serviços</p>
          <Btn size="sm" variant="ghost" onClick={() => { setEditando(!editando); if (!editando) setForm((itens ?? []).map((item, i) => ({ id: i, descricao: item.descricao, unidade: item.unidade ?? 'un', quantidade: String(item.quantidade), valorUnitario: String(item.valorUnitario) }))) }}>
            {editando ? '✖ Cancelar' : '✏️ Editar Itens'}
          </Btn>
        </div>

        {editando ? (
          <div>
            {/* Cabeçalho */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px 100px 32px', gap: 8, marginBottom: 8, padding: '0 4px' }}>
              {['Descrição', 'Un.', 'Qtd.', 'Valor Unit.', 'Total', ''].map(h => (
                <span key={h} style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.map((item, idx) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px 100px 32px', gap: 8, alignItems: 'center' }}>
                  <input value={item.descricao} onChange={e => setForm(f => f.map((r, i) => i === idx ? { ...r, descricao: e.target.value } : r))}
                    style={{ padding: '8px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box', width: '100%' }} />
                  <select value={item.unidade} onChange={e => setForm(f => f.map((r, i) => i === idx ? { ...r, unidade: e.target.value } : r))}
                    style={{ padding: '8px 6px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none', width: '100%' }}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input type="number" min="0" step="0.001" value={item.quantidade} onChange={e => setForm(f => f.map((r, i) => i === idx ? { ...r, quantidade: e.target.value } : r))}
                    style={{ padding: '8px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none', textAlign: 'right', boxSizing: 'border-box', width: '100%' }} />
                  <input type="number" min="0" step="0.01" value={item.valorUnitario} onChange={e => setForm(f => f.map((r, i) => i === idx ? { ...r, valorUnitario: e.target.value } : r))}
                    style={{ padding: '8px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 12, outline: 'none', textAlign: 'right', boxSizing: 'border-box', width: '100%' }} />
                  <span style={{ color: C.text, fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{formatCurrency(totalItem(item))}</span>
                  <button onClick={() => form.length > 1 && setForm(f => f.filter((_, i) => i !== idx))} disabled={form.length === 1}
                    style={{ background: 'none', border: 'none', color: form.length === 1 ? C.textMuted : '#F85149', cursor: form.length === 1 ? 'default' : 'pointer', fontSize: 16, fontWeight: 700 }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, alignItems: 'center' }}>
              <Btn size="sm" variant="ghost" onClick={() => setForm(f => [...f, { id: Date.now(), descricao: '', unidade: 'un', quantidade: '1', valorUnitario: '' }])}>+ Adicionar Item</Btn>
              <Btn size="sm" onClick={salvar} disabled={updateItens.isPending}>{updateItens.isPending ? 'Salvando...' : 'Salvar Itens'}</Btn>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px 120px', gap: 8, marginBottom: 8, padding: '0 4px' }}>
              {['Descrição', 'Un.', 'Qtd.', 'Valor Unit.', 'Total'].map(h => (
                <span key={h} style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(itens ?? []).map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px 120px', gap: 8, alignItems: 'center', padding: '10px 4px', borderBottom: `1px solid ${C.darkBorder}30` }}>
                  <span style={{ color: C.text, fontSize: 13 }}>{item.descricao}</span>
                  <span style={{ color: C.textDim, fontSize: 12, textAlign: 'center' }}>{item.unidade}</span>
                  <span style={{ color: C.textDim, fontSize: 12, textAlign: 'right' }}>{Number(item.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</span>
                  <span style={{ color: C.textDim, fontSize: 12, textAlign: 'right' }}>{formatCurrency(item.valorUnitario)}</span>
                  <span style={{ color: C.text, fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{formatCurrency(item.valorTotal)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.darkBorder}` }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: C.textDim, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total da Proposta</div>
            <div style={{ color: C.solar, fontSize: 22, fontWeight: 800 }}>{formatCurrency(totalGeral)}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ─── PRAZO DE EXECUÇÃO ───────────────────────────────────────────────
function PrazoExecucaoBar({ proposta, propostaId }: { proposta: any; propostaId: number }) {
  const utils = trpc.useUtils()
  const updatePrazo = trpc.proposta.updatePrazoExecucao.useMutation({
    onSuccess: () => { utils.proposta.byId.invalidate({ id: propostaId }); setEditando(false) },
    onError: (e) => alert('Erro: ' + e.message),
  })
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(proposta.prazoExecucao ?? '')

  if (!editando) {
    return (
      <div style={{ padding: '8px 24px', background: `${C.darkBorder}30`, borderBottom: `1px solid ${C.darkBorder}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>⏱ Prazo de Execução:</span>
        <span style={{ color: proposta.prazoExecucao ? C.text : C.textMuted, fontSize: 13, flex: 1 }}>
          {proposta.prazoExecucao || <em style={{ color: C.textMuted }}>Não informado</em>}
        </span>
        <button onClick={() => { setValor(proposta.prazoExecucao ?? ''); setEditando(true) }}
          style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 12, padding: '2px 8px', borderRadius: 5 }}>✏️ Editar</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 24px', background: `${C.solar}08`, borderBottom: `1px solid ${C.solar}30`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: C.solar, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>⏱ Prazo de Execução:</span>
      <input value={valor} onChange={e => setValor(e.target.value)} placeholder="Ex: 30 dias úteis após aprovação"
        style={{ flex: 1, padding: '6px 10px', borderRadius: 7, background: C.dark, border: `1px solid ${C.solar}60`, color: C.text, fontSize: 13, outline: 'none' }}
        onKeyDown={e => { if (e.key === 'Enter') updatePrazo.mutate({ propostaId, prazoExecucao: valor }) }}
        autoFocus
      />
      <Btn size="sm" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Btn>
      <Btn size="sm" onClick={() => updatePrazo.mutate({ propostaId, prazoExecucao: valor })} disabled={updatePrazo.isPending}>
        {updatePrazo.isPending ? '...' : '✔ Salvar'}
      </Btn>
    </div>
  )
}

export function PropostaDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const [tabSolar, setTabSolar]         = useState('dimensionamento')
  const [tabServico, setTabServico]     = useState('itens')
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [gerandoContrato, setGerandoContrato] = useState(false)
  const [showClonar, setShowClonar]         = useState(false)
  const [showAltCliente, setShowAltCliente] = useState(false)

  const propostaId = Number(id)
  const { data, isLoading } = trpc.proposta.byId.useQuery({ id: propostaId }, { enabled: !!propostaId })
  const { data: empresa }    = trpc.empresa.get.useQuery()
  const { data: textosData } = trpc.textoInstitucional.list.useQuery()
  const { data: clienteData } = (trpc as any).cliente.byId.useQuery(
    { id: data?.proposta?.clienteId },
    { enabled: !!data?.proposta?.clienteId }
  )
  const updateStatus = trpc.proposta.updateStatus.useMutation()
  const utils = trpc.useUtils()

  const clonarMutation = (trpc as any).proposta.clonar.useMutation({
    onSuccess: (res: any) => { navigate(`/propostas/${res.propostaId}`) },
    onError: (e: any) => alert('Erro ao clonar: ' + (e?.message ?? 'Tente novamente')),
  })
  const updateClienteMutation = (trpc as any).proposta.updateCliente.useMutation({
    onSuccess: () => { setShowAltCliente(false); utils.proposta.byId.invalidate({ id: propostaId }); (utils as any).cliente.byId.invalidate() },
    onError: (e: any) => alert('Erro ao alterar cliente: ' + (e?.message ?? 'Tente novamente')),
  })

  const handleGerarPdf = () => {
    if (!data) { alert('Dados da proposta ainda não carregados.'); return }

    // Validar blocos obrigatórios
    const bls = (data as any).blocos ?? []
    const bloqueados = bls.filter((b: any) =>
      b.ativo &&
      BLOCOS_OBRIGATORIOS_PDF.has(b.tipoBloco) &&
      (b.textoOverride === null || b.textoOverride === undefined)
    )
    if (bloqueados.length > 0) {
      const nomes = bloqueados.map((b: any) => BLOCOS_LABELS[b.tipoBloco] ?? b.tipoBloco).join(', ')
      alert(`⛔ Os blocos abaixo estão ativos mas sem conteúdo:\n\n${nomes}\n\nSelecione um modelo em "Blocos da Proposta" antes de gerar o PDF.`)
      return
    }

    setGerandoPdf(true)
    setTimeout(() => {
      try {
        const textos: Record<string, any> = {}
        if (textosData) { textosData.forEach((t: any) => { textos[t.chave] = t }) }
        const dadosPdf = { ...data, empresa: { ...(data as any).empresa, ...empresa }, textos, cliente: clienteData }
        if ((data as any).proposta?.tipoProposta === 'servico_geral') {
          abrirPdfServicoNoNavegador(dadosPdf)
        } else {
          abrirPdfNoNavegador(dadosPdf)
        }
      } catch (e) {
        alert('Erro ao gerar PDF. Verifique se popups estão permitidos neste site.')
        console.error(e)
      } finally { setGerandoPdf(false) }
    }, 100)
  }

  const handleGerarContrato = () => {
    if (!data) { alert('Dados da proposta ainda não carregados.'); return }
    setGerandoContrato(true)
    setTimeout(() => {
      try {
        const dadosContrato = { ...data, empresa: { ...(data as any).empresa, ...empresa }, cliente: clienteData }
        abrirContratoNoNavegador(dadosContrato)
      } catch (e) {
        alert('Erro ao gerar contrato. Verifique se popups estão permitidos neste site.')
        console.error(e)
      } finally { setGerandoContrato(false) }
    }, 100)
  }

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>
  if (!data) return <EmptyState icon="☹" title="Proposta não encontrada" />

  const { proposta, dimensionamento, equipamentos, precificacao, analiseFinanceira, condicoesComerciais, blocos, itensServico } = data as any
  const isServico = proposta.tipoProposta === 'servico_geral'
  const tab    = isServico ? tabServico : tabSolar
  const setTab = isServico ? setTabServico : setTabSolar
  const TABS   = isServico ? TABS_SERVICO : TABS_SOLAR

  const handleStatus = (status: any) => {
    updateStatus.mutate({ id: propostaId, status }, { onSuccess: () => utils.proposta.byId.invalidate({ id: propostaId }) })
  }

  const nextStatus: Record<string, { label: string; status: string; color: string }> = {
    rascunho: { label: 'Marcar como Enviada', status: 'enviada',  color: C.accent    },
    enviada:  { label: 'Marcar como Aceita',  status: 'aceita',   color: C.green     },
    aceita:   { label: 'Proposta Aceita ✔',   status: 'aceita',   color: C.green     },
    recusada: { label: 'Reabrir',             status: 'rascunho', color: C.textMuted },
    expirada: { label: 'Reabrir',             status: 'rascunho', color: C.textMuted },
  }
  const next = nextStatus[proposta.status] ?? nextStatus.rascunho

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 24px', borderBottom: `1px solid ${C.darkBorder}`, background: C.darkMid, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => navigate('/propostas')} style={{
          padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.darkBorder}`,
          background: `${C.darkBorder}30`, color: C.textMuted, cursor: 'pointer', fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>← Voltar</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ color: C.accent, fontFamily: 'monospace', fontSize: 14, fontWeight: 800 }}>{proposta.numero}</span>
            <Badge status={proposta.status} />
            <span style={{ fontSize: 11, color: C.textDim, background: `${C.darkBorder}40`, borderRadius: 5, padding: '1px 7px' }}>v{proposta.versao}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {clienteData && (
              <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{clienteData.nome}</span>
            )}
            {isServico && proposta.tituloServico && (
              <span style={{ color: C.textDim, fontSize: 12, background: `${C.green}15`, borderRadius: 5, padding: '1px 8px', border: `1px solid ${C.green}30` }}>🔧 {proposta.tituloServico}</span>
            )}
            <span style={{ color: C.textDim, fontSize: 12 }}>
              Emissão: {formatDate(proposta.dataEmissao)}
              {proposta.dataValidade && ` · Validade: ${formatDate(proposta.dataValidade)}`}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {proposta.status !== 'aceita' && (
            <Btn variant="ghost" size="sm" onClick={() => handleStatus(next.status)}
              style={{ color: next.color, borderColor: next.color + '50' }}>{next.label}</Btn>
          )}
          <Btn variant="ghost" size="sm" onClick={() => handleStatus('recusada')}
            style={{ color: C.danger, borderColor: C.danger + '50' }}>Recusar</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setShowAltCliente(true)}
            style={{ color: C.textMuted, borderColor: C.darkBorder }}>👤 Alt. Cliente</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setShowClonar(true)}
            style={{ color: C.accent, borderColor: C.accent + '50' }}>⎘ Clonar</Btn>
          {!isServico && (
            <Btn size="sm" variant="ghost" onClick={handleGerarContrato} disabled={gerandoContrato}
              style={{ borderColor: C.green + '60', color: C.green }}>
              {gerandoContrato ? '⏳ Gerando...' : '📄 Gerar Contrato'}
            </Btn>
          )}
          <Btn size="sm" onClick={handleGerarPdf} disabled={gerandoPdf}>
            {gerandoPdf ? '⏳ Gerando...' : '↯ Exportar PDF'}
          </Btn>
        </div>
      </div>

      {/* ── PRAZO DE EXECUÇÃO ──────────────────────────────────────── */}
      <PrazoExecucaoBar proposta={proposta} propostaId={propostaId} />

      {/* ── ABAS ────────────────────────────────────────────────────── */}
      <div style={{ background: C.darkMid, padding: '0 24px', borderBottom: `1px solid ${C.darkBorder}` }}>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {/* ── CONTEÚDO ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
        {isServico ? (
          <>
            {tab === 'itens'    && <TabItensServico itens={itensServico ?? []} propostaId={propostaId} tituloServico={proposta.tituloServico} />}
            {tab === 'pagamento' && <TabPagamento condicoes={condicoesComerciais} propostaId={propostaId} isServico={true} valorReferencia={itensServico?.reduce((s: number, i: any) => s + Number(i.valorTotal), 0)} />}
            {tab === 'blocos'    && <TabBlocos blocos={blocos} propostaId={propostaId} textos={(() => { const t: Record<string, any> = {}; if (textosData) { (textosData as any[]).forEach((x: any) => { t[x.chave] = x }); } return t })()} />}
          </>
        ) : (
          <>
            {tab === 'dimensionamento' && <TabDimensionamento dim={dimensionamento} equips={equipamentos} propostaId={propostaId} />}
            {tab === 'financeiro'      && <TabFinanceiro af={analiseFinanceira} />}
            {tab === 'precificacao'    && <TabPrecificacao prec={precificacao} propostaId={propostaId} />}
            {tab === 'pagamento'       && <TabPagamento condicoes={condicoesComerciais} propostaId={propostaId} isServico={false} valorReferencia={Number(precificacao?.precoFinal ?? 0)} />}
            {tab === 'blocos'          && <TabBlocos blocos={blocos} propostaId={propostaId} textos={(() => { const t: Record<string, any> = {}; if (textosData) { (textosData as any[]).forEach((x: any) => { t[x.chave] = x }); } return t })()} />}
          </>
        )}
      </div>

      {/* ── MODAL: CLONAR PROPOSTA ───────────────────────────────── */}
      {showClonar && (
        <ModalSelecionarCliente
          titulo="Clonar Proposta"
          subtitulo={`Clonando: ${proposta.numero}`}
          descricao="Escolha para qual cliente deseja clonar. Todos os dados (dimensionamento, precificação, condições) serão copiados."
          clienteAtualId={proposta.clienteId}
          clienteAtualNome={clienteData?.nome}
          labelManterCliente="Manter mesmo cliente"
          labelAcao={clonarMutation.isLoading ? '⏳ Clonando...' : '⎘ Clonar Proposta'}
          loading={clonarMutation.isLoading}
          onConfirm={(clienteId) => clonarMutation.mutate({ propostaId, clienteId })}
          onClose={() => setShowClonar(false)}
        />
      )}

      {/* ── MODAL: ALTERAR CLIENTE ───────────────────────────────── */}
      {showAltCliente && (
        <ModalSelecionarCliente
          titulo="Alterar Cliente da Proposta"
          subtitulo={`Proposta: ${proposta.numero}`}
          descricao="Selecione o novo cliente. A proposta e seus dados serão mantidos, apenas o titular será alterado."
          clienteAtualId={proposta.clienteId}
          clienteAtualNome={clienteData?.nome}
          labelManterCliente={null}
          labelAcao={updateClienteMutation.isLoading ? '⏳ Salvando...' : '✓ Confirmar Alteração'}
          loading={updateClienteMutation.isLoading}
          onConfirm={(clienteId) => updateClienteMutation.mutate({ id: propostaId, clienteId })}
          onClose={() => setShowAltCliente(false)}
        />
      )}
    </div>
  )
}

// ─── MODAL REUTILIZÁVEL: SELECIONAR CLIENTE ──────────────────────────────────
function ModalSelecionarCliente({
  titulo, subtitulo, descricao,
  clienteAtualId, clienteAtualNome,
  labelManterCliente, labelAcao, loading,
  onConfirm, onClose,
}: {
  titulo: string; subtitulo: string; descricao: string;
  clienteAtualId: number; clienteAtualNome?: string;
  labelManterCliente: string | null;
  labelAcao: string; loading: boolean;
  onConfirm: (clienteId: number) => void;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState('')
  const [clienteEscolhidoId, setClienteEscolhidoId]     = useState<number | null>(null)
  const [clienteEscolhidoNome, setClienteEscolhidoNome] = useState('')
  const [manterMesmo, setManterMesmo] = useState(labelManterCliente !== null)

  const { data: resultados } = (trpc as any).cliente.list.useQuery(
    { busca: busca || undefined, porPagina: 10 },
    { enabled: busca.length >= 2, staleTime: 0 },
  )
  const lista: any[] = resultados?.data ?? []

  const clienteFinal = manterMesmo ? clienteAtualId : clienteEscolhidoId
  const podeConfirmar = clienteFinal !== null && clienteFinal !== undefined

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: C.darkCard, borderRadius: 16, border: `1px solid ${C.darkBorder}`, width: 520, maxHeight: '90vh', overflow: 'auto', padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{titulo}</h2>
            <p style={{ color: C.accent, fontSize: 12, fontFamily: 'monospace', margin: 0 }}>{subtitulo}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Descrição */}
        <p style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.6, margin: '0 0 20px', padding: '10px 14px', background: `${C.accent}08`, borderRadius: 8, border: `1px solid ${C.darkBorder}` }}>
          {descricao}
        </p>

        {/* Opção: manter mesmo cliente */}
        {labelManterCliente !== null && (
          <div
            onClick={() => setManterMesmo(true)}
            style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 12, cursor: 'pointer', border: `2px solid ${manterMesmo ? C.accent : C.darkBorder}`, background: manterMesmo ? `${C.accent}10` : 'transparent', transition: 'all 0.15s' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${manterMesmo ? C.accent : C.textDim}`, background: manterMesmo ? C.accent : 'transparent', flexShrink: 0 }} />
              <div>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{labelManterCliente}</div>
                <div style={{ color: C.textMuted, fontSize: 11 }}>{clienteAtualNome ?? `ID ${clienteAtualId}`}</div>
              </div>
            </div>
          </div>
        )}

        {/* Opção: selecionar outro cliente */}
        <div
          onClick={() => setManterMesmo(false)}
          style={{ padding: '12px 16px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${!manterMesmo ? C.solar : C.darkBorder}`, background: !manterMesmo ? `${C.solar}10` : 'transparent', transition: 'all 0.15s' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: !manterMesmo ? 12 : 0 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${!manterMesmo ? C.solar : C.textDim}`, background: !manterMesmo ? C.solar : 'transparent', flexShrink: 0 }} />
            <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
              {labelManterCliente !== null ? 'Selecionar outro cliente' : 'Pesquisar cliente'}
            </div>
          </div>

          {!manterMesmo && (
            <div onClick={e => e.stopPropagation()}>
              {/* Campo de busca */}
              <input
                autoFocus
                value={busca}
                onChange={e => { setBusca(e.target.value); setClienteEscolhidoId(null); setClienteEscolhidoNome('') }}
                placeholder="Digite o nome, CPF/CNPJ..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />

              {/* Cliente selecionado */}
              {clienteEscolhidoId && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: `${C.solar}12`, border: `1px solid ${C.solar}40`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: C.solar, fontSize: 13, fontWeight: 600 }}>✓ {clienteEscolhidoNome}</span>
                  <button onClick={() => { setClienteEscolhidoId(null); setClienteEscolhidoNome(''); setBusca('') }} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
              )}

              {/* Lista de resultados */}
              {lista.length > 0 && !clienteEscolhidoId && (
                <div style={{ marginTop: 6, borderRadius: 8, border: `1px solid ${C.darkBorder}`, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                  {lista.map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => { setClienteEscolhidoId(c.id); setClienteEscolhidoNome(c.nome); setBusca('') }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.darkBorder}30`, background: 'transparent', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = `${C.darkBorder}40`}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                    >
                      <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
                      {(c.cpfCnpj || c.cidade) && (
                        <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>
                          {[c.cpfCnpj, c.cidade && c.estado ? `${c.cidade}/${c.estado}` : c.cidade].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {busca.length >= 2 && lista.length === 0 && (
                <p style={{ color: C.textDim, fontSize: 12, margin: '8px 0 0', textAlign: 'center' }}>Nenhum cliente encontrado</p>
              )}
              {busca.length > 0 && busca.length < 2 && (
                <p style={{ color: C.textDim, fontSize: 11, margin: '6px 0 0' }}>Digite ao menos 2 caracteres para buscar</p>
              )}
            </div>
          )}
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Btn variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Btn>
          <Btn onClick={() => podeConfirmar && onConfirm(clienteFinal!)} disabled={!podeConfirmar || loading}>
            {labelAcao}
          </Btn>
        </div>
      </div>
    </div>
  )
}