import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  decimal,
  timestamp,
  date,
  mysqlEnum,
  json,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core'
import { relations, sql } from 'drizzle-orm'

// â”€â”€â”€ EMPRESA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const empresa = mysqlTable('empresa', {
  id: int('id').primaryKey().autoincrement(),
  nome: varchar('nome', { length: 200 }).notNull(),
  cnpj: varchar('cnpj', { length: 18 }).notNull().unique(),
  inscricaoEstadual: varchar('inscricao_estadual', { length: 30 }),
  isentoIE: boolean('isento_ie').default(false).notNull(),
  estado: varchar('estado', { length: 2 }).notNull(),
  cidade: varchar('cidade', { length: 100 }).notNull(),
  endereco: text('endereco'),
  cep: varchar('cep', { length: 9 }),
  telefone: varchar('telefone', { length: 20 }),
  email: varchar('email', { length: 150 }),
  site: varchar('site', { length: 150 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  corPrimaria: varchar('cor_primaria', { length: 7 }).default('#F5A623').notNull(),
  corSecundaria: varchar('cor_secundaria', { length: 7 }).default('#2D9C4E').notNull(),
  bancoNome: varchar('banco_nome', { length: 100 }),
  bancoCodigo: varchar('banco_codigo', { length: 10 }),
  bancoAgencia: varchar('banco_agencia', { length: 10 }),
  bancoConta: varchar('banco_conta', { length: 20 }),
  bancoTipo: mysqlEnum('banco_tipo', ['corrente', 'poupança']),
  bancoPixTipo: mysqlEnum('banco_pix_tipo', ['cpf', 'cnpj', 'email', 'telefone', 'aleatorio']),
  bancoPixChave: varchar('banco_pix_chave', { length: 150 }),
  rodapeTexto: text('rodape_texto'),
  rep1Nome: varchar('rep1_nome', { length: 200 }),
  rep1Cpf: varchar('rep1_cpf', { length: 30 }),
  rep1Descricao: text('rep1_descricao'),
  rep2Nome: varchar('rep2_nome', { length: 200 }),
  rep2Cpf: varchar('rep2_cpf', { length: 30 }),
  rep2Descricao: text('rep2_descricao'),
  bloquearDupNome: boolean('bloquear_dup_nome').default(true).notNull(),
  bloquearDupEmpresa: boolean('bloquear_dup_empresa').default(true).notNull(),
  bloquearDupCpfCnpj: boolean('bloquear_dup_cpf_cnpj').default(true).notNull(),
  bloquearDupEmail: boolean('bloquear_dup_email').default(false).notNull(),
  bloquearDupTelefone: boolean('bloquear_dup_telefone').default(false).notNull(),
  obrigatorioTelefone: boolean('obrigatorio_telefone').default(true).notNull(),
  obrigatorioCep: boolean('obrigatorio_cep').default(true).notNull(),
  obrigatorioEmpresa: boolean('obrigatorio_empresa').default(false).notNull(),
  obrigatorioCpfCnpj: boolean('obrigatorio_cpf_cnpj').default(false).notNull(),
  obrigatorioEmail: boolean('obrigatorio_email').default(false).notNull(),
  obrigatorioEndereco: boolean('obrigatorio_endereco').default(false).notNull(),
  obrigatorioEstado: boolean('obrigatorio_estado').default(false).notNull(),
  obrigatorioCidade: boolean('obrigatorio_cidade').default(false).notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at'),
})

