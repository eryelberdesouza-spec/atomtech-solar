import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import {
  PageWrapper, SectionHeader, Card, Btn, Table, Badge, Modal,
  Input, Select, InputCpfCnpj, InputTelefone, InputCep,
  FormRow, Spinner, EmptyState, SearchInput, Tabs, C, Alert, Divider, Textarea,
} from '../../components/ui'
import { maskCpfCnpj, maskTelefone } from '../../lib/masks'

const TIPO_PESSOA = [
  { value: 'FISICA',   label: 'Pessoa Física' },
  { value: 'JURIDICA', label: 'Pessoa Jurídica' },
]

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
].map(uf => ({ value: uf, label: uf }))

const REGIME_OPTIONS = [
  { value: 'simples',    label: 'Simples Nacional' },
  { value: 'lucro_presumido', label: 'Lucro Presumido' },
  { value: 'lucro_real', label: 'Lucro Real' },
  { value: 'mei',        label: 'MEI' },
  { value: 'nao_se_aplica', label: 'Não se aplica' },
]

interface PessoaForm {
  tipoPessoa: string; nome: string; fantasia: string; cpfCnpj: string
  email: string; telefone: string; isCliente: boolean; isFornecedor: boolean
  cep: string; logradouro: string; numero: string; complemento: string
  bairro: string; cidade: string; estado: string; regime: string; observacoes: string
}
const EMPTY: PessoaForm = {
  tipoPessoa: 'JURIDICA', nome: '', fantasia: '', cpfCnpj: '',
  email: '', telefone: '', isCliente: true, isFornecedor: false,
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', regime: '', observacoes: '',
}

