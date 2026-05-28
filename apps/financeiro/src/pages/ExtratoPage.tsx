// ═══════════════════════════════════════════════════════════════════
// Página de Importação de Extrato Bancário
// Suporta: Banco Inter e Sicoob
// ═══════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react'
import { trpc } from '../lib/trpc'
import { PageWrapper, C, Btn, KpiCard, Modal, Spinner, Alert } from '../components/ui'
import { fmtBRLFull } from '../lib/masks'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ExtratoTransacao {
  data: string
  descricao: string
  valor: number
  tipo: 'C' | 'D'
  banco: 'INTER' | 'SICOOB'
}

interface ParseResult {
  transacoes: ExtratoTransacao[]
  total: number
  totalEntradas: number
  totalSaidas: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://atomtech-solar-production.up.railway.app'
    : 'http://localhost:3001'

function fmtDataBR(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function detectarFormaPag(desc: string): string {
  const d = desc.toLowerCase()
  if (d.includes('pix')) return 'pix'
  if (d.includes('compra') || d.includes('mastercard') || d.includes('débito') || d.includes('debito')) return 'debito'
  if (d.includes('ted') || d.includes('liquidação') || d.includes('liquidacao') || d.includes('cobrança') || d.includes('cobranca')) return 'ted_doc'
  return 'pix'
}

const FORMAS_PAG = [
  { value: 'pix',      label: '⚡ PIX'              },
  { value: 'ted_doc',  label: '🏦 TED / DOC'        },
  { value: 'debito',   label: '💳 Cartão de Débito' },
  { value: 'credito',  label: '💳 Cartão de Crédito'},
  { value: 'boleto',   label: '📋 Boleto'           },
  { value: 'dinheiro', label: '💵 Dinheiro'         },
]

// ─── Estilos reutilizáveis ───────────────────────────────────────────────────

const labelStyle = { fontSize: 11, color: C.textMuted, fontWeight: 700 as const, marginBottom: 5, display: 'block' as const }

const inputStyle = {
  width: '100%', boxSizing: 'border-box' as const,
  background: C.bgHover, border: `1px solid ${C.border}`,
  borderRadius: 8, padding: '8px 12px',
  color: C.text, fontSize: 13, outline: 'none',
  fontFamily: 'inherit',
}

const selectStyle = {
  ...inputStyle, cursor: 'pointer',
}

// ─── Modal de Importação de Transação ────────────────────────────────────────

interface ModalImportarProps {
  tx: ExtratoTransacao | null
  onClose: () => void
  onSuccess: () => void
  contas: any[]
  planos: any[]
  centros: any[]
}

function ModalImportar({ tx, onClose, onSuccess, contas, planos, centros }: ModalImportarProps) {
  const [contaId,     setContaId]     = useState('')
  const [planoId,     setPlanoId]     = useState('')
  const [centroId,    setCentroId]    = useState('')
  const [formaPag,    setFormaPag]    = useState(() => tx ? detectarFormaPag(tx.descricao) : 'pix')
  const [descricao,   setDescricao]   = useState(tx?.descricao ?? '')
  const [salvarComo,  setSalvarComo]  = useState<'ABERTA' | 'PAGA'>('ABERTA')
  const [loading,     setLoading]     = useState(false)
  const [erro,        setErro]        = useState('')

  const criarTitulo   = (trpc as any).fin.titulo.create.useMutation()
  const baixarParcela = (trpc as any).fin.parcela.baixar.useMutation()

  if (!tx) return null

  const tipo  = tx.tipo === 'C' ? 'RECEBER' : 'PAGAR'
  const label = tipo === 'RECEBER' ? 'Recebimento' : 'Pagamento'
  const cor   = tipo === 'RECEBER' ? C.credit : C.debit

  const handleConfirmar = async () => {
    if (salvarComo === 'PAGA' && !contaId) { setErro('Selecione a conta bancária para baixar o lançamento'); return }
    setLoading(true); setErro('')
    try {
      // 1. Cria título + 1 parcela ABERTA
      const res = await criarTitulo.mutateAsync({
        tipo,
        descricao: descricao || tx.descricao,
        pessoaId:      null,
        planoContasId: planoId  ? parseInt(planoId)  : null,
        centroCustoId: centroId ? parseInt(centroId) : null,
        valorOriginal: tx.valor,
        emissao: tx.data,
        parcelas: [{ numero: 1, valor: tx.valor, vencimento: tx.data }],
      })

      // 2. Se "Já liquidado", busca a parcela pelo tituloId e baixa
      if (salvarComo === 'PAGA' && res?.tituloId) {
        // A parcela criada tem o mesmo vencimento — usamos lista parcelas
        // Abordagem simples: criar como aberta e orientar o usuário a baixar na listagem
        // (o parcelaId não é retornado diretamente pelo create)
      }

      onSuccess()
    } catch (e: any) {
      setErro(e.message || 'Erro ao criar lançamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={!!tx} title={`Criar Lançamento — ${label}`} onClose={onClose} width={520}>
      {/* Resumo da transação */}
      <div style={{
        background: cor + '12', border: `1px solid ${cor}30`,
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>
            {tx.banco} · {fmtDataBR(tx.data)}
          </div>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 600, maxWidth: 340, lineHeight: 1.4 }}>
            {tx.descricao}
          </div>
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: cor, flexShrink: 0, marginLeft: 16 }}>
          {tipo === 'PAGAR' ? '- ' : '+ '}{fmtBRLFull(tx.valor)}
        </div>
      </div>

      {erro && (
        <Alert type="danger" style={{ marginBottom: 14 }}>
          {erro}
        </Alert>
      )}

      {/* Campos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div>
          <label style={labelStyle}>Descrição do lançamento</label>
          <input
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Descrição"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Conta bancária{salvarComo === 'PAGA' ? ' *' : ''}</label>
          <select value={contaId} onChange={e => setContaId(e.target.value)} style={selectStyle}>
            <option value="">— Selecione a conta —</option>
            {contas.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Plano de Contas</label>
            <select value={planoId} onChange={e => setPlanoId(e.target.value)} style={selectStyle}>
              <option value="">— Opcional —</option>
              {planos.map((p: any) => (
                <option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Centro de Custo</label>
            <select value={centroId} onChange={e => setCentroId(e.target.value)} style={selectStyle}>
              <option value="">— Opcional —</option>
              {centros.map((c: any) => (
                <option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Forma de pagamento</label>
          <select value={formaPag} onChange={e => setFormaPag(e.target.value)} style={selectStyle}>
            {FORMAS_PAG.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Salvar como</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['ABERTA', 'PAGA'] as const).map(op => (
              <button
                key={op}
                onClick={() => setSalvarComo(op)}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                  border: `1px solid ${salvarComo === op ? cor : C.border}`,
                  background: salvarComo === op ? cor + '18' : C.bgCard,
                  color: salvarComo === op ? cor : C.textMuted,
                  transition: 'all 0.15s',
                }}
              >
                {op === 'ABERTA' ? '○ Em Aberto' : '✓ Já Liquidado'}
              </button>
            ))}
          </div>
          {salvarComo === 'PAGA' && (
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 5 }}>
              * Será criado como Em Aberto. Baixe manualmente na tela de Lançamentos para registrar o pagamento com conta e data exata.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={handleConfirmar} disabled={loading}>
          {loading ? <Spinner size={14} /> : 'Criar Lançamento'}
        </Btn>
      </div>
    </Modal>
  )
}

// ─── Componente Principal ────────────────────────────────────────────────────

export function ExtratoPage() {
  const [banco, setBanco]         = useState<'INTER' | 'SICOOB'>('INTER')
  const [file, setFile]           = useState<File | null>(null)
  const [resultado, setResultado] = useState<ParseResult | null>(null)
  const [loading, setLoading]     = useState(false)
  const [erro, setErro]           = useState('')
  const [filtro, setFiltro]       = useState<'TODOS' | 'C' | 'D'>('TODOS')
  const [busca, setBusca]         = useState('')
  const [txModal, setTxModal]     = useState<ExtratoTransacao | null>(null)
  const [importados, setImportados] = useState<Set<number>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const contasQ = (trpc as any).fin.conta.list.useQuery()
  const planoQ  = (trpc as any).fin.planoContas.list.useQuery()
  const centroQ = (trpc as any).fin.centroCusto.list.useQuery()

  const contas  = contasQ.data ?? []
  const planos  = planoQ.data  ?? []
  const centros = centroQ.data ?? []

  const processarPDF = async () => {
    if (!file) { setErro('Selecione um arquivo PDF'); return }
    setLoading(true); setErro(''); setResultado(null); setImportados(new Set())
    try {
      const token = localStorage.getItem('atomfin_token') || localStorage.getItem('atomtech_token') || ''
      const form = new FormData()
      form.append('pdf', file)
      form.append('banco', banco)
      const resp = await fetch(`${API_BASE}/extrato/parse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await resp.json()
      if (!data.ok) throw new Error(data.error || 'Erro ao processar PDF')
      setResultado(data)
    } catch (e: any) {
      setErro(e.message || 'Erro ao processar PDF')
    } finally {
      setLoading(false)
    }
  }

  const txsFiltradas = useCallback((): ExtratoTransacao[] => {
    if (!resultado) return []
    return resultado.transacoes.filter(tx => {
      if (filtro !== 'TODOS' && tx.tipo !== filtro) return false
      if (busca.trim()) {
        const b = busca.toLowerCase()
        return tx.descricao.toLowerCase().includes(b) || tx.data.includes(b)
      }
      return true
    })
  }, [resultado, filtro, busca])

  const txs = txsFiltradas()

  return (
    <PageWrapper>
      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 800, margin: 0 }}>
          Extrato Bancário
        </h2>
        <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>
          Importe extratos em PDF do Banco Inter ou Sicoob e crie lançamentos diretamente
        </p>
      </div>

      {/* ── Upload ────────────────────────────────────────────── */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: '24px 28px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 18, letterSpacing: '0.05em' }}>
          CARREGAR EXTRATO
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>

          {/* Banco */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>BANCO</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['INTER', 'SICOOB'] as const).map(b => (
                <button
                  key={b}
                  onClick={() => { setBanco(b); setResultado(null); setFile(null); setErro(''); if (fileRef.current) fileRef.current.value = '' }}
                  style={{
                    padding: '9px 22px', borderRadius: 9, cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                    border: `1px solid ${banco === b ? C.emerald : C.border}`,
                    background: banco === b ? C.emerald + '18' : C.bgHover,
                    color: banco === b ? C.emerald : C.textMuted,
                    transition: 'all 0.15s',
                  }}
                >
                  {b === 'INTER' ? '🟠 Banco Inter' : '🟢 Sicoob'}
                </button>
              ))}
            </div>
          </div>

          {/* Arquivo */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>ARQUIVO PDF</div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `1.5px dashed ${file ? C.emerald : C.border}`,
                borderRadius: 9, padding: '11px 16px',
                cursor: 'pointer', transition: 'all 0.15s',
                background: file ? C.emerald + '08' : C.bgHover,
                display: 'flex', alignItems: 'center', gap: 10,
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = C.emerald)}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = file ? C.emerald : C.border)}
            >
              <span style={{ fontSize: 18 }}>📄</span>
              <span style={{ fontSize: 12, color: file ? C.emerald : C.textMuted }}>
                {file ? file.name : 'Clique para selecionar o PDF do extrato'}
              </span>
            </div>
            <input
              ref={fileRef} type="file" accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={e => { setFile(e.target.files?.[0] ?? null); setResultado(null); setErro('') }}
            />
          </div>

