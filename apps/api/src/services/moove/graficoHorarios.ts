import sharp from "sharp";
import type { RecargaMoove } from "./lerMoove";

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
  const margemEsquerda = 70;
  const margemInferior = 40;
  const margemTopo = 30;
  const larguraUtil = largura - margemEsquerda - 20;
  const alturaUtil = altura - margemTopo - margemInferior;

  const maxRecargasReal = Math.max(0, ...totaisPorHora.map((t) => t.numeroRecargas));
  const maxRecargas = Math.max(1, maxRecargasReal);
  const larguraBarra = larguraUtil / totaisPorHora.length;

  const barras = totaisPorHora
    .map((t, i) => {
      const alturaBarra = (t.numeroRecargas / maxRecargas) * alturaUtil;
      const x = margemEsquerda + i * larguraBarra + larguraBarra * 0.15;
      const y = margemTopo + (alturaUtil - alturaBarra);
      const w = larguraBarra * 0.7;
      const pico = t.numeroRecargas === maxRecargas && maxRecargas > 0;
      const cor = pico ? CORES.verde : CORES.amarelo;
      const rotuloValor = t.numeroRecargas > 0
        ? `<text x="${(x + w / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="10" fill="${CORES.preto}" text-anchor="middle" font-family="Arial">${t.numeroRecargas}</text>`
        : "";
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${alturaBarra.toFixed(1)}" fill="${cor}" rx="2"/>\n${rotuloValor}`;
    })
    .join("\n");

  const rotulosEixoX = totaisPorHora
    .map((t, i) => {
      const x = margemEsquerda + i * larguraBarra + larguraBarra / 2;
      const y = altura - margemInferior + 16;
      if (t.hora % 2 !== 0) return "";
      return `<text x="${x.toFixed(1)}" y="${y}" font-size="11" fill="${CORES.preto}" text-anchor="middle" font-family="Arial">${String(t.hora).padStart(2, "0")}h</text>`;
    })
    .join("\n");

  // Eixo Y: 5 marcações (0, 25%, 50%, 75%, 100% do máximo), com linha guia
  // pontilhada e o número de recargas correspondente a cada altura.
  const NUM_MARCACOES_Y = 4;
  const marcacoesY = Array.from({ length: NUM_MARCACOES_Y + 1 }, (_, i) => {
    const fracao = i / NUM_MARCACOES_Y;
    const valor = Math.round(maxRecargas * fracao);
    const y = margemTopo + alturaUtil * (1 - fracao);
    const linhaGuia = i === 0
      ? ""
      : `<line x1="${margemEsquerda}" y1="${y.toFixed(1)}" x2="${largura - 20}" y2="${y.toFixed(1)}" stroke="${CORES.cinza}" stroke-width="1" stroke-dasharray="3,3"/>`;
    return `${linhaGuia}\n<text x="${margemEsquerda - 10}" y="${(y + 4).toFixed(1)}" font-size="10" fill="#666666" text-anchor="end" font-family="Arial">${valor}</text>`;
  }).join("\n");

  const linhaBase = margemTopo + alturaUtil;
  const centroVertical = margemTopo + alturaUtil / 2;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
  <rect width="${largura}" height="${altura}" fill="white"/>
  <text x="${margemEsquerda}" y="18" font-size="15" font-weight="bold" fill="${CORES.preto}" font-family="Arial">Recargas por horário do dia</text>
  <text x="16" y="${centroVertical.toFixed(1)}" font-size="10.5" fill="#666666" text-anchor="middle" font-family="Arial" transform="rotate(-90 16 ${centroVertical.toFixed(1)})">Nº de recargas</text>
  ${marcacoesY}
  <line x1="${margemEsquerda}" y1="${linhaBase}" x2="${largura - 20}" y2="${linhaBase}" stroke="${CORES.preto}" stroke-width="1"/>
  ${barras}
  ${rotulosEixoX}
</svg>`.trim();

  return sharp(Buffer.from(svg)).png().toBuffer();
}
