import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { trpc } from '../../lib/trpc'
import { PageWrapper, Card, KpiCard, Spinner, C } from '../../components/ui'
import { fmtBRLFull } from '../../lib/masks'
import { fmtData } from '../../lib/utils'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtMes(ym: string) {
  const [y, m] = ym.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[parseInt(m) - 1]}/${y.slice(2)}`
}

function fmtK(v: number) {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`
  return `R$${v.toFixed(0)}`
}

const PERIODO_OPTS = [
  { label: '3 meses',  value: 3  },
  { label: '6 meses',  value: 6  },
  { label: '12 meses', value: 12 },
  { label: '24 meses', value: 24 },
]

const TIPO_OPTS = [
  { label: 'Ambos',    value: 'AMBOS'   },
  { label: 'A Pagar',  value: 'PAGAR'   },
  { label: 'A Receber',value: 'RECEBER' },
]

// ─── seletor de período ────────────────────────────────────────────────────────

function PeriodoSelect({ value, onChange, opts = PERIODO_OPTS }: { value: any; onChange: (v: any) => void; opts?: any[] }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {opts.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            border: `1px solid ${value === o.value ? C.emerald : C.border}`,
            background: value === o.value ? C.emerald + '18' : 'transparent',
            color: value === o.value ? C.emerald : C.textMuted,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── tooltip customizado ───────────────────────────────────────────────────────

function TooltipBRL({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: C.textMuted, marginBottom: 6, fontWeight: 700 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 3 }}>
          {p.name}: <strong>{fmtBRLFull(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

// ─── página ────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [mesesEvolucao, setMesesEvolucao] = useState(12)
  const [tipoStatus, setTipoStatus]       = useState('AMBOS')

  // ⚠️ Todos os hooks ANTES de qualquer early return (Rules of Hooks)
  const { data: resumo, isLoading } = (trpc as any).fin.dashboard.resumo.useQuery()
  const { data: evolucao = [], isLoading: lEv } = (trpc as any).fin.graficos.evolucao.useQuery({ meses: mesesEvolucao })
  const { data: distribuicao = [], isLoading: lDist } = (trpc as any).fin.graficos.distribuicaoDespesas.useQuery({})
  const { data: statusContas = [], isLoading: lStatus } = (trpc as any).fin.graficos.statusContas.useQuery({ tipo: tipoStatus })
  const { data: alertas = [] } = (trpc as any).fin.alerta.list.useQuery({ apenasNaoLidos: true })
  const utils = (trpc as any).useUtils()
  const marcarLido = (trpc as any).fin.alerta.marcarLido.useMutation({
    onSuccess: () => utils.fin.alerta.list.invalidate(),
  })
  const marcarTodosLidos = (trpc as any).fin.alerta.marcarTodosLidos.useMutation({
    onSuccess: () => utils.fin.alerta.list.invalidate(),
  })

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Spinner size={32} />
    </div>
  )

  const r = resumo ?? { saldoTotal: 0, aReceber: 0, aPagar: 0, resultado: 0, vencendoHoje: 0, vencidos: 0, contasResume: [], lancamentosRecentes: [] }

  return (
    <PageWrapper>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Visão Geral</h2>
        <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>Situação financeira atual</p>
      </div>

      {/* ── Alertas de OS concluídas com recebimentos pendentes ── */}
      {(alertas as any[]).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            background: 'linear-gradient(135deg, #1A2E10 0%, #122010 100%)',
            border: '1px solid #34D39940',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 18px',
              background: '#34D39914',
              borderBottom: '1px solid #34D39930',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🔔</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#34D399' }}>
                  {(alertas as any[]).length} OS concluída{(alertas as any[]).length > 1 ? 's' : ''} com recebimento pendente
                </span>
              </div>
              <button
                onClick={() => marcarTodosLidos.mutate()}
                style={{ fontSize: 11, color: '#4A6080', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Marcar todas como resolvidas
              </button>
            </div>

            {/* Lista de alertas */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(alertas as any[]).map((alerta: any) => (
                <div key={alerta.id} style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid #34D39915',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#34D399', fontWeight: 700 }}>
                        {alerta.osNumero}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                        {alerta.clienteNome ?? '—'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{alerta.descricao}</div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#34D399', marginBottom: 4 }}>
                      {fmtBRLFull(Number(alerta.valorPendente) || 0)}
                    </div>
                    <button
                      onClick={() => marcarLido.mutate({ id: alerta.id })}
                      style={{
                        padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        border: '1px solid #34D39940', background: '#34D39914',
                        color: '#34D399', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      ✓ Resolver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Saldo Total"       value={fmtBRLFull(r.saldoTotal)} icon="💰" color={r.saldoTotal >= 0 ? C.emerald : C.danger} sub="Soma de todas as contas" />
        <KpiCard label="A Receber"         value={fmtBRLFull(r.aReceber)}   icon="📥" color="#34D399" sub="Contas em aberto" />
        <KpiCard label="A Pagar"           value={fmtBRLFull(r.aPagar)}     icon="📤" color="#F87171" sub="Contas em aberto" />
        <KpiCard label="Resultado Previsto"value={fmtBRLFull(r.resultado)}  icon="📊" color={r.resultado >= 0 ? '#60A5FA' : C.danger} sub="Receber − Pagar" />
      </div>

      {/* ── Alertas ── */}
      {(r.vencendoHoje > 0 || r.vencidos > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
          {r.vencendoHoje > 0 && (
            <Card accent="#FBBF24" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 28 }}>⏰</div>
              <div><div style={{ color: '#FBBF24', fontSize: 20, fontWeight: 800 }}>{r.vencendoHoje}</div>
                <div style={{ color: C.textMuted, fontSize: 12 }}>parcela(s) vencendo hoje</div></div>
            </Card>
          )}
          {r.vencidos > 0 && (
            <Card accent="#F87171" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 28 }}>🚨</div>
              <div><div style={{ color: '#F87171', fontSize: 20, fontWeight: 800 }}>{r.vencidos}</div>
                <div style={{ color: C.textMuted, fontSize: 12 }}>parcela(s) vencidas em aberto</div></div>
            </Card>
          )}
        </div>
      )}

      {/* ── G1 + G2 — Receitas × Despesas + Saldo ── */}
      <Card style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>Receitas × Despesas</div>
            <div style={{ color: C.textMuted, fontSize: 11 }}>Valores liquidados por mês</div>
          </div>
          <PeriodoSelect value={mesesEvolucao} onChange={setMesesEvolucao} />
        </div>
        {lEv ? <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div> : (
          evolucao.length === 0 ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontSize: 13 }}>
              Nenhum dado no período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={evolucao.map((e: any) => ({ ...e, mes: fmtMes(e.mes) }))} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={58} />
                <Tooltip content={<TooltipBRL />} />
                <Legend wrapperStyle={{ fontSize: 12, color: C.textMuted }} />
                <Bar dataKey="receitas" name="Receitas"  fill="#10B981" radius={[4,4,0,0]} />
                <Bar dataKey="despesas" name="Despesas"  fill="#F87171" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        )}
      </Card>

      {/* ── G2 — Evolução do Saldo ── */}
      {!lEv && evolucao.length > 0 && (
        <Card style={{ padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>Evolução do Saldo</div>
            <div style={{ color: C.textMuted, fontSize: 11 }}>Saldo acumulado ao final de cada mês</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolucao.map((e: any) => ({ ...e, mes: fmtMes(e.mes) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={58} />
              <Tooltip content={<TooltipBRL />} />
              <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#60A5FA" strokeWidth={2.5} dot={{ r: 4, fill: '#60A5FA' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── G3 + G4 — Distribuição de Despesas + Status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* G3 — Distribuição de Despesas */}
        <Card style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>Distribuição de Despesas</div>
            <div style={{ color: C.textMuted, fontSize: 11 }}>Por plano de contas (ano corrente)</div>
          </div>
          {lDist ? <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div> : (
            distribuicao.length === 0 ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontSize: 13 }}>Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={distribuicao} dataKey="total" nameKey="nome" cx="50%" cy="50%" outerRadius={80} innerRadius={44} paddingAngle={2}>
                    {distribuicao.map((_: any, i: number) => (
                      <Cell key={i} fill={['#10B981','#60A5FA','#F59E0B','#A78BFA','#F87171','#34D399','#FB923C','#818CF8','#38BDF8','#E879F9'][i % 10]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtBRLFull(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11, color: C.textMuted }} />
                </PieChart>
              </ResponsiveContainer>
            )
          )}
        </Card>

        {/* G4 — Status das Contas */}
        <Card style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>Status das Contas</div>
              <div style={{ color: C.textMuted, fontSize: 11 }}>Distribuição por situação</div>
            </div>
            <PeriodoSelect value={tipoStatus} onChange={setTipoStatus} opts={TIPO_OPTS} />
          </div>
          {lStatus ? <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusContas} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={44} paddingAngle={2}>
                  {statusContas.map((s: any) => <Cell key={s.name} fill={s.fill} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtBRLFull(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11, color: C.textMuted }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Saldo por Conta ── */}
      {r.contasResume?.length > 0 && (
        <div>
          <h3 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Saldo por Conta</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
            {r.contasResume.map((c: any) => (
              <Card key={c.id} accent={C.emerald} style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>🏦 {c.nome}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.saldo >= 0 ? C.credit : C.debit }}>{fmtBRLFull(c.saldo)}</div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{c.tipo}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Lançamentos Recentes ── */}
      <div>
        <h3 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Lançamentos Recentes</h3>
        {r.lancamentosRecentes?.length === 0 ? (
          <Card style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📋</div>
            <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>Nenhum lançamento encontrado.</p>
          </Card>
        ) : (
          <Card style={{ overflow: 'hidden', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid ' + C.border }}>
                  {['Tipo','Descrição','Pessoa','Data','Valor'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Valor' ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.lancamentosRecentes?.map((l: any) => (
                  <tr key={l.tituloId} style={{ borderBottom: '1px solid ' + C.border + '60' }}>
                    <td style={{ padding: '10px 16px' }}>
                      {l.tipo === 'RECEBER' ? <span style={{ fontSize: 11, fontWeight: 700, color: C.credit }}>📥 Receber</span>
                                            : <span style={{ fontSize: 11, fontWeight: 700, color: C.debit  }}>📤 Pagar</span>}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: C.text, maxWidth: 240 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.descricao}</div>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: C.textMuted }}>{l.pessoaNome ?? <span style={{ color: C.textDim }}>—</span>}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>{fmtData(l.emissao)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: l.tipo === 'RECEBER' ? C.credit : C.debit }}>{fmtBRLFull(l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}
