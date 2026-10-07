// ═══════════════════════════════════════════════════════════════════
// osNotificacao.ts — alerta de alteração em OS para quem está envolvido
// ═══════════════════════════════════════════════════════════════════
//
// Destinatários (decisão do usuário em 2026-10-06): só quem está envolvido na
// OS — o técnico responsável e quem criou a OS. Quem fez a alteração NÃO
// recebe (já sabe o que fez), senão vira eco.
//
// Gatilhos: status, foto/anexo, marco concluído, agendamento e troca de
// técnico. Edição solta de texto não dispara — a equipe silenciaria o alerta.
//
// Regra de ouro: notificar é EFEITO COLATERAL. Nenhuma falha aqui pode
// derrubar a mutation que o usuário disparou na tela. Por isso tudo é
// try/catch e o envio não é aguardado pela resposta ao cliente.

import { getRawPool } from '../routers/trpc'
import { enviarParaVarios, telefoneParaChatId, whatsappAtivo, whatsappConfigurado } from './whatsapp'

export type EventoOs =
  | 'status'
  | 'anexo'
  | 'marco'
  | 'agendamento'
  | 'tecnico'

type Ctx = { usuarioId: number; usuarioNome: string; empresaId: number }

/** Monta a frase do alerta. Mantida curta: é WhatsApp, não e-mail. */
function montarMensagem(
  os: { numero: string; titulo: string | null; cliente: string | null },
  autor: string,
  evento: EventoOs,
  detalhe: string,
): string {
  const linhaOs = `*${os.numero}*${os.titulo ? ` — ${os.titulo}` : ''}`
  const linhaCliente = os.cliente ? `\n👤 ${os.cliente}` : ''
  const icone: Record<EventoOs, string> = {
    status: '🔄', anexo: '📷', marco: '✅', agendamento: '📅', tecnico: '👷',
  }
  return `${icone[evento]} *AGO — Ordem de Serviço*\n\n${linhaOs}${linhaCliente}\n\n${autor} ${detalhe}.`
}

/**
 * Resolve os telefones de quem deve ser avisado: técnico responsável e autor
 * da OS, menos quem fez a alteração. Só usuários ativos e com telefone.
 */
async function destinatarios(ordemServicoId: number, autorId: number) {
  const pool = getRawPool()
  const [rows]: any = await pool.execute(
    `SELECT DISTINCT u.id, u.nome, u.telefone
       FROM ordem_servico o
       JOIN usuario u
         ON u.id IN (o.tecnico_responsavel_id, o.criado_por)
        AND u.empresa_id = o.empresa_id
      WHERE o.id = ?
        AND u.ativo = 1
        AND u.id <> ?
        AND u.telefone IS NOT NULL
        AND u.telefone <> ''`,
    [ordemServicoId, autorId],
  )
  return rows as { id: number; nome: string; telefone: string }[]
}

async function dadosOs(ordemServicoId: number) {
  const pool = getRawPool()
  const [rows]: any = await pool.execute(
    `SELECT o.numero, o.titulo, c.nome AS cliente
       FROM ordem_servico o
       LEFT JOIN cliente c ON c.id = o.cliente_id
      WHERE o.id = ? LIMIT 1`,
    [ordemServicoId],
  )
  return rows[0] as { numero: string; titulo: string | null; cliente: string | null } | undefined
}

async function registrar(
  ordemServicoId: number, empresaId: number, evento: EventoOs, mensagem: string,
  dest: any[], status: string, erro: string | null, autorId: number,
) {
  try {
    const pool = getRawPool()
    await pool.execute(
      `INSERT INTO os_notificacao
         (ordem_servico_id, empresa_id, evento, mensagem, destinatarios, status, erro, criado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ordemServicoId, empresaId, evento, mensagem, JSON.stringify(dest), status, erro, autorId],
    )
  } catch (e) {
    console.error('[osNotificacao] falha ao gravar log:', e)
  }
}

/**
 * Dispara o alerta. NÃO aguardar esta promise na mutation — chame sem await
 * (ou com .catch) para o usuário não esperar o WhatsApp responder.
 */
export async function notificarOs(
  ctx: Ctx,
  ordemServicoId: number,
  evento: EventoOs,
  detalhe: string,
): Promise<void> {
  try {
    const os = await dadosOs(ordemServicoId)
    if (!os) return

    const pessoas = await destinatarios(ordemServicoId, ctx.usuarioId)
    // O nome vem do JWT e pode chegar vazio — sem ele a frase ficaria "  alterou
    // o status". Busca no banco só nesse caso.
    let autor = (ctx.usuarioNome ?? '').trim()
    if (!autor) {
      const pool = getRawPool()
      const [r]: any = await pool.execute('SELECT nome FROM usuario WHERE id = ? LIMIT 1', [ctx.usuarioId])
      autor = r[0]?.nome ?? 'Alguém'
    }
    const mensagem = montarMensagem(os, autor, evento, detalhe)

    if (!pessoas.length) {
      await registrar(ordemServicoId, ctx.empresaId, evento, mensagem, [], 'sem_destinatario', null, ctx.usuarioId)
      return
    }

    const alvos = pessoas
      .map(p => ({ ...p, chatId: telefoneParaChatId(p.telefone) }))
      .filter(p => p.chatId)

    if (!whatsappAtivo()) {
      // Sem envio, mas o log mostra exatamente o que teria sido mandado —
      // é assim que se valida a configuração antes de ligar de verdade.
      await registrar(
        ordemServicoId, ctx.empresaId, evento, mensagem,
        alvos.map(a => ({ nome: a.nome, chatId: a.chatId })),
        'desativado',
        whatsappConfigurado() ? 'WHATSAPP_ALERTAS_ATIVO != true' : 'WAHA_URL/WAHA_API_KEY ausentes',
        ctx.usuarioId,
      )
      return
    }

    const resultados = await enviarParaVarios(alvos.map(a => a.chatId!), mensagem)
    const falhas = resultados.filter(r => !r.ok)
    await registrar(
      ordemServicoId, ctx.empresaId, evento, mensagem,
      alvos.map(a => ({ nome: a.nome, chatId: a.chatId })),
      falhas.length === 0 ? 'enviada' : falhas.length === resultados.length ? 'falhou' : 'parcial',
      falhas.length ? falhas.map(f => `${f.chatId}: ${f.erro}`).join(' | ') : null,
      ctx.usuarioId,
    )
  } catch (e) {
    console.error('[osNotificacao] erro inesperado:', e)
  }
}

/** Açúcar: dispara sem bloquear quem chamou. */
export function notificarOsEmBackground(
  ctx: Ctx, ordemServicoId: number, evento: EventoOs, detalhe: string,
) {
  void notificarOs(ctx, ordemServicoId, evento, detalhe)
    .catch(e => console.error('[osNotificacao] background:', e))
}