// â”€â”€â”€ USUÃRIO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const usuario = mysqlTable('usuario', {
  id: int('id').primaryKey().autoincrement(),
  empresaId: int('empresa_id').notNull().references(() => empresa.id),
  nome: varchar('nome', { length: 200 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  senhaHash: varchar('senha_hash', { length: 255 }).notNull(),
  telefone: varchar('telefone', { length: 20 }),
  cargo: varchar('cargo', { length: 100 }),
  role: mysqlEnum('role', ['admin', 'comercial', 'tecnico', 'visualizador']).default('comercial').notNull(),
  margemPadrao: decimal('margem_padrao', { precision: 5, scale: 2 }),
  comissaoPadrao: decimal('comissao_padrao', { precision: 5, scale: 2 }),
  ativo: boolean('ativo').default(true).notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// â”€â”€â”€ CLIENTE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const cliente = mysqlTable('cliente', {
  id: int('id').primaryKey().autoincrement(),
  empresaId: int('empresa_id').notNull().references(() => empresa.id),
  tipoPessoa: mysqlEnum('tipo_pessoa', ['fisica', 'juridica']).default('fisica').notNull(),
  nome: varchar('nome', { length: 200 }).notNull(),
  razaoSocial: varchar('razao_social', { length: 200 }),
  cpfCnpj: varchar('cpf_cnpj', { length: 18 }),
  nomeResponsavel: varchar('nome_responsavel', { length: 200 }),
  telefone: varchar('telefone', { length: 20 }),
  email: varchar('email', { length: 150 }),
  cep: varchar('cep', { length: 9 }),
  endereco: varchar('endereco', { length: 300 }),
  numero: varchar('numero', { length: 10 }),
  complemento: varchar('complemento', { length: 100 }),
  bairro: varchar('bairro', { length: 100 }),
  cidade: varchar('cidade', { length: 100 }),
  estado: varchar('estado', { length: 2 }),
  distribuidora: varchar('distribuidora', { length: 100 }),
  observacoes: text('observacoes'),
  createdBy: int('created_by').references(() => usuario.id),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at'),
}, (t) => ({
  idxCpfCnpj: index('idx_cpf_cnpj').on(t.cpfCnpj),
  idxEmail: index('idx_email').on(t.email),
  idxNome: index('idx_nome').on(t.nome),
  idxEmpresa: index('idx_empresa').on(t.empresaId),
}))

// â”€â”€â”€ FATURA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const fatura = mysqlTable('fatura', {
  id: int('id').primaryKey().autoincrement(),
  clienteId: int('cliente_id').notNull().references(() => cliente.id),
  distribuidora: varchar('distribuidora', { length: 100 }),
  referencia: varchar('referencia', { length: 7 }),
  codigoUC: varchar('codigo_uc', { length: 30 }),
  codigoInstalacao: varchar('codigo_instalacao', { length: 30 }),
  tipoFornecimento: varchar('tipo_fornecimento', { length: 50 }),
  classificacao: varchar('classificacao', { length: 100 }),
  grupoTarifario: mysqlEnum('grupo_tarifario', ['A', 'B']).default('B').notNull(),
  subgrupo: varchar('subgrupo', { length: 10 }),
  consumoKwh: decimal('consumo_kwh', { precision: 10, scale: 2 }),
  valorTotal: decimal('valor_total', { precision: 10, scale: 2 }),
  tarifaMedia: decimal('tarifa_media', { precision: 10, scale: 6 }),
  cip: decimal('cip', { precision: 10, scale: 2 }),
  icmsAliquota: decimal('icms_aliquota', { precision: 5, scale: 2 }),
  icmsValor: decimal('icms_valor', { precision: 10, scale: 2 }),
  pisAliquota: decimal('pis_aliquota', { precision: 5, scale: 4 }),
  pisValor: decimal('pis_valor', { precision: 10, scale: 2 }),
  cofinsAliquota: decimal('cofins_aliquota', { precision: 5, scale: 4 }),
  cofinsValor: decimal('cofins_valor', { precision: 10, scale: 2 }),
  tensaoNominal: varchar('tensao_nominal', { length: 20 }),
  dataLeituraAnterior: date('data_leitura_anterior'),
  dataLeituraAtual: date('data_leitura_atual'),
  diasFaturados: int('dias_faturados'),
  observacoes: text('observacoes'),
  arquivoUrl: varchar('arquivo_url', { length: 500 }),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const historicoConsumo = mysqlTable('historico_consumo', {
  id: int('id').primaryKey().autoincrement(),
  faturaId: int('fatura_id').notNull().references(() => fatura.id, { onDelete: 'cascade' }),
  referencia: varchar('referencia', { length: 7 }),
  consumoKwh: decimal('consumo_kwh', { precision: 10, scale: 2 }).notNull(),
  dias: int('dias'),
  ordem: int('ordem').notNull(),
})

