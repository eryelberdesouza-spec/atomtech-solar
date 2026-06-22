import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { trpc } from '../../lib/trpc'
import {
  PageWrapper, SectionHeader, Card, Btn, KpiCard, Table, Badge, Modal,
  Input, InputMoeda, Textarea, FormRow, Spinner, C, Alert,
} from '../../components/ui'
import { maskMoeda, parseMoeda } from '../../lib/masks'

const PIE_COLORS = ['#10B981', '#60A5FA', '#FBBF24', '#A78BFA', '#F87171', '#34D399', '#F59E0B']

export function ProjetoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const projetoId = Number(id)

  const [modalEditar, setModalEditar] = useState(false)
  const [form, setForm] = useState({ nome: '', valorContrato: '', observacoes: '' })
  const [erro, setErro] = useState('')

  const { data: projeto, isLoading, refetch } = (trpc as any).fin.projeto.byId.useQuery({ id: projetoId })

  const update = (trpc as any).fin.projeto.update.useMutation({
    onSuccess: () => { refetch(); setModalEditar(false) },
    onError: (e: any) => setErro(e.message),
  })
  const toggleStatus = (trpc as any).fin.projeto.toggleStatus.useMutation({ onSuccess: () => refetch() })

  function openEditar() {
    if (!projeto) return
    setForm({ nome: projeto.nome, valorContrato: maskMoeda(projeto.valorContrato), observacoes: projeto.observacoes ?? '' })
    setErro('')
    setModalEditar(true)
  }

  function salvar() {
    setErro('')
    if (!form.nome.trim()) return setErro('Informe o nome')
    const valor = parseMoeda(form.valorContrato)
    if (!valor || valor <= 0) return setErro('Informe o valor do contrato')
    update.mutate({ id: projetoId, nome: form.nome.trim(), valorContrato: valor, observacoes: form.observacoes || undefined })
  }

  if (isLoading || !projeto) {
    return <PageWrapper><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div></PageWrapper>
  }

  const pctConsumido = projeto.valorContrato > 0 ? Math.min(100, (projeto.totalGasto / projeto.valorContrato) * 100) : 0
  const corBarra = pctConsumido >= 100 ? C.danger : pctConsumido >= 80 ? C.warning : C.emerald

  const pieData = projeto.categorias
    .filter((c: any) => c.total > 0)
    .map((c: any) => ({ name: c.categoriaNome, value: c.total }))

  const lancamentosRows = projeto.lancamentos.map((l: any) => ({
    descricao: <span style={{ color: C.text }}>{l.descricao}</span>,
    categoria: <span style={{ color: C.textMuted, fontSize: 12 }}>{l.categoriaNome ?? '—'}</span>,
    pessoa:    <span style={{ color: C.textMuted, fontSize: 12 }}>{l.pessoaNome ?? '—'}</span>,
    emissao:   <span style={{ color: C.textMuted, fontSize: 12 }}>{new Date(l.emissao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>,
    valor:     <span style={{ color: C.debit, fontWeight: 600 }}>{maskMoeda(l.valor)}</span>,
  }))

  return (
    <PageWrapper>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Btn size="sm" variant="ghost" onClick={() => navigate('/projetos')}>← Voltar</Btn>
      </div>

      <SectionHeader
        title={projeto.nome}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge status={projeto.status === 'ABERTO' ? 'ativo' : 'inativo'} label={projeto.status === 'ABERTO' ? 'Aberto' : 'Encerrado'} />
            <Btn variant="ghost" onClick={openEditar}>✏ Editar</Btn>
            <Btn
              variant={projeto.status === 'ABERTO' ? 'danger' : 'success'}
              onClick={() => toggleStatus.mutate({ id: projetoId, status: projeto.status === 'ABERTO' ? 'ENCERRADO' : 'ABERTO' })}
            >
              {projeto.status === 'ABERTO' ? 'Encerrar Projeto' : 'Reabrir Projeto'}
            </Btn>
          </div>
        }
      />

      <p style={{ color: C.textMuted, fontSize: 12, marginTop: -16, marginBottom: 16 }}>
        Centro de Custo: {projeto.centroCodigo} — {projeto.centroNome}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <KpiCard label="Valor do Contrato" value={maskMoeda(projeto.valorContrato)} icon="📄" color={C.info} />
        <KpiCard label="Total Gasto" value={maskMoeda(projeto.totalGasto)} icon="💸" color={C.debit} />
        <KpiCard
          label="Margem Atual"
          value={maskMoeda(projeto.margem)}
          icon={projeto.margem >= 0 ? '📈' : '📉'}
          color={projeto.margem >= 0 ? C.success : C.danger}
        />
      </div>

      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: C.textMuted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Orçamento Consumido
          </span>
          <span style={{ color: corBarra, fontWeight: 800, fontSize: 13 }}>{pctConsumido.toFixed(1)}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 6, background: C.bg, border: '1px solid ' + C.border, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pctConsumido}%`, background: corBarra, transition: 'width 0.3s' }} />
        </div>
        {pctConsumido >= 100 && (
          <p style={{ color: C.danger, fontSize: 12, marginTop: 8 }}>⚠ O total gasto já superou o valor do contrato.</p>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, marginBottom: 20 }}>
        <Card style={{ padding: 20 }}>
          <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: '0 0 12px' }}>Gastos por Categoria</h3>
          {pieData.length === 0 ? (
            <p style={{ color: C.textMuted, fontSize: 12 }}>Nenhum gasto lançado ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {pieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => maskMoeda(Number(v))} contentStyle={{ background: C.bgCard, border: '1px solid ' + C.border, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={{ marginTop: 8 }}>
            {pieData.map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span style={{ color: C.textMuted, flex: 1 }}>{p.name}</span>
                <span style={{ color: C.text, fontWeight: 600 }}>{maskMoeda(p.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: '0 0 12px' }}>Lançamentos do Projeto</h3>
          <Table
            columns={[
              { key: 'descricao', label: 'Descrição' },
              { key: 'categoria', label: 'Categoria', width: '140px' },
              { key: 'pessoa',    label: 'Fornecedor', width: '160px' },
              { key: 'emissao',   label: 'Emissão',    width: '100px' },
              { key: 'valor',     label: 'Valor',      width: '120px', align: 'right' },
            ]}
            rows={lancamentosRows}
            emptyMessage="Nenhum lançamento de despesa vinculado a este centro de custo ainda."
          />
        </Card>
      </div>

      <Modal
        open={modalEditar}
        onClose={() => setModalEditar(false)}
        title="Editar Projeto"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setModalEditar(false)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={update.isLoading}>Salvar</Btn>
          </>
        }
      >
        {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}
        <FormRow cols={1}>
          <Input label="Nome do Projeto *" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
        </FormRow>
        <FormRow cols={1}>
          <InputMoeda label="Valor do Contrato *" value={form.valorContrato} onChange={v => setForm({ ...form, valorContrato: v })} />
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
