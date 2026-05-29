// ═══════════════════════════════════════════════════════════════════
// Página de Importação de Extrato Bancário
// Suporta: Banco Inter e Sicoob
// ═══════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react'
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

const STORAGE_KEY   = 'atomfin_extrato_v2'
const STORAGE_IMP   = 'atomfin_extrato_importados_v2'
const MAX_AGE_MS    = 48 * 60 * 60 * 1000 // 48 horas

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

const labelStyle = {
  fontSize: 11, color: C.textMuted, fontWeight: 700 as const,
  marginBottom: 5, display: 'block' as const,
}
const inputStyle = {
  width: '100%', boxSizing: 'border-box' as const,
  background: C.bgHover, border: `1px solid ${C.border}`,
  borderRadius: 8, padding: '8px 12px',
  color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit',
}
const selectStyle = { ...inputStyle, cursor: 'pointer' }

// ─── Mini-form de cadastro rápido de Pessoa ───────────────────────────────────

interface CadastroRapidoProps {
  nomeInicial: string
  tipo: 'RECEBER' | 'PAGAR'
  onSalvo: (pessoa: { id: number; nome: string }) => void
  onCancelar: () => void
}

function CadastroRapido({ nomeInicial, tipo, onSalvo, onCancelar }: CadastroRapidoProps) {
  const [nome,       setNome]       = useState(nomeInicial)
  const [cpfCnpj,   setCpfCnpj]    = useState('')
  const [tipoPessoa, setTipoPessoa] = useState<'FISICA' | 'JURIDICA'>('JURIDICA')
  const [papel,      setPapel]      = useState<'CLIENTE' | 'FORNECEDOR' | 'AMBOS'>(
    tipo === 'RECEBER' ? 'CLIENTE' : 'FORNECEDOR'
  )
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState('')

  const criarPessoa = (trpc as any).fin.pessoa.create.useMutation()
  const utils       = (trpc as any).useUtils()

  const handleSalvar = async () => {
    if (!nome.trim()) { setErro('Informe o nome'); return }
    setLoading(true); setErro('')
    try {
      // A API agora retorna { ok, id } — usamos o ID diretamente, sem race condition
      const result = await criarPessoa.mutateAsync({
        tipoPessoa,
        nome: nome.trim(),
        cpfCnpj:      cpfCnpj.trim() || null,
        isCliente:    papel === 'CLIENTE'    || papel === 'AMBOS',
        isFornecedor: papel === 'FORNECEDOR' || papel === 'AMBOS',
        fantasia: null, email: null, telefone: null,
        cep: null, logradouro: null, numero: null, complemento: null,
        bairro: null, cidade: null, estado: null,
        regime: null, observacoes: null,
        banco: null, tipoPix: null, chavePix: null, tipoPagamento: null,
      })
      // Invalida o cache para que a lista de pessoas seja atualizada em todas as telas
      utils.fin.pessoa.list.invalidate()
      // ID vem diretamente do retorno da API — sem busca por nome, sem race condition
      onSalvo({ id: result.id, nome: nome.trim() })
    } catch (e: any) {
      setErro(e.message || 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.emerald}40`,
      borderRadius: 10, padding: '16px',
      marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.emerald, marginBottom: 2 }}>
        ＋ CADASTRO RÁPIDO
      </div>

      {erro && (
        <Alert type="danger">{erro}</Alert>
      )}

      <div>
        <label style={labelStyle}>Nome *</label>
        <input value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} autoFocus />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Tipo de pessoa</label>
          <select value={tipoPessoa} onChange={e => setTipoPessoa(e.target.value as any)} style={selectStyle}>
            <option value="JURIDICA">Jurídica (empresa)</option>
            <option value="FISICA">Física (CPF)</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Papel</label>
          <select value={papel} onChange={e => setPapel(e.target.value as any)} style={selectStyle}>
            <option value="CLIENTE">Cliente</option>
            <option value="FORNECEDOR">Fornecedor / Prestador</option>
            <option value="AMBOS">Ambos</option>
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>CPF / CNPJ (opcional)</label>
        <input
          value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)}
          placeholder="000.000.000-00 ou 00.000.000/0001-00"
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <Btn variant="ghost" onClick={onCancelar}>Cancelar</Btn>
        <Btn variant="primary" onClick={handleSalvar} disabled={loading}>
          {loading ? <Spinner size={13} /> : '✓ Salvar e vincular'}
        </Btn>
      </div>
    </div>
  )
}

// ─── Modal de Importação de Transação ────────────────────────────────────────

interface ModalImportarProps {
  tx: ExtratoTransacao | null
  onClose: () => void
  onSuccess: () => void
  contas: any[]
  planos: any[]
  centros: any[]
  pessoas: any[]
}

function ModalImportar({ tx, onClose, onSuccess, contas, planos, centros, pessoas }: ModalImportarProps) {
  const [contaId,      setContaId]      = useState('')
  const [planoId,      setPlanoId]      = useState('')
  const [centroId,     setCentroId]     = useState('')
  const [pessoaId,     setPessoaId]     = useState('')
  const [pessoaNome,   setPessoaNome]   = useState('')  // nome da pessoa selecionada
  const [formaPag,     setFormaPag]     = useState(() => tx ? detectarFormaPag(tx.descricao) : 'pix')
  const [descricao,    setDescricao]    = useState(tx?.descricao ?? '')
  const [salvarComo,   setSalvarComo]   = useState<'ABERTA' | 'PAGA'>('ABERTA')
  const [buscaPessoa,  setBuscaPessoa]  = useState('')
  const [mostraCadastro, setMostraCadastro] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [erro,         setErro]         = useState('')

  const criarTitulo = (trpc as any).fin.titulo.create.useMutation()

  if (!tx) return null

  const tipo  = tx.tipo === 'C' ? 'RECEBER' : 'PAGAR'
  const label = tipo === 'RECEBER' ? 'Recebimento' : 'Pagamento'
  const cor   = tipo === 'RECEBER' ? C.credit : C.debit

  // Filtra pessoas por tipo e busca
  const pessoasFiltradas = pessoas.filter((p: any) => {
    const matchTipo = tipo === 'RECEBER' ? p.isCliente : p.isFornecedor
    if (!matchTipo) return false
    if (!buscaPessoa.trim()) return false  // só mostra dropdown ao digitar
    return p.nome.toLowerCase().includes(buscaPessoa.toLowerCase())
  })

  const handleSelecionarPessoa = (p: { id: number; nome: string }) => {
    setPessoaId(String(p.id))
    setPessoaNome(p.nome)
    setBuscaPessoa('')
    setMostraCadastro(false)
  }

  const handleConfirmar = async () => {
    setLoading(true); setErro('')
    try {
      await criarTitulo.mutateAsync({
        tipo,
        descricao: descricao || tx.descricao,
        pessoaId:      pessoaId  ? parseInt(pessoaId)  : null,
        planoContasId: planoId   ? parseInt(planoId)   : null,
        centroCustoId: centroId  ? parseInt(centroId)  : null,
        valorOriginal: tx.valor,
        emissao: tx.data,
        parcelas: [{ numero: 1, valor: tx.valor, vencimento: tx.data }],
      })
      onSuccess()
    } catch (e: any) {
      setErro(e.message || 'Erro ao criar lançamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={!!tx} title={`Criar Lançamento — ${label}`} onClose={onClose} width={560}>
      {/* Resumo */}
      <div style={{
        background: cor + '12', border: `1px solid ${cor}30`,
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>
            {tx.banco} · {fmtDataBR(tx.data)}
          </div>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 600, maxWidth: 380, lineHeight: 1.4 }}>
            {tx.descricao}
          </div>
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: cor, flexShrink: 0, marginLeft: 16 }}>
          {tipo === 'PAGAR' ? '- ' : '+ '}{fmtBRLFull(tx.valor)}
        </div>
      </div>

      {erro && <Alert type="danger" style={{ marginBottom: 14 }}>{erro}</Alert>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Descrição */}
        <div>
          <label style={labelStyle}>Descrição do lançamento</label>
          <input value={descricao} onChange={e => setDescricao(e.target.value)}
            placeholder="Descrição" style={inputStyle} />
        </div>

        {/* Pessoa — busca + cadastro rápido */}
        <div>
          <label style={labelStyle}>
            {tipo === 'RECEBER' ? 'Cliente' : 'Fornecedor / Prestador'}
            <span style={{ fontWeight: 400, color: C.textDim }}> (opcional)</span>
          </label>

          {pessoaNome ? (
            /* Pessoa selecionada */
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: cor + '12', border: `1px solid ${cor}40`,
              borderRadius: 8, padding: '8px 12px',
            }}>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{pessoaNome}</span>
              <button
                onClick={() => { setPessoaId(''); setPessoaNome(''); setMostraCadastro(false) }}
                style={{ background:'none', border:'none', color: C.textMuted, cursor:'pointer', fontSize:16, padding:'0 2px' }}
              >×</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                value={buscaPessoa}
                onChange={e => { setBuscaPessoa(e.target.value); setMostraCadastro(false) }}
                placeholder={`Buscar ${tipo === 'RECEBER' ? 'cliente' : 'fornecedor'}... ou digite para cadastrar novo`}
                style={inputStyle}
              />

              {/* Dropdown de resultados */}
              {buscaPessoa.trim() && !mostraCadastro && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: C.bgCard, border: `1px solid ${C.border}`,
                  borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {pessoasFiltradas.slice(0, 10).map((p: any) => (
                    <div key={p.id}
                      onClick={() => handleSelecionarPessoa(p)}
                      style={{
                        padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: C.text,
                        borderBottom: `1px solid ${C.border}40`, transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.bgHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {p.nome}
                      {p.documento && <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>{p.documento}</span>}
                    </div>
                  ))}

                  {/* Opção de cadastrar novo — sempre aparece quando há texto digitado */}
                  <div
                    onClick={() => setMostraCadastro(true)}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', fontSize: 12,
                      color: C.emerald, fontWeight: 700,
                      borderTop: pessoasFiltradas.length > 0 ? `1px solid ${C.border}` : 'none',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.emerald + '10')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    ＋ Cadastrar "{buscaPessoa}" agora
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mini-form de cadastro rápido */}
          {mostraCadastro && (
            <CadastroRapido
              nomeInicial={buscaPessoa}
              tipo={tipo}
              onSalvo={handleSelecionarPessoa}
              onCancelar={() => setMostraCadastro(false)}
            />
          )}
        </div>

        {/* Conta bancária */}
        <div>
          <label style={labelStyle}>Conta bancária</label>
          <select value={contaId} onChange={e => setContaId(e.target.value)} style={selectStyle}>
            <option value="">— Selecione a conta —</option>
            {contas.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        {/* Plano + Centro */}
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

        {/* Forma de pagamento */}
        <div>
          <label style={labelStyle}>Forma de pagamento</label>
          <select value={formaPag} onChange={e => setFormaPag(e.target.value)} style={selectStyle}>
            {FORMAS_PAG.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label style={labelStyle}>Salvar como</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['ABERTA', 'PAGA'] as const).map(op => (
              <button key={op} onClick={() => setSalvarComo(op)} style={{
                flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                border: `1px solid ${salvarComo === op ? cor : C.border}`,
                background: salvarComo === op ? cor + '18' : C.bgCard,
                color: salvarComo === op ? cor : C.textMuted,
                transition: 'all 0.15s',
              }}>
                {op === 'ABERTA' ? '○ Em Aberto' : '✓ Já Liquidado'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
        <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
        <Btn variant="primary" onClick={handleConfirmar} disabled={loading}>
          {loading ? <Spinner size={14} /> : 'Criar Lançamento'}
        </Btn>
      </div>
    </Modal>
  )
}

// ─── Componente Principal ────────────────────────────────────────────────────

export function ExtratoPage() {
  const [banco,      setBanco]      = useState<'INTER' | 'SICOOB'>('INTER')
  const [file,       setFile]       = useState<File | null>(null)
  const [resultado,  setResultado]  = useState<ParseResult | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [erro,       setErro]       = useState('')
  const [filtro,     setFiltro]     = useState<'TODOS' | 'C' | 'D'>('TODOS')
  const [busca,      setBusca]      = useState('')
  const [txModal,    setTxModal]    = useState<ExtratoTransacao | null>(null)
  const [importados, setImportados] = useState<Set<number>>(new Set())
  const [restorado,  setRestorado]  = useState(false)  // veio do localStorage
  const fileRef = useRef<HTMLInputElement>(null)

  const contasQ  = (trpc as any).fin.conta.list.useQuery()
  const planoQ   = (trpc as any).fin.planoContas.list.useQuery()
  const centroQ  = (trpc as any).fin.centroCusto.list.useQuery()
  const pessoaQ  = (trpc as any).fin.pessoa.list.useQuery()

  const contas   = contasQ.data  ?? []
  const planos   = planoQ.data   ?? []
  const centros  = centroQ.data  ?? []
  const pessoas  = pessoaQ.data  ?? []

  // ── Restaurar extrato do localStorage ao carregar ──────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { banco: b, resultado: r, timestamp } = JSON.parse(saved)
        if (Date.now() - timestamp < MAX_AGE_MS) {
          setBanco(b)
          setResultado(r)
          setRestorado(true)
        } else {
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem(STORAGE_IMP)
        }
      }
      const savedImp = localStorage.getItem(STORAGE_IMP)
      if (savedImp) {
        setImportados(new Set(JSON.parse(savedImp)))
      }
    } catch { /* ignora erro de parse */ }
  }, [])

  // ── Salvar extrato no localStorage quando muda ─────────────────────────────
  useEffect(() => {
    if (resultado) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ banco, resultado, timestamp: Date.now() }))
    }
  }, [resultado, banco])

  // ── Salvar importados quando muda ─────────────────────────────────────────
  useEffect(() => {
    if (importados.size > 0) {
      localStorage.setItem(STORAGE_IMP, JSON.stringify([...importados]))
    }
  }, [importados])

  const limparExtrato = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_IMP)
    setResultado(null)
    setImportados(new Set())
    setFile(null)
    setErro('')
    setRestorado(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const processarPDF = async () => {
    if (!file) { setErro('Selecione um arquivo PDF'); return }
    setLoading(true); setErro(''); setResultado(null); setImportados(new Set()); setRestorado(false)
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
  const pendentes = resultado ? resultado.total - importados.size : 0

  return (
    <PageWrapper>
      {/* ── Cabeçalho ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: C.text, fontSize: 18, fontWeight: 800, margin: 0 }}>
            Extrato Bancário
          </h2>
          <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>
            Importe extratos em PDF do Banco Inter ou Sicoob e crie lançamentos diretamente
          </p>
        </div>
        {resultado && (
          <button
            onClick={limparExtrato}
            style={{
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.textMuted, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.danger; (e.currentTarget as HTMLButtonElement).style.color = C.danger }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.textMuted }}
          >
            ✕ Limpar extrato
          </button>
        )}
      </div>

      {/* ── Banner: extrato restaurado ─────────────────────────────── */}
      {restorado && resultado && (
        <Alert type="info" style={{ marginBottom: 16 }}>
          📂 Extrato restaurado — você tem <strong>{pendentes} lançamento{pendentes !== 1 ? 's' : ''} pendente{pendentes !== 1 ? 's' : ''}</strong>.
          Continue de onde parou ou clique em "Limpar extrato" para começar um novo.
        </Alert>
      )}

      {/* ── Upload ──────────────────────────────────────────────────── */}
      {!resultado && (
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
                  <button key={b} onClick={() => { setBanco(b); setFile(null); setErro(''); if (fileRef.current) fileRef.current.value = '' }}
                    style={{
                      padding: '9px 22px', borderRadius: 9, cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                      border: `1px solid ${banco === b ? C.emerald : C.border}`,
                      background: banco === b ? C.emerald + '18' : C.bgHover,
                      color: banco === b ? C.emerald : C.textMuted,
                      transition: 'all 0.15s',
                    }}>
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
              <input ref={fileRef} type="file" accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={e => { setFile(e.target.files?.[0] ?? null); setErro('') }} />
            </div>

            {/* Botão */}
            <Btn variant="primary" onClick={processarPDF} disabled={loading || !file}>
              {loading ? <><Spinner size={14} />&nbsp;Processando...</> : '⚡ Processar PDF'}
            </Btn>
          </div>

          {erro && <Alert type="danger" style={{ marginTop: 14 }}>{erro}</Alert>}
        </div>
      )}

      {/* Quando já tem resultado: mostra botão para trocar o arquivo */}
      {resultado && !restorado && (
        <div style={{
          background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '12px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>
            📄 {file?.name ?? 'Extrato carregado'} · {banco === 'INTER' ? '🟠 Banco Inter' : '🟢 Sicoob'}
          </span>
          <Btn variant="ghost" onClick={limparExtrato}>Carregar outro extrato</Btn>
        </div>
      )}

      {/* ── Resultados ───────────────────────────────────────────────── */}
      {resultado && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
            <KpiCard label="Transações"     value={resultado.total.toString()}          color={C.info} />
            <KpiCard label="Total Entradas" value={fmtBRLFull(resultado.totalEntradas)} color={C.credit} />
            <KpiCard label="Total Saídas"   value={fmtBRLFull(resultado.totalSaidas)}  color={C.debit} />
            <KpiCard label="Importados"     value={`${importados.size} / ${resultado.total}`} color={C.emerald} />
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
              placeholder="Buscar por descrição ou data..."
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
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '96px 1fr 90px 130px 112px',
              padding: '10px 18px', borderBottom: `1px solid ${C.border}`,
              fontSize: 10, fontWeight: 700, color: C.textDim,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              <div>Data</div><div>Descrição</div>
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

      {/* ── Modal Importar ───────────────────────────────────────────── */}
      <ModalImportar
        tx={txModal}
        contas={contas} planos={planos} centros={centros} pessoas={pessoas}
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
