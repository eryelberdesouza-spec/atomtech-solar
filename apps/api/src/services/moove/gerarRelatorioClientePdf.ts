import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderPdf } from "../../lib/pdfRenderer";
import type { TotaisEstacao } from "./agregar";
import { inicioDaRecarga } from "./agregar";
import { agregarPorHora, gerarImagemGraficoHorarios } from "./graficoHorarios";
import type { RecargaMoove } from "./lerMoove";
import { calcularValores } from "./cobranca";
import type { ClienteParaRelatorio } from "./gerarRelatorio";

const LOGO_PATH = path.join(__dirname, "assets", "logo-atomtech.png");

const NOME_TAXA_UNICA = "Taxa de Gestão, Cobrança e Atendimento";

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

function esc(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function gerarRelatorioClientePdf(
  cliente: ClienteParaRelatorio,
  totaisPorEstacao: TotaisEstacao[],
  recargasDoCliente: RecargaMoove[]
): Promise<Buffer> {
  const logoBuffer = await readFile(LOGO_PATH);
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  const totaisPorHora = agregarPorHora(recargasDoCliente);
  const imagemGraficoBuffer = await gerarImagemGraficoHorarios(totaisPorHora);
  const graficoBase64 = `data:image/png;base64,${imagemGraficoBuffer.toString("base64")}`;

  const todasDatas = totaisPorEstacao.flatMap((t) => [t.periodoInicio, t.periodoFim]).filter((d): d is Date => d !== null);
  const periodoInicio = todasDatas.length > 0 ? new Date(Math.min(...todasDatas.map((d) => d.getTime()))) : null;
  const periodoFim = todasDatas.length > 0 ? new Date(Math.max(...todasDatas.map((d) => d.getTime()))) : null;

  let totalRecargas = 0;
  let totalEnergia = 0;
  let totalReceita = 0;
  let totalTaxaUnica = 0;
  let totalLiquido = 0;

  const linhasResumo = totaisPorEstacao
    .map((t) => {
      totalRecargas += t.numeroRecargas;
      totalEnergia += t.energiaTotalKwh;
      totalReceita += t.receitaTotal;
      return `
        <tr>
          <td class="esq">${esc(t.estacao)}</td>
          <td>${t.numeroRecargas}</td>
          <td>${t.energiaTotalKwh.toFixed(2)} kWh</td>
          <td>${fmtMoeda(t.receitaTotal)}</td>
        </tr>`;
    })
    .join("");

  const comissaoDaEstacao = (nomeEstacao: string) =>
    cliente.estacoes.find((e) => e.nome === nomeEstacao)?.comissaoAtomPercentual ?? 0;

  const recargasOrdenadas = [...recargasDoCliente].sort((a, b) => {
    const da = inicioDaRecarga(a.inicioFim)?.getTime() ?? 0;
    const db = inicioDaRecarga(b.inicioFim)?.getTime() ?? 0;
    return da - db;
  });

  const linhasTransacoes = recargasOrdenadas
    .map((r) => {
      const valores = calcularValores(r.receita, comissaoDaEstacao(r.estacao));
      const taxaUnica = valores.valorTaxaMoove + valores.valorComissaoAtom;
      totalTaxaUnica += taxaUnica;
      totalLiquido += valores.receitaBruta - taxaUnica;

      return `
        <tr>
          <td class="esq">${esc(r.usuarioNome || "-")}</td>
          <td>${esc(r.usuarioTelefone || "-")}</td>
          <td>${fmtDataHora(inicioDaRecarga(r.inicioFim))}</td>
          <td>${esc(r.duracao)}</td>
          <td>${r.energiaKwh.toFixed(2)} kWh</td>
          <td>${fmtMoeda(valores.receitaBruta)}</td>
          <td>${fmtMoeda(taxaUnica)}</td>
          <td class="destaque">${fmtMoeda(valores.receitaBruta - taxaUnica)}</td>
        </tr>`;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1A1A1A;
    padding: 32px 36px;
    font-size: 12px;
  }
  .cabecalho { display: flex; align-items: center; gap: 18px; margin-bottom: 6px; }
  .cabecalho img { width: 64px; height: 64px; object-fit: contain; }
  h1 { font-size: 20px; margin: 0 0 2px; color: #1A1A1A; }
  .cliente { font-size: 14px; font-weight: bold; color: #3DAE3D; margin: 0; }
  .periodo { font-size: 11px; color: #666; margin: 2px 0 0; font-style: italic; }
  .faixa { height: 5px; background: #F5A623; margin: 14px 0 18px; border-radius: 3px; }
  h2 { font-size: 14px; color: #1A1A1A; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th { background: #1A1A1A; color: #fff; padding: 6px 4px; text-align: center; }
  td { padding: 5px 4px; text-align: center; border-bottom: 1px solid #eee; }
  td.esq { text-align: left; }
  td.destaque { font-weight: bold; color: #3DAE3D; }
  tr:nth-child(even) td { background: #F8F8F8; }
  .total-row td { font-weight: bold; background: #3DAE3D !important; color: #fff; }
  .grafico { margin: 16px 0; text-align: center; }
  .grafico img { width: 100%; max-width: 620px; }
  .rodape { margin-top: 24px; font-size: 9px; color: #999; font-style: italic; }
</style>
</head>
<body>
  <div class="cabecalho">
    <img src="${logoBase64}" />
    <div>
      <h1>Relatório Semanal de Recargas</h1>
      <p class="cliente">Cliente: ${esc(cliente.clienteNome)}</p>
      <p class="periodo">Período: ${fmtData(periodoInicio)} a ${fmtData(periodoFim)}</p>
    </div>
  </div>
  <div class="faixa"></div>

  <h2>Resumo por estação</h2>
  <table>
    <thead><tr><th>Estação</th><th>Nº Recargas</th><th>Energia</th><th>Receita</th></tr></thead>
    <tbody>
      ${linhasResumo}
      <tr class="total-row"><td class="esq">TOTAL GERAL</td><td>${totalRecargas}</td><td>${totalEnergia.toFixed(2)} kWh</td><td>${fmtMoeda(totalReceita)}</td></tr>
    </tbody>
  </table>

  <div class="grafico">
    <img src="${graficoBase64}" />
  </div>

  <h2>Transações detalhadas</h2>
  <table>
    <thead>
      <tr>
        <th>Usuário</th><th>Telefone</th><th>Data/Hora</th><th>Duração</th>
        <th>Energia</th><th>Receita Bruta</th><th>${NOME_TAXA_UNICA}</th><th>Valor Líquido</th>
      </tr>
    </thead>
    <tbody>
      ${linhasTransacoes}
      <tr class="total-row">
        <td class="esq" colspan="5">TOTAL GERAL</td>
        <td>${fmtMoeda(totalReceita)}</td>
        <td>${fmtMoeda(totalTaxaUnica)}</td>
        <td>${fmtMoeda(totalLiquido)}</td>
      </tr>
    </tbody>
  </table>

  <p class="rodape">
    Relatório gerado automaticamente pela Atom Tech em ${new Date().toLocaleString("pt-BR")}.
    O valor líquido já desconta a ${NOME_TAXA_UNICA.toLowerCase()}.
  </p>
</body>
</html>`;

  return renderPdf(html, { origensPermitidas: [] });
}
