import nodemailer from "nodemailer";
import type ExcelJS from "exceljs";
import "dotenv/config";

export interface DestinoEmail {
  cliente: string;
  emails: string[];
  nomeArquivo: string;
  workbook: ExcelJS.Workbook;
}

function transporterHostinger() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Variáveis SMTP não configuradas. Copie .env.example para .env e preencha host/porta/usuário/senha do Hostinger."
    );
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function enviarRelatorio(destino: DestinoEmail, modoEnvio: boolean): Promise<void> {
  const buffer = await destino.workbook.xlsx.writeBuffer();

  if (!modoEnvio) {
    console.log(
      `[preview] enviaria para ${destino.emails.join(", ")} — cliente "${destino.cliente}" — anexo ${destino.nomeArquivo} (${(buffer.byteLength / 1024).toFixed(1)} KB)`
    );
    return;
  }

  const transporter = transporterHostinger();
  const fromName = process.env.SMTP_FROM_NAME || "Atom Tech";

  await transporter.sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to: destino.emails.join(", "),
    subject: `Relatório semanal de recargas — ${destino.cliente}`,
    text: `Olá,\n\nSegue em anexo o relatório semanal de recargas referente às suas estações.\n\nAtenciosamente,\nAtom Tech`,
    attachments: [
      {
        filename: destino.nomeArquivo,
        content: Buffer.from(buffer),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });

  console.log(`[enviado] ${destino.cliente} -> ${destino.emails.join(", ")}`);
}
