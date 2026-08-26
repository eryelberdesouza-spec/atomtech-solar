import ExcelJS from "exceljs";

export interface RecargaMoove {
  recargaId: string;
  estacao: string;
  usuarioNome: string;
  usuarioTelefone: string;
  inicioFim: string;
  duracao: string;
  energiaKwh: number;
  receita: number;
  pago: string;
}

const COLUNAS = {
  recargaId: "Recarga(ID)",
  estacao: "Estação",
  usuarioNome: "Usuário(Nome)",
  usuarioTelefone: "Usuário(Telefone)",
  inicioFim: "Início - Fim",
  duracao: "Duração",
  energiaKwh: "Energia(kWh)",
  receita: "Receita(R$)",
  pago: "Pago?",
} as const;

function paraNumero(valor: ExcelJS.CellValue): number {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const limpo = valor.replace(/\./g, "").replace(",", ".").trim();
    const n = Number(limpo);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function paraTexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object" && "text" in (valor as any)) return String((valor as any).text);
  return String(valor).trim();
}

export async function lerMoove(bufferOuCaminho: Buffer | string): Promise<RecargaMoove[]> {
  const workbook = new ExcelJS.Workbook();
  if (typeof bufferOuCaminho === "string") {
    await workbook.xlsx.readFile(bufferOuCaminho);
  } else {
    await workbook.xlsx.load(bufferOuCaminho as any);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Nenhuma aba encontrada no arquivo Moove");
  }

  const headerRow = worksheet.getRow(1);
  const indiceColuna = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const nome = paraTexto(cell.value);
    if (nome) indiceColuna.set(nome, colNumber);
  });

  for (const chave of Object.values(COLUNAS)) {
    if (!indiceColuna.has(chave)) {
      throw new Error(
        `Coluna esperada "${chave}" não encontrada no arquivo Moove. Colunas encontradas: ${[...indiceColuna.keys()].join(", ")}`
      );
    }
  }

  const recargas: RecargaMoove[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const estacao = paraTexto(row.getCell(indiceColuna.get(COLUNAS.estacao)!).value);
    if (!estacao) return;

    recargas.push({
      recargaId: paraTexto(row.getCell(indiceColuna.get(COLUNAS.recargaId)!).value),
      estacao,
      usuarioNome: paraTexto(row.getCell(indiceColuna.get(COLUNAS.usuarioNome)!).value),
      usuarioTelefone: paraTexto(row.getCell(indiceColuna.get(COLUNAS.usuarioTelefone)!).value),
      inicioFim: paraTexto(row.getCell(indiceColuna.get(COLUNAS.inicioFim)!).value),
      duracao: paraTexto(row.getCell(indiceColuna.get(COLUNAS.duracao)!).value),
      energiaKwh: paraNumero(row.getCell(indiceColuna.get(COLUNAS.energiaKwh)!).value),
      receita: paraNumero(row.getCell(indiceColuna.get(COLUNAS.receita)!).value),
      pago: paraTexto(row.getCell(indiceColuna.get(COLUNAS.pago)!).value),
    });
  });

  return recargas;
}

export function estacoesUnicas(recargas: RecargaMoove[]): string[] {
  return [...new Set(recargas.map((r) => r.estacao))].sort();
}
