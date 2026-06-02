// ═══════════════════════════════════════════════════════════════════
// Página de Lançamentos — A Pagar / A Receber / Transferências / Extrato
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import { trpc } from '../lib/trpc'
import {
  PageWrapper, C, Btn, KpiCard, Table, Modal, Tabs,
  Input, InputMoeda, Select, Textarea, FormRow, Spinner, Alert,
} from '../components/ui'

// ─── CADASTRO RÁPIDO DE PESSOA (inline no modal de edição) ────────────────────
function CadastroRapidoInline({
  nomeInicial,
  tipo,
  onConfirmar,
  onCancelar,
}: {
  nomeInicial: string
  tipo: 'PAGAR' | 'RECEBER'
  onConfirmar: (pessoaId: number, pessoaNome: string) => void
  onCancelar: () => void
}) {
  const [nome,       setNome]       = useState(nomeInicial)
  const [cpfCnpj,   setCpfCnpj]    = useState('')
  const [tipoPessoa, setTipoPessoa] = useState<'FISICA' | 'JURIDICA'>('JURIDICA')
  const [papel,      setPapel]      = useState<'CLIENTE' | 'FORNECEDOR' | 'AMBOS'>(
    tipo === 'RECEBER' ? 'CLIENTE' : 'FORNECEDOR'
  )
  const [erro,   setErro]   = useState('')
  const criarPessoa = (trpc as any).fin.pessoa.create.useMutation({
    onSuccess: (data: any) => { onConfirmar(data.id, nome.trim()) },
    onError:   (e: any)    => setErro(e.message ?? 'Erro ao criar'),
  })

  const handleSalvar = () => {
    if (!nome.trim()) { setErro('Informe o nome'); return }
    criarPessoa.mutate({
      tipoPessoa,
      nome:         nome.trim(),
      cpfCnpj:      cpfCnpj.trim() || undefined,
      isCliente:    papel === 'CLIENTE'    || papel === 'AMBOS',
      isFornecedor: papel === 'FORNECEDOR' || papel === 'AMBOS',
    })
  }

  const inputSt = {
    width: '100%', boxSizing: 'border-box' as const,
    background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 7, padding: '7px 10px',
    color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit',
  }
  const selSt = { ...inputSt, cursor: 'pointer' }

  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.emerald}40`,
      borderRadius: 10, padding: 14, marginTop: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.emerald, marginBottom: 10 }}>
        ＋ Cadastro Rápido — será salvo ao clicar em Confirmar
      </div>
      {erro && <Alert type="danger" style={{ marginBottom: 8 }}>{erro}</Alert>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, display: 'block', marginBottom: 4 }}>Nome *</label>
          <input value={nome} onChange={e => setNome(e.target.value)} style={inputSt} autoFocus placeholder="Nome completo / Razão Social" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, display: 'block', marginBottom: 4 }}>Tipo</label>
            <select value={tipoPessoa} onChange={e => setTipoPessoa(e.target.value as any)} style={selSt}>
              <option value="JURIDICA">Jurídica (empresa)</option>
              <option value="FISICA">Física (CPF)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, display: 'block', marginBottom: 4 }}>Papel</label>
            <select value={papel} onChange={e => setPapel(e.target.value as any)} style={selSt}>
              <option value="CLIENTE">Cliente</option>
              <option value="FORNECEDOR">Fornecedor / Prestador</option>
              <option value="AMBOS">Ambos</option>
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, display: 'block', marginBottom: 4 }}>CPF / CNPJ (opcional)</label>
          <input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} style={inputSt} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <Btn variant="ghost" onClick={onCancelar}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSalvar} disabled={criarPessoa.isLoading}>
            {criarPessoa.isLoading ? <Spinner size={13} /> : '✓ Confirmar cadastro'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
import { parseMoeda, fmtBRLFull, maskMoeda } from '../lib/masks'
import { fmtData } from '../lib/utils'
import { gerarComprovantePdf } from '../lib/gerarComprovantePdf'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const hoje = () => new Date().toISOString().slice(0, 10)
const mesAtualIni = () => hoje().slice(0, 7) + '-01'

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, [string, string, string]> = {
    ABERTA:    ['#1E3A5F', '#60A5FA', 'Em Aberto'],
    VENCIDA:   ['#451A03', '#F97316', 'Vencida'],
    PAGA:      ['#064E3B', '#34D399', 'Pago'],
    CANCELADA: ['#1F2937', '#9CA3AF', 'Cancelado'],
  }
  const [bg, color, label] = map[s] ?? ['#1F2937', '#9CA3AF', s]
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 600,
      background: bg, color, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function gerarParcelas(qtd: number, valor: number, primeiroVenc: string) {
  const valorBase = Math.floor(valor * 100 / qtd) / 100
  let acumulado = 0
  return Array.from({ length: qtd }, (_, i) => {
    const isLast = i === qtd - 1
    const v = isLast ? Math.round((valor - acumulado) * 100) / 100 : valorBase
    acumulado += v
    const d = new Date(primeiroVenc + 'T12:00:00')
    d.setMonth(d.getMonth() + i)
    return { numero: i + 1, valor: v, vencimento: d.toISOString().slice(0, 10) }
  })
}

const FORMAS_PAGAMENTO = [
  { value: '',        label: '— Selecione —'          },
  { value: 'dinheiro',  label: '💵 Dinheiro'            },
  { value: 'pix',       label: '⚡ PIX'                 },
  { value: 'ted_doc',   label: '🏦 TED / DOC'           },
  { value: 'boleto',    label: '📋 Boleto'              },
  { value: 'debito',    label: '💳 Cartão de Débito'    },
  { value: 'credito',   label: '💳 Cartão de Crédito'  },
  { value: 'cheque',    label: '📄 Cheque'              },
]

const LABELS_FORMA: Record<string, string> = {
  dinheiro: '💵 Dinheiro',
  pix:      '⚡ PIX',
  ted_doc:  '🏦 TED/DOC',
  boleto:   '📋 Boleto',
  debito:   '💳 Débito',
  credito:  '💳 Crédito',
  cheque:   '📄 Cheque',
}

function agendamentoKey(parcelaId: number) { return `atomtech_agendamento_${parcelaId}` }
function salvarAgLocal(parcelaId: number, dados: any) {
  try { localStorage.setItem(agendamentoKey(parcelaId), JSON.stringify(dados)) } catch {}
}
function carregarAgLocal(parcelaId: number) {
  try {
    const s = localStorage.getItem(agendamentoKey(parcelaId))
    return s ? JSON.parse(s) : null
  } catch { return null }
}

// ─── MODAL EDITAR LANÇAMENTO ──────────────────────────────────────────────────

function ModalEditarLancamento({
  tituloId,
  tipo,
  onClose,
  onSuccess,
}: {
  tituloId:  number
  tipo:      'PAGAR' | 'RECEBER'
  onClose:   () => void
  onSuccess: () => void
}) {
  const { data: byId, isLoading } = (trpc as any).fin.titulo.byId.useQuery({ tituloId }, { staleTime: 0 })
  const { data: pessoas      = [] } = (trpc as any).fin.pessoa.list.useQuery()
  const { data: planosContas = [] } = (trpc as any).fin.planoContas.list.useQuery()
  const { data: centrosCusto = [] } = (trpc as any).fin.centroCusto.list.useQuery()

  const [form, setForm] = useState<any>(null)
  const [parcelas, setParcelas] = useState<any[]>([])
  const [erro, setErro] = useState('')
  const [mostraCadastro, setMostraCadastro] = useState(false)
  const utils = (trpc as any).useUtils()

  // Preenche form quando dados chegam
  useMemo(() => {
    if (!byId || form) return
    const t = byId.titulo
    setForm({
      descricao:     t.descricao     ?? '',
      documento:     t.documento     ?? '',
      pessoaId:      t.pessoaId      ? String(t.pessoaId)      : '',
      planoContasId: t.planoContasId ? String(t.planoContasId) : '',
      centroCustoId: t.centroCustoId ? String(t.centroCustoId) : '',
      emissao:       t.emissao       ? String(t.emissao).slice(0, 10) : hoje(),
      observacoes:   t.observacoes   ?? '',
    })
    setParcelas(byId.parcelas.map((p: any) => ({
      parcelaId:  p.id,
      numero:     p.numero,
      valor:      maskMoeda(Number(p.valor)),
      vencimento: String(p.vencimento).slice(0, 10),
      status:     p.status,
    })))
  }, [byId])

  const update = (trpc as any).fin.titulo.update.useMutation({
    onSuccess: () => { onSuccess(); onClose() },
    onError:   (e: any) => setErro(e.message ?? 'Erro ao salvar'),
  })

  function adicionarParcela() {
    const ultimo = parcelas[parcelas.length - 1]
    const proximoVenc = ultimo?.vencimento
      ? (() => {
          const d = new Date(ultimo.vencimento + 'T12:00:00')
          d.setMonth(d.getMonth() + 1)
          return d.toISOString().slice(0, 10)
        })()
      : hoje()
    const proximoNum = (parcelas[parcelas.length - 1]?.numero ?? 0) + 1
    setParcelas(prev => [...prev, {
      parcelaId:  undefined,   // nova parcela — sem ID
      numero:     proximoNum,
      valor:      '',
      vencimento: proximoVenc,
      status:     'ABERTA',
      isNova:     true,
    }])
  }

  function removerNovaParcela(i: number) {
    setParcelas(prev => prev.filter((_, j) => j !== i))
  }

  function salvar() {
    setErro('')
    if (!form?.descricao?.trim()) return setErro('Descrição é obrigatória')

    let hasError = false
    const parcelasPayload = parcelas
      .filter(p => p.status === 'ABERTA' || p.isNova)
      .map(p => {
        const v = parseMoeda(p.valor)
        if (v <= 0) { setErro(`Valor inválido na parcela ${p.numero}`); hasError = true; return null }
        if (!p.vencimento) { setErro(`Vencimento obrigatório na parcela ${p.numero}`); hasError = true; return null }
        return p.parcelaId !== undefined
          ? { parcelaId: p.parcelaId, valor: v, vencimento: p.vencimento }
          : { valor: v, vencimento: p.vencimento }   // nova parcela sem parcelaId
      })
    if (hasError || parcelasPayload.some(p => p === null)) return

    update.mutate({
      tituloId:      tituloId,
      descricao:     form.descricao.trim(),
      documento:     form.documento  || undefined,
      pessoaId:      form.pessoaId      ? parseInt(form.pessoaId)      : undefined,
      planoContasId: form.planoContasId ? parseInt(form.planoContasId) : undefined,
      centroCustoId: form.centroCustoId ? parseInt(form.centroCustoId) : undefined,
      observacoes:   form.observacoes   || undefined,
      emissao:       form.emissao,
      parcelas:      parcelasPayload.filter(Boolean) as any,
    })
  }

  // No contexto de edição/vinculação mostramos TODAS as pessoas (sem filtrar por papel)
  // O filtro por isFornecedor/isCliente fica apenas na criação de novos lançamentos
  const pessoasFiltradas = pessoas
  const planosFiltrados  = planosContas.filter((p: any) => p.tipo === (tipo === 'PAGAR' ? 'DESPESA' : 'RECEITA') || p.tipo === 'FINANCEIRO')
  const label = tipo === 'PAGAR' ? 'Pagar' : 'Receber'

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`✏ Editar Conta a ${label}`}
      width={640}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={isLoading || update.isLoading || !form} onClick={salvar}>
            {update.isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Btn>
        </>
      }
    >
      {isLoading || !form ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
      ) : (
        <>
          {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}

          {/* Campos do título */}
          <FormRow>
            <Input label="Descrição *" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            <Input label="Documento / NF" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} />
          </FormRow>

          <FormRow>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                  {tipo === 'PAGAR' ? 'Fornecedor / Prestador' : 'Cliente'}
                </label>
                {!mostraCadastro && (
                  <button
                    onClick={() => setMostraCadastro(true)}
                    style={{ fontSize: 10, color: C.emerald, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                  >
                    + Novo cadastro
                  </button>
                )}
              </div>
              <Select
                label=""
                value={form.pessoaId}
                onChange={e => { setForm({ ...form, pessoaId: e.target.value }); setMostraCadastro(false) }}
                placeholder="— Nenhum —"
                options={pessoasFiltradas.map((p: any) => ({ value: String(p.id), label: p.nome }))}
              />
              {mostraCadastro && (
                <CadastroRapidoInline
                  nomeInicial=""
                  tipo={tipo}
                  onConfirmar={(id, nome) => {
                    setForm({ ...form, pessoaId: String(id) })
                    setMostraCadastro(false)
                    utils.fin.pessoa.list.invalidate()
                  }}
                  onCancelar={() => setMostraCadastro(false)}
                />
              )}
            </div>
            <Select
              label="Plano de Contas"
              value={form.planoContasId}
              onChange={e => setForm({ ...form, planoContasId: e.target.value })}
              placeholder="— Nenhum —"
              options={planosFiltrados.map((p: any) => ({ value: String(p.id), label: `${p.codigo} — ${p.nome}` }))}
            />
          </FormRow>

          <FormRow>
            <Select
              label="Centro de Custo"
              value={form.centroCustoId}
              onChange={e => setForm({ ...form, centroCustoId: e.target.value })}
              placeholder="— Nenhum —"
              options={centrosCusto.map((c: any) => ({ value: String(c.id), label: `${c.codigo} — ${c.nome}` }))}
            />
            <Input label="Data de Emissão" type="date" value={form.emissao} onChange={e => setForm({ ...form, emissao: e.target.value })} />
          </FormRow>

          <div style={{ marginBottom: 16 }}>
            <Textarea
              label="Observações"
              value={form.observacoes}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
              style={{ minHeight: 60 }}
            />
          </div>

          {/* Parcelas */}
          <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                Parcelas
              </p>
              <Btn size="sm" variant="ghost" onClick={adicionarParcela}>+ Adicionar Parcela</Btn>
            </div>

            {parcelas.map((p, i) => {
              const isPaga = p.status !== 'ABERTA' && !p.isNova
              return (
                <div key={p.parcelaId ?? `nova-${i}`} style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr 1fr auto',
                  gap: 8, alignItems: 'flex-end', marginBottom: 8,
                  opacity: isPaga ? 0.6 : 1,
                }}>
                  {/* Número */}
                  <div style={{ paddingBottom: 8, color: p.isNova ? C.success : C.textMuted, fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                    {p.numero}
                  </div>

                  {/* Valor */}
                  {isPaga ? (
                    <div>
                      <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Valor</div>
                      <div style={{ padding: '8px 12px', background: C.bg, borderRadius: 6, border: '1px solid ' + C.border, fontSize: 13, color: C.textMuted }}>
                        {maskMoeda(Number(parseMoeda(p.valor)))}
                      </div>
                    </div>
                  ) : (
                    <InputMoeda
                      label={p.isNova ? 'Valor * (nova)' : 'Valor *'}
                      value={p.valor}
                      onChange={v => setParcelas(prev => prev.map((x, j) => j === i ? { ...x, valor: v } : x))}
                    />
                  )}

                  {/* Vencimento */}
                  {isPaga ? (
                    <div>
                      <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Vencimento</div>
                      <div style={{ padding: '8px 12px', background: C.bg, borderRadius: 6, border: '1px solid ' + C.border, fontSize: 13, color: C.textMuted }}>
                        {fmtData(p.vencimento)}
                      </div>
                    </div>
                  ) : (
                    <Input
                      label={p.isNova ? 'Vencimento * (nova)' : 'Vencimento *'}
                      type="date"
                      value={p.vencimento}
                      onChange={e => setParcelas(prev => prev.map((x, j) => j === i ? { ...x, vencimento: e.target.value } : x))}
                    />
                  )}

                  {/* Badge ou botão remover */}
                  <div style={{ paddingBottom: 8 }}>
                    {p.isNova ? (
                      <Btn size="sm" variant="danger" onClick={() => removerNovaParcela(i)} title="Remover parcela">✕</Btn>
                    ) : (
                      <StatusBadge s={isPaga ? p.status : 'ABERTA'} />
                    )}
                  </div>
                </div>
              )
            })}

            {parcelas.some(p => p.status !== 'ABERTA' && !p.isNova) && (
              <p style={{ color: C.textMuted, fontSize: 11, margin: '8px 0 0' }}>
                🔒 Parcelas pagas/canceladas não podem ser alteradas.
              </p>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── MODAL EDITAR TRANSFERÊNCIA ────────────────────────────────────────────────

function ModalEditarTransferencia({
  transferencia,
  contas,
  onClose,
  onSuccess,
}: {
  transferencia: any
  contas:        any[]
  onClose:       () => void
  onSuccess:     () => void
}) {
  const [form, setForm] = useState({
    contaOrigemId:  String(transferencia.contaOrigemId),
    contaDestinoId: String(transferencia.contaDestinoId),
    valor:          maskMoeda(Number(transferencia.valor)),
    data:           String(transferencia.data).slice(0, 10),
    descricao:      transferencia.descricao ?? '',
  })
  const [erro, setErro] = useState('')

  const update = (trpc as any).fin.transferencia.update.useMutation({
    onSuccess: () => { onSuccess(); onClose() },
    onError:   (e: any) => setErro(e.message ?? 'Erro ao salvar'),
  })

  function salvar() {
    setErro('')
    if (!form.contaOrigemId)  return setErro('Selecione a conta de origem')
    if (!form.contaDestinoId) return setErro('Selecione a conta de destino')
    if (form.contaOrigemId === form.contaDestinoId) return setErro('Origem e destino devem ser diferentes')
    const valor = parseMoeda(form.valor)
    if (valor <= 0) return setErro('Valor deve ser maior que zero')

    update.mutate({
      id:             transferencia.id,
      contaOrigemId:  parseInt(form.contaOrigemId),
      contaDestinoId: parseInt(form.contaDestinoId),
      valor,
      data:      form.data,
      descricao: form.descricao.trim() || undefined,
    })
  }

  const contaOptions = contas.map((c: any) => ({ value: String(c.id), label: c.nome }))

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="✏ Editar Transferência"
      width={460}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={update.isLoading} onClick={salvar}>
            {update.isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Btn>
        </>
      }
    >
      {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}

      <FormRow cols={1}>
        <Select
          label="Conta de Origem (débito) *"
          value={form.contaOrigemId}
          onChange={e => setForm({ ...form, contaOrigemId: e.target.value })}
          placeholder="— De qual conta —"
          options={contaOptions}
        />
      </FormRow>
      <FormRow cols={1}>
        <Select
          label="Conta de Destino (crédito) *"
          value={form.contaDestinoId}
          onChange={e => setForm({ ...form, contaDestinoId: e.target.value })}
          placeholder="— Para qual conta —"
          options={contaOptions.filter(o => o.value !== form.contaOrigemId)}
        />
      </FormRow>
      <FormRow>
        <InputMoeda label="Valor *" value={form.valor} onChange={v => setForm({ ...form, valor: v })} />
        <Input label="Data *" type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
      </FormRow>
      <FormRow cols={1}>
        <Input
          label="Descrição"
          value={form.descricao}
          onChange={e => setForm({ ...form, descricao: e.target.value })}
          placeholder="Motivo da transferência (opcional)"
        />
      </FormRow>
    </Modal>
  )
}

// ─── MODAL COMPROVANTE ─────────────────────────────────────────────────────────

function ModalComprovante({
  tituloId,
  parcelaAtual,
  onClose,
}: {
  tituloId:     number
  parcelaAtual: any
  onClose:      () => void
}) {
  const parcelaId = parcelaAtual?.parcelaId

  const agSalvo = parcelaId ? carregarAgLocal(parcelaId) : null
  const [ag, setAg] = useState({
    dataAgendada:    agSalvo?.dataAgendada    ?? '',
    horaAgendada:    agSalvo?.horaAgendada    ?? '',
    tecnico:         agSalvo?.tecnico         ?? '',
    enderecoServico: agSalvo?.enderecoServico ?? '',
    observacoes:     agSalvo?.observacoes     ?? '',
  })
  const [comAgendamento, setComAgendamento] = useState(!!(agSalvo && Object.values(agSalvo).some(v => v)))
  const [salvou, setSalvou] = useState(false)

  const { data: byId,    isLoading: l1 } = (trpc as any).fin.titulo.byId.useQuery({ tituloId })
  const { data: empresa, isLoading: l2 } = (trpc as any).fin.empresa.minha.useQuery()

  const isLoading = l1 || l2
  const tipo      = parcelaAtual?.tipo ?? byId?.titulo?.tipo ?? 'PAGAR'
  const titleLabel = tipo === 'PAGAR' ? 'Solicitação de Pagamento' : 'Cobrança / Recebimento'

  function salvarDados() {
    if (!parcelaId) return
    salvarAgLocal(parcelaId, comAgendamento ? ag : null)
    setSalvou(true)
    setTimeout(() => setSalvou(false), 2000)
  }

  function imprimir() {
    if (!byId || !empresa) return
    if (parcelaId) salvarAgLocal(parcelaId, comAgendamento ? ag : null)
    gerarComprovantePdf({
      tipo:     byId.titulo.tipo,
      empresa,
      titulo:   byId.titulo,
      parcelas: byId.parcelas,
      parcelaAtual: byId.titulo.tipo === 'PAGAR' ? {
        id:            parcelaAtual.parcelaId,
        numero:        parcelaAtual.numero,
        valor:         parcelaAtual.valor,
        vencimento:    parcelaAtual.vencimento,
        status:        parcelaAtual.statusDisplay ?? parcelaAtual.status,
        dataPagamento: parcelaAtual.dataPagamento,
        valorPago:     parcelaAtual.valorPago,
      } : undefined,
      agendamento: comAgendamento ? ag : null,
    })
  }

  const labelInput: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: '#64748B',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: 4,
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '7px 10px',
    background: '#0D1C17', border: '1px solid #1E3A2E',
    borderRadius: 7, color: '#E2E8F0', fontSize: 13,
    fontFamily: 'inherit', outline: 'none',
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`🖨 ${titleLabel}`}
      width={600}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
          <Btn
            variant="ghost"
            onClick={salvarDados}
            style={{ borderColor: C.info + '60', color: salvou ? C.success : C.info }}
          >
            {salvou ? '✓ Dados salvos!' : '💾 Salvar Dados'}
          </Btn>
          <Btn disabled={isLoading} onClick={imprimir}>
            {isLoading ? 'Carregando...' : '🖨 Gerar PDF'}
          </Btn>
        </>
      }
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
      ) : (
        <>
          {/* Resumo */}
          <div style={{ background: C.bg, borderRadius: 8, border: '1px solid ' + C.border, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ margin: 0, color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {titleLabel}
            </p>
            <p style={{ margin: '4px 0 0', color: C.text, fontSize: 14, fontWeight: 600 }}>
              {byId?.titulo?.descricao}
            </p>
            <p style={{ margin: '4px 0 0', color: C.textMuted, fontSize: 12 }}>
              {byId?.titulo?.pessoaNome && <span>{byId.titulo.pessoaNome} &nbsp;·&nbsp; </span>}
              {byId?.parcelas?.length ?? 0} parcela(s)
              {tipo === 'PAGAR' && parcelaAtual && (
                <> &nbsp;·&nbsp; Parcela {parcelaAtual.numero} — {fmtData(parcelaAtual.vencimento)} — {fmtBRLFull(Number(parcelaAtual.valor))}</>
              )}
            </p>
            {agSalvo && <p style={{ margin: '6px 0 0', color: C.success, fontSize: 11 }}>✓ Dados de agendamento salvos localmente</p>}
          </div>

          {/* Toggle agendamento */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8,
            background: comAgendamento ? '#10B98114' : C.bgMid,
            border: '1px solid ' + (comAgendamento ? '#10B98140' : C.border),
            marginBottom: 14, cursor: 'pointer',
          }} onClick={() => setComAgendamento(!comAgendamento)}>
            <div style={{
              width: 18, height: 18, borderRadius: 4,
              border: '2px solid ' + (comAgendamento ? '#10B981' : C.border),
              background: comAgendamento ? '#10B981' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {comAgendamento && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Incluir dados de agendamento</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Data, horário, técnico e local de execução — use 💾 para salvar</div>
            </div>
          </div>

          {/* Campos de agendamento */}
          {comAgendamento && (
            <div style={{ background: '#0A1F18', border: '1px solid #1E3A2E', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Dados do Agendamento
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelInput}>Data agendada</label>
                  <input type="date" style={inp} value={ag.dataAgendada} onChange={e => setAg({ ...ag, dataAgendada: e.target.value })} />
                </div>
                <div>
                  <label style={labelInput}>Horário</label>
                  <input type="time" style={inp} value={ag.horaAgendada} onChange={e => setAg({ ...ag, horaAgendada: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelInput}>Técnico responsável</label>
                <input type="text" style={inp} value={ag.tecnico} placeholder="Nome do técnico ou equipe" onChange={e => setAg({ ...ag, tecnico: e.target.value })} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelInput}>Endereço / local de execução</label>
                <input type="text" style={inp} value={ag.enderecoServico} placeholder="Rua, número, bairro — Cidade" onChange={e => setAg({ ...ag, enderecoServico: e.target.value })} />
              </div>
              <div>
                <label style={labelInput}>Observações do agendamento</label>
                <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={ag.observacoes} placeholder="Instruções, contato no local, equipamentos necessários..." onChange={e => setAg({ ...ag, observacoes: e.target.value })} />
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

// ─── MODAL EXCLUIR COM SENHA ───────────────────────────────────────────────────

function ModalSenhaAdmin({
  titulo: textoTitulo,
  descricao,
  onConfirmar,
  isLoading,
  erro,
  onClose,
}: {
  titulo:      string
  descricao:   string
  onConfirmar: (senha: string) => void
  isLoading:   boolean
  erro:        string
  onClose:     () => void
}) {
  const [senha, setSenha] = useState('')

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={textoTitulo}
      width={420}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            variant="danger"
            disabled={isLoading || !senha}
            onClick={() => onConfirmar(senha)}
          >
            {isLoading ? 'Excluindo...' : 'Excluir'}
          </Btn>
        </>
      }
    >
      <p style={{ color: C.text, margin: '0 0 16px' }}>{descricao}</p>

      {erro && <div style={{ marginBottom: 12 }}><Alert type="danger">{erro}</Alert></div>}

      <Input
        label="Senha do Administrador *"
        type="password"
        value={senha}
        onChange={e => setSenha(e.target.value)}
        placeholder="Digite a senha de administrador"
        onKeyDown={e => { if (e.key === 'Enter' && senha) onConfirmar(senha) }}
        autoFocus
      />
      <p style={{ color: C.textMuted, fontSize: 11, margin: '6px 0 0' }}>
        A exclusão requer autorização do administrador do sistema.
      </p>
    </Modal>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export function LancamentosPage() {
  const [tab, setTab] = useState<'pagar' | 'receber' | 'transferencias' | 'extrato'>('pagar')

  return (
    <PageWrapper>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Lançamentos</h2>
        <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>
          Contas a pagar, receber, transferências e extrato
        </p>
      </div>

      <div style={{ background: C.bgCard, borderRadius: 14, border: '1px solid ' + C.border, overflow: 'hidden' }}>
        <Tabs
          tabs={[
            { id: 'pagar',          label: '📤 A Pagar' },
            { id: 'receber',        label: '📥 A Receber' },
            { id: 'transferencias', label: '⇄ Transferências' },
            { id: 'extrato',        label: '📋 Extrato' },
          ]}
          active={tab}
          onChange={t => setTab(t as typeof tab)}
        />

        <div style={{ padding: '24px' }}>
          {tab === 'pagar'          && <TabLancamentos tipo="PAGAR" />}
          {tab === 'receber'        && <TabLancamentos tipo="RECEBER" />}
          {tab === 'transferencias' && <TabTransferencias />}
          {tab === 'extrato'        && <TabExtrato />}
        </div>
      </div>
    </PageWrapper>
  )
}

// ─── TAB A PAGAR / A RECEBER (compartilhada) ──────────────────────────────────

// ─── MODAL: EXCLUSÃO EM LOTE ─────────────────────────────────────────────────
function ModalDeleteLote({
  tituloIds, rows, onClose, onConfirmar, isLoading,
}: {
  tituloIds:   number[]
  rows:        any[]
  onClose:     () => void
  onConfirmar: (senha: string) => void
  isLoading:   boolean
}) {
  const [senha, setSenha] = useState('')
  const [erro,  setErro]  = useState('')

  const itens = rows.filter((r: any) => tituloIds.includes(r.tituloId))

  const handleConfirmar = () => {
    if (!senha.trim()) { setErro('Informe a senha de administrador'); return }
    setErro('')
    onConfirmar(senha)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.bgMid, border: `1px solid ${C.danger}40`, borderRadius: 14,
        padding: 28, width: 560, maxWidth: '95vw', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Cabeçalho */}
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.danger, marginBottom: 4 }}>
            🗑 Excluir {tituloIds.length} lançamento{tituloIds.length > 1 ? 's' : ''} em lote
          </div>
          <div style={{ fontSize: 12, color: C.textMuted }}>
            Esta ação é irreversível. Revise os itens abaixo antes de confirmar.
          </div>
        </div>

        {/* Preview dos itens */}
        <div style={{
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
          maxHeight: 280, overflowY: 'auto',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 1fr 100px 80px',
            padding: '6px 12px', background: C.bgHover,
            fontSize: 9, fontWeight: 700, color: C.textDim,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            borderBottom: `1px solid ${C.border}`,
          }}>
            <div>Data</div><div>Descrição</div><div>Valor</div><div>Pessoa</div>
          </div>
          {itens.map((r: any) => (
            <div key={r.tituloId} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr 100px 80px',
              padding: '7px 12px', borderBottom: `1px solid ${C.border}50`,
              fontSize: 12, alignItems: 'center',
            }}>
              <div style={{ color: C.textMuted }}>{fmtData(r.vencimento)}</div>
              <div style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }} title={r.descricao}>{r.descricao}</div>
              <div style={{ color: r.tipo === 'PAGAR' ? C.debit : C.credit, fontWeight: 700 }}>{fmtBRLFull(Number(r.valor))}</div>
              <div style={{ color: r.pessoaNome ? C.text : C.textDim, fontSize: 11 }}>{r.pessoaNome || '—'}</div>
            </div>
          ))}
        </div>

        {/* Aviso */}
        <div style={{
          background: C.danger + '12', border: `1px solid ${C.danger}40`,
          borderRadius: 8, padding: '10px 14px', fontSize: 12, color: C.danger,
        }}>
          ⚠️ <strong>{itens.filter((r: any) => r.pessoaNome).length} com pessoa vinculada</strong> e{' '}
          <strong>{itens.filter((r: any) => !r.pessoaNome).length} sem vinculação</strong> serão excluídos permanentemente.
        </div>

        {/* Senha */}
        <div>
          <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Senha de administrador
          </label>
          <input
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirmar()}
            placeholder="Digite sua senha para confirmar"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: C.bg, border: `1px solid ${erro ? C.danger : C.border}`,
              borderRadius: 8, padding: '9px 12px', color: C.text,
              fontSize: 13, outline: 'none', fontFamily: 'inherit',
            }}
            autoFocus
          />
          {erro && <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>{erro}</div>}
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose} disabled={isLoading}>Cancelar</Btn>
          <Btn
            onClick={handleConfirmar}
            disabled={isLoading}
            style={{ background: C.danger, color: '#fff' }}
          >
            {isLoading ? <><Spinner size={13} /> Excluindo...</> : `🗑 Excluir ${tituloIds.length} lançamento${tituloIds.length > 1 ? 's' : ''}`}
          </Btn>
        </div>
      </div>
    </div>
  )
}

function TabLancamentos({ tipo }: { tipo: 'PAGAR' | 'RECEBER' }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [dataIni, setDataIni]           = useState(mesAtualIni())
  const [dataFim, setDataFim]           = useState('')
  const [showNovo, setShowNovo]         = useState(false)
  const [editandoTituloId, setEditandoTituloId]   = useState<number | null>(null)
  const [baixandoParcela, setBaixandoParcela]     = useState<any>(null)
  const [comprovanteRow, setComprovanteRow]       = useState<any>(null)
  const [confirmDelete, setConfirmDelete]         = useState<any>(null)
  const [deleteErro, setDeleteErro]               = useState('')
  const [erro, setErro]                 = useState('')
  // Seleção em lote
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [showDeleteLote, setShowDeleteLote] = useState(false)

  const { data: rows = [], isLoading, refetch } = (trpc as any).fin.titulo.list.useQuery({
    tipo,
    status:  statusFilter || undefined,
    dataIni: dataIni || undefined,
    dataFim: dataFim || undefined,
  }) // staleTime herdado (60s) — invalidateQueries após mutations garante dados frescos

  const { data: contas       = [] } = (trpc as any).fin.conta.list.useQuery()
  const { data: pessoas      = [] } = (trpc as any).fin.pessoa.list.useQuery()
  const { data: planosContas = [] } = (trpc as any).fin.planoContas.list.useQuery()
  const { data: centrosCusto = [] } = (trpc as any).fin.centroCusto.list.useQuery()

  const deletarTitulo = (trpc as any).fin.titulo.delete.useMutation({
    onSuccess: () => { setConfirmDelete(null); setDeleteErro(''); setErro(''); refetch() },
    onError:   (e: any) => setDeleteErro(e.message ?? 'Erro ao excluir'),
  })

  const deleteLote = (trpc as any).fin.titulo.deleteLote.useMutation({
    onSuccess: (r: any) => {
      setSelecionados(new Set())
      setShowDeleteLote(false)
      refetch()
      alert(`✓ ${r.excluidos} lançamento(s) excluído(s) com sucesso.`)
    },
    onError: (e: any) => alert('Erro: ' + (e.message ?? 'Erro ao excluir lote')),
  })

  const estornar = (trpc as any).fin.parcela.estornar.useMutation({
    onSuccess: () => refetch(),
    onError:   (e: any) => setErro(e.message ?? 'Erro ao estornar'),
  })

  const kpis = useMemo(() => {
    const aberta  = rows.filter((r: any) => r.statusDisplay === 'ABERTA')
    const vencida = rows.filter((r: any) => r.statusDisplay === 'VENCIDA')
    const paga    = rows.filter((r: any) => r.status === 'PAGA')
    // Total do período = soma de TODOS os lançamentos no filtro (abertos + vencidos + pagos)
    const totalPeriodo = rows.reduce((s: number, r: any) => {
      const v = r.status === 'PAGA' ? Number(r.valorPago ?? r.valor) : Number(r.valor)
      return s + v
    }, 0)
    return {
      totalPeriodo,
      totalAberta:  aberta.reduce( (s: number, r: any) => s + Number(r.valor), 0),
      totalVencida: vencida.reduce((s: number, r: any) => s + Number(r.valor), 0),
      totalPago:    paga.reduce(   (s: number, r: any) => s + Number(r.valorPago ?? r.valor), 0),
      countVencidas: vencida.length,
      total: rows.length,
    }
  }, [rows])

  const label = tipo === 'PAGAR' ? 'Pagar' : 'Receber'

  return (
    <>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          label={`Total no Período`}
          value={fmtBRLFull(kpis.totalPeriodo)}
          icon={tipo === 'PAGAR' ? '📤' : '📥'}
          color={tipo === 'PAGAR' ? C.debit : C.credit}
          sub={`${kpis.total} parcela(s)`}
        />
        <KpiCard
          label={`Em Aberto`}
          value={fmtBRLFull(kpis.totalAberta + kpis.totalVencida)}
          icon="⏳"
          color={kpis.totalVencida > 0 ? C.warning : C.info}
          sub={kpis.countVencidas > 0 ? `${kpis.countVencidas} vencida(s)` : 'no prazo'}
        />
        <KpiCard
          label={tipo === 'PAGAR' ? 'Já Pago' : 'Já Recebido'}
          value={fmtBRLFull(kpis.totalPago)}
          icon="✓"
          color={C.success}
        />
        <KpiCard
          label="Parcelas"
          value={String(kpis.total)}
          sub="no filtro atual"
          icon="📋"
          color={C.info}
        />
      </div>

      {/* Filtros + Botão */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 160px' }}>
          <Select
            label="Status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={[
              { value: '',          label: 'Todos' },
              { value: 'ABERTA',    label: 'Em Aberto' },
              { value: 'VENCIDA',   label: 'Vencidas' },
              { value: 'PAGA',      label: 'Pagas' },
              { value: 'CANCELADA', label: 'Canceladas' },
            ]}
          />
        </div>
        <div style={{ flex: '0 0 150px' }}>
          <Input label="Vencimento a partir de" type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} />
        </div>
        <div style={{ flex: '0 0 150px' }}>
          <Input label="Vencimento até" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {selecionados.size > 0 && (
            <Btn
              variant="ghost"
              onClick={() => setShowDeleteLote(true)}
              style={{ color: C.danger, borderColor: C.danger + '50', background: C.danger + '10' }}
            >
              🗑 Excluir {selecionados.size} selecionado{selecionados.size > 1 ? 's' : ''}
            </Btn>
          )}
          <Btn
            variant="ghost"
            onClick={() => {
              const semVinculo = rows.filter((r: any) => !r.pessoaNome).map((r: any) => r.tituloId)
              setSelecionados(new Set(semVinculo))
            }}
            style={{ fontSize: 11 }}
            title="Selecionar todos sem pessoa vinculada"
          >
            ☐ Sem vínculo ({rows.filter((r: any) => !r.pessoaNome).length})
          </Btn>
          {selecionados.size > 0 && (
            <Btn variant="ghost" onClick={() => setSelecionados(new Set())} style={{ fontSize: 11 }}>
              ✕ Limpar
            </Btn>
          )}
          <Btn onClick={() => setShowNovo(true)}>+ Nova Conta a {label}</Btn>
        </div>
      </div>

      {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}

      {/* Tabela */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
      ) : (
        <Table
          columns={[
            { key: 'sel',        label: '',           width: '36px'  },
            { key: 'vencimento', label: 'Vencimento', width: '95px'  },
            { key: 'pessoa',     label: tipo === 'PAGAR' ? 'Fornecedor / Prestador' : 'Cliente' },
            { key: 'descricao',  label: 'Descrição' },
            { key: 'conta',      label: 'Conta',      width: '110px' },
            { key: 'valor',      label: 'Valor',      align: 'right', width: '115px' },
            { key: 'status',     label: 'Status',     align: 'center', width: '110px' },
            { key: 'acoes',      label: '',           align: 'right',  width: '135px' },
          ]}
          rows={rows.map((r: any) => ({
            sel: (
              <input
                type="checkbox"
                checked={selecionados.has(r.tituloId)}
                onChange={e => {
                  setSelecionados(prev => {
                    const n = new Set(prev)
                    e.target.checked ? n.add(r.tituloId) : n.delete(r.tituloId)
                    return n
                  })
                }}
                style={{ cursor: 'pointer', accentColor: C.danger, width: 14, height: 14 }}
                onClick={e => e.stopPropagation()}
              />
            ),
            vencimento: (
              <span style={{ color: r.statusDisplay === 'VENCIDA' ? C.warning : C.textMuted, fontSize: 12 }}>
                {fmtData(r.vencimento)}
              </span>
            ),
            pessoa: r.pessoaNome
              ? <span style={{ color: C.text }}>{r.pessoaNome}</span>
              : (
                <span
                  onClick={() => setEditandoTituloId(r.tituloId)}
                  title="Clique para vincular um fornecedor/cliente"
                  style={{
                    color: C.textDim, cursor: 'pointer', fontSize: 11,
                    borderBottom: `1px dashed ${C.border}`,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.emerald)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.textDim)}
                >
                  + vincular
                </span>
              ),
            descricao: (
              <div>
                <span style={{ color: C.text, fontSize: 13 }}>{r.descricao}</span>
                {r.planoNome && (
                  <span style={{ display: 'block', color: C.textDim, fontSize: 11 }}>{r.planoNome}</span>
                )}
              </div>
            ),
            conta: r.contaNome ? (() => {
              const nome = String(r.contaNome).toLowerCase()
              const isInter   = nome.includes('inter')
              const isSicoob  = nome.includes('sicoob')
              const cor = isInter ? '#F5A623' : isSicoob ? '#10B981' : C.emerald
              return (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: cor + '20', color: cor,
                  border: `1px solid ${cor}40`,
                  whiteSpace: 'nowrap' as const,
                }}>
                  🏦 {r.contaNome}
                </span>
              )
            })() : <span style={{ color: C.textDim, fontSize: 11 }}>—</span>,
            valor: (() => {
              const valorOrig = Number(r.valor)
              const valorPago = r.valorPago != null ? Number(r.valorPago) : null
              const hasDif    = valorPago != null && Math.abs(valorPago - valorOrig) > 0.009
              return (
                <div>
                  <span style={{ fontWeight: 700, color: tipo === 'PAGAR' ? C.debit : C.credit }}>
                    {fmtBRLFull(r.status === 'PAGA' && valorPago != null ? valorPago : valorOrig)}
                  </span>
                  {hasDif && r.status === 'PAGA' && (
                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                      <span style={{ textDecoration: 'line-through', marginRight: 4 }}>{fmtBRLFull(valorOrig)}</span>
                      <span style={{ color: valorPago! < valorOrig ? C.debit : C.warning }}>
                        {valorPago! < valorOrig ? '▼' : '▲'} {fmtBRLFull(Math.abs(valorPago! - valorOrig))}
                      </span>
                    </div>
                  )}
                  {r.formaPagamento && r.status === 'PAGA' && (
                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{LABELS_FORMA[r.formaPagamento] ?? r.formaPagamento}</div>
                  )}
                </div>
              )
            })(),
            status: <StatusBadge s={r.statusDisplay} />,
            acoes: (
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                {/* Editar */}
                <Btn
                  size="sm" variant="ghost"
                  onClick={() => setEditandoTituloId(r.tituloId)}
                  title="Editar lançamento"
                >✏</Btn>

                {/* Comprovante */}
                <Btn
                  size="sm" variant="ghost"
                  onClick={() => setComprovanteRow(r)}
                  title="Gerar comprovante"
                >🖨</Btn>

                {/* Baixar */}
                {r.statusDisplay !== 'PAGA' && r.statusDisplay !== 'CANCELADA' && (
                  <Btn size="sm" variant="success" onClick={() => setBaixandoParcela(r)} title="Registrar pagamento">✓</Btn>
                )}

                {/* Estornar */}
                {r.status === 'PAGA' && (
                  <Btn
                    size="sm" variant="ghost"
                    onClick={() => estornar.mutate({ parcelaId: r.parcelaId })}
                    disabled={estornar.isLoading}
                    title="Estornar pagamento"
                  >↩</Btn>
                )}

                {/* Excluir */}
                {r.status !== 'PAGA' && (
                  <Btn
                    size="sm" variant="danger"
                    onClick={() => { setDeleteErro(''); setConfirmDelete({ tituloId: r.tituloId, descricao: r.descricao }) }}
                    title="Excluir título"
                  >✕</Btn>
                )}
              </div>
            ),
          }))}
          emptyMessage={`Nenhuma conta a ${label.toLowerCase()} no período`}
        />
      )}

      {/* Modal: Novo Lançamento */}
      {showNovo && (
        <ModalNovoLancamento
          tipo={tipo}
          contas={contas}
          pessoas={pessoas}
          planosContas={planosContas}
          centrosCusto={centrosCusto}
          onClose={() => setShowNovo(false)}
          onSuccess={() => { setShowNovo(false); refetch() }}
        />
      )}

      {/* Modal: Baixa */}
      {baixandoParcela && (
        <ModalBaixa
          parcela={baixandoParcela}
          contas={contas}
          onClose={() => setBaixandoParcela(null)}
          onSuccess={() => { setBaixandoParcela(null); refetch() }}
        />
      )}

      {/* Modal: Comprovante */}
      {comprovanteRow && (
        <ModalComprovante
          tituloId={comprovanteRow.tituloId}
          parcelaAtual={comprovanteRow}
          onClose={() => setComprovanteRow(null)}
        />
      )}

      {/* Modal: Editar Lançamento */}
      {editandoTituloId && (
        <ModalEditarLancamento
          tituloId={editandoTituloId}
          tipo={tipo}
          onClose={() => setEditandoTituloId(null)}
          onSuccess={() => { setEditandoTituloId(null); refetch() }}
        />
      )}

      {/* Modal: Confirmar exclusão com senha admin */}
      {confirmDelete && (
        <ModalSenhaAdmin
          titulo="Excluir Lançamento"
          descricao={`Excluir o título "${confirmDelete.descricao}" e todas as suas parcelas? Esta ação não pode ser desfeita.`}
          isLoading={deletarTitulo.isLoading}
          erro={deleteErro}
          onClose={() => { setConfirmDelete(null); setDeleteErro('') }}
          onConfirmar={senha => deletarTitulo.mutate({ tituloId: confirmDelete.tituloId, senhaAdmin: senha })}
        />
      )}

      {/* Modal: Exclusão em lote */}
      {showDeleteLote && (
        <ModalDeleteLote
          tituloIds={[...selecionados]}
          rows={rows}
          onClose={() => setShowDeleteLote(false)}
          onConfirmar={senha => deleteLote.mutate({ tituloIds: [...selecionados], senhaAdmin: senha })}
          isLoading={deleteLote.isLoading}
        />
      )}
    </>
  )
}

// ─── MODAL: NOVO LANÇAMENTO ───────────────────────────────────────────────────

function ModalNovoLancamento({
  tipo, contas, pessoas, planosContas, centrosCusto, onClose, onSuccess,
}: {
  tipo:          'PAGAR' | 'RECEBER'
  contas:        any[]
  pessoas:       any[]
  planosContas:  any[]
  centrosCusto:  any[]
  onClose:       () => void
  onSuccess:     () => void
}) {
  const [form, setForm] = useState({
    descricao:     '',
    documento:     '',
    pessoaId:      '',
    planoContasId: '',
    centroCustoId: '',
    valorOriginal: '',
    emissao:       hoje(),
    observacoes:   '',
    qtdParcelas:   '1',
  })
  // Parcelas com datas editáveis
  const [parcelas, setParcelas] = useState<{ numero: number; valor: number; vencimento: string }[]>([
    { numero: 1, valor: 0, vencimento: '' }
  ])
  const [erro, setErro] = useState('')

  const create = (trpc as any).fin.titulo.create.useMutation({
    onSuccess,
    onError: (e: any) => setErro(e.message ?? 'Erro ao criar lançamento'),
  })

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))
  const label = tipo === 'PAGAR' ? 'Pagar' : 'Receber'

  const pessoasFiltradas = pessoas.filter((p: any) =>
    tipo === 'PAGAR' ? p.isFornecedor : p.isCliente
  )
  const planosFiltrados = planosContas.filter((p: any) =>
    p.tipo === (tipo === 'PAGAR' ? 'DESPESA' : 'RECEITA') || p.tipo === 'FINANCEIRO'
  )

  const qtd   = Math.max(1, parseInt(form.qtdParcelas) || 1)
  const valor = parseMoeda(form.valorOriginal)

  // Regenera parcelas quando qtd ou valor muda, preservando datas já editadas
  useMemo(() => {
    if (valor <= 0) { setParcelas([{ numero: 1, valor: 0, vencimento: '' }]); return }
    const valorBase = Math.floor(valor * 100 / qtd) / 100
    let acumulado = 0
    setParcelas(prev => Array.from({ length: qtd }, (_, i) => {
      const isLast = i === qtd - 1
      const v = isLast ? Math.round((valor - acumulado) * 100) / 100 : valorBase
      acumulado += v
      // Preserva vencimento já digitado pelo usuário
      const vencExistente = prev[i]?.vencimento ?? ''
      return { numero: i + 1, valor: v, vencimento: vencExistente }
    }))
  }, [qtd, valor])

  function submit() {
    setErro('')
    if (!form.descricao.trim()) return setErro('Descrição é obrigatória')
    if (valor <= 0)             return setErro('Valor deve ser maior que zero')
    const semVenc = parcelas.findIndex(p => !p.vencimento)
    if (semVenc >= 0) return setErro(`Informe o vencimento da parcela ${semVenc + 1}`)

    create.mutate({
      tipo,
      descricao:     form.descricao.trim(),
      documento:     form.documento.trim() || undefined,
      pessoaId:      form.pessoaId      ? parseInt(form.pessoaId)      : undefined,
      planoContasId: form.planoContasId ? parseInt(form.planoContasId) : undefined,
      centroCustoId: form.centroCustoId ? parseInt(form.centroCustoId) : undefined,
      valorOriginal: valor,
      emissao:       form.emissao,
      observacoes:   form.observacoes.trim() || undefined,
      parcelas:      parcelas.map(p => ({ numero: p.numero, valor: p.valor, vencimento: p.vencimento })),
    })
  }

  // Preenche datas automaticamente pelo 1º vencimento
  function onPrimeiroVencimento(data: string) {
    setParcelas(prev => prev.map((p, i) => {
      if (i === 0) return { ...p, vencimento: data }
      // Só preenche automaticamente se a data estava vazia
      if (p.vencimento) return p
      const d = new Date(data + 'T12:00:00')
      d.setMonth(d.getMonth() + i)
      return { ...p, vencimento: d.toISOString().slice(0, 10) }
    }))
  }

  const totalParcelas = parcelas.reduce((s, p) => s + p.valor, 0)

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Nova Conta a ${label}`}
      width={640}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={create.isLoading} onClick={submit}>
            {create.isLoading ? 'Salvando...' : `+ Criar a ${label}`}
          </Btn>
        </>
      }
    >
      {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}

      <FormRow>
        <Input label="Descrição *" value={form.descricao} onChange={e => f('descricao', e.target.value)} placeholder="Aluguel, NF #1234, Serviço..." />
        <Input label="Documento / NF" value={form.documento} onChange={e => f('documento', e.target.value)} placeholder="Nº nota, boleto, etc." />
      </FormRow>

      <FormRow>
        <Select
          label={tipo === 'PAGAR' ? 'Fornecedor' : 'Cliente'}
          value={form.pessoaId}
          onChange={e => f('pessoaId', e.target.value)}
          placeholder="— Selecione (opcional) —"
          options={pessoasFiltradas.map((p: any) => ({ value: String(p.id), label: p.nome }))}
        />
        <Select
          label="Plano de Contas"
          value={form.planoContasId}
          onChange={e => f('planoContasId', e.target.value)}
          placeholder="— Selecione (opcional) —"
          options={planosFiltrados.map((p: any) => ({ value: String(p.id), label: `${p.codigo} — ${p.nome}` }))}
        />
      </FormRow>

      <FormRow>
        <Select
          label="Centro de Custo"
          value={form.centroCustoId}
          onChange={e => f('centroCustoId', e.target.value)}
          placeholder="— Selecione (opcional) —"
          options={centrosCusto.map((c: any) => ({ value: String(c.id), label: `${c.codigo} — ${c.nome}` }))}
        />
        <InputMoeda label="Valor Total *" value={form.valorOriginal} onChange={v => f('valorOriginal', v)} />
      </FormRow>

      <FormRow>
        <Input label="Data de Emissão *" type="date" value={form.emissao} onChange={e => f('emissao', e.target.value)} />
        <Input
          label="Número de Parcelas"
          type="number" min="1" max="60"
          value={form.qtdParcelas}
          onChange={e => f('qtdParcelas', e.target.value)}
          hint="1 = à vista. 2+ = parcelado."
        />
      </FormRow>

      {/* Parcelas com datas editáveis */}
      {valor > 0 && (
        <div style={{ background: C.bg, borderRadius: 8, border: '1px solid ' + C.border, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Vencimentos das Parcelas
            </p>
            {parcelas.length > 1 && (
              <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>
                Preencha o 1º e os demais serão sugeridos ▶
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr', gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>#</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Vencimento *</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Valor</div>
          </div>

          {parcelas.map((p, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div style={{ color: C.textMuted, fontSize: 12, fontWeight: 700, textAlign: 'center' }}>{p.numero}</div>
              <input
                type="date"
                value={p.vencimento}
                onChange={e => {
                  const newDate = e.target.value
                  if (i === 0) {
                    onPrimeiroVencimento(newDate)
                  } else {
                    setParcelas(prev => prev.map((x, j) => j === i ? { ...x, vencimento: newDate } : x))
                  }
                }}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 7,
                  background: C.bgMid, border: '1px solid ' + (p.vencimento ? C.border : C.danger + '60'),
                  color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
                }}
              />
              <div style={{ textAlign: 'right', fontWeight: 600, color: tipo === 'PAGAR' ? C.debit : C.credit, fontSize: 13 }}>
                {fmtBRLFull(p.valor)}
              </div>
            </div>
          ))}

          {parcelas.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid ' + C.border + '60', paddingTop: 8, marginTop: 6 }}>
              <span style={{ color: C.textMuted, fontSize: 12 }}>Total {parcelas.length} parcelas</span>
              <span style={{ color: tipo === 'PAGAR' ? C.debit : C.credit, fontWeight: 700 }}>{fmtBRLFull(totalParcelas)}</span>
            </div>
          )}
        </div>
      )}

      <Textarea
        label="Observações"
        value={form.observacoes}
        onChange={e => f('observacoes', e.target.value)}
        placeholder="Notas internas sobre este lançamento..."
      />
    </Modal>
  )
}

