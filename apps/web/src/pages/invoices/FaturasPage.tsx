// ═══════════════════════════════════════════════════════════════════
// Faturas — Lista geral + Formulário de nova fatura
// ═══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatCurrency } from '../../lib/utils'
import { Btn, Card, Input, Select, PageWrapper, SectionHeader, EmptyState, Spinner, C } from '../../components/ui'

// ─── LISTA DE FATURAS ─────────────────────────────────────────────────────────
export function FaturasPage() {
  const navigate = useNavigate()
  const { data: clientes } = trpc.cliente.list.useQuery({ porPagina: 100 })
  const [clienteSelecionado, setClienteSelecionado] = useState<number | null>(null)
  const { data: faturas, isLoading } = trpc.fatura.byCliente.useQuery(
    { clienteId: clienteSelecionado! },
    { enabled: !!clienteSelecionado }
  )

  const clienteOptions = [
    { value: '', label: 'Selecione um cliente...' },
    ...(clientes?.data ?? []).map(c => ({ value: String(c.id), label: c.nome })),
  ]

  // Estatísticas calculadas das faturas
  const totalConsumo = faturas?.reduce((acc, f) => acc + Number(f.consumoKwh ?? 0), 0) ?? 0
  const totalValor = faturas?.reduce((acc, f) => acc + Number(f.valorTotal ?? 0), 0) ?? 0
  const mediaConsumo = faturas?.length ? totalConsumo / faturas.length : 0

  return (
    <PageWrapper>
      <SectionHeader title="Faturas de Energia" action={<Btn onClick={() => navigate('/faturas/nova')}>+ Lançar Fatura</Btn>} />

      {/* Seletor de cliente */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ maxWidth: 440 }}>
          <Select
            label="Filtrar por cliente"
            options={clienteOptions}
            value={clienteSelecionado ? String(clienteSelecionado) : ''}
            onChange={e => setClienteSelecionado(e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      </div>

      {!clienteSelecionado ? (
        /* Estado vazio — nenhum cliente selecionado */
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 20px', gap: 12,
          background: C.darkCard, borderRadius: 14, border: `1px dashed ${C.darkBorder}`,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: `${C.solar}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          }}>⚡</div>
          <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>Selecione um cliente</p>
          <p style={{ color: C.textDim, fontSize: 13, margin: 0, textAlign: 'center', maxWidth: 300 }}>
            Escolha um cliente acima para visualizar o histórico de faturas de energia
          </p>
          <Btn variant="ghost" size="sm" onClick={() => navigate('/faturas/nova')} style={{ marginTop: 8 }}>
            + Lançar nova fatura
          </Btn>
        </div>
      ) : isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : !faturas?.length ? (
        <EmptyState icon="📋" title="Nenhuma fatura cadastrada" description="Lance a primeira fatura deste cliente"
          action={<Btn onClick={() => navigate('/faturas/nova')}>+ Lançar Fatura</Btn>} />
      ) : (
        <>
          {/* Stats do cliente selecionado */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            {[
              { label: 'Faturas', value: String(faturas.length), color: C.accent, icon: '📋' },
              { label: 'Consumo Total', value: `${totalConsumo.toLocaleString('pt-BR')} kWh`, color: C.solar, icon: '⚡' },
              { label: 'Média Mensal', value: `${Math.round(mediaConsumo).toLocaleString('pt-BR')} kWh`, color: C.textDim, icon: '📊' },
              { label: 'Total Pago', value: formatCurrency(totalValor), color: C.green, icon: '💰' },
            ].map(s => (
              <div key={s.label} style={{
                background: C.darkCard, border: `1px solid ${C.darkBorder}`,
                borderRadius: 10, padding: '12px 16px', flex: 1,
              }}>
                <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>
                  {s.icon} {s.label}
                </p>
                <p style={{ color: s.color, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Lista de faturas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {faturas.map(f => (
              <Card key={f.id} style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  {/* Barra lateral colorida */}
                  <div style={{
                    width: 4, flexShrink: 0,
                    background: `linear-gradient(180deg, ${C.solar}, ${C.accent})`,
                  }} />

                  <div style={{ flex: 1, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
                    {/* Referência + distribuidora */}
                    <div style={{ minWidth: 110 }}>
                      <p style={{ color: C.accent, fontFamily: 'monospace', fontSize: 14, fontWeight: 800, margin: '0 0 3px' }}>
                        {f.referencia}
                      </p>
                      <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>{f.distribuidora}</p>
                    </div>

                    {/* UC + tipo */}
                    <div style={{ flex: 1 }}>
                      <p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>
                        {f.codigoUC && <span>UC: <span style={{ color: C.text, fontFamily: 'monospace' }}>{f.codigoUC}</span></span>}
                        {f.codigoUC && f.tipoFornecimento && <span style={{ color: C.darkBorder }}> · </span>}
                        {f.tipoFornecimento && <span>{f.tipoFornecimento}</span>}
                      </p>
                    </div>

                    {/* Consumo */}
                    <div style={{ textAlign: 'center', minWidth: 90 }}>
                      <p style={{ color: C.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px', fontWeight: 600 }}>
                        Consumo
                      </p>
                      <p style={{ color: C.solar, fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'monospace' }}>
                        {f.consumoKwh ? `${Number(f.consumoKwh).toLocaleString('pt-BR')}` : '—'}
                      </p>
                      {f.consumoKwh && <p style={{ color: C.textMuted, fontSize: 9, margin: 0 }}>kWh</p>}
                    </div>

                    {/* Separador */}
                    <div style={{ width: 1, height: 36, background: C.darkBorder, opacity: 0.4 }} />

                    {/* Tarifa média */}
                    <div style={{ textAlign: 'center', minWidth: 100 }}>
                      <p style={{ color: C.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px', fontWeight: 600 }}>
                        Tarifa Média
                      </p>
                      <p style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>
                        {f.tarifaMedia ? `R$ ${Number(f.tarifaMedia).toFixed(4)}` : '—'}
                      </p>
                      {f.tarifaMedia && <p style={{ color: C.textMuted, fontSize: 9, margin: 0 }}>/kWh</p>}
                    </div>

                    {/* CIP */}
                    <div style={{ textAlign: 'center', minWidth: 70 }}>
                      <p style={{ color: C.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px', fontWeight: 600 }}>
                        CIP
                      </p>
                      <p style={{ color: C.textDim, fontSize: 13, fontWeight: 600, margin: 0 }}>
                        {f.cip ? formatCurrency(Number(f.cip)) : '—'}
                      </p>
                    </div>

                    {/* Separador */}
                    <div style={{ width: 1, height: 36, background: C.darkBorder, opacity: 0.4 }} />

                    {/* Total */}
                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                      <p style={{ color: C.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px', fontWeight: 600 }}>
                        Total
                      </p>
                      <p style={{ color: C.green, fontSize: 16, fontWeight: 800, margin: 0 }}>
                        {f.valorTotal ? formatCurrency(Number(f.valorTotal)) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageWrapper>
  )
}

// ─── NOVA FATURA ──────────────────────────────────────────────────────────────

function gerarHistoricoInicial() {
  const agora   = new Date()
  const mesAtual = agora.getMonth()
  const anoAtual = agora.getFullYear()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(anoAtual, mesAtual - i, 1)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const aa = d.getFullYear()
    return { referencia: `${mm}/${aa}`, consumoKwh: '', dias: '30', ordem: i + 1 }
  })
}

const TIPO_FORNECIMENTO = [
  { value: '', label: 'Selecione...' },
  { value: 'MONOFASICO',                        label: 'Monofásico' },
  { value: 'BIFASICO',                          label: 'Bifásico' },
  { value: 'TRIFASICO',                         label: 'Trifásico' },
  { value: 'CONVENCIONAL MONOMIA-TRIFASICO',    label: 'Convencional Monomia-Trifásico' },
]

// Componente auxiliar de seção do formulário
function FormSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8, background: `${C.accent}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
        }}>{icon}</span>
        <p style={{ color: C.text, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{title}</p>
      </div>
      {children}
    </Card>
  )
}

export function NovaFaturaPage() {
  const navigate = useNavigate()
  const [clienteId, setClienteId] = useState('')
  const [form, setForm] = useState({
    distribuidora:        '',
    referencia:           '',
    codigoUC:             '',
    codigoInstalacao:     '',
    tipoFornecimento:     '',
    classificacao:        '',
    grupoTarifario:       'B' as 'A' | 'B',
    consumoKwh:           '',
    valorTotal:           '',
    cip:                  '',
    icmsAliquota:         '',
    icmsValor:            '',
    pisAliquota:          '',
    pisValor:             '',
    cofinsAliquota:       '',
    cofinsValor:          '',
    dataLeituraAnterior:  '',
    dataLeituraAtual:     '',
    diasFaturados:        '',
  })

  const [historico, setHistorico] = useState(gerarHistoricoInicial)
  const set     = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const setHist = (i: number, k: string, v: string) => setHistorico(h => h.map((item, idx) => idx === i ? { ...item, [k]: v } : item))

  const { data: clientes }  = trpc.cliente.list.useQuery({ porPagina: 100 })
  const createMutation = trpc.fatura.create.useMutation({ onSuccess: () => navigate('/faturas') })

  const clienteOptions = [
    { value: '', label: 'Selecione o cliente...' },
    ...(clientes?.data ?? []).map(c => ({ value: String(c.id), label: c.nome })),
  ]

  const tarifaCalculada = form.consumoKwh && form.valorTotal && form.cip
    ? ((Number(form.valorTotal) - Number(form.cip)) / Number(form.consumoKwh)).toFixed(6)
    : null

  const handleSave = () => {
    if (!clienteId) return
    const histValidos = historico.filter(h => h.consumoKwh && Number(h.consumoKwh) > 0)
    createMutation.mutate({
      clienteId:            Number(clienteId),
      distribuidora:        form.distribuidora        || undefined,
      referencia:           form.referencia           || undefined,
      codigoUC:             form.codigoUC             || undefined,
      codigoInstalacao:     form.codigoInstalacao     || undefined,
      tipoFornecimento:     form.tipoFornecimento     || undefined,
      classificacao:        form.classificacao        || undefined,
      grupoTarifario:       form.grupoTarifario       as 'A' | 'B',
      consumoKwh:           form.consumoKwh           ? Number(form.consumoKwh)      : undefined,
      valorTotal:           form.valorTotal           ? Number(form.valorTotal)       : undefined,
      cip:                  form.cip                  ? Number(form.cip)              : undefined,
      icmsAliquota:         form.icmsAliquota         ? Number(form.icmsAliquota)     : undefined,
      icmsValor:            form.icmsValor            ? Number(form.icmsValor)        : undefined,
      pisAliquota:          form.pisAliquota          ? Number(form.pisAliquota)      : undefined,
      pisValor:             form.pisValor             ? Number(form.pisValor)         : undefined,
      cofinsAliquota:       form.cofinsAliquota       ? Number(form.cofinsAliquota)   : undefined,
      cofinsValor:          form.cofinsValor          ? Number(form.cofinsValor)      : undefined,
      dataLeituraAnterior:  form.dataLeituraAnterior  || undefined,
      dataLeituraAtual:     form.dataLeituraAtual     || undefined,
      diasFaturados:        form.diasFaturados        ? Number(form.diasFaturados)    : undefined,
      historicoConsumo: histValidos.map(h => ({
        referencia:  h.referencia,
        consumoKwh:  Number(h.consumoKwh),
        dias:        h.dias ? Number(h.dias) : undefined,
        ordem:       h.ordem,
      })),
    } as any)
  }

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/faturas')} style={{
          background: `${C.darkBorder}40`, border: 'none', color: C.textMuted,
          cursor: 'pointer', fontSize: 16, width: 34, height: 34, borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <div>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>Lançar Fatura de Energia</h2>
          <p style={{ color: C.textDim, fontSize: 12, margin: '2px 0 0' }}>Preencha os dados da fatura conforme o documento físico</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Cliente */}
          <FormSection icon="👤" title="Cliente">
            <Select label="Cliente *" options={clienteOptions} value={clienteId} onChange={e => setClienteId(e.target.value)} />
          </FormSection>

          {/* Dados da Fatura */}
          <FormSection icon="📄" title="Dados da Fatura">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Distribuidora" value={form.distribuidora} onChange={e => set('distribuidora', e.target.value)} placeholder="Neoenergia Brasília" />
              <Input
                label="Referência (MM/AAAA) *"
                value={form.referencia}
                onChange={e => set('referencia', e.target.value)}
                placeholder="02/2026"
                maxLength={7}
              />
              <Input label="Código da UC" value={form.codigoUC} onChange={e => set('codigoUC', e.target.value)} />
              <Input label="Código da Instalação" value={form.codigoInstalacao} onChange={e => set('codigoInstalacao', e.target.value)} />
              <Select label="Tipo de Fornecimento" options={TIPO_FORNECIMENTO} value={form.tipoFornecimento} onChange={e => set('tipoFornecimento', e.target.value)} />
              <Input label="Classificação" value={form.classificacao} onChange={e => set('classificacao', e.target.value)} placeholder="B1 RESIDENCIAL" />
              <Select label="Grupo Tarifário"
                options={[{ value: 'B', label: 'Grupo B (Baixa Tensão)' }, { value: 'A', label: 'Grupo A (Média/Alta Tensão)' }]}
                value={form.grupoTarifario}
                onChange={e => set('grupoTarifario', e.target.value)}
              />
              <Input label="Dias Faturados" type="number" value={form.diasFaturados} onChange={e => set('diasFaturados', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <Input label="Data Leitura Anterior" type="date" value={form.dataLeituraAnterior} onChange={e => set('dataLeituraAnterior', e.target.value)} />
              <Input label="Data Leitura Atual"    type="date" value={form.dataLeituraAtual}    onChange={e => set('dataLeituraAtual',    e.target.value)} />
            </div>
          </FormSection>

          {/* Valores */}
          <FormSection icon="💰" title="Valores">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Input label="Consumo (kWh) *"          type="number" value={form.consumoKwh}   onChange={e => set('consumoKwh',   e.target.value)} />
              <Input label="Valor Total (R$) *"        type="number" value={form.valorTotal}   onChange={e => set('valorTotal',   e.target.value)} />
              <Input label="CIP — Ilum. Pública (R$)" type="number" value={form.cip}          onChange={e => set('cip',          e.target.value)} />
            </div>

            {/* Tarifa calculada — destaque visual */}
            {tarifaCalculada && (
              <div style={{
                marginTop: 12, padding: '12px 16px',
                background: `${C.green}10`, borderRadius: 10,
                border: `1px solid ${C.green}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>⚡</span>
                  <div>
                    <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                      Tarifa média calculada
                    </p>
                    <p style={{ color: C.green, fontSize: 18, fontWeight: 800, margin: 0, fontFamily: 'monospace' }}>
                      R$ {tarifaCalculada}/kWh
                    </p>
                  </div>
                </div>
                <span style={{
                  background: `${C.green}20`, color: C.green, fontSize: 10, fontWeight: 700,
                  borderRadius: 6, padding: '4px 10px',
                }}>Auto</span>
              </div>
            )}

            {/* Tributos */}
            <div style={{
              marginTop: 16, paddingTop: 14,
              borderTop: `1px solid ${C.darkBorder}40`,
            }}>
              <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>
                Tributos (opcional)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Input label="ICMS Alíquota (%)"   type="number" value={form.icmsAliquota}   onChange={e => set('icmsAliquota',   e.target.value)} />
                <Input label="PIS Alíquota (%)"    type="number" value={form.pisAliquota}    onChange={e => set('pisAliquota',    e.target.value)} />
                <Input label="COFINS Alíquota (%)" type="number" value={form.cofinsAliquota} onChange={e => set('cofinsAliquota', e.target.value)} />
              </div>
            </div>
          </FormSection>
        </div>

        {/* Histórico de consumo */}
        <Card style={{ padding: '18px 20px', position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8, background: `${C.solar}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
            }}>📊</span>
            <p style={{ color: C.text, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Histórico de Consumo
            </p>
          </div>
          <p style={{ color: C.textDim, fontSize: 11, margin: '0 0 14px', lineHeight: 1.5 }}>
            Dados da seção "CONSUMO kWh" da fatura — últimos 12 meses.
          </p>

          {/* Cabeçalho da tabela */}
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 1fr 52px',
            gap: 8, marginBottom: 6, padding: '0 2px',
          }}>
            {['Mês/Ano', 'kWh', 'Dias'].map(h => (
              <span key={h} style={{
                color: C.textMuted, fontSize: 9, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>{h}</span>
            ))}
          </div>

          {/* Linhas do histórico */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {historico.map((h, i) => {
              const temConsumo = h.consumoKwh && Number(h.consumoKwh) > 0
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr 52px',
                  gap: 8, alignItems: 'center',
                  background: i === 0 ? `${C.accent}08` : 'transparent',
                  borderRadius: 6, padding: '2px',
                }}>
                  <input
                    value={h.referencia}
                    onChange={e => setHist(i, 'referencia', e.target.value.slice(0, 7))}
                    maxLength={7}
                    placeholder="MM/AAAA"
                    style={{
                      width: '100%', padding: '6px 8px', borderRadius: 7,
                      fontFamily: 'monospace', fontSize: 11, outline: 'none',
                      background: C.dark, border: `1px solid ${C.darkBorder}`,
                      color: i === 0 ? C.accent : C.textDim,
                      fontWeight: i === 0 ? 700 : 400,
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="number"
                    value={h.consumoKwh}
                    onChange={e => setHist(i, 'consumoKwh', e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: 7, outline: 'none',
                      background: C.dark, border: `1px solid ${temConsumo ? C.solar + '50' : C.darkBorder}`,
                      color: temConsumo ? C.solar : C.text, fontSize: 12,
                      fontWeight: temConsumo ? 700 : 400, boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="number"
                    value={h.dias}
                    onChange={e => setHist(i, 'dias', e.target.value)}
                    placeholder="30"
                    style={{
                      width: '100%', padding: '6px 8px', borderRadius: 7, outline: 'none',
                      background: C.dark, border: `1px solid ${C.darkBorder}`,
                      color: C.textMuted, fontSize: 11, textAlign: 'center',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )
            })}
          </div>

          {/* Resumo do histórico */}
          {historico.some(h => h.consumoKwh && Number(h.consumoKwh) > 0) && (
            <div style={{
              marginTop: 14, padding: '10px 12px',
              background: `${C.solar}10`, borderRadius: 8, border: `1px solid ${C.solar}25`,
            }}>
              <p style={{ color: C.textMuted, fontSize: 10, margin: '0 0 3px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Média histórica
              </p>
              <p style={{ color: C.solar, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>
                {Math.round(
                  historico.filter(h => h.consumoKwh && Number(h.consumoKwh) > 0)
                    .reduce((acc, h) => acc + Number(h.consumoKwh), 0) /
                  historico.filter(h => h.consumoKwh && Number(h.consumoKwh) > 0).length
                ).toLocaleString('pt-BR')} kWh/mês
              </p>
            </div>
          )}

          {/* Ações */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {createMutation.error && (
              <div style={{
                background: '#3A1A1A', border: `1px solid ${C.danger}`,
                borderRadius: 8, padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>⛔</span>
                <span style={{ color: C.danger, fontSize: 12 }}>{createMutation.error.message}</span>
              </div>
            )}
            <Btn
              onClick={handleSave}
              disabled={!clienteId || !form.consumoKwh || !form.valorTotal || createMutation.isLoading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {createMutation.isLoading ? 'Salvando...' : '✓ Salvar Fatura'}
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => navigate('/faturas')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Cancelar
            </Btn>
          </div>
        </Card>
      </div>
    </PageWrapper>
  )
}
