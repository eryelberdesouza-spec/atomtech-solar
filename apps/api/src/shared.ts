// ═══════════════════════════════════════════════════════════════════
// @atomtech/shared — Tipos de domínio compartilhados
// API + Web consomem deste pacote. Zero dependências externas.
// ═══════════════════════════════════════════════════════════════════

// ─── ENUMS ──────────────────────────────────────────────────────────────────

export type TipoPessoa = 'fisica' | 'juridica'
export type Role = 'admin' | 'comercial' | 'tecnico' | 'visualizador'
export type StatusProposta = 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'expirada'
export type Topologia = 'tradicional' | 'microinversor' | 'otimizador'
export type TipoSistema = 'on_grid' | 'off_grid' | 'hibrido'
export type TipoTelhado = 'carport' | 'ceramico' | 'fibrocimento' | 'laje' | 'shingle' | 'metalico' | 'zipado' | 'solo'
export type TipoCusto = 'fixo' | 'multiplo' | 'avancado' | 'proporcional_kwp'
export type MetodoPrecificacao = 'margem_custo' | 'margem_venda'
export type TipoPagamento = 'avista' | 'parcelado_marcos' | 'financiamento' | 'cartao'
export type MeioPagamento = 'pix' | 'ted' | 'boleto' | 'cartao_credito' | 'cartao_debito'
export type TipoPrazo = 'uteis' | 'corridos'
export type ReferenciaEvento =
  | 'assinatura_contrato'
  | 'entrega_equipamentos'
  | 'conclusao_servicos'
  | 'vencimento_parcela_anterior'
  | 'aprovacao_financiamento'
export type TipoEquipamento = 'modulo' | 'inversor' | 'microinversor' | 'otimizador' | 'estrutura' | 'cabo' | 'outros'
export type GrupoTarifario = 'A' | 'B'
export type FaseTensao =
  | 'Monofásico 127V'
  | 'Monofásico 220V'
  | 'Bifásico 127/220V'
  | 'Trifásico 127/220V'
  | 'Trifásico 220/380V'

/**
 * Enquadramento GD conforme Lei 14.300/2022:
 * - GD1: sistemas com protocolo/homologação até 06/01/2023 → isentos do Fio B até 2045
 * - GD2: sistemas protocolados a partir de 07/01/2023 → sujeitos à transição tarifária
 */
export type EnquadramentoGD = 'GD1' | 'GD2'

// ─── CRONOGRAMA FIO B — Lei 14.300/2022 ─────────────────────────────────────
// Percentual do Fio B cobrado sobre a energia INJETADA/COMPENSADA (GD2)
// GD1 = 0% (isento até 2045)
export const CRONOGRAMA_FIO_B: Record<number, number> = {
  2023: 0.15,
  2024: 0.30,
  2025: 0.45,
  2026: 0.60,
  2027: 0.75,
  2028: 0.90,
  // 2029+: aguardando regulamentação ANEEL — usamos 1.0 como projeção conservadora
}

export function getPctFioBAnual(ano: number, enquadramento: EnquadramentoGD): number {
  if (enquadramento === 'GD1') return 0
  if (ano < 2023) return 0
  if (ano >= 2029) return 1.0   // projeção conservadora até regulamentação
  return CRONOGRAMA_FIO_B[ano] ?? 1.0
}

// ─── EMPRESA ─────────────────────────────────────────────────────────────────

export interface Empresa {
  id: number
  nome: string
  cnpj: string
  inscricaoEstadual?: string
  isentoIE: boolean
  estado: string
  cidade: string
  endereco?: string
  cep?: string
  telefone?: string
  email?: string
  site?: string
  logoUrl?: string
  corPrimaria: string
  corSecundaria: string
  // Dados bancários
  bancoNome?: string
  bancoCodigo?: string
  bancoAgencia?: string
  bancoConta?: string
  bancoTipo?: 'corrente' | 'poupança'
  bancoPixTipo?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatorio'
  bancoPixChave?: string
  // Rodapé
  rodapeTexto?: string
  // Regras de cadastro de clientes
  regras: RegrasCadastro
  createdAt: string
  updatedAt?: string
}

