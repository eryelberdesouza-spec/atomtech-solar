// ═══════════════════════════════════════════════════════════════════
// DRE — Demonstrativo de Resultado do Exercício
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { trpc } from '../lib/trpc'
import { PageWrapper, C, KpiCard, Spinner, Alert, Btn } from '../components/ui'
import { fmtBRLFull } from '../lib/masks'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const MESES_LABEL: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

function anoAtual() { return new Date().getFullYear() }

// Último dia real do mês (28/29/30/31) — mês 1-indexado (1=janeiro)
function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate()
}

function periodoParaDatas(ano: number, periodo: string): { de: string; ate: string } {
  if (periodo === 'anual') {
    return { de: `${ano}-01-01`, ate: `${ano}-12-31` }
  }
  if (periodo.startsWith('T')) {
    const t = Number(periodo[1])
    const mIni = (t - 1) * 3 + 1
    const mFim = t * 3
    return {
      de:  `${ano}-${String(mIni).padStart(2, '0')}-01`,
      ate: `${ano}-${String(mFim).padStart(2, '0')}-${String(ultimoDiaDoMes(ano, mFim)).padStart(2, '0')}`,
    }
  }
  // mês MM — "31" fixo aqui gerava data inválida (ex.: 2026-02-31) e o MySQL
  // devolvia ZERO linhas no BETWEEN para qualquer mês com menos de 31 dias
  // (achado em 2026-08-01: relatório "vazio" em fev/abr/jun/set/nov e nos
  // trimestres que terminam nesses meses)
  const mes = Number(periodo)
  return {
    de:  `${ano}-${periodo}-01`,
    ate: `${ano}-${periodo}-${String(ultimoDiaDoMes(ano, mes)).padStart(2, '0')}`,
  }
}

function fmtMes(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return `${MESES_LABEL[m] ?? m}/${y.slice(2)}`
}

function pct(valor: number, base: number) {
  if (!base) return '—'
  return `${((valor / base) * 100).toFixed(1)}%`
}

// ─── COMPONENTE DE LINHA DA CONTA ─────────────────────────────────────────────

function LinhaPlano({
  conta, totalReferencia, cor,
}: {
  conta: { id: number; codigo: string; nome: string; total: number; qtd: number }
  totalReferencia: number
  cor: string
}) {
  const barW = totalReferencia > 0 ? Math.min((conta.total / totalReferencia) * 100, 100) : 0
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 90px 70px',
      alignItems: 'center', gap: 12,
      padding: '9px 16px',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: C.textMuted, fontFamily: 'monospace' }}>{conta.codigo}</span>
          <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{conta.nome}</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: C.border, overflow: 'hidden' }}>
          <div style={{ width: `${barW}%`, height: '100%', background: cor, borderRadius: 2, transition: 'width .4s' }} />
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: C.text }}>
        {fmtBRLFull(conta.total)}
      </div>
      <div style={{ textAlign: 'right', fontSize: 11, color: C.textMuted }}>
        {pct(conta.total, totalReferencia)}
      </div>
    </div>
  )
}

// ─── COMPONENTE DE SEÇÃO ──────────────────────────────────────────────────────

function SecaoDRE({
  titulo, cor, icone, contas, total, totalReceitas,
}: {
  titulo: string
  cor: string
  icone: string
  contas: { id: number; codigo: string; nome: string; total: number; qtd: number }[]
  total: number
  totalReceitas: number
}) {
  const [aberta, setAberta] = useState(true)
  return (
    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
      {/* Cabeçalho da seção */}
      <div
        onClick={() => setAberta(a => !a)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', cursor: 'pointer',
          background: cor + '12',
          borderBottom: aberta ? `1px solid ${C.border}` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: cor + '25', color: cor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
          }}>{icone}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {titulo}
          </span>
          <span style={{ fontSize: 11, color: C.textMuted }}>({contas.length} conta{contas.length !== 1 ? 's' : ''})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: cor }}>{fmtBRLFull(total)}</span>
          <span style={{ fontSize: 11, color: C.textMuted }}>{pct(total, totalReceitas)}</span>
          <span style={{ color: C.textMuted, fontSize: 12 }}>{aberta ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Linhas de contas */}
      {aberta && (
        contas.length === 0 ? (
          <div style={{ padding: '14px 16px', color: C.textMuted, fontSize: 12, textAlign: 'center' }}>
            Nenhum lançamento neste período
          </div>
        ) : (
          <>
            <div style={{ background: C.card }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 90px 70px',
                padding: '6px 16px', borderBottom: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Conta</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', textAlign: 'right' }}>Valor</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', textAlign: 'right' }}>% Receita</span>
              </div>
              {contas.map(c => (
                <LinhaPlano key={c.id} conta={c} totalReferencia={total} cor={cor} />
              ))}
            </div>
          </>
        )
      )}
    </div>
  )
}

