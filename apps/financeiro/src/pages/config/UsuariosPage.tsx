// ═══════════════════════════════════════════════════════════════════
// Gestão de Usuários — SIGECO Gestão Financeira
// Mesmo endpoint da plataforma de Propostas (usuarioRouter compartilhado)
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import { C, Btn, Spinner } from '../../components/ui'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin:        'Administrador',
  comercial:    'Comercial',
  tecnico:      'Técnico',
  visualizador: 'Visualizador',
}

const ROLE_CORES: Record<string, string> = {
  admin:        '#F5A623',
  comercial:    '#60A5FA',
  tecnico:      '#10B981',
  visualizador: '#6B7280',
}

const ROLE_DESCRICOES: Record<string, string> = {
  admin:        'Acesso total — SIGECO Gestão + Propostas, configurações e usuários',
  comercial:    'Acesso à plataforma de Propostas. Sem acesso ao Financeiro',
  tecnico:      'Visualiza e opera Ordens de Serviço. Sem acesso ao Financeiro',
  visualizador: 'Somente leitura — visualiza propostas e clientes',
}

const FORM_VAZIO = {
  nome: '', email: '', senha: '', telefone: '', cargo: '',
  role: 'comercial' as const,
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function BadgeRole({ role }: { role: string }) {
  const cor = ROLE_CORES[role] ?? '#6B7280'
  return (
    <span style={{
      background: cor + '20', color: cor,
      border: `1px solid ${cor}40`,
      borderRadius: 20, padding: '2px 10px',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
    }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 8, padding: '9px 12px',
  color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit',
}

const labelSt: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: C.textMuted,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  marginBottom: 4, display: 'block',
}

// ─── Modal: Redefinir senha ───────────────────────────────────────────────────

function ModalSenha({
  usuario, onClose,
}: { usuario: { id: number; nome: string }; onClose: () => void }) {
  const [novaSenha, setNovaSenha] = useState('')
  const [erro, setErro] = useState('')

  const mutation = (trpc as any).usuario.redefinirSenha.useMutation({
    onSuccess: () => { alert(`Senha de ${usuario.nome} redefinida com sucesso!`); onClose() },
    onError: (e: any) => setErro(e.message ?? 'Erro ao redefinir senha'),
  })

  const handleSalvar = () => {
    if (novaSenha.length < 6) { setErro('Mínimo 6 caracteres'); return }
    setErro('')
    mutation.mutate({ id: usuario.id, novaSenha })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: 28, width: 380, maxWidth: '90vw',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <h3 style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>
          🔑 Redefinir senha — {usuario.nome}
        </h3>
        <div>
          <label style={labelSt}>Nova senha *</label>
          <input
            type="password" value={novaSenha}
            onChange={e => setNovaSenha(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            style={inputSt} autoFocus
          />
          {erro && <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>{erro}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={handleSalvar} disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Salvando...' : '🔑 Salvar senha'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function UsuariosPage() {
  const { data: usuarios = [], isLoading, refetch } = (trpc as any).usuario.list.useQuery()
  const { data: meData } = (trpc as any).auth.me.useQuery()

  const createMut       = (trpc as any).usuario.create.useMutation({ onSuccess: () => { refetch(); setModo('lista') } })
  const updateMut       = (trpc as any).usuario.update.useMutation({ onSuccess: () => { refetch(); setModo('lista') } })
  const toggleAtivoMut  = (trpc as any).usuario.toggleAtivo.useMutation({ onSuccess: () => refetch() })

  const meuRole = (meData as any)?.role ?? 'visualizador'
  const isAdmin = meuRole === 'admin'

  const [modo,      setModo]      = useState<'lista' | 'novo' | 'editar'>('lista')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [form,      setForm]      = useState<any>(FORM_VAZIO)
  const [senhaModal, setSenhaModal] = useState<{ id: number; nome: string } | null>(null)

  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const abrirNovo = () => { setForm(FORM_VAZIO); setEditandoId(null); setModo('novo') }
  const abrirEditar = (u: any) => {
    setForm({ nome: u.nome, email: u.email, senha: '', telefone: u.telefone ?? '', cargo: u.cargo ?? '', role: u.role })
    setEditandoId(u.id)
    setModo('editar')
  }
  const handleSalvar = () => {
    if (modo === 'novo') createMut.mutate(form)
    else if (modo === 'editar' && editandoId) updateMut.mutate({ id: editandoId, ...form })
  }

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>

  // ── FORMULÁRIO ───────────────────────────────────────────────────
  if (modo === 'novo' || modo === 'editar') {
    const isPending = createMut.isLoading || updateMut.isLoading
    const erro = createMut.error?.message || updateMut.error?.message

    return (
      <div style={{ padding: '24px 28px', maxWidth: 680 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setModo('lista')} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 13 }}>
            ← Voltar
          </button>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>
            {modo === 'novo' ? 'Novo Usuário' : 'Editar Usuário'}
          </h2>
        </div>

        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelSt}>Nome completo *</label>
              <input style={inputSt} value={form.nome} onChange={e => setF('nome', e.target.value)} placeholder="Ex: João da Silva" />
            </div>
            <div>
              <label style={labelSt}>E-mail *</label>
              <input style={inputSt} type="email" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="joao@empresa.com" />
            </div>
            {modo === 'novo' && (
              <div>
                <label style={labelSt}>Senha inicial *</label>
                <input style={inputSt} type="password" value={form.senha} onChange={e => setF('senha', e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
            )}
            <div>
              <label style={labelSt}>Telefone</label>
              <input style={inputSt} value={form.telefone} onChange={e => setF('telefone', e.target.value)} placeholder="(61) 99999-9999" />
            </div>
            <div>
              <label style={labelSt}>Cargo</label>
              <input style={inputSt} value={form.cargo} onChange={e => setF('cargo', e.target.value)} placeholder="Ex: Engenheiro, Vendedor" />
            </div>

            {/* Nível de acesso */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelSt}>Nível de Acesso *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {Object.entries(ROLE_LABELS).map(([value, label]) => {
                  const ativo = form.role === value
                  const cor = ROLE_CORES[value]
                  return (
                    <button key={value} onClick={() => setF('role', value)} style={{
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      border: `2px solid ${ativo ? cor : C.border}`,
                      background: ativo ? cor + '14' : C.bg,
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: ativo ? cor : C.text, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.4 }}>{ROLE_DESCRICOES[value]}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {erro && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: C.danger + '14', border: `1px solid ${C.danger}40`, color: C.danger, fontSize: 12 }}>
              {erro}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModo('lista')} disabled={isPending}>Cancelar</Btn>
            <Btn onClick={handleSalvar} disabled={isPending}>
              {isPending ? 'Salvando...' : modo === 'novo' ? 'Criar Usuário' : 'Salvar Alterações'}
            </Btn>
          </div>
        </div>
      </div>
    )
  }

  // ── LISTA ─────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px 28px', maxWidth: 860 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>Usuários da Conta</h2>
          <p style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
            {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && <Btn onClick={abrirNovo}>+ Novo Usuário</Btn>}
      </div>

      {/* Legenda de roles */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
          Níveis de Acesso
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <div key={role} style={{
              padding: '8px 12px', borderRadius: 8,
              background: ROLE_CORES[role] + '10',
              border: `1px solid ${ROLE_CORES[role]}30`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ROLE_CORES[role], marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.4 }}>{ROLE_DESCRICOES[role]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista */}
      {usuarios.length === 0 ? (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <p style={{ color: C.textDim, fontSize: 14 }}>Nenhum usuário cadastrado ainda.</p>
          {isAdmin && <Btn onClick={abrirNovo} style={{ marginTop: 12 }}>+ Criar primeiro usuário</Btn>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(usuarios as any[]).map((u: any) => (
            <div key={u.id} style={{
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: '14px 18px', opacity: u.ativo ? 1 : 0.55,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              {/* Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: ROLE_CORES[u.role] + '25',
                border: `2px solid ${ROLE_CORES[u.role]}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, fontWeight: 800, color: ROLE_CORES[u.role],
              }}>
                {u.nome.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{u.nome}</span>
                  <BadgeRole role={u.role} />
                  {!u.ativo && (
                    <span style={{ fontSize: 10, color: C.danger, fontWeight: 700, background: C.danger + '15', padding: '2px 8px', borderRadius: 20 }}>
                      INATIVO
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted }}>
                  {u.email}
                  {u.cargo    ? ` · ${u.cargo}`    : ''}
                  {u.telefone ? ` · ${u.telefone}` : ''}
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {isAdmin && (
                  <button onClick={() => setSenhaModal({ id: u.id, nome: u.nome })} style={{
                    padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.border}`,
                    background: 'transparent', color: C.textMuted, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
                  }} title="Redefinir senha">
                    🔑 Senha
                  </button>
                )}
                {(isAdmin || u.id === (meData as any)?.id) && (
                  <button onClick={() => abrirEditar(u)} style={{
                    padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.emerald}40`,
                    background: C.emerald + '10', color: C.emerald, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                  }}>
                    ✏ Editar
                  </button>
                )}
                {isAdmin && u.id !== (meData as any)?.id && (
                  <button onClick={() => {
                    if (!window.confirm(`${u.ativo ? 'Desativar' : 'Reativar'} o usuário "${u.nome}"?`)) return
                    toggleAtivoMut.mutate({ id: u.id, ativo: !u.ativo })
                  }} style={{
                    padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                    border: u.ativo ? `1px solid ${C.danger}40` : `1px solid ${C.emerald}40`,
                    background: u.ativo ? C.danger + '10' : C.emerald + '10',
                    color: u.ativo ? C.danger : C.emerald,
                  }}>
                    {u.ativo ? '⊘ Desativar' : '✓ Reativar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal senha */}
      {senhaModal && <ModalSenha usuario={senhaModal} onClose={() => setSenhaModal(null)} />}
    </div>
  )
}