export interface RegrasCadastro {
  bloquearDupNome: boolean
  bloquearDupEmpresa: boolean
  bloquearDupCpfCnpj: boolean
  bloquearDupEmail: boolean
  bloquearDupTelefone: boolean
  obrigatorioTelefone: boolean
  obrigatorioCep: boolean
  obrigatorioEmpresa: boolean
  obrigatorioCpfCnpj: boolean
  obrigatorioEmail: boolean
  obrigatorioEndereco: boolean
  obrigatorioEstado: boolean
  obrigatorioCidade: boolean
}

// ─── USUÁRIO ─────────────────────────────────────────────────────────────────

export interface Usuario {
  id: number
  empresaId: number
  nome: string
  email: string
  telefone?: string
  cargo?: string
  role: Role
  margemPadrao?: number
  comissaoPadrao?: number
  ativo: boolean
  createdAt: string
}

// ─── CLIENTE ─────────────────────────────────────────────────────────────────

export interface Cliente {
  id: number
  empresaId: number
  tipoPessoa: TipoPessoa
  nome: string
  razaoSocial?: string
  cpfCnpj?: string
  nomeResponsavel?: string
  telefone?: string
  email?: string
  cep?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  distribuidora?: string
  observacoes?: string
  createdBy?: number
  createdAt: string
  updatedAt?: string
}

// ─── FATURA ──────────────────────────────────────────────────────────────────

export interface Fatura {
  id: number
  clienteId: number
  distribuidora?: string
  referencia?: string          // MM/YYYY
  codigoUC?: string
  codigoInstalacao?: string
  tipoFornecimento?: string
  classificacao?: string
  grupoTarifario: GrupoTarifario
  subgrupo?: string
  consumoKwh?: number
  valorTotal?: number
  tarifaMedia?: number
  cip?: number
  icmsAliquota?: number
  icmsValor?: number
  pisAliquota?: number
  pisValor?: number
  cofinsAliquota?: number
  cofinsValor?: number
  tensaoNominal?: string
  dataLeituraAnterior?: string
  dataLeituraAtual?: string
  diasFaturados?: number
  observacoes?: string
  arquivoUrl?: string
  historicoConsumo: HistoricoConsumo[]
  createdAt: string
}

export interface HistoricoConsumo {
  id?: number
  faturaId?: number
  referencia: string           // MM/YYYY
  consumoKwh: number
  dias?: number
  ordem: number
}

// ─── PREMISSAS ────────────────────────────────────────────────────────────────

export interface PremissasConfig {
  id?: number
  empresaId: number
  // Financeiras
  inflacaoEnergetica: number
  taxaDescontoVpl: number
  considerarCustoDisponibilidade: boolean
  // Sistema solar
  baseIrradiacao: string
  sobredimensionamentoPadrao: number
  perdaEficienciaAnualTradicional: number
  perdaEficienciaAnualMicroinversor: number
  perdaEficienciaAnualOtimizador: number
  trocaInversorAnosTradicional: number
  trocaInversorAnosMicroinversor: number
  trocaInversorAnosOtimizador: number
  custoTrocaInversorTrad: number
  custoTrocaInversorMicro: number
  custoTrocaInversorOtim: number
  margemPotenciaIdeal: number
  // Área útil por telhado
  areaCarport: number
  areaCeramico: number
  areaFibrocimento: number
  areaLaje: number
  areaShingle: number
  areaMetalico: number
  areaZipado: number
  areaSolo: number
  // Valores padrão de tarifa
  grupoTarifarioPadrao: GrupoTarifario
  tarifaPadrao: number
  tePonta: number
  teForaPonta: number
  tusdPonta: number
  tusdForaPonta: number
  tusdFioBBt: number           // TUSD Fio B baixa tensão (R$/kWh) — componente da TUSD
  faseTensaoRede: FaseTensao
  fatorSimultaneidade: number
  impostoEnergia: number
  outrosEncargosAtual: number
  outrosEncargosNovo: number
  tipoTelhadoPadrao: TipoTelhado
  desvioAzimutalPadrao: number
  inclinacaoPadrao: number
  topologiasDisponiveis: Topologia[]
  tipoSistemaPadrao: TipoSistema
  taxaDesempenhoTradicional: number
  taxaDesempenhoMicroinversor: number
  taxaDesempenhoOtimizador: number
  // Precificação
  metodoPrecificacao: MetodoPrecificacao
  margemPadrao: number
  margemKitsUsarPadrao: boolean
  margemKitsValor: number
  updatedAt?: string
}

