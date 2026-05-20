import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { C, Btn } from '../components/ui'

const IconAtomFin = ({ size = 28, color = '#022C22' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="14" width="4" height="7" rx="1" fill={color} opacity="0.85"/>
    <rect x="8" y="9"  width="4" height="12" rx="1" fill={color}/>
    <rect x="14" y="5" width="4" height="16" rx="1" fill={color} opacity="0.85"/>
    <path d="M4 13 L10 8 L16 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    <text x="19" y="8" fontSize="6" fontWeight="800" fill={color} fontFamily="sans-serif">$</text>
  </svg>
)

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  const login = (trpc as any).auth.login.useMutation({
    onSuccess(data: any) {
      localStorage.setItem('atomfin_token', data.token)
      localStorage.setItem('atomfin_usuario', JSON.stringify(data.usuario))
      // Também armazena com a chave da plataforma de propostas para compartilhar usuário
      localStorage.setItem('atomtech_token', data.token)
      localStorage.setItem('atomtech_usuario', JSON.stringify(data.usuario))
      navigate('/dashboard')
    },
    onError(err: any) {
      setErro(err.message ?? 'Credenciais inválidas')
    },
  })

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 400, padding: 40,
        background: C.bgMid, border: '1px solid ' + C.border,
        borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
          }}><IconAtomFin size={30} color="#022C22" /></div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
            <span style={{ color: C.emerald }}>ATOM</span>FIN
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, letterSpacing: '0.1em' }}>
            CONTROLE FINANCEIRO
          </div>
        </div>

        <form onSubmit={e => { e.preventDefault(); login.mutate({ email, senha }) }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 9,
                background: C.bg, border: '1px solid ' + C.border,
                color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = C.emerald)}
              onBlur={e => (e.currentTarget.style.borderColor = C.border)}
              placeholder="seu@email.com"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 9,
                background: C.bg, border: '1px solid ' + C.border,
                color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = C.emerald)}
              onBlur={e => (e.currentTarget.style.borderColor = C.border)}
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: '#7F1D1D20', border: '1px solid #B91C1C',
              color: '#FCA5A5', fontSize: 13,
            }}>{erro}</div>
          )}

          <Btn type="submit" disabled={login.isLoading} style={{ width: '100%', justifyContent: 'center', padding: '11px 16px', fontSize: 14 }}>
            {login.isLoading ? 'Entrando...' : 'Entrar'}
          </Btn>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: C.textDim }}>
          Atom Tech · Sistema Financeiro
        </p>
      </div>
    </div>
  )
}
