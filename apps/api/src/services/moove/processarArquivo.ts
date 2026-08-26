import { lerMoove, estacoesUnicas } from "./lerMoove";
import { agregarPorEstacao } from "./agregar";
import { gerarRelatorioCliente, type ClienteParaRelatorio } from "./gerarRelatorio";
import type ExcelJS from "exceljs";

export interface EstacaoEncontrada {
  nome: string;
  numeroRecargas: number;
}

export async function previsualizarArquivo(buffer: Buffer): Promise<{ estacoes: EstacaoEncontrada[] }> {
  const recargas = await lerMoove(buffer);
  const nomes = estacoesUnicas(recargas);
  const estacoes = nomes.map((nome) => ({
    nome,
    numeroRecargas: recargas.filter((r) => r.estacao === nome).length,
  }));
  return { estacoes };
}

export interface MapeamentoEstacao {
  nomeEstacao: string;
  clienteId: number;
  clienteNome: string;
  comissaoAtomPercentual: number;
}

export interface RelatorioGeradoPorCliente {
  clienteId: number;
  clienteNome: string;
  workbook: ExcelJS.Workbook;
  periodoInicio: Date | null;
  periodoFim: Date | null;
  arquivoNome: string;
}

export async function gerarRelatoriosPorCliente(
  buffer: Buffer,
  mapeamentos: MapeamentoEstacao[]
): Promise<RelatorioGeradoPorCliente[]> {
  const recargas = await lerMoove(buffer);
  const totaisPorEstacao = agregarPorEstacao(recargas);

  const porCliente = new Map<number, { clienteNome: string; estacoes: MapeamentoEstacao[] }>();
  for (const m of mapeamentos) {
    const grupo = porCliente.get(m.clienteId) ?? { clienteNome: m.clienteNome, estacoes: [] };
    grupo.estacoes.push(m);
    porCliente.set(m.clienteId, grupo);
  }

  const resultados: RelatorioGeradoPorCliente[] = [];

  for (const [clienteId, { clienteNome, estacoes }] of porCliente) {
    const nomesEstacoes = estacoes.map((e) => e.nomeEstacao);
    const recargasDoCliente = recargas.filter((r) => nomesEstacoes.includes(r.estacao));
    if (recargasDoCliente.length === 0) continue;

    const totaisDoCliente = totaisPorEstacao.filter((t) => nomesEstacoes.includes(t.estacao));
    const clienteParaRelatorio: ClienteParaRelatorio = {
      clienteNome,
      estacoes: estacoes.map((e) => ({ nome: e.nomeEstacao, comissaoAtomPercentual: e.comissaoAtomPercentual })),
    };

    const workbook = await gerarRelatorioCliente(clienteParaRelatorio, totaisDoCliente, recargasDoCliente);

    const todasDatas = totaisDoCliente
      .flatMap((t) => [t.periodoInicio, t.periodoFim])
      .filter((d): d is Date => d !== null);
    const periodoInicio = todasDatas.length > 0 ? new Date(Math.min(...todasDatas.map((d) => d.getTime()))) : null;
    const periodoFim = todasDatas.length > 0 ? new Date(Math.max(...todasDatas.map((d) => d.getTime()))) : null;

    const carimbo = new Date().toISOString().slice(0, 10);
    const arquivoNome = `relatorio-recargas-${clienteNome.replace(/[^a-zA-Z0-9]+/g, "-")}-${carimbo}.xlsx`;

    resultados.push({ clienteId, clienteNome, workbook, periodoInicio, periodoFim, arquivoNome });
  }

  return resultados;
}