// ─── PROPOSTA ─────────────────────────────────────────────────────────────────

export interface Proposta {
  id: number
  empresaId: number
  numero: string               // AT-2026-0001
  clienteId: number
  faturaId?: number
  usuarioId?: number
  status: StatusProposta
  versao: number
  propostaPaiId?: number
  templateOrigemId?: number
  isTemplate: boolean
  nomeTemplate?: string
  dataEmissao: string
  dataValidade?: string
  observacoesInternas?: string
  createdBy?: number
  createdAt: string
  updatedAt?: string
}

// ─── DIMENSIONAMENTO ─────────────────────────────────────────────────────────

export interface Dimensionamento {
  id?: number
  propostaId: number
  // Inputs
  consumoMedioMensalKwh: number
  consumoMensalReferencia: number[]    // array 12 meses
  tarifaUsada: number
  tipoTelhado: TipoTelhado
  desvioAzimutal: number
  inclinacaoGraus: number
  topologia: Topologia
  tipoSistema: TipoSistema
  // Resultados
  potenciaRecomendadaKwp: number
  potenciaFinalKwp: number
  quantidadeModulos: number
  potenciaModuloWp: number
  areaEstimadaM2: number
  geracaoMensalKwh: number[]           // 12 meses
  geracaoAnualKwh: number
  percentualCompensacao: number
  economiaMensalEstimada: number
  // Controle
  calculadoAutomaticamente: boolean
  editadoEm?: string
  editadoPor?: number
}

// ─── EQUIPAMENTO ─────────────────────────────────────────────────────────────

export interface EquipamentoProposta {
  id?: number
  propostaId: number
  tipo: TipoEquipamento
  fabricante?: string
  modelo?: string
  potenciaWp?: number
  quantidade: number
  precoUnitario?: number
  precoTotal?: number
  garantiaAnos?: number
  ordem: number
}

// ─── PRECIFICAÇÃO ────────────────────────────────────────────────────────────

export interface CategoriaCusto {
  id: number
  empresaId: number
  nome: string
  item?: string
  tipoCusto: TipoCusto
  margemTipo: 'padrao' | 'personalizada'
  margemValor?: number
  ativo: boolean
  ordem: number
}

export interface ItemCustoProposta {
  id?: number
  propostaId: number
  categoriaId?: number
  descricao: string
  tipoCusto: TipoCusto
  quantidade?: number
  custoUnitario?: number
  custoTotal: number
  margem: number
  incluso: boolean
}

export interface Precificacao {
  id?: number
  propostaId: number
  metodo: MetodoPrecificacao
  margemAplicada: number
  comissaoAplicada: number
  custoTotal: number
  precoVenda: number
  lucroBruto: number
  descontoAplicado: number
  precoFinal: number
  itens: ItemCustoProposta[]
}

// ─── ANÁLISE FINANCEIRA ───────────────────────────────────────────────────────

export interface FluxoCaixaAnual {
  ano: number
  geracaoKwh: number
  tarifa: number
  economiaAnual: number
  custoTrocaInversor: number
  fluxoLiquido: number
  saldoAcumulado: number
  fluxoDescontado: number
  saldoDescontado: number
}

export interface AnaliseFinanceira {
  id?: number
  propostaId: number
  investimentoTotal: number
  economiaMensalAno1: number
  economiaAnualAno1: number
  paybackSimplesMeses: number
  paybackDescontadoMeses: number
  vpl: number
  tir: number
  rendimentoPrimeiroAnoPct: number
  saldo25Anos: number
  comparativoPoupanca25a: number
  comparativoRendaFixa25a: number
  fluxoCaixa: FluxoCaixaAnual[]
  createdAt?: string
}

// ─── CONDIÇÕES COMERCIAIS ─────────────────────────────────────────────────────

export interface DadosBancarios {
  banco?: string
  agencia?: string
  conta?: string
  pixChave?: string
  pixTipo?: string
}

export interface ParcelaPagamento {
  id?: number
  condicaoId?: number
  numeroParcela: number
  descricaoEvento: string
  valor: number
  percentualDoTotal: number
  prazoDias: number
  tipoPrazo: TipoPrazo
  referenciaEvento: ReferenciaEvento
  meiosPagamento: MeioPagamento[]
  dadosBancarios?: DadosBancarios
}

