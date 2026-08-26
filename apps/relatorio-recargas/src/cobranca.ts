import type { RecargaMoove } from "./lerMoove.js";

export type TipoCobranca = "percentual" | "valor_fixo_kwh" | "valor_fixo_recarga";

export interface ConfigCobranca {
  tipo: TipoCobranca;
  valor: number;
}

export function calcularValorDebitado(recarga: RecargaMoove, cobranca?: ConfigCobranca): number {
  if (!cobranca) return 0;
  switch (cobranca.tipo) {
    case "percentual":
      return recarga.receita * cobranca.valor;
    case "valor_fixo_kwh":
      return recarga.energiaKwh * cobranca.valor;
    case "valor_fixo_recarga":
      return cobranca.valor;
    default:
      return 0;
  }
}

export function descricaoCobranca(cobranca?: ConfigCobranca): string {
  if (!cobranca) return "Nenhuma taxa configurada (valor debitado = R$ 0,00)";
  switch (cobranca.tipo) {
    case "percentual":
      return `${(cobranca.valor * 100).toFixed(1)}% sobre o valor de cada recarga`;
    case "valor_fixo_kwh":
      return `R$ ${cobranca.valor.toFixed(2)} por kWh consumido`;
    case "valor_fixo_recarga":
      return `R$ ${cobranca.valor.toFixed(2)} fixo por recarga`;
  }
}
