// Qualificação das partes no preâmbulo do contrato.
//
// Ficava duplicada entre o contrato fotovoltaico e o de serviço, e as duas
// versões divergiram: a de serviço não trazia representante legal, e-mail,
// telefone nem inscrição estadual — num contrato de PJ isso deixava o
// preâmbulo praticamente vazio. Agora as duas usam estas funções, que são a
// definição única de como a Atom qualifica CONTRATANTE e CONTRATADA.

export function fmtDoc(v: string | null | undefined): string {
  if (!v) return ''
  const n = v.replace(/\D/g, '')
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return v
}

export function enderecoCliente(c: any): string {
  const p: string[] = []
  if (c?.endereco) p.push(c.endereco + (c.numero ? ', ' + c.numero : ''))
  if (c?.complemento) p.push(c.complemento)
  if (c?.bairro) p.push(c.bairro)
  if (c?.cidade && c?.estado) p.push(`${c.cidade}/${c.estado}`)
  else if (c?.cidade) p.push(c.cidade)
  if (c?.cep) p.push(`CEP ${c.cep}`)
  return p.join(' – ') || '(endereço não informado)'
}

export function enderecoEmpresa(e: any): string {
  const p: string[] = []
  if (e?.endereco) p.push(e.endereco)
  if (e?.cidade && e?.estado) p.push(`${e.cidade}/${e.estado}`)
  if (e?.cep) p.push(`CEP ${e.cep}`)
  return p.join(', ')
}

// Campo vazio não vira rótulo órfão — some da frase inteira.
function trecho(rotulo: string, valor: any): string {
  const v = (valor ?? '').toString().trim()
  return v ? `, ${rotulo}${v}` : ''
}

// "neste ato representada por FULANO, cargo, portador do CPF nº X, ..."
// Só sai quando há ao menos o nome do responsável.
function representanteLegal(c: any): string {
  const nome = (c?.nomeResponsavel ?? '').toString().trim()
  if (!nome) return ''
  const cargo = (c?.responsavelCargo ?? '').toString().trim()
  const cpf = fmtDoc(c?.responsavelCpf)
  return `, neste ato representada por <strong>${nome}</strong>`
    + (cargo ? `, ${cargo}` : '')
    + (cpf ? `, portador(a) do CPF nº <strong>${cpf}</strong>` : '')
    + trecho('e-mail: ', c?.responsavelEmail)
    + trecho('telefone: ', c?.responsavelTelefone)
}

/** Qualificação do CONTRATANTE — sem o rótulo e sem o "denominado(a)" final. */
export function qualificacaoContratante(cliente: any): string {
  const nome = cliente?.nome ?? ''
  const doc = fmtDoc(cliente?.cpfCnpj)
  const end = enderecoCliente(cliente)

  if ((cliente?.tipoPessoa ?? 'fisica') === 'juridica') {
    return `<strong>${nome}</strong>, pessoa jurídica de direito privado`
      + (doc ? `, inscrita no CNPJ sob o nº <strong>${doc}</strong>` : '')
      + `, com sede em ${end}`
      + trecho('e-mail: ', cliente?.email)
      + trecho('telefone: ', cliente?.telefone)
      + representanteLegal(cliente)
  }

  return `<strong>${nome}</strong>`
    + (doc ? `, portador(a) do CPF nº <strong>${doc}</strong>` : '')
    + `, residente e domiciliado(a) no ${end}`
    + trecho('e-mail: ', cliente?.email)
    + trecho('telefone: ', cliente?.telefone)
}

/** Qualificação da CONTRATADA — sem o rótulo e sem o "denominada" final. */
export function qualificacaoContratada(empresa: any): string {
  const nome = empresa?.nome ?? 'ATOM TECNOLOGIA INSTALAÇÕES E SERVIÇOS LTDA'
  const cnpj = fmtDoc(empresa?.cnpj)
  const end = enderecoEmpresa(empresa)

  const rep = (nomeRep: any, cpfRep: any, descRep: any) => {
    const n = (nomeRep ?? '').toString().trim()
    if (!n) return ''
    const d = (descRep ?? '').toString().trim()
    const c = fmtDoc(cpfRep)
    return `<strong>${n}</strong>` + (d ? `, ${d}` : '') + (c ? `, CPF nº ${c}` : '')
  }
  const reps = [
    rep(empresa?.rep1Nome, empresa?.rep1Cpf, empresa?.rep1Descricao),
    rep(empresa?.rep2Nome, empresa?.rep2Cpf, empresa?.rep2Descricao),
  ].filter(Boolean)

  return `<strong>${nome}</strong>`
    + (end ? `, com sede no ${end}` : '')
    + (cnpj ? `, inscrita no CNPJ sob o nº <strong>${cnpj}</strong>` : '')
    + trecho('inscrição estadual nº ', empresa?.inscricaoEstadual)
    + trecho('e-mail: ', empresa?.email)
    + trecho('telefone: ', empresa?.telefone)
    + (reps.length ? `, neste ato representada pelo(s) senhor(es) ${reps.join(' e ')}` : '')
}