// â”€â”€â”€ PREMISSAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const premissasConfig = mysqlTable('premissas_config', {
  id: int('id').primaryKey().autoincrement(),
  empresaId: int('empresa_id').notNull().references(() => empresa.id),
  inflacaoEnergetica: decimal('inflacao_energetica', { precision: 5, scale: 2 }).default('9.50').notNull(),
  taxaDescontoVpl: decimal('taxa_desconto_vpl', { precision: 5, scale: 2 }).default('12.00').notNull(),
  considerarCustoDisponibilidade: boolean('considerar_custo_disponibilidade').default(true).notNull(),
  baseIrradiacao: varchar('base_irradiacao', { length: 100 }).default('Atlas Brasileiro 2Âª Ed. INPE 2017').notNull(),
  sobredimensionamentoPadrao: decimal('sobredimensionamento_padrao', { precision: 5, scale: 2 }).default('50.00').notNull(),
  perdaEficienciaAnualTradicional: decimal('perda_eficiencia_anual_tradicional', { precision: 4, scale: 2 }).default('0.80').notNull(),
  perdaEficienciaAnualMicroinversor: decimal('perda_eficiencia_anual_microinversor', { precision: 4, scale: 2 }).default('0.60').notNull(),
  perdaEficienciaAnualOtimizador: decimal('perda_eficiencia_anual_otimizador', { precision: 4, scale: 2 }).default('0.60').notNull(),
  trocaInversorAnosTradicional: int('troca_inversor_anos_tradicional').default(0).notNull(),
  trocaInversorAnosMicroinversor: int('troca_inversor_anos_microinversor').default(0).notNull(),
  trocaInversorAnosOtimizador: int('troca_inversor_anos_otimizador').default(0).notNull(),
  custoTrocaInversorTrad: decimal('custo_troca_inversor_trad', { precision: 5, scale: 2 }).default('0.00').notNull(),
  custoTrocaInversorMicro: decimal('custo_troca_inversor_micro', { precision: 5, scale: 2 }).default('0.00').notNull(),
  custoTrocaInversorOtim: decimal('custo_troca_inversor_otim', { precision: 5, scale: 2 }).default('0.00').notNull(),
  margemPotenciaIdeal: decimal('margem_potencia_ideal', { precision: 5, scale: 2 }).default('0.00').notNull(),
  areaCarport: decimal('area_carport', { precision: 4, scale: 2 }).default('1.30').notNull(),
  areaCeramico: decimal('area_ceramico', { precision: 4, scale: 2 }).default('1.20').notNull(),
  areaFibrocimento: decimal('area_fibrocimento', { precision: 4, scale: 2 }).default('1.20').notNull(),
  areaLaje: decimal('area_laje', { precision: 4, scale: 2 }).default('1.20').notNull(),
  areaShingle: decimal('area_shingle', { precision: 4, scale: 2 }).default('1.20').notNull(),
  areaMetalico: decimal('area_metalico', { precision: 4, scale: 2 }).default('1.20').notNull(),
  areaZipado: decimal('area_zipado', { precision: 4, scale: 2 }).default('1.20').notNull(),
  areaSolo: decimal('area_solo', { precision: 4, scale: 2 }).default('1.60').notNull(),
  grupoTarifarioPadrao: mysqlEnum('grupo_tarifario_padrao', ['A', 'B']).default('B').notNull(),
  tarifaPadrao: decimal('tarifa_padrao', { precision: 10, scale: 6 }),
  tePonta: decimal('te_ponta', { precision: 10, scale: 6 }),
  teForaPonta: decimal('te_fora_ponta', { precision: 10, scale: 6 }),
  tusdPonta: decimal('tusd_ponta', { precision: 10, scale: 6 }),
  tusdForaPonta: decimal('tusd_fora_ponta', { precision: 10, scale: 6 }),
  tusdFioBBt: decimal('tusd_fio_b_bt', { precision: 10, scale: 6 }),
  faseTensaoRede: varchar('fase_tensao_rede', { length: 30 }).default('TrifÃ¡sico 127/220V').notNull(),
  fatorSimultaneidade: decimal('fator_simultaneidade', { precision: 5, scale: 2 }).default('20.00').notNull(),
  impostoEnergia: decimal('imposto_energia', { precision: 5, scale: 2 }).default('20.00').notNull(),
  outrosEncargosAtual: decimal('outros_encargos_atual', { precision: 10, scale: 2 }).default('0.00').notNull(),
  outrosEncargosNovo: decimal('outros_encargos_novo', { precision: 10, scale: 2 }).default('0.00').notNull(),
  tipoTelhadoPadrao: mysqlEnum('tipo_telhado_padrao', ['carport','ceramico','fibrocimento','laje','shingle','metalico','zipado','solo']).default('ceramico').notNull(),
  desvioAzimutalPadrao: int('desvio_azimutal_padrao').default(0).notNull(),
  inclinacaoPadrao: int('inclinacao_padrao').default(20).notNull(),
  topologiasDisponiveis: json('topologias_disponiveis').$type<string[]>().default(['tradicional','microinversor','otimizador']),
  tipoSistemaPadrao: mysqlEnum('tipo_sistema_padrao', ['on_grid','off_grid','hibrido']).default('on_grid').notNull(),
  taxaDesempenhoTradicional: decimal('taxa_desempenho_tradicional', { precision: 5, scale: 2 }).default('77.00').notNull(),
  taxaDesempenhoMicroinversor: decimal('taxa_desempenho_microinversor', { precision: 5, scale: 2 }).default('78.50').notNull(),
  taxaDesempenhoOtimizador: decimal('taxa_desempenho_otimizador', { precision: 5, scale: 2 }).default('80.00').notNull(),
  metodoPrecificacao: mysqlEnum('metodo_precificacao', ['margem_custo','margem_venda']).default('margem_custo').notNull(),
  margemPadrao: decimal('margem_padrao', { precision: 5, scale: 2 }).default('33.00').notNull(),
  margemKitsUsarPadrao: boolean('margem_kits_usar_padrao').default(false).notNull(),
  margemKitsValor: decimal('margem_kits_valor', { precision: 5, scale: 2 }).default('0.00').notNull(),

  // â”€â”€â”€ COMPOSIÃ‡ÃƒO DE CUSTOS PADRÃƒO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Campos adicionados via migration â€” migration_custos_padrao.sql
  custoMaoObraModulo:    decimal('custo_mao_obra_modulo',   { precision: 10, scale: 2 }).default('70.00').notNull(),
  custoMaoObraInversor:  decimal('custo_mao_obra_inversor', { precision: 10, scale: 2 }).default('150.00').notNull(),
  custoProjeto:          decimal('custo_projeto',           { precision: 10, scale: 2 }).default('800.00').notNull(),
  custoAdmin:            decimal('custo_admin',             { precision: 10, scale: 2 }).default('0.00').notNull(),
  // JSON: [{ id, descricao, tipoCusto, valorFixo, ativo, unidade }]
  itensAdicionaisPadrao: json('itens_adicionais_padrao').$type<Record<string, unknown>[]>(),

  updatedAt: timestamp('updated_at'),
})