export interface CondicaoComercial {
  id?: number
  propostaId: number
  tipo: TipoPagamento
  descricao: string
  valorTotal: number
  ativa: boolean
  ordem: number
  parcelas: ParcelaPagamento[]
}

// ─── BLOCOS DA PROPOSTA ───────────────────────────────────────────────────────

export type TipoBloco =
  | 'capa'
  | 'resumo_proposta'
  | 'apresentacao_empresa'
  | 'o_que_inclui'
  | 'como_funciona'
  | 'regulamentacao'
  | 'diferenciais'
  | 'garantias'
  | 'fornecedores'
  | 'dimensionamento'
  | 'equipamentos'
  | 'cronograma'
  | 'analise_financeira'
  | 'indicadores_financeiros'
  | 'fluxo_caixa'
  | 'reducao_conta'
  | 'condicoes_comerciais'
  | 'formas_pagamento'
  | 'escopo_servico'
  | 'escopo_entregas'
  | 'observacoes_complementares'
  | 'consideracoes_gerais'
  | 'aceite'
  | 'contato'

export interface BlocoProposta {
  id?: number
  propostaId: number
  tipoBloco: TipoBloco
  ativo: boolean
  ordem: number
  conteudoJson?: Record<string, unknown>
  textoOverride?: string
}

export const BLOCOS_PADRAO: { tipo: TipoBloco; label: string; ordem: number; ativo?: boolean }[] = [
  { tipo: 'capa', label: 'Capa', ordem: 1 },
  { tipo: 'apresentacao_empresa', label: 'Apresentação da Empresa', ordem: 2 },
  { tipo: 'o_que_inclui', label: 'O que a Proposta Inclui', ordem: 3 },
  { tipo: 'como_funciona', label: 'Como Funciona a Energia Solar', ordem: 4 },
  { tipo: 'regulamentacao', label: 'Regulamentação no Brasil', ordem: 5 },
  { tipo: 'diferenciais', label: 'Diferenciais da Atom Tech', ordem: 6 },
  { tipo: 'garantias', label: 'Garantias Inclusas', ordem: 7 },
  { tipo: 'fornecedores', label: 'Fornecedores', ordem: 8 },
  { tipo: 'dimensionamento', label: 'Dimensionamento do Sistema', ordem: 9 },
  { tipo: 'equipamentos', label: 'Equipamentos e Serviços', ordem: 10 },
  { tipo: 'cronograma', label: 'Cronograma', ordem: 11 },
  { tipo: 'analise_financeira', label: 'Análise Financeira', ordem: 12 },
  { tipo: 'indicadores_financeiros', label: 'Indicadores Financeiros', ordem: 13 },
  { tipo: 'fluxo_caixa', label: 'Fluxo de Caixa', ordem: 14 },
  { tipo: 'reducao_conta', label: 'Redução da Conta de Energia', ordem: 15 },
  { tipo: 'condicoes_comerciais', label: 'Condições Comerciais', ordem: 16 },
  { tipo: 'formas_pagamento', label: 'Formas de Pagamento', ordem: 17 },
  { tipo: 'consideracoes_gerais', label: 'Considerações Gerais', ordem: 18 },
  { tipo: 'aceite', label: 'Aceite da Proposta', ordem: 19 },
  { tipo: 'contato', label: 'Contato e Endereço', ordem: 20 },
]

