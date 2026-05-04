// ═══════════════════════════════════════════════════════════════════
// Motor de Condições Comerciais — Formas de Pagamento
// Formas de pagamento são ENTIDADES, não texto solto.
// ═══════════════════════════════════════════════════════════════════

import type {
  CondicaoComercial,
  ParcelaPagamento,
  DadosBancarios,
  MeioPagamento,
} from '../shared'

// ─── À VISTA ─────────────────────────────────────────────────────────

export function gerarPagamentoAVista(
  propostaId: number,
  valorTotal: number,
  dadosBancarios: DadosBancarios,
): CondicaoComercial {
  return {
    propostaId,
    tipo: 'avista',
    descricao: 'Pagamento à vista',
    valorTotal,
    ativa: true,
    ordem: 1,
    parcelas: [
      {
        numeroParcela: 1,
        descricaoEvento: 'Pagamento integral',
        valor: Number(valorTotal.toFixed(2)),
        percentualDoTotal: 100,
        prazoDias: 2,
        tipoPrazo: 'uteis',
        referenciaEvento: 'assinatura_contrato',
        meiosPagamento: ['pix', 'ted'] as MeioPagamento[],
        dadosBancarios,
      },
    ],
  }
}

// ─── PARCELADO POR MARCOS (PADRÃO ATOM TECH) ────────────────────────
// Estrutura real usada pela Atom Tech conforme proposta:
// 1ª — Entrada (50%) até 2 dias úteis da última assinatura
// 2ª — (20%) até 2 dias úteis após entrega dos equipamentos
// 3ª — (20%) até 2 dias úteis após conclusão dos serviços
// 4ª — (10%) 28 dias corridos após o vencimento da terceira

export function gerarPagamentoPorMarcos(
  propostaId: number,
  valorTotal: number,
  dadosBancarios: DadosBancarios,
  percentuais = [50, 20, 20, 10],
): CondicaoComercial {
  const [p1, p2, p3, p4] = percentuais
  const val = (pct: number) => Number(((valorTotal * pct) / 100).toFixed(2))

  // Ajusta última parcela para compensar arredondamentos
  const v1 = val(p1)
  const v2 = val(p2)
  const v3 = val(p3)
  const v4 = Number((valorTotal - v1 - v2 - v3).toFixed(2))

  const parcelas: ParcelaPagamento[] = [
    {
      numeroParcela: 1,
      descricaoEvento: 'Entrada — assinatura do contrato',
      valor: v1,
      percentualDoTotal: p1,
      prazoDias: 2,
      tipoPrazo: 'uteis',
      referenciaEvento: 'assinatura_contrato',
      meiosPagamento: ['pix', 'ted'] as MeioPagamento[],
      dadosBancarios,
    },
    {
      numeroParcela: 2,
      descricaoEvento: '2ª parcela — entrega dos equipamentos',
      valor: v2,
      percentualDoTotal: p2,
      prazoDias: 2,
      tipoPrazo: 'uteis',
      referenciaEvento: 'entrega_equipamentos',
      meiosPagamento: ['pix', 'ted'] as MeioPagamento[],
      dadosBancarios,
    },
    {
      numeroParcela: 3,
      descricaoEvento: '3ª parcela — conclusão dos serviços',
      valor: v3,
      percentualDoTotal: p3,
      prazoDias: 2,
      tipoPrazo: 'uteis',
      referenciaEvento: 'conclusao_servicos',
      meiosPagamento: ['pix', 'ted'] as MeioPagamento[],
      dadosBancarios,
    },
    {
      numeroParcela: 4,
      descricaoEvento: '4ª parcela — 28 dias corridos após 3ª',
      valor: v4,
      percentualDoTotal: p4,
      prazoDias: 28,
      tipoPrazo: 'corridos',
      referenciaEvento: 'vencimento_parcela_anterior',
      meiosPagamento: ['pix', 'ted', 'boleto'] as MeioPagamento[],
      dadosBancarios,
    },
  ]

  return {
    propostaId,
    tipo: 'parcelado_marcos',
    descricao: 'Parcelamento por marcos de execução (Atom Tech)',
    valorTotal,
    ativa: true,
    ordem: 2,
    parcelas,
  }
}

