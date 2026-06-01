import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { C, Btn } from '../components/ui'

const IconAtom = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="80" fill="#0D1C17"/>
    <circle cx="256" cy="210" r="80" fill="#F5A623"/>
    <g stroke="#F5A623" strokeWidth="18" strokeLinecap="round">
      <line x1="256" y1="90"  x2="256" y2="58"/>
      <line x1="256" y1="362" x2="256" y2="330"/>
      <line x1="136" y1="210" x2="104" y2="210"/>
      <line x1="408" y1="210" x2="376" y2="210"/>
      <line x1="171" y1="125" x2="149" y2="103"/>
      <line x1="363" y1="317" x2="341" y2="295"/>
      <line x1="341" y1="125" x2="363" y2="103"/>
      <line x1="149" y1="317" x2="171" y2="295"/>
    </g>
    <rect x="100" y="355" width="312" height="88" rx="12" fill="#10B981" opacity="0.25"/>
    <line x1="204" y1="355" x2="204" y2="443" stroke="#10B981" strokeWidth="2" opacity="0.4"/>
    <line x1="308" y1="355" x2="308" y2="443" stroke="#10B981" strokeWidth="2" opacity="0.4"/>
    <line x1="100" y1="399" x2="412" y2="399" stroke="#10B981" strokeWidth="2" opacity="0.4"/>
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
          <div style={{ margin: '0 auto 14px', display: 'inline-block' }}>
            <IconAtom size={56} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
            <span style={{ color: '#F5A623' }}>SIGE</span><span style={{ color: C.emerald }}>CO</span>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, letterSpacing: '0.1em' }}>
            GESTÃO FINANCEIRA
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
          Atom Tech · SIGECO
        </p>
      </div>
    </div>
  )
}
