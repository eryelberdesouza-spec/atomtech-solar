import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lerMoove } from "./lerMoove.js";
import { agregarPorEstacao } from "./agregar.js";
import { gerarRelatorioCliente } from "./gerarRelatorio.js";
import { carregarClientes, nomesDasEstacoes } from "./clientes.js";
import { enviarRelatorio } from "./enviarEmail.js";
import { garantirCadastroCompleto } from "./preencherCadastro.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "output");
const PASTA_MOOVE_PADRAO =
  "G:\\Meu Drive\\1. ADMINISTRATIVO\\4. PARCERIAS\\MOOVE\\RELATÓRIOS RECARGAS";

async function arquivoMaisRecente(pasta: string): Promise<string> {
  const arquivos = (await readdir(pasta)).filter((f) => f.endsWith(".xlsx"));
  if (arquivos.length === 0) {
    throw new Error(`Nenhum .xlsx encontrado em ${pasta}`);
  }
  const comData = await Promise.all(
    arquivos.map(async (f) => {
      const caminho = path.join(pasta, f);
      const info = await stat(caminho);
      return { caminho, mtime: info.mtimeMs };
    })
  );
  comData.sort((a, b) => b.mtime - a.mtime);
  return comData[0].caminho;
}

async function main() {
  const argumentos = process.argv.slice(2);
  const enviar = argumentos.includes("--send");
  const semInterativo = argumentos.includes("--sem-interativo");
  const caminhoArgumento = argumentos.find((a) => !a.startsWith("--"));

  const caminhoArquivo = caminhoArgumento ?? (await arquivoMaisRecente(PASTA_MOOVE_PADRAO));
  console.log(`Lendo arquivo Moove: ${caminhoArquivo}`);

  const recargas = await lerMoove(caminhoArquivo);
  console.log(`${recargas.length} recargas lidas.`);

  const totaisPorEstacao = agregarPorEstacao(recargas);
  console.log(`Estações encontradas no arquivo: ${totaisPorEstacao.map((t) => t.estacao).join(", ")}`);

  let clientes = await carregarClientes();
  if (!semInterativo) {
    clientes = await garantirCadastroCompleto(
      totaisPorEstacao.map((t) => t.estacao),
      clientes
    );
  }
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const cliente of clientes) {
    const estacoesDoCliente = nomesDasEstacoes(cliente);
    const totaisDoCliente = totaisPorEstacao.filter((t) => estacoesDoCliente.includes(t.estacao));
    if (totaisDoCliente.length === 0) {
      console.warn(`Aviso: nenhuma estação do cliente "${cliente.cliente}" apareceu no arquivo.`);
      continue;
    }

    const recargasDoCliente = recargas.filter((r) => estacoesDoCliente.includes(r.estacao));
    const workbook = await gerarRelatorioCliente(cliente, totaisDoCliente, recargasDoCliente);
    const carimbo = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const nomeArquivo = `relatorio-recargas-${cliente.cliente.replace(/[^a-zA-Z0-9]+/g, "-")}-${carimbo}.xlsx`;
    const caminhoSaida = path.join(OUTPUT_DIR, nomeArquivo);
    await workbook.xlsx.writeFile(caminhoSaida);
    console.log(`Gerado: ${caminhoSaida}`);

    await enviarRelatorio({ cliente: cliente.cliente, emails: cliente.emails, nomeArquivo, workbook }, enviar);
  }

  const estacoesSemCliente = totaisPorEstacao
    .map((t) => t.estacao)
    .filter((e) => !clientes.some((c) => nomesDasEstacoes(c).includes(e)));
  if (estacoesSemCliente.length > 0) {
    console.warn(
      `Aviso: estações no arquivo sem cliente cadastrado em clientes.json: ${estacoesSemCliente.join(", ")}`
    );
  }

  if (!enviar) {
    console.log("\nModo preview (sem --send): nenhum email foi enviado. Confira os arquivos em output/.");
  }
}

main().catch((erro) => {
  console.error("Erro:", erro.message);
  process.exit(1);
});
