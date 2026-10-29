import { useEffect } from 'react'
import { trpc } from '../lib/trpc'
import { C } from './ui'

// Responsável pela proposta: quem conduz a negociação com o cliente. Recebe
// WhatsApp na véspera e no dia do vencimento (services/propostaAlertaValidade
// na API) — por isso é obrigatório e precisa ser usuário do sistema com
// telefone. Começa preenchido com quem está logado.
export function ResponsavelPropostaSelect({
  value, onChange, labelStyle, selectStyle, preencherComLogado = true,
}: {
  value: number | null
  onChange: (id: number | null) => void
  labelStyle?: React.CSSProperties
  selectStyle?: React.CSSProperties
  preencherComLogado?: boolean
}) {
  const { data: usuarios } = trpc.usuario.list.useQuery()
  const { data: me } = trpc.auth.me.useQuery()

  // Visualizador não conduz negociação.
  const candidatos = (usuarios ?? []).filter(
    (u: any) => u.ativo && u.role !== 'visualizador',
  )

  useEffect(() => {
    if (!preencherComLogado || value != null || !me?.id) return
    if (candidatos.some((u: any) => u.id === me.id)) onChange(me.id)
  }, [me?.id, candidatos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const selecionado = candidatos.find((u: any) => u.id === value)

  return (
    <div>
      <label style={labelStyle}>Responsável pela proposta *</label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
        style={{ ...selectStyle, borderColor: value == null ? C.danger : selectStyle?.borderColor }}
      >
        <option value="">— selecione —</option>
        {candidatos.map((u: any) => (
          <option key={u.id} value={u.id}>
            {u.nome}{u.telefone ? '' : ' (sem telefone)'}
          </option>
        ))}
      </select>
      {value == null && (
        <p style={{ color: C.danger, fontSize: 11, margin: '4px 0 0' }}>Obrigatório — recebe o alerta de vencimento por WhatsApp.</p>
      )}
      {selecionado && !selecionado.telefone && (
        <p style={{ color: C.warning, fontSize: 11, margin: '4px 0 0' }}>
          {selecionado.nome} não tem telefone no cadastro — o alerta de vencimento não vai chegar. Cadastre em Configurações › Usuários.
        </p>
      )}
    </div>
  )
}
