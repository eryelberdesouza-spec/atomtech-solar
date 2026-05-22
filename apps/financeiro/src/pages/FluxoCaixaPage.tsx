// ═══════════════════════════════════════════════════════════════════
// Fluxo de Caixa — projeção de entradas, saídas e saldo acumulado
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import { trpc } from '../lib/trpc'
import {
  PageWrapper, C, KpiCard, Input, Spinner, Alert, Btn,
} from '../components/ui'
import { fmtBRLFull } from '../lib/masks'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const hoje = () => new Date().toISOString().slice(0, 10)

function addDays(date: string, n: number) {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function fmtDataBr(s: string) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function fmtDiaSemana(s: string) {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return dias[new Date(s + 'T12:00:00').getDay()]
}

// ─── BADGE DE STATUS ─────────────────────────────────────────────────────────

function SaldoBadge({ valor }: { valor: number }) {
  const positivo = valor >= 0
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 700,
      background: positivo ? '#064E3B' : '#7C2D12',
      color: positivo ? '#34D399' : '#F97316',
    }}>
      {positivo ? '▲' : '▼'} {fmtBRLFull(Math.abs(valor))}
    </span>
  )
}

// ─── LINHA DA TABELA ─────────────────────────────────────────────────────────

function LinhaFluxo({
  data, entradas, saidas, saldoDia, saldoAcumulado, itens, isHoje, isVencida,
}: {
  data:           string
  entradas:       number
  saidas:         number
  saldoDia:       number
  saldoAcumulado: number
  itens:          any[]
  isHoje:         boolean
  isVencida:      boolean
}) {
  const [aberto, setAberto] = useState(false)
  const positivo = saldoAcumulado >= 0

  return (
    <>
      <tr
        onClick={() => itens.length > 0 && setAberto(!aberto)}
        style={{
          cursor: itens.length > 0 ? 'pointer' : 'default',
          background: isVencida
            ? '#7C2D1210'
            : isHoje
              ? C.emerald + '0A'
              : 'transparent',
          borderBottom: '1px solid ' + C.border + '60',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => {
          if (!isVencida && !isHoje)
            (e.currentTarget as HTMLTableRowElement).style.background = C.bgHover
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLTableRowElement).style.background =
            isVencida ? '#7C2D1210' : isHoje ? C.emerald + '0A' : 'transparent'
        }}
      >
        {/* Data */}
        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isVencida && <span style={{ fontSize: 9, color: '#F97316', fontWeight: 800 }}>VENCIDO</span>}
            {isHoje && <span style={{ fontSize: 9, background: C.emerald, color: '#022C22', fontWeight: 800, padding: '1px 5px', borderRadius: 4 }}>HOJE</span>}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: isVencida ? '#F97316' : C.text }}>
                {fmtDataBr(data)}
              </div>
              <div style={{ fontSize: 10, color: C.textDim }}>{fmtDiaSemana(data)}</div>
            </div>
          </div>
        </td>

        {/* Entradas */}
        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
          {entradas > 0
            ? <span style={{ color: C.credit, fontWeight: 700, fontSize: 13 }}>+ {fmtBRLFull(entradas)}</span>
            : <span style={{ color: C.textDim }}>—</span>}
        </td>

        {/* Saídas */}
        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
          {saidas > 0
            ? <span style={{ color: C.debit, fontWeight: 700, fontSize: 13 }}>- {fmtBRLFull(saidas)}</span>
            : <span style={{ color: C.textDim }}>—</span>}
        </td>

        {/* Saldo do dia */}
        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
          <SaldoBadge valor={saldoDia} />
        </td>

        {/* Saldo acumulado */}
        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
          <span style={{
            fontWeight: 800, fontSize: 13,
            color: positivo ? C.credit : C.debit,
          }}>
            {fmtBRLFull(saldoAcumulado)}
          </span>
        </td>

        {/* Expandir */}
        <td style={{ padding: '10px 12px', textAlign: 'center', width: 32 }}>
          {itens.length > 0 && (
            <span style={{ color: C.textDim, fontSize: 10 }}>{aberto ? '▲' : '▼'}</span>
          )}
        </td>
      </tr>

      {/* Detalhe dos lançamentos do dia */}
      {aberto && itens.map((it, i) => (
        <tr key={i} style={{ background: C.bgMid, borderBottom: '1px solid ' + C.border + '30' }}>
          <td style={{ padding: '6px 16px 6px 36px' }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>
              {it.tipo === 'RECEBER' ? '📥' : '📤'} {it.descricao}
              {it.pessoaNome && <span style={{ color: C.textDim }}> · {it.pessoaNome}</span>}
            </span>
          </td>
          <td style={{ padding: '6px 16px', textAlign: 'right' }}>
            {it.tipo === 'RECEBER' && (
              <span style={{ color: C.credit, fontSize: 11, fontWeight: 600 }}>+ {fmtBRLFull(it.valor)}</span>
            )}
          </td>
          <td style={{ padding: '6px 16px', textAlign: 'right' }}>
            {it.tipo === 'PAGAR' && (
              <span style={{ color: C.debit, fontSize: 11, fontWeight: 600 }}>- {fmtBRLFull(it.valor)}</span>
            )}
          </td>
          <td colSpan={3} />
        </tr>
      ))}
    </>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export function FluxoCaixaPage() {
  const [dataIni, setDataIni] = useState(hoje())
  const [dataFim, setDataFim] = useState(addDays(hoje(), 90))
  const [periodo, setPeriodo] = useState<'30' | '60' | '90' | 'custom'>('90')

  function aplicarPeriodo(dias: '30' | '60' | '90') {
    setPeriodo(dias)
    setDataIni(hoje())
    setDataFim(addDays(hoje(), parseInt(dias)))
  }

  const { data, isLoading, error } = (trpc as any).fin.fluxoCaixa.projecao.useQuery(
    { dataIni, dataFim },
    { staleTime: 0 }
  )

  // Monta a projeção dia a dia
  const projecao = useMemo(() => {
    if (!data) return []

    const { parcelas, parcelasVencidas, saldoAtual } = data
    const hj = hoje()

    // Agrupa vencidas em um único bloco "Em Atraso"
    const totalVencidaEntradas = parcelasVencidas
      .filter((p: any) => p.tipo === 'RECEBER')
      .reduce((s: number, p: any) => s + p.valor, 0)
    const totalVencidaSaidas = parcelasVencidas
      .filter((p: any) => p.tipo === 'PAGAR')
      .reduce((s: number, p: any) => s + p.valor, 0)

    // Agrupa parcelas por data
    const porData = new Map<string, { entradas: number; saidas: number; itens: any[] }>()

    // Adiciona datas vazias para cada dia do período
    let cursor = dataIni
    while (cursor <= dataFim) {
      porData.set(cursor, { entradas: 0, saidas: 0, itens: [] })
      cursor = addDays(cursor, 1)
    }

    for (const p of parcelas) {
      const d = porData.get(p.vencimento)
      if (!d) continue
      if (p.tipo === 'RECEBER') {
        d.entradas += p.valor
      } else {
        d.saidas += p.valor
      }
      d.itens.push(p)
    }

    // Remove dias sem movimento (para não mostrar 90 linhas vazias)
    const diasComMovimento = new Set(parcelas.map((p: any) => p.vencimento))

    let saldo = saldoAtual

    // Linhas com movimento
    const linhas: any[] = []

    // Bloco "Em Atraso" se houver vencidas
    if (parcelasVencidas.length > 0) {
      linhas.push({
        data:           'atraso',
        entradas:       totalVencidaEntradas,
        saidas:         totalVencidaSaidas,
        saldoDia:       totalVencidaEntradas - totalVencidaSaidas,
        saldoAcumulado: saldo,
        itens:          parcelasVencidas,
        isHoje:         false,
        isVencida:      true,
      })
    }

    for (const [data, d] of porData) {
      if (!diasComMovimento.has(data)) continue
      const saldoDia = d.entradas - d.saidas
      saldo += saldoDia
      linhas.push({
        data,
        entradas:       d.entradas,
        saidas:         d.saidas,
        saldoDia,
        saldoAcumulado: saldo,
        itens:          d.itens,
        isHoje:         data === hj,
        isVencida:      false,
      })
    }

    return linhas
  }, [data, dataIni, dataFim])

  // KPIs do período
  const kpis = useMemo(() => {
    if (!data) return { entradas: 0, saidas: 0, resultado: 0 }
    const entradas = data.parcelas
      .filter((p: any) => p.tipo === 'RECEBER')
      .reduce((s: number, p: any) => s + p.valor, 0)
    const saidas = data.parcelas
      .filter((p: any) => p.tipo === 'PAGAR')
      .reduce((s: number, p: any) => s + p.valor, 0)
    return { entradas, saidas, resultado: entradas - saidas }
  }, [data])

  const saldoFinal = data
    ? data.saldoAtual + kpis.resultado
    : 0

  return (
    <PageWrapper>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Fluxo de Caixa</h2>
        <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>
          Projeção de entradas, saídas e saldo acumulado por período
        </p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="Saldo Atual"
          value={fmtBRLFull(data?.saldoAtual ?? 0)}
          sub="em caixa agora"
          icon="🏦"
          color={data?.saldoAtual >= 0 ? C.credit : C.debit}
        />
        <KpiCard
          label="Entradas Previstas"
          value={fmtBRLFull(kpis.entradas)}
          sub="no período"
          icon="📥"
          color={C.credit}
        />
        <KpiCard
          label="Saídas Previstas"
          value={fmtBRLFull(kpis.saidas)}
          sub="no período"
          icon="📤"
          color={C.debit}
        />
        <KpiCard
          label="Saldo Projetado"
          value={fmtBRLFull(saldoFinal)}
          sub="ao final do período"
          icon={saldoFinal >= 0 ? '📈' : '📉'}
          color={saldoFinal >= 0 ? C.emerald : C.danger}
        />
      </div>

      {/* ── Filtros ─────────────────────────────────────────────── */}
      <div style={{
        background: C.bgCard, borderRadius: 12, border: '1px solid ' + C.border,
        padding: '16px 20px', marginBottom: 20,
        display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
      }}>
        {/* Botões rápidos */}
        <div>
          <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.06em' }}>
            Período rápido
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['30', '60', '90'] as const).map(d => (
              <Btn
                key={d}
                size="sm"
                variant={periodo === d ? 'primary' : 'ghost'}
                onClick={() => aplicarPeriodo(d)}
              >
                {d} dias
              </Btn>
            ))}
          </div>
        </div>

        <div style={{ width: 1, height: 36, background: C.border, alignSelf: 'center' }} />

        {/* Período customizado */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ width: 150 }}>
            <Input
              label="De"
              type="date"
              value={dataIni}
              onChange={e => { setDataIni(e.target.value); setPeriodo('custom') }}
            />
          </div>
          <div style={{ width: 150 }}>
            <Input
              label="Até"
              type="date"
              value={dataFim}
              onChange={e => { setDataFim(e.target.value); setPeriodo('custom') }}
            />
          </div>
        </div>

        {data && (
          <div style={{ marginLeft: 'auto', color: C.textMuted, fontSize: 12, alignSelf: 'flex-end', paddingBottom: 4 }}>
            {projecao.filter(l => !l.isVencida).length} dia(s) com movimento
            {data.parcelasVencidas.length > 0 && (
              <span style={{ color: '#F97316', marginLeft: 8 }}>
                · ⚠ {data.parcelasVencidas.length} parcela(s) em atraso
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Tabela ──────────────────────────────────────────────── */}
      <div style={{ background: C.bgCard, borderRadius: 12, border: '1px solid ' + C.border, overflow: 'hidden' }}>

        {/* Saldo atual (linha de referência) */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px',
          background: C.bgMid,
          borderBottom: '2px solid ' + C.border,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Saldo de Abertura
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: (data?.saldoAtual ?? 0) >= 0 ? C.credit : C.debit }}>
            {fmtBRLFull(data?.saldoAtual ?? 0)}
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner size={28} />
          </div>
        ) : error ? (
          <div style={{ padding: 24 }}>
            <Alert type="danger">Erro ao carregar fluxo de caixa.</Alert>
          </div>
        ) : projecao.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <p style={{ color: C.textMuted, fontSize: 14 }}>Nenhum lançamento previsto para o período selecionado.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid ' + C.border }}>
                  {['Data', 'Entradas', 'Saídas', 'Resultado do Dia', 'Saldo Acumulado', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '10px 16px',
                      textAlign: i >= 1 && i <= 4 ? 'right' : 'left',
                      fontSize: 10, fontWeight: 700, color: C.textMuted,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      background: C.bgMid,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projecao.map((linha, i) => (
                  <LinhaFluxo key={linha.data + i} {...linha} />
                ))}
              </tbody>
              {/* Totalizador */}
              <tfoot>
                <tr style={{ borderTop: '2px solid ' + C.border, background: C.bgMid }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: C.text, fontSize: 12 }}>
                    TOTAL DO PERÍODO
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: C.credit }}>
                    + {fmtBRLFull(kpis.entradas)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: C.debit }}>
                    - {fmtBRLFull(kpis.saidas)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <SaldoBadge valor={kpis.resultado} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: saldoFinal >= 0 ? C.credit : C.debit }}>
                    {fmtBRLFull(saldoFinal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
