// ═══════════════════════════════════════════════════════════════════
// Clientes — Lista + Detalhe
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatDate, formatTimestampDate } from '../../lib/utils'
import {
  Btn, Card, Input, Select, Badge,
  PageWrapper, SectionHeader, EmptyState, Spinner, C,
} from '../../components/ui'
import { NovaPropostaDropdown } from '../../components/ui/NovaPropostaDropdown'
import { useIsMobile } from '../../hooks/useIsMobile'

const AVATAR_COLORS: Record<string, string> = {
  A:'#F59E0B', B:'#3B82F6', C:'#10B981', D:'#8B5CF6', E:'#EF4444',
  F:'#EC4899', G:'#06B6D4', H:'#F97316', I:'#6366F1', J:'#84CC16',
  K:'#14B8A6', L:'#A855F7', M:'#F59E0B', N:'#3B82F6', O:'#10B981',
  P:'#EF4444', Q:'#8B5CF6', R:'#EC4899', S:'#06B6D4', T:'#F97316',
  U:'#6366F1', V:'#84CC16', W:'#14B8A6', X:'#A855F7', Y:'#F59E0B', Z:'#3B82F6',
}
const avatarColor = (nome: string) => AVATAR_COLORS[nome.charAt(0).toUpperCase()] ?? C.solar

interface ClienteForm {
  tipoPessoa: 'fisica' | 'juridica'
  nome: string; razaoSocial: string; cpfCnpj: string; nomeResponsavel: string
  telefone: string; email: string; cep: string; endereco: string; numero: string
  complemento: string; bairro: string; cidade: string; estado: string
  distribuidora: string; observacoes: string
}

const FORM_VAZIO: ClienteForm = {
  tipoPessoa: 'fisica', nome: '', razaoSocial: '', cpfCnpj: '',
  nomeResponsavel: '', telefone: '', email: '', cep: '', endereco: '',
  numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  distribuidora: '', observacoes: '',
}

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const DISTRIBUIDORAS = ['Neoenergia Brasília','Neoenergia Pernambuco','Neoenergia Coelba','Neoenergia Cosern','Equatorial Goiás','Equatorial Pará','Equatorial Piauí','Equatorial Maranhão','CEMIG','COPEL','CPFL','Enel São Paulo','Enel Rio','Enel Ceará','Light','Energisa','CELPE','COELCE','CELESC','CEMAT','Outra']