// ─── MODAL: BAIXA ─────────────────────────────────────────────────────────────

function ModalBaixa({ parcela, contas, onClose, onSuccess }: {
  parcela:   any
  contas:    any[]
  onClose:   () => void
  onSuccess: () => void
}) {
  const valorOriginal = Number(parcela.valor) || 0

  const [form, setForm] = useState({
    contaId:        '',
    dataPagamento:  hoje(),
    valorPago:      maskMoeda(valorOriginal),
    juros:          '',
    multa:          '',
    desconto:       '',
    formaPagamento: '',
    taxaOperadora:  '',
  })
  const [erro, setErro] = useState('')

  const baixar = (trpc as any).fin.parcela.baixar.useMutation({
    onSuccess,
    onError: (e: any) => setErro(e.message ?? 'Erro ao registrar pagamento'),
  })

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  // Auto-calcula desconto quando taxa da operadora muda (cartão crédito)
  function onTaxaChange(taxa: string) {
    const t = parseFloat(taxa.replace(',', '.')) || 0
    const desc = t > 0 ? valorOriginal * t / 100 : 0
    const descMasked = desc > 0 ? maskMoeda(desc) : ''
    const juros  = parseMoeda(form.juros)  || 0
    const multa  = parseMoeda(form.multa)  || 0
    const vpLiq  = valorOriginal + juros + multa - desc
    setForm(prev => ({
      ...prev,
      taxaOperadora: taxa,
      desconto:      descMasked,
      valorPago:     maskMoeda(Math.max(0, vpLiq)),
    }))
  }

  // Auto-recalcula valorPago quando encargos/descontos mudam
  function onEncargosChange(key: 'juros' | 'multa' | 'desconto', v: string) {
    setForm(prev => {
      const next = { ...prev, [key]: v }
      const j    = parseMoeda(next.juros)   || 0
      const m    = parseMoeda(next.multa)   || 0
      const d    = parseMoeda(next.desconto) || 0
      return { ...next, valorPago: maskMoeda(Math.max(0, valorOriginal + j + m - d)) }
    })
  }

  function submit() {
    setErro('')
    if (!form.contaId) return setErro('Selecione a conta bancária')
    const vp = parseMoeda(form.valorPago)
    if (vp <= 0) return setErro('Valor pago deve ser maior que zero')

    baixar.mutate({
      parcelaId:      parcela.parcelaId,
      contaId:        parseInt(form.contaId),
      dataPagamento:  form.dataPagamento,
      valorPago:      vp,
      juros:          parseMoeda(form.juros)    || 0,
      multa:          parseMoeda(form.multa)    || 0,
      desconto:       parseMoeda(form.desconto) || 0,
      formaPagamento: form.formaPagamento || undefined,
    })
  }

  const tipo = parcela.tipo as 'PAGAR' | 'RECEBER'
  const vp       = parseMoeda(form.valorPago) || 0
  const jv       = parseMoeda(form.juros)     || 0
  const mv       = parseMoeda(form.multa)     || 0
  const dv       = parseMoeda(form.desconto)  || 0
  const difValor = vp - valorOriginal
  const temDif   = Math.abs(difValor) > 0.009

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Registrar ${tipo === 'PAGAR' ? 'Pagamento' : 'Recebimento'}`}
      width={500}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="success" disabled={baixar.isLoading} onClick={submit}>
            {baixar.isLoading ? 'Salvando...' : '✓ Confirmar Baixa'}
          </Btn>
        </>
      }
    >
      {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}

      {/* Info da parcela */}
      <div style={{ background: C.bg, borderRadius: 8, border: '1px solid ' + C.border, padding: '12px 14px', marginBottom: 18 }}>
        <p style={{ margin: 0, color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Parcela</p>
        <p style={{ margin: '4px 0 0', color: C.text, fontSize: 14, fontWeight: 600 }}>{parcela.descricao}</p>
        <p style={{ margin: '4px 0 0', color: C.textMuted, fontSize: 12 }}>
          Vencimento: <strong>{fmtData(parcela.vencimento)}</strong>{' '}
          · Valor contratado:{' '}
          <strong style={{ color: tipo === 'PAGAR' ? C.debit : C.credit }}>{fmtBRLFull(valorOriginal)}</strong>
        </p>
      </div>

      {/* Forma de pagamento */}
      <FormRow cols={1}>
        <Select
          label="Forma de Pagamento"
          value={form.formaPagamento}
          onChange={e => {
            f('formaPagamento', e.target.value)
            if (e.target.value !== 'credito') {
              setForm(prev => ({ ...prev, formaPagamento: e.target.value, taxaOperadora: '', desconto: '', valorPago: maskMoeda(valorOriginal) }))
            }
          }}
          options={FORMAS_PAGAMENTO}
        />
      </FormRow>

      {/* Taxa operadora (apenas cartão crédito) */}
      {form.formaPagamento === 'credito' && (
        <div style={{ background: '#1A1A2E', border: '1px solid #3B3B6B', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
          <p style={{ margin: '0 0 10px', color: '#A78BFA', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            💳 Taxa da Operadora de Cartão
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Taxa (%)</label>
              <input
                type="number" step="0.01" min="0" max="10" value={form.taxaOperadora}
                onChange={e => onTaxaChange(e.target.value)}
                placeholder="Ex: 2.99"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, background: C.bg, border: '1px solid ' + C.border, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}
              />
            </div>
            {dv > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>Desconto</div>
                <div style={{ color: C.debit, fontWeight: 700 }}>- {fmtBRLFull(dv)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <FormRow cols={1}>
        <Select
          label="Conta Bancária *"
          value={form.contaId}
          onChange={e => f('contaId', e.target.value)}
          placeholder="— Selecione a conta —"
          options={contas.map((c: any) => ({ value: String(c.id), label: c.nome }))}
        />
      </FormRow>

      <FormRow>
        <Input label="Data de Pagamento *" type="date" value={form.dataPagamento} onChange={e => f('dataPagamento', e.target.value)} />
        <InputMoeda label="Valor Efetivo *" value={form.valorPago} onChange={v => f('valorPago', v)} />
      </FormRow>

      <div style={{ marginBottom: 6 }}>
        <label style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Encargos e Descontos
        </label>
      </div>
      <FormRow cols={3}>
        <InputMoeda label="Juros"    value={form.juros}    onChange={v => onEncargosChange('juros',    v)} />
        <InputMoeda label="Multa"    value={form.multa}    onChange={v => onEncargosChange('multa',    v)} />
        <InputMoeda label="Desconto" value={form.desconto} onChange={v => onEncargosChange('desconto', v)} />
      </FormRow>

      {/* Resumo do cálculo */}
      {(jv > 0 || mv > 0 || dv > 0 || temDif) && (
        <div style={{
          background: C.bg, borderRadius: 8, border: '1px solid ' + C.border,
          padding: '10px 14px', marginTop: 4, fontSize: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: C.textMuted }}>Valor contratado</span>
            <span style={{ color: C.text }}>{fmtBRLFull(valorOriginal)}</span>
          </div>
          {jv > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: C.textMuted }}>+ Juros</span>
            <span style={{ color: C.warning }}>+ {fmtBRLFull(jv)}</span>
          </div>}
          {mv > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: C.textMuted }}>+ Multa</span>
            <span style={{ color: C.warning }}>+ {fmtBRLFull(mv)}</span>
          </div>}
          {dv > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: C.textMuted }}>- Desconto{form.formaPagamento === 'credito' ? ' (taxa cartão)' : ''}</span>
            <span style={{ color: C.debit }}>- {fmtBRLFull(dv)}</span>
          </div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid ' + C.border, paddingTop: 6, marginTop: 4 }}>
            <span style={{ color: C.text, fontWeight: 700 }}>Valor {tipo === 'PAGAR' ? 'pago' : 'recebido'} efetivo</span>
            <span style={{ color: tipo === 'PAGAR' ? C.debit : C.credit, fontWeight: 800, fontSize: 14 }}>{fmtBRLFull(vp)}</span>
          </div>
          {temDif && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: C.textMuted, fontSize: 11 }}>Diferença vs contratado</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: difValor > 0 ? C.warning : C.debit }}>
                {difValor > 0 ? '+' : ''}{fmtBRLFull(difValor)}
              </span>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ─── TAB TRANSFERÊNCIAS ───────────────────────────────────────────────────────

function TabTransferencias() {
  const [dataIni, setDataIni]             = useState(mesAtualIni())
  const [dataFim, setDataFim]             = useState('')
  const [showNova, setShowNova]           = useState(false)
  const [editandoTransf, setEditandoTransf] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [deleteErro, setDeleteErro]       = useState('')
  const [erro, setErro]                   = useState('')

  const { data: transferencias = [], isLoading, refetch } = (trpc as any).fin.transferencia.list.useQuery({
    dataIni: dataIni || undefined,
    dataFim: dataFim || undefined,
  })

  const { data: contas = [] } = (trpc as any).fin.conta.list.useQuery()

  const deletar = (trpc as any).fin.transferencia.delete.useMutation({
    onSuccess: () => { setConfirmDelete(null); setDeleteErro(''); setErro(''); refetch() },
    onError:   (e: any) => setDeleteErro(e.message ?? 'Erro ao excluir'),
  })

  const total = transferencias.reduce((s: number, t: any) => s + Number(t.valor), 0)

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Total Transferido" value={fmtBRLFull(total)} icon="⇄" color={C.info} />
        <KpiCard label="Quantidade" value={String(transferencias.length)} sub="transferências no período" icon="📋" color={C.textMuted} />
        <div />
      </div>

      {/* Filtros + Botão */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
        <div style={{ flex: '0 0 150px' }}>
          <Input label="A partir de" type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} />
        </div>
        <div style={{ flex: '0 0 150px' }}>
          <Input label="Até" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Btn onClick={() => setShowNova(true)}>⇄ Nova Transferência</Btn>
        </div>
      </div>

      {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
      ) : (
        <Table
          columns={[
            { key: 'data',      label: 'Data',        width: '105px' },
            { key: 'origem',    label: 'De' },
            { key: 'destino',   label: 'Para' },
            { key: 'descricao', label: 'Descrição' },
            { key: 'valor',     label: 'Valor', align: 'right', width: '120px' },
            { key: 'acoes',     label: '',      align: 'right', width: '90px' },
          ]}
          rows={transferencias.map((t: any) => ({
            data:      <span style={{ color: C.textMuted, fontSize: 12 }}>{fmtData(t.data)}</span>,
            origem:    <span style={{ color: C.debit,  fontWeight: 500 }}>↑ {t.contaOrigemNome}</span>,
            destino:   <span style={{ color: C.credit, fontWeight: 500 }}>↓ {t.contaDestinoNome}</span>,
            descricao: t.descricao
              ? <span style={{ color: C.textMuted, fontSize: 12 }}>{t.descricao}</span>
              : <span style={{ color: C.textDim }}>—</span>,
            valor: <span style={{ fontWeight: 700, color: C.text }}>{fmtBRLFull(Number(t.valor))}</span>,
            acoes: (
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <Btn
                  size="sm" variant="ghost"
                  onClick={() => setEditandoTransf(t)}
                  title="Editar transferência"
                >✏</Btn>
                <Btn
                  size="sm" variant="danger"
                  onClick={() => { setDeleteErro(''); setConfirmDelete(t) }}
                  title="Excluir transferência"
                >✕</Btn>
              </div>
            ),
          }))}
          emptyMessage="Nenhuma transferência no período"
        />
      )}

      {/* Modal: Nova Transferência */}
      {showNova && (
        <ModalNovaTransferencia
          contas={contas}
          onClose={() => setShowNova(false)}
          onSuccess={() => { setShowNova(false); refetch() }}
        />
      )}

      {/* Modal: Editar Transferência */}
      {editandoTransf && (
        <ModalEditarTransferencia
          transferencia={editandoTransf}
          contas={contas}
          onClose={() => setEditandoTransf(null)}
          onSuccess={() => { setEditandoTransf(null); refetch() }}
        />
      )}

      {/* Modal: Confirmar exclusão com senha admin */}
      {confirmDelete && (
        <ModalSenhaAdmin
          titulo="Excluir Transferência"
          descricao={`Excluir a transferência de ${fmtBRLFull(Number(confirmDelete.valor))} em ${fmtData(confirmDelete.data)}? Esta ação não pode ser desfeita.`}
          isLoading={deletar.isLoading}
          erro={deleteErro}
          onClose={() => { setConfirmDelete(null); setDeleteErro('') }}
          onConfirmar={senha => deletar.mutate({ id: confirmDelete.id, senhaAdmin: senha })}
        />
      )}
    </>
  )
}

// ─── MODAL: NOVA TRANSFERÊNCIA ────────────────────────────────────────────────

function ModalNovaTransferencia({ contas, onClose, onSuccess }: {
  contas:    any[]
  onClose:   () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    contaOrigemId:  '',
    contaDestinoId: '',
    valor:          '',
    data:           hoje(),
    descricao:      '',
  })
  const [erro, setErro] = useState('')

  const criar = (trpc as any).fin.transferencia.create.useMutation({
    onSuccess,
    onError: (e: any) => setErro(e.message ?? 'Erro ao criar transferência'),
  })

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  function submit() {
    setErro('')
    if (!form.contaOrigemId)  return setErro('Selecione a conta de origem')
    if (!form.contaDestinoId) return setErro('Selecione a conta de destino')
    if (form.contaOrigemId === form.contaDestinoId) return setErro('Origem e destino devem ser contas diferentes')
    const valor = parseMoeda(form.valor)
    if (valor <= 0) return setErro('Valor deve ser maior que zero')

    criar.mutate({
      contaOrigemId:  parseInt(form.contaOrigemId),
      contaDestinoId: parseInt(form.contaDestinoId),
      valor,
      data:      form.data,
      descricao: form.descricao.trim() || undefined,
    })
  }

  const contaOptions = contas.map((c: any) => ({ value: String(c.id), label: c.nome }))

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Nova Transferência"
      width={460}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={criar.isLoading} onClick={submit}>
            {criar.isLoading ? 'Salvando...' : '⇄ Transferir'}
          </Btn>
        </>
      }
    >
      {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}

      <FormRow cols={1}>
        <Select
          label="Conta de Origem (débito) *"
          value={form.contaOrigemId}
          onChange={e => f('contaOrigemId', e.target.value)}
          placeholder="— De qual conta —"
          options={contaOptions}
        />
      </FormRow>
      <FormRow cols={1}>
        <Select
          label="Conta de Destino (crédito) *"
          value={form.contaDestinoId}
          onChange={e => f('contaDestinoId', e.target.value)}
          placeholder="— Para qual conta —"
          options={contaOptions.filter(o => o.value !== form.contaOrigemId)}
        />
      </FormRow>
      <FormRow>
        <InputMoeda label="Valor *" value={form.valor} onChange={v => f('valor', v)} />
        <Input label="Data *" type="date" value={form.data} onChange={e => f('data', e.target.value)} />
      </FormRow>
      <FormRow cols={1}>
        <Input
          label="Descrição"
          value={form.descricao}
          onChange={e => f('descricao', e.target.value)}
          placeholder="Motivo da transferência (opcional)"
        />
      </FormRow>
    </Modal>
  )
}

// ─── TAB EXTRATO ──────────────────────────────────────────────────────────────

function TabExtrato() {
  const [dataIni, setDataIni] = useState(mesAtualIni())
  const [dataFim, setDataFim] = useState('')

  const filter = { dataIni: dataIni || undefined, dataFim: dataFim || undefined }

  const { data: pagas = [],          isLoading: l1 } = (trpc as any).fin.titulo.list.useQuery({ tipo: 'PAGAR',   status: 'PAGA', ...filter })
  const { data: recebidas = [],      isLoading: l2 } = (trpc as any).fin.titulo.list.useQuery({ tipo: 'RECEBER', status: 'PAGA', ...filter })
  const { data: transferencias = [], isLoading: l3 } = (trpc as any).fin.transferencia.list.useQuery(filter)

  const isLoading = l1 || l2 || l3

  const entries = useMemo(() => {
    const pagaE = pagas.map((r: any) => ({
      data:      r.dataPagamento ?? r.vencimento,
      tipo:      'PAGAR' as const,
      descricao: r.descricao,
      info:      r.pessoaNome ?? r.planoNome ?? '',
      entrada:   0,
      saida:     Number(r.valorPago ?? r.valor),
    }))
    const receberE = recebidas.map((r: any) => ({
      data:      r.dataPagamento ?? r.vencimento,
      tipo:      'RECEBER' as const,
      descricao: r.descricao,
      info:      r.pessoaNome ?? r.planoNome ?? '',
      entrada:   Number(r.valorPago ?? r.valor),
      saida:     0,
    }))
    const transfE = transferencias.map((t: any) => ({
      data:      t.data,
      tipo:      'TRANSFERENCIA' as const,
      descricao: t.descricao ?? 'Transferência interna',
      info:      `${t.contaOrigemNome} → ${t.contaDestinoNome}`,
      entrada:   0,
      saida:     Number(t.valor),
    }))
    return [...pagaE, ...receberE, ...transfE].sort((a, b) =>
      a.data < b.data ? 1 : a.data > b.data ? -1 : 0
    )
  }, [pagas, recebidas, transferencias])

  const totalEntradas = entries.reduce((s, e) => s + e.entrada, 0)
  const totalSaidas   = entries.reduce((s, e) => s + e.saida, 0)
  const saldo         = totalEntradas - totalSaidas

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Entradas"             value={fmtBRLFull(totalEntradas)} icon="📥" color={C.credit} />
        <KpiCard label="Saídas"               value={fmtBRLFull(totalSaidas)}   icon="📤" color={C.debit} />
        <KpiCard
          label="Resultado do Período"
          value={fmtBRLFull(Math.abs(saldo))}
          sub={saldo >= 0 ? 'Positivo ↑' : 'Negativo ↓'}
          icon={saldo >= 0 ? '📈' : '📉'}
          color={saldo >= 0 ? C.emerald : C.danger}
        />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
        <div style={{ flex: '0 0 150px' }}>
          <Input label="A partir de" type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} />
        </div>
        <div style={{ flex: '0 0 150px' }}>
          <Input label="Até" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
        <div style={{ color: C.textMuted, fontSize: 12, paddingBottom: 4, marginLeft: 8 }}>
          {entries.length} lançamento(s)
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
      ) : (
        <Table
          columns={[
            { key: 'data',      label: 'Data',         width: '105px' },
            { key: 'tipo',      label: 'Tipo',         width: '110px' },
            { key: 'descricao', label: 'Descrição' },
            { key: 'info',      label: 'Pessoa / Conta', width: '200px' },
            { key: 'entrada',   label: 'Entrada',  align: 'right', width: '120px' },
            { key: 'saida',     label: 'Saída',    align: 'right', width: '120px' },
          ]}
          rows={entries.map(e => ({
            data: <span style={{ color: C.textMuted, fontSize: 12 }}>{fmtData(e.data)}</span>,
            tipo: (
              e.tipo === 'PAGAR'       ? <span style={{ color: C.debit,  fontSize: 11, fontWeight: 700 }}>📤 PAGO</span> :
              e.tipo === 'RECEBER'     ? <span style={{ color: C.credit, fontSize: 11, fontWeight: 700 }}>📥 RECEBIDO</span> :
                                         <span style={{ color: C.info,   fontSize: 11, fontWeight: 700 }}>⇄ TRANSF.</span>
            ),
            descricao: <span style={{ color: C.text, fontSize: 13 }}>{e.descricao}</span>,
            info: e.info
              ? <span style={{ color: C.textMuted, fontSize: 12 }}>{e.info}</span>
              : <span style={{ color: C.textDim }}>—</span>,
            entrada: e.entrada > 0
              ? <span style={{ fontWeight: 700, color: C.credit }}>{fmtBRLFull(e.entrada)}</span>
              : <span style={{ color: C.textDim }}>—</span>,
            saida: e.saida > 0
              ? <span style={{ fontWeight: 700, color: e.tipo === 'TRANSFERENCIA' ? C.info : C.debit }}>{fmtBRLFull(e.saida)}</span>
              : <span style={{ color: C.textDim }}>—</span>,
          }))}
          emptyMessage="Nenhum lançamento no período selecionado"
        />
      )}
    </>
  )
}
