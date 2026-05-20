import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import {
  PageWrapper, SectionHeader, Card, Btn, Modal, Input, Select,
  FormRow, Spinner, C, Alert, EmptyState,
} from '../../components/ui'

const TIPO_OPTIONS = [
  { value: 'RECEITA',   label: '↑ Receita' },
  { value: 'DESPESA',   label: '↓ Despesa' },
  { value: 'FINANCEIRO',label: '⇄ Financeiro' },
]

const TIPO_COLORS: Record<string, string> = {
  RECEITA:    '#34D399',
  DESPESA:    '#F87171',
  FINANCEIRO: '#60A5FA',
}

interface PlanoForm { codigo: string; nome: string; tipo: string; paiId: string }
const EMPTY_FORM: PlanoForm = { codigo: '', nome: '', tipo: 'DESPESA', paiId: '' }

function PlanoNode({ conta, all, level = 0, onEdit, onToggle }: any) {
  const [expanded, setExpanded] = useState(true)
  const filhos = all.filter((a: any) => a.paiId === conta.id)
  const color = TIPO_COLORS[conta.tipo] ?? C.textMuted

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 16px',
          paddingLeft: 16 + level * 24,
          borderBottom: '1px solid ' + C.border + '50',
          opacity: conta.ativo ? 1 : 0.45,
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = C.bgHover)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Expander */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: 20, height: 20, borderRadius: 4, border: 'none',
            background: filhos.length ? C.bgHover : 'transparent',
            color: filhos.length ? C.textMuted : 'transparent',
            cursor: filhos.length ? 'pointer' : 'default',
            fontSize: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {filhos.length > 0 ? (expanded ? '▾' : '▸') : ''}
        </button>

        {/* Código */}
        <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim, minWidth: 60, fontFamily: 'monospace' }}>
          {conta.codigo}
        </span>

        {/* Nome */}
        <span style={{
          flex: 1, fontSize: 13, color: C.text,
          fontWeight: level === 0 ? 700 : 400,
        }}>
          {conta.nome}
        </span>

        {/* Tipo */}
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          background: color + '15', color,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          minWidth: 90, textAlign: 'center',
        }}>
          {conta.tipo}
        </span>

        {/* Ações */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <Btn size="sm" variant="ghost" onClick={() => onEdit(conta)}>Editar</Btn>
          <Btn size="sm" variant={conta.ativo ? 'danger' : 'success'} onClick={() => onToggle(conta)}>
            {conta.ativo ? 'Inativar' : 'Ativar'}
          </Btn>
        </div>
      </div>

      {/* Filhos */}
      {expanded && filhos.map((filho: any) => (
        <PlanoNode key={filho.id} conta={filho} all={all} level={level + 1} onEdit={onEdit} onToggle={onToggle} />
      ))}
    </div>
  )
}

export function PlanoContasPage() {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<PlanoForm>(EMPTY_FORM)
  const [editId, setEditId] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  const { data: contas = [], isLoading, refetch } = (trpc as any).fin.planoContas.list.useQuery()
  const create = (trpc as any).fin.planoContas.create.useMutation({ onSuccess: () => { refetch(); setModal(false); setForm(EMPTY_FORM) }, onError: (e: any) => setErro(e.message) })
  const update = (trpc as any).fin.planoContas.update.useMutation({ onSuccess: () => { refetch(); setModal(false); setEditId(null) }, onError: (e: any) => setErro(e.message) })
  const toggle = (trpc as any).fin.planoContas.toggle.useMutation({ onSuccess: () => refetch() })

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setErro(''); setModal(true) }
  function openEdit(c: any) {
    setForm({ codigo: c.codigo, nome: c.nome, tipo: c.tipo, paiId: c.paiId?.toString() ?? '' })
    setEditId(c.id); setErro(''); setModal(true)
  }

  function save() {
    setErro('')
    if (!form.codigo.trim()) { setErro('Informe o código'); return }
    if (!form.nome.trim()) { setErro('Informe o nome'); return }
    const payload = {
      codigo: form.codigo.trim(), nome: form.nome.trim(),
      tipo: form.tipo, paiId: form.paiId ? parseInt(form.paiId) : null,
    }
    if (editId) update.mutate({ id: editId, ...payload })
    else create.mutate(payload)
  }

  // Raízes (sem pai)
  const raizes = contas.filter((c: any) => !c.paiId)
  const grupos = contas.filter((c: any) => !c.paiId)

  const paiOptions = [
    { value: '', label: '(sem grupo pai — conta raiz)' },
    ...contas.filter((c: any) => !c.paiId || true).map((c: any) => ({
      value: c.id.toString(),
      label: `${c.codigo} — ${c.nome}`,
    })),
  ]

  return (
    <PageWrapper>
      <SectionHeader
        title="Plano de Contas"
        action={<Btn onClick={openNew}>+ Nova Conta</Btn>}
      />

      <Alert type="info">
        O Plano de Contas classifica todas as movimentações financeiras. Contas de grupo (sem pai) organizam subcontas. Todo lançamento é vinculado a uma subconta.
      </Alert>

      <Card style={{ marginTop: 20, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : contas.length === 0 ? (
          <EmptyState
            icon="📊"
            title="Plano de Contas vazio"
            description="O sistema inseriu o plano padrão. Verifique a migração."
            action={<Btn onClick={openNew}>+ Criar Conta</Btn>}
          />
        ) : (
          <>
            {/* Cabeçalho */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', background: C.bgHover,
              borderBottom: '1px solid ' + C.border,
            }}>
              <span style={{ width: 20 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 60 }}>Código</span>
              <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nome</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 90 }}>Tipo</span>
              <span style={{ width: 160 }} />
            </div>
            {raizes.map((conta: any) => (
              <PlanoNode
                key={conta.id}
                conta={conta}
                all={contas}
                level={0}
                onEdit={openEdit}
                onToggle={(c: any) => toggle.mutate({ id: c.id, ativo: !c.ativo })}
              />
            ))}
          </>
        )}
      </Card>

      {/* Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editId ? 'Editar Conta' : 'Nova Conta'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={create.isLoading || update.isLoading}>Salvar</Btn>
          </>
        }
      >
        {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}

        <FormRow cols={2}>
          <Input
            label="Código *"
            value={form.codigo}
            onChange={e => setForm({ ...form, codigo: e.target.value })}
            placeholder="Ex: 2.1.1"
            hint="Use ponto para hierarquia: 1, 1.1, 1.1.1"
          />
          <Select
            label="Tipo *"
            value={form.tipo}
            onChange={e => setForm({ ...form, tipo: e.target.value })}
            options={TIPO_OPTIONS}
          />
        </FormRow>

        <div style={{ marginBottom: 16 }}>
          <Input
            label="Nome *"
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Folha de Pagamento"
          />
        </div>

        <Select
          label="Grupo Pai"
          value={form.paiId}
          onChange={e => setForm({ ...form, paiId: e.target.value })}
          options={paiOptions}
          hint="Selecione um grupo pai para criar uma subconta"
        />
      </Modal>
    </PageWrapper>
  )
}
