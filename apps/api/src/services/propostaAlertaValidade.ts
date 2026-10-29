// ═══════════════════════════════════════════════════════════════════
// propostaAlertaValidade.ts — WhatsApp ao responsável quando a proposta
// está para vencer (véspera e dia do vencimento)
// ═══════════════════════════════════════════════════════════════════
//
// Pedido do usuário em 2026-10-29: "muitas vezes perdemos os prazos". Proposta
// em rascunho/enviada vira 'expirada' sozinha quando data_validade passa
// (expirarPropostasVencidas, em proposta.router.ts), e o painel só avisa quem
// abre o AGO. Aqui o aviso vai ao celular de quem conduz a proposta.
//
// - Roda a cada 15 min; só envia a partir das 9h (horário de Brasília).
// - Uma linha em proposta_alerta_validade por (proposta, validade, tipo) —
//   a UNIQUE impede reenvio em restart/redeploy. Prorrogar a validade gera
//   alertas novos para a nova data.
// - Se o servidor ficar fora do ar às 9h, o alerta sai quando ele voltar
//   (ainda no mesmo dia). Não há recuperação de dia perdido: o alerta de
//   véspera de ontem não faz sentido hoje.
// - Respeita WHATSAPP_ALERTAS_ATIVO (via enviarTexto). Desligado, registra
//   'desativado' e não reenvia depois — mesmo comportamento dos alertas de OS.

import { getRawPool } from '../routers/trpc'
import { hojeISO } from '../lib/datas'
import { enviarTexto, resolverChatId, telefoneParaChatId, whatsappAtivo, whatsappConfigurado } from './whatsapp'

const INTERVALO_MS = 15 * 60_000
const HORA_ENVIO = 9
const URL_AGO = 'https://atomtech-solar-web.vercel.app'

let rodando = false

function horaBrasil(): number {
  const h = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false })
  return Number(h) % 24
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

function dataBR(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

// mysql2 entrega DATE como Date à meia-noite UTC (pool cru com TZ do processo
// pode dar meia-noite de Brasília = 03:00Z) — getters UTC servem para os dois.
function dateParaISO(d: unknown): string {
  if (d instanceof Date) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }
  return String(d).slice(0, 10)
}

type Linha = {
  id: number; empresa_id: number; numero: string; status: string
  data_validade: Date | string; responsavel_id: number
  titulo_servico: string | null; cliente_nome: string | null
  responsavel_nome: string | null; telefone: string | null
}

export function montarMensagem(p: Linha, tipo: 'vespera' | 'dia'): string {
  const validade = dataBR(dateParaISO(p.data_validade))
  const cabecalho = tipo === 'dia'
    ? '🚨 *Proposta vence HOJE*'
    : '⏰ *Proposta vence amanhã*'
  const linhas = [
    cabecalho,
    '',
    `*${p.numero}*${p.cliente_nome ? ` — ${p.cliente_nome}` : ''}`,
  ]
  if (p.titulo_servico) linhas.push(p.titulo_servico)
  linhas.push(`Validade: ${validade}${tipo === 'dia' ? ' (hoje)' : ' (amanhã)'}`)
  linhas.push(`Status: ${p.status === 'enviada' ? 'Enviada' : 'Rascunho'}`)
  linhas.push('')
  linhas.push(tipo === 'dia'
    ? 'Você é o responsável por esta proposta. Fale com o cliente hoje — a partir de amanhã ela expira no AGO.'
    : 'Você é o responsável por esta proposta. Fale com o cliente antes do vencimento.')
  linhas.push(`${URL_AGO}/propostas/${p.id}`)
  return linhas.join('\n')
}

async function registrar(
  p: Linha, tipo: 'vespera' | 'dia', mensagem: string,
  status: 'enviada' | 'falhou' | 'sem_telefone' | 'desativado', erro?: string,
) {
  await getRawPool().execute(
    `INSERT IGNORE INTO proposta_alerta_validade
       (empresa_id, proposta_id, data_validade, tipo, responsavel_id, mensagem, status, erro)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.empresa_id, p.id, dateParaISO(p.data_validade), tipo, p.responsavel_id, mensagem, status, erro ?? null],
  )
}

async function ciclo() {
  if (rodando) return
  if (horaBrasil() < HORA_ENVIO) return
  rodando = true
  try {
    const hoje = hojeISO()
    const amanha = somarDias(hoje, 1)
    const [rows]: any = await getRawPool().execute(
      `SELECT p.id, p.empresa_id, p.numero, p.status, p.data_validade, p.responsavel_id,
              p.titulo_servico, c.nome AS cliente_nome, u.nome AS responsavel_nome, u.telefone
         FROM proposta p
         LEFT JOIN cliente c ON c.id = p.cliente_id
         LEFT JOIN usuario u ON u.id = p.responsavel_id
        WHERE p.status IN ('rascunho','enviada')
          AND p.arquivada = 0 AND p.is_template = 0
          AND p.responsavel_id IS NOT NULL
          AND p.data_validade IN (?, ?)
          AND NOT EXISTS (
            SELECT 1 FROM proposta_alerta_validade a
             WHERE a.proposta_id = p.id AND a.data_validade = p.data_validade
               AND a.tipo = IF(p.data_validade = ?, 'dia', 'vespera'))`,
      [hoje, amanha, hoje],
    )

    for (const p of rows as Linha[]) {
      const tipo = dateParaISO(p.data_validade) === hoje ? 'dia' : 'vespera'
      const mensagem = montarMensagem(p, tipo)

      if (!whatsappAtivo()) { await registrar(p, tipo, mensagem, 'desativado'); continue }

      const chatId = telefoneParaChatId(p.telefone)
      if (!chatId) {
        await registrar(p, tipo, mensagem, 'sem_telefone', `${p.responsavel_nome ?? 'responsável'} sem telefone válido no cadastro`)
        continue
      }
      const real = await resolverChatId(chatId)
      if (!real) {
        await registrar(p, tipo, mensagem, 'sem_telefone', `${p.telefone} não tem WhatsApp`)
        continue
      }
      const r = await enviarTexto(real, mensagem)
      await registrar(p, tipo, mensagem, r.ok ? 'enviada' : 'falhou', r.erro)
      // Respiro entre envios: o WhatsApp penaliza rajada.
      await new Promise(res => setTimeout(res, 1500))
    }
    if ((rows as any[]).length) console.log(`[alertaValidade] ${(rows as any[]).length} alerta(s) processado(s)`)
  } catch (e) {
    // Tabela ausente (migração não rodada) cai aqui a cada ciclo — só loga.
    console.error('[alertaValidade] erro no ciclo:', e)
  } finally {
    rodando = false
  }
}

export function iniciarAlertaValidadeProposta() {
  if (!whatsappConfigurado()) {
    console.log('[alertaValidade] WAHA não configurado — alerta de vencimento não iniciado')
    return
  }
  console.log(`[alertaValidade] ativo (a cada ${INTERVALO_MS / 60000} min, envio a partir das ${HORA_ENVIO}h)`)
  setTimeout(() => { void ciclo() }, 90_000)
  setInterval(() => { void ciclo() }, INTERVALO_MS)
}
