import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ConfigCobranca } from "./cobranca.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENTES_PATH = path.join(__dirname, "..", "clientes.json");

export interface EstacaoConfig {
  nome: string;
  cobranca?: ConfigCobranca;
}

export interface ClienteConfig {
  cliente: string;
  emails: string[];
  estacoes: EstacaoConfig[];
}

export async function carregarClientes(): Promise<ClienteConfig[]> {
  const conteudo = await readFile(CLIENTES_PATH, "utf-8");
  return JSON.parse(conteudo) as ClienteConfig[];
}

export async function salvarClientes(clientes: ClienteConfig[]): Promise<void> {
  await writeFile(CLIENTES_PATH, JSON.stringify(clientes, null, 2) + "\n", "utf-8");
}

export function nomesDasEstacoes(cliente: ClienteConfig): string[] {
  return cliente.estacoes.map((e) => e.nome);
}

export function cobrancaDaEstacao(cliente: ClienteConfig, nomeEstacao: string): ConfigCobranca | undefined {
  return cliente.estacoes.find((e) => e.nome === nomeEstacao)?.cobranca;
}
