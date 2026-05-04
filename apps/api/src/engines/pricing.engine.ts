// ═══════════════════════════════════════════════════════════════════
// Motor de Precificação
// Suporta: fixo, múltiplo, avançado, proporcional_kwp
// Métodos: margem sobre custo | margem sobre venda
// ═══════════════════════════════════════════════════════════════════

import type {
  PricingInput,
  PricingResult,
  ItemCustoInput,
  ItemCustoCalculado,
  MetodoPrecificacao,
} from '../shared'

// ─── CÁLCULO DE CUSTO POR ITEM ────────────────────────────────────────────────

export function calcularCustoItem(
  item: ItemCustoInput,
  ctx: { potenciaKwp: number; quantidadeModulos: number; quantidadeInversores: number },
): number {
  switch (item.tipoCusto) {
    case 'fixo':
      return Number(item.valorFixo ?? 0)

    case 'multiplo': {
      const qtd = item.quantidade ?? 0
      const unitario = item.valorPorUnidade ?? 0
      return qtd * unitario
    }

    case 'avancado':
      return Number(item.valorAvancado ?? 0)

    case 'proporcional_kwp':
      return (item.valorPorKwp ?? 0) * ctx.potenciaKwp

    default:
      return 0
  }
}

// ─── APLICAÇÃO DE MARGEM ──────────────────────────────────────────────────────

export function calcularPrecoComMargem(
  custo: number,
  margemPct: number,
  metodo: MetodoPrecificacao,
): number {
  if (metodo === 'margem_custo') {
    // Markup: preço = custo × (1 + margem/100)
    return custo * (1 + margemPct / 100)
  } else {
    // Margem sobre venda: preço = custo / (1 - margem/100)
    if (margemPct >= 100) {
      throw new Error('Margem sobre venda não pode ser igual ou maior que 100%')
    }
    return custo / (1 - margemPct / 100)
  }
}

// ─── MOTOR PRINCIPAL ──────────────────────────────────────────────────────────

export function calcularPrecificacao(input: PricingInput): PricingResult {
  const ctx = {
    potenciaKwp: input.potenciaKwp,
    quantidadeModulos: input.quantidadeModulos,
    quantidadeInversores: input.quantidadeInversores,
  }

  const itensDetalhados: ItemCustoCalculado[] = input.itens
    .filter((item) => item.incluso)
    .map((item) => {
      const custo = calcularCustoItem(item, ctx)
      const margem =
        item.margemOverride !== null && item.margemOverride !== undefined
          ? item.margemOverride
          : input.margemPadrao

      const precoComMargem = calcularPrecoComMargem(custo, margem, input.metodoPrecificacao)

      return {
        ...item,
        custoCalculado: Number(custo.toFixed(4)),
        margemEfetiva: margem,
        precoComMargem: Number(precoComMargem.toFixed(2)),
      }
    })

  const custoTotal = Number(
    itensDetalhados.reduce((acc, i) => acc + i.custoCalculado, 0).toFixed(2),
  )
  const precoVenda = Number(
    itensDetalhados.reduce((acc, i) => acc + i.precoComMargem, 0).toFixed(2),
  )
  const lucro = Number((precoVenda - custoTotal).toFixed(2))

  const comissaoValor = Number((precoVenda * (input.comissao / 100)).toFixed(2))
  const desconto = Number((input.descontoManual ?? 0).toFixed(2))

  // Preço final = preço de venda + comissão - desconto manual
  const precoFinal = Number((precoVenda + comissaoValor - desconto).toFixed(2))

  return {
    itensDetalhados,
    custoTotal,
    margemAplicada: input.margemPadrao,
    comissaoAplicada: input.comissao,
    precoVenda,
    lucro,
    descontoAplicado: desconto,
    precoFinal,
  }
}

// ─── ITENS PADRÃO ATOM TECH ───────────────────────────────────────────────────
//
// ANTES: valores hardcoded (R$70/módulo, R$150/inversor, R$800 projeto)
// AGORA: valores vêm das premissas da empresa, configuráveis em Configurações
//
// Parâmetros opcionais com fallback para garantir retrocompatibilidade
// com propostas antigas que não passam as premissas.

export function gerarItensCustomizadosPadrao(
  potenciaKwp: number,
  quantidadeModulos: number,
  quantidadeInversores: number,
  custoKit: number,
  // Valores das premissas — se não informados, usa os defaults originais
  custoMaoObraModulo  = 70,     // R$/módulo  — configurável nas premissas
  custoMaoObraInversor = 150,   // R$/inversor — configurável nas premissas
  custoProjeto         = 800,   // R$ fixo     — configurável nas premissas
  custoAdmin           = 0,     // R$ fixo     — configurável nas premissas
  // Itens adicionais extras (baterias, carregadores, padrão de entrada, etc.)
  itensAdicionais: ItemAdicionalPremissa[] = [],
): ItemCustoInput[] {
  const itens: ItemCustoInput[] = [
    {
      descricao: 'Custo de Material do Kit Fotovoltaico',
      tipoCusto: 'avancado',
      valorAvancado: custoKit,
      margemOverride: null,
      incluso: true,
    },
    {
      descricao: `Instalação dos Módulos (${quantidadeModulos} un.)`,
      tipoCusto: 'multiplo',
      valorPorUnidade: custoMaoObraModulo,
      quantidade: quantidadeModulos,
      margemOverride: null,
      incluso: true,
    },
    {
      descricao: `Instalação do Inversor (${quantidadeInversores} un.)`,
      tipoCusto: 'multiplo',
      valorPorUnidade: custoMaoObraInversor,
      quantidade: quantidadeInversores,
      margemOverride: null,
      incluso: true,
    },
    {
      descricao: 'Custo de Projeto de Engenharia',
      tipoCusto: 'fixo',
      valorFixo: custoProjeto,
      margemOverride: null,
      incluso: true,
    },
    {
      descricao: 'Custo Administrativo',
      tipoCusto: 'avancado',
      valorAvancado: custoAdmin,
      margemOverride: null,
      incluso: custoAdmin > 0,
    },
  ]

  // Adiciona itens extras ativos das premissas (baterias, carregadores, etc.)
  for (const extra of itensAdicionais) {
    if (!extra.ativo) continue
    itens.push({
      descricao: extra.descricao,
      tipoCusto: extra.tipoCusto as any,
      valorFixo: extra.tipoCusto === 'fixo' ? extra.valorFixo : undefined,
      valorPorUnidade: extra.tipoCusto === 'multiplo' ? extra.valorFixo : undefined,
      quantidade: extra.tipoCusto === 'multiplo' ? 1 : undefined,
      valorPorKwp: extra.tipoCusto === 'proporcional_kwp' ? extra.valorFixo : undefined,
      margemOverride: null,
      incluso: true,
    })
  }

  return itens
}

// ─── TIPO DO ITEM ADICIONAL DAS PREMISSAS ────────────────────────────────────

export interface ItemAdicionalPremissa {
  id: string
  descricao: string
  tipoCusto: 'fixo' | 'multiplo' | 'proporcional_kwp'
  valorFixo: number
  ativo: boolean
  unidade?: string
}
