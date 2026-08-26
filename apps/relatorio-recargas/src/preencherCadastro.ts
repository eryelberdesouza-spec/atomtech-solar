import { createInterface } from "node:readline/promises";
import type { ClienteConfig } from "./clientes.js";
import { nomesDasEstacoes, salvarClientes } from "./clientes.js";
import type { ConfigCobranca, TipoCobranca } from "./cobranca.js";

async function perguntar(rl: ReturnType<typeof createInterface>, pergunta: string): Promise<string> {
  const resposta = await rl.question(pergunta);
  return resposta.trim();
}

function encontrarClientePorNome(clientes: ClienteConfig[], nome: string): ClienteConfig | undefined {
  return clientes.find((c) => c.cliente.toLowerCase() === nome.toLowerCase());
}

async function perguntarCobranca(rl: ReturnType<typeof createInterface>, estacao: string): Promise<ConfigCobranca> {
  console.log(`\nTarifa negociada para a estação "${estacao}":`);
  console.log("  1) R$ fixo por kWh consumido (mais comum)");
  console.log("  2) Percentual sobre a receita da recarga");
  console.log("  3) R$ fixo por recarga, independente do consumo");
  const opcao = await perguntar(rl, "Escolha 1, 2 ou 3 [1]: ");
  const tipo: TipoCobranca =
    opcao === "2" ? "percentual" : opcao === "3" ? "valor_fixo_recarga" : "valor_fixo_kwh";

  const rotulo =
    tipo === "percentual"
      ? "Percentual (ex.: 15 para 15%): "
      : tipo === "valor_fixo_recarga"
        ? "Valor fixo em R$ por recarga (ex.: 2.50): "
        : "Valor em R$ por kWh (ex.: 0.75): ";

  const valorTexto = await perguntar(rl, rotulo);
  const valorDigitado = Number(valorTexto.replace(",", "."));
  const valor = tipo === "percentual" ? valorDigitado / 100 : valorDigitado;

  return { tipo, valor };
}

/**
 * Para cada estação encontrada no arquivo da Moove que ainda não tem cliente ou tarifa
 * cadastrada em clientes.json, pergunta interativamente no terminal e persiste a resposta.
 */
export async function garantirCadastroCompleto(
  estacoesNoArquivo: string[],
  clientes: ClienteConfig[]
): Promise<ClienteConfig[]> {
  const estacoesFaltando = estacoesNoArquivo.filter((estacao) => {
    const cliente = clientes.find((c) => nomesDasEstacoes(c).includes(estacao));
    if (!cliente) return true;
    const config = cliente.estacoes.find((e) => e.nome === estacao);
    return !config?.cobranca;
  });

  if (estacoesFaltando.length === 0) {
    return clientes;
  }

  console.log(
    `\n${estacoesFaltando.length} estação(ões) do arquivo ainda não têm cadastro completo. Vamos preencher agora (isso só é perguntado uma vez, fica salvo em clientes.json):`
  );

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let houveMudanca = false;

  try {
    for (const estacao of estacoesFaltando) {
      const clienteExistente = clientes.find((c) => nomesDasEstacoes(c).includes(estacao));

      if (clienteExistente) {
        console.log(`\nEstação "${estacao}" já pertence ao cliente "${clienteExistente.cliente}", falta só a tarifa.`);
        const cobranca = await perguntarCobranca(rl, estacao);
        const estacaoConfig = clienteExistente.estacoes.find((e) => e.nome === estacao)!;
        estacaoConfig.cobranca = cobranca;
        houveMudanca = true;
        continue;
      }

      console.log(`\nEstação nova encontrada no arquivo: "${estacao}"`);
      const nomeCliente = await perguntar(rl, "Nome do cliente/proprietário desta estação: ");

      const clienteJaCadastrado = encontrarClientePorNome(clientes, nomeCliente);
      const cobranca = await perguntarCobranca(rl, estacao);

      if (clienteJaCadastrado) {
        clienteJaCadastrado.estacoes.push({ nome: estacao, cobranca });
      } else {
        const emailsTexto = await perguntar(rl, "Email(s) para envio do relatório (separados por vírgula): ");
        const emails = emailsTexto
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
        clientes.push({ cliente: nomeCliente, emails, estacoes: [{ nome: estacao, cobranca }] });
      }
      houveMudanca = true;
    }
  } finally {
    rl.close();
  }

  if (houveMudanca) {
    await salvarClientes(clientes);
    console.log("\nCadastro atualizado e salvo em clientes.json.\n");
  }

  return clientes;
}