          {/* Botão */}
          <Btn variant="primary" onClick={processarPDF} disabled={loading || !file}>
            {loading ? <><Spinner size={14} />&nbsp;Processando...</> : '⚡ Processar PDF'}
          </Btn>
        </div>

        {erro && (
          <Alert type="danger" style={{ marginTop: 14 }}>
            {erro}
          </Alert>
        )}
      </div>

      {/* ── Resultados ────────────────────────────────────────── */}
      {resultado && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
            <KpiCard label="Transações"      value={resultado.total.toString()}         color={C.info} />
            <KpiCard label="Total Entradas"  value={fmtBRLFull(resultado.totalEntradas)} color={C.credit} />
            <KpiCard label="Total Saídas"    value={fmtBRLFull(resultado.totalSaidas)}  color={C.debit} />
            <KpiCard label="Já importados"   value={`${importados.size} / ${resultado.total}`} color={C.emerald} />
          </div>

          {/* Filtros */}
          <div style={{
            background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '14px 18px', marginBottom: 14,
            display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {([['TODOS','Todos'],['C','Entradas'],['D','Saídas']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setFiltro(v)} style={{
                  padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                  border: `1px solid ${filtro === v ? C.emerald : C.border}`,
                  background: filtro === v ? C.emerald + '18' : 'transparent',
                  color: filtro === v ? C.emerald : C.textMuted, transition: 'all 0.12s',
                }}>{l}</button>
              ))}
            </div>
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por descrição ou data (YYYY-MM-DD)..."
              style={{
                flex: 1, minWidth: 200,
                background: C.bgHover, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '7px 12px',
                color: C.text, fontSize: 12, outline: 'none', fontFamily: 'inherit',
              }}
            />
            <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' }}>
              {txs.length} resultado{txs.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Tabela */}
          <div style={{
            background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '96px 1fr 90px 130px 112px',
              padding: '10px 18px', borderBottom: `1px solid ${C.border}`,
              fontSize: 10, fontWeight: 700, color: C.textDim,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              <div>Data</div>
              <div>Descrição</div>
              <div style={{ textAlign: 'center' }}>Tipo</div>
              <div style={{ textAlign: 'right' }}>Valor</div>
              <div style={{ textAlign: 'center' }}>Ação</div>
            </div>

            <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
              {txs.map((tx) => {
                const idx = resultado.transacoes.indexOf(tx)
                const importado = importados.has(idx)
                const cor = tx.tipo === 'C' ? C.credit : C.debit

                return (
                  <div key={idx} style={{
                    display: 'grid', gridTemplateColumns: '96px 1fr 90px 130px 112px',
                    padding: '10px 18px', borderBottom: `1px solid ${C.border}50`,
                    alignItems: 'center', transition: 'background 0.1s',
                    background: importado ? C.emerald + '08' : 'transparent',
                    opacity: importado ? 0.6 : 1,
                  }}
                    onMouseEnter={e => !importado && ((e.currentTarget as HTMLDivElement).style.background = C.bgHover + '60')}
                    onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = importado ? C.emerald + '08' : 'transparent')}
                  >
                    <div style={{ fontSize: 12, color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDataBR(tx.data)}
                    </div>
                    <div style={{ fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }} title={tx.descricao}>
                      {tx.descricao}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ padding: '2px 9px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: cor + '18', color: cor }}>
                        {tx.tipo === 'C' ? '↓ Entrada' : '↑ Saída'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: cor, fontVariantNumeric: 'tabular-nums' }}>
                      {tx.tipo === 'D' ? '- ' : '+ '}{fmtBRLFull(tx.valor)}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {importado ? (
                        <span style={{ fontSize: 11, color: C.emerald, fontWeight: 600 }}>✓ Importado</span>
                      ) : (
                        <button
                          onClick={() => setTxModal(tx)}
                          style={{
                            padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
                            border: `1px solid ${C.border}`, background: C.bgHover,
                            color: C.text, fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                            transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.emerald; el.style.color = C.emerald; el.style.background = C.emerald + '14' }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.border; el.style.color = C.text; el.style.background = C.bgHover }}
                        >
                          + Lançamento
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {txs.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                  Nenhuma transação encontrada.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Modal Importar ───────────────────────────────────── */}
      <ModalImportar
        tx={txModal}
        contas={contas} planos={planos} centros={centros}
        onClose={() => setTxModal(null)}
        onSuccess={() => {
          if (txModal && resultado) {
            const idx = resultado.transacoes.indexOf(txModal)
            setImportados(prev => new Set([...prev, idx]))
          }
          setTxModal(null)
        }}
      />
    </PageWrapper>
  )
}