export const BLOCOS_SERVICO_PADRAO: { tipo: string; label: string; ordem: number; ativo?: boolean }[] = [
  { tipo: 'capa',                       label: 'Capa',                            ordem: 1  },
  { tipo: 'apresentacao_empresa',       label: 'Apresentação da Empresa',         ordem: 2  },
  { tipo: 'diferenciais',               label: 'Diferenciais',                    ordem: 3  },
  { tipo: 'garantias',                  label: 'Garantias',                       ordem: 4  },
  // como_funciona e regulamentacao inativos por padrão — contêm conteúdo fotovoltaico
  // específico que não se aplica a propostas de serviço geral. Ative manualmente se necessário.
  { tipo: 'como_funciona',              label: 'Como Funciona',                   ordem: 5,  ativo: false },
  { tipo: 'regulamentacao',             label: 'Regulamentação',                  ordem: 6,  ativo: false },
  // Fornecedores é específico de equipamentos fotovoltaicos (módulos/inversores
  // homologados) — não se aplica a serviço geral. Ative manualmente se necessário.
  { tipo: 'fornecedores',               label: 'Fornecedores',                    ordem: 7,  ativo: false },
  { tipo: 'escopo_entregas',            label: 'O que Propomos Entregar',         ordem: 8  },
  { tipo: 'escopo_servico',             label: 'Escopo do Serviço',               ordem: 9  },
  { tipo: 'condicoes_comerciais',       label: 'Condições Comerciais',            ordem: 10 },
  // Observações Complementares: campo livre para informações adicionais específicas
  // desta proposta (exclusões de escopo, condições especiais, obras civis, etc.)
  { tipo: 'observacoes_complementares', label: 'Observações Complementares',      ordem: 11, ativo: false },
  { tipo: 'consideracoes_gerais',       label: 'Considerações Gerais',            ordem: 12 },
  { tipo: 'aceite',                     label: 'Aceite da Proposta',              ordem: 13 },
  { tipo: 'contato',                    label: 'Contato e Endereço',              ordem: 14 },
]

// ─── MODELO "DIRETO AO PONTO" ─────────────────────────────────────────────────
// Pedido do usuário em 2026-08-10: o modelo clássico (acima) abre com ~8 páginas
// institucionais/educativas antes do cliente ver o que está sendo ofertado e por
// quanto — formato que já foi padrão de mercado (2019-2022), mas hoje atrasa a
// decisão sem agregar, num mercado onde o cliente já pesquisou e está comparando
// preço entre concorrentes. Aqui a lógica se inverte: as primeiras páginas depois
// da capa já são "bloco de decisão" (cliente, oferta, investimento, pagamento,
// aceite) — o conteúdo institucional/técnico/financeiro vira material de apoio no
// final. Payback e demais indicadores financeiros ficam DESATIVADOS por padrão
// (reativáveis manualmente em "Blocos da Proposta") — a venda passa a ser por
// engenharia/qualidade, não por matemática de retorno.
// Revisado em 2026-08-14 após feedback do usuário testando o PDF real: Aceite
// deixou de ser parte do "bloco de decisão" (assinar é o ato final, não algo
// que acontece logo após condições comerciais) e Apresentação passou a vir
// antes de Diferenciais — mesma ordem lógica do modelo Clássico.
export const BLOCOS_DIRETO_SOLAR: { tipo: TipoBloco; label: string; ordem: number; ativo?: boolean }[] = [
  { tipo: 'capa',                     label: 'Capa',                          ordem: 1  },
  { tipo: 'resumo_proposta',          label: 'Resumo da Proposta',            ordem: 2  },
  { tipo: 'dimensionamento',          label: 'Dimensionamento do Sistema',    ordem: 3  },
  { tipo: 'equipamentos',             label: 'Equipamentos e Serviços',       ordem: 4  },
  { tipo: 'condicoes_comerciais',     label: 'Condições Comerciais',          ordem: 5  },
  { tipo: 'formas_pagamento',         label: 'Formas de Pagamento',           ordem: 6  },
  // ───── fim do bloco de decisão — material de apoio a partir daqui ─────
  { tipo: 'cronograma',               label: 'Cronograma',                    ordem: 7  },
  { tipo: 'garantias',                label: 'Garantias Inclusas',            ordem: 8  },
  { tipo: 'apresentacao_empresa',     label: 'Apresentação da Empresa',       ordem: 9  },
  { tipo: 'o_que_inclui',             label: 'O que a Proposta Inclui',       ordem: 10 },
  { tipo: 'diferenciais',             label: 'Diferenciais da Atom Tech',     ordem: 11 },
  { tipo: 'como_funciona',            label: 'Como Funciona a Energia Solar', ordem: 12 },
  { tipo: 'regulamentacao',           label: 'Regulamentação no Brasil',      ordem: 13 },
  { tipo: 'fornecedores',             label: 'Fornecedores',                  ordem: 14 },
  { tipo: 'analise_financeira',       label: 'Análise Financeira',            ordem: 15, ativo: false },
  { tipo: 'indicadores_financeiros',  label: 'Indicadores Financeiros',       ordem: 16, ativo: false },
  { tipo: 'fluxo_caixa',              label: 'Fluxo de Caixa',                ordem: 17, ativo: false },
  { tipo: 'reducao_conta',            label: 'Redução da Conta de Energia',   ordem: 18, ativo: false },
  { tipo: 'consideracoes_gerais',     label: 'Considerações Gerais',          ordem: 19 },
  { tipo: 'aceite',                   label: 'Aceite da Proposta',            ordem: 20 },
  { tipo: 'contato',                  label: 'Contato e Endereço',            ordem: 21 },
]

