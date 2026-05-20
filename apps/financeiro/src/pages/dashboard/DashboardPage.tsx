import { trpc } from '../../lib/trpc'
import { PageWrapper, Card, KpiCard, Spinner, C } from '../../components/ui'
import { fmtBRLFull } from '../../lib/masks'
import { fmtData } from '../../lib/utils'

export function DashboardPage() {
  const { data: resumo, isLoading } = (trpc as any).fin.dashboard.resumo.useQuery()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <Spinner size={32} />
      </div>
    )
  }

  const r = resumo ?? {
    saldoTotal: 0, aReceber: 0, aPagar: 0, resultado: 0,
    vencendoHoje: 0, vencidos: 0,
    contasResume: [],
  }

  return (
    <PageWrapper>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Visão Geral</h2>
        <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>
          Situação financeira atual da Atom Tech
        </p>
      </div>

      {/* KPIs principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="Saldo Total"
          value={fmtBRLFull(r.saldoTotal)}
          icon="💰"
          color={r.saldoTotal >= 0 ? C.emerald : C.danger}
          sub="Soma de todas as contas"
        />
        <KpiCard
          label="A Receber"
          value={fmtBRLFull(r.aReceber)}
          icon="📥"
          color="#34D399"
          sub="Contas em aberto"
        />
        <KpiCard
          label="A Pagar"
          value={fmtBRLFull(r.aPagar)}
          icon="📤"
          color="#F87171"
          sub="Contas em aberto"
        />
        <KpiCard
          label="Resultado Previsto"
          value={fmtBRLFull(r.resultado)}
          icon="📊"
          color={r.resultado >= 0 ? '#60A5FA' : C.danger}
          sub="Receber − Pagar"
        />
      </div>

      {/* Alertas */}
      {(r.vencendoHoje > 0 || r.vencidos > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
          {r.vencendoHoje > 0 && (
            <Card accent="#FBBF24" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 28 }}>⏰</div>
              <div>
                <div style={{ color: '#FBBF24', fontSize: 20, fontWeight: 800 }}>{r.vencendoHoje}</div>
                <div style={{ color: C.textMuted, fontSize: 12 }}>parcela(s) vencendo hoje</div>
              </div>
            </Card>
          )}
          {r.vencidos > 0 && (
            <Card accent="#F87171" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 28 }}>🚨</div>
              <div>
                <div style={{ color: '#F87171', fontSize: 20, fontWeight: 800 }}>{r.vencidos}</div>
                <div style={{ color: C.textMuted, fontSize: 12 }}>parcela(s) vencidas em aberto</div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Saldo por conta */}
      {r.contasResume && r.contasResume.length > 0 && (
        <div>
          <h3 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Saldo por Conta</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
            {r.contasResume.map((c: any) => (
              <Card key={c.id} accent={C.emerald} style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  🏦 {c.nome}
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 800,
                  color: c.saldo >= 0 ? C.credit : C.debit,
                }}>
                  {fmtBRLFull(c.saldo)}
                </div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{c.tipo}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder para lançamentos recentes (Fase 2) */}
      <Card style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📋</div>
        <p style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Lançamentos Recentes</p>
        <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>
          Os últimos lançamentos aparecerão aqui. Comece cadastrando os dados de configuração.
        </p>
      </Card>
    </PageWrapper>
  )
}