export const premissasSnapshot = mysqlTable('premissas_snapshot', {
  id: int('id').primaryKey().autoincrement(),
  propostaId: int('proposta_id').notNull(),
  dadosJson: json('dados_json').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// â”€â”€â”€ CATEGORIA DE CUSTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const categoriaCusto = mysqlTable('categoria_custo', {
  id: int('id').primaryKey().autoincrement(),
  empresaId: int('empresa_id').notNull().references(() => empresa.id),
  nome: varchar('nome', { length: 100 }).notNull(),
  item: varchar('item', { length: 100 }),
  tipoCusto: mysqlEnum('tipo_custo', ['fixo','multiplo','avancado','proporcional_kwp']).notNull(),
  margemTipo: mysqlEnum('margem_tipo', ['padrao','personalizada']).default('padrao').notNull(),
  margemValor: decimal('margem_valor', { precision: 5, scale: 2 }),
  ativo: boolean('ativo').default(true).notNull(),
  ordem: int('ordem').default(0).notNull(),
})

// â”€â”€â”€ PROPOSTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const proposta = mysqlTable('proposta', {
  id: int('id').primaryKey().autoincrement(),
  empresaId: int('empresa_id').notNull().references(() => empresa.id),
  numero: varchar('numero', { length: 20 }).notNull().unique(),
  tipoProposta: mysqlEnum('tipo_proposta', ['fotovoltaico','servico_geral']).default('fotovoltaico').notNull(),
  clienteId: int('cliente_id').notNull().references(() => cliente.id),
  faturaId: int('fatura_id').references(() => fatura.id),
  usuarioId: int('usuario_id').references(() => usuario.id),
  status: mysqlEnum('status', ['rascunho','enviada','aceita','recusada','expirada']).default('rascunho').notNull(),
  versao: int('versao').default(1).notNull(),
  propostaPaiId: int('proposta_pai_id'),
  templateOrigemId: int('template_origem_id'),
  isTemplate: boolean('is_template').default(false).notNull(),
  nomeTemplate: varchar('nome_template', { length: 100 }),
  dataEmissao: date('data_emissao').notNull(),
  dataValidade: date('data_validade'),
  tituloServico: varchar('titulo_servico', { length: 200 }),
  prazoExecucao: varchar('prazo_execucao', { length: 300 }),
  observacoesInternas: text('observacoes_internas'),
  createdBy: int('created_by').references(() => usuario.id),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at'),
}, (t) => ({
  idxCliente: index('idx_cliente').on(t.clienteId),
  idxStatus: index('idx_status').on(t.status),
  idxEmpresa: index('idx_empresa_proposta').on(t.empresaId),
}))