// ─── GRÁFICO DE EVOLUÇÃO MENSAL ───────────────────────────────────────────────

function GraficoEvolucao({
  evolucao,
}: {
  evolucao: { mes: string; receitas: number; despesas: number; resultado: number }[]
}) {
  if (!evolucao.length) return null
  const maxVal = Math.max(...evolucao.map(m => Math.max(m.receitas, m.despesas)), 1)

  return (
    <div style={{
      background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: '20px 20px 12px', marginBottom: 20,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>
        Evolução Mensal
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        {[
          { label: 'Receitas', cor: '#34D399' },
          { label: 'Despesas', cor: '#F87171' },
          { label: 'Resultado', cor: '#60A5FA' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.cor }} />
            <span style={{ fontSize: 11, color: C.textMuted }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Barras */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 140 }}>
        {evolucao.map(m => {
          const hRec = Math.round((m.receitas / maxVal) * 120)
          const hDesp = Math.round((m.despesas / maxVal) * 120)
          const res = m.resultado
          return (
            <div key={m.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
              <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 120 }}>
                <div style={{
                  flex: 1, background: '#34D399', borderRadius: '3px 3px 0 0',
                  height: hRec, minHeight: hRec > 0 ? 2 : 0, opacity: 0.85,
                }} />
                <div style={{
                  flex: 1, background: '#F87171', borderRadius: '3px 3px 0 0',
                  height: hDesp, minHeight: hDesp > 0 ? 2 : 0, opacity: 0.85,
                }} />
                <div style={{
                  flex: 1, background: res >= 0 ? '#60A5FA' : '#FB923C',
                  borderRadius: '3px 3px 0 0',
                  height: Math.round((Math.abs(res) / maxVal) * 120),
                  minHeight: Math.abs(res) > 0 ? 2 : 0, opacity: 0.85,
                }} />
              </div>
              <span style={{ fontSize: 9, color: C.textMuted, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {fmtMes(m.mes)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export function DREPage() {
  const anoAtualVal = anoAtual()
  const [ano, setAno]       = useState(anoAtualVal)
  const [periodo, setPeriodo] = useState('anual')
  const [regime, setRegime]  = useState<'CAIXA' | 'COMPETENCIA'>('CAIXA')

  const { de, ate } = periodoParaDatas(ano, periodo)

  const { data, isLoading, error, refetch } = (trpc as any).fin.dre.get.useQuery(
    { de, ate, regime },
    { keepPreviousData: true },
  )

  const anos = Array.from({ length: 5 }, (_, i) => anoAtualVal - i)

  const periodos = [
    { value: 'anual', label: 'Ano completo' },
    { value: 'T1',    label: '1º Trimestre' },
    { value: 'T2',    label: '2º Trimestre' },
    { value: 'T3',    label: '3º Trimestre' },
    { value: 'T4',    label: '4º Trimestre' },
    // Acesso direto pela chave (não Object.values/entries): chaves com zero à
    // esquerda ('01'..'09') não são "índice de array" para o JS, mas '10'..'12'
    // são — o motor reordena essas 3 para o início da enumeração, embaralhando
    // o rótulo com o mês errado (Jan/26 exibia dados de Abril). Achado em
    // 2026-08-01 ao investigar "relatório mês a mês não faz sentido".
    ...Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, '0')
      return { value: mm, label: MESES_LABEL[mm] }
    }),
  ]

  const receitas   = data?.receitas   ?? { total: 0, contas: [] }
  const despesas   = data?.despesas   ?? { total: 0, contas: [] }
  const financeiro = data?.financeiro ?? { total: 0, contas: [] }
  const resultado  = data?.resultado  ?? 0
  const margem     = data?.margem     ?? 0
  const evolucao   = data?.evolucao   ?? []

  const isLucro = resultado >= 0

  return (
    <PageWrapper
      title="DRE"
      subtitle="Demonstrativo de Resultado do Exercício"
      actions={
        <Btn size="sm" variant="ghost" onClick={() => refetch()}>↺ Atualizar</Btn>
      }
    >
      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20,
        background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
        padding: '14px 16px', alignItems: 'flex-end',
      }}>
        {/* Ano */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Ano</div>
          <select
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
            style={{
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.text, fontSize: 13, padding: '7px 10px', cursor: 'pointer',
            }}
          >
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Período */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Período</div>
          <select
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            style={{
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.text, fontSize: 13, padding: '7px 10px', cursor: 'pointer', minWidth: 140,
            }}
          >
            {periodos.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        {/* Regime */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Regime</div>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            {(['CAIXA', 'COMPETENCIA'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRegime(r)}
                style={{
                  padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: 'none', outline: 'none',
                  background: regime === r ? '#34D399' : C.bg,
                  color: regime === r ? '#022C22' : C.textMuted,
                  transition: 'all 0.15s',
                }}
              >
                {r === 'CAIXA' ? 'Caixa' : 'Competência'}
              </button>
            ))}
          </div>
        </div>

        {/* Info período */}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: C.textMuted, alignSelf: 'center' }}>
          {de} → {ate}
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spinner /></div>
      ) : error ? (
        <Alert type="error">Erro ao carregar DRE: {(error as any)?.message}</Alert>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <KpiCard
              label="Receita Total"
              value={fmtBRLFull(receitas.total)}
              color="#34D399"
              icon="↑"
            />
            <KpiCard
              label="Despesa Total"
              value={fmtBRLFull(despesas.total)}
              color="#F87171"
              icon="↓"
            />
            <KpiCard
              label={isLucro ? 'Lucro Líquido' : 'Prejuízo'}
              value={fmtBRLFull(Math.abs(resultado))}
              color={isLucro ? '#60A5FA' : '#FB923C'}
              icon={isLucro ? '◈' : '⚠'}
            />
            <KpiCard
              label="Margem"
              value={`${margem.toFixed(1)}%`}
              color={margem >= 0 ? '#A78BFA' : '#FB923C'}
              icon="%"
            />
          </div>

          {/* ── Gráfico de evolução ───────────────────────────────────────── */}
          {evolucao.length > 1 && <GraficoEvolucao evolucao={evolucao} />}

          {/* ── Seções do DRE ─────────────────────────────────────────────── */}
          <SecaoDRE
            titulo="Receitas Operacionais"
            cor="#34D399"
            icone="+"
            contas={receitas.contas}
            total={receitas.total}
            totalReceitas={receitas.total}
          />

          <SecaoDRE
            titulo="Despesas Operacionais"
            cor="#F87171"
            icone="−"
            contas={despesas.contas}
            total={despesas.total}
            totalReceitas={receitas.total}
          />

          {financeiro.contas.length > 0 && (
            <SecaoDRE
              titulo="Resultado Financeiro"
              cor="#60A5FA"
              icone="±"
              contas={financeiro.contas}
              total={financeiro.total}
              totalReceitas={receitas.total}
            />
          )}

          {/* ── Resultado final ───────────────────────────────────────────── */}
          <div style={{
            borderRadius: 12, border: `2px solid ${isLucro ? '#34D399' : '#FB923C'}`,
            background: isLucro ? '#34D39912' : '#FB923C12',
            padding: '18px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                Resultado do Período
              </div>
              <div style={{ fontSize: 11, color: C.textMuted }}>
                Receitas {fmtBRLFull(receitas.total)} − Despesas {fmtBRLFull(despesas.total)}
                {financeiro.total !== 0 && ` ${financeiro.total >= 0 ? '+' : '−'} Financeiro ${fmtBRLFull(Math.abs(financeiro.total))}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: isLucro ? '#34D399' : '#FB923C' }}>
                {!isLucro && '−'}{fmtBRLFull(Math.abs(resultado))}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                Margem: <strong style={{ color: isLucro ? '#34D399' : '#FB923C' }}>{margem.toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          {/* ── Nota sobre regime ─────────────────────────────────────────── */}
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 8,
            background: C.card, border: `1px solid ${C.border}`,
            fontSize: 11, color: C.textMuted, lineHeight: 1.6,
          }}>
            <strong style={{ color: C.text }}>Regime {regime === 'CAIXA' ? 'de Caixa' : 'de Competência'}:</strong>{' '}
            {regime === 'CAIXA'
              ? 'Considera apenas parcelas efetivamente pagas no período (data de pagamento).'
              : 'Considera parcelas com vencimento no período, independente de terem sido pagas.'}
            {' '}Somente lançamentos com Plano de Contas definido aparecem neste relatório.
          </div>
        </>
      )}
    </PageWrapper>
  )
}