function ClienteFormModal({ inicial, onSave, onClose, loading, erro }: {
  inicial: ClienteForm; onSave: (data: ClienteForm) => void; onClose: () => void; loading?: boolean; erro?: string
}) {
  const [form, setForm] = useState<ClienteForm>(inicial)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepErro, setCepErro] = useState('')
  const isMobile = useIsMobile()
  const set = (k: keyof ClienteForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  const buscarCep = async (cep: string) => {
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length !== 8) return
    setCepLoading(true); setCepErro('')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
      const data = await res.json()
      if (data.erro) {
        setCepErro('CEP não encontrado')
      } else {
        setForm(f => ({
          ...f,
          endereco: data.logradouro || f.endereco,
          bairro:   data.bairro     || f.bairro,
          cidade:   data.localidade || f.cidade,
          estado:   data.uf         || f.estado,
        }))
      }
    } catch { setCepErro('Erro ao buscar CEP') } finally { setCepLoading(false) }
  }

  const { data: dup } = trpc.cliente.checkDuplicidade.useQuery(
    { nome: form.nome, cpfCnpj: form.cpfCnpj, email: form.email || undefined },
    { enabled: form.nome.length > 2 }
  )

  // Duplicata "hard": nome + cpf + email todos detectados → bloqueia salvar
  const dupHard = !!(dup?.temConflito && dup.conflitos.length >= 2)

  const sectionLabel = (label: string) => (
    <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 1, height: 1, background: C.darkBorder, display: 'inline-block' }} />
      {label}
      <span style={{ flex: 1, height: 1, background: C.darkBorder, display: 'inline-block' }} />
    </p>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: C.darkCard, borderRadius: isMobile ? 12 : 16, border: `1px solid ${C.darkBorder}`, width: isMobile ? '96vw' : 720, maxHeight: '92vh', overflow: 'auto', padding: isMobile ? 18 : 28, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.solar}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>{inicial.nome ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          </div>
          <button onClick={onClose} style={{ background: `${C.darkBorder}40`, border: 'none', color: C.textMuted, fontSize: 18, cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {dup?.temConflito && (
          <div style={{ background: dupHard ? '#7F1D1D20' : `${C.warning}12`, border: `1px solid ${dupHard ? '#B91C1C' : C.warning}40`, borderRadius: 10, padding: '10px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{dupHard ? '🚫' : '⚠️'}</span>
            <div>
              <span style={{ color: dupHard ? '#FCA5A5' : C.warning, fontSize: 12, fontWeight: 700, display: 'block' }}>
                {dupHard ? 'Cadastro bloqueado — cliente duplicado' : 'Possível duplicata detectada'}
              </span>
              <span style={{ color: dupHard ? '#FCA5A5' : C.warning, fontSize: 11, opacity: 0.85 }}>
                {dupHard
                  ? 'Já existe um cliente com o mesmo nome, CPF/CNPJ e e-mail. O salvamento não será permitido.'
                  : dup.conflitos.join(' · ')}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <Select label="Tipo de Pessoa" value={form.tipoPessoa} onChange={e => set('tipoPessoa', e.target.value as any)}
              options={[{ value: 'fisica', label: 'Pessoa Física' }, { value: 'juridica', label: 'Pessoa Jurídica' }]} />
            <Input label="CPF / CNPJ" value={form.cpfCnpj} onChange={e => set('cpfCnpj', e.target.value)} placeholder="000.000.000-00" />
          </div>
          <Input label="Nome / Razão Social *" value={form.nome} onChange={e => set('nome', e.target.value.toUpperCase())} />
          {form.tipoPessoa === 'juridica' && (
            <Input label="Nome do Responsável" value={form.nomeResponsavel} onChange={e => set('nomeResponsavel', e.target.value)} />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <Input label="Telefone *" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(61) 9xxxx-xxxx" />
            <Input label="E-mail" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>

          <div style={{ paddingTop: 8 }}>
            {sectionLabel('Endereço')}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '150px 1fr 80px', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: 'block', color: C.textDim, fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>CEP *</label>
                <input
                  value={form.cep}
                  onChange={e => { set('cep', e.target.value); setCepErro('') }}
                  onBlur={e => buscarCep(e.target.value)}
                  placeholder="70000-000"
                  maxLength={9}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, outline: 'none', boxSizing: 'border-box' }}
                />
                {cepLoading && <p style={{ color: C.accent, fontSize: 10, margin: '3px 0 0' }}>⏳ Buscando...</p>}
                {cepErro && <p style={{ color: C.danger, fontSize: 10, margin: '3px 0 0' }}>⚠ {cepErro}</p>}
                {!cepLoading && !cepErro && form.cidade && <p style={{ color: C.green, fontSize: 10, margin: '3px 0 0' }}>✓ Preenchido</p>}
              </div>
              <Input label="Logradouro" value={form.endereco} onChange={e => set('endereco', e.target.value)} />
              <Input label="Número" value={form.numero} onChange={e => set('numero', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 100px', gap: 10 }}>
              <Input label="Bairro" value={form.bairro} onChange={e => set('bairro', e.target.value)} />
              <Input label="Cidade" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
              <Select label="Estado" value={form.estado} onChange={e => set('estado', e.target.value)}
                options={[{ value: '', label: 'UF' }, ...ESTADOS.map(e => ({ value: e, label: e }))]} />
            </div>
          </div>

          <div style={{ paddingTop: 4 }}>
            {sectionLabel('Energia')}
            <Select label="Distribuidora de Energia" value={form.distribuidora} onChange={e => set('distribuidora', e.target.value)}
              options={[{ value: '', label: 'Selecione...' }, ...DISTRIBUIDORAS.map(d => ({ value: d, label: d }))]} />
          </div>
        </div>

        {erro && (
          <div style={{ background: '#7F1D1D20', border: '1px solid #B91C1C', borderRadius: 8, padding: '10px 14px', marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ color: '#FCA5A5', fontSize: 13 }}>{erro}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.darkBorder}40` }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={() => onSave(form)} disabled={!form.nome || !form.telefone || loading || dupHard}>
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
  const [searchParams, setSearchParams] = useSearchParams()
  const busca = searchParams.get('q') ?? ''
  const setBusca = (v: string) => {
    v ? sessionStorage.setItem('clientes_busca', v) : sessionStorage.removeItem('clientes_busca')
    setSearchParams(v ? { q: v } : {}, { replace: true })
  }
  // Restaura busca salva ao navegar pelo menu (sem ?q= na URL)
  useEffect(() => {
    if (!searchParams.get('q')) {
      const saved = sessionStorage.getItem('clientes_busca')
      if (saved) setSearchParams({ q: saved }, { replace: true })
    }
  }, [])
  const [showModal, setShowModal] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const [mergeAlvo, setMergeAlvo] = useState<number | null>(null)
  const [mergeDescartar, setMergeDescartar] = useState<number | null>(null)
  const isMobile = useIsMobile()

  const utils = trpc.useUtils()
  const { data, isLoading, refetch } = trpc.cliente.list.useQuery({ busca: busca || undefined, porPagina: 200 })
  const createMutation = trpc.cliente.create.useMutation({ onSuccess: () => { setShowModal(false); refetch() } })
  const mergeMutation  = trpc.cliente.merge.useMutation({
    onSuccess: () => {
      setShowMerge(false); setMergeAlvo(null); setMergeDescartar(null)
      refetch()
      // Invalida cache de propostas e OS para refletir o novo clienteNome
      utils.proposta.list.invalidate()
      ;(utils as any).os?.list?.invalidate?.()
    },
  })

  const lista = data?.data ?? []
  const pf = lista.filter(c => c.tipoPessoa === 'fisica').length
  const pj = lista.filter(c => c.tipoPessoa === 'juridica').length

  return (
    <PageWrapper>
      <SectionHeader title="Clientes" action={
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={() => setShowMerge(true)}>⇌ Unificar</Btn>
          <Btn onClick={() => setShowModal(true)}>+ Novo</Btn>
        </div>
      } />

      {lista.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: lista.length, color: C.accent },
            { label: 'Físicas', value: pf, color: C.solar },
            { label: 'Jurídicas', value: pj, color: C.green },
          ].map(s => (
            <div key={s.label} style={{ background: C.darkCard, border: `1px solid ${C.darkBorder}`, borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: s.color, fontSize: 16, fontWeight: 800, fontFamily: 'monospace' }}>{s.value}</span>
              <span style={{ color: C.textDim, fontSize: 12 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 14, maxWidth: isMobile ? '100%' : 440, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: 14, pointerEvents: 'none' }}>🔍</span>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
          style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, background: C.darkCard, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => (e.target.style.borderColor = C.accent)} onBlur={e => (e.target.style.borderColor = C.darkBorder)} autoFocus={!!busca} />
        {busca && <button onClick={() => setBusca('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>×</button>}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : lista.length === 0 ? (
        <EmptyState icon="👥" title="Nenhum cliente encontrado"
          description={busca ? 'Tente outra busca' : 'Cadastre seu primeiro cliente'}
          action={!busca ? <Btn onClick={() => setShowModal(true)}>+ Novo Cliente</Btn> : undefined} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista.map(c => {
            const cor = avatarColor(c.nome)
            const isPJ = c.tipoPessoa === 'juridica'
            return (
              <Card key={c.id} hover style={{ padding: isMobile ? '12px 14px' : '14px 20px', display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16, opacity: (c as any).cancelado ? 0.55 : 1 }} onClick={() => navigate(`/clientes/${c.id}`)}>
                <div style={{ width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, borderRadius: 11, flexShrink: 0, background: `${cor}18`, border: `2px solid ${cor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 14 : 16, fontWeight: 800, color: cor }}>
                  {c.nome.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <p style={{ color: C.text, fontSize: isMobile ? 13 : 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isPJ ? C.accent : C.solar, background: isPJ ? `${C.accent}15` : `${C.solar}15`, border: `1px solid ${isPJ ? C.accent : C.solar}30`, borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>{isPJ ? 'PJ' : 'PF'}</span>
                    {(c as any).cancelado && <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#FCA5A5', background: '#7F1D1D40', border: '1px solid #B91C1C50', borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>Cancelado</span>}
                  </div>
                  <p style={{ color: C.textDim, fontSize: 11, margin: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {c.telefone && <span>{c.telefone}</span>}
                    {c.cidade && c.estado && <span>📍 {c.cidade}/{c.estado}</span>}
                    {!isMobile && c.email && <span style={{ color: C.textMuted }}>✉ {c.email}</span>}
                  </p>
                </div>
                {!isMobile && c.distribuidora && <span style={{ color: C.textMuted, fontSize: 11, background: `${C.darkBorder}60`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>⚡ {c.distribuidora}</span>}
                <span style={{ color: C.textDim, fontSize: 16 }}>›</span>
              </Card>
            )
          })}
        </div>
      )}

      {showMerge && (() => {
        const todos = data?.data ?? []
        const ativos = todos.filter((c: any) => !c.cancelado)
        const nomeCliente = (id: number | null) => ativos.find((c: any) => c.id === id)?.nome ?? '—'
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: C.darkCard, borderRadius: 16, border: `1px solid ${C.darkBorder}`, width: isMobile ? '96vw' : 500, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>⇌ Unificar Clientes</h2>
              <p style={{ color: C.textDim, fontSize: 12, margin: '0 0 22px', lineHeight: 1.6 }}>
                Selecione dois clientes. Todas as propostas, faturas e histórico do cliente descartado serão transferidos para o mantido, e o descartado será excluído permanentemente.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Cliente a MANTER</label>
                  <select value={mergeAlvo ?? ''} onChange={e => setMergeAlvo(Number(e.target.value) || null)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13 }}>
                    <option value="">Selecione...</option>
                    {ativos.map((c: any) => <option key={c.id} value={c.id}>{c.nome}{c.cpfCnpj ? ` — ${c.cpfCnpj}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Cliente a DESCARTAR (será excluído)</label>
                  <select value={mergeDescartar ?? ''} onChange={e => setMergeDescartar(Number(e.target.value) || null)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: C.dark, border: `1px solid ${C.darkBorder}`, color: C.text, fontSize: 13 }}>
                    <option value="">Selecione...</option>
                    {ativos.filter((c: any) => c.id !== mergeAlvo).map((c: any) => <option key={c.id} value={c.id}>{c.nome}{c.cpfCnpj ? ` — ${c.cpfCnpj}` : ''}</option>)}
                  </select>
                </div>
                {mergeAlvo && mergeDescartar && (
                  <div style={{ background: '#7F1D1D20', border: '1px solid #B91C1C50', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#FCA5A5', lineHeight: 1.6 }}>
                    <strong>Confirmar:</strong> manter <strong>{nomeCliente(mergeAlvo)}</strong> e excluir permanentemente <strong>{nomeCliente(mergeDescartar)}</strong>.
                    Todas as propostas e faturas do descartado serão vinculadas ao mantido.
                  </div>
                )}
              </div>
              {mergeMutation.error && <p style={{ color: '#FCA5A5', fontSize: 12, marginTop: 12 }}>{(mergeMutation.error as any)?.message}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <Btn variant="ghost" onClick={() => { setShowMerge(false); setMergeAlvo(null); setMergeDescartar(null) }}>Cancelar</Btn>
                <Btn onClick={() => mergeAlvo && mergeDescartar && mergeMutation.mutate({ manterClienteId: mergeAlvo, removerClienteId: mergeDescartar })}
                  disabled={!mergeAlvo || !mergeDescartar || mergeMutation.isLoading}
                  style={{ background: '#B91C1C', borderColor: '#B91C1C' }}>
                  {mergeMutation.isLoading ? 'Unificando...' : '⇌ Confirmar unificação'}
                </Btn>
              </div>
            </div>
          </div>
        )
      })()}

      {showModal && <ClienteFormModal inicial={FORM_VAZIO} onSave={form => createMutation.mutate(form as any)} onClose={() => setShowModal(false)} loading={createMutation.isLoading} erro={createMutation.error?.message} />}
    </PageWrapper>
  )
}

// Converte campos null do banco para string vazia (Zod rejeita null em z.string().optional())
function clienteParaForm(c: any): ClienteForm {
  return {
    tipoPessoa:      c.tipoPessoa      ?? 'fisica',
    nome:            c.nome            ?? '',
    razaoSocial:     c.razaoSocial     ?? '',
    cpfCnpj:         c.cpfCnpj         ?? '',
    nomeResponsavel: c.nomeResponsavel ?? '',
    telefone:        c.telefone        ?? '',
    email:           c.email           ?? '',
    cep:             c.cep             ?? '',
    endereco:        c.endereco        ?? '',
    numero:          c.numero          ?? '',
    complemento:     c.complemento     ?? '',
    bairro:          c.bairro          ?? '',
    cidade:          c.cidade          ?? '',
    estado:          c.estado          ?? '',
    distribuidora:   c.distribuidora   ?? '',
    observacoes:     c.observacoes     ?? '',
  }
}

// ─── DETALHE DO CLIENTE ─────────────────────────────────────────────

export function ClienteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const [updateErro, setUpdateErro] = useState('')
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)
  const isMobile = useIsMobile()

  const clienteId = Number(id)
  const { data: cliente, isLoading, refetch } = trpc.cliente.byId.useQuery({ id: clienteId }, { enabled: !!clienteId })
  const { data: faturas } = trpc.fatura.byCliente.useQuery({ clienteId }, { enabled: !!clienteId })
  const { data: propostas } = trpc.proposta.list.useQuery({ clienteId }, { enabled: !!clienteId })
  const updateMutation = trpc.cliente.update.useMutation({
    onSuccess: () => { setShowEdit(false); setUpdateErro(''); refetch() },
    onError: (err: any) => { setUpdateErro(err?.message ?? 'Erro ao salvar. Tente novamente.') },
  })
  const cancelMutation = trpc.cliente.cancel.useMutation({
    onSuccess: () => { setShowConfirmCancel(false); refetch() },
  })
  const reativarMutation = trpc.cliente.reativar.useMutation({
    onSuccess: () => refetch(),
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>
  if (!cliente) return <EmptyState icon="❌" title="Cliente não encontrado" />

  const cor = avatarColor(cliente.nome)
  const isPJ = cliente.tipoPessoa === 'juridica'
  const totalFaturas = faturas?.length ?? 0
  const consumoTotal = faturas?.reduce((acc, f) => acc + Number(f.consumoKwh ?? 0), 0) ?? 0
  const valorTotal = faturas?.reduce((acc, f) => acc + Number(f.valorTotal ?? 0), 0) ?? 0

  return (
    <PageWrapper>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <button onClick={() => navigate(-1)} style={{ background: `${C.darkBorder}40`, border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16, width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
          <div style={{ width: isMobile ? 40 : 52, height: isMobile ? 40 : 52, borderRadius: 13, flexShrink: 0, background: `${cor}18`, border: `2px solid ${cor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 18 : 22, fontWeight: 800, color: cor }}>
            {cliente.nome.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
              <h1 style={{ color: C.text, fontSize: isMobile ? 15 : 18, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente.nome}</h1>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isPJ ? C.accent : C.solar, background: isPJ ? `${C.accent}15` : `${C.solar}15`, border: `1px solid ${isPJ ? C.accent : C.solar}30`, borderRadius: 5, padding: '2px 7px', flexShrink: 0 }}>{isPJ ? 'PJ' : 'PF'}</span>
            </div>
            {!isMobile && <p style={{ color: C.textDim, fontSize: 12, margin: 0 }}>{[cliente.distribuidora, cliente.cidade && cliente.estado ? `${cliente.cidade}/${cliente.estado}` : null].filter(Boolean).join(' · ')}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 8, alignItems: 'center' }}>
          {cliente.cancelado && (
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FCA5A5', background: '#7F1D1D40', border: '1px solid #B91C1C60', borderRadius: 6, padding: '3px 8px' }}>Cancelado</span>
          )}
          {!cliente.cancelado && <Btn variant="ghost" size="sm" onClick={() => setShowEdit(true)}>{isMobile ? '✏' : '✏ Editar'}</Btn>}
          {!isMobile && !cliente.cancelado && <NovaPropostaDropdown size="sm" />}
          {cliente.cancelado
            ? <Btn variant="ghost" size="sm" onClick={() => reativarMutation.mutate({ id: clienteId })} disabled={reativarMutation.isLoading}>Reativar</Btn>
            : <Btn variant="ghost" size="sm" onClick={() => setShowConfirmCancel(true)} style={{ color: '#FCA5A5', borderColor: '#B91C1C60' }}>{isMobile ? '✕' : '✕ Cancelar'}</Btn>
          }
        </div>
      </div>

      {totalFaturas > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Faturas', value: String(totalFaturas), color: C.accent },
            { label: 'Consumo', value: `${consumoTotal.toLocaleString('pt-BR')} kWh`, color: C.solar },
            { label: 'Total Pago', value: `R$ ${valorTotal.toFixed(2).replace('.', ',')}`, color: C.green },
          ].map(s => (
            <div key={s.label} style={{ background: C.darkCard, border: `1px solid ${C.darkBorder}`, borderRadius: 10, padding: '8px 14px', flex: 1, minWidth: 100 }}>
              <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>{s.label}</p>
              <p style={{ color: s.color, fontSize: isMobile ? 13 : 15, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '320px 1fr', gap: 14 }}>
        <Card style={{ padding: '16px 20px' }}>
          <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>Dados Cadastrais</p>
          {[
            ['CPF/CNPJ', cliente.cpfCnpj], ['Telefone', cliente.telefone], ['E-mail', cliente.email],
            ['CEP', cliente.cep], ['Endereço', [cliente.endereco, cliente.numero, cliente.complemento].filter(Boolean).join(', ')],
            ['Bairro', cliente.bairro], ['Cidade/UF', cliente.cidade && cliente.estado ? `${cliente.cidade}/${cliente.estado}` : null],
            ['Distribuidora', cliente.distribuidora], ['Cadastrado em', formatTimestampDate(cliente.createdAt)],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.darkBorder}30` }}>
              <span style={{ color: C.textMuted, fontSize: 11 }}>{k}</span>
              <span style={{ color: C.text, fontSize: 12, fontWeight: 500, textAlign: 'right', maxWidth: 175, wordBreak: 'break-word' }}>{v}</span>
            </div>
          ))}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <div style={{ padding: '14px 18px 12px', borderBottom: `1px solid ${C.darkBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚡</span>
                <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Faturas de Energia</p>
                {totalFaturas > 0 && <span style={{ background: `${C.solar}20`, color: C.solar, fontSize: 10, fontWeight: 700, borderRadius: 5, padding: '2px 7px' }}>{totalFaturas}</span>}
              </div>
              <Btn variant="ghost" size="sm" onClick={() => navigate('/faturas/nova')}>+ Lançar</Btn>
            </div>
            {!faturas?.length ? (
              <div style={{ padding: '24px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>Nenhuma fatura cadastrada</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: `1px solid ${C.darkBorder}40` }}>
                  {['Referência','Distribuidora','Consumo','Total'].map((h,i) => <th key={h} style={{ padding: '8px 16px', color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', textAlign: i > 1 ? 'right' : 'left' }}>{h}</th>)}
                </tr></thead>
                <tbody>{faturas.map(f => (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${C.darkBorder}30` }}>
                    <td style={{ padding: '10px 16px', color: C.accent, fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{f.referencia}</td>
                    <td style={{ padding: '10px 16px', color: C.textMuted, fontSize: 12 }}>{f.distribuidora}</td>
                    <td style={{ padding: '10px 16px', color: C.solar, fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{f.consumoKwh ? `${Number(f.consumoKwh).toLocaleString('pt-BR')} kWh` : '—'}</td>
                    <td style={{ padding: '10px 16px', color: C.green, fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{f.valorTotal ? `R$ ${Number(f.valorTotal).toFixed(2).replace('.', ',')}` : '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Card>

          <Card>
            <div style={{ padding: '14px 18px 12px', borderBottom: `1px solid ${C.darkBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📄</span>
                <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Propostas</p>
                {(propostas?.data?.length ?? 0) > 0 && <span style={{ background: `${C.accent}20`, color: C.accent, fontSize: 10, fontWeight: 700, borderRadius: 5, padding: '2px 7px' }}>{propostas!.data.length}</span>}
              </div>
              <NovaPropostaDropdown label="+ Nova" size="sm" />
            </div>
            {!propostas?.data?.length ? (
              <div style={{ padding: '24px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>Nenhuma proposta para este cliente</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: `1px solid ${C.darkBorder}40` }}>
                  {['Número','Status','Emissão',''].map((h,i) => <th key={i} style={{ padding: '8px 16px', color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>)}
                </tr></thead>
                <tbody>{propostas.data.map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${C.darkBorder}30`, cursor: 'pointer' }} onClick={() => navigate(`/propostas/${p.id}`)}>
                    <td style={{ padding: '10px 16px', color: C.accent, fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{p.numero}</td>
                    <td style={{ padding: '10px 16px' }}><Badge status={p.status} /></td>
                    <td style={{ padding: '10px 16px', color: C.textDim, fontSize: 12 }}>{formatDate(p.dataEmissao)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: C.textDim, fontSize: 14 }}>›</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Card>
        </div>
      </div>

      {cliente.cancelado && (
        <div style={{ background: '#7F1D1D20', border: '1px solid #B91C1C50', borderRadius: 10, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🚫</span>
          <div>
            <p style={{ color: '#FCA5A5', fontSize: 13, fontWeight: 700, margin: 0 }}>Cliente cancelado</p>
            <p style={{ color: '#FCA5A5', fontSize: 11, margin: 0, opacity: 0.8 }}>Este cadastro foi cancelado e não pode receber novas propostas. Clique em "Reativar" para restaurá-lo.</p>
          </div>
        </div>
      )}

      {showConfirmCancel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: C.darkCard, borderRadius: 14, border: '1px solid #B91C1C60', width: 380, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <p style={{ color: '#FCA5A5', fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>Cancelar cliente?</p>
            <p style={{ color: C.textDim, fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
              O cliente <strong style={{ color: C.text }}>{cliente.nome}</strong> será marcado como cancelado. Propostas e histórico existentes são preservados. Você pode reativar a qualquer momento.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Btn variant="ghost" onClick={() => setShowConfirmCancel(false)}>Não, voltar</Btn>
              <Btn onClick={() => cancelMutation.mutate({ id: clienteId })} disabled={cancelMutation.isLoading} style={{ background: '#B91C1C', borderColor: '#B91C1C' }}>
                {cancelMutation.isLoading ? 'Cancelando...' : '✕ Confirmar cancelamento'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {showEdit && <ClienteFormModal inicial={clienteParaForm(cliente)} onSave={form => { setUpdateErro(''); updateMutation.mutate({ id: clienteId, ...form } as any) }} onClose={() => { setShowEdit(false); setUpdateErro('') }} loading={updateMutation.isLoading} erro={updateErro} />}
    </PageWrapper>
  )
}