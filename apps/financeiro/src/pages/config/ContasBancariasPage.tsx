import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import {
  PageWrapper, SectionHeader, Card, Btn, Table, Badge, Modal,
  Input, Select, InputMoeda, FormRow, Spinner, EmptyState, C, Alert,
} from '../../components/ui'
import { fmtBRLFull, maskMoeda } from '../../lib/masks'

const TIPO_OPTIONS = [
  { value: 'CORRENTE', label: 'Conta Corrente' },
  { value: 'POUPANCA', label: 'Conta Poupança' },
  { value: 'CAIXA',    label: 'Caixa (dinheiro em espécie)' },
]

interface ContaForm {
  nome: string
  tipo: string
  banco: string
  agencia: string
  conta: string
  saldoInicial: string
  ativo: boolean
}

const EMPTY_FORM: ContaForm = { nome: '', tipo: 'CORRENTE', banco: '', agencia: '', conta: '', saldoInicial: '', ativo: true }

export function ContasBancariasPage() {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<ContaForm>(EMPTY_FORM)
  const [editId, setEditId] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  const { data: contas = [], isLoading, refetch } = (trpc as any).fin.conta.list.useQuery()

  const create = (trpc as any).fin.conta.create.useMutation({ onSuccess: () => { refetch(); setModal(false); setForm(EMPTY_FORM) }, onError: (e: any) => setErro(e.message) })
  const update = (trpc as any).fin.conta.update.useMutation({ onSuccess: () => { refetch(); setModal(false); setForm(EMPTY_FORM); setEditId(null) }, onError: (e: any) => setErro(e.message) })
  const toggle = (trpc as any).fin.conta.toggle.useMutation({ onSuccess: () => refetch() })

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setErro(''); setModal(true) }
  function openEdit(c: any) {
    setForm({
      nome: c.nome, tipo: c.tipo, banco: c.banco ?? '',
      agencia: c.agencia ?? '', conta: c.conta ?? '',
      saldoInicial: maskMoeda(Number(c.saldoInicial ?? 0)), ativo: c.ativo,
    })
    setEditId(c.id); setErro(''); setModal(true)
  }

  function save() {
    setErro('')
    if (!form.nome.trim()) { setErro('Informe o nome da conta'); return }
    if (!form.tipo) { setErro('Selecione o tipo'); return }
    const payload = {
      nome: form.nome.trim(), tipo: form.tipo,
      banco: form.banco || null, agencia: form.agencia || null,
      conta: form.conta || null,
      saldoInicial: form.saldoInicial ? parseFloat(form.saldoInicial.replace(/[R$\s.]/g, '').replace(',', '.')) : 0,
      ativo: form.ativo,
    }
    if (editId) update.mutate({ id: editId, ...payload })
    else create.mutate(payload)
  }

  const rows = contas.map((c: any) => ({
    nome: (
      <div>
        <div style={{ color: C.text, fontWeight: 600 }}>{c.nome}</div>
        {c.banco && <div style={{ color: C.textMuted, fontSize: 11, marginTop: 1 }}>{c.banco}{c.agencia ? ` · Ag. ${c.agencia}` : ''}{c.conta ? ` · Cc. ${c.conta}` : ''}</div>}
      </div>
    ),
    tipo: <Badge status={c.tipo} />,
    saldo: <span style={{ color: C.credit, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtBRLFull(Number(c.saldoInicial ?? 0))}</span>,
    status: <Badge status={c.ativo ? 'ativo' : 'inativo'} />,
    acoes: (
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn size="sm" variant="ghost" onClick={() => openEdit(c)}>Editar</Btn>
        <Btn size="sm" variant={c.ativo ? 'danger' : 'success'} onClick={() => toggle.mutate({ id: c.id, ativo: !c.ativo })}>
          {c.ativo ? 'Inativar' : 'Ativar'}
        </Btn>
      </div>
    ),
  }))

  return (
    <PageWrapper>
      <SectionHeader
        title="Contas Bancárias"
        action={<Btn onClick={openNew}>+ Nova Conta</Btn>}
      />

      <Alert type="info">
        O <strong>Saldo Inicial</strong> representa o valor da conta no momento de entrada no sistema. Após a migração, os saldos serão calculados automaticamente a partir dos lançamentos.
      </Alert>

      <Card style={{ marginTop: 20 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : contas.length === 0 ? (
          <EmptyState
            icon="🏦"
            title="Nenhuma conta cadastrada"
            description="Cadastre suas contas bancárias para começar a controlar o fluxo de caixa"
            action={<Btn onClick={openNew}>+ Cadastrar Conta</Btn>}
          />
        ) : (
          <Table
            columns={[
              { key: 'nome',   label: 'Conta' },
              { key: 'tipo',   label: 'Tipo',          width: '140px' },
              { key: 'saldo',  label: 'Saldo Inicial',  align: 'right', width: '160px' },
              { key: 'status', label: 'Status',         width: '100px' },
              { key: 'acoes',  label: '',               width: '160px', align: 'right' },
            ]}
            rows={rows}
          />
        )}
      </Card>

      {/* Resumo de saldos */}
      {contas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 20 }}>
          {contas.filter((c: any) => c.ativo).map((c: any) => (
            <Card key={c.id} accent={C.emerald} style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                {c.nome}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.credit }}>
                {fmtBRLFull(Number(c.saldoInicial ?? 0))}
              </div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>
                {TIPO_OPTIONS.find(t => t.value === c.tipo)?.label}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editId ? 'Editar Conta' : 'Nova Conta Bancária'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={create.isLoading || update.isLoading}>
              {create.isLoading || update.isLoading ? 'Salvando...' : 'Salvar'}
            </Btn>
          </>
        }
      >
        {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}

        <FormRow cols={2}>
          <Input
            label="Nome da Conta *"
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Inter PJ, Sicoob Principal, Caixa"
          />
          <Select
            label="Tipo *"
            value={form.tipo}
            onChange={e => setForm({ ...form, tipo: e.target.value })}
            options={TIPO_OPTIONS}
          />
        </FormRow>

        {form.tipo !== 'CAIXA' && (
          <FormRow cols={3}>
            <Input
              label="Banco"
              value={form.banco}
              onChange={e => setForm({ ...form, banco: e.target.value })}
              placeholder="Ex: Banco Inter"
              style={{ gridColumn: '1 / 2' }}
            />
            <Input
              label="Agência"
              value={form.agencia}
              onChange={e => setForm({ ...form, agencia: e.target.value })}
              placeholder="0001"
            />
            <Input
              label="Conta"
              value={form.conta}
              onChange={e => setForm({ ...form, conta: e.target.value })}
              placeholder="12345-6"
            />
          </FormRow>
        )}

        <InputMoeda
          label="Saldo Inicial (saldo atual na conta)"
          value={form.saldoInicial}
          onChange={v => setForm({ ...form, saldoInicial: v })}
          hint="Informe o saldo atual da conta. Lançamentos importados ajustarão o saldo."
        />
      </Modal>
    </PageWrapper>
  )
}
