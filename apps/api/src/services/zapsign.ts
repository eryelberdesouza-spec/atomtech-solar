// ═══════════════════════════════════════════════════════════════════
// zapsign.ts — assinatura eletrônica de contrato
// ═══════════════════════════════════════════════════════════════════
//
// Doc: POST https://api.zapsign.com.br/api/v1/docs/ com
// `Authorization: Bearer <token>` e o PDF em `base64_pdf` (sem o prefixo
// "data:application/pdf;base64," — a ZapSign rejeita se vier junto).
//
// Decisões do usuário (2026-10-06):
// - Signatários: cliente + os dois sócios da Atom.
// - Convite: a ZapSign manda o e-mail automaticamente. O WhatsApp da ZapSign
//   (send_automatic_whatsapp) fica DESLIGADO porque é cobrado à parte — o link
//   vai pelo WhatsApp do próprio bot (botão no card da proposta).
// - Status: webhook da ZapSign → POST /zapsign/webhook (ver index.ts).

import { getRawPool } from '../routers/trpc'

const BASE = (process.env.ZAPSIGN_API_URL ?? 'https://api.zapsign.com.br/api/v1').replace(/\/$/, '')
const TOKEN = process.env.ZAPSIGN_API_TOKEN ?? ''

export function zapsignConfigurado(): boolean {
  return Boolean(TOKEN)
}

export type SignatarioEntrada = {
  nome: string
  email?: string | null
  telefone?: string | null   // só dígitos, DDD + número (sem o 55)
  cpf?: string | null
  /** true = a ZapSign manda o e-mail de convite sozinha */
  enviarEmail?: boolean
}

export type SignatarioResposta = {
  nome: string
  email: string | null
  token: string | null
  signUrl: string | null
  status: string | null
}

export type DocumentoCriado = {
  token: string
  openId: number | null
  status: string
  signatarios: SignatarioResposta[]
}

function soDigitos(v: string | null | undefined): string {
  return (v ?? '').replace(/\D/g, '')
}

/**
 * Valida CPF por dígito verificador.
 *
 * A ZapSign recusa o documento INTEIRO com "forneça um CPF válido" quando
 * um signatário vem com CPF errado — um dígito trocado no cadastro derruba
 * o envio todo. Melhor mandar o signatário sem CPF (ele assina igual) e
 * avisar, do que não conseguir coletar nenhuma assinatura.
 */
export function cpfValido(v: string | null | undefined): boolean {
  const c = soDigitos(v)
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += Number(c[i]) * (10 - i)
  let d1 = (s * 10) % 11
  if (d1 === 10) d1 = 0
  if (d1 !== Number(c[9])) return false
  s = 0
  for (let i = 0; i < 10; i++) s += Number(c[i]) * (11 - i)
  let d2 = (s * 10) % 11
  if (d2 === 10) d2 = 0
  return d2 === Number(c[10])
}

async function chamar(caminho: string, init: RequestInit) {
  if (!zapsignConfigurado()) {
    throw new Error('ZAPSIGN_API_TOKEN não configurado na API.')
  }
  const resp = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(60_000),
  })
  const texto = await resp.text()
  let corpo: any = null
  try { corpo = texto ? JSON.parse(texto) : null } catch { /* resposta não-JSON */ }
  if (!resp.ok) {
    // A ZapSign devolve o motivo em formatos variados; preserva o que der.
    const motivo = corpo?.detail ?? corpo?.message ?? corpo?.error ?? texto.slice(0, 300)
    throw new Error(`ZapSign ${resp.status}: ${motivo || 'erro sem detalhe'}`)
  }
  return corpo
}

function mapearSignatarios(brutos: any[]): SignatarioResposta[] {
  return (brutos ?? []).map((s: any) => ({
    nome: s?.name ?? '',
    email: s?.email ?? null,
    token: s?.token ?? null,
    signUrl: s?.sign_url ?? null,
    status: s?.status ?? null,
  }))
}