// Revisado em 2026-08-14 após feedback do usuário testando o PDF real:
// - "O que Propomos Entregar" ficava duplicado com o escopo já mostrado no
//   Resumo — removido como seção própria neste modelo (o texto passa a
//   aparecer só dentro do Resumo). O bloco continua listado aqui só para
//   preservar a fonte do texto; não vira mais uma seção separada.
// - Aceite não é mais parte do "bloco de decisão" — assinar é o ato FINAL,
//   depois de todo o conteúdo de apoio, não logo após condições de pagamento.
// - Apresentação (Quem Somos) vem antes de Diferenciais (Por que nos
//   escolher) — mesma ordem lógica do modelo Clássico.
// - Fornecedores é específico de equipamentos fotovoltaicos — não se aplica
//   a serviço geral, fica desativado por padrão (igual ao Clássico).
export const BLOCOS_DIRETO_SERVICO: { tipo: TipoBloco; label: string; ordem: number; ativo?: boolean }[] = [
  { tipo: 'capa',                       label: 'Capa',                     ordem: 1  },
  { tipo: 'resumo_proposta',            label: 'Resumo da Proposta',       ordem: 2  },
  { tipo: 'escopo_entregas',            label: 'O que Propomos Entregar',  ordem: 3  },
  { tipo: 'escopo_servico',             label: 'Escopo do Serviço',        ordem: 4  },
  { tipo: 'condicoes_comerciais',       label: 'Condições Comerciais',     ordem: 5  },
  // ───── fim do bloco de decisão — material de apoio a partir daqui ─────
  { tipo: 'garantias',                  label: 'Garantias',                ordem: 6  },
  { tipo: 'apresentacao_empresa',       label: 'Apresentação da Empresa',  ordem: 7  },
  { tipo: 'diferenciais',               label: 'Diferenciais',             ordem: 8  },
  { tipo: 'como_funciona',              label: 'Como Funciona',            ordem: 9,  ativo: false },
  { tipo: 'regulamentacao',             label: 'Regulamentação',           ordem: 10, ativo: false },
  { tipo: 'fornecedores',               label: 'Fornecedores',             ordem: 11, ativo: false },
  { tipo: 'observacoes_complementares', label: 'Observações Complementares', ordem: 12, ativo: false },
  { tipo: 'consideracoes_gerais',       label: 'Considerações Gerais',     ordem: 13 },
  { tipo: 'aceite',                     label: 'Aceite da Proposta',       ordem: 14 },
  { tipo: 'contato',                    label: 'Contato e Endereço',       ordem: 15 },
]

// ─── MODELO DE BLOCO ─────────────────────────────────────────────────────────

export interface ModeloBloco {
  id: number
  empresaId: number
  tipoBloco: string
  titulo: string
  conteudo: string
  ativo: boolean
  ordem: number
  createdAt?: string
}

// ─── TEXTO INSTITUCIONAL ──────────────────────────────────────────────────────

export interface TextoInstitucional {
  id?: number
  empresaId: number
  chave: string
  titulo?: string
  conteudo: string
  versao: number
  ativo: boolean
  updatedAt?: string
}

// ─── MOTOR DE CÁLCULO — INPUTS/OUTPUTS ───────────────────────────────────────

export interface SizingInput {
  consumoMensalKwh: number[]
  tarifaMediaKwh: number
  cip: number
  topologia: Topologia
  tipoTelhado: TipoTelhado
  desvioAzimutal: number
  inclinacaoGraus: number
  premissas: PremissasConfig
  potenciaFinalKwpManual?: number  // Override direto da potência (modo kWp)
}

