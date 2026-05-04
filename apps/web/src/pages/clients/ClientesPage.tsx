// ═══════════════════════════════════════════════════════════════════
// Clientes — Lista + Detalhe
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatDate } from '../../lib/utils'
import {
  Btn, Card, Input, Select, Badge,
  PageWrapper, SectionHeader, EmptyState, Spinner, C,
} from '../../components/ui'

// ─── FORMULÁRIO DE CLIENTE ──────────────────────────────────────────

interface ClienteForm {
  tipoPessoa: 'fisica' | 'juridica'
  nome: string
  razaoSocial: string
  cpfCnpj: string
  nomeResponsavel: string
  telefone: string
  email: string
  cep: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  distribuidora: string
  observacoes: string
}

const FORM_VAZIO: ClienteForm = {
  tipoPessoa: 'fisica', nome: '', razaoSocial: '', cpfCnpj: '',
  nomeResponsavel: '', telefone: '', email: '', cep: '', endereco: '',
  numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  distribuidora: '', observacoes: '',
}

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const DISTRIBUIDORAS = ['Neoenergia Brasília', 'Neoenergia Pernambuco', 'Neoenergia Coelba', 'Neoenergia Cosern', 'Equatorial Goiás', 'Equatorial Pará', 'Equatorial Piauí', 'Equatorial Maranhão', 'CEMIG', 'COPEL', 'CPFL', 'Enel São Paulo', 'Enel Rio', 'Enel Ceará', 'Light', 'Energisa', 'CELPE', 'COELCE', 'CELESC', 'CEMAT', 'Outra']

