import sharp from "sharp";
import type { RecargaMoove } from "./lerMoove.js";

export interface TotaisPorHora {
  hora: number;
  numeroRecargas: number;
  energiaKwh: number;
  receita: number;
}

function horaDaRecarga(inicioFim: string): number | null {
  const inicio = inicioFim.split(" - ")[0]?.trim();
  const match = inicio?.match(/(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]);
}

export function agregarPorHora(recargas: RecargaMoove[]): TotaisPorHora[] {
  const porHora = new Map<number, TotaisPorHora>();
  for (let h = 0; h < 24; h++) {
    porHora.set(h, { hora: h, numeroRecargas: 0, energiaKwh: 0, receita: 0 });
  }

  for (const recarga of recargas) {
    const hora = horaDaRecarga(recarga.inicioFim);
    if (hora === null) continue;
    const acumulado = porHora.get(hora)!;
    acumulado.numeroRecargas += 1;
    acumulado.energiaKwh += recarga.energiaKwh;
    acumulado.receita += recarga.receita;
  }

  return [...porHora.values()];
}

const CORES = {
  amarelo: "#F5A623",
  verde: "#3DAE3D",
  preto: "#1A1A1A",
  cinza: "#DDDDDD",
};

export async function gerarImagemGraficoHorarios(totaisPorHora: TotaisPorHora[]): Promise<Buffer> {
  const largura = 900;
  const altura = 340;
  const margemEsquerda = 50;
  const margemInferior = 40;
  const margemTopo = 30;
  const larguraUtil = largura - margemEsquerda - 20;
  const alturaUtil = altura - margemTopo - margemInferior;

  const maxRecargas = Math.max(1, ...totaisPorHora.map((t) => t.numeroRecargas));
  const larguraBarra = larguraUtil / totaisPorHora.length;

  const barras = totaisPorHora
    .map((t, i) => {
      const alturaBarra = (t.numeroRecargas / maxRecargas) * alturaUtil;
      const x = margemEsquerda + i * larguraBarra + larguraBarra * 0.15;
      const y = margemTopo + (alturaUtil - alturaBarra);
      const w = larguraBarra * 0.7;
      const pico = t.numeroRecargas === maxRecargas && maxRecargas > 0;
      const cor = pico ? CORES.verde : CORES.amarelo;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${alturaBarra.toFixed(1)}" fill="${cor}" rx="2"/>`;
    })
    .join("\n");

  const rotulos = totaisPorHora
    .map((t, i) => {
      const x = margemEsquerda + i * larguraBarra + larguraBarra / 2;
      const y = altura - margemInferior + 16;
      if (t.hora % 2 !== 0) return "";
      return `<text x="${x.toFixed(1)}" y="${y}" font-size="11" fill="${CORES.preto}" text-anchor="middle" font-family="Arial">${String(t.hora).padStart(2, "0")}h</text>`;
    })
    .join("\n");

  const linhaBase = margemTopo + alturaUtil;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
  <rect width="${largura}" height="${altura}" fill="white"/>
  <text x="${margemEsquerda}" y="18" font-size="15" font-weight="bold" fill="${CORES.preto}" font-family="Arial">Recargas por horário do dia</text>
  <line x1="${margemEsquerda}" y1="${linhaBase}" x2="${largura - 20}" y2="${linhaBase}" stroke="${CORES.cinza}" stroke-width="1"/>
  ${barras}
  ${rotulos}
</svg>`.trim();

  return sharp(Buffer.from(svg)).png().toBuffer();
}
