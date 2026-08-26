import type { RecargaMoove } from "./lerMoove";

export interface TotaisEstacao {
  estacao: string;
  numeroRecargas: number;
  energiaTotalKwh: number;
  receitaTotal: number;
  ticketMedio: number;
  duracaoMediaMin: number;
  periodoInicio: Date | null;
  periodoFim: Date | null;
}

function duracaoParaMinutos(duracao: string): number {
  const partes = duracao.split(":").map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) return 0;
  const [horas, minutos, segundos] = partes;
  return horas * 60 + minutos + segundos / 60;
}

export function inicioDaRecarga(inicioFim: string): Date | null {
  const inicio = inicioFim.split(" - ")[0]?.trim();
  if (!inicio) return null;
  const match = inicio.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, dia, mes, ano, hora, minuto] = match;
  return new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
}

export function agregarPorEstacao(recargas: RecargaMoove[]): TotaisEstacao[] {
  const grupos = new Map<string, RecargaMoove[]>();
  for (const recarga of recargas) {
    const lista = grupos.get(recarga.estacao) ?? [];
    lista.push(recarga);
    grupos.set(recarga.estacao, lista);
  }

  const resultado: TotaisEstacao[] = [];

  for (const [estacao, lista] of grupos) {
    const energiaTotalKwh = lista.reduce((soma, r) => soma + r.energiaKwh, 0);
    const receitaTotal = lista.reduce((soma, r) => soma + r.receita, 0);
    const duracaoTotalMin = lista.reduce((soma, r) => soma + duracaoParaMinutos(r.duracao), 0);
    const datas = lista.map((r) => inicioDaRecarga(r.inicioFim)).filter((d): d is Date => d !== null);

    resultado.push({
      estacao,
      numeroRecargas: lista.length,
      energiaTotalKwh,
      receitaTotal,
      ticketMedio: lista.length > 0 ? receitaTotal / lista.length : 0,
      duracaoMediaMin: lista.length > 0 ? duracaoTotalMin / lista.length : 0,
      periodoInicio: datas.length > 0 ? new Date(Math.min(...datas.map((d) => d.getTime()))) : null,
      periodoFim: datas.length > 0 ? new Date(Math.max(...datas.map((d) => d.getTime()))) : null,
    });
  }

  return resultado.sort((a, b) => a.estacao.localeCompare(b.estacao));
}
