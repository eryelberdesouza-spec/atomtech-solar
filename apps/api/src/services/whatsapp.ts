// ═══════════════════════════════════════════════════════════════════
// whatsapp.ts — envio de mensagens pelo WAHA (mesmo gateway do bot)
// ═══════════════════════════════════════════════════════════════════
//
// O bot de atendimento vive no n8n e usa este mesmo WAHA/número. Aqui a API
// só EMPURRA mensagem interna (alerta de OS para a equipe) — nunca lê, nunca
// responde cliente.
//
// CUIDADO (ver CLAUDE.md, seção do bot): toda mensagem enviada por este
// número volta pro n8n como `fromMe` no evento `message.any`. O workflow
// trata `fromMe` como "humano assumiu o atendimento" e PAUSA o bot naquele
// chat por 24h. Como aqui só mandamos para telefones da própria equipe, o
// efeito colateral seria pausar o bot num chat de colega — inofensivo para o
// cliente, mas o n8n também passa a tratar a resposta do colega como se fosse
// lead. Por isso o workflow ignora os números da equipe (nó "É número
// interno?" no n8n, desde 2026-10-06) — ao incluir alguém na equipe,
// acrescentar o telefone dele também nessa lista.

const WAHA_URL = process.env.WAHA_URL ?? ''
const WAHA_API_KEY = process.env.WAHA_API_KEY ?? ''
const WAHA_SESSION = process.env.WAHA_SESSION ?? 'default'
// Interruptor geral: sem ele ligado nada é enviado (só registrado no log).
const ATIVO = String(process.env.WHATSAPP_ALERTAS_ATIVO ?? '').toLowerCase() === 'true'

export function whatsappConfigurado(): boolean {
  return Boolean(WAHA_URL && WAHA_API_KEY)
}
export function whatsappAtivo(): boolean {
  return ATIVO && whatsappConfigurado()
}

/**
 * Normaliza telefone brasileiro para chatId do WhatsApp.
 * Aceita "(61) 98050-0301", "61980500301", "5561980500301".
 * Devolve null quando não dá para montar um número plausível — melhor não
 * enviar do que enviar para desconhecido.
 */
export function telefoneParaChatId(telefone: string | null | undefined): string | null {
  if (!telefone) return null
  let n = String(telefone).replace(/\D/g, '')
  if (!n) return null
  // Tira zeros de discagem e o +55 já presente
  if (n.startsWith('0')) n = n.replace(/^0+/, '')
  if (n.length === 10 || n.length === 11) n = '55' + n          // DDD + número
  if (!n.startsWith('55')) return null
  // 55 + DDD(2) + 8 ou 9 dígitos
  if (n.length < 12 || n.length > 13) return null
  return `${n}@c.us`
}

// Número BR pode estar registrado no WhatsApp SEM o nono dígito — em
// 2026-10-07 os 4 telefones da equipe estavam assim (556198050301, não
// 5561998050301). Mandar para o JID montado do cadastro não chega a ninguém;
// o WAHA diz qual é o JID real. Cache em memória: o JID de um número não muda.
const cacheChatId = new Map<string, string | null>()

/**
 * Devolve o chatId que o WhatsApp realmente usa para o número, ou null se o
 * número não tem WhatsApp. Se o WAHA não responder, devolve o chatId recebido
 * (melhor tentar do que perder o alerta).
 */
export async function resolverChatId(chatId: string): Promise<string | null> {
  if (cacheChatId.has(chatId)) return cacheChatId.get(chatId)!
  if (!whatsappConfigurado()) return chatId
  const phone = chatId.replace(/@.*$/, '')
  try {
    const url = `${WAHA_URL.replace(/\/$/, '')}/api/contacts/check-exists`
      + `?phone=${encodeURIComponent(phone)}&session=${encodeURIComponent(WAHA_SESSION)}`
    const resp = await fetch(url, {
      headers: { 'X-Api-Key': WAHA_API_KEY },
      signal: AbortSignal.timeout(10_000),
    })
    if (!resp.ok) return chatId
    const r: any = await resp.json()
    const real = r?.numberExists ? (r.chatId ?? chatId) : null
    cacheChatId.set(chatId, real)
    return real
  } catch {
    return chatId
  }
}

type EnvioResultado = { chatId: string; ok: boolean; erro?: string }

/**
 * Envia uma mensagem de texto. Nunca lança — devolve o resultado para quem
 * chamou decidir o que registrar. Alerta que falha não pode derrubar a
 * operação que o usuário estava fazendo na tela.
 */
export async function enviarTexto(chatId: string, texto: string): Promise<EnvioResultado> {
  if (!whatsappAtivo()) {
    return { chatId, ok: false, erro: 'alertas de WhatsApp desativados ou WAHA não configurado' }
  }
  try {
    const resp = await fetch(`${WAHA_URL.replace(/\/$/, '')}/api/sendText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
      body: JSON.stringify({ session: WAHA_SESSION, chatId, text: texto }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => '')
      return { chatId, ok: false, erro: `WAHA ${resp.status}: ${corpo.slice(0, 200)}` }
    }
    return { chatId, ok: true }
  } catch (e: any) {
    return { chatId, ok: false, erro: e?.message ?? String(e) }
  }
}

export async function enviarParaVarios(chatIds: string[], texto: string): Promise<EnvioResultado[]> {
  const unicos = [...new Set(chatIds)]
  const out: EnvioResultado[] = []
  // Em série e com respiro: o WhatsApp penaliza rajada de mensagens.
  for (const chatId of unicos) {
    out.push(await enviarTexto(chatId, texto))
    if (unicos.length > 1) await new Promise(r => setTimeout(r, 700))
  }
  return out
}
