// ═══════════════════════════════════════════════════════════════════
// Schema Financeiro — Atom Finance
// Prefixo: fin_
// ═══════════════════════════════════════════════════════════════════

import {
  mysqlTable, int, varchar, text, boolean, decimal, timestamp, date, mysqlEnum, index,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'
import { empresa } from './index'

// ─── CONTA BANCÁRIA ───────────────────────────────────────────────────────────
export const finContaBancaria = mysqlTable('fin_conta_bancaria', {
  id:           int('id').primaryKey().autoincrement(),
  empresaId:    int('empresa_id').notNull().references(() => empresa.id),
  nome:         varchar('nome', { length: 100 }).notNull(),
  tipo:         mysqlEnum('tipo', ['CORRENTE', 'POUPANCA', 'CAIXA']).notNull().default('CORRENTE'),
  banco:        varchar('banco', { length: 100 }),
  agencia:      varchar('agencia', { length: 20 }),
  conta:        varchar('conta', { length: 30 }),
  saldoInicial: decimal('saldo_inicial', { precision: 12, scale: 2 }).default('0').notNull(),
  ativo:        boolean('ativo').default(true).notNull(),
  createdAt:    timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt:    timestamp('updated_at'),
}, (t) => ({
  idxEmpresa: index('idx_fin_conta_empresa').on(t.empresaId),
}))

// ─── PLANO DE CONTAS ──────────────────────────────────────────────────────────
export const finPlanoContas = mysqlTable('fin_plano_contas', {
  id:        int('id').primaryKey().autoincrement(),
  empresaId: int('empresa_id').notNull().references(() => empresa.id),
  codigo:    varchar('codigo', { length: 20 }).notNull(),
  nome:      varchar('nome', { length: 200 }).notNull(),
  tipo:      mysqlEnum('tipo', ['RECEITA', 'DESPESA', 'FINANCEIRO']).notNull(),
  paiId:     int('pai_id'),   // referência a outro finPlanoContas (auto-referência)
  ativo:     boolean('ativo').default(true).notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (t) => ({
  idxEmpresa: index('idx_fin_plano_empresa').on(t.empresaId),
  idxCodigo:  index('idx_fin_plano_codigo').on(t.empresaId, t.codigo),
}))

// ─── CENTRO DE CUSTO ──────────────────────────────────────────────────────────
export const finCentroCusto = mysqlTable('fin_centro_custo', {
  id:        int('id').primaryKey().autoincrement(),
  empresaId: int('empresa_id').notNull().references(() => empresa.id),
  codigo:    varchar('codigo', { length: 30 }).notNull(),
  nome:      varchar('nome', { length: 150 }).notNull(),
  descricao: text('descricao'),
  ativo:     boolean('ativo').default(true).notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (t) => ({
  idxEmpresa: index('idx_fin_cc_empresa').on(t.empresaId),
}))

// ─── PESSOA (Clientes / Fornecedores financeiros) ─────────────────────────────
export const finPessoa = mysqlTable('fin_pessoa', {
  id:          int('id').primaryKey().autoincrement(),
  empresaId:   int('empresa_id').notNull().references(() => empresa.id),
  tipoPessoa:  mysqlEnum('tipo_pessoa', ['FISICA', 'JURIDICA']).notNull().default('JURIDICA'),
  nome:        varchar('nome', { length: 200 }).notNull(),
  fantasia:    varchar('fantasia', { length: 200 }),
  cpfCnpj:     varchar('cpf_cnpj', { length: 18 }),
  email:       varchar('email', { length: 150 }),
  telefone:    varchar('telefone', { length: 20 }),
  isCliente:   boolean('is_cliente').default(false).notNull(),
  isFornecedor:boolean('is_fornecedor').default(false).notNull(),
  cep:         varchar('cep', { length: 9 }),
  logradouro:  varchar('logradouro', { length: 300 }),
  numero:      varchar('numero', { length: 10 }),
  complemento: varchar('complemento', { length: 100 }),
  bairro:      varchar('bairro', { length: 100 }),
  cidade:      varchar('cidade', { length: 100 }),
  estado:      varchar('estado', { length: 2 }),
  regime:        varchar('regime', { length: 30 }),
  observacoes:   text('observacoes'),
  banco:         varchar('banco', { length: 100 }),
  tipoPix:       varchar('tipo_pix', { length: 30 }),
  chavePix:      varchar('chave_pix', { length: 150 }),
  tipoPagamento: varchar('tipo_pagamento', { length: 50 }),
  ativo:         boolean('ativo').default(true).notNull(),
  createdAt:   timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt:   timestamp('updated_at'),
}, (t) => ({
  idxEmpresa:  index('idx_fin_pessoa_empresa').on(t.empresaId),
  idxCpfCnpj:  index('idx_fin_pessoa_cpf').on(t.cpfCnpj),
  idxNome:     index('idx_fin_pessoa_nome').on(t.nome),
}))

// ─── TÍTULO (Conta a Pagar / Conta a Receber) ─────────────────────────────────
export const finTitulo = mysqlTable('fin_titulo', {
  id:             int('id').primaryKey().autoincrement(),
  empresaId:      int('empresa_id').notNull().references(() => empresa.id),
  tipo:           mysqlEnum('tipo', ['PAGAR', 'RECEBER']).notNull(),
  descricao:      varchar('descricao', { length: 300 }).notNull(),
  documento:      varchar('documento', { length: 100 }),
  pessoaId:       int('pessoa_id').references(() => finPessoa.id),
  planoContasId:  int('plano_contas_id').references(() => finPlanoContas.id),
  centroCustoId:  int('centro_custo_id').references(() => finCentroCusto.id),
  propostaId:     int('proposta_id'),   // link externo para proposta aceita
  valorOriginal:  decimal('valor_original', { precision: 12, scale: 2 }).notNull(),
  emissao:        date('emissao').notNull(),
  observacoes:    text('observacoes'),
  ativo:          boolean('ativo').default(true).notNull(),
  createdAt:      timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt:      timestamp('updated_at'),
}, (t) => ({
  idxEmpresa: index('idx_fin_titulo_empresa').on(t.empresaId),
  idxTipo:    index('idx_fin_titulo_tipo').on(t.tipo),
  idxPessoa:  index('idx_fin_titulo_pessoa').on(t.pessoaId),
}))

// ─── PARCELA ──────────────────────────────────────────────────────────────────
export const finParcela = mysqlTable('fin_parcela', {
  id:             int('id').primaryKey().autoincrement(),
  tituloId:       int('titulo_id').notNull().references(() => finTitulo.id, { onDelete: 'cascade' }),
  numero:         int('numero').notNull(),
  valor:          decimal('valor', { precision: 12, scale: 2 }).notNull(),
  vencimento:     date('vencimento').notNull(),
  status:         mysqlEnum('status', ['ABERTA', 'PAGA', 'CANCELADA']).notNull().default('ABERTA'),
  dataPagamento:  date('data_pagamento'),
  contaId:        int('conta_id').references(() => finContaBancaria.id),
  valorPago:      decimal('valor_pago', { precision: 12, scale: 2 }),
  juros:          decimal('juros', { precision: 12, scale: 2 }).default('0'),
  multa:          decimal('multa', { precision: 12, scale: 2 }).default('0'),
  desconto:       decimal('desconto', { precision: 12, scale: 2 }).default('0'),
  formaPagamento: varchar('forma_pagamento', { length: 50 }),
  createdAt:      timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (t) => ({
  idxTitulo:     index('idx_fin_parcela_titulo').on(t.tituloId),
  idxVencimento: index('idx_fin_parcela_venc').on(t.vencimento),
  idxStatus:     index('idx_fin_parcela_status').on(t.status),
}))

// ─── TRANSFERÊNCIA ────────────────────────────────────────────────────────────
export const finTransferencia = mysqlTable('fin_transferencia', {
  id:              int('id').primaryKey().autoincrement(),
  empresaId:       int('empresa_id').notNull().references(() => empresa.id),
  contaOrigemId:   int('conta_origem_id').notNull().references(() => finContaBancaria.id),
  contaDestinoId:  int('conta_destino_id').notNull().references(() => finContaBancaria.id),
  valor:           decimal('valor', { precision: 12, scale: 2 }).notNull(),
  data:            date('data').notNull(),
  descricao:       varchar('descricao', { length: 300 }),
  createdAt:       timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (t) => ({
  idxEmpresa: index('idx_fin_transf_empresa').on(t.empresaId),
  idxData:    index('idx_fin_transf_data').on(t.data),
}))
