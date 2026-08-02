# CLAUDE.md — Contexto do projeto atomtech-solar

Monorepo da Atom Tech (engenharia: energia solar, mobilidade elétrica, infraestrutura elétrica, CFTV). Este arquivo é o contexto compartilhado entre máquinas (casa/escritório) — mantenha-o atualizado ao final de sessões relevantes.

## Apps e deploy

| App | Função | Deploy |
|-----|--------|--------|
| apps/api | Backend tRPC + Drizzle ORM + MySQL | Railway — auto-deploy no push (https://atomtech-solar-production.up.railway.app) |
| apps/web | **AGO — Atom Gestão Operacional** (propostas, clientes, OS; ex-"SIGECO Propostas") | Vercel — https://atomtech-solar-web.vercel.app |
| apps/financeiro | **AGF — Atom Gestão Financeira** (ex-"SIGECO Gestão") | Vercel — https://financeiro-two-mu.vercel.app |
| apps/eletropostos | **API — Atom Projetos e Implantação** (implantação de eletropostos: padrões de entrada p/ estações de recarga VE, DIS-NOR-030 R07 Neoenergia BSB; ex-"AGE") | Vercel — https://api-atomtech.vercel.app (projeto Vercel `api-atomtech`) · Backend Supabase próprio (ref `slabpszvuabkwzmqrmkp`, sa-east-1), independente do apps/api. Deploy via CLI: `cd apps\eletropostos && npx vercel --prod --yes` |
| apps/relatorio-energia | Serviço interno (FastAPI/Python) que gera o relatório mensal de gestão de energia solar em `.pptx` — extração de fatura + GDASH (visão IA) + textos analíticos (IA). Usado só via tela "Relatório Energia" do AGO (`apps/web`), nunca exposto direto ao usuário. | Railway, mesmo projeto do apps/api (`satisfied-love`) — https://relatorio-energia-production.up.railway.app. Deploy via CLI (sem GitHub auto-deploy): `cd apps\relatorio-energia && railway up . --path-as-root --service relatorio-energia --detach` a partir da raiz do monorepo, ou `railway up apps\relatorio-energia --path-as-root --service relatorio-energia --detach` |
| n8n/ | Bot WhatsApp (docs/prompt; o workflow vive no n8n do Railway) | — |

> Rebranding 2026-07-10: SIGECO → AGO/AGF. Os nomes de pastas, URLs e tabelas NÃO mudaram — só a marca visível (janelas, PWA, PDFs, telas).

- Deploy Vercel SEMPRE via CLI: `cmd /c "cd apps\financeiro && npx vercel --prod --yes"` (o botão Redeploy do dashboard reusa build antigo).
- **CUIDADO (constatado 2026-07-17 no PC escritório)**: `apps/web/.vercel/project.json` aponta para o projeto Vercel errado ("web", alias web-seven-pi-60). O projeto de produção real é **"atomtech-solar-web"**, que faz auto-deploy do `git push origin main`. Para o AGO web, `git push` basta; conferir depois se o asset novo chegou em https://atomtech-solar-web.vercel.app.
- API: `git push origin main` basta.
- Migrations: endpoints GET `/run-migration-*` na API do Railway.

## Regras de desenvolvimento críticas
- Rules of Hooks: NUNCA chamar hook React depois de early return.
- Verificar online (browser) antes de reportar como pronto.
- Drizzle/React Query/tRPC: seguir os padrões já existentes nos routers.
- **Ao verificar uma saída (PDF, export, arquivo), reproduzir o pipeline DO USUÁRIO** — não um equivalente conveniente. Ver a lição abaixo, que custou 3 rodadas de correção errada.

## Relatório de Energia (AGO) — serviço Python interno desde 2026-08-02

Gera o relatório mensal de gestão de energia solar (`.pptx`) a partir da fatura de energia
(Neoenergia) + export do GDASH. Migrado nesta data do repositório separado
`atomtech-relatorio-energia` (agora histórico/arquivado) para dentro do monorepo, já
validado com dados reais da Margran antes da migração.

**Fluxo**: AGO (`apps/web/src/pages/relatorios/RelatorioEnergiaPage.tsx`) → proxy
autenticado em `apps/api` (`POST /relatorio-energia/gerar`, mesmo padrão de autenticação
manual do `/pdf/render`) → serviço Python `apps/relatorio-energia` (FastAPI), protegido por
header `X-Internal-Secret` (env var `INTERNAL_SHARED_SECRET`, igual nos dois serviços
Railway). O serviço Python nunca é chamado direto do browser e não guarda nada — é
stateless, só gera o `.pptx` e devolve.

- `extract_conta.py`: regex sobre o texto da fatura (`pdftotext -layout`). Testado só com
  Neoenergia; outra distribuidora exige ajustar o parser.
- `extract_gdash.py`: visão computacional (Claude) sobre o PDF do GDASH (é imagem, sem texto).
- `generate_narrative.py`: textos analíticos por IA — os campos têm limite de caracteres
  explícito no prompt porque preenchem caixas de tamanho fixo no template `.pptx` (achado
  real: sem limite, o texto vaza da caixa no PowerPoint; ver histórico do repo).
- **Fatura sempre atrasa um ciclo em relação ao GDASH mais recente** (GDASH fecha o mês
  corrente rápido; a fatura do mesmo mês sai ~2-4 semanas depois). Ao gerar relatório de um
  mês fechado, use o export do GDASH mais novo disponível (traz os 3 meses anteriores no
  histórico) em vez de esperar um export exatamente daquele mês.
- Variáveis de ambiente do serviço Python: `ANTHROPIC_API_KEY`, `INTERNAL_SHARED_SECRET`.
  Variáveis do `apps/api`: `RELATORIO_ENERGIA_URL`, `INTERNAL_SHARED_SECRET` (mesmo valor),
  `RELATORIO_ENERGIA_RESPONSAVEL_TECNICO`, `RELATORIO_ENERGIA_LOCAL_EMISSAO`.

**Cadastro do cliente e histórico (desde 2026-08-02)**: não existe mais `clientes.json`.
O seletor de cliente na tela usa o cadastro real do AGO (`trpc.cliente.list`); dados
técnicos específicos do relatório (potência kWp, quebra do nome na capa) ficam na tabela
`cliente_energia_solar` (1:1 com `cliente`, via router `relatorioEnergia.config`) — se um
cliente ainda não tem essa config, a tela mostra um formulário inline antes de liberar a
geração. Responsável técnico e local de emissão **não** ficam por cliente — são as env vars
acima, porque na prática são sempre os mesmos.

Cada `.pptx` gerado fica salvo em `relatorio_energia_gerado` (BLOB no MySQL, mesmo padrão de
`os_anexo`) com `UNIQUE(cliente_id, referencia_mes)` — **regenerar o mesmo cliente/mês
substitui** a linha anterior, não duplica. A tela mostra os últimos 12 meses por cliente,
com link de download direto (`GET /relatorio-energia/historico/:id/download`) pros meses já
gerados, sem precisar rodar o pipeline de novo.

## PDFs de proposta (AGO) — geração no servidor desde 2026-07-26

**Como funciona hoje**: o AGO monta o HTML da proposta no cliente e envia para `POST /pdf/render` na API; o Chrome headless (puppeteer-core) renderiza e devolve o PDF **vetorial** pronto, que o navegador só baixa (`PROP-<numero>.pdf`). Não passa mais pelo diálogo de impressão. Se a API falhar, o front cai sozinho no fluxo antigo de `window.print()`.

- `GET /pdf/health` → mostra o Chromium detectado no container (diagnóstico rápido).
- Chromium instalado no **`apps/api/Dockerfile` E no `apps/api/nixpacks.toml`** (não ficou claro qual builder o Railway usa; em produção resolveu para `/usr/bin/chromium-browser`).
- `apps/web/src/lib/gerarPdfBrowser.ts` (solar) e `gerarPdfServicoBrowser.ts` (serviço) exportam o builder de HTML com opção `{ autoPrint: false }` e sinalizam `window.__PDF_READY__` quando o cálculo de rodapé termina — é o que o servidor espera antes de chamar `page.pdf()`.
- `page.pdf()` precisa de `preferCSSPageSize: true` para respeitar o `@page { size: A4; margin: 0 }`.
- **Ressalva de segurança**: o endpoint exige Bearer token, mas usa a mesma validação do resto da API — que só decodifica o payload do JWT **sem verificar assinatura** (o código marca como stub de dev). Como agora existe um endpoint que renderiza HTML no servidor, vale endurecer isso. Mitigação atual: toda requisição de rede do Chrome é bloqueada fora das origens do próprio AGO/API.

**LIÇÃO (2026-07-26) — antes de investigar QUALQUER queixa de formatação de PDF, checar o `Producer` do arquivo:**
- `Producer: "Skia/PDF ..."` + operadores `showText` = PDF vetorial do Chrome, saudável.
- `Producer: "Microsoft: Print To PDF"` + `paintImageXObject` = **rasterizado**. O driver do Windows converte a página em tiles JPEG (um por glifo), sem fontes embutidas. As hastes finas de `l`/`I` viram pixels sólidos e parecem negrito. **Nenhuma mudança de CSS/`@font-face` afeta isso** — a fonte nunca chega ao arquivo. Foram 3 rodadas "corrigindo" fonte à toa porque eu validava com Chrome headless enquanto o usuário salvava pelo driver do Windows.
- Diagnóstico: `pdfjs-dist` → `getDocument().getMetadata()` (Producer) + `getOperatorList()` (imagem vs texto).

**Armadilhas de paginação do Chrome** (custaram várias iterações em 2026-07-18): cabeçalho/rodapé que repetem por página exigem `<table>` com `thead`/`tfoot` e a tabela **não pode ter height fixo** (mata a fragmentação); `break-after: page` é **ignorado em `<table>`** — tem que ficar num `<div>` wrapper.

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
