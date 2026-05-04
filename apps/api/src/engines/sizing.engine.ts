// ═══════════════════════════════════════════════════════════════════
// Motor de Dimensionamento Técnico Fotovoltaico
// Módulo puro — zero dependências de Express/React/ORM.
// Recebe inputs tipados, retorna resultados calculados.
// Testável de forma isolada.
// ═══════════════════════════════════════════════════════════════════

import type {
  SizingInput,
  SizingResult,
  Topologia,
  TipoTelhado,
  PremissasConfig,
} from '../shared'

// ─── IRRADIAÇÃO SOLAR ───────────────────────────────────────────────
// Valores baseados no Atlas Brasileiro de Energia Solar (INPE 2017)
// Irradiação média mensal em kWh/m²/dia para o DF/Centro-Oeste
// Ajustada pelo desvio azimutal e inclinação dos módulos.

const IRRADIACAO_MENSAL_DF_BASE = [
  5.80, // Jan — verão, nublado mas incidente
  5.60, // Fev
  5.40, // Mar
  5.50, // Abr
  5.70, // Mai
  5.90, // Jun — inverno, céu limpo
  6.10, // Jul — pico inverno DF
  6.20, // Ago
  5.80, // Set
  5.20, // Out — início chuvas
  5.00, // Nov
  5.10, // Dez
]

// Fator de correção por desvio azimutal (Norte = 0°)
// Penalidade para desvios da orientação ideal
function fatorAzimutal(desvioGraus: number): number {
  const d = Math.abs(desvioGraus)
  if (d <= 10) return 1.00
  if (d <= 20) return 0.99
  if (d <= 30) return 0.97
  if (d <= 45) return 0.94
  if (d <= 60) return 0.88
  if (d <= 90) return 0.78
  return 0.65
}

// Fator de correção por inclinação dos módulos
// Inclinação ótima para o DF é ~15-20°
function fatorInclinacao(inclinacaoGraus: number): number {
  const i = inclinacaoGraus
  if (i < 5) return 0.96
  if (i <= 10) return 0.98
  if (i <= 15) return 0.99
  if (i <= 25) return 1.00  // Faixa ótima para DF
  if (i <= 35) return 0.99
  if (i <= 45) return 0.97
  return 0.93
}

// Irradiação média anual corrigida (kWh/m²/dia)
export function calcularIrradiacao(
  desvioAzimutal: number,
  inclinacaoGraus: number,
): number {
  const irradiacaoMedia =
    IRRADIACAO_MENSAL_DF_BASE.reduce((a, b) => a + b, 0) / 12

  return (
    irradiacaoMedia *
    fatorAzimutal(desvioAzimutal) *
    fatorInclinacao(inclinacaoGraus)
  )
}

// Irradiação por mês para cálculo de geração mensal
export function calcularIrradiacaoMensal(
  desvioAzimutal: number,
  inclinacaoGraus: number,
): number[] {
  const fa = fatorAzimutal(desvioAzimutal)
  const fi = fatorInclinacao(inclinacaoGraus)
  return IRRADIACAO_MENSAL_DF_BASE.map((v) => v * fa * fi)
}

// ─── TAXA DE DESEMPENHO POR TOPOLOGIA ───────────────────────────────

export function getTaxaDesempenho(
  topologia: Topologia,
  premissas: PremissasConfig,
): number {
  switch (topologia) {
    case 'tradicional':
      return Number(premissas.taxaDesempenhoTradicional)
    case 'microinversor':
      return Number(premissas.taxaDesempenhoMicroinversor)
    case 'otimizador':
      return Number(premissas.taxaDesempenhoOtimizador)
  }
}

// ─── FATOR DE ÁREA POR TIPO DE TELHADO ──────────────────────────────

export function getAreaFatorTelhado(
  tipoTelhado: TipoTelhado,
  premissas: PremissasConfig,
): number {
  const map: Record<TipoTelhado, keyof PremissasConfig> = {
    carport: 'areaCarport',
    ceramico: 'areaCeramico',
    fibrocimento: 'areaFibrocimento',
    laje: 'areaLaje',
    shingle: 'areaShingle',
    metalico: 'areaMetalico',
    zipado: 'areaZipado',
    solo: 'areaSolo',
  }
  return Number(premissas[map[tipoTelhado]])
}

// ─── ARREDONDAMENTO DE POTÊNCIA ──────────────────────────────────────
// Arredonda para múltiplos comerciais de kWp

function arredondarPotenciaKwp(kwp: number, margemIdeal: number): number {
  // Margem adicional configurável
  const comMargem = kwp * (1 + margemIdeal / 100)

  // Arredonda para o próximo 0.5 kWp comercial
  return Math.ceil(comMargem * 2) / 2
}

// ─── CÁLCULO DE CONSUMO BASE ─────────────────────────────────────────

function calcularConsumoBase(
  consumoMensalKwh: number[],
  cip: number,
  tarifaMediaKwh: number,
  considerarCIP: boolean,
): number {
  const media =
    consumoMensalKwh.reduce((a, b) => a + b, 0) / consumoMensalKwh.length

  // Se não considera CIP, subtrai o equivalente em kWh da CIP
  if (!considerarCIP && tarifaMediaKwh > 0) {
    const cipEmKwh = cip / tarifaMediaKwh
    return Math.max(0, media - cipEmKwh)
  }

  return media
}

