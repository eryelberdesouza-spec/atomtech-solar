// ═══════════════════════════════════════════════════════════════════
// Propostas — importação de propostas aceitas como títulos a receber
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { trpc } from '../lib/trpc'
import { PageWrapper, C, Spinner, Alert, Btn } from '../components/ui'
import { fmtBRLFull } from '../lib/masks'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtData(s: string | null | undefined) {
  if (!s) return '—'
  const [y, m, d] = String(s).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function fmtCpfCnpj(v: string | null | undefined) {
  if (!v) return ''
  const n = v.replace(/\D/g, '')
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return v
}

// ─── BADGE DE STATUS ──────────────────────────────────────────────────────────

function BadgeImportada({ importada }: { importada: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: importada ? '#34D39920' : '#F59E0B20',
      color: importada ? '#34D399' : '#F59E0B',
    }}>
      {importada ? '✓ Importada' : '⏳ Pendente'}
    </span>
  )
}

// ─── MODAL DE IMPORTAÇÃO ──────────────────────────────────────────────────────

function ModalImportar({
  proposta,
  onClose,
  onSuccess,
}: {
  proposta: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [condicaoId, setCondicaoId]       = useState<number | null>(null)
  const [planoContasId, setPlanoContasId] = useState<number | ''>('')
  const [centroCustoId, setCentroCustoId] = useState<number | ''>('')
  const [contaId, setContaId]             = useState<number | ''>('')
  const [observacoes, setObservacoes]     = useState('')
  const [erro, setErro]                   = useState('')

  const { data: condicoes, isLoading: loadCond } =
    (trpc as any).fin.proposta.condicoes.useQuery({ propostaId: proposta.id })

  const { data: planos } = (trpc as any).fin.planoContas.list.useQuery()
  const { data: centros } = (trpc as any).fin.centroCusto.list.useQuery()
  const { data: contas } = (trpc as any).fin.conta.list.useQuery()

  const utils = (trpc as any).useUtils()
  const importarMut = (trpc as any).fin.proposta.importar.useMutation({
    onSuccess: () => {
      utils.fin.proposta.listar.invalidate()
      onSuccess()
    },
    onError: (e: any) => setErro(e.message ?? 'Erro ao importar'),
  })

  const condicoesData: any[] = condicoes ?? []

  // Seleciona automaticamente a primeira condição ao carregar
  useEffect(() => {
    if (condicoesData.length > 0 && condicaoId === null) {
      setCondicaoId(condicoesData[0].id)
    }
  }, [condicoesData.length])

  const planosReceita = (planos ?? []).filter((p: any) => p.tipo === 'RECEITA')
  const condSelecionada = condicoesData.find((c: any) => c.id === condicaoId)

  function handleImportar() {
    if (!condicaoId) { setErro('Selecione uma condição comercial'); return }
    setErro('')
    importarMut.mutate({
      propostaId:    proposta.id,
      condicaoId,
      planoContasId: planoContasId ? Number(planoContasId) : undefined,
      centroCustoId: centroCustoId ? Number(centroCustoId) : undefined,
      contaId:       contaId ? Number(contaId) : undefined,
      observacoes:   observacoes || undefined,
    })
  }

  const select = (label: string, value: any, onChange: (v: any) => void, options: { value: any; label: string }[], placeholder: string) => (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        style={{
          width: '100%', background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 8, color: C.text, fontSize: 13, padding: '8px 10px',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
        padding: '28px 28px 24px', width: 560, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>
              Importar Proposta
            </h2>
            <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>
              Gera título a receber com base nas condições comerciais
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 20, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        {/* Info da proposta */}
        <div style={{
          background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`,
          padding: '12px 14px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{proposta.numero}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#34D399' }}>
              {proposta.valorTotal ? fmtBRLFull(proposta.valorTotal) : '—'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.textMuted }}>
            {proposta.clienteNome}
            {proposta.clienteCpfCnpj && <span style={{ marginLeft: 8 }}>{fmtCpfCnpj(proposta.clienteCpfCnpj)}</span>}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            Emitida em {fmtData(proposta.dataEmissao)}
          </div>
        </div>

        {loadCond ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spinner /></div>
        ) : condicoesData.length === 0 ? (
          <Alert type="warning">Nenhuma condição comercial cadastrada nesta proposta.</Alert>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Seleção de condição */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Condição Comercial
              </div>
              {condicoesData.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => setCondicaoId(c.id)}
                  style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                    border: `1px solid ${condicaoId === c.id ? '#34D399' : C.border}`,
                    background: condicaoId === c.id ? '#34D39912' : C.bg,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.descricao || c.tipo}</span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{c.parcelas?.length ?? 0} parcela(s)</span>
                  </div>
                  {/* Preview das parcelas */}
                  {condicaoId === c.id && c.parcelas?.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {c.parcelas.map((p: any) => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.textMuted }}>
                          <span>{p.descricaoEvento}</span>
                          <span style={{ color: '#34D399', fontWeight: 600 }}>{fmtBRLFull(Number(p.valor))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Classificação financeira */}
            {select('Plano de Contas (Receita)', planoContasId, setPlanoContasId,
              planosReceita.map((p: any) => ({ value: p.id, label: `${p.codigo} — ${p.nome}` })),
              'Sem classificação'
            )}
            {select('Centro de Custo', centroCustoId, setCentroCustoId,
              (centros ?? []).map((c: any) => ({ value: c.id, label: c.nome })),
              'Sem centro de custo'
            )}
            {select('Conta para Recebimento', contaId, setContaId,
              (contas ?? []).map((c: any) => ({ value: c.id, label: c.nome })),
              'Sem conta definida'
            )}

            {/* Observações */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Observações</div>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={2}
                placeholder="Opcional..."
                style={{
                  width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
                  color: C.text, fontSize: 13, padding: '8px 10px', resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>

            {erro && <Alert type="error">{erro}</Alert>}

            {/* Nota */}
            <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
              O cliente será vinculado automaticamente pelo CPF/CNPJ. Os vencimentos são calculados a partir da data de emissão da proposta.
            </div>
          </div>
        )}

        {/* Ações */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '9px 20px', color: C.textMuted, fontSize: 13, cursor: 'pointer',
          }}>Cancelar</button>
          <button
            onClick={handleImportar}
            disabled={importarMut.isLoading || !condicaoId || condicoesData.length === 0}
            style={{
              background: importarMut.isLoading || !condicaoId ? C.border : '#34D399',
              border: 'none', borderRadius: 8, padding: '9px 24px',
              color: importarMut.isLoading || !condicaoId ? C.textMuted : '#022C22',
              fontSize: 13, fontWeight: 700,
              cursor: importarMut.isLoading || !condicaoId ? 'not-allowed' : 'pointer',
            }}
          >
            {importarMut.isLoading ? '⏳ Importando...' : '↯ Gerar Título a Receber'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export function PropostasPage() {
  const [aba, setAba]               = useState<'pendentes' | 'importadas'>('pendentes')
  const [propostaModal, setPropostaModal] = useState<any | null>(null)
  const [sucesso, setSucesso]       = useState('')

  const { data, isLoading, error } = (trpc as any).fin.proposta.listar.useQuery()
  const propostas: any[] = data ?? []

  const pendentes  = propostas.filter(p => !p.importada)
  const importadas = propostas.filter(p => p.importada)
  const lista      = aba === 'pendentes' ? pendentes : importadas

  function handleSucesso() {
    setPropostaModal(null)
    setAba('importadas')
    setSucesso('Proposta importada com sucesso! Título a receber gerado.')
    setTimeout(() => setSucesso(''), 5000)
  }

  const tabStyle = (ativo: boolean) => ({
    padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: 'none', background: 'none', outline: 'none',
    color: ativo ? '#34D399' : C.textMuted,
    borderBottom: `2px solid ${ativo ? '#34D399' : 'transparent'}`,
    transition: 'all 0.15s',
  })

  return (
    <PageWrapper
      title="Propostas"
      subtitle="Importação de propostas aceitas para o financeiro"
    >
      {/* Abas */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 20,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <button style={tabStyle(aba === 'pendentes')} onClick={() => setAba('pendentes')}>
          Contratos Formalizados
          {pendentes.length > 0 && (
            <span style={{
              marginLeft: 8, padding: '1px 7px', borderRadius: 10, fontSize: 10,
              background: '#F59E0B30', color: '#F59E0B', fontWeight: 700,
            }}>{pendentes.length}</span>
          )}
        </button>
        <button style={tabStyle(aba === 'importadas')} onClick={() => setAba('importadas')}>
          Já Importadas
          {importadas.length > 0 && (
            <span style={{
              marginLeft: 8, padding: '1px 7px', borderRadius: 10, fontSize: 10,
              background: '#34D39920', color: '#34D399', fontWeight: 700,
            }}>{importadas.length}</span>
          )}
        </button>
      </div>

      {sucesso && <Alert type="success" style={{ marginBottom: 16 }}>{sucesso}</Alert>}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spinner /></div>
      ) : error ? (
        <Alert type="error">Erro ao carregar propostas: {(error as any)?.message}</Alert>
      ) : lista.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          color: C.textMuted, fontSize: 14,
        }}>
          {aba === 'pendentes'
            ? 'Nenhuma proposta com contrato formalizado aguardando importação.'
            : 'Nenhuma proposta importada ainda.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista.map(p => (
            <div key={p.id} style={{
              background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
              padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              {/* Ícone tipo */}
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: p.tipoProposta === 'fotovoltaico' ? '#F59E0B20' : '#60A5FA20',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                {p.tipoProposta === 'fotovoltaico' ? '☀' : '⚙'}
              </div>

              {/* Dados principais */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.numero}</span>
                  <BadgeImportada importada={p.importada} />
                </div>
                <div style={{ fontSize: 13, color: C.textMuted }}>{p.clienteNome}</div>
                {p.clienteCpfCnpj && (
                  <div style={{ fontSize: 11, color: C.textMuted }}>{fmtCpfCnpj(p.clienteCpfCnpj)}</div>
                )}
              </div>

              {/* Valor + data */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#34D399' }}>
                  {p.valorTotal ? fmtBRLFull(p.valorTotal) : '—'}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  Emitida: {fmtData(p.dataEmissao)}
                  {p.dataFormalizacao && (
                    <span style={{ marginLeft: 10, color: '#10B981' }}>
                      ✔ Formalizado: {fmtData(p.dataFormalizacao)}
                    </span>
                  )}
                </div>
              </div>

              {/* Ação */}
              <div style={{ flexShrink: 0 }}>
                {p.importada ? (
                  <span style={{ fontSize: 11, color: C.textMuted }}>
                    Título #{p.tituloFinId}
                  </span>
                ) : (
                  <Btn size="sm" onClick={() => setPropostaModal(p)}>
                    ↯ Importar
                  </Btn>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {propostaModal && (
        <ModalImportar
          proposta={propostaModal}
          onClose={() => setPropostaModal(null)}
          onSuccess={handleSucesso}
        />
      )}
    </PageWrapper>
  )
}
