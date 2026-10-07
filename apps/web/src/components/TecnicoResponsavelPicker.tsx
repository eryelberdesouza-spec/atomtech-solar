import { trpc } from '../lib/trpc'
import { C } from './ui'

// Técnico responsável deixou de ser só um nome digitado: quando é usuário do
// sistema, o vínculo (tecnicoResponsavelId) é o que permite avisá-lo por
// WhatsApp quando algo muda na OS. Técnico terceirizado continua valendo —
// escolhe-se "Outro (digitar nome)" e o nome fica só no texto, sem alerta.
export function TecnicoResponsavelPicker({
  nome, usuarioId, onChange, labelStyle, inputStyle,
}: {
  nome: string
  usuarioId: number | null
  onChange: (v: { nome: string; usuarioId: number | null }) => void
  labelStyle?: React.CSSProperties
  inputStyle?: React.CSSProperties
}) {
  const { data: usuarios } = trpc.usuario.list.useQuery()

  // Só quem pode ir a campo — visualizador não recebe OS.
  const candidatos = (usuarios ?? []).filter(
    (u: any) => u.ativo && ['admin', 'tecnico', 'comercial'].includes(u.role),
  )
  const externo = usuarioId == null && nome.trim() !== ''
  const valorSelect = usuarioId != null ? String(usuarioId) : externo ? '__externo' : ''

  const selecionado = candidatos.find((u: any) => u.id === usuarioId)
  const semTelefone = selecionado && !selecionado.telefone

  return (
    <div>
      <label style={labelStyle}>Técnico responsável</label>
      <select
        value={valorSelect}
        onChange={e => {
          const v = e.target.value
          if (v === '') return onChange({ nome: '', usuarioId: null })
          if (v === '__externo') return onChange({ nome: '', usuarioId: null })
          const u = candidatos.find((c: any) => String(c.id) === v)
          onChange({ nome: u?.nome ?? '', usuarioId: u ? u.id : null })
        }}
        style={inputStyle}
      >
        <option value="">— não definido —</option>
        {candidatos.map((u: any) => (
          <option key={u.id} value={u.id}>
            {u.nome}{u.telefone ? '' : ' (sem telefone)'}
          </option>
        ))}
        <option value="__externo">Outro (digitar nome)</option>
      </select>

      {valorSelect === '__externo' && (
        <input
          value={nome}
          onChange={e => onChange({ nome: e.target.value, usuarioId: null })}
          placeholder="Nome do técnico externo"
          style={{ ...inputStyle, marginTop: 6 }}
        />
      )}

      {semTelefone && (
        <p style={{ color: C.textDim, fontSize: 11, margin: '4px 0 0' }}>
          Sem telefone no cadastro — não vai receber alerta de WhatsApp.
        </p>
      )}
      {valorSelect === '__externo' && (
        <p style={{ color: C.textDim, fontSize: 11, margin: '4px 0 0' }}>
          Técnico externo: o nome fica registrado, mas não recebe alertas.
        </p>
      )}
    </div>
  )
}