// â”€â”€â”€ DIMENSIONAMENTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const dimensionamento = mysqlTable('dimensionamento', {
  id: int('id').primaryKey().autoincrement(),
  propostaId: int('proposta_id').notNull().unique().references(() => proposta.id),
  consumoMedioMensalKwh: decimal('consumo_medio_mensal_kwh', { precision: 10, scale: 2 }),
  consumoMensalReferencia: json('consumo_mensal_referencia').$type<number[]>(),
  tarifaUsada: decimal('tarifa_usada', { precision: 10, scale: 6 }),
  tipoTelhado: varchar('tipo_telhado', { length: 30 }),
  desvioAzimutal: int('desvio_azimutal'),
  inclinacaoGraus: int('inclinacao_graus'),
  topologia: mysqlEnum('topologia', ['tradicional','microinversor','otimizador']),
  tipoSistema: mysqlEnum('tipo_sistema', ['on_grid','off_grid','hibrido']),
  potenciaRecomendadaKwp: decimal('potencia_recomendada_kwp', { precision: 8, scale: 2 }),
  potenciaFinalKwp: decimal('potencia_final_kwp', { precision: 8, scale: 2 }),
  quantidadeModulos: int('quantidade_modulos'),
  potenciaModuloWp: int('potencia_modulo_wp'),
  areaEstimadaM2: decimal('area_estimada_m2', { precision: 8, scale: 2 }),
  geracaoMensalKwh: json('geracao_mensal_kwh').$type<number[]>(),
  geracaoAnualKwh: decimal('geracao_anual_kwh', { precision: 10, scale: 2 }),
  percentualCompensacao: decimal('percentual_compensacao', { precision: 5, scale: 2 }),
  economiaMensalEstimada: decimal('economia_mensal_estimada', { precision: 10, scale: 2 }),
  calculadoAutomaticamente: boolean('calculado_automaticamente').default(true).notNull(),
  editadoEm: timestamp('editado_em'),
  editadoPor: int('editado_por').references(() => usuario.id),
})

// â”€â”€â”€ EQUIPAMENTOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const equipamentoProposta = mysqlTable('equipamento_proposta', {
  id: int('id').primaryKey().autoincrement(),
  propostaId: int('proposta_id').notNull().references(() => proposta.id, { onDelete: 'cascade' }),
  tipo: mysqlEnum('tipo', ['modulo','inversor','microinversor','otimizador','estrutura','cabo','outros']).notNull(),
  fabricante: varchar('fabricante', { length: 100 }),
  modelo: varchar('modelo', { length: 200 }),
  potenciaWp: int('potencia_wp'),
  quantidade: int('quantidade').notNull(),
  precoUnitario: decimal('preco_unitario', { precision: 10, scale: 2 }),
  precoTotal: decimal('preco_total', { precision: 10, scale: 2 }),
  garantiaAnos: int('garantia_anos'),
  ordem: int('ordem').default(0).notNull(),
})

// â”€â”€â”€ PRECIFICAÃ‡ÃƒO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const precificacao = mysqlTable('precificacao', {
  id: int('id').primaryKey().autoincrement(),
  propostaId: int('proposta_id').notNull().unique().references(() => proposta.id),
  metodo: mysqlEnum('metodo', ['margem_custo','margem_venda']).notNull(),
  margemAplicada: decimal('margem_aplicada', { precision: 5, scale: 2 }).notNull(),
  comissaoAplicada: decimal('comissao_aplicada', { precision: 5, scale: 2 }).notNull(),
  custoTotal: decimal('custo_total', { precision: 10, scale: 2 }).notNull(),
  precoVenda: decimal('preco_venda', { precision: 10, scale: 2 }).notNull(),
  lucroBruto: decimal('lucro_bruto', { precision: 10, scale: 2 }).notNull(),
  descontoAplicado: decimal('desconto_aplicado', { precision: 10, scale: 2 }).default('0').notNull(),
  precoFinal: decimal('preco_final', { precision: 10, scale: 2 }).notNull(),
})

