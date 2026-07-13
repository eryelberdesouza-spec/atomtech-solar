// ═══════════════════════════════════════════════════════════════════
// Cadastro rápido de cliente — inline, para fluxos de campo
// Usado na OS avulsa e nos planos de manutenção: o técnico não tem
// acesso à tela de Clientes, então cadastra o essencial aqui mesmo.
// O cliente criado entra no cadastro normal (mesma tabela/endpoint),
// podendo ser completado depois pela equipe interna.
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { trpc } from '../../lib/trpc'

const inputSt: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, boxSizing: 'border-box',
  border: '1px solid #1E3050', background: '#0C1828', color: '#C8D8EC',
  fontSize: 13, outline: 'none', fontFamily: 'inherit',
}
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 10, color: '#4A6080', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
}

export function CadastroRapidoCliente({ nomeInicial, onCriado, onCancelar }: {
  nomeInicial: string
  onCriado: (cliente: { id: number; nome: string }) => void
  onCancelar: () => void
}) {
  const [form, setForm] = useState({
    nome: nomeInicial, telefone: '', cep: '', cpfCnpj: '',
  })
  const [erro, setErro] = useState('')
  const utils = (trpc as any).useUtils()

  const criarMut = (trpc as any).cliente.create.useMutation({
    onSuccess: (novo: any) => {
      utils.cliente.list.invalidate()
      onCriado({ id: novo.id, nome: novo.nome })
    },
    onError: (e: any) => setErro(e.message ?? 'Erro ao cadastrar cliente'),
  })

  const salvar = () => {
    setErro('')
    if (!form.nome.trim()) return setErro('Informe o nome do cliente')
    criarMut.mutate({
      tipoPessoa: 'fisica',
      nome:       form.nome.trim(),
      telefone:   form.telefone.trim() || undefined,
      cep:        form.cep.trim() || undefined,
      cpfCnpj:    form.cpfCnpj.trim() || undefined,
    })
  }

  return (
    <div style={{
      background: '#0C1828', border: '1px solid #3EBB7A40',
      borderRadius: 10, padding: 14, marginTop: 8,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#3EBB7A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        ＋ Cadastro rápido — o cliente entra no cadastro geral e pode ser completado depois
      </div>

      {erro && (
        <div style={{ background: '#7F1D1D20', border: '1px solid #B91C1C', borderRadius: 8, padding: '7px 12px', color: '#FCA5A5', fontSize: 12 }}>
          ⚠ {erro}
        </div>
      )}

      <div>
        <label style={labelSt}>Nome / Razão Social *</label>
        <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value.toUpperCase() }))} style={inputSt} autoFocus />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelSt}>Telefone</label>
          <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
            placeholder="(61) 9xxxx-xxxx" style={inputSt} />
        </div>
        <div>
          <label style={labelSt}>CEP</label>
          <input value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
            placeholder="70000-000" maxLength={9} style={inputSt} />
        </div>
      </div>

      <div>
        <label style={labelSt}>CPF / CNPJ (opcional)</label>
        <input value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))}
          placeholder="000.000.000-00" style={inputSt} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onCancelar}
          style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid #1E3050', background: 'transparent', color: '#4A6080', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
          Cancelar
        </button>
        <button onClick={salvar} disabled={criarMut.isLoading}
          style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#3EBB7A', color: '#0C1421', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
          {criarMut.isLoading ? 'Salvando...' : '✓ Cadastrar e usar'}
        </button>
      </div>
    </div>
  )
}
