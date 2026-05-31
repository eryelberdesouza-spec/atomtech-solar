// ═══════════════════════════════════════════════════════════════════
// Relatórios Financeiros — Atom Financeiro
// Tabs: Lançamentos CP/CR | Aging | Extrato Bancário |
//       Centro de Custo | Por Pessoa | Inadimplência
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import { trpc } from '../lib/trpc'
import {
  PageWrapper, C, Btn, Spinner, Alert, Tabs, Table,
  Input, Select,
} from '../components/ui'
import { fmtBRLFull } from '../lib/masks'
import { fmtData } from '../lib/utils'
import {
  gerarRelatorioLancamentos,
  gerarRelatorioAging,
  gerarRelatorioExtrato,
  gerarRelatorioCentroCusto,
  gerarRelatorioPorPessoa,
  gerarRelatorioInadimplencia,
} from '../lib/gerarRelatorioPdf'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mesAtualIni = () => new Date().toISOString().slice(0, 7) + '-01'
const anoAtualIni = () => new Date().getFullYear() + '-01-01'
const hoje        = () => new Date().toISOString().slice(0, 10)

function KpiMini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '14px 18px', flex: 1,
    }}>
      <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color ?? C.text }}>{value}</div>
    </div>
  )
}

function FiltrosBar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
      padding: '16px 20px', background: C.bgCard,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {children}
    </div>
  )
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, [string, string]> = {
    ABERTA:    ['#1E3A5F', '#60A5FA'],
    VENCIDA:   ['#451A03', '#F97316'],
    PAGA:      ['#064E3B', '#34D399'],
    CANCELADA: ['#1F2937', '#9CA3AF'],
  }
  const [bg, color] = map[s] ?? ['#1F2937', '#9CA3AF']
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: bg, color, textTransform: 'uppercase' }}>{s}</span>
  )
}

// ─── Tab Lançamentos (CP / CR) ────────────────────────────────────────────────

function TabLancamentos({ tipo }: { tipo: 'PAGAR' | 'RECEBER' }) {
  const [dataIni, setDataIni] = useState(mesAtualIni())
  const [dataFim, setDataFim] = useState(hoje())
  const [status,  setStatus]  = useState('')
  const [busca,   setBusca]   = useState('')

  const { data: rows = [], isLoading } = (trpc as any).fin.titulo.list.useQuery({
    tipo, dataIni: dataIni || undefined, dataFim: dataFim || undefined,
    status: status || undefined,
  }, { staleTime: 0 })

  const { data: empresa } = (trpc as any).fin.empresa.minha.useQuery()

  const filtrados = useMemo(() => {
    if (!busca.trim()) return rows
    const b = busca.toLowerCase()
    return rows.filter((r: any) =>
      r.descricao?.toLowerCase().includes(b) ||
      r.pessoaNome?.toLowerCase().includes(b) ||
      r.documento?.toLowerCase().includes(b)
    )
  }, [rows, busca])

  const totalV = filtrados.reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0)
  const pago   = filtrados.filter((r: any) => r.status === 'PAGA').reduce((s: number, r: any) => s + Number(r.valorPago ?? r.valor ?? 0), 0)
  const aberto = filtrados.filter((r: any) => r.status !== 'PAGA').reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0)

  const labelP = tipo === 'PAGAR' ? 'Fornecedor / Prestador' : 'Cliente'

  return (
    <>
      <FiltrosBar>
        <div style={{ flex: '0 0 150px' }}><Input label="De" type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} /></div>
        <div style={{ flex: '0 0 150px' }}><Input label="Até" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
        <div style={{ flex: '0 0 140px' }}>
          <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}
            options={[{value:'',label:'Todos'},{value:'ABERTA',label:'Em Aberto'},{value:'VENCIDA',label:'Vencidas'},{value:'PAGA',label:'Pagas'}]} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <Input label="Buscar" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Descrição, pessoa, documento..." />
        </div>
        <Btn onClick={() => gerarRelatorioLancamentos({ rows: filtrados, tipo, filtros: `${fmtData(dataIni)} a ${fmtData(dataFim)} · Status: ${status || 'Todos'} · ${filtrados.length} parcelas`, empresa })} disabled={filtrados.length === 0}>
          🖨 Gerar PDF
        </Btn>
      </FiltrosBar>

      <div style={{ display: 'flex', gap: 12, padding: '16px 20px', background: C.bg }}>
        <KpiMini label="Parcelas" value={String(filtrados.length)} />
        <KpiMini label="Valor Total" value={fmtBRLFull(totalV)} color={tipo === 'PAGAR' ? C.debit : C.credit} />
        <KpiMini label={tipo === 'PAGAR' ? 'Já Pago' : 'Já Recebido'} value={fmtBRLFull(pago)} color={C.success} />
        <KpiMini label="Em Aberto" value={fmtBRLFull(aberto)} color={C.info} />
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {isLoading ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} /></div> : (
          <Table
            columns={[
              { key: 'vencimento', label: 'Vencimento', width: '105px' },
              { key: 'pessoa',     label: labelP },
              { key: 'descricao',  label: 'Descrição' },
              { key: 'documento',  label: 'Documento', width: '110px' },
              { key: 'plano',      label: 'Plano de Contas', width: '160px' },
              { key: 'valor',      label: 'Valor', align: 'right', width: '110px' },
              { key: 'status',     label: 'Status', align: 'center', width: '100px' },
            ]}
            rows={filtrados.map((r: any) => ({
              vencimento: <span style={{ color: r.statusDisplay === 'VENCIDA' ? C.warning : C.textMuted, fontSize: 12 }}>{fmtData(r.vencimento)}</span>,
              pessoa:     <span style={{ color: C.text }}>{r.pessoaNome ?? <span style={{ color: C.textDim }}>—</span>}</span>,
              descricao:  <span style={{ color: C.text, fontSize: 13 }}>{r.descricao}</span>,
              documento:  <span style={{ color: C.textMuted, fontSize: 12 }}>{r.documento ?? '—'}</span>,
              plano:      <span style={{ color: C.textDim, fontSize: 11 }}>{r.planoNome ?? '—'}</span>,
              valor:      <span style={{ fontWeight: 700, color: tipo === 'PAGAR' ? C.debit : C.credit }}>{fmtBRLFull(Number(r.valor))}</span>,
              status:     <StatusBadge s={r.statusDisplay ?? r.status} />,
            }))}
            emptyMessage={`Nenhuma conta a ${tipo === 'PAGAR' ? 'pagar' : 'receber'} no período`}
          />
        )}
      </div>
    </>
  )
}