function ClienteFormModal({ inicial, onSave, onClose, loading }: {
  inicial: ClienteForm
  onSave: (data: ClienteForm) => void
  onClose: () => void
  loading?: boolean
}) {
  const [form, setForm] = useState<ClienteForm>(inicial)
  const set = (k: keyof ClienteForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Checagem de duplicidade em tempo real
  const { data: dup } = trpc.cliente.checkDuplicidade.useQuery(
    { nome: form.nome, cpfCnpj: form.cpfCnpj, email: form.email || undefined },
    { enabled: form.nome.length > 2 }
  )

  const campoLabel = (label: string, req?: boolean) => (
    <label style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
      {label}{req && <span style={{ color: C.danger }}> *</span>}
    </label>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: C.darkCard, borderRadius: 14, border: `1px solid ${C.darkBorder}`,
        width: 720, maxHeight: '90vh', overflow: 'auto', padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>
            {inicial.nome ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        {dup?.temConflito && (
          <div style={{ background: `${C.warning}15`, border: `1px solid ${C.warning}50`, borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <span style={{ color: C.warning, fontSize: 12, fontWeight: 600 }}>
              ⚠ Possível duplicata: {dup.conflitos.join(' · ')}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Select
              label="Tipo de Pessoa"
              value={form.tipoPessoa}
              onChange={e => set('tipoPessoa', e.target.value as any)}
              options={[{ value: 'fisica', label: 'Pessoa Física' }, { value: 'juridica', label: 'Pessoa Jurídica' }]}
            />
            <Input label="CPF / CNPJ" value={form.cpfCnpj} onChange={e => set('cpfCnpj', e.target.value)} placeholder="000.000.000-00" />
          </div>

          <Input label="Nome / Razão Social *" value={form.nome} onChange={e => set('nome', e.target.value)} />
          {form.tipoPessoa === 'juridica' && (
            <Input label="Nome do Responsável" value={form.nomeResponsavel} onChange={e => set('nomeResponsavel', e.target.value)} />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Telefone *" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(61) 9xxxx-xxxx" />
            <Input label="E-mail" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>

          <div style={{ borderTop: `1px solid ${C.darkBorder}`, paddingTop: 14 }}>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>
              Endereço
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px', gap: 10, marginBottom: 10 }}>
              <Input label="CEP *" value={form.cep} onChange={e => set('cep', e.target.value)} placeholder="70000-000" />
              <Input label="Logradouro" value={form.endereco} onChange={e => set('endereco', e.target.value)} />
              <Input label="Número" value={form.numero} onChange={e => set('numero', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Input label="Bairro" value={form.bairro} onChange={e => set('bairro', e.target.value)} />
              <Input label="Cidade" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
              <Select label="Estado" value={form.estado} onChange={e => set('estado', e.target.value)}
                options={[{ value: '', label: 'UF' }, ...ESTADOS.map(e => ({ value: e, label: e }))]} />
            </div>
          </div>

          <Select
            label="Distribuidora de Energia"
            value={form.distribuidora}
            onChange={e => set('distribuidora', e.target.value)}
            options={[{ value: '', label: 'Selecione...' }, ...DISTRIBUIDORAS.map(d => ({ value: d, label: d }))]}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            onClick={() => onSave(form)}
            disabled={!form.nome || !form.telefone || loading}
          >
            {loading ? 'Salvando...' : 'Salvar Cliente'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ─── LISTA DE CLIENTES ──────────────────────────────────────────────

export function ClientesPage() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading, refetch } = trpc.cliente.list.useQuery({ busca: busca || undefined, porPagina: 50 })
  const createMutation = trpc.cliente.create.useMutation({
    onSuccess: () => { setShowModal(false); refetch() }
  })

  const lista = data?.data ?? []

  return (
    <PageWrapper>
      <SectionHeader
        title={`Clientes (${lista.length})`}
        action={<Btn onClick={() => setShowModal(true)}>+ Novo Cliente</Btn>}
      />

      {/* Busca */}
      <div style={{ marginBottom: 16, maxWidth: 400 }}>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
          style={{
            width: '100%', padding: '9px 14px', borderRadius: 9,
            background: C.darkCard, border: `1px solid ${C.darkBorder}`,
            color: C.text, fontSize: 13, outline: 'none',
          }}
        />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : lista.length === 0 ? (
        <EmptyState icon="👥" title="Nenhum cliente encontrado"
          description={busca ? 'Tente outra busca' : 'Cadastre seu primeiro cliente'}
          action={!busca ? <Btn onClick={() => setShowModal(true)}>+ Novo Cliente</Btn> : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lista.map(c => (
            <Card key={c.id} hover style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}
              onClick={() => navigate(`/clientes/${c.id}`)}>
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: `${C.solar}20`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 15, fontWeight: 700, color: C.solar,
              }}>
                {c.nome.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: '0 0 2px' }}>{c.nome}</p>
                <p style={{ color: C.textDim, fontSize: 12, margin: 0 }}>
                  {[c.cpfCnpj, c.cidade && c.estado ? `${c.cidade}/${c.estado}` : null, c.distribuidora].filter(Boolean).join(' · ')}
                </p>
              </div>

              {c.telefone && (
                <span style={{ color: C.textMuted, fontSize: 12 }}>{c.telefone}</span>
              )}

              <span style={{ color: C.textDim, fontSize: 18 }}>›</span>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <ClienteFormModal
          inicial={FORM_VAZIO}
          onSave={(form) => createMutation.mutate(form as any)}
          onClose={() => setShowModal(false)}
          loading={createMutation.isPending}
        />
      )}
    </PageWrapper>
  )
}

// ─── DETALHE DO CLIENTE ─────────────────────────────────────────────

export function ClienteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)

  const clienteId = Number(id)
  const { data: cliente, isLoading, refetch } = trpc.cliente.byId.useQuery({ id: clienteId }, { enabled: !!clienteId })
  const { data: faturas } = trpc.fatura.byCliente.useQuery({ clienteId }, { enabled: !!clienteId })
  const { data: propostas } = trpc.proposta.list.useQuery({ clienteId }, { enabled: !!clienteId })

  const updateMutation = trpc.cliente.update.useMutation({
    onSuccess: () => { setShowEdit(false); refetch() }
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>
  if (!cliente) return <EmptyState icon="❌" title="Cliente não encontrado" />

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/clientes')} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 20 }}>←</button>
          <div style={{
            width: 50, height: 50, borderRadius: '50%',
            background: `${C.solar}20`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 20, fontWeight: 700, color: C.solar,
          }}>
            {cliente.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{cliente.nome}</h1>
            <p style={{ color: C.textDim, fontSize: 13, margin: '2px 0 0' }}>
              {[cliente.tipoPessoa === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física', cliente.distribuidora].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={() => setShowEdit(true)}>✏ Editar</Btn>
          <Btn size="sm" onClick={() => navigate('/propostas/nova')}>+ Nova Proposta</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>
        {/* Dados do cliente */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ padding: '16px 20px' }}>
            <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>Dados Cadastrais</p>
            {[
              ['CPF/CNPJ', cliente.cpfCnpj],
              ['Telefone', cliente.telefone],
              ['E-mail', cliente.email],
              ['CEP', cliente.cep],
              ['Endereço', [cliente.endereco, cliente.numero, cliente.complemento].filter(Boolean).join(', ')],
              ['Bairro', cliente.bairro],
              ['Cidade/UF', cliente.cidade && cliente.estado ? `${cliente.cidade}/${cliente.estado}` : null],
              ['Distribuidora', cliente.distribuidora],
              ['Cadastrado em', formatDate(cliente.createdAt)],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.darkBorder}40` }}>
                <span style={{ color: C.textDim, fontSize: 12 }}>{k}</span>
                <span style={{ color: C.text, fontSize: 12, fontWeight: 500, textAlign: 'right', maxWidth: 180 }}>{v}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Faturas e propostas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Faturas */}
          <Card>
            <div style={{ padding: '14px 18px 10px', borderBottom: `1px solid ${C.darkBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Faturas de Energia</p>
              <Btn variant="ghost" size="sm" onClick={() => navigate('/faturas/nova')}>+ Lançar</Btn>
            </div>
            {!faturas?.length ? (
              <div style={{ padding: '20px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>Nenhuma fatura cadastrada</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {faturas.map(f => (
                    <tr key={f.id} style={{ borderBottom: `1px solid ${C.darkBorder}40` }}>
                      <td style={{ padding: '10px 16px', color: C.accent, fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{f.referencia}</td>
                      <td style={{ padding: '10px 16px', color: C.textMuted, fontSize: 12 }}>{f.distribuidora}</td>
                      <td style={{ padding: '10px 16px', color: C.solar, fontSize: 13, fontWeight: 700 }}>{f.consumoKwh ? `${Number(f.consumoKwh).toLocaleString('pt-BR')} kWh` : '—'}</td>
                      <td style={{ padding: '10px 16px', color: C.text, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
                        {f.valorTotal ? `R$ ${Number(f.valorTotal).toFixed(2).replace('.', ',')}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Propostas */}
          <Card>
            <div style={{ padding: '14px 18px 10px', borderBottom: `1px solid ${C.darkBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Propostas</p>
              <Btn variant="ghost" size="sm" onClick={() => navigate('/propostas/nova')}>+ Nova</Btn>
            </div>
            {!propostas?.data?.length ? (
              <div style={{ padding: '20px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>Nenhuma proposta para este cliente</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {propostas.data.map(p => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${C.darkBorder}40`, cursor: 'pointer' }}
                      onClick={() => navigate(`/propostas/${p.id}`)}>
                      <td style={{ padding: '10px 16px', color: C.accent, fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{p.numero}</td>
                      <td style={{ padding: '10px 16px' }}><Badge status={p.status} /></td>
                      <td style={{ padding: '10px 16px', color: C.textDim, fontSize: 12 }}>{formatDate(p.dataEmissao)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: C.textDim, fontSize: 14 }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>

      {showEdit && (
        <ClienteFormModal
          inicial={{ ...FORM_VAZIO, ...cliente, tipoPessoa: cliente.tipoPessoa as any }}
          onSave={(form) => updateMutation.mutate({ id: clienteId, ...form } as any)}
          onClose={() => setShowEdit(false)}
          loading={updateMutation.isPending}
        />
      )}
    </PageWrapper>
  )
}
