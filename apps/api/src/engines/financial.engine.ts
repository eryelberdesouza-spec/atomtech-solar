// ═══════════════════════════════════════════════════════════════════
// Motor Financeiro — VPL, TIR, Payback, Fluxo de Caixa 25 anos
// Módulo puro — sem efeitos colaterais, testável de forma isolada.
// Lei 14.300/2022 — Fio B com transição tarifária GD1/GD2
// ═══════════════════════════════════════════════════════════════════

import type {
  FinancialInput,
  FinancialResult,
  FluxoCaixaAnual,
  Topologia,
  EnquadramentoGD,
} from '../shared'

import { getPctFioBAnual } from '../shared'

// ─── NEWTON-RAPHSON PARA TIR ──────────────────────────────────────────────────

export function calcularTIR(
  fluxos: number[],
  chutInicial = 0.5,
  precisao = 1e-8,
  maxIteracoes = 1000,
): number {
  let taxa = chutInicial

  for (let iter = 0; iter < maxIteracoes; iter++) {
    const vplAtual = fluxos.reduce(
      (acc, f, i) => acc + f / Math.pow(1 + taxa, i),
      0,
    )
    const dvpl = fluxos.reduce(
      (acc, f, i) => acc - (i * f) / Math.pow(1 + taxa, i + 1),
      0,
    )

    if (Math.abs(dvpl) < 1e-12) break

    const novaTaxa = taxa - vplAtual / dvpl

    if (Math.abs(novaTaxa - taxa) < precisao) {
      return novaTaxa
    }

    taxa = novaTaxa
  }

  return taxa
}

// ─── VPL SIMPLES ──────────────────────────────────────────────────────────────

export function calcularVPL(fluxos: number[], taxaDesconto: number): number {
  return fluxos.reduce(
    (acc, f, i) => acc + f / Math.pow(1 + taxaDesconto, i),
    0,
  )
}

// ─── PERDA DE EFICIÊNCIA POR TOPOLOGIA ───────────────────────────────────────

function getPerdaEficiencia(
  topologia: Topologia,
  premissas: FinancialInput['premissas'],
): number {
  return Number(premissas.perdaEficienciaAnualTradicional)
}

// ─── CÁLCULO DO CUSTO FIO B ───────────────────────────────────────────────────
//
// Lógica da Lei 14.300/2022:
//
// A energia gerada pelo sistema solar tem dois destinos:
//   1. Consumo INSTANTÂNEO (default 45%): gerada e consumida no mesmo instante
//      → não passa pela rede → NÃO é cobrado Fio B sobre essa parcela
//   2. Energia INJETADA (default 55%): excedente injetado na rede e compensado depois
//      → usa a infraestrutura da distribuidora → cobrado % do Fio B conforme GD2
//
// O Fio B é a componente da TUSD que remunera a rede de distribuição.
// Para GD2 (projetos após 07/01/2023), o % cobrado sobe ano a ano até 100% em 2029.
// Para GD1 (projetos até 06/01/2023), a cobrança é zero até 2045.
//
// Custo Fio B no ano N =
//   kWh_injetado_ano × tusdFioB × pctFioBGD_ano
//
// kWh_injetado_ano = geracaoAnualKwh × pctInjetado × (1 - perdaEficiencia)^N
//
// A ECONOMIA LÍQUIDA do cliente fica:
//   Sem Fio B (parte instantânea): kWh_inst × tarifa_total
//   Com Fio B (parte injetada):    kWh_inj  × (tarifa_total - tusdFioB × pctFioB_ano)
//   Custo do Fio B = kWh_inj × tusdFioB × pctFioB_ano
//
// ─────────────────────────────────────────────────────────────────────────────

// ─── MOTOR PRINCIPAL ──────────────────────────────────────────────────────────