export function PessoasPage() {
  const [aba, setAba] = useState('todos')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<PessoaForm>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  const { data: pessoas = [], isLoading, refetch } = (trpc as any).fin.pessoa.list.useQuery({ busca })
  const create = (trpc as any).fin.pessoa.create.useMutation({ onSuccess: () => { refetch(); setModal(false); setForm(EMPTY) }, onError: (e: any) => setErro(e.message) })
  const update = (trpc as any).fin.pessoa.update.useMutation({ onSuccess: () => { refetch(); setModal(false); setEditId(null) }, onError: (e: any) => setErro(e.message) })
  const toggle = (trpc as any).fin.pessoa.toggle.useMutation({ onSuccess: () => refetch() })

  function openNew() { setForm(EMPTY); setEditId(null); setErro(''); setModal(true) }
  function openEdit(p: any) {
    setForm({
      tipoPessoa: p.tipoPessoa, nome: p.nome, fantasia: p.fantasia ?? '',
      cpfCnpj: p.cpfCnpj ?? '', email: p.email ?? '', telefone: p.telefone ?? '',
      isCliente: p.isCliente, isFornecedor: p.isFornecedor,
      cep: p.cep ?? '', logradouro: p.logradouro ?? '', numero: p.numero ?? '',
      complemento: p.complemento ?? '', bairro: p.bairro ?? '', cidade: p.cidade ?? '',
      estado: p.estado ?? '', regime: p.regime ?? '', observacoes: p.observacoes ?? '',
    })
    setEditId(p.id); setErro(''); setModal(true)
  }

  function save() {
    setErro('')
    if (!form.nome.trim()) { setErro('Informe o nome'); return }
    if (!form.isCliente && !form.isFornecedor) { setErro('Marque pelo menos: Cliente ou Fornecedor'); return }
    const payload = {
      tipoPessoa: form.tipoPessoa, nome: form.nome.trim(),
      fantasia: form.fantasia || null, cpfCnpj: form.cpfCnpj || null,
      email: form.email || null, telefone: form.telefone || null,
      isCliente: form.isCliente, isFornecedor: form.isFornecedor,
      cep: form.cep || null, logradouro: form.logradouro || null,
      numero: form.numero || null, complemento: form.complemento || null,
      bairro: form.bairro || null, cidade: form.cidade || null,
      estado: form.estado || null, regime: form.regime || null,
      observacoes: form.observacoes || null,
    }
    if (editId) update.mutate({ id: editId, ...payload })
    else create.mutate(payload)
  }

  const filtradas = pessoas.filter((p: any) => {
    if (aba === 'clientes' && !p.isCliente) return false
    if (aba === 'fornecedores' && !p.isFornecedor) return false
    return true
  })

  const clientes = pessoas.filter((p: any) => p.isCliente).length
  const fornecedores = pessoas.filter((p: any) => p.isFornecedor).length

  const rows = filtradas.map((p: any) => ({
    nome: (
      <div>
        <div style={{ color: C.text, fontWeight: 600 }}>{p.nome}</div>
        {p.fantasia && <div style={{ color: C.textMuted, fontSize: 11 }}>{p.fantasia}</div>}
      </div>
    ),
    cpf: <span style={{ color: C.textMuted, fontSize: 12, fontFamily: 'monospace' }}>{p.cpfCnpj ?? '—'}</span>,
    contato: (
      <div style={{ fontSize: 12, color: C.textMuted }}>
        {p.email && <div>{p.email}</div>}
        {p.telefone && <div>{maskTelefone(p.telefone)}</div>}
      </div>
    ),
    tipo: (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {p.isCliente && <Badge status="RECEBER" label="Cliente" />}
        {p.isFornecedor && <Badge status="PAGAR" label="Fornecedor" />}
      </div>
    ),
    status: <Badge status={p.ativo ? 'ativo' : 'inativo'} />,
    acoes: (
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn size="sm" variant="ghost" onClick={() => openEdit(p)}>Editar</Btn>
        <Btn size="sm" variant={p.ativo ? 'danger' : 'success'} onClick={() => toggle.mutate({ id: p.id, ativo: !p.ativo })}>
          {p.ativo ? 'Inativar' : 'Ativar'}
        </Btn>
      </div>
    ),
  }))

  return (
    <PageWrapper>
      <SectionHeader
        title="Pessoas"
        action={<Btn onClick={openNew}>+ Nova Pessoa</Btn>}
      />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'center' }}>
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar por nome, CPF/CNPJ, e-mail..."
          style={{ flex: 1, maxWidth: 400 }}
        />
      </div>

      <Tabs
        tabs={[
          { id: 'todos',        label: 'Todos',        count: pessoas.length },
          { id: 'clientes',     label: 'Clientes',     count: clientes },
          { id: 'fornecedores', label: 'Fornecedores', count: fornecedores },
        ]}
        active={aba}
        onChange={setAba}
      />

      <Card style={{ marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : filtradas.length === 0 ? (
          <EmptyState
            icon={aba === 'clientes' ? '👤' : aba === 'fornecedores' ? '🏪' : '👥'}
            title={busca ? 'Nenhum resultado encontrado' : 'Nenhuma pessoa cadastrada'}
            description={busca ? 'Tente outro termo de busca' : 'Cadastre clientes e fornecedores para vincular aos lançamentos'}
            action={!busca ? <Btn onClick={openNew}>+ Cadastrar Pessoa</Btn> : undefined}
          />
        ) : (
          <Table
            columns={[
              { key: 'nome',    label: 'Nome' },
              { key: 'cpf',     label: 'CPF / CNPJ',  width: '160px' },
              { key: 'contato', label: 'Contato',      width: '200px' },
              { key: 'tipo',    label: 'Tipo',         width: '160px' },
              { key: 'status',  label: 'Status',       width: '90px' },
              { key: 'acoes',   label: '',             width: '160px', align: 'right' },
            ]}
            rows={rows}
          />
        )}
      </Card>

      {/* Modal Cadastro */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editId ? 'Editar Pessoa' : 'Nova Pessoa'}
        width={680}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={create.isLoading || update.isLoading}>Salvar</Btn>
          </>
        }
      >
        {erro && <div style={{ marginBottom: 16 }}><Alert type="danger">{erro}</Alert></div>}

        {/* Tipo de vínculo */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[
            { key: 'isCliente',     label: '👤 Cliente' },
            { key: 'isFornecedor',  label: '🏪 Fornecedor' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setForm({ ...form, [key]: !(form as any)[key] })}
              style={{
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid ' + ((form as any)[key] ? C.emerald : C.border),
                background: (form as any)[key] ? C.emerald + '15' : 'transparent',
                color: (form as any)[key] ? C.emerald : C.textMuted,
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >{label}</button>
          ))}
        </div>

        <Divider label="Dados Principais" />

        <FormRow cols={2}>
          <Select
            label="Tipo de Pessoa *"
            value={form.tipoPessoa}
            onChange={e => setForm({ ...form, tipoPessoa: e.target.value })}
            options={TIPO_PESSOA}
          />
          <InputCpfCnpj
            label={form.tipoPessoa === 'FISICA' ? 'CPF' : 'CNPJ'}
            value={form.cpfCnpj}
            onChange={v => setForm({ ...form, cpfCnpj: v })}
          />
        </FormRow>

        <div style={{ marginBottom: 16 }}>
          <Input
            label={form.tipoPessoa === 'FISICA' ? 'Nome Completo *' : 'Razão Social *'}
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder={form.tipoPessoa === 'FISICA' ? 'Nome completo' : 'Razão social'}
          />
        </div>

        {form.tipoPessoa === 'JURIDICA' && (
          <div style={{ marginBottom: 16 }}>
            <Input
              label="Nome Fantasia"
              value={form.fantasia}
              onChange={e => setForm({ ...form, fantasia: e.target.value })}
              placeholder="Nome fantasia da empresa"
            />
          </div>
        )}

        <FormRow cols={2}>
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="email@exemplo.com.br"
          />
          <InputTelefone
            label="Telefone"
            value={form.telefone}
            onChange={v => setForm({ ...form, telefone: v })}
          />
        </FormRow>

        {form.tipoPessoa === 'JURIDICA' && (
          <div style={{ marginBottom: 16 }}>
            <Select
              label="Regime Tributário"
              value={form.regime}
              onChange={e => setForm({ ...form, regime: e.target.value })}
              options={REGIME_OPTIONS}
              placeholder="Selecionar regime"
            />
          </div>
        )}

        <Divider label="Endereço" />

        <div style={{ marginBottom: 16 }}>
          <InputCep
            label="CEP"
            value={form.cep}
            onChange={v => setForm({ ...form, cep: v })}
            onAddressFound={addr => setForm(f => ({
              ...f,
              logradouro: addr.logradouro,
              bairro: addr.bairro,
              cidade: addr.cidade,
              estado: addr.estado,
            }))}
            hint="Preenchimento automático do endereço ao digitar o CEP"
          />
        </div>

        <FormRow cols={3}>
          <div style={{ gridColumn: '1 / 3' }}>
            <Input
              label="Logradouro"
              value={form.logradouro}
              onChange={e => setForm({ ...form, logradouro: e.target.value })}
              placeholder="Rua, Av., etc."
            />
          </div>
          <Input
            label="Número"
            value={form.numero}
            onChange={e => setForm({ ...form, numero: e.target.value })}
            placeholder="N°"
          />
        </FormRow>

        <FormRow cols={3}>
          <Input
            label="Complemento"
            value={form.complemento}
            onChange={e => setForm({ ...form, complemento: e.target.value })}
            placeholder="Sala, Bloco..."
          />
          <Input
            label="Bairro"
            value={form.bairro}
            onChange={e => setForm({ ...form, bairro: e.target.value })}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Cidade"
                value={form.cidade}
                onChange={e => setForm({ ...form, cidade: e.target.value })}
              />
            </div>
            <div style={{ width: 60 }}>
              <Select
                label="UF"
                value={form.estado}
                onChange={e => setForm({ ...form, estado: e.target.value })}
                options={ESTADOS}
                placeholder="UF"
              />
            </div>
          </div>
        </FormRow>

        <Divider label="Observações" />

        <Textarea
          label="Observações internas"
          value={form.observacoes}
          onChange={e => setForm({ ...form, observacoes: e.target.value })}
          placeholder="Informações adicionais, notas, condições especiais..."
          style={{ minHeight: 70 }}
        />
      </Modal>
    </PageWrapper>
  )
}