// ─── Tab Aging ────────────────────────────────────────────────────────────────

function TabAging() {
  const [tipo,  setTipo]  = useState('AMBOS')
  const [busca, setBusca] = useState('')

  const { data, isLoading } = (trpc as any).fin.relatorios.aging.useQuery({ tipo, dataBase: hoje() }, { staleTime: 0 })
  const { data: empresa }   = (trpc as any).fin.empresa.minha.useQuery()

  const detalhes = useMemo(() => {
    const d = data?.detalhes ?? []
    if (!busca.trim()) return d
    const b = busca.toLowerCase()
    return d.filter((r: any) => r.pessoaNome?.toLowerCase().includes(b) || r.descricao?.toLowerCase().includes(b))
  }, [data, busca])

  const f = data?.faixas ?? { aVencer: 0, a30: 0, a60: 0, a90: 0, acima90: 0 }
  const totalVencido = f.a30 + f.a60 + f.a90 + f.acima90

  return (
    <>
      <FiltrosBar>
        <div style={{ flex: '0 0 160px' }}>
          <Select label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)}
            options={[{value:'AMBOS',label:'Ambos'},{value:'PAGAR',label:'A Pagar'},{value:'RECEBER',label:'A Receber'}]} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <Input label="Buscar" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pessoa ou descrição..." />
        </div>
        <Btn onClick={() => gerarRelatorioAging({ data: { ...data, detalhes }, tipo, empresa })} disabled={!data || detalhes.length === 0}>
          🖨 Gerar PDF
        </Btn>
      </FiltrosBar>

      {/* Faixas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, padding: '16px 20px', background: C.bg }}>
        {[
          { label: 'A Vencer',   value: f.aVencer, color: C.info   },
          { label: '0–30 dias',  value: f.a30,     color: C.warning },
          { label: '31–60 dias', value: f.a60,     color: '#F97316' },
          { label: '61–90 dias', value: f.a90,     color: C.danger  },
          { label: '+90 dias',   value: f.acima90, color: C.danger  },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color }}>{fmtBRLFull(value)}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 20px 4px', color: C.textMuted, fontSize: 11 }}>
        Total vencido: <strong style={{ color: C.danger }}>{fmtBRLFull(totalVencido)}</strong> · {detalhes.length} parcela(s)
      </div>

      <div style={{ padding: '12px 20px 20px' }}>
        {isLoading ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} /></div> : (
          <Table
            columns={[
              { key: 'tipo',       label: 'Tipo',        width: '90px'  },
              { key: 'vencimento', label: 'Vencimento',  width: '105px' },
              { key: 'dias',       label: 'Atraso',      width: '90px', align: 'center' },
              { key: 'faixa',      label: 'Faixa',       width: '100px' },
              { key: 'pessoa',     label: 'Pessoa' },
              { key: 'descricao',  label: 'Descrição' },
              { key: 'valor',      label: 'Valor', align: 'right', width: '110px' },
            ]}
            rows={detalhes.map((r: any) => ({
              tipo:       <span style={{ fontSize: 11, fontWeight: 700, color: r.tipo === 'RECEBER' ? C.credit : C.debit }}>{r.tipo}</span>,
              vencimento: <span style={{ color: C.warning, fontSize: 12 }}>{fmtData(r.vencimento)}</span>,
              dias:       <span style={{ fontSize: 11, fontWeight: 700, color: r.diasAtraso > 0 ? C.danger : C.info }}>
                            {r.diasAtraso > 0 ? `${r.diasAtraso}d` : 'A vencer'}
                          </span>,
              faixa:      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: C.danger + '22', color: C.danger, fontWeight: 600 }}>{r.faixa}</span>,
              pessoa:     <span style={{ color: C.text }}>{r.pessoaNome ?? '—'}</span>,
              descricao:  <span style={{ color: C.text, fontSize: 12 }}>{r.descricao}</span>,
              valor:      <span style={{ fontWeight: 700, color: C.debit }}>{fmtBRLFull(r.valor)}</span>,
            }))}
            emptyMessage="Nenhuma parcela vencida em aberto"
          />
        )}
      </div>
    </>
  )
}

// ─── Tab Extrato Bancário ─────────────────────────────────────────────────────

function TabExtratoBancario() {
  const [dataIni, setDataIni] = useState(mesAtualIni())
  const [dataFim, setDataFim] = useState(hoje())
  const [contaId, setContaId] = useState<number | undefined>()

  const { data, isLoading } = (trpc as any).fin.relatorios.extratoBancario.useQuery(
    { dataIni, dataFim, contaId },
    { staleTime: 0, enabled: !!(dataIni && dataFim) }
  )
  const { data: empresa } = (trpc as any).fin.empresa.minha.useQuery()

  const contas = data?.contas ?? []

  let saldoCorrido = data?.saldoInicial ?? 0

  return (
    <>
      <FiltrosBar>
        <div style={{ flex: '0 0 180px' }}>
          <Select label="Conta" value={contaId ? String(contaId) : ''}
            onChange={e => setContaId(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="— Todas —"
            options={contas.map((c: any) => ({ value: String(c.id), label: c.nome }))} />
        </div>
        <div style={{ flex: '0 0 150px' }}><Input label="De"   type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} /></div>
        <div style={{ flex: '0 0 150px' }}><Input label="Até"  type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
        <Btn onClick={() => gerarRelatorioExtrato({ data, dataIni, dataFim, empresa })} disabled={!data || data.movimentos?.length === 0}>
          🖨 Gerar PDF
        </Btn>
      </FiltrosBar>

      {data && (
        <div style={{ display: 'flex', gap: 12, padding: '16px 20px' }}>
          <KpiMini label="Saldo Inicial"  value={fmtBRLFull(data.saldoInicial)} />
          <KpiMini label="Total Entradas" value={fmtBRLFull(data.totalEntradas)} color={C.credit} />
          <KpiMini label="Total Saídas"   value={fmtBRLFull(data.totalSaidas)} color={C.debit} />
          <KpiMini label="Saldo Final"    value={fmtBRLFull(data.saldoFinal)} color={data.saldoFinal >= 0 ? C.credit : C.danger} />
        </div>
      )}

      <div style={{ padding: '0 20px 20px' }}>
        {isLoading ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} /></div> : (
          <Table
            columns={[
              { key: 'data',       label: 'Data',        width: '105px' },
              { key: 'descricao',  label: 'Descrição' },
              { key: 'pessoa',     label: 'Pessoa',      width: '160px' },
              { key: 'forma',      label: 'Forma',       width: '100px' },
              { key: 'entrada',    label: 'Entrada',  align: 'right', width: '110px' },
              { key: 'saida',      label: 'Saída',    align: 'right', width: '110px' },
              { key: 'saldo',      label: 'Saldo',    align: 'right', width: '110px' },
            ]}
            rows={(data?.movimentos ?? []).map((m: any) => {
              saldoCorrido += m.entrada - m.saida
              const s = saldoCorrido
              return {
                data:      <span style={{ color: C.textMuted, fontSize: 12 }}>{fmtData(m.data)}</span>,
                descricao: <span style={{ color: C.text, fontSize: 12 }}>{m.descricao}</span>,
                pessoa:    <span style={{ color: C.textMuted, fontSize: 12 }}>{m.pessoaNome ?? '—'}</span>,
                forma:     <span style={{ color: C.textDim, fontSize: 11 }}>{m.forma ?? '—'}</span>,
                entrada:   m.entrada > 0 ? <span style={{ fontWeight: 700, color: C.credit }}>{fmtBRLFull(m.entrada)}</span> : <span style={{ color: C.textDim }}>—</span>,
                saida:     m.saida   > 0 ? <span style={{ fontWeight: 700, color: C.debit  }}>{fmtBRLFull(m.saida)}</span>   : <span style={{ color: C.textDim }}>—</span>,
                saldo:     <span style={{ fontWeight: 800, color: s >= 0 ? C.credit : C.danger }}>{fmtBRLFull(s)}</span>,
              }
            })}
            emptyMessage="Nenhuma movimentação no período"
          />
        )}
      </div>
    </>
  )
}

// ─── Tab Centro de Custo ──────────────────────────────────────────────────────

function TabCentroCusto() {
  const [dataIni, setDataIni] = useState(anoAtualIni())
  const [dataFim, setDataFim] = useState(hoje())

  const { data: rows = [], isLoading } = (trpc as any).fin.relatorios.porCentroCusto.useQuery(
    { dataIni, dataFim }, { staleTime: 0 }
  )
  const { data: empresa } = (trpc as any).fin.empresa.minha.useQuery()

  const totalRec  = rows.reduce((s: number, r: any) => s + r.receitas, 0)
  const totalDesp = rows.reduce((s: number, r: any) => s + r.despesas, 0)

  return (
    <>
      <FiltrosBar>
        <div style={{ flex: '0 0 150px' }}><Input label="De"  type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} /></div>
        <div style={{ flex: '0 0 150px' }}><Input label="Até" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
        <Btn onClick={() => gerarRelatorioCentroCusto({ rows, filtros: `${fmtData(dataIni)} a ${fmtData(dataFim)}`, empresa })} disabled={rows.length === 0}>
          🖨 Gerar PDF
        </Btn>
      </FiltrosBar>

      <div style={{ display: 'flex', gap: 12, padding: '16px 20px' }}>
        <KpiMini label="Centros de Custo" value={String(rows.length)} />
        <KpiMini label="Total Receitas"   value={fmtBRLFull(totalRec)}           color={C.credit} />
        <KpiMini label="Total Despesas"   value={fmtBRLFull(totalDesp)}          color={C.debit}  />
        <KpiMini label="Resultado"        value={fmtBRLFull(totalRec - totalDesp)} color={totalRec - totalDesp >= 0 ? C.credit : C.danger} />
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {isLoading ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} /></div> : (
          <Table
            columns={[
              { key: 'codigo',   label: 'Código',    width: '90px' },
              { key: 'nome',     label: 'Centro de Custo' },
              { key: 'receitas', label: 'Receitas',  align: 'right', width: '130px' },
              { key: 'despesas', label: 'Despesas',  align: 'right', width: '130px' },
              { key: 'resultado',label: 'Resultado', align: 'right', width: '130px' },
            ]}
            rows={rows.map((r: any) => ({
              codigo:    <span style={{ color: C.textMuted, fontSize: 11, fontFamily: 'monospace' }}>{r.codigo}</span>,
              nome:      <span style={{ color: C.text }}>{r.nome}</span>,
              receitas:  <span style={{ fontWeight: 700, color: C.credit }}>{fmtBRLFull(r.receitas)}</span>,
              despesas:  <span style={{ fontWeight: 700, color: C.debit  }}>{fmtBRLFull(r.despesas)}</span>,
              resultado: <span style={{ fontWeight: 800, color: r.resultado >= 0 ? C.credit : C.danger }}>{fmtBRLFull(r.resultado)}</span>,
            }))}
            emptyMessage="Nenhum dado no período"
          />
        )}
      </div>
    </>
  )
}

// ─── Tab Por Pessoa ───────────────────────────────────────────────────────────

function TabPorPessoa() {
  const [tipo,    setTipo]    = useState('AMBOS')
  const [dataIni, setDataIni] = useState(anoAtualIni())
  const [dataFim, setDataFim] = useState(hoje())
  const [busca,   setBusca]   = useState('')

  const { data: rows = [], isLoading } = (trpc as any).fin.relatorios.porPessoa.useQuery(
    { tipo, dataIni, dataFim }, { staleTime: 0 }
  )
  const { data: empresa } = (trpc as any).fin.empresa.minha.useQuery()

  const filtrados = useMemo(() => {
    if (!busca.trim()) return rows
    return rows.filter((r: any) => r.nome?.toLowerCase().includes(busca.toLowerCase()))
  }, [rows, busca])

  return (
    <>
      <FiltrosBar>
        <div style={{ flex: '0 0 160px' }}>
          <Select label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)}
            options={[{value:'AMBOS',label:'Todos'},{value:'PAGAR',label:'Fornecedores'},{value:'RECEBER',label:'Clientes'}]} />
        </div>
        <div style={{ flex: '0 0 150px' }}><Input label="De"  type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} /></div>
        <div style={{ flex: '0 0 150px' }}><Input label="Até" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <Input label="Buscar pessoa" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome..." />
        </div>
        <Btn onClick={() => gerarRelatorioPorPessoa({ rows: filtrados, tipo, filtros: `${fmtData(dataIni)} a ${fmtData(dataFim)}`, empresa })} disabled={filtrados.length === 0}>
          🖨 Gerar PDF
        </Btn>
      </FiltrosBar>

      <div style={{ padding: '0 20px 20px', paddingTop: 20 }}>
        {isLoading ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} /></div> : (
          <Table
            columns={[
              { key: 'nome',      label: 'Pessoa' },
              { key: 'titulos',   label: 'Títulos', align: 'center', width: '80px' },
              { key: 'recebido',  label: 'Recebido', align: 'right', width: '130px' },
              { key: 'pago',      label: 'Pago',     align: 'right', width: '130px' },
              { key: 'saldo',     label: 'Saldo',    align: 'right', width: '130px' },
            ]}
            rows={filtrados.map((r: any) => ({
              nome:     <span style={{ color: C.text, fontWeight: 600 }}>{r.nome}</span>,
              titulos:  <span style={{ color: C.textMuted }}>{r.qtdTitulos}</span>,
              recebido: r.recebido > 0 ? <span style={{ fontWeight: 700, color: C.credit }}>{fmtBRLFull(r.recebido)}</span> : <span style={{ color: C.textDim }}>—</span>,
              pago:     r.pago     > 0 ? <span style={{ fontWeight: 700, color: C.debit  }}>{fmtBRLFull(r.pago)}</span>     : <span style={{ color: C.textDim }}>—</span>,
              saldo:    <span style={{ fontWeight: 800, color: r.recebido - r.pago >= 0 ? C.credit : C.danger }}>{fmtBRLFull(r.recebido - r.pago)}</span>,
            }))}
            emptyMessage="Nenhum dado no período"
          />
        )}
      </div>
    </>
  )
}

// ─── Tab Inadimplência ────────────────────────────────────────────────────────

function TabInadimplencia() {
  const [tipo,    setTipo]    = useState('RECEBER')
  const [diasMin, setDiasMin] = useState('1')
  const [busca,   setBusca]   = useState('')

  const { data, isLoading } = (trpc as any).fin.relatorios.inadimplencia.useQuery(
    { tipo, diasMin: parseInt(diasMin) || 1 }, { staleTime: 0 }
  )
  const { data: empresa } = (trpc as any).fin.empresa.minha.useQuery()

  const detalhes = useMemo(() => {
    const d = data?.detalhes ?? []
    if (!busca.trim()) return d
    return d.filter((r: any) => r.pessoaNome?.toLowerCase().includes(busca.toLowerCase()) || r.descricao?.toLowerCase().includes(busca.toLowerCase()))
  }, [data, busca])

  return (
    <>
      <FiltrosBar>
        <div style={{ flex: '0 0 160px' }}>
          <Select label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)}
            options={[{value:'RECEBER',label:'A Receber'},{value:'PAGAR',label:'A Pagar'},{value:'AMBOS',label:'Ambos'}]} />
        </div>
        <div style={{ flex: '0 0 150px' }}>
          <Select label="Vencimento mínimo" value={diasMin} onChange={e => setDiasMin(e.target.value)}
            options={[{value:'1',label:'1+ dia'},{value:'7',label:'7+ dias'},{value:'15',label:'15+ dias'},{value:'30',label:'30+ dias'},{value:'60',label:'60+ dias'}]} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <Input label="Buscar" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pessoa ou descrição..." />
        </div>
        <Btn onClick={() => gerarRelatorioInadimplencia({ data: { ...data, detalhes }, tipo, empresa })} disabled={!data || detalhes.length === 0}>
          🖨 Gerar PDF
        </Btn>
      </FiltrosBar>

      {data && (
        <div style={{ display: 'flex', gap: 12, padding: '16px 20px' }}>
          <KpiMini label="Total Vencido"      value={fmtBRLFull(data.totalVencido)}  color={C.danger} />
          <KpiMini label="Parcelas Vencidas"  value={String(data.qtdParcelas)}        color={C.danger} />
          <KpiMini label="Pessoas com Atraso" value={String(data.porPessoa?.length)}  color={C.warning} />
        </div>
      )}

      <div style={{ padding: '0 20px 20px' }}>
        {isLoading ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} /></div> : (
          <Table
            columns={[
              { key: 'pessoa',     label: 'Pessoa' },
              { key: 'descricao',  label: 'Descrição' },
              { key: 'vencimento', label: 'Vencimento', width: '105px' },
              { key: 'dias',       label: 'Dias Atraso', align: 'center', width: '100px' },
              { key: 'valor',      label: 'Valor', align: 'right', width: '110px' },
            ]}
            rows={detalhes.map((r: any) => ({
              pessoa:     <span style={{ color: C.text, fontWeight: 600 }}>{r.pessoaNome ?? '—'}</span>,
              descricao:  <span style={{ color: C.text, fontSize: 12 }}>{r.descricao}</span>,
              vencimento: <span style={{ color: C.danger, fontSize: 12 }}>{fmtData(r.vencimento)}</span>,
              dias:       <span style={{ fontWeight: 800, color: C.danger }}>{r.diasAtraso}d</span>,
              valor:      <span style={{ fontWeight: 700, color: C.danger }}>{fmtBRLFull(r.valor)}</span>,
            }))}
            emptyMessage="Nenhuma parcela vencida no critério selecionado"
          />
        )}
      </div>
    </>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────

type TabId = 'pagar' | 'receber' | 'aging' | 'extrato' | 'centrocusto' | 'porpessoa' | 'inadimplencia'

export function RelatoriosPage() {
  const [tab, setTab] = useState<TabId>('pagar')

  return (
    <PageWrapper>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Relatórios</h2>
        <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>
          Filtros inteligentes · Exportação em PDF
        </p>
      </div>

      <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <Tabs
          tabs={[
            { id: 'pagar',          label: '📤 Contas a Pagar'   },
            { id: 'receber',        label: '📥 Contas a Receber' },
            { id: 'aging',          label: '⏰ Aging'             },
            { id: 'extrato',        label: '🏦 Extrato Bancário'  },
            { id: 'centrocusto',    label: '🏷 Centro de Custo'   },
            { id: 'porpessoa',      label: '👥 Por Pessoa'        },
            { id: 'inadimplencia',  label: '🚨 Inadimplência'     },
          ]}
          active={tab}
          onChange={t => setTab(t as TabId)}
        />

        {tab === 'pagar'         && <TabLancamentos tipo="PAGAR"   />}
        {tab === 'receber'       && <TabLancamentos tipo="RECEBER" />}
        {tab === 'aging'         && <TabAging />}
        {tab === 'extrato'       && <TabExtratoBancario />}
        {tab === 'centrocusto'   && <TabCentroCusto />}
        {tab === 'porpessoa'     && <TabPorPessoa />}
        {tab === 'inadimplencia' && <TabInadimplencia />}
      </div>
    </PageWrapper>
  )
}
