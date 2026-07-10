// ═══════════════════════════════════════════════════════════════════
// Sincronização de identidade entre cliente (AGO) e fin_pessoa (AGF)
// ═══════════════════════════════════════════════════════════════════
//
// As duas plataformas usam tabelas separadas com propósitos diferentes:
//   cliente     — só clientes, campos comerciais (distribuidora, responsável)
//   fin_pessoa  — clientes E fornecedores, campos financeiros (banco, PIX)
//
// fin_pessoa.clienteId liga uma pessoa financeira ao cadastro de cliente
// correspondente. Quando o link existe, os campos de IDENTIDADE (nome,
// cpf/cnpj, email, telefone, endereço) são propagados nos dois sentidos
// ao salvar — o resto (bancário, fornecedor, distribuidora etc.) permanece
// exclusivo de cada plataforma.

import { eq, and, isNull } from 'drizzle-orm'
import { cliente, finPessoa } from '../db/schema'

type ClienteIdentidade = {
  nome?: string
  cpfCnpj?: string | null
  email?: string | null
  telefone?: string | null
  tipoPessoa?: 'fisica' | 'juridica'
  cep?: string | null
  endereco?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
}

type FinPessoaIdentidade = {
  nome?: string
  cpfCnpj?: string | null
  email?: string | null
  telefone?: string | null
  tipoPessoa?: 'FISICA' | 'JURIDICA'
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
}

// Mapeia só os campos presentes (undefined = não altera) — para updates parciais
export function mapClienteParaFinPessoa(dados: ClienteIdentidade): Record<string, any> {
  const out: Record<string, any> = {}
  if (dados.nome       !== undefined) out.nome       = dados.nome
  if (dados.cpfCnpj    !== undefined) out.cpfCnpj    = dados.cpfCnpj
  if (dados.email      !== undefined) out.email      = dados.email
  if (dados.telefone   !== undefined) out.telefone   = dados.telefone
  if (dados.tipoPessoa !== undefined) out.tipoPessoa = dados.tipoPessoa === 'juridica' ? 'JURIDICA' : 'FISICA'
  if (dados.cep         !== undefined) out.cep         = dados.cep
  if (dados.endereco    !== undefined) out.logradouro  = dados.endereco
  if (dados.numero      !== undefined) out.numero      = dados.numero
  if (dados.complemento !== undefined) out.complemento = dados.complemento
  if (dados.bairro      !== undefined) out.bairro      = dados.bairro
  if (dados.cidade      !== undefined) out.cidade      = dados.cidade
  if (dados.estado      !== undefined) out.estado      = dados.estado
  return out
}

export function mapFinPessoaParaCliente(dados: FinPessoaIdentidade): Record<string, any> {
  const out: Record<string, any> = {}
  if (dados.nome       !== undefined) out.nome       = dados.nome
  if (dados.cpfCnpj    !== undefined) out.cpfCnpj    = dados.cpfCnpj
  if (dados.email      !== undefined) out.email      = dados.email
  if (dados.telefone   !== undefined) out.telefone   = dados.telefone
  if (dados.tipoPessoa !== undefined) out.tipoPessoa = dados.tipoPessoa === 'JURIDICA' ? 'juridica' : 'fisica'
  if (dados.cep         !== undefined) out.cep         = dados.cep
  if (dados.logradouro  !== undefined) out.endereco    = dados.logradouro
  if (dados.numero      !== undefined) out.numero      = dados.numero
  if (dados.complemento !== undefined) out.complemento = dados.complemento
  if (dados.bairro      !== undefined) out.bairro      = dados.bairro
  if (dados.cidade      !== undefined) out.cidade      = dados.cidade
  if (dados.estado      !== undefined) out.estado      = dados.estado
  return out
}

// Propaga edição de cliente (Propostas) para o(s) fin_pessoa vinculado(s)
export async function propagarClienteParaFinPessoa(db: any, empresaId: number, clienteId: number, dados: ClienteIdentidade) {
  const campos = mapClienteParaFinPessoa(dados)
  if (Object.keys(campos).length === 0) return
  await db.update(finPessoa).set(campos)
    .where(and(eq(finPessoa.clienteId, clienteId), eq(finPessoa.empresaId, empresaId)))
}

// Propaga edição de fin_pessoa (AGF) para o cliente vinculado
export async function propagarFinPessoaParaCliente(db: any, empresaId: number, clienteId: number, dados: FinPessoaIdentidade) {
  const campos = mapFinPessoaParaCliente(dados)
  if (Object.keys(campos).length === 0) return
  await db.update(cliente).set(campos)
    .where(and(eq(cliente.id, clienteId), eq(cliente.empresaId, empresaId)))
}

// Acha (por CPF/CNPJ) ou cria um cliente vinculado a partir de dados de fin_pessoa.
// Usado quando um cliente é cadastrado direto no financeiro — garante que ele também
// exista no cadastro comercial (Propostas), sem duplicar se já existir.
export async function acharOuCriarClienteParaFinPessoa(
  db: any, empresaId: number, createdBy: number, dados: Required<Pick<FinPessoaIdentidade, 'nome'>> & FinPessoaIdentidade,
): Promise<number> {
  if (dados.cpfCnpj) {
    const [existente] = await db.select({ id: cliente.id }).from(cliente)
      .where(and(eq(cliente.empresaId, empresaId), eq(cliente.cpfCnpj, dados.cpfCnpj)))
      .limit(1)
    if (existente) return existente.id
  }
  const [res] = await db.insert(cliente).values({
    empresaId,
    createdBy,
    tipoPessoa: dados.tipoPessoa === 'JURIDICA' ? 'juridica' : 'fisica',
    nome:       dados.nome.toUpperCase(),
    cpfCnpj:    dados.cpfCnpj ?? null,
    email:      dados.email || null,
    telefone:   dados.telefone ?? null,
    cep:         dados.cep ?? null,
    endereco:    dados.logradouro ?? null,
    numero:      dados.numero ?? null,
    complemento: dados.complemento ?? null,
    bairro:      dados.bairro ?? null,
    cidade:      dados.cidade ?? null,
    estado:      dados.estado ?? null,
  })
  return (res as any).insertId as number
}

// Acha (por CPF/CNPJ, ainda sem link) um fin_pessoa órfão e vincula ao cliente recém-criado/editado.
// Evita ficar com dois cadastros desconectados quando o financeiro já tinha um registro antes.
export async function vincularFinPessoaOrfaAoCliente(db: any, empresaId: number, clienteId: number, cpfCnpj: string | null | undefined) {
  if (!cpfCnpj) return
  await db.update(finPessoa)
    .set({ clienteId })
    .where(and(
      eq(finPessoa.empresaId, empresaId),
      eq(finPessoa.cpfCnpj, cpfCnpj),
      isNull(finPessoa.clienteId),
    ))
}
