// ═══════════════════════════════════════════════════════════════════
// baixarPdfServidor.ts — pede o PDF pronto para a API (Chrome headless)
//
// Motivo: com window.print(), quem escolhia o destino "Microsoft Print to PDF"
// recebia um PDF rasterizado (cada glifo virava um tile JPEG, sem fontes
// embutidas) e as hastes de l/I apareciam em negrito. Gerando na API o arquivo
// sai sempre vetorial, independente do que o usuário escolhe no diálogo.
// ═══════════════════════════════════════════════════════════════════

import { API_BASE } from './trpc'

export async function baixarPdfDoServidor(
  html: string,
  filename: string,
  headerFooter?: { headerTemplate: string; footerTemplate: string; capaHtml?: string | null },
): Promise<void> {
  const token = localStorage.getItem('atomtech_token')

  const resp = await fetch(`${API_BASE}/pdf/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      html, filename,
      ...(headerFooter ? { headerTemplate: headerFooter.headerTemplate, footerTemplate: headerFooter.footerTemplate } : {}),
      ...(headerFooter?.capaHtml ? { capaHtml: headerFooter.capaHtml } : {}),
    }),
  })

  if (!resp.ok) {
    let detalhe = `HTTP ${resp.status}`
    try { detalhe = (await resp.json())?.error ?? detalhe } catch { /* corpo não-JSON */ }
    throw new Error(detalhe)
  }

  const blob = await resp.blob()
  if (blob.type !== 'application/pdf') throw new Error('Resposta não é um PDF')

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