export interface SizingResult {
  consumoMedioMensal: number
  geracaoNecessariaKwh: number
  potenciaRecomendadaKwp: number
  potenciaFinalKwp: number
  quantidadeModulosAproximada: number
  areaEstimadaM2: number
  geracaoMensalKwh: number[]
  geracaoAnualKwh: number
  percentualCompensacao: number
  economiaMensalEstimada: number
  fatorIrradiacao: number
  taxaDesempenho: number
}

export interface FinancialInput {
  investimentoTotal: number
  geracaoAnualKwh: number
  tarifaInicialKwh: number     // tarifa total (TUSD + TE + impostos) usada como base
  premissas: Pick<
    PremissasConfig,
    | 'inflacaoEnergetica'
    | 'taxaDescontoVpl'
    | 'perdaEficienciaAnualTradicional'
    | 'trocaInversorAnosTradicional'
    | 'custoTrocaInversorTrad'
  >
  topologia: Topologia
  horizonte?: number

  // ── Fio B (Lei 14.300/2022) ───────────────────────────────────────────────
  // Enquadramento define se há cobrança (GD1 = isento, GD2 = transição 2023-2029)
  enquadramentoGD?: EnquadramentoGD   // default: 'GD2' (novos projetos)
  anoHomologacao?: number              // ano em que o orçamento de conexão foi emitido

  // Componentes tarifárias da concessionária (sem impostos)
  tusd?: number                        // TUSD total (R$/kWh) — ex: 0.42392 Neoenergia Brasília B1
  te?: number                          // Tarifa de Energia (R$/kWh) — ex: 0.40280 Neoenergia Brasília B1
  tusdFioB?: number                    // Componente Fio B dentro da TUSD (R$/kWh)

  // Perfil de uso — proporção de consumo instantâneo vs injetado/compensado
  // Instantâneo: energia solar consumida no mesmo momento em que é gerada (não passa pela rede)
  // Injetado: excedente injetado na rede e compensado posteriormente → sujeito ao Fio B
  pctInstantaneo?: number              // default: 0.45 (45%)
  pctInjetado?: number                 // default: 0.55 (55%) — calculado como 1 - pctInstantaneo
}

export interface FinancialResult {
  economiaMensalAno1: number
  economiaAnualAno1: number
  paybackSimplesMeses: number
  paybackDescontadoMeses: number
  vpl: number
  tir: number
  rendimentoPrimeiroAnoPct: number
  saldo25Anos: number
  fluxoCaixa: FluxoCaixaAnual[]
  comparativoPoupanca25a: number
  comparativoRendaFixa25a: number
  // Detalhamento Fio B para exibição no PDF
  custoFioBMensalAno1?: number         // custo do Fio B no 1º ano (R$/mês)
  economiaMensalLiquidaAno1?: number   // economia já descontado o Fio B
  enquadramentoGD?: EnquadramentoGD
  pctFioBVigente?: number              // % Fio B cobrado no ano atual
}

export interface PricingInput {
  itens: ItemCustoInput[]
  potenciaKwp: number
  quantidadeModulos: number
  quantidadeInversores: number
  metodoPrecificacao: MetodoPrecificacao
  margemPadrao: number
  comissao: number
  descontoManual?: number
}

export interface ItemCustoInput {
  categoriaId?: number
  descricao: string
  tipoCusto: TipoCusto
  valorFixo?: number
  valorPorUnidade?: number
  quantidade?: number
  valorAvancado?: number
  valorPorKwp?: number
  margemOverride?: number | null
  incluso: boolean
}

export interface PricingResult {
  itensDetalhados: ItemCustoCalculado[]
  custoTotal: number
  margemAplicada: number
  comissaoAplicada: number
  precoVenda: number
  lucro: number
  descontoAplicado: number
  precoFinal: number
}

export interface ItemCustoCalculado extends ItemCustoInput {
  custoCalculado: number
  margemEfetiva: number
  precoComMargem: number
}

// ─── PROPOSTA COMPLETA (para geração de PDF) ──────────────────────────────────

export interface PropostaCompleta {
  proposta: Proposta
  empresa: Empresa
  cliente: Cliente
  fatura?: Fatura
  premissasSnapshot: PremissasConfig
  dimensionamento: Dimensionamento
  equipamentos: EquipamentoProposta[]
  precificacao: Precificacao
  analiseFinanceira: AnaliseFinanceira
  condicoesComerciais: CondicaoComercial[]
  blocos: BlocoProposta[]
  textos: Record<string, TextoInstitucional>
}
