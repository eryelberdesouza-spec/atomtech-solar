// ═══════════════════════════════════════════════════════════════════
// monitorWhatsapp.ts — vigia da sessão do WhatsApp
// ═══════════════════════════════════════════════════════════════════
//
// POR QUE EXISTE: o WAHA **não se recupera sozinho** de uma sessão FAILED —
// confirmado na documentação, não há variável de auto-restart para esse
// estado. Sem vigia, a queda dura até alguém perceber. Foi assim que a queda
// de 05/10/2026 passou mais de um dia despercebida: o único monitor era uma
// tarefa que só roda enquanto o Claude Code está aberto num PC.
//
// O que ele faz, a cada ciclo:
//   1. Pergunta ao WAHA o status da sessão.
//   2. WORKING → se havia alerta aberto, marca como resolvido e segue.
//   3. Não-WORKING → tenta religar sozinho (`/start`) e confere de novo.
//   4. Se ainda assim não voltar, abre alerta no painel do AGO.
//
// NÃO avisa por WhatsApp, pela razão óbvia: quando o WhatsApp cai, é
// justamente o canal que não funciona. O alerta é dentro do sistema.
//
// Nota sobre re-pareamento: se o estado for SCAN_QR_CODE, religar não
// adianta — precisa de gente com o celular. O alerta diz isso com todas as
// letras, em vez de ficar tentando em silêncio.

import { getRawPool } from '../routers/trpc'

const WAHA_URL = (process.env.WAHA_URL ?? '').replace(/\/$/, '')
const WAHA_API_KEY = process.env.WAHA_API_KEY ?? ''
const WAHA_SESSION = process.env.WAHA_SESSION ?? 'default'
const TIPO = 'whatsapp_sessao'

// Empresa única por enquanto; o dia que houver mais de uma, vira consulta.
const EMPRESA_ID = Number(process.env.MONITOR_EMPRESA_ID ?? 1)
const INTERVALO_MS = Number(process.env.MONITOR_WHATSAPP_INTERVALO_MS ?? 5 * 60_000)

async function statusSessao(): Promise<string | null> {
  try {
    const r = await fetch(`${WAHA_URL}/api/sessions/${WAHA_SESSION}`, {
      headers: { 'X-Api-Key': WAHA_API_KEY },
      signal: AbortSignal.timeout(15_000),
    })
    if (!r.ok) return null
    const j: any = await r.json()
    return j?.status ?? null
  } catch {
    return null   // WAHA fora do ar também conta como problema
  }
}

async function tentarReligar(): Promise<void> {
  try {
    await fetch(`${WAHA_URL}/api/sessions/${WAHA_SESSION}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
      signal: AbortSignal.timeout(20_000),
    })
  } catch { /* o próximo ciclo tenta de novo */ }
}

async function alertaAberto(): Promise<number | null> {
  const pool = getRawPool()
  const [r]: any = await pool.execute(
    `SELECT id FROM sistema_alerta
      WHERE empresa_id = ? AND tipo = ? AND resolvido = 0
      ORDER BY id DESC LIMIT 1`,
    [EMPRESA_ID, TIPO],
  )
  return (r as any[])[0]?.id ?? null
}

async function abrirAlerta(status: string | null) {
  if (await alertaAberto()) return   // não empilha o mesmo problema

  const precisaQr = status === 'SCAN_QR_CODE'
  const descricao = precisaQr
    ? 'A sessão perdeu o pareamento e precisa de alguém com o celular da Atom: '
      + 'abra o painel do WAHA e escaneie o QR. Religar sozinho não resolve neste estado. '
      + 'Atenção: o aparelho "Ubuntu · Chrome" na lista de dispositivos conectados do '
      + 'WhatsApp é o bot — não pode ser removido.'
    : `A sessão do WhatsApp está em "${status ?? 'sem resposta'}" e não voltou sozinha. `
      + 'O bot não responde clientes e os alertas de OS não saem. '
      + 'Tente reiniciar a sessão pelo painel do WAHA.'

  const pool = getRawPool()
  await pool.execute(
    `INSERT INTO sistema_alerta (empresa_id, tipo, severidade, titulo, descricao)
     VALUES (?, ?, 'critico', ?, ?)`,
    [EMPRESA_ID, TIPO, '🔴 WhatsApp fora do ar — clientes sem resposta', descricao],
  )
  console.error('[monitorWhatsapp] ALERTA ABERTO — status:', status)
}

async function resolverAlerta() {
  const id = await alertaAberto()
  if (!id) return
  const pool = getRawPool()
  await pool.execute(
    `UPDATE sistema_alerta SET resolvido = 1, resolvido_em = NOW() WHERE id = ?`,
    [id],
  )
  console.log('[monitorWhatsapp] sessão voltou — alerta resolvido')
}

async function ciclo() {
  try {
    const status = await statusSessao()
    if (status === 'WORKING') return resolverAlerta()

    // SCAN_QR_CODE exige humano com o celular — religar não leva a lugar nenhum.
    if (status !== 'SCAN_QR_CODE') {
      await tentarReligar()
      await new Promise(r => setTimeout(r, 20_000))
      const depois = await statusSessao()
      if (depois === 'WORKING') return resolverAlerta()
      return abrirAlerta(depois)
    }
    return abrirAlerta(status)
  } catch (e) {
    console.error('[monitorWhatsapp] erro no ciclo:', e)
  }
}

export function iniciarMonitorWhatsapp() {
  if (!WAHA_URL || !WAHA_API_KEY) {
    console.log('[monitorWhatsapp] WAHA não configurado — vigia não iniciado')
    return
  }
  console.log(`[monitorWhatsapp] vigia ativo (a cada ${Math.round(INTERVALO_MS / 60000)} min)`)
  // Primeira checagem com folga, para não disputar com a subida do processo.
  setTimeout(() => { void ciclo() }, 60_000)
  setInterval(() => { void ciclo() }, INTERVALO_MS)
}