// ─── MOTOR PRINCIPAL ─────────────────────────────────────────────────

export function calcularDimensionamento(input: SizingInput): SizingResult {
  const { premissas } = input

  // Valida entradas
  if (!input.consumoMensalKwh || input.consumoMensalKwh.length === 0) {
    throw new Error('É necessário ao menos 1 mês de consumo para dimensionar')
  }

  // DEBUG — remover após validação
  console.log('[SIZING] consumoMensalKwh:', input.consumoMensalKwh.length, 'itens, média:', input.consumoMensalKwh.reduce((a,b)=>a+b,0)/input.consumoMensalKwh.length)
  console.log('[SIZING] potenciaFinalKwpManual:', input.potenciaFinalKwpManual)

  // 1. Consumo médio mensal (base do cálculo)
  const consumoMedioMensal =
    input.consumoMensalKwh.reduce((a, b) => a + b, 0) /
    input.consumoMensalKwh.length

  // 2. Consumo base — desconta CIP se configurado
  const consumoBase = calcularConsumoBase(
    input.consumoMensalKwh,
    input.cip,
    input.tarifaMediaKwh,
    Boolean(premissas.considerarCustoDisponibilidade),
  )

  // 3. Irradiação solar média e mensal
  const irradiacaoMedia = calcularIrradiacao(
    input.desvioAzimutal,
    input.inclinacaoGraus,
  )
  const irradiacaoMensal = calcularIrradiacaoMensal(
    input.desvioAzimutal,
    input.inclinacaoGraus,
  )

  // 4. Taxa de desempenho do sistema (PR — Performance Ratio)
  const taxaDesempenho = getTaxaDesempenho(input.topologia, premissas) / 100

  // 5. Fator de geração mensal (kWh/kWp/mês)
  // fator = H_sol_dia × PR × 30 dias
  const fatorGeracaoMensal = irradiacaoMedia * taxaDesempenho * 30

  // 6. Potência pico necessária (kWp)
  // Fórmula: P_kWp = consumo_kWh / fator_geracao_kWh_por_kWp_mes
  const potenciaRecomendadaKwp = consumoBase / fatorGeracaoMensal

  // 7. Usar potência manual (modo kWp) ou calculada pelo consumo
  // NÃO aplica sobredimensionamento automático — o usuário controla isso via slider
  const potenciaBaseKwp = input.potenciaFinalKwpManual && input.potenciaFinalKwpManual > 0
    ? input.potenciaFinalKwpManual
    : potenciaRecomendadaKwp

  // 8. Quantidade de módulos — arredonda SEMPRE para cima (conforme regra)
  // Usa potência do módulo das premissas ou 620Wp como padrão
  const potenciaModuloWp = Number(premissas.potenciaModuloPadrao ?? 620)
  const potenciaModuloKwp = potenciaModuloWp / 1000
  const quantidadeModulosAprox = Math.ceil(potenciaBaseKwp / potenciaModuloKwp)

  // 9. Potência final = módulos × potência unitária (NUNCA arredonda para baixo)
  const potenciaFinalKwp = quantidadeModulosAprox * potenciaModuloKwp

  // 10. Área estimada
  const areaFator = getAreaFatorTelhado(input.tipoTelhado, premissas)
  const areaPorModulo = 3.10  // m² por módulo padrão
  const areaEstimadaM2 = quantidadeModulosAprox * areaPorModulo * areaFator

  // 9. Geração mensal estimada (kWh/mês)
  // Para cada mês: P_kWp × H_sol_dia_mes × PR × dias_mes
  const diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  const geracaoMensalKwh = irradiacaoMensal.map((h, i) => {
    return Number(
      (potenciaFinalKwp * h * taxaDesempenho * diasPorMes[i]).toFixed(2),
    )
  })

  const geracaoAnualKwh = Number(
    geracaoMensalKwh.reduce((a, b) => a + b, 0).toFixed(2),
  )

  // 10. Percentual de compensação
  const consumoAnual = consumoMedioMensal * 12
  const percentualCompensacao = Number(
    ((geracaoAnualKwh / consumoAnual) * 100).toFixed(2),
  )

  // 11. Economia mensal estimada no primeiro ano
  const economiaMensalEstimada = Number(
    ((geracaoAnualKwh / 12) * input.tarifaMediaKwh).toFixed(2),
  )

  return {
    consumoMedioMensal: Number(consumoMedioMensal.toFixed(2)),
    geracaoNecessariaKwh: Number(consumoBase.toFixed(2)),
    potenciaRecomendadaKwp: Number(potenciaRecomendadaKwp.toFixed(3)),
    potenciaFinalKwp,
    quantidadeModulosAproximada: quantidadeModulosAprox,
    areaEstimadaM2: Number(areaEstimadaM2.toFixed(2)),
    geracaoMensalKwh,
    geracaoAnualKwh,
    percentualCompensacao,
    economiaMensalEstimada,
    fatorIrradiacao: Number(irradiacaoMedia.toFixed(4)),
    taxaDesempenho: taxaDesempenho * 100,
  }
}
