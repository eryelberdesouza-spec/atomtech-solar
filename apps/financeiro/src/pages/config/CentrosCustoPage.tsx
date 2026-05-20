import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import {
  PageWrapper, SectionHeader, Card, Btn, Table, Badge, Modal,
  Input, Textarea, FormRow, Spinner, EmptyState, C, Alert,
} from '../../components/ui'

interface CCForm { codigo: string; nome: string; descricao: string }
const EMPTY: CCForm = { codigo: '', nome: '', descricao: '' }

export function CentrosCustoPage() {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<CCForm>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  const { data: centros = [], isLoading, refetch } = (trpc as any).fin.centroCusto.list.useQuery()
  const create = (trpc as any).fin.centroCusto.create.useMutation({ onSuccess: () => { refetch(); setModal(false); setForm(EMPTY) }, onError: (e: any) => setErro(e.message) })
  const update = (trpc as any).fin.centroCusto.update.useMutation({ onSuccess: () => { refetch(); setModal(false); setEditId(null) }, onError: (e: any) => setErro(e.message) })
  const toggle = (trpc as any).fin.centroCusto.toggle.useMutation({ onSuccess: () => refetch() })

  function openNew() { setForm(EMPTY); setEditId(null); setErro(''); setModal(true) }
  function openEdit(c: any) {
    setForm({ codigo: c.codigo, nome: c.nome, descricao: c.descricao ?? '' })
    setEditId(c.id); setErro(''); setModal(true)
  }

  function save() {
    setErro('')
    if (!form.codigo.trim()) { setErro('Informe o código'); return }
    if (!form.nome.trim()) { setErro('Informe o nome'); return }
    const payload = { codigo: form.codigo.trim().toUpperCase(), nome: form.nome.trim(), descricao: form.descricao || null }
    if (editId) update.mutate({ id: editId, ...payload })
    else create.mutate(payload)
  }

  const CC_BADGE: Record<string, string> = {
    ADM: '#60A5FA', COM: '#FBBF24', OPS: '#34D399',
  }

  const rows = centros.map((c: any) => ({
    codigo: (
      <span style={{
        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800,
        background: (CC_BADGE[c.codigo] ?? C.emerald) + '18',
        color: CC_BADGE[c.codigo] ?? C.emerald,
        fontFamily: 'monospace', letterSpacing: '0.06em',
      }}>{c.codigo}</span>
    ),
    nome: <span style={{ color: C.text, fontWeight: 600 }}>{c.nome}</span>,
    descricao: <span style={{ color: C.textMuted, fontSize: 12 }}>{c.descricao ?? '—'}</span>,
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
        title="Centros de Custo"
        action={<Btn onClick={openNew}>+ Novo Centro</Btn>}
      />

      <Alert type="info">
        Centros de custo permitem analisar ganhos e perdas por área ou projeto. Cada lançamento pode ser classificado em um centro de custo para relatórios segmentados.
      </Alert>

      <Card style={{ marginTop: 20 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : centros.length === 0 ? (
          <EmptyState icon="🏷️" title="Nenhum centro cadastrado" action={<Btn onClick={openNew}>+ Criar Centro</Btn>} />
        ) : (
          <Table
            columns={[
              { key: 'codigo',    label: 'Código',    width: '120px' },
              { key: 'nome',      label: 'Nome' },
              { key: 'descricao', label: 'Descrição' },
              { key: 'status',    label: 'Status',    width: '100px' },
              { key: 'acoes',     label: '',          width: '160px', align: 'right' },
            ]}
            rows={rows}
          />
        )}
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
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
            onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
            placeholder="Ex: ADM, COM, OPS, PRJ-001"
            hint="Use siglas curtas em maiúsculas"
          />
          <Input
            label="Nome *"
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Administrativo"
          />
        </FormRow>

        <Textarea
          label="Descrição"
          value={form.descricao}
          onChange={e => setForm({ ...form, descricao: e.target.value })}
          placeholder="Descreva o propósito deste centro de custo"
          style={{ minHeight: 70 }}
        />
      </Modal>
    </PageWrapper>
  )
}
