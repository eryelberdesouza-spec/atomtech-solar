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

// ─── AVATAR COM COR VARIÁVEL POR LETRA ────────────────────────────

const AVATAR_COLORS: Record<string, string> = {
  A:'#F59E0B', B:'#3B82F6', C:'#10B981', D:'#8B5CF6', E:'#EF4444',
  F:'#EC4899', G:'#06B6D4', H:'#F97316', I:'#6366F1', J:'#84CC16',
  K:'#14B8A6', L:'#A855F7', M:'#F59E0B', N:'#3B82F6', O:'#10B981',
  P:'#EF4444', Q:'#8B5CF6', R:'#EC4899', S:'#06B6D4', T:'#F97316',
  U:'#6366F1', V:'#84CC16', W:'#14B8A6', X:'#A855F7', Y:'#F59E0B', Z:'#3B82F6',
}
const avatarColor = (nome: string) => AVATAR_COLORS[nome.charAt(0).toUpperCase()] ?? C.solar

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

  const { data: dup } = trpc.cliente.checkDuplicidade.useQuery(
    { nome: form.nome, cpfCnpj: form.cpfCnpj, email: form.email || undefined },
    { enabled: form.nome.length > 2 }
  )

  const sectionLabel = (label: string) => (
    <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 1, height: 1, background: C.darkBorder, display: 'inline-block' }} />
      {label}
      <span style={{ flex: 1, height: 1, background: C.darkBorder, display: 'inline-block' }} />
    </p>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: C.darkCard, borderRadius: 16, border: `1px solid ${C.darkBorder}`,
        width: 720, maxHeight: '92vh', overflow: 'auto', padding: 28,
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header do modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: `${C.solar}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>👤</div>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>
              {inicial.nome ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: `${C.darkBorder}40`, border: 'none', color: C.textMuted,
            fontSize: 18, cursor: 'pointer', width: 32, height: 32, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {dup?.temConflito && (
          <div style={{
            background: `${C.warning}12`, border: `1px solid ${C.warning}40`,
            borderRadius: 10, padding: '10px 16px', marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ color: C.warning, fontSize: 12, fontWeight: 600 }}>
              Possível duplicata: {dup.conflitos.join(' · ')}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Identificação */}
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

          {/* Endereço */}
          <div style={{ paddingTop: 8 }}>
            {sectionLabel('Endereço')}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 80px', gap: 10, marginBottom: 10 }}>
              <Input label="CEP *" value={form.cep} onChange={e => set('cep', e.target.value)} placeholder="70000-000" />
              <Input label="Logradouro" value={form.endereco} onChange={e => set('endereco', e.target.value)} />
              <Input label="Número" value={form.numero} onChange={e => set('numero', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 10 }}>
              <Input label="Bairro" value={form.bairro} onChange={e => set('bairro', e.target.value)} />
              <Input label="Cidade" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
              <Select label="Estado" value={form.estado} onChange={e => set('estado', e.target.value)}
                options={[{ value: '', label: 'UF' }, ...ESTADOS.map(e => ({ value: e, label: e }))]} />
            </div>
          </div>

          {/* Energia */}
          <div style={{ paddingTop: 4 }}>
            {sectionLabel('Energia')}
            <Select
              label="Distribuidora de Energia"
              value={form.distribuidora}
              onChange={e => set('distribuidora', e.target.value)}
              options={[{ value: '', label: 'Selecione...' }, ...DISTRIBUIDORAS.map(d => ({ value: d, label: d }))]}
            />
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 26,
          paddingTop: 20, borderTop: `1px solid ${C.darkBorder}40`,
        }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            onClick={() => onSave(form)}
            disabled={!form.nome || !form.telefone || loading}
          >
            {loading ? 'Salvando...' : '✓ Salvar Cliente'}
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
  const pf = lista.filter(c => c.tipoPessoa === 'fisica').length
  const pj = lista.filter(c => c.tipoPessoa === 'juridica').length

  return (
    <PageWrapper>
      <SectionHeader
        title={`Clientes`}
        action={<Btn onClick={() => setShowModal(true)}>+ Novo Cliente</Btn>}
      />

      {/* Stats rápidas */}
      {lista.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total', value: lista.length, color: C.accent },
            { label: 'Pessoas Físicas', value: pf, color: C.solar },
            { label: 'Pessoas Jurídicas', value: pj, color: C.green },
          ].map(s => (
            <div key={s.label} style={{
              background: C.darkCard, border: `1px solid ${C.darkBorder}`,
              borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ color: s.color, fontSize: 18, fontWeight: 800, fontFamily: 'monospace' }}>{s.value}</span>
              <span style={{ color: C.textDim, fontSize: 12 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Busca */}
      <div style={{ marginBottom: 18, maxWidth: 440, position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: C.textMuted, fontSize: 14, pointerEvents: 'none',
        }}>🔍</span>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
          style={{
            width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10,
            background: C.darkCard, border: `1px solid ${C.darkBorder}`,
            color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = C.accent)}
          onBlur={e => (e.target.style.borderColor = C.darkBorder)}
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16, padding: 4,
            }}
          >×</button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : lista.length === 0 ? (
        <EmptyState icon="👥" title="Nenhum cliente encontrado"
          description={busca ? 'Tente outra busca ou limpe o filtro' : 'Cadastre seu primeiro cliente para começar'}
          action={!busca ? <Btn onClick={() => setShowModal(true)}>+ Novo Cliente</Btn> : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista.map(c => {
            const cor = avatarColor(c.nome)
            const isPJ = c.tipoPessoa === 'juridica'
            return (
              <Card key={c.id} hover style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}
                onClick={() => navigate(`/clientes/${c.id}`)}>

                {/* Avatar */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: `${cor}18`, border: `2px solid ${cor}30`,
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 16, fontWeight: 800, color: cor,
                }}>
                  {c.nome.charAt(0).toUpperCase()}
                </div>

                {/* Info principal */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.nome}
                    </p>
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: isPJ ? C.accent : C.solar,
                      background: isPJ ? `${C.accent}15` : `${C.solar}15`,
                      border: `1px solid ${isPJ ? C.accent : C.solar}30`,
                      borderRadius: 5, padding: '2px 6px',
                    }}>
                      {isPJ ? 'PJ' : 'PF'}
                    </span>
                  </div>
                  <p style={{ color: C.textDim, fontSize: 11, margin: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {c.cpfCnpj && <span>{c.cpfCnpj}</span>}
                    {c.cidade && c.estado && <span>📍 {c.cidade}/{c.estado}</span>}
                    {c.email && <span style={{ color: C.textMuted }}>✉ {c.email}</span>}
                  </p>
                </div>

                {/* Distribuidora */}
                {c.distribuidora && (
                  <span style={{
                    color: C.textMuted, fontSize: 11,
                    background: `${C.darkBorder}60`, borderRadius: 6,
                    padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    ⚡ {c.distribuidora}
                  </span>
                )}

                {/* Telefone */}
                {c.telefone && (
                  <span style={{ color: C.textDim, fontSize: 12, flexShrink: 0 }}>{c.telefone}</span>
                )}

                <span style={{ color: C.textDim, fontSize: 16, flexShrink: 0 }}>›</span>
              </Card>
            )
          })}
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

  const cor = avatarColor(cliente.nome)
  const isPJ = cliente.tipoPessoa === 'juridica'

  // Resumo de faturas
  const totalFaturas = faturas?.length ?? 0
  const consumoTotal = faturas?.reduce((acc, f) => acc + Number(f.consumoKwh ?? 0), 0) ?? 0
  const valorTotal = faturas?.reduce((acc, f) => acc + Number(f.valorTotal ?? 0), 0) ?? 0

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/clientes')} style={{
            background: `${C.darkBorder}40`, border: 'none', color: C.textMuted,
            cursor: 'pointer', fontSize: 16, width: 34, height: 34, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</button>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: `${cor}18`, border: `2px solid ${cor}35`,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22, fontWeight: 800, color: cor,
          }}>
            {cliente.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{cliente.nome}</h1>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                color: isPJ ? C.accent : C.solar,
                background: isPJ ? `${C.accent}15` : `${C.solar}15`,
                border: `1px solid ${isPJ ? C.accent : C.solar}30`,
                borderRadius: 5, padding: '2px 7px',
              }}>
                {isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'}
              </span>
            </div>
            <p style={{ color: C.textDim, fontSize: 12, margin: 0 }}>
              {[cliente.distribuidora, cliente.cidade && cliente.estado ? `${cliente.cidade}/${cliente.estado}` : null].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={() => setShowEdit(true)}>✏ Editar</Btn>
          <Btn size="sm" onClick={() => navigate('/propostas/nova')}>+ Nova Proposta</Btn>
        </div>
      </div>

      {/* Stats de faturas (se houver) */}
      {totalFaturas > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'Faturas', value: String(totalFaturas), color: C.accent, suffix: '' },
            { label: 'Consumo Total', value: consumoTotal.toLocaleString('pt-BR'), color: C.solar, suffix: ' kWh' },
            { label: 'Total Pago', value: `R$ ${valorTotal.toFixed(2).replace('.', ',')}`, color: C.green, suffix: '' },
          ].map(s => (
            <div key={s.label} style={{
              background: C.darkCard, border: `1px solid ${C.darkBorder}`,
              borderRadius: 10, padding: '10px 16px', flex: 1,
            }}>
              <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>{s.label}</p>
              <p style={{ color: s.color, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>
                {s.value}{s.suffix}
              </p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        {/* Dados do cliente */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ padding: '16px 20px' }}>
            <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
              Dados Cadastrais
            </p>
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
              <div key={k as string} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '7px 0', borderBottom: `1px solid ${C.darkBorder}30`,
              }}>
                <span style={{ color: C.textMuted, fontSize: 11, flexShrink: 0, paddingTop: 1 }}>{k}</span>
                <span style={{ color: C.text, fontSize: 12, fontWeight: 500, textAlign: 'right', maxWidth: 175, wordBreak: 'break-word' }}>{v}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Faturas e propostas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Faturas */}
          <Card>
            <div style={{
              padding: '14px 18px 12px', borderBottom: `1px solid ${C.darkBorder}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>⚡</span>
                <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Faturas de Energia</p>
                {totalFaturas > 0 && (
                  <span style={{
                    background: `${C.solar}20`, color: C.solar, fontSize: 10, fontWeight: 700,
                    borderRadius: 5, padding: '2px 7px',
                  }}>{totalFaturas}</span>
                )}
              </div>
              <Btn variant="ghost" size="sm" onClick={() => navigate('/faturas/nova')}>+ Lançar</Btn>
            </div>
            {!faturas?.length ? (
              <div style={{ padding: '24px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>
                Nenhuma fatura cadastrada
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.darkBorder}40` }}>
                    {['Referência', 'Distribuidora', 'Consumo', 'Total'].map((h, i) => (
                      <th key={h} style={{
                        padding: '8px 16px', color: C.textMuted, fontSize: 10, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        textAlign: i > 1 ? 'right' : 'left',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {faturas.map(f => (
                    <tr key={f.id} style={{ borderBottom: `1px solid ${C.darkBorder}30` }}>
                      <td style={{ padding: '10px 16px', color: C.accent, fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{f.referencia}</td>
                      <td style={{ padding: '10px 16px', color: C.textMuted, fontSize: 12 }}>{f.distribuidora}</td>
                      <td style={{ padding: '10px 16px', color: C.solar, fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
                        {f.consumoKwh ? `${Number(f.consumoKwh).toLocaleString('pt-BR')} kWh` : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', color: C.green, fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
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
            <div style={{
              padding: '14px 18px 12px', borderBottom: `1px solid ${C.darkBorder}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>📄</span>
                <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Propostas</p>
                {(propostas?.data?.length ?? 0) > 0 && (
                  <span style={{
                    background: `${C.accent}20`, color: C.accent, fontSize: 10, fontWeight: 700,
                    borderRadius: 5, padding: '2px 7px',
                  }}>{propostas!.data.length}</span>
                )}
              </div>
              <Btn variant="ghost" size="sm" onClick={() => navigate('/propostas/nova')}>+ Nova</Btn>
            </div>
            {!propostas?.data?.length ? (
              <div style={{ padding: '24px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>
                Nenhuma proposta para este cliente
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.darkBorder}40` }}>
                    {['Número', 'Status', 'Emissão', ''].map((h, i) => (
                      <th key={i} style={{
                        padding: '8px 16px', color: C.textMuted, fontSize: 10, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {propostas.data.map(p => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${C.darkBorder}30`, cursor: 'pointer' }}
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
