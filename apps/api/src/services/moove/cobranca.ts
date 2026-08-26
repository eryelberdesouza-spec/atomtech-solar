// Taxa da Moove é sempre fixa em 7% sobre a receita bruta de cada recarga.
// A comissão da Atom Tech é negociada por estação (cadastrada em moove_estacao,
// padrão 10%, pode variar pra cima ou pra baixo). A tarifa cobrada do usuário
// final (R$/kWh, duração etc.) já vem pronta em cada linha do Excel da Moove —
// não precisa ser inferida, só usada como base do cálculo abaixo.

export const TAXA_MOOVE_PERCENTUAL = 0.07;

export interface ValoresRecarga {
  receitaBruta: number;
  valorTaxaMoove: number;
  valorComissaoAtom: number;
  valorLiquidoCliente: number;
}

export function calcularValores(receitaBruta: number, comissaoAtomPercentual: number): ValoresRecarga {
  const valorTaxaMoove = receitaBruta * TAXA_MOOVE_PERCENTUAL;
  const valorComissaoAtom = receitaBruta * (comissaoAtomPercentual / 100);
  const valorLiquidoCliente = receitaBruta - valorTaxaMoove - valorComissaoAtom;
  return { receitaBruta, valorTaxaMoove, valorComissaoAtom, valorLiquidoCliente };
}