export const itemCustoProposta = mysqlTable('item_custo_proposta', {
  id: int('id').primaryKey().autoincrement(),
  propostaId: int('proposta_id').notNull().references(() => proposta.id, { onDelete: 'cascade' }),
  categoriaId: int('categoria_id').references(() => categoriaCusto.id),
  descricao: varchar('descricao', { length: 200 }).notNull(),
  tipoCusto: varchar('tipo_custo', { length: 50 }).notNull(),
  quantidade: decimal('quantidade', { precision: 10, scale: 3 }),
  custoUnitario: decimal('custo_unitario', { precision: 10, scale: 4 }),
  custoTotal: decimal('custo_total', { precision: 10, scale: 2 }).notNull(),
  margem: decimal('margem', { precision: 5, scale: 2 }).notNull(),
  incluso: boolean('incluso').default(true).notNull(),
})

// â”€â”€â”€ ANÃLISE FINANCEIRA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const analiseFinanceira = mysqlTable('analise_financeira', {
  id: int('id').primaryKey().autoincrement(),
  propostaId: int('proposta_id').notNull().unique().references(() => proposta.id),
  investimentoTotal: decimal('investimento_total', { precision: 10, scale: 2 }).notNull(),
  economiaMensalAno1: decimal('economia_mensal_ano1', { precision: 10, scale: 2 }).notNull(),
  economiaAnualAno1: decimal('economia_anual_ano1', { precision: 10, scale: 2 }).notNull(),
  paybackSimplesMeses: int('payback_simples_meses').notNull(),
  paybackDescontadoMeses: int('payback_descontado_meses').notNull(),
  vpl: decimal('vpl', { precision: 12, scale: 2 }).notNull(),
  tir: decimal('tir', { precision: 8, scale: 6 }).notNull(),
  rendimentoPrimeiroAnoPct: decimal('rendimento_primeiro_ano_pct', { precision: 6, scale: 2 }).notNull(),
  saldo25Anos: decimal('saldo_25_anos', { precision: 12, scale: 2 }).notNull(),
  comparativoPoupanca25a: decimal('comparativo_poupanca_25a', { precision: 12, scale: 2 }),
  comparativoRendaFixa25a: decimal('comparativo_renda_fixa_25a', { precision: 12, scale: 2 }),
  fluxoCaixaJson: json('fluxo_caixa_json').$type<Record<string, unknown>[]>().notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// â”€â”€â”€ CONDIÃ‡Ã•ES COMERCIAIS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const condicaoComercial = mysqlTable('condicao_comercial', {
  id: int('id').primaryKey().autoincrement(),
  propostaId: int('proposta_id').notNull().references(() => proposta.id, { onDelete: 'cascade' }),
  tipo: mysqlEnum('tipo', ['avista','parcelado_marcos','financiamento','cartao']).notNull(),
  descricao: varchar('descricao', { length: 200 }),
  valorTotal: decimal('valor_total', { precision: 10, scale: 2 }).notNull(),
  ativa: boolean('ativa').default(true).notNull(),
  ordem: int('ordem').default(0).notNull(),
})

export const parcelaPagamento = mysqlTable('parcela_pagamento', {
  id: int('id').primaryKey().autoincrement(),
  condicaoId: int('condicao_id').notNull().references(() => condicaoComercial.id, { onDelete: 'cascade' }),
  numeroParcela: int('numero_parcela').notNull(),
  descricaoEvento: varchar('descricao_evento', { length: 200 }).notNull(),
  valor: decimal('valor', { precision: 10, scale: 2 }).notNull(),
  percentualDoTotal: decimal('percentual_do_total', { precision: 5, scale: 2 }),
  prazoDias: int('prazo_dias').notNull(),
  tipoPrazo: mysqlEnum('tipo_prazo', ['uteis','corridos']).default('uteis').notNull(),
  referenciaEvento: varchar('referencia_evento', { length: 100 }).notNull(),
  meiosPagamento: json('meios_pagamento').$type<string[]>().notNull(),
  dadosBancariosJson: json('dados_bancarios_json').$type<Record<string, string>>(),
})