/** Cria o documento e devolve os links de assinatura de cada signatário. */
export async function criarDocumento(opcoes: {
  nome: string
  base64Pdf: string
  signatarios: SignatarioEntrada[]
  externalId?: string
  pasta?: string
}): Promise<DocumentoCriado> {
  const body = {
    name: opcoes.nome.slice(0, 255),
    // Defensivo: se alguém passar o data-URI, tira o prefixo aqui.
    base64_pdf: opcoes.base64Pdf.replace(/^data:[^;]+;base64,/, ''),
    lang: 'pt-br',
    external_id: opcoes.externalId,
    folder_path: opcoes.pasta,
    signers: opcoes.signatarios.map(s => {
      const tel = soDigitos(s.telefone)
      return {
        name: s.nome,
        email: s.email || undefined,
        // Só manda telefone quando é número BR plausível (DDD + 8/9 dígitos).
        ...(tel.length === 10 || tel.length === 11
          ? { phone_country: '55', phone_number: tel }
          : {}),
        // Só manda CPF que passa no dígito verificador — ver cpfValido acima.
        ...(cpfValido(s.cpf) ? { cpf: soDigitos(s.cpf) } : {}),
        auth_mode: 'assinaturaTela',
        send_automatic_email: s.enviarEmail !== false && Boolean(s.email),
        send_automatic_whatsapp: false,
      }
    }),
  }

  const r = await chamar('/docs/', { method: 'POST', body: JSON.stringify(body) })
  return {
    token: r?.token,
    openId: r?.open_id ?? null,
    status: r?.status ?? 'pending',
    signatarios: mapearSignatarios(r?.signers),
  }
}

/**
 * Valida o token sem criar nada: faz uma leitura da lista de documentos.
 * Serve para separar "token errado" de "erro no envio" antes de mandar um
 * contrato de verdade para um cliente.
 */
export async function diagnosticar(): Promise<{ ok: boolean; detalhe: string }> {
  if (!zapsignConfigurado()) {
    return { ok: false, detalhe: 'ZAPSIGN_API_TOKEN não configurado na API.' }
  }
  try {
    const r = await chamar('/docs/?page=1', { method: 'GET' })
    const total = r?.count ?? (Array.isArray(r?.results) ? r.results.length : null)
    return {
      ok: true,
      detalhe: `Token válido. A conta respondeu${total != null ? ` (${total} documento(s) na conta)` : ''}.`,
    }
  } catch (e: any) {
    return { ok: false, detalhe: e?.message ?? String(e) }
  }
}

/** Relê o documento na ZapSign — usado para atualizar o status na tela. */
export async function consultarDocumento(docToken: string): Promise<DocumentoCriado & { excluido: boolean }> {
  const r = await chamar(`/docs/${docToken}/`, { method: 'GET' })
  return {
    token: r?.token ?? docToken,
    openId: r?.open_id ?? null,
    status: r?.status ?? 'pending',
    signatarios: mapearSignatarios(r?.signers),
    excluido: r?.deleted === true,
  }
}

/**
 * Cancela o documento: exclusão lógica na ZapSign (some da interface, os links
 * deixam de valer, continua consultável pela API). IRREVERSÍVEL.
 */
export async function excluirDocumento(docToken: string): Promise<void> {
  await chamar(`/docs/${docToken}/`, { method: 'DELETE' })
}

/**
 * Relê o documento na ZapSign e grava o estado em contrato_assinatura.
 * Usado pelo webhook e pelo botão "Atualizar status". Devolve null se o
 * token não é de um envio feito pelo AGO (a conta tem documentos avulsos).
 */
export async function sincronizarAssinatura(docToken: string) {
  const pool = getRawPool()
  const [rows]: any = await pool.execute(
    'SELECT id FROM contrato_assinatura WHERE doc_token = ? LIMIT 1', [docToken],
  )
  const reg = (rows as any[])[0]
  if (!reg) return null
  const doc = await consultarDocumento(docToken)
  const status = doc.excluido ? 'canceled' : doc.status
  await pool.execute(
    `UPDATE contrato_assinatura
        SET status = ?, signatarios = ?, cancelada = (cancelada OR ?), atualizado_em = NOW()
      WHERE id = ?`,
    [status, JSON.stringify(doc.signatarios), doc.excluido ? 1 : 0, reg.id],
  )
  return { status, signatarios: doc.signatarios, cancelada: doc.excluido }
}
