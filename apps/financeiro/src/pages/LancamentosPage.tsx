// ═══════════════════════════════════════════════════════════════════
// Página de Lançamentos — A Pagar / A Receber / Transferências / Extrato
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import { trpc } from '../lib/trpc'
import {
  PageWrapper, C, Btn, KpiCard, Table, Modal, Tabs,
  Input, InputMoeda, Select, Textarea, FormRow, Spinner, Alert,
} from '../components/ui'
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

// ─── MODAL COMPROVANTE ─────────────────────────────────────────────────────────

function ModalComprovante({
  tituloId,
  parcelaAtual,
  onClose,
}: {
  tituloId:     number
  parcelaAtual: any   // dados da linha clicada (para PAGAR)
  onClose:      () => void
}) {
  const [obs, setObs] = useState('')

  const { data: byId, isLoading: l1 } = (trpc as any).fin.titulo.byId.useQuery({ tituloId })
  const { data: empresa, isLoading: l2 } = (trpc as any).fin.empresa.minha.useQuery()

  const isLoading = l1 || l2

  function imprimir() {
    if (!byId || !empresa) return
    gerarComprovantePdf({
      tipo:          byId.titulo.tipo,
      empresa,
      titulo:        byId.titulo,
      parcelas:      byId.parcelas,
      parcelaAtual:  byId.titulo.tipo === 'PAGAR' ? {
        id:            parcelaAtual.parcelaId,
        numero:        parcelaAtual.numero,
        valor:         parcelaAtual.valor,
        vencimento:    parcelaAtual.vencimento,
        status:        parcelaAtual.statusDisplay ?? parcelaAtual.status,
        dataPagamento: parcelaAtual.dataPagamento,
        valorPago:     parcelaAtual.valorPago,
      } : undefined,
      observacoesExtra: obs,
    })
  }

  const tipo = parcelaAtual?.tipo ?? byId?.titulo?.tipo ?? 'PAGAR'
  const titleLabel = tipo === 'PAGAR' ? 'Comprovante de Pagamento' : 'Comprovante de Recebimento'

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`🖨 ${titleLabel}`}
      width={560}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={isLoading} onClick={imprimir}>
            {isLoading ? 'Carregando...' : '🖨 Gerar / Imprimir PDF'}
          </Btn>
        </>
      }
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
      ) : (
        <>
          {/* Resumo */}
          <div style={{ background: C.bg, borderRadius: 8, border: '1px solid ' + C.border, padding: '12px 14px', marginBottom: 20 }}>
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
          </div>

          {/* Observações extras para o comprovante */}
          <Textarea
            label="Observações para incluir no comprovante (opcional)"
            value={obs}
            onChange={e => setObs(e.target.value)}
            placeholder="Ex: Referente ao serviço executado em 05/2026, conforme proposta..."
            style={{ minHeight: 80 }}
          />
          <p style={{ color: C.textMuted, fontSize: 11, margin: '6px 0 0' }}>
            As observações serão impressas no comprovante. Deixe em branco para usar as observações do lançamento.
          </p>
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

function TabLancamentos({ tipo }: { tipo: 'PAGAR' | 'RECEBER' }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [dataIni, setDataIni]           = useState(mesAtualIni())
  const [dataFim, setDataFim]           = useState('')
  const [showNovo, setShowNovo]         = useState(false)
  const [baixandoParcela, setBaixandoParcela]     = useState<any>(null)
  const [comprovanteRow, setComprovanteRow]       = useState<any>(null)
  const [confirmDelete, setConfirmDelete]         = useState<any>(null)
  const [deleteErro, setDeleteErro]               = useState('')
  const [erro, setErro]                 = useState('')

  const { data: rows = [], isLoading, refetch } = (trpc as any).fin.titulo.list.useQuery({
    tipo,
    status:  statusFilter || undefined,
    dataIni: dataIni || undefined,
    dataFim: dataFim || undefined,
  }, { staleTime: 0 })

  const { data: contas       = [] } = (trpc as any).fin.conta.list.useQuery()
  const { data: pessoas      = [] } = (trpc as any).fin.pessoa.list.useQuery()
  const { data: planosContas = [] } = (trpc as any).fin.planoContas.list.useQuery()
  const { data: centrosCusto = [] } = (trpc as any).fin.centroCusto.list.useQuery()

  const deletarTitulo = (trpc as any).fin.titulo.delete.useMutation({
    onSuccess: () => { setConfirmDelete(null); setDeleteErro(''); setErro(''); refetch() },
    onError:   (e: any) => setDeleteErro(e.message ?? 'Erro ao excluir'),
  })

  const estornar = (trpc as any).fin.parcela.estornar.useMutation({
    onSuccess: () => refetch(),
    onError:   (e: any) => setErro(e.message ?? 'Erro ao estornar'),
  })

  const kpis = useMemo(() => {
    const aberta  = rows.filter((r: any) => r.statusDisplay === 'ABERTA')
    const vencida = rows.filter((r: any) => r.statusDisplay === 'VENCIDA')
    const paga    = rows.filter((r: any) => r.status === 'PAGA')
    return {
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
          label={`Total a ${label}`}
          value={fmtBRLFull(kpis.totalAberta + kpis.totalVencida)}
          icon={tipo === 'PAGAR' ? '📤' : '📥'}
          color={tipo === 'PAGAR' ? C.debit : C.credit}
        />
        <KpiCard
          label="Vencidas"
          value={fmtBRLFull(kpis.totalVencida)}
          sub={`${kpis.countVencidas} parcela(s)`}
          icon="⚠"
          color={C.warning}
        />
        <KpiCard
          label="Pagas no Período"
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
        <div style={{ marginLeft: 'auto' }}>
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
            { key: 'vencimento', label: 'Vencimento', width: '105px' },
            { key: 'pessoa',     label: tipo === 'PAGAR' ? 'Fornecedor' : 'Cliente' },
            { key: 'descricao',  label: 'Descrição' },
            { key: 'documento',  label: 'Documento',  width: '110px' },
            { key: 'valor',      label: 'Valor',      align: 'right', width: '115px' },
            { key: 'status',     label: 'Status',     align: 'center', width: '110px' },
            { key: 'acoes',      label: '',           align: 'right',  width: '135px' },
          ]}
          rows={rows.map((r: any) => ({
            vencimento: (
              <span style={{ color: r.statusDisplay === 'VENCIDA' ? C.warning : C.textMuted, fontSize: 12 }}>
                {fmtData(r.vencimento)}
              </span>
            ),
            pessoa: r.pessoaNome
              ? <span style={{ color: C.text }}>{r.pessoaNome}</span>
              : <span style={{ color: C.textDim }}>—</span>,
            descricao: (
              <div>
                <span style={{ color: C.text, fontSize: 13 }}>{r.descricao}</span>
                {r.planoNome && (
                  <span style={{ display: 'block', color: C.textDim, fontSize: 11 }}>{r.planoNome}</span>
                )}
              </div>
            ),
            documento: r.documento
              ? <span style={{ color: C.textMuted, fontSize: 12 }}>{r.documento}</span>
              : <span style={{ color: C.textDim }}>—</span>,
            valor: (
              <span style={{ fontWeight: 700, color: tipo === 'PAGAR' ? C.debit : C.credit }}>
                {fmtBRLFull(Number(r.valor))}
              </span>
            ),
            status: <StatusBadge s={r.statusDisplay} />,
            acoes: (
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
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
    descricao:          '',
    documento:          '',
    pessoaId:           '',
    planoContasId:      '',
    centroCustoId:      '',
    valorOriginal:      '',
    emissao:            hoje(),
    observacoes:        '',
    qtdParcelas:        '1',
    primeiroVencimento: '',
  })
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

  const previewParcelas = useMemo(() => {
    if (qtd <= 1 || valor <= 0 || !form.primeiroVencimento) return []
    return gerarParcelas(qtd, valor, form.primeiroVencimento)
  }, [qtd, valor, form.primeiroVencimento])

  function submit() {
    setErro('')
    if (!form.descricao.trim()) return setErro('Descrição é obrigatória')
    if (valor <= 0)             return setErro('Valor deve ser maior que zero')
    if (!form.primeiroVencimento) return setErro('Informe a data do primeiro vencimento')

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
      parcelas:      gerarParcelas(qtd, valor, form.primeiroVencimento),
    })
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Nova Conta a ${label}`}
      width={620}
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
        <Input label="1º Vencimento *" type="date" value={form.primeiroVencimento} onChange={e => f('primeiroVencimento', e.target.value)} />
      </FormRow>

      <FormRow>
        <Input
          label="Número de Parcelas"
          type="number"
          min="1" max="60"
          value={form.qtdParcelas}
          onChange={e => f('qtdParcelas', e.target.value)}
          hint="1 = à vista. 2+ = parcelado mensalmente."
        />
        <div />
      </FormRow>

      {/* Preview de parcelas */}
      {previewParcelas.length > 0 && (
        <div style={{
          background: C.bg, borderRadius: 8, border: '1px solid ' + C.border,
          padding: '12px 14px', marginBottom: 16, maxHeight: 200, overflowY: 'auto',
        }}>
          <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Parcelas geradas
          </p>
          {previewParcelas.map(p => (
            <div key={p.numero} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 12, color: C.text, padding: '4px 0',
              borderBottom: '1px solid ' + C.border + '40',
            }}>
              <span style={{ color: C.textMuted }}>Parcela {p.numero} — {fmtData(p.vencimento)}</span>
              <span style={{ fontWeight: 600, color: tipo === 'PAGAR' ? C.debit : C.credit }}>
                {fmtBRLFull(p.valor)}
              </span>
            </div>
          ))}
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
  const [form, setForm] = useState({
    contaId:       '',
    dataPagamento: hoje(),
    valorPago:     maskMoeda(Number(parcela.valor) || 0),
    juros:         '',
    multa:         '',
    desconto:      '',
  })
  const [erro, setErro] = useState('')

  const baixar = (trpc as any).fin.parcela.baixar.useMutation({
    onSuccess,
    onError: (e: any) => setErro(e.message ?? 'Erro ao registrar pagamento'),
  })

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  function submit() {
    setErro('')
    if (!form.contaId) return setErro('Selecione a conta bancária')
    const vp = parseMoeda(form.valorPago)
    if (vp <= 0) return setErro('Valor pago deve ser maior que zero')

    baixar.mutate({
      parcelaId:     parcela.parcelaId,
      contaId:       parseInt(form.contaId),
      dataPagamento: form.dataPagamento,
      valorPago:     vp,
      juros:         parseMoeda(form.juros)    || 0,
      multa:         parseMoeda(form.multa)    || 0,
      desconto:      parseMoeda(form.desconto) || 0,
    })
  }

  const tipo = parcela.tipo as 'PAGAR' | 'RECEBER'

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Registrar Pagamento"
      width={460}
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
      <div style={{
        background: C.bg, borderRadius: 8, border: '1px solid ' + C.border,
        padding: '12px 14px', marginBottom: 20,
      }}>
        <p style={{ margin: 0, color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Parcela
        </p>
        <p style={{ margin: '4px 0 0', color: C.text, fontSize: 14, fontWeight: 600 }}>
          {parcela.descricao}
        </p>
        <p style={{ margin: '4px 0 0', color: C.textMuted, fontSize: 12 }}>
          Vencimento: <strong>{fmtData(parcela.vencimento)}</strong>{' '}
          · Valor original:{' '}
          <strong style={{ color: tipo === 'PAGAR' ? C.debit : C.credit }}>
            {fmtBRLFull(Number(parcela.valor))}
          </strong>
        </p>
      </div>

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
        <InputMoeda label="Valor Pago *" value={form.valorPago} onChange={v => f('valorPago', v)} />
      </FormRow>

      <div style={{ marginBottom: 6 }}>
        <label style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Encargos e Descontos
        </label>
      </div>
      <FormRow cols={3}>
        <InputMoeda label="Juros" value={form.juros} onChange={v => f('juros', v)} />
        <InputMoeda label="Multa" value={form.multa} onChange={v => f('multa', v)} />
        <InputMoeda label="Desconto" value={form.desconto} onChange={v => f('desconto', v)} />
      </FormRow>
    </Modal>
  )
}

// ─── TAB TRANSFERÊNCIAS ───────────────────────────────────────────────────────

function TabTransferencias() {
  const [dataIni, setDataIni]             = useState(mesAtualIni())
  const [dataFim, setDataFim]             = useState('')
  const [showNova, setShowNova]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [deleteErro, setDeleteErro]       = useState('')
  const [erro, setErro]                   = useState('')

  const { data: transferencias = [], isLoading, refetch } = (trpc as any).fin.transferencia.list.useQuery({
    dataIni: dataIni || undefined,
    dataFim: dataFim || undefined,
  }, { staleTime: 0 })

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
            { key: 'acoes',     label: '',      align: 'right', width: '60px' },
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
              <Btn
                size="sm" variant="danger"
                onClick={() => { setDeleteErro(''); setConfirmDelete(t) }}
                title="Excluir transferência"
              >✕</Btn>
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

  const qOpts = { staleTime: 0 }
  const filter = { dataIni: dataIni || undefined, dataFim: dataFim || undefined }

  const { data: pagas = [],          isLoading: l1 } = (trpc as any).fin.titulo.list.useQuery({ tipo: 'PAGAR',   status: 'PAGA', ...filter }, qOpts)
  const { data: recebidas = [],      isLoading: l2 } = (trpc as any).fin.titulo.list.useQuery({ tipo: 'RECEBER', status: 'PAGA', ...filter }, qOpts)
  const { data: transferencias = [], isLoading: l3 } = (trpc as any).fin.transferencia.list.useQuery(filter, qOpts)

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