// â”€â”€â”€ BLOCOS DA PROPOSTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const blocoProposta = mysqlTable('bloco_proposta', {
  id: int('id').primaryKey().autoincrement(),
  propostaId: int('proposta_id').notNull().references(() => proposta.id, { onDelete: 'cascade' }),
  tipoBloco: varchar('tipo_bloco', { length: 50 }).notNull(),
  ativo: boolean('ativo').default(true).notNull(),
  ordem: int('ordem').notNull(),
  conteudoJson: json('conteudo_json').$type<Record<string, unknown>>(),
  textoOverride: text('texto_override'),
})

// â”€â”€â”€ TEXTOS INSTITUCIONAIS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const textoInstitucional = mysqlTable('texto_institucional', {
  id: int('id').primaryKey().autoincrement(),
  empresaId: int('empresa_id').notNull().references(() => empresa.id),
  chave: varchar('chave', { length: 100 }).notNull(),
  titulo: varchar('titulo', { length: 200 }),
  conteudo: text('conteudo').notNull(),
  versao: int('versao').default(1).notNull(),
  ativo: boolean('ativo').default(true).notNull(),
  updatedAt: timestamp('updated_at'),
}, (t) => ({
  ukEmpresaChave: uniqueIndex('uk_empresa_chave').on(t.empresaId, t.chave),
}))

// â”€â”€â”€ CRONOGRAMA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const cronogracoMarco = mysqlTable('cronograma_marco', {
  id: int('id').primaryKey().autoincrement(),
  empresaId: int('empresa_id').references(() => empresa.id),
  propostaId: int('proposta_id').references(() => proposta.id),
  descricao: varchar('descricao', { length: 300 }).notNull(),
  prazoTexto: varchar('prazo_texto', { length: 100 }),
  ordem: int('ordem').notNull(),
})