// ─── FINANCIAMENTO ───────────────────────────────────────────────────

export interface OpcaoFinanciamento {
  entrada: number
  numeroParcelas: number
  valorParcela: number
  banco?: string
}

export function gerarPagamentoFinanciamento(
  propostaId: number,
  valorTotal: number,
  opcoes: OpcaoFinanciamento[],
  ordemBase = 3,
): CondicaoComercial[] {
  return opcoes.map((op, idx) => ({
    propostaId,
    tipo: 'financiamento' as const,
    descricao: op.banco
      ? `Financiamento ${op.banco} — ${op.numeroParcelas}x R$ ${op.valorParcela.toFixed(2).replace('.', ',')}`
      : `Financiamento — Opção ${idx + 1}: ${op.numeroParcelas}x R$ ${op.valorParcela.toFixed(2).replace('.', ',')}`,
    valorTotal,
    ativa: true,
    ordem: ordemBase + idx,
    parcelas: [
      {
        numeroParcela: 1,
        descricaoEvento: [
          op.entrada > 0
            ? `Entrada de R$ ${op.entrada.toFixed(2).replace('.', ',')}`
            : 'Sem entrada',
          `+ ${op.numeroParcelas}x de R$ ${op.valorParcela.toFixed(2).replace('.', ',')}`,
        ].join(' '),
        valor: op.entrada,
        percentualDoTotal: Number(((op.entrada / valorTotal) * 100).toFixed(2)),
        prazoDias: 0,
        tipoPrazo: 'uteis',
        referenciaEvento: 'aprovacao_financiamento',
        meiosPagamento: ['boleto'] as MeioPagamento[],
        dadosBancarios: {},
      },
    ],
  }))
}

// ─── CARTÃO DE CRÉDITO ───────────────────────────────────────────────

export function gerarPagamentoCartao(
  propostaId: number,
  valorTotal: number,
  numeroParcelas: number,
  taxaAdicional = 0, // % de acréscimo pelo cartão
  ordem = 10,
): CondicaoComercial {
  const valorComTaxa = valorTotal * (1 + taxaAdicional / 100)
  const valorParcela = Number((valorComTaxa / numeroParcelas).toFixed(2))

  return {
    propostaId,
    tipo: 'cartao',
    descricao: `Cartão de crédito — ${numeroParcelas}x R$ ${valorParcela.toFixed(2).replace('.', ',')}${taxaAdicional > 0 ? ` (${taxaAdicional}% de acréscimo)` : ''}`,
    valorTotal: Number(valorComTaxa.toFixed(2)),
    ativa: true,
    ordem,
    parcelas: [
      {
        numeroParcela: 1,
        descricaoEvento: `${numeroParcelas}x de R$ ${valorParcela.toFixed(2).replace('.', ',')} no cartão de crédito`,
        valor: valorParcela,
        percentualDoTotal: 100,
        prazoDias: 0,
        tipoPrazo: 'uteis',
        referenciaEvento: 'assinatura_contrato',
        meiosPagamento: ['cartao_credito'] as MeioPagamento[],
        dadosBancarios: {},
      },
    ],
  }
}

// ─── GERADOR COMPLETO DE CONDIÇÕES (helper) ──────────────────────────
// Gera o conjunto completo de opções de pagamento da Atom Tech

interface MarcoCustom {
  descricao: string
  percentual: number
  prazoDias: number
  tipoPrazo: 'uteis' | 'corridos'
}

