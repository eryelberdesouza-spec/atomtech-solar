import ExcelJS from "exceljs";
import path from "node:path";
import type { TotaisEstacao } from "./agregar";
import { inicioDaRecarga } from "./agregar";
import { agregarPorHora, gerarImagemGraficoHorarios } from "./graficoHorarios";
import type { RecargaMoove } from "./lerMoove";
import { calcularValores, TAXA_MOOVE_PERCENTUAL } from "./cobranca";

const LOGO_PATH = path.join(__dirname, "assets", "logo-atomtech.png");

const CORES = {
  amareloAtom: "FFF5A623",
  verdeAtom: "FF3DAE3D",
  pretoAtom: "FF1A1A1A",
  cinzaClaro: "FFF5F5F5",
  cinzaBorda: "FFDDDDDD",
};

export interface EstacaoDoCliente {
  nome: string;
  local?: string | null;
  comissaoAtomPercentual: number;
}

export interface ClienteParaRelatorio {
  clienteNome: string;
  estacoes: EstacaoDoCliente[];
}

function fmtData(data: Date | null): string {
  if (!data) return "-";
  return data.toLocaleDateString("pt-BR");
}

function fmtDataHora(data: Date | null): string {
  if (!data) return "-";
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}min` : `${m}min`;
}

function comissaoDaEstacao(cliente: ClienteParaRelatorio, nomeEstacao: string): number {
  return cliente.estacoes.find((e) => e.nome === nomeEstacao)?.comissaoAtomPercentual ?? 0;
}

export async function gerarRelatorioCliente(
  cliente: ClienteParaRelatorio,
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
    { width: 28 }, { width: 16 }, { width: 16 }, { width: 16 },
    { width: 16 }, { width: 18 }, { width: 16 }, { width: 16 },
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
  clienteCell.value = `Cliente: ${cliente.clienteNome}`;
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
    "Estação", "Nº Recargas", "Energia (kWh)", "Receita Total",
    "Ticket Médio", "Duração Média", "Início do período", "Fim do período",
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
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.verdeAtom } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  totalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

  const linhaGraficoTitulo = linhaTotal + 3;
  sheet.mergeCells(`A${linhaGraficoTitulo}:H${linhaGraficoTitulo}`);
  const graficoTituloCell = sheet.getCell(`A${linhaGraficoTitulo}`);
  graficoTituloCell.value = "Análise de horários — quando o cliente mais e menos recarrega";
  graficoTituloCell.font = { size: 13, bold: true, color: { argb: CORES.pretoAtom } };

  const totaisPorHora = agregarPorHora(recargasDoCliente);
  const imagemGrafico = await gerarImagemGraficoHorarios(totaisPorHora);
  const linhaGraficoImagem = linhaGraficoTitulo + 1;
  // @ts-expect-error conflito de tipos Buffer entre @types/node duplicados no monorepo (hoisting) — inofensivo em runtime
  const imagemId = workbook.addImage({ buffer: imagemGrafico, extension: "png" });
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

function adicionarAbaTransacoes(workbook: ExcelJS.Workbook, cliente: ClienteParaRelatorio, recargas: RecargaMoove[]): void {
  const sheet = workbook.addWorksheet("Transações", {
    pageSetup: { orientation: "landscape", fitToPage: true },
  });

  sheet.columns = [
    { width: 14 }, { width: 26 }, { width: 26 }, { width: 16 }, { width: 18 },
    { width: 14 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 },
  ];

  sheet.mergeCells("A1:K1");
  const tituloCell = sheet.getCell("A1");
  tituloCell.value = `Transações detalhadas — ${cliente.clienteNome}`;
  tituloCell.font = { size: 15, bold: true, color: { argb: CORES.pretoAtom } };

  sheet.mergeCells("A2:K2");
  const cobrancaCell = sheet.getCell("A2");
  const descricoesPorEstacao = cliente.estacoes
    .map((e) => `${e.nome}: taxa Moove ${(TAXA_MOOVE_PERCENTUAL * 100).toFixed(0)}% + comissão Atom Tech ${e.comissaoAtomPercentual.toFixed(1)}%`)
    .join(" | ");
  cobrancaCell.value = descricoesPorEstacao;
  cobrancaCell.font = { size: 11, italic: true, color: { argb: CORES.verdeAtom } };

  const linhaCabecalho = 4;
  const cabecalhos = [
    "ID Recarga", "Estação", "Usuário", "Telefone", "Data/Hora", "Duração",
    "Energia (kWh)", "Receita Bruta", "Taxa Moove (7%)", "Comissão Atom Tech", "Valor Líquido Cliente",
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
    const da = inicioDaRecarga(a.inicioFim)?.getTime() ?? 0;
    const db = inicioDaRecarga(b.inicioFim)?.getTime() ?? 0;
    return da - db;
  });

  let linhaAtual = linhaCabecalho + 1;
  let totalEnergia = 0;
  let totalReceita = 0;
  let totalTaxaMoove = 0;
  let totalComissaoAtom = 0;
  let totalLiquido = 0;

  for (const [i, recarga] of recargasOrdenadas.entries()) {
    const comissao = comissaoDaEstacao(cliente, recarga.estacao);
    const valores = calcularValores(recarga.receita, comissao);

    const row = sheet.getRow(linhaAtual);
    row.getCell(1).value = recarga.recargaId;
    row.getCell(2).value = recarga.estacao;
    row.getCell(3).value = recarga.usuarioNome || "-";
    row.getCell(4).value = recarga.usuarioTelefone || "-";
    row.getCell(5).value = fmtDataHora(inicioDaRecarga(recarga.inicioFim));
    row.getCell(6).value = recarga.duracao;
    row.getCell(7).value = Number(recarga.energiaKwh.toFixed(2));
    row.getCell(8).value = fmtMoeda(valores.receitaBruta);
    row.getCell(9).value = fmtMoeda(valores.valorTaxaMoove);
    row.getCell(10).value = fmtMoeda(valores.valorComissaoAtom);
    row.getCell(11).value = fmtMoeda(valores.valorLiquidoCliente);

    row.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { bottom: { style: "hair", color: { argb: CORES.cinzaBorda } } };
      if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.cinzaClaro } };
      }
    });
    row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };

    totalEnergia += recarga.energiaKwh;
    totalReceita += valores.receitaBruta;
    totalTaxaMoove += valores.valorTaxaMoove;
    totalComissaoAtom += valores.valorComissaoAtom;
    totalLiquido += valores.valorLiquidoCliente;
    linhaAtual++;
  }

  const totalRow = sheet.getRow(linhaAtual);
  totalRow.getCell(1).value = "TOTAL GERAL";
  totalRow.getCell(7).value = Number(totalEnergia.toFixed(2));
  totalRow.getCell(8).value = fmtMoeda(totalReceita);
  totalRow.getCell(9).value = fmtMoeda(totalTaxaMoove);
  totalRow.getCell(10).value = fmtMoeda(totalComissaoAtom);
  totalRow.getCell(11).value = fmtMoeda(totalLiquido);
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.verdeAtom } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  totalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

  const linhaRodape = linhaAtual + 2;
  sheet.mergeCells(`A${linhaRodape}:K${linhaRodape}`);
  const rodapeCell = sheet.getCell(`A${linhaRodape}`);
  rodapeCell.value = `"Valor Líquido Cliente" já desconta a taxa fixa da Moove (7%) e a comissão da Atom Tech negociada por estação.`;
  rodapeCell.font = { size: 9, italic: true, color: { argb: "FF999999" } };
}
