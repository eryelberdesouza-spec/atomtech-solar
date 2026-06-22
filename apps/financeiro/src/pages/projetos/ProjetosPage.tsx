import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import {
  PageWrapper, SectionHeader, Card, Btn, Table, Badge, Modal,
  Input, InputMoeda, Select, Textarea, FormRow, Spinner, EmptyState, C, Alert,
} from '../../components/ui'
import { maskMoeda, parseMoeda } from '../../lib/masks'

export function ProjetosPage() {
  const navigate = useNavigate()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', centroCustoId: '', valorContrato: '', observacoes: '' })
  const [erro, setErro] = useState('')

  const { data: projetos = [], isLoading, refetch } = (trpc as any).fin.projeto.list.useQuery()
  const { data: centrosCusto = [] } = (trpc as any).fin.centroCusto.list.useQuery()

  const create = (trpc as any).fin.projeto.create.useMutation({
    onSuccess: () => { refetch(); setModal(false); setForm({ nome: '', centroCustoId: '', valorContrato: '', observacoes: '' }) },
    onError: (e: any) => setErro(e.message),
  })

  function openNew() { setForm({ nome: '', centroCustoId: '', valorContrato: '', observacoes: '' }); setErro(''); setModal(true) }

  function save() {
    setErro('')
    if (!form.nome.trim()) return setErro('Informe o nome do projeto')
    if (!form.centroCustoId) return setErro('Selecione o centro de custo')
    const valor = parseMoeda(form.valorContrato)
    if (!valor || valor <= 0) return setErro('Informe o valor do contrato')
    create.mutate({
      nome: form.nome.trim(),
      centroCustoId: parseInt(form.centroCustoId),
      valorContrato: valor,
      observacoes: form.observacoes || undefined,
    })
  }

  const rows = projetos.map((p: any) => ({
    nome: (
      <div>
        <div style={{ color: C.text, fontWeight: 600 }}>{p.nome}</div>
        <div style={{ color: C.textDim, fontSize: 11 }}>{p.centroCodigo} — {p.centroNome}</div>
      </div>
    ),
    contrato: <span style={{ color: C.text, fontWeight: 700 }}>{maskMoeda(p.valorContrato)}</span>,
    gasto: <span style={{ color: C.debit, fontWeight: 600 }}>{maskMoeda(p.totalGasto)}</span>,
    margem: (
      <span style={{ color: p.margem >= 0 ? C.success : C.danger, fontWeight: 700 }}>
        {maskMoeda(p.margem)}
      </span>
    ),
    status: <Badge status={p.status === 'ABERTO' ? 'ativo' : 'inativo'} label={p.status === 'ABERTO' ? 'Aberto' : 'Encerrado'} />,
    acoes: (
      <Btn size="sm" variant="ghost" onClick={() => navigate(`/projetos/${p.id}`)}>Abrir Painel</Btn>
    ),
  }))

  return (
    <PageWrapper>
      <SectionHeader
        title="Projetos"
        action={<Btn onClick={openNew}>+ Novo Projeto</Btn>}
      />

      <Alert type="info">
        Um Projeto representa o orçamento de um serviço ou contrato (ex: instalação fotovoltaica de um
        cliente). Vincule-o a um Centro de Custo — todo lançamento de despesa feito nesse centro entra
        automaticamente na soma de gastos do projeto.
      </Alert>

      <Card style={{ marginTop: 20 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : projetos.length === 0 ? (
          <EmptyState icon="📁" title="Nenhum projeto cadastrado" action={<Btn onClick={openNew}>+ Criar Projeto</Btn>} />
        ) : (
          <Table
            columns={[
              { key: 'nome',     label: 'Projeto / Centro de Custo' },
              { key: 'contrato', label: 'Valor do Contrato', width: '160px' },
              { key: 'gasto',    label: 'Total Gasto',       width: '140px' },
              { key: 'margem',   label: 'Margem',            width: '140px' },
              { key: 'status',   label: 'Status',            width: '100px' },
              { key: 'acoes',    label: '',                  width: '140px', align: 'right' },
            ]}
            rows={rows}
            onRowClick={(i) => navigate(`/projetos/${projetos[i].id}`)}
          />
        )}
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Novo Projeto"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={create.isLoading}>Salvar</Btn>
          </>
        }
      >
        {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}

        <FormRow cols={1}>
          <Input
            label="Nome do Projeto *"
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Instalação Fotovoltaica — Cliente X"
          />
        </FormRow>

        <FormRow>
          <Select
            label="Centro de Custo *"
            value={form.centroCustoId}
            onChange={e => setForm({ ...form, centroCustoId: e.target.value })}
            placeholder="— Selecione —"
            options={centrosCusto.map((c: any) => ({ value: String(c.id), label: `${c.codigo} — ${c.nome}` }))}
            hint="Crie o centro de custo em Configurações se ainda não existir"
          />
          <InputMoeda
            label="Valor do Contrato *"
            value={form.valorContrato}
            onChange={v => setForm({ ...form, valorContrato: v })}
          />
        </FormRow>

        <Textarea
          label="Observações"
          value={form.observacoes}
          onChange={e => setForm({ ...form, observacoes: e.target.value })}
          style={{ minHeight: 70 }}
        />
      </Modal>
    </PageWrapper>
  )
}
