import ExcelJS from "exceljs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TotaisEstacao } from "./agregar.js";
import type { ClienteConfig } from "./clientes.js";
import { cobrancaDaEstacao } from "./clientes.js";
import { agregarPorHora, gerarImagemGraficoHorarios, type TotaisPorHora } from "./graficoHorarios.js";
import type { RecargaMoove } from "./lerMoove.js";
import { calcularValorDebitado, descricaoCobranca } from "./cobranca.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, "..", "assets", "logo-atomtech.png");

const CORES = {
  amareloAtom: "FFF5A623",
  verdeAtom: "FF3DAE3D",
  pretoAtom: "FF1A1A1A",
  cinzaClaro: "FFF5F5F5",
  cinzaBorda: "FFDDDDDD",
};

function fmtData(data: Date | null): string {
  if (!data) return "-";
  return data.toLocaleDateString("pt-BR");
}

function fmtMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}min` : `${m}min`;
}

export async function gerarRelatorioCliente(
  cliente: ClienteConfig,
  totaisPorEstacao: TotaisEstacao[],
  recargasDoCliente: RecargaMoove[]
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Atom Tech";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Resumo", {
    pageSetup: { orientation: "landscape", fitToPage: true },
  });

  sheet.columns = [
    { width: 28 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
  ];

  const logoId = workbook.addImage({ filename: LOGO_PATH, extension: "png" });
  sheet.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 130, height: 130 } });

  sheet.mergeCells("C1:H1");
  const tituloCell = sheet.getCell("C1");
  tituloCell.value = "Relatório Semanal de Recargas";
  tituloCell.font = { size: 18, bold: true, color: { argb: CORES.pretoAtom } };
  tituloCell.alignment = { vertical: "middle" };

  sheet.mergeCells("C2:H2");
  const clienteCell = sheet.getCell("C2");
  clienteCell.value = `Cliente: ${cliente.cliente}`;
  clienteCell.font = { size: 13, bold: true, color: { argb: CORES.verdeAtom } };

  const todasDatas = totaisPorEstacao.flatMap((t) => [t.periodoInicio, t.periodoFim]).filter((d): d is Date => d !== null);
  const periodoInicio = todasDatas.length > 0 ? new Date(Math.min(...todasDatas.map((d) => d.getTime()))) : null;
  const periodoFim = todasDatas.length > 0 ? new Date(Math.max(...todasDatas.map((d) => d.getTime()))) : null;

  sheet.mergeCells("C3:H3");
  const periodoCell = sheet.getCell("C3");
  periodoCell.value = `Período: ${fmtData(periodoInicio)} a ${fmtData(periodoFim)}`;
  periodoCell.font = { size: 11, italic: true, color: { argb: "FF666666" } };

  const linhaFaixa = 6;
  sheet.mergeCells(`A${linhaFaixa}:H${linhaFaixa}`);
  const faixa = sheet.getRow(linhaFaixa);
  faixa.height = 6;
  faixa.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.amareloAtom } };

  const linhaCabecalho = linhaFaixa + 2;
  const cabecalhos = [
    "Estação",
    "Nº Recargas",
    "Energia (kWh)",
    "Receita Total",
    "Ticket Médio",
    "Duração Média",
    "Início do período",
    "Fim do período",
  ];
  const headerRow = sheet.getRow(linhaCabecalho);
  cabecalhos.forEach((texto, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = texto;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.pretoAtom } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: CORES.cinzaBorda } },
      bottom: { style: "thin", color: { argb: CORES.cinzaBorda } },
    };
  });
  headerRow.height = 22;

  let linhaAtual = linhaCabecalho + 1;
  let totalRecargas = 0;
  let totalEnergia = 0;
  let totalReceita = 0;

  for (const [i, totais] of totaisPorEstacao.entries()) {
    const row = sheet.getRow(linhaAtual);
    row.getCell(1).value = totais.estacao;
    row.getCell(2).value = totais.numeroRecargas;
    row.getCell(3).value = Number(totais.energiaTotalKwh.toFixed(2));
    row.getCell(4).value = fmtMoeda(totais.receitaTotal);
    row.getCell(5).value = fmtMoeda(totais.ticketMedio);
    row.getCell(6).value = fmtMinutos(totais.duracaoMediaMin);
    row.getCell(7).value = fmtData(totais.periodoInicio);
    row.getCell(8).value = fmtData(totais.periodoFim);

    row.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { bottom: { style: "hair", color: { argb: CORES.cinzaBorda } } };
      if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.cinzaClaro } };
      }
    });
    row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

    totalRecargas += totais.numeroRecargas;
    totalEnergia += totais.energiaTotalKwh;
    totalReceita += totais.receitaTotal;
    linhaAtual++;
  }

  const linhaTotal = linhaAtual + 1;
  const totalRow = sheet.getRow(linhaTotal);
  totalRow.getCell(1).value = "TOTAL GERAL";
  totalRow.getCell(2).value = totalRecargas;
  totalRow.getCell(3).value = Number(totalEnergia.toFixed(2));
  totalRow.getCell(4).value = fmtMoeda(totalReceita);
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.verdeAtom } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  totalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  totalRow.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  for (let c = 1; c <= 8; c++) {
    totalRow.getCell(c).font = { ...totalRow.getCell(c).font, color: { argb: "FFFFFFFF" } };
  }

  const linhaGraficoTitulo = linhaTotal + 3;
  sheet.mergeCells(`A${linhaGraficoTitulo}:H${linhaGraficoTitulo}`);
  const graficoTituloCell = sheet.getCell(`A${linhaGraficoTitulo}`);
  graficoTituloCell.value = "Análise de horários — quando o cliente mais e menos recarrega";
  graficoTituloCell.font = { size: 13, bold: true, color: { argb: CORES.pretoAtom } };

  const totaisPorHora = agregarPorHora(recargasDoCliente);
  const imagemGrafico = await gerarImagemGraficoHorarios(totaisPorHora);
  // @ts-expect-error conflito de tipos Buffer entre @types/node duplicados no monorepo (hoisting) — inofensivo em runtime
  const imagemId = workbook.addImage({ buffer: imagemGrafico, extension: "png" });
  const linhaGraficoImagem = linhaGraficoTitulo + 1;
  sheet.addImage(imagemId, {
    tl: { col: 0, row: linhaGraficoImagem - 1 },
    ext: { width: 830, height: 313 },
  });

  const ALTURA_LINHA_PADRAO_PX = 20;
  const linhasOcupadasPelaImagem = Math.ceil(313 / ALTURA_LINHA_PADRAO_PX);
  const linhaResumoPico = linhaGraficoImagem + linhasOcupadasPelaImagem + 1;

  const horasComMovimento = totaisPorHora.filter((t) => t.numeroRecargas > 0);
  if (horasComMovimento.length > 0) {
    const pico = horasComMovimento.reduce((a, b) => (b.numeroRecargas > a.numeroRecargas ? b : a));
    const vale = horasComMovimento.reduce((a, b) => (b.numeroRecargas < a.numeroRecargas ? b : a));

    sheet.mergeCells(`A${linhaResumoPico}:H${linhaResumoPico}`);
    const resumoPicoCell = sheet.getCell(`A${linhaResumoPico}`);
    resumoPicoCell.value = `Horário de pico: ${String(pico.hora).padStart(2, "0")}h (${pico.numeroRecargas} recargas, ${fmtMoeda(pico.receita)}) — considerar tarifa mais alta neste horário.`;
    resumoPicoCell.font = { size: 10, bold: true, color: { argb: CORES.verdeAtom } };

    const linhaResumoVale = linhaResumoPico + 1;
    sheet.mergeCells(`A${linhaResumoVale}:H${linhaResumoVale}`);
    const resumoValeCell = sheet.getCell(`A${linhaResumoVale}`);
    resumoValeCell.value = `Horário de menor movimento: ${String(vale.hora).padStart(2, "0")}h (${vale.numeroRecargas} recargas, ${fmtMoeda(vale.receita)}) — oportunidade para tarifa promocional e atrair mais uso.`;
    resumoValeCell.font = { size: 10, color: { argb: "FF666666" } };
  }

  const linhaRodape = linhaResumoPico + (horasComMovimento.length > 0 ? 4 : 1);
  sheet.mergeCells(`A${linhaRodape}:H${linhaRodape}`);
  const rodapeCell = sheet.getCell(`A${linhaRodape}`);
  rodapeCell.value = `Relatório gerado automaticamente pela Atom Tech em ${new Date().toLocaleString("pt-BR")}. Veja a aba "Transações" para o detalhamento de cada recarga.`;
  rodapeCell.font = { size: 9, italic: true, color: { argb: "FF999999" } };

  adicionarAbaTransacoes(workbook, cliente, recargasDoCliente);

  return workbook;
}

function inicioComoData(inicioFim: string): Date | null {
  const inicio = inicioFim.split(" - ")[0]?.trim();
  const match = inicio?.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, dia, mes, ano, hora, minuto] = match;
  return new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
}

function fmtDataHora(data: Date | null): string {
  if (!data) return "-";
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function adicionarAbaTransacoes(workbook: ExcelJS.Workbook, cliente: ClienteConfig, recargas: RecargaMoove[]): void {
  const sheet = workbook.addWorksheet("Transações", {
    pageSetup: { orientation: "landscape", fitToPage: true },
  });

  sheet.columns = [
    { width: 14 },
    { width: 26 },
    { width: 26 },
    { width: 16 },
    { width: 18 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 12 },
  ];

  sheet.mergeCells("A1:J1");
  const tituloCell = sheet.getCell("A1");
  tituloCell.value = `Transações detalhadas — ${cliente.cliente}`;
  tituloCell.font = { size: 15, bold: true, color: { argb: CORES.pretoAtom } };

  sheet.mergeCells("A2:J2");
  const cobrancaCell = sheet.getCell("A2");
  const descricoesPorEstacao = cliente.estacoes
    .map((e) => `${e.nome}: ${descricaoCobranca(e.cobranca)}`)
    .join(" | ");
  cobrancaCell.value = `Taxa negociada — ${descricoesPorEstacao}`;
  cobrancaCell.font = { size: 11, italic: true, color: { argb: CORES.verdeAtom } };

  const linhaCabecalho = 4;
  const cabecalhos = [
    "ID Recarga",
    "Estação",
    "Usuário",
    "Telefone",
    "Data/Hora",
    "Duração",
    "Energia (kWh)",
    "Receita Bruta",
    "Valor Debitado",
    "Valor Líquido",
  ];
  const headerRow = sheet.getRow(linhaCabecalho);
  cabecalhos.forEach((texto, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = texto;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.pretoAtom } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  headerRow.height = 22;

  const recargasOrdenadas = [...recargas].sort((a, b) => {
    const da = inicioComoData(a.inicioFim)?.getTime() ?? 0;
    const db = inicioComoData(b.inicioFim)?.getTime() ?? 0;
    return da - db;
  });

  let linhaAtual = linhaCabecalho + 1;
  let totalEnergia = 0;
  let totalReceita = 0;
  let totalDebitado = 0;
  let totalLiquido = 0;

  for (const [i, recarga] of recargasOrdenadas.entries()) {
    const valorDebitado = calcularValorDebitado(recarga, cobrancaDaEstacao(cliente, recarga.estacao));
    const valorLiquido = recarga.receita - valorDebitado;

    const row = sheet.getRow(linhaAtual);
    row.getCell(1).value = recarga.recargaId;
    row.getCell(2).value = recarga.estacao;
    row.getCell(3).value = recarga.usuarioNome || "-";
    row.getCell(4).value = recarga.usuarioTelefone || "-";
    row.getCell(5).value = fmtDataHora(inicioComoData(recarga.inicioFim));
    row.getCell(6).value = recarga.duracao;
    row.getCell(7).value = Number(recarga.energiaKwh.toFixed(2));
    row.getCell(8).value = fmtMoeda(recarga.receita);
    row.getCell(9).value = fmtMoeda(valorDebitado);
    row.getCell(10).value = fmtMoeda(valorLiquido);

    row.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { bottom: { style: "hair", color: { argb: CORES.cinzaBorda } } };
      if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.cinzaClaro } };
      }
    });
    row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };

    totalEnergia += recarga.energiaKwh;
    totalReceita += recarga.receita;
    totalDebitado += valorDebitado;
    totalLiquido += valorLiquido;
    linhaAtual++;
  }

  const totalRow = sheet.getRow(linhaAtual);
  totalRow.getCell(1).value = "TOTAL GERAL";
  totalRow.getCell(7).value = Number(totalEnergia.toFixed(2));
  totalRow.getCell(8).value = fmtMoeda(totalReceita);
  totalRow.getCell(9).value = fmtMoeda(totalDebitado);
  totalRow.getCell(10).value = fmtMoeda(totalLiquido);
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.verdeAtom } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  totalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

  const linhaRodape = linhaAtual + 2;
  sheet.mergeCells(`A${linhaRodape}:J${linhaRodape}`);
  const rodapeCell = sheet.getCell(`A${linhaRodape}`);
  rodapeCell.value = `"Valor Debitado" é calculado conforme a taxa negociada acima e ainda não representa uma cobrança processada — confira com o financeiro antes de reter valores.`;
  rodapeCell.font = { size: 9, italic: true, color: { argb: "FF999999" } };
}
