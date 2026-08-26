import { lerMoove, estacoesUnicas } from "./lerMoove";
import { agregarPorEstacao } from "./agregar";
import { gerarRelatorioCliente, type ClienteParaRelatorio } from "./gerarRelatorio";
import { gerarRelatorioClientePdf } from "./gerarRelatorioClientePdf";

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
  periodoInicio: Date | null;
  periodoFim: Date | null;
  // Interno (Atom Tech): detalha separadamente a taxa da Moove e a comissão
  // Atom Tech, para conferir com o que cai na conta corrente.
  arquivoNomeInterno: string;
  bufferInterno: Buffer;
  // Cliente (proprietário da estação): mesmo conteúdo, mas com as duas taxas
  // somadas numa única linha ("Taxa de Gestão, Cobrança e Atendimento").
  arquivoNomeCliente: string;
  bufferCliente: Buffer;
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

    const [workbookInterno, pdfCliente] = await Promise.all([
      gerarRelatorioCliente(clienteParaRelatorio, totaisDoCliente, recargasDoCliente),
      gerarRelatorioClientePdf(clienteParaRelatorio, totaisDoCliente, recargasDoCliente),
    ]);
    const bufferInterno = Buffer.from(await workbookInterno.xlsx.writeBuffer());

    const todasDatas = totaisDoCliente
      .flatMap((t) => [t.periodoInicio, t.periodoFim])
      .filter((d): d is Date => d !== null);
    const periodoInicio = todasDatas.length > 0 ? new Date(Math.min(...todasDatas.map((d) => d.getTime()))) : null;
    const periodoFim = todasDatas.length > 0 ? new Date(Math.max(...todasDatas.map((d) => d.getTime()))) : null;

    // Nome do arquivo carrega o período coberto (não "semanal" — o período real
    // depende do que veio no Excel da Moove) pra dar pra identificar o relatório
    // certo só olhando o nome, sem precisar abrir, mesmo com vários gerados no
    // mesmo dia.
    const slugCliente = clienteNome.replace(/[^a-zA-Z0-9]+/g, "-");
    const slugPeriodo = periodoInicio && periodoFim
      ? `${periodoInicio.toISOString().slice(0, 10)}_a_${periodoFim.toISOString().slice(0, 10)}`
      : new Date().toISOString().slice(0, 10);

    resultados.push({
      clienteId,
      clienteNome,
      periodoInicio,
      periodoFim,
      arquivoNomeInterno: `recargas-interno-${slugCliente}-${slugPeriodo}.xlsx`,
      bufferInterno,
      arquivoNomeCliente: `recargas-${slugCliente}-${slugPeriodo}.pdf`,
      bufferCliente: pdfCliente,
    });
  }

  return resultados;
}