export function calcularFinanceiro(input: FinancialInput): FinancialResult {
  const anos = input.horizonte ?? 25
  const anoBase = new Date().getFullYear()  // ano atual para referência do cronograma

  const {
    inflacaoEnergetica,
    taxaDescontoVpl,
    perdaEficienciaAnualTradicional,
    trocaInversorAnosTradicional,
    custoTrocaInversorTrad,
  } = input.premissas

  const taxaInflacao   = Number(inflacaoEnergetica) / 100
  const taxaDesconto   = Number(taxaDescontoVpl) / 100
  const perdaEfic      = Number(perdaEficienciaAnualTradicional) / 100
  // Microinversor tem garantia de 25 anos — não há troca no horizonte da análise
  const anoTroca       = input.topologia === 'microinversor' ? 0 : Number(trocaInversorAnosTradicional)
  const pctTroca       = Number(custoTrocaInversorTrad) / 100

  // ── Fio B ────────────────────────────────────────────────────────────────
  const enquadramento: EnquadramentoGD = input.enquadramentoGD ?? 'GD2'
  const tusdFioB      = Number(input.tusdFioB ?? 0)      // R$/kWh do componente Fio B

  // Perfil de uso: 45% instantâneo / 55% injetado (configurável)
  const pctInst = Number(input.pctInstantaneo ?? 0.45)
  const pctInj  = Number(input.pctInjetado   ?? (1 - pctInst))

  // Tarifa total (base para o cálculo da economia bruta)
  const tarifaTotal = Number(input.tarifaInicialKwh)

  // ── Fluxo de caixa ───────────────────────────────────────────────────────
  const fluxoCaixa: FluxoCaixaAnual[] = []
  const fluxosSimples: number[] = []

  let saldoAcumulado  = -input.investimentoTotal
  let saldoDescontado = -input.investimentoTotal
  let paybackSimples:    number | null = null
  let paybackDescontado: number | null = null

  // Ano 0 — investimento inicial (sem geração de economia ainda)
  fluxoCaixa.push({
    ano: 0,
    geracaoKwh: Number(input.geracaoAnualKwh.toFixed(0)),
    tarifa: Number(tarifaTotal.toFixed(4)),
    economiaAnual: 0,
    custoTrocaInversor: input.investimentoTotal,
    fluxoLiquido: -input.investimentoTotal,
    saldoAcumulado: Number(saldoAcumulado.toFixed(2)),
    fluxoDescontado: -input.investimentoTotal,
    saldoDescontado: Number(saldoDescontado.toFixed(2)),
  })
  fluxosSimples.push(-input.investimentoTotal)

  for (let ano = 1; ano <= anos; ano++) {
    // Geração decresce com perda de eficiência anual
    const geracao = input.geracaoAnualKwh * Math.pow(1 - perdaEfic, ano)

    // Tarifa sobe com inflação energética
    const tarifa = tarifaTotal * Math.pow(1 + taxaInflacao, ano)

    // ── Fio B do ano corrente ─────────────────────────────────────────────
    const anoCalendario = anoBase + ano
    const pctFioB = getPctFioBAnual(anoCalendario, enquadramento)

    // kWh por perfil de uso neste ano
    const geracaoInst = geracao * pctInst   // consumido instantaneamente (sem Fio B)
    const geracaoInj  = geracao * pctInj    // injetado na rede (sujeito ao Fio B)

    // Economia da parcela instantânea: 100% da tarifa (não usa rede)
    const economiaInst = geracaoInst * tarifa

    // Tarifa efetiva da parcela injetada após descontar o Fio B não compensado
    // O cliente paga pctFioB × tusdFioB sobre o kWh injetado/compensado
    const tusdFioBCorrigido = tusdFioB * Math.pow(1 + taxaInflacao, ano)   // Fio B também inflaciona
    const custoFioBAnual    = geracaoInj * tusdFioBCorrigido * pctFioB

    // Economia da parcela injetada: tarifa cheia menos o custo do Fio B
    const economiaInj = geracaoInj * tarifa - custoFioBAnual

    // Economia total do ano
    const economia = economiaInst + economiaInj

    // Custo de troca do inversor corrigido pela inflação energética até o ano da troca
    // (o inversor será comprado no futuro — o preço sobe com a inflação)
    const custoTroca =
      anoTroca > 0 && ano === anoTroca
        ? input.investimentoTotal * pctTroca * Math.pow(1 + taxaInflacao, anoTroca)
        : 0

    // Fluxo líquido do ano
    const fluxoLiquido = economia - custoTroca
    saldoAcumulado += fluxoLiquido

    // Fluxo descontado
    const fatorDesconto  = Math.pow(1 + taxaDesconto, ano)
    const fluxoDescontado = fluxoLiquido / fatorDesconto
    saldoDescontado += fluxoDescontado

    // Payback simples
    if (paybackSimples === null && saldoAcumulado >= 0) {
      const saldoPrevio = fluxoCaixa[ano - 1].saldoAcumulado
      const fracao = Math.abs(saldoPrevio) / fluxoLiquido
      paybackSimples = Math.round((ano - 1 + fracao) * 12)
    }

    // Payback descontado
    if (paybackDescontado === null && saldoDescontado >= 0) {
      const saldoPrevio = fluxoCaixa[ano - 1].saldoDescontado
      const fracao = Math.abs(saldoPrevio) / fluxoDescontado
      paybackDescontado = Math.round((ano - 1 + fracao) * 12)
    }

    fluxoCaixa.push({
      ano,
      geracaoKwh:        Number(geracao.toFixed(0)),
      tarifa:            Number(tarifa.toFixed(4)),
      economiaAnual:     Number(economia.toFixed(2)),
      custoTrocaInversor: Number(custoTroca.toFixed(2)),
      fluxoLiquido:      Number(fluxoLiquido.toFixed(2)),
      saldoAcumulado:    Number(saldoAcumulado.toFixed(2)),
      fluxoDescontado:   Number(fluxoDescontado.toFixed(2)),
      saldoDescontado:   Number(saldoDescontado.toFixed(2)),
    })
    fluxosSimples.push(fluxoLiquido)
  }

  // VPL final
  const vpl = Number(saldoDescontado.toFixed(2))

  // TIR (Newton-Raphson)
  let tir = 0
  try {
    tir = calcularTIR(fluxosSimples)
    if (!isFinite(tir) || isNaN(tir)) tir = 0
  } catch {
    tir = 0
  }

  // Indicadores do primeiro ano (ano 1)
  const economiaAno1         = fluxoCaixa[1]?.economiaAnual ?? 0
  const rendimentoAno1Pct    = Number(((economiaAno1 / input.investimentoTotal) * 100).toFixed(2))

  // Custo Fio B específico do ano 1 (para exibição no PDF)
  const pctFioBAno1          = getPctFioBAnual(anoBase + 1, enquadramento)
  const geracaoInj1          = input.geracaoAnualKwh * (1 - perdaEfic) * pctInj
  const custoFioBMensalAno1  = (geracaoInj1 * tusdFioB * pctFioBAno1) / 12

  // Comparativos de mercado (taxas históricas médias)
  const TAXA_POUPANCA   = 0.043   // ~4,3% a.a. (70% SELIC estimado)
  const TAXA_RENDA_FIXA = 0.074   // ~7,4% a.a. (110% CDI estimado)

  const comparativoPoupanca25a = Number(
    (input.investimentoTotal * Math.pow(1 + TAXA_POUPANCA,   anos)).toFixed(2),
  )
  const comparativoRendaFixa25a = Number(
    (input.investimentoTotal * Math.pow(1 + TAXA_RENDA_FIXA, anos)).toFixed(2),
  )

  return {
    economiaMensalAno1:        Number((economiaAno1 / 12).toFixed(2)),
    economiaAnualAno1:         Number(economiaAno1.toFixed(2)),
    paybackSimplesMeses:       paybackSimples ?? anos * 12,
    paybackDescontadoMeses:    paybackDescontado ?? anos * 12,
    vpl,
    tir,
    rendimentoPrimeiroAnoPct:  rendimentoAno1Pct,
    saldo25Anos:               Number(saldoAcumulado.toFixed(2)),
    fluxoCaixa,
    comparativoPoupanca25a,
    comparativoRendaFixa25a,
    // Detalhamento Fio B
    custoFioBMensalAno1:       Number(custoFioBMensalAno1.toFixed(2)),
    economiaMensalLiquidaAno1: Number((economiaAno1 / 12).toFixed(2)),  // já líquida do Fio B
    enquadramentoGD:           enquadramento,
    pctFioBVigente:            pctFioBAno1,
  }
}

// ─── FORMATAÇÃO DO PAYBACK ────────────────────────────────────────────────────

export function formatarPayback(meses: number): string {
  const anos = Math.floor(meses / 12)
  const mesesRestantes = meses % 12

  if (anos === 0) return `${mesesRestantes} meses`
  if (mesesRestantes === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`
  return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}`
}