// â”€â”€â”€ RELATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export const catalogoModulo = mysqlTable('catalogo_modulo', {
  id:            int('id').primaryKey().autoincrement(),
  empresaId:     int('empresa_id').notNull().references(() => empresa.id),
  fabricante:    varchar('fabricante', { length: 100 }).notNull(),
  modelo:        varchar('modelo', { length: 200 }).notNull(),
  potenciaWp:    int('potencia_wp').notNull(),
  eficiencia:    decimal('eficiencia', { precision: 5, scale: 2 }),
  garantiaAnos:  int('garantia_anos').default(12),
  precoUnitario: decimal('preco_unitario', { precision: 10, scale: 2 }),
  ativo:         boolean('ativo').default(true).notNull(),
  createdAt:     timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const catalogoInversor = mysqlTable('catalogo_inversor', {
  id:            int('id').primaryKey().autoincrement(),
  empresaId:     int('empresa_id').notNull().references(() => empresa.id),
  fabricante:    varchar('fabricante', { length: 100 }).notNull(),
  modelo:        varchar('modelo', { length: 200 }).notNull(),
  potenciaW:     int('potencia_w').notNull(),
  tipo:          mysqlEnum('tipo_inversor', ['microinversor','string','hibrido','otimizador']).notNull(),
  garantiaAnos:  int('garantia_anos').default(12),
  precoUnitario: decimal('preco_unitario', { precision: 10, scale: 2 }),
  ativo:         boolean('ativo').default(true).notNull(),
  createdAt:     timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const modeloBloco = mysqlTable('modelo_bloco', {
  id:         int('id').primaryKey().autoincrement(),
  empresaId:  int('empresa_id').notNull().references(() => empresa.id),
  tipoBloco:  varchar('tipo_bloco', { length: 60 }).notNull(),
  titulo:     varchar('titulo', { length: 200 }).notNull(),
  conteudo:   text('conteudo').notNull(),
  ativo:      boolean('ativo').default(true).notNull(),
  ordem:      int('ordem').default(0).notNull(),
  createdAt:  timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})
export const empresaRelations = relations(empresa, ({ many }) => ({
  usuarios: many(usuario),
  clientes: many(cliente),
  propostas: many(proposta),
  premissas: many(premissasConfig),
  categoriasCusto: many(categoriaCusto),
  textosInstitucionais: many(textoInstitucional),
}))

export const clienteRelations = relations(cliente, ({ one, many }) => ({
  empresa: one(empresa, { fields: [cliente.empresaId], references: [empresa.id] }),
  faturas: many(fatura),
  propostas: many(proposta),
}))

export const faturaRelations = relations(fatura, ({ one, many }) => ({
  cliente: one(cliente, { fields: [fatura.clienteId], references: [cliente.id] }),
  historicoConsumo: many(historicoConsumo),
}))

export const itemServicoProposta = mysqlTable('item_servico_proposta', {
  id: int('id').primaryKey().autoincrement(),
  propostaId: int('proposta_id').notNull().references(() => proposta.id, { onDelete: 'cascade' }),
  descricao: varchar('descricao', { length: 300 }).notNull(),
  unidade: varchar('unidade', { length: 30 }).default('un').notNull(),
  quantidade: decimal('quantidade', { precision: 10, scale: 3 }).notNull(),
  valorUnitario: decimal('valor_unitario', { precision: 10, scale: 2 }).notNull(),
  valorTotal: decimal('valor_total', { precision: 10, scale: 2 }).notNull(),
  ordem: int('ordem').default(0).notNull(),
})

// ─── ORDEM DE SERVIÇO ────────────────────────────────────────────────────────

export const ordemServico = mysqlTable('ordem_servico', {
  id:                  int('id').primaryKey().autoincrement(),
  empresaId:           int('empresa_id').notNull(),
  propostaId:          int('proposta_id').notNull(),
  numero:              varchar('numero', { length: 20 }).notNull().unique(),
  status:              mysqlEnum('status', ['aberta', 'em_execucao', 'concluida', 'cancelada']).default('aberta').notNull(),
  titulo:              varchar('titulo', { length: 200 }),
  descricao:           text('descricao'),
  tecnicoResponsavel:  varchar('tecnico_responsavel', { length: 100 }),
  dataPrevistaInicio:  date('data_prevista_inicio'),
  dataPrevistaFim:     date('data_prevista_fim'),
  dataInicio:          date('data_inicio'),
  dataConclusao:       date('data_conclusao'),
  temAgendamento:      boolean('tem_agendamento').default(true).notNull(),
  observacoes:         text('observacoes'),
  createdAt:           timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt:           timestamp('updated_at'),
})

export const osAgendamento = mysqlTable('os_agendamento', {
  id:              int('id').primaryKey().autoincrement(),
  ordemServicoId:  int('ordem_servico_id').notNull(),
  empresaId:       int('empresa_id').notNull(),
  dataAgendada:    date('data_agendada').notNull(),
  horaInicio:      varchar('hora_inicio', { length: 5 }),
  horaFim:         varchar('hora_fim', { length: 5 }),
  tipo:            mysqlEnum('tipo', ['vistoria', 'instalacao', 'manutencao', 'revisao', 'entrega']).default('instalacao').notNull(),
  tecnico:         varchar('tecnico', { length: 100 }),
  endereco:        text('endereco'),
  observacoes:     text('observacoes'),
  status:          mysqlEnum('status', ['agendado', 'confirmado', 'realizado', 'cancelado']).default('agendado').notNull(),
  createdAt:       timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const osMarco = mysqlTable('os_marco', {
  id:              int('id').primaryKey().autoincrement(),
  ordemServicoId:  int('ordem_servico_id').notNull(),
  titulo:          varchar('titulo', { length: 200 }).notNull(),
  descricao:       text('descricao'),
  ordem:           int('ordem').default(0).notNull(),
  dataPrevista:    date('data_prevista'),
  dataRealizada:   date('data_realizada'),
  concluido:       boolean('concluido').default(false).notNull(),
  responsavel:     varchar('responsavel', { length: 100 }),
  observacoes:     text('observacoes'),
  createdAt:       timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── FINANCEIRO ──────────────────────────────────────────────────────────────
export * from './fin_schema'

export const propostaRelations = relations(proposta, ({ one, many }) => ({
  cliente: one(cliente, { fields: [proposta.clienteId], references: [cliente.id] }),
  fatura: one(fatura, { fields: [proposta.faturaId], references: [fatura.id] }),
  usuario: one(usuario, { fields: [proposta.usuarioId], references: [usuario.id] }),
  dimensionamento: one(dimensionamento, { fields: [proposta.id], references: [dimensionamento.propostaId] }),
  equipamentos: many(equipamentoProposta),
  itensServico: many(itemServicoProposta),
  precificacao: one(precificacao, { fields: [proposta.id], references: [precificacao.propostaId] }),
  analiseFinanceira: one(analiseFinanceira, { fields: [proposta.id], references: [analiseFinanceira.propostaId] }),
  condicoesComerciais: many(condicaoComercial),
  blocos: many(blocoProposta),
}))
