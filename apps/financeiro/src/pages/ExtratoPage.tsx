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

// ─── Fingerprint determinístico para deduplicação cross-device ───────────────
// Gerado a partir dos dados da transação — mesmo PDF em qualquer computador
// produz o mesmo fingerprint. Persistido no banco para evitar duplicidade.
function gerarFingerprint(tx: ExtratoTransacao): string {
  const centavos = Math.round(tx.valor * 100)
  const desc = tx.descricao.substring(0, 60).replace(/\s+/g, ' ').trim().toUpperCase()
  return `${tx.banco}|${tx.data}|${centavos}|${desc}`
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

// ─── Tipo de dados de nova pessoa (sem chamada de API aqui) ──────────────────

interface PessoaNovaDados {
  nome:         string
  tipoPessoa:   'FISICA' | 'JURIDICA'
  isCliente:    boolean
  isFornecedor: boolean
  cpfCnpj:      string | null
}

// ─── Mini-form de cadastro rápido de Pessoa (só coleta dados — API call é atômica) ──

interface CadastroRapidoProps {
  nomeInicial: string
  tipo: 'RECEBER' | 'PAGAR'
  onConfirmar: (dados: PessoaNovaDados) => void
  onCancelar:  () => void
}

function CadastroRapido({ nomeInicial, tipo, onConfirmar, onCancelar }: CadastroRapidoProps) {
  const [nome,       setNome]       = useState(nomeInicial)
  const [cpfCnpj,   setCpfCnpj]    = useState('')
  const [tipoPessoa, setTipoPessoa] = useState<'FISICA' | 'JURIDICA'>('JURIDICA')
  const [papel,      setPapel]      = useState<'CLIENTE' | 'FORNECEDOR' | 'AMBOS'>(
    tipo === 'RECEBER' ? 'CLIENTE' : 'FORNECEDOR'
  )
  const [erro, setErro] = useState('')

  const handleConfirmar = () => {
    if (!nome.trim()) { setErro('Informe o nome'); return }
    setErro('')
    onConfirmar({
      nome:         nome.trim(),
      tipoPessoa,
      isCliente:    papel === 'CLIENTE'    || papel === 'AMBOS',
      isFornecedor: papel === 'FORNECEDOR' || papel === 'AMBOS',
      cpfCnpj:      cpfCnpj.trim() || null,
    })
  }

  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.emerald}40`,
      borderRadius: 10, padding: '16px',
      marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.emerald, marginBottom: 2 }}>
        ＋ CADASTRO RÁPIDO — será salvo ao confirmar o lançamento
      </div>

      {erro && <Alert type="danger">{erro}</Alert>}

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
        <Btn variant="primary" onClick={handleConfirmar}>
          ✓ Usar este cadastro
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
  fingerprint?: string
}

function ModalImportar({ tx, onClose, onSuccess, contas, planos, centros, pessoas, fingerprint }: ModalImportarProps) {
  const [contaId,      setContaId]      = useState('')
  const [planoId,      setPlanoId]      = useState('')
  const [centroId,     setCentroId]     = useState('')
  // Pessoa existente (selecionada do dropdown)
  const [pessoaId,     setPessoaId]     = useState('')
  const [pessoaNome,   setPessoaNome]   = useState('')
  // Pessoa NOVA (preenchida no CadastroRapido — salva atomicamente com o lançamento)
  const [pessoaNova,   setPessoaNova]   = useState<PessoaNovaDados | null>(null)
  const [formaPag,     setFormaPag]     = useState(() => tx ? detectarFormaPag(tx.descricao) : 'pix')
  const [descricao,    setDescricao]    = useState(tx?.descricao ?? '')
  const [salvarComo,   setSalvarComo]   = useState<'ABERTA' | 'PAGA'>('ABERTA')
  const [buscaPessoa,  setBuscaPessoa]  = useState('')
  const [mostraCadastro, setMostraCadastro] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [erro,         setErro]         = useState('')

  // Endpoint atômico: cria pessoa (se nova) + título + parcela em uma única chamada
  const importarExtrato = (trpc as any).fin.extrato.importar.useMutation()
  const utils = (trpc as any).useUtils()

  if (!tx) return null

  const tipo  = tx.tipo === 'C' ? 'RECEBER' : 'PAGAR'
  const label = tipo === 'RECEBER' ? 'Recebimento' : 'Pagamento'
  const cor   = tipo === 'RECEBER' ? C.credit : C.debit

  // Pessoa selecionada para exibição (existente ou nova pendente)
  const pessoaExibida = pessoaNome || pessoaNova?.nome || ''

  const pessoasFiltradas = pessoas.filter((p: any) => {
    if (!buscaPessoa.trim()) return false
    return p.nome.toLowerCase().includes(buscaPessoa.toLowerCase())
  })

  const handleSelecionarExistente = (p: { id: number; nome: string }) => {
    setPessoaId(String(p.id))
    setPessoaNome(p.nome)
    setPessoaNova(null)   // limpa eventual nova cadastrada
    setBuscaPessoa('')
    setMostraCadastro(false)
  }

  const handleConfirmarCadastroRapido = (dados: PessoaNovaDados) => {
    setPessoaNova(dados)
    setPessoaId('')       // não há id ainda — será criado junto com o lançamento
    setPessoaNome('')
    setBuscaPessoa('')
    setMostraCadastro(false)
  }

  const limparPessoa = () => {
    setPessoaId(''); setPessoaNome(''); setPessoaNova(null)
    setBuscaPessoa(''); setMostraCadastro(false)
  }

  const handleConfirmar = async () => {
    setLoading(true); setErro('')
    try {
      const result = await importarExtrato.mutateAsync({
        tipo,
        descricao: descricao.trim() || tx.descricao,
        valor:     tx.valor,
        data:      tx.data,
        fingerprint: fingerprint ?? gerarFingerprint(tx),
        // Pessoa: existente OU nova (o backend resolve)
        pessoaId:      pessoaId && parseInt(pessoaId) > 0 ? parseInt(pessoaId) : undefined,
        pessoaNova:    pessoaNova ?? undefined,
        planoContasId: planoId  ? parseInt(planoId)  : undefined,
        centroCustoId: centroId ? parseInt(centroId) : undefined,
        salvarComo,
        contaId:       contaId ? parseInt(contaId) : undefined,
        formaPagamento: formaPag || undefined,
      })
      // Se criou pessoa nova, invalida o cache de pessoas para aparecer em outros locais
      if (result.pessoaId && pessoaNova) {
        utils.fin.pessoa.list.invalidate()
      }
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

          {pessoaExibida ? (
            /* Pessoa selecionada (existente ou nova pendente) */
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: cor + '12', border: `1px solid ${cor}40`,
              borderRadius: 8, padding: '8px 12px',
            }}>
              <div>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{pessoaExibida}</span>
                {pessoaNova && (
                  <span style={{ fontSize: 10, color: C.emerald, marginLeft: 8, fontWeight: 600 }}>
                    ✦ novo — será cadastrado ao confirmar
                  </span>
                )}
              </div>
              <button
                onClick={limparPessoa}
                style={{ background:'none', border:'none', color: C.textMuted, cursor:'pointer', fontSize:16, padding:'0 2px' }}
              >×</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                value={buscaPessoa}
                onChange={e => { setBuscaPessoa(e.target.value); setMostraCadastro(false) }}
                placeholder={`Buscar ${tipo === 'RECEBER' ? 'cliente' : 'fornecedor'}... ou cadastrar novo`}
                style={inputStyle}
              />

              {buscaPessoa.trim() && !mostraCadastro && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: C.bgCard, border: `1px solid ${C.border}`,
                  borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {pessoasFiltradas.slice(0, 10).map((p: any) => (
                    <div key={p.id}
                      onClick={() => handleSelecionarExistente(p)}
                      style={{
                        padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: C.text,
                        borderBottom: `1px solid ${C.border}40`, transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.bgHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {p.nome}
                      {p.cpfCnpj && <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>{p.cpfCnpj}</span>}
                    </div>
                  ))}
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
                    ＋ Cadastrar "{buscaPessoa}" como novo
                  </div>
                </div>
              )}
            </div>
          )}

          {mostraCadastro && (
            <CadastroRapido
              nomeInicial={buscaPessoa}
              tipo={tipo}
              onConfirmar={handleConfirmarCadastroRapido}
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
        <Btn
          variant="primary"
          onClick={handleConfirmar}
          disabled={loading || mostraCadastro}
          title={mostraCadastro ? 'Confirme ou cancele o cadastro antes de prosseguir' : undefined}
        >
          {loading ? <Spinner size={14} /> : 'Criar Lançamento'}
        </Btn>
      </div>
    </Modal>
  )
}

// ─── Modal de Conciliação (compartilhado entre PDF e OFX) ────────────────────
// Quando o extrato traz uma transação que possivelmente já foi lançada manualmente
// no sistema, este modal deixa o usuário vincular os dois (em vez de criar duplicata).

interface ConciliandoInfo {
  fingerprint: string
  descricao:   string
  data:        string
  valor:       number
  tipo:        'C' | 'D'
  matches: {
    parcelaId: number; tituloId: number; descricao: string
    valor: any; vencimento: string; status: string; tipo: 'PAGAR' | 'RECEBER'
  }[]
}

function ModalConciliar({
  conciliando, contas, contaIdDefault, onClose, onConciliado, onCriarNovoMesmoAssim,
}: {
  conciliando: ConciliandoInfo | null
  contas: any[]
  contaIdDefault?: string
  onClose: () => void
  onConciliado: (fingerprint: string) => void
  onCriarNovoMesmoAssim: (fingerprint: string) => void
}) {
  const conciliarMut = (trpc as any).fin.extrato.conciliar.useMutation()
  const [contaId,   setContaId]   = useState(contaIdDefault ?? '')
  const [erroLocal, setErroLocal] = useState('')

  useEffect(() => {
    if (conciliando) { setContaId(contaIdDefault ?? ''); setErroLocal('') }
  }, [conciliando?.fingerprint]) // eslint-disable-line

  if (!conciliando) return null
  const sugestaoTipo = conciliando.tipo === 'C' ? 'RECEBER' : 'PAGAR'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: C.bgCard, borderRadius: 16, border: `1px solid #D97706`,
        padding: '24px', width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#FBBF24', marginBottom: 6 }}>
          ⇌ Conciliar Lançamento
        </div>
        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
          O extrato bancário contém uma transação com o mesmo valor de um lançamento manual já existente.
          Escolha como deseja tratar:
        </p>

        {erroLocal && <Alert type="danger" style={{ marginBottom: 14 }}>{erroLocal}</Alert>}

        {/* Transação do extrato */}
        <div style={{ background: C.bg, borderRadius: 8, padding: '12px 14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', marginBottom: 6 }}>Transação do Extrato</div>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 3 }}>{conciliando.descricao}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: C.textMuted }}>
            <span>{fmtDataBR(conciliando.data)}</span>
            <span style={{ color: conciliando.tipo === 'C' ? C.credit : C.debit, fontWeight: 700 }}>
              {fmtBRLFull(conciliando.valor)}
            </span>
            <span style={{ color: C.textMuted }}>
              sugerido: {sugestaoTipo === 'RECEBER' ? 'Receber' : 'Pagar'}
            </span>
          </div>
        </div>

        {/* Conta bancária usada na baixa */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Conta bancária</label>
          <select value={contaId} onChange={e => setContaId(e.target.value)} style={selectStyle}>
            <option value="">— Selecione a conta —</option>
            {contas.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        {/* Lançamentos manuais correspondentes */}
        {conciliando.matches.map((m, i) => {
          const tipoDivergente = m.tipo !== sugestaoTipo
          return (
            <div key={m.parcelaId} style={{
              background: '#D9770610', borderRadius: 8, border: '1px solid #D97706',
              padding: '12px 14px', marginBottom: 8,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', marginBottom: 6 }}>
                Lançamento Manual {conciliando.matches.length > 1 ? `#${i + 1}` : ''} · {m.tipo === 'RECEBER' ? 'A Receber' : 'A Pagar'}
              </div>
              {tipoDivergente && (
                <div style={{ fontSize: 10.5, color: '#FBBF24', marginBottom: 6, lineHeight: 1.5 }}>
                  ⚠ Este lançamento é do tipo <strong>{m.tipo === 'RECEBER' ? 'Receber' : 'Pagar'}</strong>, mas o extrato sugere <strong>{sugestaoTipo === 'RECEBER' ? 'Receber' : 'Pagar'}</strong>.
                  Confira se a classificação de entrada/saída do extrato está correta antes de conciliar.
                </div>
              )}
              <div style={{ fontSize: 13, color: C.text, marginBottom: 3 }}>{m.descricao}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: C.textMuted }}>
                <span>{fmtDataBR(String(m.vencimento).slice(0, 10))}</span>
                <span style={{ fontWeight: 700 }}>{fmtBRLFull(Number(m.valor))}</span>
                <span style={{
                  padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  background: m.status === 'PAGA' ? C.emerald + '20' : '#60A5FA20',
                  color: m.status === 'PAGA' ? C.emerald : '#60A5FA',
                }}>{m.status}</span>
              </div>
              <button
                onClick={async () => {
                  setErroLocal('')
                  try {
                    await conciliarMut.mutateAsync({
                      parcelaId:     m.parcelaId,
                      fingerprint:   conciliando.fingerprint,
                      contaId:       contaId ? parseInt(contaId) : null,
                      dataPagamento: conciliando.data,
                      formaPagamento: detectarFormaPag(conciliando.descricao),
                    })
                    onConciliado(conciliando.fingerprint)
                  } catch (e: any) {
                    setErroLocal(e.message || 'Erro ao conciliar')
                  }
                }}
                style={{
                  marginTop: 10, width: '100%', padding: '8px', borderRadius: 7,
                  background: '#D97706', border: 'none', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                ✓ Conciliar — marcar este como pago pelo extrato
              </button>
            </div>
          )
        })}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            onClick={() => onCriarNovoMesmoAssim(conciliando.fingerprint)}
            style={{ padding: '8px 16px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 12, cursor: 'pointer' }}
          >
            + Criar novo lançamento separado
          </button>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 12, cursor: 'pointer' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tipos OFX ───────────────────────────────────────────────────────────────

interface OFXTransacao {
  fitid:    string
  data:     string
  descricao: string
  valor:    number
  tipo:     'C' | 'D'
  banco:    string
  conta:    string
  sugestaoTipo:      'RECEBER' | 'PAGAR'
  sugestaoCategoria: string
}

interface OFXResultado {
  transacoes:    OFXTransacao[]
  total:         number
  totalEntradas: number
  totalSaidas:   number
  banco:         string
  conta:         string
  periodoInicio: string
  periodoFim:    string
}

// ─── Componente OFX ──────────────────────────────────────────────────────────

function OFXPage() {
  const [file,         setFile]         = useState<File | null>(null)
  const [resultado,    setResultado]    = useState<OFXResultado | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [loadingLote,  setLoadingLote]  = useState(false)
  const [erro,         setErro]         = useState('')
  const [sucesso,      setSucesso]      = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [importados,   setImportados]   = useState<Set<string>>(new Set())
  const [potenciais,   setPotenciais]   = useState<Record<string, any[]>>({})    // fitid → matches manuais
  const [conciliando,  setConciliando]  = useState<ConciliandoInfo | null>(null)
  const [contaId,      setContaId]      = useState('')
  const [planos,       setPlanos]       = useState<any[]>([])
  const [planoMap,     setPlanoMap]     = useState<Record<string, number>>({})
  const [contas,       setContas]       = useState<any[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const utils = (trpc as any).useUtils()

  const contasQ      = (trpc as any).fin.conta.list.useQuery()
  const planoQ       = (trpc as any).fin.planoContas.list.useQuery()
  const importarLote = (trpc as any).fin.extrato.importarLote.useMutation()

  useEffect(() => {
    if (contasQ.data) setContas(contasQ.data)
  }, [contasQ.data])

  useEffect(() => {
    if (planoQ.data) {
      setPlanos(planoQ.data)
      // Monta mapa: nome → id para fuzzy match de categoria
      const m: Record<string, number> = {}
      for (const p of planoQ.data) {
        m[p.nome.toLowerCase()] = p.id
      }
      setPlanoMap(m)
    }
  }, [planoQ.data])

  // Fuzzy match: dado o nome sugerido, acha o plano mais próximo cadastrado
  function resolverPlanoId(sugestao: string): number | undefined {
    if (!sugestao) return undefined
    const sg = sugestao.toLowerCase()
    // 1. Match exato
    if (planoMap[sg]) return planoMap[sg]
    // 2. Match parcial
    const chave = Object.keys(planoMap).find(k => k.includes(sg) || sg.includes(k))
    return chave ? planoMap[chave] : undefined
  }

  const processarOFX = async () => {
    if (!file) { setErro('Selecione um arquivo OFX'); return }
    setLoading(true); setErro(''); setSucesso(''); setResultado(null); setSelecionados(new Set()); setImportados(new Set()); setPotenciais({})
    try {
      const token = localStorage.getItem('atomfin_token') || localStorage.getItem('atomtech_token') || ''
      const form = new FormData()
      form.append('ofx', file)
      const resp = await fetch(`${API_BASE}/extrato/parse-ofx`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await resp.json()
      if (!data.ok) throw new Error(data.error || 'Erro ao processar OFX')
      setResultado(data)

      const fitids = data.transacoes.map((t: OFXTransacao) => t.fitid)

      // 1. Verifica quais FITIDs já estão no banco (importados antes)
      const resImp = await utils.fin.extrato.verificarImportados.fetch({ fingerprints: fitids })
      const jaImportados = new Set<string>(resImp?.importados ?? [])
      setImportados(jaImportados)

      // 2. Detecta lançamentos manuais que possam ser duplicatas
      const pendentes = data.transacoes.filter((t: OFXTransacao) => !jaImportados.has(t.fitid))
      const resPot = await utils.fin.extrato.verificarPotenciais.fetch({
        itens: pendentes.map((t: OFXTransacao) => ({
          fingerprint: t.fitid,
          valor:       t.valor,
          data:        t.data,
          tipo:        t.sugestaoTipo,
        })),
      })
      setPotenciais(resPot ?? {})

      // Pré-seleciona pendentes sem potencial duplicata; desseleciona os com potencial (exige revisão manual)
      const comPotencial = new Set(Object.keys(resPot ?? {}))
      setSelecionados(new Set(fitids.filter((f: string) => !jaImportados.has(f) && !comPotencial.has(f))))
    } catch (e: any) {
      setErro(e.message || 'Erro ao processar OFX')
    } finally {
      setLoading(false)
    }
  }

  const importarSelecionados = async () => {
    if (!resultado || selecionados.size === 0) return
    setLoadingLote(true); setSucesso('')
    try {
      const itens = resultado.transacoes
        .filter(t => selecionados.has(t.fitid) && !importados.has(t.fitid))
        .map(t => ({
          tipo:          t.sugestaoTipo,
          descricao:     t.descricao,
          valor:         t.valor,
          data:          t.data,
          fingerprint:   t.fitid,
          planoContasId: resolverPlanoId(t.sugestaoCategoria) ?? undefined,
          salvarComo:    'PAGA' as const,
          formaPagamento: t.tipo === 'C' ? 'pix' : detectarFormaPag(t.descricao),
        }))

      const r = await importarLote.mutateAsync({
        contaId: contaId ? parseInt(contaId) : undefined,
        itens,
      })
      setSucesso(`✓ ${r.criados} lançamento(s) criado(s)${r.ignorados > 0 ? ` · ${r.ignorados} já existiam` : ''}`)
      // Marca os importados agora
      setSelecionados(new Set())
      setImportados(prev => new Set([...prev, ...itens.map(i => i.fingerprint)]))
    } catch (e: any) {
      setErro(e.message || 'Erro ao importar lote')
    } finally {
      setLoadingLote(false)
    }
  }

  const pendentes = resultado ? resultado.transacoes.filter(t => !importados.has(t.fitid)).length : 0

  return (
    <div>
      {/* Cabeçalho OFX */}
      <div style={{
        background: 'linear-gradient(135deg, #0D2040 0%, #091830 100%)',
        border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '20px 24px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#60A5FA', marginBottom: 4 }}>
            ⚡ Conciliação Automática — OFX
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, maxWidth: 500 }}>
            Exporte o extrato como <strong style={{ color: C.text }}>.OFX</strong> pelo app do banco.
            O sistema classifica automaticamente e importa em lote — sem digitar nada.
          </div>
          <div style={{ fontSize: 10, color: '#3A5070', marginTop: 6 }}>
            Inter: App → Extrato → Exportar → OFX &nbsp;·&nbsp; Sicoob: Internet Banking → Extrato → OFX
          </div>
        </div>
        <div style={{
          background: '#60A5FA14', border: '1px solid #60A5FA30',
          borderRadius: 8, padding: '6px 14px',
          fontSize: 10, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.08em',
        }}>
          FITID · Deduplicação 100%
        </div>
      </div>

      {/* Upload OFX */}
      {!resultado && (
        <div style={{
          border: `2px dashed ${C.border}`, borderRadius: 12,
          padding: '32px', textAlign: 'center',
          background: C.bgCard, marginBottom: 20,
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            Selecione o arquivo OFX
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 20 }}>
            Formatos aceitos: .ofx · .qfx
          </div>
          <input
            ref={fileRef} type="file" accept=".ofx,.qfx"
            style={{ display: 'none' }}
            onChange={e => { setFile(e.target.files?.[0] || null); setErro('') }}
          />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Btn variant="ghost" onClick={() => fileRef.current?.click()}>
              📁 Escolher arquivo
            </Btn>
            {file && (
              <Btn variant="primary" onClick={processarOFX} disabled={loading}>
                {loading ? <Spinner size={14} /> : '⚡ Processar OFX'}
              </Btn>
            )}
          </div>
          {file && (
            <div style={{ marginTop: 12, fontSize: 12, color: C.emerald }}>
              📄 {file.name}
            </div>
          )}
          {erro && <Alert type="danger" style={{ marginTop: 16 }}>{erro}</Alert>}
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            <KpiCard label="Transações"     value={resultado.total.toString()}                      color={C.info} />
            <KpiCard label="Total Entradas" value={fmtBRLFull(resultado.totalEntradas)}             color={C.credit} />
            <KpiCard label="Total Saídas"   value={fmtBRLFull(resultado.totalSaidas)}              color={C.debit} />
            <KpiCard label="Já importados"  value={(resultado.total - pendentes).toString()}        color={C.emerald} />
            <KpiCard label="Pendentes"      value={pendentes.toString()}                            color="#60A5FA" />
          </div>

          {sucesso && <Alert type="success" style={{ marginBottom: 16 }}>{sucesso}</Alert>}
          {erro     && <Alert type="danger"  style={{ marginBottom: 16 }}>{erro}</Alert>}

          {/* Aviso de potenciais duplicatas */}
          {Object.keys(potenciais).length > 0 && (
            <div style={{
              background: '#92400E18', border: '1px solid #D97706', borderRadius: 10,
              padding: '10px 16px', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#FBBF24' }}>
                  {Object.keys(potenciais).length} transação(ões) com possível duplicata detectada
                </div>
                <div style={{ fontSize: 11, color: '#D97706', marginTop: 2 }}>
                  Estas foram desmarcadas automaticamente. Revise cada uma e escolha: <strong>Conciliar</strong> (vincula ao lançamento manual existente) ou marque o checkbox para criar um novo lançamento separado.
                </div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 10, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setSelecionados(new Set(resultado.transacoes.filter(t => !importados.has(t.fitid)).map(t => t.fitid)))}
                style={{ fontSize: 11, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
              >
                Selecionar pendentes
              </button>
              <button
                onClick={() => setSelecionados(new Set())}
                style={{ fontSize: 11, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
              >
                Limpar seleção
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, marginRight: 6 }}>Conta bancária</label>
                <select
                  value={contaId} onChange={e => setContaId(e.target.value)}
                  style={{ ...selectStyle, width: 'auto', fontSize: 12, padding: '6px 10px' }}
                >
                  <option value="">Sem vinculação</option>
                  {contas.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <Btn
                variant="primary"
                onClick={importarSelecionados}
                disabled={loadingLote || selecionados.size === 0}
              >
                {loadingLote
                  ? <Spinner size={14} />
                  : `⚡ Importar ${selecionados.size} selecionado(s)`}
              </Btn>
              <Btn variant="ghost" onClick={() => { setResultado(null); setFile(null); setSucesso(''); setErro('') }}>
                ✕ Novo arquivo
              </Btn>
            </div>
          </div>

          {/* Tabela de transações */}
          <div style={{
            background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 12, overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '32px 96px 1fr 140px 120px 110px',
              padding: '8px 16px', background: C.bgMid,
              fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase',
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div />
              <div>Data</div>
              <div>Descrição / Categoria sugerida</div>
              <div>Tipo</div>
              <div style={{ textAlign: 'right' }}>Valor</div>
              <div style={{ textAlign: 'center' }}>Status</div>
            </div>

            <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              {resultado.transacoes.map(tx => {
                const jaImportado  = importados.has(tx.fitid)
                const selecionado  = selecionados.has(tx.fitid)
                const temPotencial = !jaImportado && (potenciais[tx.fitid]?.length ?? 0) > 0
                const cor = tx.tipo === 'C' ? C.credit : C.debit

                return (
                  <div key={tx.fitid} style={{
                    display: 'grid', gridTemplateColumns: '32px 96px 1fr 140px 120px 110px',
                    padding: '9px 16px', borderBottom: `1px solid ${C.border}50`,
                    alignItems: 'center',
                    background: jaImportado  ? C.emerald + '08'
                              : temPotencial ? '#D9770610'
                              : selecionado  ? '#60A5FA08'
                              : 'transparent',
                    borderLeft: temPotencial ? '3px solid #D97706' : '3px solid transparent',
                    opacity: jaImportado ? 0.55 : 1,
                    transition: 'background 0.1s',
                  }}>
                    {/* Checkbox ou ícone de alerta */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {jaImportado ? null : temPotencial ? (
                        <span title="Possível duplicata — revise antes de importar" style={{ fontSize: 14, cursor: 'default' }}>⚠️</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={selecionado}
                          onChange={e => {
                            setSelecionados(prev => {
                              const n = new Set(prev)
                              e.target.checked ? n.add(tx.fitid) : n.delete(tx.fitid)
                              return n
                            })
                          }}
                          style={{ cursor: 'pointer', accentColor: '#60A5FA' }}
                        />
                      )}
                    </div>

                    {/* Data */}
                    <div style={{ fontSize: 12, color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDataBR(tx.data)}
                    </div>

                    {/* Descrição + categoria + aviso de duplicata */}
                    <div style={{ overflow: 'hidden', paddingRight: 8 }}>
                      <div style={{ fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.descricao}>
                        {tx.descricao}
                      </div>
                      {temPotencial ? (
                        <div style={{ fontSize: 10, color: '#FBBF24', marginTop: 2 }}>
                          ⚠ Lançamento manual com mesmo valor encontrado: "{potenciais[tx.fitid][0]?.descricao}"
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: '#60A5FA99', marginTop: 1 }}>
                          📂 {tx.sugestaoCategoria}
                        </div>
                      )}
                    </div>

                    {/* Tipo sugerido */}
                    <div>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 10,
                        background: cor + '18', color: cor,
                      }}>
                        {tx.tipo === 'C' ? '↓ Receber' : '↑ Pagar'}
                      </span>
                    </div>

                    {/* Valor */}
                    <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: cor, fontVariantNumeric: 'tabular-nums' }}>
                      {tx.tipo === 'D' ? '- ' : '+ '}{fmtBRLFull(tx.valor)}
                    </div>

                    {/* Status / Ação */}
                    <div style={{ textAlign: 'center' }}>
                      {jaImportado ? (
                        <span style={{ fontSize: 11, color: C.emerald, fontWeight: 700 }}>✓ Importado</span>
                      ) : temPotencial ? (
                        <button
                          onClick={() => setConciliando({
                            fingerprint: tx.fitid, descricao: tx.descricao, data: tx.data,
                            valor: tx.valor, tipo: tx.tipo, matches: potenciais[tx.fitid],
                          })}
                          style={{
                            fontSize: 10, fontWeight: 700, cursor: 'pointer',
                            padding: '3px 8px', borderRadius: 6,
                            background: '#D9770618', border: '1px solid #D97706',
                            color: '#FBBF24',
                          }}
                        >
                          ⇌ Conciliar
                        </button>
                      ) : selecionado ? (
                        <span style={{ fontSize: 11, color: '#60A5FA', fontWeight: 600 }}>☑ Selecionado</span>
                      ) : (
                        <span style={{ fontSize: 11, color: C.textDim }}>— Ignorar</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Modal de Conciliação ──────────────────────────────────────────── */}
      <ModalConciliar
        conciliando={conciliando}
        contas={contas}
        contaIdDefault={contaId}
        onClose={() => setConciliando(null)}
        onConciliado={(fp) => {
          setImportados(prev => new Set([...prev, fp]))
          setPotenciais(prev => { const n = { ...prev }; delete n[fp]; return n })
          setSucesso('✓ Lançamento conciliado com sucesso')
          setConciliando(null)
        }}
        onCriarNovoMesmoAssim={(fp) => {
          setSelecionados(prev => new Set([...prev, fp]))
          setPotenciais(prev => { const n = { ...prev }; delete n[fp]; return n })
          setConciliando(null)
        }}
      />
    </div>
  )
}

// ─── Componente Principal ────────────────────────────────────────────────────

export function ExtratoPage() {
  const [aba,        setAba]        = useState<'PDF' | 'OFX'>('OFX')
  const [banco,      setBanco]      = useState<'INTER' | 'SICOOB'>('INTER')
  const [file,       setFile]       = useState<File | null>(null)
  const [resultado,  setResultado]  = useState<ParseResult | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [erro,       setErro]       = useState('')
  const [filtro,     setFiltro]     = useState<'TODOS' | 'C' | 'D'>('TODOS')
  const [busca,      setBusca]      = useState('')
  const [txModal,    setTxModal]    = useState<ExtratoTransacao | null>(null)
  const [txModalFp,  setTxModalFp]  = useState<string>('')
  const [importados, setImportados] = useState<Set<string>>(new Set())  // fingerprints
  const [restorado,  setRestorado]  = useState(false)  // veio do localStorage
  const [potenciais, setPotenciais] = useState<Record<string, any[]>>({})   // fingerprint → matches manuais
  const [conciliando, setConciliando] = useState<ConciliandoInfo | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const contasQ  = (trpc as any).fin.conta.list.useQuery()
  const planoQ   = (trpc as any).fin.planoContas.list.useQuery()
  const centroQ  = (trpc as any).fin.centroCusto.list.useQuery()
  const pessoaQ  = (trpc as any).fin.pessoa.list.useQuery()
  const utils    = (trpc as any).useUtils()

  const contas   = contasQ.data  ?? []
  const planos   = planoQ.data   ?? []
  const centros  = centroQ.data  ?? []
  const pessoas  = pessoaQ.data  ?? []

  // ── Detecta lançamentos manuais que possam ser a mesma transação (evita duplicidade) ──
  async function carregarPotenciais(transacoes: ExtratoTransacao[], jaImportadas: Set<string>) {
    try {
      const pendentes = transacoes.filter(t => !jaImportadas.has(gerarFingerprint(t)))
      if (pendentes.length === 0) { setPotenciais({}); return }
      const resPot = await utils.fin.extrato.verificarPotenciais.fetch({
        itens: pendentes.map(t => ({
          fingerprint: gerarFingerprint(t),
          valor:       t.valor,
          data:        t.data,
          tipo:        t.tipo === 'C' ? 'RECEBER' : 'PAGAR',
        })),
      })
      setPotenciais(resPot ?? {})
    } catch { /* não bloqueia o fluxo principal */ }
  }

  // ── Restaurar extrato do localStorage e verificar importados no banco ───────
  useEffect(() => {
    async function restaurar() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const { banco: b, resultado: r, timestamp } = JSON.parse(saved)
          if (Date.now() - timestamp < MAX_AGE_MS) {
            setBanco(b)
            setResultado(r)
            setRestorado(true)
            // Consulta o banco para saber quais já foram importados (cross-device)
            const fps = (r as ParseResult).transacoes.map(gerarFingerprint)
            const res = await utils.fin.extrato.verificarImportados.fetch({ fingerprints: fps })
            const jaImportadas = new Set<string>(res?.importados ?? [])
            if (jaImportadas.size) setImportados(jaImportadas)
            carregarPotenciais((r as ParseResult).transacoes, jaImportadas)
          } else {
            localStorage.removeItem(STORAGE_KEY)
            localStorage.removeItem(STORAGE_IMP)
          }
        }
      } catch { /* ignora erro de parse */ }
    }
    restaurar()
  }, [])  // eslint-disable-line

  // ── Salvar extrato no localStorage quando muda ─────────────────────────────
  useEffect(() => {
    if (resultado) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ banco, resultado, timestamp: Date.now() }))
    }
  }, [resultado, banco])

  const limparExtrato = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_IMP)
    setResultado(null)
    setImportados(new Set())
    setPotenciais({})
    setConciliando(null)
    setFile(null)
    setErro('')
    setRestorado(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const processarPDF = async () => {
    if (!file) { setErro('Selecione um arquivo PDF'); return }
    // Confirmação do banco selecionado antes de processar
    const nomeBanco = banco === 'INTER' ? 'Banco Inter' : 'Sicoob'
    const confirmado = window.confirm(
      `Confirmar processamento?\n\n` +
      `📄 Arquivo: ${file.name}\n` +
      `🏦 Banco selecionado: ${nomeBanco}\n\n` +
      `Se o banco estiver errado, clique em Cancelar e corrija antes de processar.`
    )
    if (!confirmado) return
    setLoading(true); setErro(''); setResultado(null); setImportados(new Set()); setPotenciais({}); setRestorado(false)
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
      // Consulta o banco: quais transações deste extrato já foram importadas?
      // Funciona mesmo em outro computador — a fonte de verdade é o banco.
      try {
        const fps = (data as ParseResult).transacoes.map(gerarFingerprint)
        const res = await utils.fin.extrato.verificarImportados.fetch({ fingerprints: fps })
        const jaImportadas = new Set<string>(res?.importados ?? [])
        if (jaImportadas.size) setImportados(jaImportadas)
        // Detecta lançamentos manuais que possam ser a mesma transação
        await carregarPotenciais((data as ParseResult).transacoes, jaImportadas)
      } catch { /* não bloqueia o fluxo principal */ }
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
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: C.text, fontSize: 18, fontWeight: 800, margin: 0 }}>
            Extrato Bancário
          </h2>
          <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0' }}>
            Importe extratos e concilie lançamentos automaticamente
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

      {/* ── Abas PDF / OFX ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        {([
          { id: 'OFX', label: '⚡ OFX · Automático', desc: 'Recomendado' },
          { id: 'PDF', label: '📄 PDF · Manual',     desc: 'Inter / Sicoob' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id)}
            style={{
              padding: '9px 18px', border: 'none', background: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: aba === tab.id ? 700 : 400,
              color: aba === tab.id ? C.emerald : C.textMuted,
              borderBottom: aba === tab.id ? `2px solid ${C.emerald}` : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}
          >
            {tab.label}
            {tab.id === 'OFX' && (
              <span style={{ marginLeft: 6, fontSize: 9, background: '#60A5FA22', color: '#60A5FA', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                NOVO
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Aba OFX */}
      {aba === 'OFX' && <OFXPage />}

      {/* Aba PDF */}
      {aba === 'PDF' && <>

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
                const fp = gerarFingerprint(tx)
                const importado = importados.has(fp)
                const temPotencial = !importado && (potenciais[fp]?.length ?? 0) > 0
                const cor = tx.tipo === 'C' ? C.credit : C.debit
                const idx = resultado.transacoes.indexOf(tx)
                return (
                  <div key={idx} style={{
                    display: 'grid', gridTemplateColumns: '96px 1fr 90px 130px 112px',
                    padding: '10px 18px', borderBottom: `1px solid ${C.border}50`,
                    alignItems: 'center', transition: 'background 0.1s',
                    background: importado ? C.emerald + '08' : temPotencial ? '#D9770610' : 'transparent',
                    borderLeft: temPotencial ? '3px solid #D97706' : '3px solid transparent',
                    opacity: importado ? 0.6 : 1,
                  }}
                    onMouseEnter={e => !importado && ((e.currentTarget as HTMLDivElement).style.background = C.bgHover + '60')}
                    onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = importado ? C.emerald + '08' : temPotencial ? '#D9770610' : 'transparent')}
                  >
                    <div style={{ fontSize: 12, color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDataBR(tx.data)}
                    </div>
                    <div style={{ overflow: 'hidden', paddingRight: 10 }}>
                      <div style={{ fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.descricao}>
                        {tx.descricao}
                      </div>
                      {temPotencial && (
                        <div style={{ fontSize: 10, color: '#FBBF24', marginTop: 2 }}>
                          ⚠ Possível duplicata: "{potenciais[fp][0]?.descricao}"
                        </div>
                      )}
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
                      ) : temPotencial ? (
                        <button
                          onClick={() => setConciliando({
                            fingerprint: fp, descricao: tx.descricao, data: tx.data,
                            valor: tx.valor, tipo: tx.tipo, matches: potenciais[fp],
                          })}
                          style={{
                            fontSize: 10, fontWeight: 700, cursor: 'pointer',
                            padding: '4px 10px', borderRadius: 6,
                            background: '#D9770618', border: '1px solid #D97706',
                            color: '#FBBF24', fontFamily: 'inherit',
                          }}
                        >
                          ⇌ Conciliar
                        </button>
                      ) : (
                        <button
                          onClick={() => { setTxModal(tx); setTxModalFp(fp) }}
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

      </>} {/* fim aba PDF */}

      {/* ── Modal Importar ───────────────────────────────────────────── */}
      <ModalImportar
        tx={txModal}
        fingerprint={txModalFp}
        contas={contas} planos={planos} centros={centros} pessoas={pessoas}
        onClose={() => setTxModal(null)}
        onSuccess={() => {
          // Marca como importado usando o fingerprint (persiste cross-device via banco)
          if (txModalFp) setImportados(prev => new Set([...prev, txModalFp]))
          setTxModal(null)
        }}
      />

      {/* ── Modal Conciliar (possível duplicata) ───────────────────────── */}
      <ModalConciliar
        conciliando={conciliando}
        contas={contas}
        onClose={() => setConciliando(null)}
        onConciliado={(fp) => {
          setImportados(prev => new Set([...prev, fp]))
          setPotenciais(prev => { const n = { ...prev }; delete n[fp]; return n })
          setConciliando(null)
        }}
        onCriarNovoMesmoAssim={(fp) => {
          setPotenciais(prev => { const n = { ...prev }; delete n[fp]; return n })
          setConciliando(null)
        }}
      />
    </PageWrapper>
  )
}
