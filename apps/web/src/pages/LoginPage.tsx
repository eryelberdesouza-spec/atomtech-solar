import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../lib/trpc'
import { C } from '../components/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('atomtech_token', data.token)
      localStorage.setItem('atomtech_usuario', JSON.stringify(data.usuario))
      // Força reload completo para recriar o cliente tRPC com o token
      window.location.href = '/dashboard'
    },
    onError: (err) => {
      setErro(err.message)
    },
  })

  const handleLogin = () => {
    setErro('')
    if (!email || !senha) { setErro('Preencha e-mail e senha'); return }
    loginMutation.mutate({ email, senha })
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.dark,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>
      <div style={{ width: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `linear-gradient(135deg, ${C.solar}, #D4881A)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: '#fff', fontWeight: 900,
            }}>A</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 20, lineHeight: 1 }}>
                <span style={{ color: C.solar }}>ATOM</span>TECH
              </div>
              <div style={{ color: C.green, fontSize: 10, letterSpacing: '0.15em' }}>
                ENERGIA SOLAR
              </div>
            </div>
          </div>
          <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>
            Sistema de Propostas Fotovoltaicas
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: C.darkCard, borderRadius: 16,
          border: `1px solid ${C.darkBorder}`, padding: '32px 36px',
        }}>
          <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 24px' }}>
            Entrar na sua conta
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="seu@email.com.br"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 9,
                  background: C.dark, border: `1px solid ${C.darkBorder}`,
                  color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 9,
                  background: C.dark, border: `1px solid ${C.darkBorder}`,
                  color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {erro && (
              <div style={{
                background: '#3A1A1A', border: `1px solid ${C.danger}`,
                borderRadius: 8, padding: '10px 14px',
                color: C.danger, fontSize: 13,
              }}>
                {erro}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loginMutation.isLoading}
              style={{
                width: '100%', padding: '12px', borderRadius: 9,
                background: loginMutation.isLoading ? C.darkBorder : C.solar,
                border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: loginMutation.isLoading ? 'not-allowed' : 'pointer',
                marginTop: 4,
              }}
            >
              {loginMutation.isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          <p style={{ color: C.textDim, fontSize: 12, textAlign: 'center', margin: '20px 0 0' }}>
            Atom Tech © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
