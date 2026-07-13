# CLAUDE.md — Contexto do projeto atomtech-solar

Monorepo da Atom Tech (engenharia: energia solar, mobilidade elétrica, infraestrutura elétrica, CFTV). Este arquivo é o contexto compartilhado entre máquinas (casa/escritório) — mantenha-o atualizado ao final de sessões relevantes.

## Apps e deploy

| App | Função | Deploy |
|-----|--------|--------|
| apps/api | Backend tRPC + Drizzle ORM + MySQL | Railway — auto-deploy no push (https://atomtech-solar-production.up.railway.app) |
| apps/web | **AGO — Atom Gestão Operacional** (propostas, clientes, OS; ex-"SIGECO Propostas") | Vercel — https://atomtech-solar-web.vercel.app |
| apps/financeiro | **AGF — Atom Gestão Financeira** (ex-"SIGECO Gestão") | Vercel — https://financeiro-two-mu.vercel.app |
| n8n/ | Bot WhatsApp (docs/prompt; o workflow vive no n8n do Railway) | — |

> Rebranding 2026-07-10: SIGECO → AGO/AGF. Os nomes de pastas, URLs e tabelas NÃO mudaram — só a marca visível (janelas, PWA, PDFs, telas).

- Deploy Vercel SEMPRE via CLI: `cmd /c "cd apps\financeiro && npx vercel --prod --yes"` (o botão Redeploy do dashboard reusa build antigo).
- API: `git push origin main` basta.
- Migrations: endpoints GET `/run-migration-*` na API do Railway.

## Regras de desenvolvimento críticas
- Rules of Hooks: NUNCA chamar hook React depois de early return.
- Verificar online (browser) antes de reportar como pronto.
- Drizzle/React Query/tRPC: seguir os padrões já existentes nos routers.

## Bot WhatsApp (Fases 1 e 2 COMPLETAS — em produção desde 06-07/07/2026)

**Infra** (projeto Railway `thriving-youthfulness`, d562f4ed-2cd6-44bf-9826-ad75985cf7e2):
- n8n: https://n8n-production-78aab.up.railway.app — workflow "AtomTech — Atendimento WhatsApp" (id 25veqbanGSjjhYVR, ~35 nodes, ATIVO)
- WAHA (gateway WhatsApp, engine NOWEB): https://courteous-celebration-production-e9ef.up.railway.app — API key e senhas nas variáveis Railway do serviço `courteous-celebration` (ler via `railway variables --service courteous-celebration`)
- Postgres + Redis no mesmo projeto. Redis guarda: `hist:{chatId}` (memória de conversa 24h, últimas 20 msgs), `pause:{chatId}` (handoff), `bot_sent:{msgId}` (dedup de eco)
- Sessão WhatsApp "default" = número fixo Atom Tech 556139781738; webhook evento `message.any` → n8n `/webhook/whatsapp`

**Fluxo**: lead novo → M1 com menu de setores (1 Comercial, 2 Financeiro, 3 Suporte Técnico, 4 Eletropostos→contatos Move 0800 444 1044, 5 Outro; "0" volta ao menu) → IA (Claude Haiku via credencial anthropicApi, system prompt em `n8n/system-prompt-atendimento.md`) conduz. Leads registrados em Google Sheets "AtomTech — Leads WhatsApp" via Service Account (credencial googleApi, sem expiração).

**Marcadores da IA** (interceptados, invisíveis ao cliente): `[LEAD_QUENTE] Serviço|Nome|CEP|Imóvel|Consumo|Prazo` → alerta ao Eryelber (556198050301@c.us); `[HANDOFF] Setor|Assunto` → pausa bot 24h + alerta; handoff Financeiro TAMBÉM alerta a BeeFinance (parceira financeira, 554797643403@c.us) — handoffs de Financeiro/Suporte exigem menu de confirmação do cliente antes.

**Regras operacionais**:
- Mensagens automáticas do WhatsApp Business (ausência/saudação) DESLIGADAS (são fromMe → pausam o bot).
- WhatsApp Web coexiste com o bot (validado 08/07). Responder cliente manualmente = pausa o bot 24h naquele chat; `#ativa` reativa.
- Se a sessão cair (`FAILED`): PRIMEIRO tentar só `POST /api/sessions/default/start` (sem logout — logout apaga as credenciais e força re-pareamento; um restart simples às vezes reconecta sozinho). Se ficar em `SCAN_QR_CODE` ou seguir `FAILED`: re-parear — logout → start → `GET /api/default/auth/qr?format=image` (header X-Api-Key) → abrir PNG e escanear.
- Incidente 2026-07-13: sessão estava `FAILED` desde ~09/07 e ninguém percebeu por 4 dias (clientes sem resposta). Resolvido com re-pareamento no escritório. Mitigação: tarefa agendada `monitor-waha-bot-whatsapp` no Claude Code do PC do escritório checa a sessão a cada 2h (enquanto o app estiver aberto), tenta restart automático e alerta se precisar de QR.

**Armadilhas conhecidas (n8n/WAHA)**:
- n8n é draft/publish: após PATCH via REST, fazer deactivate+activate para produção atualizar.
- IF node v1: operação é `equal` (não `equals`).
- HTTP nodes de sendText: usar bodyParameters (jsonBody manual quebra com `\n`).
- Todo node que envia sendText deve encadear Redis SET `bot_sent:{key.id}` (senão o eco pausa o chat).
- Números BR podem não ter o nono dígito no WhatsApp — resolver via `/api/contacts/check-exists`. Contatos podem chegar como `@lid`; número real em `payload._data.key.remoteJidAlt`.

## AGF — notas técnicas importantes

- **mysql2 devolve colunas DATE como objeto `Date`, não string** (mesmo com drizzle `date()` sem `mode` explícito). `String(dateObj).slice(0,10)` corrompe o valor → vira "Invalid Date" no front. Usar sempre `fmtDateISO()` (helper em `fin.router.ts`) ou, no front, o helper `fmtData()` de `lib/utils.ts` (aceita string OU Date). Corrigido em 2026-07-13 em `pessoa.detalhe`, `projeto.byId`, `titulo.byId` — mas o padrão pode se repetir em código novo, ficar atento.
- **Acesso ao MySQL de produção fora do Railway/app**: projeto Railway `satisfied-love` (id 461fba09-4deb-473b-a3d3-215cee0cf991), serviço `MySQL`. Variáveis via `railway variables --service MySQL --kv` (precisa `railway link` nesse projeto antes). Para conectar de fora (script Node local), usar o proxy público: host `RAILWAY_TCP_PROXY_DOMAIN`, porta `RAILWAY_TCP_PROXY_PORT` (não o host interno `mysql.railway.internal`, que só funciona dentro da rede Railway).
- **DRE (`fin.dre.get`)**: soma `fin_titulo` agrupado por `fin_plano_contas.tipo`. Tipos: `RECEITA`, `DESPESA`, `FINANCEIRO` (ex.: juros, tarifas — entra no "resultado" mas separado da receita bruta), e desde 2026-07-13 **`TRANSFERENCIA`** (transferência entre contas próprias, ex. Inter↔Sicoob, e resgate de CDB/RDC — fica **fora** do resultado do DRE, mas continua contando no saldo de caixa normalmente porque `fin_parcela` não filtra por tipo de plano). O plano "Transferência de Recursos" (id 44) é TRANSFERENCIA; "Investimentos" (id 35) é FINANCEIRO e é onde resgates/aplicações de CDB/RDC devem cair.
- **Import de OFX (`ofxParser.ts` → `sugerirCategoria`)**: as strings sugeridas precisam bater EXATAMENTE com o nome de um plano de contas já cadastrado (o match em `ExtratoPage.tsx` é fuzzy mas frágil) — por isso resgate/aplicação/CDB/RDC sugerem literalmente "Investimentos", e transferência (inclusive "mesma titularidade") sugere "Transferência de Recursos". Antes disso, ~R$100 mil em transferências e resgates estavam contando como receita comum no DRE (achado e corrigido em 2026-07-13, migração `/run-migration-fin-plano-transferencia`).

## Backlog priorizado
1. **Fase 3 bot**: integração com AGO/AGF (criar leads/OS via API tRPC)
2. Buffer de mensagens picadas (~8s, Redis) — hoje cada mensagem gera uma resposta
3. Transcrição de áudio (mensagens de voz caem com body vazio)
4. Chatwoot + WAHA (central de atendimento web) — plano B se coexistência com WhatsApp Web degradar
5. Limpeza: linhas de teste na planilha Leads (números `55619000000xx`); serviço `atomtech-solar` crashado no projeto Railway do bot (duplicado, remover)
6. AGF: P1–P14 (relatórios PDF, conciliação, mobile etc. — ver histórico)

## Contexto de máquina
- Memória local do Claude Code (PC casa): `C:\Users\usuario\.claude\projects\C--Projetos-atomtech-solar\memory\` — mais detalhada que este arquivo; este CLAUDE.md é o resumo portátil.
