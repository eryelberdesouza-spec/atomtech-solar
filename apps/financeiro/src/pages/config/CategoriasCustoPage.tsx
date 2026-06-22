import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import {
  PageWrapper, SectionHeader, Card, Btn, Table, Badge, Modal,
  Input, FormRow, Spinner, EmptyState, C, Alert,
} from '../../components/ui'

export function CategoriasCustoPage() {
  const [modal, setModal] = useState(false)
  const [nome, setNome] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  const { data: categorias = [], isLoading, refetch } = (trpc as any).fin.categoriaCusto.list.useQuery()
  const create = (trpc as any).fin.categoriaCusto.create.useMutation({ onSuccess: () => { refetch(); setModal(false); setNome('') }, onError: (e: any) => setErro(e.message) })
  const update = (trpc as any).fin.categoriaCusto.update.useMutation({ onSuccess: () => { refetch(); setModal(false); setEditId(null) }, onError: (e: any) => setErro(e.message) })
  const toggle = (trpc as any).fin.categoriaCusto.toggle.useMutation({ onSuccess: () => refetch() })

  function openNew() { setNome(''); setEditId(null); setErro(''); setModal(true) }
  function openEdit(c: any) { setNome(c.nome); setEditId(c.id); setErro(''); setModal(true) }

  function save() {
    setErro('')
    if (!nome.trim()) { setErro('Informe o nome'); return }
    if (editId) update.mutate({ id: editId, nome: nome.trim() })
    else create.mutate({ nome: nome.trim() })
  }

  const rows = categorias.map((c: any) => ({
    nome:   <span style={{ color: C.text, fontWeight: 600 }}>{c.nome}</span>,
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
        title="Categorias de Custo"
        action={<Btn onClick={openNew}>+ Nova Categoria</Btn>}
      />

      <Alert type="info">
        Categorias de custo classificam cada gasto dentro de um Projeto (ex: Material, Mão de obra,
        Projeto técnico, Administrativo, Impostos). Use-as ao lançar uma conta a pagar vinculada a um
        centro de custo para acompanhar o breakdown de gastos do projeto.
      </Alert>

      <Card style={{ marginTop: 20 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : categorias.length === 0 ? (
          <EmptyState icon="🧾" title="Nenhuma categoria cadastrada" action={<Btn onClick={openNew}>+ Criar Categoria</Btn>} />
        ) : (
          <Table
            columns={[
              { key: 'nome',   label: 'Nome' },
              { key: 'status', label: 'Status', width: '100px' },
              { key: 'acoes',  label: '',       width: '160px', align: 'right' },
            ]}
            rows={rows}
          />
        )}
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editId ? 'Editar Categoria de Custo' : 'Nova Categoria de Custo'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={create.isLoading || update.isLoading}>Salvar</Btn>
          </>
        }
      >
        {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}

        <FormRow cols={1}>
          <Input
            label="Nome *"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Material, Mão de obra, Projeto técnico, Administrativo, Impostos"
          />
        </FormRow>
      </Modal>
    </PageWrapper>
  )
}