export function gerarCondicoesCompletasAtomTech(
  propostaId: number,
  valorFinal: number,
  dadosBancarios: DadosBancarios,
  descontoAvista?: number,
  marcosCustom?: MarcoCustom[],
): CondicaoComercial[] {
  const condições: CondicaoComercial[] = []

  // 1. À vista (com desconto se informado)
  const valorAvista = descontoAvista && descontoAvista > 0
    ? Number((valorFinal * (1 - descontoAvista / 100)).toFixed(2))
    : valorFinal

  const condAvista = gerarPagamentoAVista(propostaId, valorAvista, dadosBancarios)
  if (descontoAvista && descontoAvista > 0) {
    condAvista.descricao = `Pagamento à Vista — ${descontoAvista}% de desconto`
  }
  condições.push(condAvista)

  // 2. Parcelado por marcos (customizado ou padrão)
  if (marcosCustom && marcosCustom.length > 0) {
    const totalPct = marcosCustom.reduce((s, m) => s + m.percentual, 0)
    const parcelas = marcosCustom.map((m, i) => {
      const pct = m.percentual / (totalPct || 100)
      const valor = Number((valorFinal * pct).toFixed(2))
      return {
        numeroParcela: i + 1,
        descricaoEvento: m.descricao,
        valor,
        percentualDoTotal: m.percentual,
        prazoDias: m.prazoDias,
        tipoPrazo: m.tipoPrazo,
        referenciaEvento: i === 0 ? 'assinatura_contrato' : `marco_${i + 1}`,
        meiosPagamento: ['pix', 'transferencia'] as MeioPagamento[],
        dadosBancarios,
      }
    })
    condições.push({
      propostaId,
      tipo: 'parcelado_marcos' as const,
      descricao: 'Parcelado por Marcos de Execução (Atom Tech)',
      valorTotal: valorFinal,
      ativa: true,
      ordem: 2,
      parcelas,
    })
  } else {
    condições.push(
      gerarPagamentoPorMarcos(propostaId, valorFinal, dadosBancarios),
    )
  }

  // 3. Financiamento bancário genérico (sujeito a análise de crédito)
  condições.push({
    propostaId,
    tipo: 'financiamento' as const,
    descricao: 'Financiamento Bancário — em até 72 meses *',
    valorTotal: String(valorFinal),
    ativa: true,
    ordem: 3,
    parcelas: [{
      numeroParcela: 1,
      descricaoEvento: 'Financiamento bancário em até 72 meses por meio de bancos e financeiras conveniadas',
      valor: String(valorFinal),
      percentualDoTotal: '100',
      prazoDias: 0,
      tipoPrazo: 'corridos' as const,
      referenciaEvento: 'aprovacao_financiamento',
      meiosPagamento: ['financiamento_bancario'] as any,
      dadosBancariosJson: null,
      observacao: '* Financiamento sujeito à análise de crédito. Consulte condições junto à financeira.',
    }],
  })

  // 4. Cartão de crédito em até 18x
  condições.push({
    propostaId,
    tipo: 'cartao' as const,
    descricao: 'Cartão de Crédito — em até 18 parcelas',
    valorTotal: String(valorFinal),
    ativa: true,
    ordem: 4,
    parcelas: [{
      numeroParcela: 1,
      descricaoEvento: 'Pagamento via cartão de crédito em até 18 parcelas conforme taxas da operadora',
      valor: String(valorFinal),
      percentualDoTotal: '100',
      prazoDias: 0,
      tipoPrazo: 'corridos' as const,
      referenciaEvento: 'pagamento_cartao',
      meiosPagamento: ['cartao_credito'] as any,
      dadosBancariosJson: null,
    }],
  })

  return condições
}

// Taxa de juros típica de financiamento solar (BV, Sol Fácil etc.)
// ~1,49% a.m. para perfil bom — ajustável por configuração
function calcularParcelaFinanciamento(
  principal: number,
  meses: number,
  taxaMensal = 0.0149,
): number {
  if (taxaMensal === 0) return Number((principal / meses).toFixed(2))

  // Tabela Price: PMT = PV × [i(1+i)^n] / [(1+i)^n - 1]
  const i = taxaMensal
  const n = meses
  const fator = (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
  return Number((principal * fator).toFixed(2))
}
