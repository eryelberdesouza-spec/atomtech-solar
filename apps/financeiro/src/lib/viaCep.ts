// ─── VIA CEP — Preenchimento automático de endereço ──────────────────────────

export interface EnderecoViaCep {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export async function buscarCep(cep: string): Promise<EnderecoViaCep | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    if (!res.ok) return null
    const data: EnderecoViaCep = await res.json()
    if (data.erro) return null
    return data
  } catch {
    return null
  }
}
