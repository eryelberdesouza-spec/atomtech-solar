// ═══════════════════════════════════════════════════════════════════
// Faturas — Lista geral + Formulário de nova fatura
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatCurrency } from '../../lib/utils'
import { Btn, Card, Input, Select, PageWrapper, SectionHeader, EmptyState, Spinner, C } from '../../components/ui'

// ─── LISTA DE FATURAS ───────────────────────────────────────────────

export function FaturasPage() {
  const navigate = useNavigate()
  const { data: clientes } = trpc.cliente.list.useQuery({ porPagina: 100 })
  const [clienteSelecionado, setClienteSelecionado] = useState<number | null>(null)

  const { data: faturas, isLoading } = trpc.fatura.byCliente.useQuery(
    { clienteId: clienteSelecionado! },
    { enabled: !!clienteSelecionado }
  )

  const clienteOptions = [
    { value: '', label: 'Selecione um cliente para ver faturas...' },
    ...(clientes?.data ?? []).map(c => ({ value: String(c.id), label: c.nome })),
  ]

  return (
    <PageWrapper>
      <SectionHeader
        title="Faturas de Energia"
        action={<Btn onClick={() => navigate('/faturas/nova')}>+ Lançar Fatura</Btn>}
      />

      <div style={{ marginBottom: 20, maxWidth: 420 }}>
        <Select
          label="Filtrar por cliente"
          options={clienteOptions}
          value={clienteSelecionado ? String(clienteSelecionado) : ''}
          onChange={e => setClienteSelecionado(e.target.value ? Number(e.target.value) : null)}
        />
      </div>

      {!clienteSelecionado ? (
        <EmptyState icon="⚡" title="Selecione um cliente" description="Escolha um cliente acima para ver as faturas cadastradas" />
      ) : isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : !faturas?.length ? (
        <EmptyState icon="📋" title="Nenhuma fatura cadastrada"
          description="Lance a primeira fatura deste cliente"
          action={<Btn onClick={() => navigate('/faturas/nova')}>+ Lançar Fatura</Btn>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faturas.map(f => (
            <Card key={f.id} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ color: C.accent, fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                    {f.referencia}
                  </span>
                  <span style={{ color: C.textDim, fontSize: 12 }}>{f.distribuidora}</span>
                </div>
                <p style={{ color: C.textDim, fontSize: 12, margin: 0 }}>
                  UC: {f.codigoUC} · {f.tipoFornecimento}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Consumo</p>
                <p style={{ color: C.solar, fontSize: 16, fontWeight: 700, margin: 0 }}>
                  {f.consumoKwh ? `${Number(f.consumoKwh).toLocaleString('pt-BR')} kWh` : '—'}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Tarifa Média</p>
                <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0, fontFamily: 'monospace' }}>
                  {f.tarifaMedia ? `R$ ${Number(f.tarifaMedia).toFixed(4)}/kWh` : '—'}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>CIP</p>
                <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>
                  {f.cip ? formatCurrency(Number(f.cip)) : '—'}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Total</p>
                <p style={{ color: C.green, fontSize: 15, fontWeight: 700, margin: 0 }}>
                  {f.valorTotal ? formatCurrency(Number(f.valorTotal)) : '—'}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}

// ─── NOVA FATURA ────────────────────────────────────────────────────

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

export function NovaFaturaPage() {
  const navigate = useNavigate()
  const [clienteId, setClienteId] = useState('')
  const [form, setForm] = useState({
    distribuidora: '',
    referencia: '',
    codigoUC: '',
    codigoInstalacao: '',
    tipoFornecimento: '',
    classificacao: '',
    grupoTarifario: 'B' as 'A' | 'B',
    consumoKwh: '',
    valorTotal: '',
    cip: '',
    icmsAliquota: '',
    icmsValor: '',
    pisAliquota: '',
    pisValor: '',
    cofinsAliquota: '',
    cofinsValor: '',
    dataLeituraAnterior: '',
    dataLeituraAtual: '',
    diasFaturados: '',
  })
  // Histórico — 12 meses
  const anoAtual = new Date().getFullYear()
  const [historico, setHistorico] = useState(
    MESES.map((m, i) => ({
      referencia: `${m}/${i > new Date().getMonth() ? anoAtual - 1 : anoAtual}`,
      consumoKwh: '',
      dias: '30',
      ordem: i + 1,
    }))
  )

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const setHist = (i: number, k: string, v: string) =>
    setHistorico(h => h.map((item, idx) => idx === i ? { ...item, [k]: v } : item))

  const { data: clientes } = trpc.cliente.list.useQuery({ porPagina: 100 })
  const createMutation = trpc.fatura.create.useMutation({
    onSuccess: () => navigate('/faturas')
  })

  const clienteOptions = [
    { value: '', label: 'Selecione o cliente...' },
    ...(clientes?.data ?? []).map(c => ({ value: String(c.id), label: c.nome })),
  ]

  const TIPO_FORNECIMENTO = [
    { value: '', label: 'Selecione...' },
    { value: 'MONOFASICO', label: 'Monofásico' },
    { value: 'BIFASICO', label: 'Bifásico' },
    { value: 'TRIFASICO', label: 'Trifásico' },
    { value: 'CONVENCIONAL MONOMIA-TRIFASICO', label: 'Convencional Monomia-Trifásico' },
  ]

  const handleSave = () => {
    if (!clienteId) return
    const histValidos = historico.filter(h => h.consumoKwh && Number(h.consumoKwh) > 0)

    createMutation.mutate({
      clienteId: Number(clienteId),
      ...Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v || undefined])
      ) as any,
      consumoKwh: form.consumoKwh ? Number(form.consumoKwh) : undefined,
      valorTotal: form.valorTotal ? Number(form.valorTotal) : undefined,
      cip: form.cip ? Number(form.cip) : undefined,
      icmsAliquota: form.icmsAliquota ? Number(form.icmsAliquota) : undefined,
      icmsValor: form.icmsValor ? Number(form.icmsValor) : undefined,
      diasFaturados: form.diasFaturados ? Number(form.diasFaturados) : undefined,
      historicoConsumo: histValidos.map(h => ({
        referencia: h.referencia,
        consumoKwh: Number(h.consumoKwh),
        dias: h.dias ? Number(h.dias) : undefined,
        ordem: h.ordem,
      })),
    })
  }

  // Calcula tarifa média automaticamente
  const tarifaCalculada = form.consumoKwh && form.valorTotal && form.cip
    ? ((Number(form.valorTotal) - Number(form.cip)) / Number(form.consumoKwh)).toFixed(6)
    : null

  return (
    <PageWrapper>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/faturas')} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 20 }}>←</button>
        <h2 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: 0 }}>Lançar Fatura de Energia</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Cliente */}
          <Card style={{ padding: '16px 20px' }}>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>Cliente</p>
            <Select label="Cliente *" options={clienteOptions} value={clienteId} onChange={e => setClienteId(e.target.value)} />
          </Card>

          {/* Dados da distribuidora */}
          <Card style={{ padding: '16px 20px' }}>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>Dados da Fatura</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Distribuidora" value={form.distribuidora} onChange={e => set('distribuidora', e.target.value)} placeholder="Neoenergia Brasília" />
              <Input label="Referência (MM/AAAA)" value={form.referencia} onChange={e => set('referencia', e.target.value)} placeholder="FEV/2026" />
              <Input label="Código da UC" value={form.codigoUC} onChange={e => set('codigoUC', e.target.value)} />
              <Input label="Código da Instalação" value={form.codigoInstalacao} onChange={e => set('codigoInstalacao', e.target.value)} />
              <Select label="Tipo de Fornecimento" options={TIPO_FORNECIMENTO} value={form.tipoFornecimento} onChange={e => set('tipoFornecimento', e.target.value)} />
              <Input label="Classificação" value={form.classificacao} onChange={e => set('classificacao', e.target.value)} placeholder="B1 RESIDENCIAL" />
              <Select label="Grupo Tarifário" options={[{ value: 'B', label: 'Grupo B (Baixa Tensão)' }, { value: 'A', label: 'Grupo A (Média/Alta Tensão)' }]} value={form.grupoTarifario} onChange={e => set('grupoTarifario', e.target.value)} />
              <Input label="Dias Faturados" type="number" value={form.diasFaturados} onChange={e => set('diasFaturados', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <Input label="Data Leitura Anterior" type="date" value={form.dataLeituraAnterior} onChange={e => set('dataLeituraAnterior', e.target.value)} />
              <Input label="Data Leitura Atual" type="date" value={form.dataLeituraAtual} onChange={e => set('dataLeituraAtual', e.target.value)} />
            </div>
          </Card>

          {/* Valores */}
          <Card style={{ padding: '16px 20px' }}>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>Valores</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Input label="Consumo (kWh) *" type="number" value={form.consumoKwh} onChange={e => set('consumoKwh', e.target.value)} />
              <Input label="Valor Total (R$) *" type="number" value={form.valorTotal} onChange={e => set('valorTotal', e.target.value)} />
              <Input label="CIP — Ilum. Pública (R$)" type="number" value={form.cip} onChange={e => set('cip', e.target.value)} />
            </div>
            {tarifaCalculada && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: `${C.green}10`, borderRadius: 7, border: `1px solid ${C.green}30` }}>
                <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>
                  Tarifa média calculada: R$ {tarifaCalculada}/kWh
                </span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
              <Input label="ICMS Alíquota (%)" type="number" value={form.icmsAliquota} onChange={e => set('icmsAliquota', e.target.value)} />
              <Input label="PIS Alíquota (%)" type="number" value={form.pisAliquota} onChange={e => set('pisAliquota', e.target.value)} />
              <Input label="COFINS Alíquota (%)" type="number" value={form.cofinsAliquota} onChange={e => set('cofinsAliquota', e.target.value)} />
            </div>
          </Card>
        </div>

        {/* Histórico de consumo */}
        <Card style={{ padding: '16px 20px' }}>
          <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>
            Histórico de Consumo (12 meses)
          </p>
          <p style={{ color: C.textDim, fontSize: 11, margin: '0 0 12px' }}>
            Preencha com os dados da seção "CONSUMO kWh" da fatura.
          </p>
          {historico.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: C.textDim, fontSize: 11, fontFamily: 'monospace', minWidth: 72 }}>{h.referencia}</span>
              <input
                type="number"
                value={h.consumoKwh}
                onChange={e => setHist(i, 'consumoKwh', e.target.value)}
                placeholder="kWh"
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 7,
                  background: C.dark, border: `1px solid ${C.darkBorder}`,
                  color: C.text, fontSize: 12, outline: 'none',
                }}
              />
              <input
                type="number"
                value={h.dias}
                onChange={e => setHist(i, 'dias', e.target.value)}
                placeholder="dias"
                style={{
                  width: 52, padding: '6px 8px', borderRadius: 7,
                  background: C.dark, border: `1px solid ${C.darkBorder}`,
                  color: C.textMuted, fontSize: 11, outline: 'none',
                }}
              />
            </div>
          ))}

          {/* Ações */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {createMutation.error && (
              <div style={{ background: '#3A1A1A', border: `1px solid ${C.danger}`, borderRadius: 8, padding: '8px 12px', color: C.danger, fontSize: 12 }}>
                {createMutation.error.message}
              </div>
            )}
            <Btn
              onClick={handleSave}
              disabled={!clienteId || !form.consumoKwh || !form.valorTotal || createMutation.isPending}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {createMutation.isPending ? 'Salvando...' : '✓ Salvar Fatura'}
            </Btn>
          </div>
        </Card>
      </div>
    </PageWrapper>
  )
}
