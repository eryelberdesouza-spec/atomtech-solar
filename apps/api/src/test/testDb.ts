// ═══════════════════════════════════════════════════════════════════
// Helpers de teste — conexão de banco + fixtures descartáveis
// Roda contra o MySQL local de desenvolvimento (mesmo DATABASE_URL do
// dev server). Cria seus próprios dados de teste e limpa tudo ao final
// — nunca depende nem mexe nos dados reais já existentes no banco.
// ═══════════════════════════════════════════════════════════════════

import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from '../db/schema'
import type { Context, Usuario } from '../routers/trpc'
import { finContaBancaria, finPlanoContas, finTitulo, finPeriodoFechado } from '../db/schema'
import { eq, and } from 'drizzle-orm'

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL ?? 'mysql://root:@localhost:3306/atomtech_solar',
  waitForConnections: true,
  connectionLimit: 5,
})

export const testDb = drizzle(pool, { schema, mode: 'default' })

export const TEST_EMPRESA_ID = 1

export const testUsuario: Usuario = {
  id: 1,
  empresaId: TEST_EMPRESA_ID,
  role: 'admin',
  nome: 'Teste Vitest',
  email: 'teste-vitest@atomtech.tec.br',
}

export function createTestContext(): Context {
  return {
    req: {} as any,
    res: {} as any,
    db: testDb as any,
    usuario: testUsuario,
  }
}

// Prefixo usado em todos os registros de teste, para facilitar identificação/limpeza manual se necessário
export const TEST_PREFIX = '__VITEST__'

export async function criarContaTeste(nome = `${TEST_PREFIX} Conta`) {
  const [res] = await testDb.insert(finContaBancaria).values({
    empresaId: TEST_EMPRESA_ID,
    nome,
    tipo: 'CORRENTE',
    saldoInicial: '0.00',
    ativo: true,
  })
  return (res as any).insertId as number
}

export async function criarPlanoContasTeste(tipo: 'RECEITA' | 'DESPESA' | 'FINANCEIRO', codigo: string) {
  const [res] = await testDb.insert(finPlanoContas).values({
    empresaId: TEST_EMPRESA_ID,
    codigo,
    nome: `${TEST_PREFIX} ${tipo}`,
    tipo,
    ativo: true,
  })
  return (res as any).insertId as number
}

export async function excluirContaTeste(id: number) {
  await testDb.delete(finContaBancaria).where(eq(finContaBancaria.id, id))
}

export async function excluirPlanoContasTeste(id: number) {
  await testDb.delete(finPlanoContas).where(eq(finPlanoContas.id, id))
}

// Exclui o título (cascade remove as parcelas automaticamente via FK)
export async function excluirTituloTeste(id: number) {
  await testDb.delete(finTitulo).where(eq(finTitulo.id, id))
}

export async function fecharPeriodoTeste(ano: number, mes: number) {
  await testDb.insert(finPeriodoFechado).values({
    empresaId: TEST_EMPRESA_ID,
    ano, mes,
    fechadoPor: testUsuario.id,
    fechadoPorNome: testUsuario.nome,
  })
}

export async function reabrirPeriodoTeste(ano: number, mes: number) {
  await testDb.delete(finPeriodoFechado).where(and(
    eq(finPeriodoFechado.empresaId, TEST_EMPRESA_ID),
    eq(finPeriodoFechado.ano, ano),
    eq(finPeriodoFechado.mes, mes),
  ))
}

export async function closeTestPool() {
  await pool.end()
}
