// ═══════════════════════════════════════════════════════════════════
// datas.ts — "hoje" e "agora" no fuso do Brasil
// ═══════════════════════════════════════════════════════════════════
//
// O container roda em UTC. Isso causava DOIS defeitos diferentes:
//
// 1. EXIBIÇÃO — `toLocaleString('pt-BR')` sem `timeZone` formata no fuso do
//    processo, não no do Brasil. Relatório gerado às 14h saía carimbado 17h.
//    Resolvido pondo TZ=America/Sao_Paulo no serviço E passando `timeZone`
//    explícito nos documentos que vão para o cliente (cinto e suspensório:
//    se alguém mudar a variável, o documento continua certo).
//
// 2. DATA DE "HOJE" — `new Date().toISOString().slice(0,10)` devolve a data
//    em UTC, SEMPRE, independente de TZ. Entre 21h e meia-noite de Brasília
//    o UTC já virou o dia seguinte. Efeito silencioso: título lançado às 22h
//    nascia com emissão de amanhã, OS concluída às 22h ficava com conclusão
//    de amanhã, e "vence hoje" comparava contra a data errada.
//    `toISOString` não respeita TZ — por isso este helper existe.

const FUSO = 'America/Sao_Paulo'

/** Data de hoje no Brasil, em YYYY-MM-DD. Use no lugar de toISOString(). */
export function hojeISO(): string {
  // 'en-CA' formata como YYYY-MM-DD, que é exatamente o formato do banco.
  return new Date().toLocaleDateString('en-CA', { timeZone: FUSO })
}

/** Data (Date ou string) convertida para YYYY-MM-DD no fuso do Brasil. */
export function paraDataISO(d: Date | string | null | undefined): string | null {
  if (!d) return null
  const data = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(data.getTime())) return null
  return data.toLocaleDateString('en-CA', { timeZone: FUSO })
}

/** "07/10/2026 14:43" — para carimbar documento gerado. */
export function agoraBR(): string {
  return new Date().toLocaleString('pt-BR', {
    timeZone: FUSO,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Formata data/hora no fuso do Brasil, independente do fuso do servidor. */
export function dataHoraBR(d: Date | null | undefined): string {
  if (!d) return '—'
  return d.toLocaleString('pt-BR', {
    timeZone: FUSO,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Formata só a data no fuso do Brasil. */
export function dataBR(d: Date | null | undefined): string {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { timeZone: FUSO })
}
