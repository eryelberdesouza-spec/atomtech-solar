// ═══════════════════════════════════════════════════════════════════
// Router — Ordens de Serviço (Módulo Operacional)
// REGRA: Todas as INSERT/UPDATE usam getRawPool() diretamente
//        (evita bugs do Drizzle v0.30 com colunas boolean/date)
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, getRawPool } from './trpc'

// Marcos padrão criados automaticamente em toda OS nova
const MARCOS_PADRAO = [
  'Vistoria técnica realizada',
  'Materiais entregues no local',
  'Instalação concluída',
  'Testes e comissionamento',
  'Entrega ao cliente',
]

// ─── Gera número da OS: OS-YYYY-MMXXX ───────────────────────────────
async function gerarNumeroOS(empresaId: number): Promise<string> {
  const pool = getRawPool()
  const now  = new Date()
  const year = now.getFullYear()
  const mm   = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `OS-${year}-${mm}`

  // Conta quantas OS existem no mesmo mês/ano para esta empresa
  const [rows]: any = await pool.execute(
    `SELECT COUNT(*) AS total FROM ordem_servico
     WHERE empresa_id = ? AND numero LIKE ?`,
    [empresaId, `${prefix}%`],
  )
  const seq = (Number((rows as any[])[0]?.total ?? 0) + 1).toString().padStart(3, '0')
  return `${prefix}${seq}`
}

// ─── Schemas ─────────────────────────────────────────────────────────

const criarInput = z.object({
  // Um dos dois é obrigatório: propostaId (OS de contrato) OU clienteId (OS avulsa —
  // pós-venda, visita técnica, manutenção etc., sem exigir contrato formalizado)
  propostaId:         z.number().int().positive().optional(),
  clienteId:          z.number().int().positive().optional(),
  titulo:             z.string().max(200).optional(),
  descricao:          z.string().optional(),
  tecnicoResponsavel: z.string().max(100).optional(),
  resumoServico:      z.string().optional(),           // orientação pro técnico em campo
  localizacao:        z.string().max(500).optional(),  // endereço/link/coordenadas do local
  dataPrevistaInicio: z.string().optional(), // ISO YYYY-MM-DD
  dataPrevistaFim:    z.string().optional(),
  temAgendamento:     z.boolean().default(true),
  observacoes:        z.string().optional(),
  // Agendamento inicial (apenas quando temAgendamento = true)
  agendamento: z.object({
    dataAgendada: z.string(), // YYYY-MM-DD
    horaInicio:   z.string().max(5).optional(),
    horaFim:      z.string().max(5).optional(),
    tipo:         z.enum(['vistoria','instalacao','manutencao','revisao','entrega']).default('vistoria'),
    tecnico:      z.string().max(100).optional(),
    endereco:     z.string().optional(),
    observacoes:  z.string().optional(),
  }).optional(),
})

const agendamentoInput = z.object({
  ordemServicoId: z.number().int().positive(),
  dataAgendada:   z.string(),
  horaInicio:     z.string().max(5).optional(),
  horaFim:        z.string().max(5).optional(),
  tipo:           z.enum(['vistoria','instalacao','manutencao','revisao','entrega']).default('instalacao'),
  tecnico:        z.string().max(100).optional(),
  endereco:       z.string().optional(),
  observacoes:    z.string().optional(),
})

const marcoUpdateInput = z.object({
  id:            z.number().int().positive(),
  concluido:     z.boolean().optional(),
  dataRealizada: z.string().optional(),
  responsavel:   z.string().max(100).optional(),
  observacoes:   z.string().optional(),
})

// ─── Router ──────────────────────────────────────────────────────────

export const osRouter = router({

  // ── Lista OS da empresa ─────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      status:    z.string().optional(),
      propostaId: z.number().int().positive().optional(),
      porPagina: z.number().int().min(1).max(200).default(50),
      pagina:    z.number().int().min(1).default(1),
    }).default({}))
    .query(async ({ ctx, input }) => {
      const pool = getRawPool()
      const offset = (input.pagina - 1) * input.porPagina

      let where = 'os.empresa_id = ?'
      const params: any[] = [ctx.usuario.empresaId]

      if (input.status) {
        where += ' AND os.status = ?'
        params.push(input.status)
      }
      if (input.propostaId) {
        where += ' AND os.proposta_id = ?'
        params.push(input.propostaId)
      }

      // LIMIT/OFFSET hardcoded na string — mysql2 pool.execute() não aceita ? para LIMIT
      const lim = Number(input.porPagina)
      const off = Number(offset)

      const [rows]: any = await pool.execute(
        `SELECT
           os.id, os.numero, os.status, os.titulo, os.origem,
           os.numero_contrato_externo AS numeroContratoExterno,
           os.tecnico_responsavel  AS tecnicoResponsavel,
           os.resumo_servico       AS resumoServico,
           os.localizacao,
           os.data_prevista_inicio AS dataPrevistaInicio,
           os.data_prevista_fim    AS dataPrevistaFim,
           os.data_inicio          AS dataInicio,
           os.data_conclusao       AS dataConclusao,
           os.tem_agendamento      AS temAgendamento,
           os.created_at           AS createdAt,
           os.proposta_id          AS propostaId,
           p.numero                AS propostaNome,
           p.tipo_proposta         AS tipoProposta,
           p.titulo_servico        AS tituloServico,
           c.nome                  AS clienteNome,
           (SELECT COUNT(*) FROM os_marco m1 WHERE m1.ordem_servico_id = os.id)                        AS totalMarcos,
           (SELECT COUNT(*) FROM os_marco m2 WHERE m2.ordem_servico_id = os.id AND m2.concluido = 1)   AS marcosFeitos,
           (SELECT COUNT(*) FROM os_agendamento ag WHERE ag.ordem_servico_id = os.id)                  AS totalAgendamentos
         FROM ordem_servico os
         LEFT JOIN proposta p ON p.id = os.proposta_id
         LEFT JOIN cliente  c ON c.id = COALESCE(p.cliente_id, os.cliente_id)
         WHERE ${where}
         ORDER BY os.created_at DESC
         LIMIT ${lim} OFFSET ${off}`,
        params,
      )

      const [countRows]: any = await pool.execute(
        `SELECT COUNT(*) AS total FROM ordem_servico os WHERE ${where}`,
        params,
      )
      const total = Number((countRows as any[])[0]?.total ?? 0)

      const osList = rows as any[]
      if (osList.length) {
        const ids = osList.map(o => o.id)
        const [etqRows]: any = await pool.execute(
          `SELECT link.ordem_servico_id AS osId, et.id, et.nome, et.cor
           FROM os_etiqueta_link link
           JOIN os_etiqueta et ON et.id = link.etiqueta_id
           WHERE link.ordem_servico_id IN (${ids.map(() => '?').join(',')})`,
          ids,
        )
        const porOs = new Map<number, any[]>()
        for (const e of etqRows as any[]) {
          if (!porOs.has(e.osId)) porOs.set(e.osId, [])
          porOs.get(e.osId)!.push({ id: e.id, nome: e.nome, cor: e.cor })
        }
        for (const o of osList) o.etiquetas = porOs.get(o.id) ?? []
      }

      return {
        data:     osList,
        total,
        pagina:   input.pagina,
        porPagina: input.porPagina,
      }
    }),

  // ── Detalhe de uma OS ───────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const pool = getRawPool()

      const [osRows]: any = await pool.execute(
        `SELECT
           os.id, os.numero, os.status, os.titulo, os.descricao,
           os.tecnico_responsavel  AS tecnicoResponsavel,
           os.resumo_servico       AS resumoServico,
           os.localizacao,
           os.data_prevista_inicio AS dataPrevistaInicio,
           os.data_prevista_fim    AS dataPrevistaFim,
           os.data_inicio          AS dataInicio,
           os.data_conclusao       AS dataConclusao,
           os.tem_agendamento      AS temAgendamento,
           os.observacoes,
           os.created_at           AS createdAt,
           os.updated_at           AS updatedAt,
           os.proposta_id          AS propostaId,
           p.numero                AS propostaNome,
           p.tipo_proposta         AS tipoProposta,
           p.titulo_servico        AS tituloServico,
           c.nome                  AS clienteNome,
           c.id                    AS clienteId,
           c.telefone              AS clienteTelefone,
           c.email                 AS clienteEmail,
           c.endereco              AS clienteEndereco
         FROM ordem_servico os
         LEFT JOIN proposta p ON p.id = os.proposta_id
         LEFT JOIN cliente  c ON c.id = COALESCE(p.cliente_id, os.cliente_id)
         WHERE os.id = ? AND os.empresa_id = ?
         LIMIT 1`,
        [input.id, ctx.usuario.empresaId],
      )

      const os = (osRows as any[])[0]
      if (!os) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ordem de serviço não encontrada' })

      // Marcos
      const [marcos]: any = await pool.execute(
        `SELECT id, titulo, descricao, ordem, data_prevista AS dataPrevista,
                data_realizada AS dataRealizada, concluido, responsavel, observacoes
         FROM os_marco WHERE ordem_servico_id = ? ORDER BY ordem ASC`,
        [input.id],
      )

      // Agendamentos
      const [agendamentos]: any = await pool.execute(
        `SELECT id, data_agendada AS dataAgendada, hora_inicio AS horaInicio,
                hora_fim AS horaFim, tipo, tecnico, endereco, observacoes, status, created_at AS createdAt
         FROM os_agendamento WHERE ordem_servico_id = ? ORDER BY data_agendada ASC`,
        [input.id],
      )

      // Notas do Diário de Campo
      const [notas]: any = await pool.execute(
        `SELECT id, texto, autor, created_at AS createdAt
         FROM os_nota WHERE ordem_servico_id = ? ORDER BY created_at ASC`,
        [input.id],
      )

      return {
        ...os,
        temAgendamento: Number(os.temAgendamento) === 1,
        marcos:         marcos as any[],
        agendamentos:   agendamentos as any[],
        notas:          notas as any[],
      }
    }),

  // ── Criar OS ────────────────────────────────────────────────────
  criar: protectedProcedure
    .input(criarInput)
    .mutation(async ({ ctx, input }) => {
      const pool  = getRawPool()
      const empId = ctx.usuario.empresaId

      if (!input.propostaId && !input.clienteId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Informe a proposta ou o cliente da OS.' })
      }

      const isAvulsa = !input.propostaId

      if (input.propostaId) {
        // OS de contrato: exige proposta aceita e formalizada (fluxo original)
        const [propRows]: any = await pool.execute(
          `SELECT id, status, contrato_formalizado, cliente_id
           FROM proposta WHERE id = ? AND empresa_id = ? LIMIT 1`,
          [input.propostaId, empId],
        )
        const prop = (propRows as any[])[0]
        if (!prop) throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposta não encontrada' })
        if (prop.status !== 'aceita') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Só é possível criar OS para propostas aceitas.' })
        if (Number(prop.contrato_formalizado) !== 1) throw new TRPCError({ code: 'BAD_REQUEST', message: 'O contrato ainda não foi formalizado.' })
      } else {
        // OS avulsa: pós-venda, visita técnica, manutenção — vínculo direto ao cliente,
        // sem exigir contrato (reabrir OS antiga para um retorno seria problemático)
        const [cliRows]: any = await pool.execute(
          `SELECT id FROM cliente WHERE id = ? AND empresa_id = ? LIMIT 1`,
          [input.clienteId ?? null, empId],
        )
        if (!(cliRows as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' })
      }

      // Múltiplas OS por proposta são permitidas (projetos em etapas)

      const numero = await gerarNumeroOS(empId)

      await pool.execute(
        `INSERT INTO ordem_servico
           (empresa_id, proposta_id, cliente_id, origem, numero, status, titulo, descricao,
            tecnico_responsavel, resumo_servico, localizacao,
            data_prevista_inicio, data_prevista_fim,
            tem_agendamento, observacoes)
         VALUES (?, ?, ?, ?, ?, 'aberta', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          empId,
          input.propostaId ?? null,
          isAvulsa ? (input.clienteId ?? null) : null,
          isAvulsa ? 'avulsa' : 'plataforma',
          numero,
          input.titulo ?? null,
          input.descricao ?? null,
          input.tecnicoResponsavel ?? null,
          input.resumoServico ?? null,
          input.localizacao ?? null,
          input.dataPrevistaInicio ?? null,
          input.dataPrevistaFim ?? null,
          input.temAgendamento ? 1 : 0,
          input.observacoes ?? null,
        ],
      )

      // Recupera ID inserido
      const [idRows]: any = await pool.execute(
        `SELECT id FROM ordem_servico WHERE numero = ? LIMIT 1`,
        [numero],
      )
      const osId = (idRows as any[])[0]?.id
      if (!osId) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar OS' })

      // Marcos padrão (etapas de instalação) só fazem sentido na OS de contrato —
      // na avulsa (visita técnica, pós-venda) o usuário adiciona as etapas que precisar
      if (!isAvulsa) {
        for (let i = 0; i < MARCOS_PADRAO.length; i++) {
          await pool.execute(
            `INSERT INTO os_marco (ordem_servico_id, titulo, ordem) VALUES (?, ?, ?)`,
            [osId, MARCOS_PADRAO[i], i],
          )
        }
      }

      // Cria agendamento inicial se fornecido
      if (input.temAgendamento && input.agendamento) {
        const ag = input.agendamento
        await pool.execute(
          `INSERT INTO os_agendamento
             (ordem_servico_id, empresa_id, data_agendada, hora_inicio, hora_fim,
              tipo, tecnico, endereco, observacoes, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'agendado')`,
          [
            osId, empId,
            ag.dataAgendada,
            ag.horaInicio ?? null,
            ag.horaFim    ?? null,
            ag.tipo,
            ag.tecnico    ?? null,
            ag.endereco   ?? null,
            ag.observacoes ?? null,
          ],
        )
      }

      return { id: osId, numero }
    }),

  // ── Atualizar dados da OS ────────────────────────────────────────
  // Update PARCIAL: só altera os campos presentes no input (campo omitido = não mexe;
  // string vazia = limpa o campo). Permite edições pontuais — ex.: só o resumo do
  // serviço — sem apagar os demais campos da OS.
  update: protectedProcedure
    .input(z.object({
      id:                 z.number().int().positive(),
      titulo:             z.string().max(200).optional(),
      descricao:          z.string().optional(),
      tecnicoResponsavel: z.string().max(100).optional(),
      resumoServico:      z.string().optional(),
      localizacao:        z.string().max(500).optional(),
      dataPrevistaInicio: z.string().optional(),
      dataPrevistaFim:    z.string().optional(),
      dataInicio:         z.string().optional(),
      dataConclusao:      z.string().optional(),
      observacoes:        z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const pool = getRawPool()
      const { id, ...fields } = input

      // Verifica propriedade
      const [check]: any = await pool.execute(
        `SELECT id FROM ordem_servico WHERE id = ? AND empresa_id = ? LIMIT 1`,
        [id, ctx.usuario.empresaId],
      )
      if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'OS não encontrada' })

      const colunas: Record<string, string> = {
        titulo:             'titulo',
        descricao:          'descricao',
        tecnicoResponsavel: 'tecnico_responsavel',
        resumoServico:      'resumo_servico',
        localizacao:        'localizacao',
        dataPrevistaInicio: 'data_prevista_inicio',
        dataPrevistaFim:    'data_prevista_fim',
        dataInicio:         'data_inicio',
        dataConclusao:      'data_conclusao',
        observacoes:        'observacoes',
      }

      const sets: string[] = []
      const params: any[] = []
      for (const [campo, coluna] of Object.entries(colunas)) {
        const valor = (fields as any)[campo]
        if (valor !== undefined) {
          sets.push(`${coluna} = ?`)
          params.push(valor === '' ? null : valor)
        }
      }
      if (sets.length === 0) return { ok: true }

      await pool.execute(
        `UPDATE ordem_servico SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = ? AND empresa_id = ?`,
        [...params, id, ctx.usuario.empresaId],
      )
      return { ok: true }
    }),

  // ── Atualizar status da OS ───────────────────────────────────────
  updateStatus: protectedProcedure
    .input(z.object({
      id:     z.number().int().positive(),
      status: z.enum(['aberta','em_execucao','pendencia','concluida','cancelada']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.status === 'cancelada' && ctx.usuario.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem cancelar uma OS.' })
      }

      const pool = getRawPool()

      const [check]: any = await pool.execute(
        `SELECT id, status FROM ordem_servico WHERE id = ? AND empresa_id = ? LIMIT 1`,
        [input.id, ctx.usuario.empresaId],
      )
      if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'OS não encontrada' })

      const hoje = new Date().toISOString().slice(0, 10)
      let extra = ''
      const extraParams: any[] = []

      if (input.status === 'em_execucao') {
        extra = ', data_inicio = ?'
        extraParams.push(hoje)
      } else if (input.status === 'concluida') {
        extra = ', data_conclusao = ?'
        extraParams.push(hoje)
      }

      await pool.execute(
        `UPDATE ordem_servico SET status = ?, updated_at = NOW()${extra}
         WHERE id = ? AND empresa_id = ?`,
        [input.status, ...extraParams, input.id, ctx.usuario.empresaId],
      )

      // ── Ao concluir: verifica recebimentos pendentes e gera alerta financeiro ──
      if (input.status === 'concluida') {
        // Se a OS veio de um plano de manutenção, reagenda: hoje + periodicidade
        try {
          const [planoRows]: any = await pool.execute(
            `SELECT manutencao_plano_id AS planoId FROM ordem_servico WHERE id = ? LIMIT 1`,
            [input.id],
          )
          const planoId = (planoRows as any[])[0]?.planoId
          if (planoId) {
            await pool.execute(
              `UPDATE os_manutencao_plano
               SET proxima_data = DATE_ADD(CURDATE(), INTERVAL periodicidade_meses MONTH),
                   updated_at = NOW()
               WHERE id = ? AND empresa_id = ?`,
              [planoId, ctx.usuario.empresaId],
            )
          }
        } catch (recalcErr) {
          console.error('Erro ao reagendar plano de manutenção:', recalcErr)
        }

        try {
          // Busca proposta_id e dados da OS
          const [osInfo]: any = await pool.execute(
            `SELECT os.proposta_id, os.numero AS os_numero, c.nome AS cliente_nome
             FROM ordem_servico os
             LEFT JOIN proposta p ON p.id = os.proposta_id
             LEFT JOIN cliente c ON c.id = p.cliente_id
             WHERE os.id = ? LIMIT 1`,
            [input.id],
          )
          const os = (osInfo as any[])[0]

          if (os?.proposta_id) {
            // Verifica se há parcelas ABERTAS em títulos RECEBER vinculados à proposta
            const [pendentes]: any = await pool.execute(
              `SELECT SUM(fp.valor) AS total_pendente, COUNT(*) AS qtd
               FROM fin_parcela fp
               JOIN fin_titulo ft ON ft.id = fp.titulo_id
               WHERE ft.proposta_id = ? AND ft.tipo = 'RECEBER'
                 AND fp.status = 'ABERTA' AND ft.empresa_id = ?`,
              [os.proposta_id, ctx.usuario.empresaId],
            )
            const totalPendente = Number((pendentes as any[])[0]?.total_pendente ?? 0)
            const qtd = Number((pendentes as any[])[0]?.qtd ?? 0)

            if (totalPendente > 0) {
              // Cria alerta (IGNORE se já existe para esta OS)
              await pool.execute(
                `INSERT IGNORE INTO fin_alerta
                   (empresa_id, tipo, titulo, descricao, proposta_id, os_id, os_numero, cliente_nome, valor_pendente)
                 VALUES (?, 'os_concluida_receber', ?, ?, ?, ?, ?, ?, ?)`,
                [
                  ctx.usuario.empresaId,
                  `OS concluída — cobrança pendente: ${os.cliente_nome ?? 'Cliente'}`,
                  `A OS ${os.os_numero} foi concluída. Há ${qtd} parcela(s) a receber no total de R$ ${totalPendente.toFixed(2).replace('.', ',')} ainda em aberto.`,
                  os.proposta_id,
                  input.id,
                  os.os_numero,
                  os.cliente_nome ?? null,
                  totalPendente.toFixed(2),
                ],
              )
            }
          }
        } catch (alertErr) {
          // Não bloqueia a conclusão da OS em caso de erro no alerta
          console.error('Erro ao criar alerta financeiro:', alertErr)
        }
      }

      return { ok: true }
    }),

  // ── Marcos ──────────────────────────────────────────────────────
  marco: router({

    // Atualizar marco (marcar como concluído, etc.)
    update: protectedProcedure
      .input(marcoUpdateInput)
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()

        // Verifica que o marco pertence a uma OS da empresa
        const [check]: any = await pool.execute(
          `SELECT m.id FROM os_marco m
           JOIN ordem_servico os ON os.id = m.ordem_servico_id
           WHERE m.id = ? AND os.empresa_id = ? LIMIT 1`,
          [input.id, ctx.usuario.empresaId],
        )
        if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Marco não encontrado' })

        const hoje = new Date().toISOString().slice(0, 10)
        await pool.execute(
          `UPDATE os_marco SET
             concluido = ?, data_realizada = ?, responsavel = ?, observacoes = ?
           WHERE id = ?`,
          [
            input.concluido ? 1 : 0,
            input.dataRealizada ?? (input.concluido ? hoje : null),
            input.responsavel   ?? null,
            input.observacoes   ?? null,
            input.id,
          ],
        )
        return { ok: true }
      }),

    // Adicionar marco extra
    criar: protectedProcedure
      .input(z.object({
        ordemServicoId: z.number().int().positive(),
        titulo:         z.string().max(200),
        descricao:      z.string().optional(),
        dataPrevista:   z.string().optional(),
        responsavel:    z.string().max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()

        const [check]: any = await pool.execute(
          `SELECT id FROM ordem_servico WHERE id = ? AND empresa_id = ? LIMIT 1`,
          [input.ordemServicoId, ctx.usuario.empresaId],
        )
        if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'OS não encontrada' })

        // Próxima ordem
        const [ordRows]: any = await pool.execute(
          `SELECT COALESCE(MAX(ordem), -1) AS maxOrdem FROM os_marco WHERE ordem_servico_id = ?`,
          [input.ordemServicoId],
        )
        const proxOrdem = Number((ordRows as any[])[0]?.maxOrdem ?? -1) + 1

        await pool.execute(
          `INSERT INTO os_marco (ordem_servico_id, titulo, descricao, ordem, data_prevista, responsavel)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            input.ordemServicoId,
            input.titulo,
            input.descricao   ?? null,
            proxOrdem,
            input.dataPrevista ?? null,
            input.responsavel  ?? null,
          ],
        )
        return { ok: true }
      }),
  }),

  // ── Agendamentos ────────────────────────────────────────────────
  agendamento: router({

    // Criar novo agendamento
    criar: protectedProcedure
      .input(agendamentoInput)
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()

        const [check]: any = await pool.execute(
          `SELECT id FROM ordem_servico WHERE id = ? AND empresa_id = ? LIMIT 1`,
          [input.ordemServicoId, ctx.usuario.empresaId],
        )
        if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'OS não encontrada' })

        await pool.execute(
          `INSERT INTO os_agendamento
             (ordem_servico_id, empresa_id, data_agendada, hora_inicio, hora_fim,
              tipo, tecnico, endereco, observacoes, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'agendado')`,
          [
            input.ordemServicoId,
            ctx.usuario.empresaId,
            input.dataAgendada,
            input.horaInicio  ?? null,
            input.horaFim     ?? null,
            input.tipo,
            input.tecnico     ?? null,
            input.endereco    ?? null,
            input.observacoes ?? null,
          ],
        )
        return { ok: true }
      }),

    // Atualizar status do agendamento
    updateStatus: protectedProcedure
      .input(z.object({
        id:     z.number().int().positive(),
        status: z.enum(['agendado','confirmado','realizado','cancelado']),
      }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()

        const [check]: any = await pool.execute(
          `SELECT a.id FROM os_agendamento a
           JOIN ordem_servico os ON os.id = a.ordem_servico_id
           WHERE a.id = ? AND os.empresa_id = ? LIMIT 1`,
          [input.id, ctx.usuario.empresaId],
        )
        if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' })

        await pool.execute(
          `UPDATE os_agendamento SET status = ? WHERE id = ?`,
          [input.status, input.id],
        )
        return { ok: true }
      }),

    // Excluir agendamento
    deletar: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()

        const [check]: any = await pool.execute(
          `SELECT a.id FROM os_agendamento a
           JOIN ordem_servico os ON os.id = a.ordem_servico_id
           WHERE a.id = ? AND os.empresa_id = ? LIMIT 1`,
          [input.id, ctx.usuario.empresaId],
        )
        if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' })

        await pool.execute(`DELETE FROM os_agendamento WHERE id = ?`, [input.id])
        return { ok: true }
      }),
  }),

  // ── Diário de Campo (Notas) ──────────────────────────────────────
  nota: router({

    criar: protectedProcedure
      .input(z.object({
        ordemServicoId: z.number().int().positive(),
        texto:          z.string().min(1).max(2000),
        autor:          z.string().max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()

        const [check]: any = await pool.execute(
          `SELECT id FROM ordem_servico WHERE id = ? AND empresa_id = ? LIMIT 1`,
          [input.ordemServicoId, ctx.usuario.empresaId],
        )
        if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'OS não encontrada' })

        await pool.execute(
          `INSERT INTO os_nota (ordem_servico_id, empresa_id, texto, autor) VALUES (?, ?, ?, ?)`,
          [input.ordemServicoId, ctx.usuario.empresaId, input.texto, input.autor ?? null],
        )
        return { ok: true }
      }),

    deletar: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()

        const [check]: any = await pool.execute(
          `SELECT n.id FROM os_nota n
           JOIN ordem_servico os ON os.id = n.ordem_servico_id
           WHERE n.id = ? AND os.empresa_id = ? LIMIT 1`,
          [input.id, ctx.usuario.empresaId],
        )
        if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Nota não encontrada' })

        await pool.execute(`DELETE FROM os_nota WHERE id = ?`, [input.id])
        return { ok: true }
      }),
  }),

  // ── Anexos (fotos e PDFs) ────────────────────────────────────────
  anexo: router({
    list: protectedProcedure
      .input(z.object({ ordemServicoId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const pool = getRawPool()
        const [rows]: any = await pool.execute(
          `SELECT id, nome, tipo_mime AS tipoMime, tamanho, created_at AS createdAt
           FROM os_anexo
           WHERE ordem_servico_id = ? AND empresa_id = ?
           ORDER BY created_at ASC`,
          [input.ordemServicoId, ctx.usuario.empresaId],
        )
        return rows as any[]
      }),

    deletar: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()
        const [check]: any = await pool.execute(
          `SELECT a.id FROM os_anexo a
           JOIN ordem_servico os ON os.id = a.ordem_servico_id
           WHERE a.id = ? AND os.empresa_id = ? LIMIT 1`,
          [input.id, ctx.usuario.empresaId],
        )
        if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Anexo não encontrado' })
        await pool.execute(`DELETE FROM os_anexo WHERE id = ?`, [input.id])
        return { ok: true }
      }),
  }),

  // ─── CONTRATOS HISTÓRICOS ─────────────────────────────────────────

  // Schema compartilhado para um contrato histórico
  criarHistorico: protectedProcedure
    .input(z.object({
      clienteNome:           z.string().min(1).max(200),
      clienteId:             z.number().int().positive().optional(), // se já existe no cadastro
      valorContrato:         z.number().positive(),
      descricao:             z.string().max(500).optional(),
      dataInicio:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dataConclusao:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      status:                z.enum(['aberta', 'em_execucao', 'concluida']).default('em_execucao'),
      tecnicoResponsavel:    z.string().max(100).optional(),
      numeroContratoExterno: z.string().max(50).optional(),
      observacoes:           z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const pool = getRawPool()
      const empId   = ctx.usuario.empresaId
      const usuId   = ctx.usuario.id

      // 1. Resolve ou cria o cliente
      let clienteId = input.clienteId
      if (!clienteId) {
        const [existing]: any = await pool.execute(
          `SELECT id FROM cliente WHERE empresa_id = ? AND nome LIKE ? LIMIT 1`,
          [empId, input.clienteNome.trim()],
        )
        if ((existing as any[]).length) {
          clienteId = (existing as any[])[0].id
        } else {
          const [ins]: any = await pool.execute(
            `INSERT INTO cliente (empresa_id, nome) VALUES (?, ?)`,
            [empId, input.clienteNome.trim()],
          )
          clienteId = (ins as any).insertId
        }
      }

      // 2. Gera número de proposta histórica: HIST-YYYY-XXXX
      const [cntRows]: any = await pool.execute(
        `SELECT COUNT(*) AS total FROM proposta WHERE empresa_id = ? AND origem = 'historico'`,
        [empId],
      )
      const seq = (Number((cntRows as any[])[0]?.total ?? 0) + 1).toString().padStart(4, '0')
      const numProposta = `HIST-${new Date().getFullYear()}-${seq}`

      // 3. Cria proposta histórica (status aceita, origem historico)
      const [propRes]: any = await pool.execute(
        `INSERT INTO proposta
           (empresa_id, numero, cliente_id, status, origem,
            titulo_servico, data_emissao, data_validade,
            usuario_id, created_by, versao, created_at)
         VALUES (?, ?, ?, 'aceita', 'historico', ?, ?, DATE_ADD(?, INTERVAL 1 YEAR), ?, ?, 1, NOW())`,
        [
          empId, numProposta, clienteId,
          input.descricao ?? `Contrato histórico — ${input.clienteNome}`,
          input.dataInicio, input.dataInicio,
          usuId, usuId,
        ],
      )
      const propostaId = (propRes as any).insertId

      // 4. Cria condicao_comercial + parcela_pagamento
      const [condRes]: any = await pool.execute(
        `INSERT INTO condicao_comercial (proposta_id, descricao, tipo, valor_total)
         VALUES (?, 'Contrato histórico', 'avista', ?)`,
        [propostaId, input.valorContrato],
      )
      const condicaoId = (condRes as any).insertId
      await pool.execute(
        `INSERT INTO parcela_pagamento
           (condicao_id, numero_parcela, descricao_evento, valor,
            percentual_do_total, prazo_dias, tipo_prazo,
            referencia_evento, meios_pagamento)
         VALUES (?, 1, 'Pagamento do contrato', ?, 100, 0, 'corridos', 'contrato', '[]')`,
        [condicaoId, input.valorContrato],
      )
      // Formaliza proposta para aparecer no módulo financeiro
      await pool.execute(
        `UPDATE proposta SET contrato_formalizado = 1, data_formalizacao = ? WHERE id = ?`,
        [input.dataInicio, propostaId],
      )

      // 5. Cria automaticamente o título a receber no financeiro
      // 5a. Resolve fin_pessoa (busca por nome, cria se não existir)
      const [pessoaRows]: any = await pool.execute(
        `SELECT id FROM fin_pessoa WHERE empresa_id = ? AND nome = ? LIMIT 1`,
        [empId, input.clienteNome.trim()],
      )
      let finPessoaId: number
      if ((pessoaRows as any[]).length) {
        finPessoaId = (pessoaRows as any[])[0].id
      } else {
        const [pIns]: any = await pool.execute(
          `INSERT INTO fin_pessoa (empresa_id, nome, tipo_pessoa, is_cliente, is_fornecedor)
           VALUES (?, ?, 'FISICA', 1, 0)`,
          [empId, input.clienteNome.trim()],
        )
        finPessoaId = (pIns as any).insertId
      }
      // 5b. Cria fin_titulo RECEBER — apenas como referência (sem fin_parcela)
      // Não criamos fin_parcela pois o fluxo de caixa real já está registrado
      // pelo extrato bancário importado. O fin_titulo serve de âncora para
      // vincular OS ↔ Proposta ↔ Cliente no módulo financeiro.
      const descTitulo = `📦 ${input.descricao ?? 'Contrato histórico'} — ${input.clienteNome} (${numProposta})`.substring(0, 190)
      await pool.execute(
        `INSERT INTO fin_titulo
           (empresa_id, tipo, descricao, documento, pessoa_id, proposta_id,
            valor_original, emissao, observacoes, ativo)
         VALUES (?, 'RECEBER', ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          empId, descTitulo, numProposta, finPessoaId, propostaId,
          String(input.valorContrato), input.dataInicio,
          input.observacoes ?? null,
        ],
      )

      // 6. Gera número OS
      const numero = await gerarNumeroOS(empId)

      // 6. Cria OS histórica
      const [osRes]: any = await pool.execute(
        `INSERT INTO ordem_servico
           (empresa_id, proposta_id, numero, status, origem,
            numero_contrato_externo, descricao, tecnico_responsavel,
            data_inicio, data_conclusao, tem_agendamento, observacoes, created_at)
         VALUES (?, ?, ?, ?, 'historico', ?, ?, ?, ?, ?, 0, ?, NOW())`,
        [
          empId, propostaId, numero, input.status,
          input.numeroContratoExterno ?? null,
          input.descricao ?? null,
          input.tecnicoResponsavel ?? null,
          input.dataInicio,
          input.dataConclusao ?? null,
          input.observacoes ?? null,
        ],
      )
      const osId = (osRes as any).insertId

      // 7. Marcos padrão
      for (let i = 0; i < MARCOS_PADRAO.length; i++) {
        await pool.execute(
          `INSERT INTO os_marco (ordem_servico_id, titulo, ordem, concluido)
           VALUES (?, ?, ?, ?)`,
          [osId, MARCOS_PADRAO[i], i, input.status === 'concluida' ? 1 : 0],
        )
      }

      return { ok: true, osId, numero, propostaId }
    }),

  importarLoteHistorico: protectedProcedure
    .input(z.object({
      contratos: z.array(z.object({
        clienteNome:           z.string().min(1).max(200),
        valorContrato:         z.number().positive(),
        descricao:             z.string().max(500).optional(),
        dataInicio:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dataConclusao:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        status:                z.enum(['aberta', 'em_execucao', 'concluida']).default('em_execucao'),
        tecnicoResponsavel:    z.string().max(100).optional(),
        numeroContratoExterno: z.string().max(50).optional(),
        observacoes:           z.string().optional(),
      })).min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const pool = getRawPool()
      const empId = ctx.usuario.empresaId
      const usuId = ctx.usuario.id
      const resultados: { linha: number; ok: boolean; numero?: string; erro?: string }[] = []

      for (let i = 0; i < input.contratos.length; i++) {
        const c = input.contratos[i]
        try {
          // Resolve/cria cliente
          const [existing]: any = await pool.execute(
            `SELECT id FROM cliente WHERE empresa_id = ? AND nome LIKE ? LIMIT 1`,
            [empId, c.clienteNome.trim()],
          )
          let clienteId: number
          if ((existing as any[]).length) {
            clienteId = (existing as any[])[0].id
          } else {
            const [ins]: any = await pool.execute(
              `INSERT INTO cliente (empresa_id, nome) VALUES (?, ?)`,
              [empId, c.clienteNome.trim()],
            )
            clienteId = (ins as any).insertId
          }

          const [cntRows]: any = await pool.execute(
            `SELECT COUNT(*) AS total FROM proposta WHERE empresa_id = ? AND origem = 'historico'`,
            [empId],
          )
          const seq = (Number((cntRows as any[])[0]?.total ?? 0) + 1).toString().padStart(4, '0')
          const numProposta = `HIST-${new Date().getFullYear()}-${seq}`

          const [propRes]: any = await pool.execute(
            `INSERT INTO proposta
               (empresa_id, numero, cliente_id, status, origem,
                titulo_servico, data_emissao, data_validade,
                usuario_id, created_by, versao, created_at)
             VALUES (?, ?, ?, 'aceita', 'historico', ?, ?, DATE_ADD(?, INTERVAL 1 YEAR), ?, ?, 1, NOW())`,
            [empId, numProposta, clienteId,
                       (c.descricao ?? `Contrato histórico — ${c.clienteNome}`).substring(0, 190),
             c.dataInicio, c.dataInicio, usuId, usuId],
          )
          const propostaId = (propRes as any).insertId

          const [condRes2]: any = await pool.execute(
            `INSERT INTO condicao_comercial (proposta_id, descricao, tipo, valor_total)
             VALUES (?, 'Contrato histórico', 'avista', ?)`,
            [propostaId, c.valorContrato],
          )
          const condicaoId2 = (condRes2 as any).insertId
          await pool.execute(
            `INSERT INTO parcela_pagamento
               (condicao_id, numero_parcela, descricao_evento, valor,
                percentual_do_total, prazo_dias, tipo_prazo,
                referencia_evento, meios_pagamento)
             VALUES (?, 1, 'Pagamento do contrato', ?, 100, 0, 'corridos', 'contrato', '[]')`,
            [condicaoId2, c.valorContrato],
          )
          await pool.execute(
            `UPDATE proposta SET contrato_formalizado = 1, data_formalizacao = ? WHERE id = ?`,
            [c.dataInicio, propostaId],
          )

          // Cria fin_titulo RECEBER automaticamente
          const [pRows2]: any = await pool.execute(
            `SELECT id FROM fin_pessoa WHERE empresa_id = ? AND nome = ? LIMIT 1`,
            [empId, c.clienteNome.trim()],
          )
          let fp2Id: number
          if ((pRows2 as any[]).length) {
            fp2Id = (pRows2 as any[])[0].id
          } else {
            const [p2Ins]: any = await pool.execute(
              `INSERT INTO fin_pessoa (empresa_id, nome, tipo_pessoa, is_cliente, is_fornecedor) VALUES (?, ?, 'FISICA', 1, 0)`,
              [empId, c.clienteNome.trim()],
            )
            fp2Id = (p2Ins as any).insertId
          }
          // fin_titulo como referência apenas — sem fin_parcela (evita duplicidade com extrato)
          const descTit2 = `📦 ${c.descricao ?? 'Contrato histórico'} — ${c.clienteNome} (${numProposta})`
          await pool.execute(
            `INSERT INTO fin_titulo (empresa_id, tipo, descricao, documento, pessoa_id, proposta_id, valor_original, emissao, ativo)
             VALUES (?, 'RECEBER', ?, ?, ?, ?, ?, ?, 1)`,
            [empId, descTit2, numProposta, fp2Id, propostaId, String(c.valorContrato), c.dataInicio],
          )

          const numero = await gerarNumeroOS(empId)

          const [osRes]: any = await pool.execute(
            `INSERT INTO ordem_servico
               (empresa_id, proposta_id, numero, status, origem,
                numero_contrato_externo, descricao, tecnico_responsavel,
                data_inicio, data_conclusao, tem_agendamento, observacoes, created_at)
             VALUES (?, ?, ?, ?, 'historico', ?, ?, ?, ?, ?, 0, ?, NOW())`,
            [empId, propostaId, numero, c.status,
             c.numeroContratoExterno ?? null, c.descricao ?? null,
             c.tecnicoResponsavel ?? null, c.dataInicio,
             c.dataConclusao ?? null, c.observacoes ?? null],
          )
          const osId = (osRes as any).insertId

          for (let m = 0; m < MARCOS_PADRAO.length; m++) {
            await pool.execute(
              `INSERT INTO os_marco (ordem_servico_id, titulo, ordem, concluido) VALUES (?, ?, ?, ?)`,
              [osId, MARCOS_PADRAO[m], m, c.status === 'concluida' ? 1 : 0],
            )
          }

          resultados.push({ linha: i + 1, ok: true, numero })
        } catch (e: any) {
          resultados.push({ linha: i + 1, ok: false, erro: e.meshsage })
        }
      }

      const importados = resultados.filter(r => r.ok).length
      const erros      = resultados.filter(r => !r.ok).length
      return { ok: true, importados, erros, resultados }
    }),

  // ── Etiquetas (labels coloridas, estilo Trello) ──────────────────
  etiqueta: router({

    list: protectedProcedure
      .query(async ({ ctx }) => {
        const pool = getRawPool()
        const [rows]: any = await pool.execute(
          `SELECT id, nome, cor FROM os_etiqueta WHERE empresa_id = ? ORDER BY nome ASC`,
          [ctx.usuario.empresaId],
        )
        return rows as any[]
      }),

    criar: protectedProcedure
      .input(z.object({ nome: z.string().min(1).max(40), cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/) }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()
        const [res]: any = await pool.execute(
          `INSERT INTO os_etiqueta (empresa_id, nome, cor) VALUES (?, ?, ?)`,
          [ctx.usuario.empresaId, input.nome.trim(), input.cor],
        )
        return { id: (res as any).insertId, nome: input.nome.trim(), cor: input.cor }
      }),

    atualizar: protectedProcedure
      .input(z.object({
        id:   z.number().int().positive(),
        nome: z.string().min(1).max(40).optional(),
        cor:  z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()
        const [check]: any = await pool.execute(
          `SELECT id FROM os_etiqueta WHERE id = ? AND empresa_id = ? LIMIT 1`,
          [input.id, ctx.usuario.empresaId],
        )
        if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Etiqueta não encontrada' })

        const [atual]: any = await pool.execute(
          `SELECT nome, cor FROM os_etiqueta WHERE id = ? LIMIT 1`,
          [input.id],
        )
        const nome = input.nome?.trim() ?? (atual as any[])[0].nome
        const cor  = input.cor          ?? (atual as any[])[0].cor

        await pool.execute(
          `UPDATE os_etiqueta SET nome = ?, cor = ? WHERE id = ? AND empresa_id = ?`,
          [nome, cor, input.id, ctx.usuario.empresaId],
        )
        return { ok: true }
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()
        const [check]: any = await pool.execute(
          `SELECT id FROM os_etiqueta WHERE id = ? AND empresa_id = ? LIMIT 1`,
          [input.id, ctx.usuario.empresaId],
        )
        if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Etiqueta não encontrada' })

        await pool.execute(`DELETE FROM os_etiqueta_link WHERE etiqueta_id = ?`, [input.id])
        await pool.execute(`DELETE FROM os_etiqueta WHERE id = ? AND empresa_id = ?`, [input.id, ctx.usuario.empresaId])
        return { ok: true }
      }),

    vincular: protectedProcedure
      .input(z.object({ ordemServicoId: z.number().int().positive(), etiquetaId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()
        const [check]: any = await pool.execute(
          `SELECT os.id FROM ordem_servico os
           JOIN os_etiqueta et ON et.id = ? AND et.empresa_id = os.empresa_id
           WHERE os.id = ? AND os.empresa_id = ? LIMIT 1`,
          [input.etiquetaId, input.ordemServicoId, ctx.usuario.empresaId],
        )
        if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'OS ou etiqueta não encontrada' })

        await pool.execute(
          `INSERT IGNORE INTO os_etiqueta_link (ordem_servico_id, etiqueta_id) VALUES (?, ?)`,
          [input.ordemServicoId, input.etiquetaId],
        )
        return { ok: true }
      }),

    desvincular: protectedProcedure
      .input(z.object({ ordemServicoId: z.number().int().positive(), etiquetaId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()
        await pool.execute(
          `DELETE link FROM os_etiqueta_link link
           JOIN ordem_servico os ON os.id = link.ordem_servico_id
           WHERE link.ordem_servico_id = ? AND link.etiqueta_id = ? AND os.empresa_id = ?`,
          [input.ordemServicoId, input.etiquetaId, ctx.usuario.empresaId],
        )
        return { ok: true }
      }),
  }),

  // ── Planos de Manutenção Recorrente ──────────────────────────────
  // Ex.: limpeza de painéis a cada 6 meses. Cada plano guarda a próxima data;
  // "Gerar OS" cria uma OS avulsa pré-preenchida vinculada ao plano, e concluir
  // essa OS reagenda o plano automaticamente (data conclusão + periodicidade).
  manutencao: router({

    // Badge: planos ativos vencidos ou vencendo nos próximos 15 dias
    count: protectedProcedure.query(async ({ ctx }) => {
      const pool = getRawPool()
      const [rows]: any = await pool.execute(
        `SELECT COUNT(*) AS total FROM os_manutencao_plano
         WHERE empresa_id = ? AND ativo = 1
           AND proxima_data <= DATE_ADD(CURDATE(), INTERVAL 15 DAY)`,
        [ctx.usuario.empresaId],
      )
      return { total: Number((rows as any[])[0]?.total ?? 0) }
    }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const pool = getRawPool()
      const [rows]: any = await pool.execute(
        `SELECT
           mp.id, mp.cliente_id AS clienteId, mp.titulo, mp.resumo, mp.localizacao,
           mp.periodicidade_meses AS periodicidadeMeses,
           mp.proxima_data AS proximaData, mp.ativo,
           c.nome AS clienteNome, c.telefone AS clienteTelefone,
           DATEDIFF(mp.proxima_data, CURDATE()) AS diasRestantes,
           (SELECT MAX(os1.data_conclusao) FROM ordem_servico os1
             WHERE os1.manutencao_plano_id = mp.id AND os1.status = 'concluida') AS ultimaExecucao,
           (SELECT os2.id FROM ordem_servico os2
             WHERE os2.manutencao_plano_id = mp.id AND os2.status IN ('aberta','em_execucao')
             ORDER BY os2.created_at DESC LIMIT 1) AS osAbertaId,
           (SELECT os3.numero FROM ordem_servico os3
             WHERE os3.manutencao_plano_id = mp.id AND os3.status IN ('aberta','em_execucao')
             ORDER BY os3.created_at DESC LIMIT 1) AS osAbertaNumero
         FROM os_manutencao_plano mp
         JOIN cliente c ON c.id = mp.cliente_id
         WHERE mp.empresa_id = ?
         ORDER BY mp.ativo DESC, mp.proxima_data ASC`,
        [ctx.usuario.empresaId],
      )
      return rows as any[]
    }),

    criar: protectedProcedure
      .input(z.object({
        clienteId:          z.number().int().positive(),
        titulo:             z.string().min(1).max(200),
        resumo:             z.string().optional(),
        localizacao:        z.string().max(500).optional(),
        periodicidadeMeses: z.number().int().min(1).max(60),
        proximaData:        z.string(), // YYYY-MM-DD
      }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()
        const [cli]: any = await pool.execute(
          `SELECT id FROM cliente WHERE id = ? AND empresa_id = ? LIMIT 1`,
          [input.clienteId, ctx.usuario.empresaId],
        )
        if (!(cli as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' })

        await pool.execute(
          `INSERT INTO os_manutencao_plano
             (empresa_id, cliente_id, titulo, resumo, localizacao, periodicidade_meses, proxima_data)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            ctx.usuario.empresaId, input.clienteId, input.titulo,
            input.resumo ?? null, input.localizacao ?? null,
            input.periodicidadeMeses, input.proximaData,
          ],
        )
        return { ok: true }
      }),

    update: protectedProcedure
      .input(z.object({
        id:                 z.number().int().positive(),
        titulo:             z.string().min(1).max(200).optional(),
        resumo:             z.string().optional(),
        localizacao:        z.string().max(500).optional(),
        periodicidadeMeses: z.number().int().min(1).max(60).optional(),
        proximaData:        z.string().optional(),
        ativo:              z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()
        const { id, ...fields } = input

        const [check]: any = await pool.execute(
          `SELECT id FROM os_manutencao_plano WHERE id = ? AND empresa_id = ? LIMIT 1`,
          [id, ctx.usuario.empresaId],
        )
        if (!(check as any[]).length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plano não encontrado' })

        const colunas: Record<string, string> = {
          titulo: 'titulo', resumo: 'resumo', localizacao: 'localizacao',
          periodicidadeMeses: 'periodicidade_meses', proximaData: 'proxima_data', ativo: 'ativo',
        }
        const sets: string[] = []
        const params: any[] = []
        for (const [campo, coluna] of Object.entries(colunas)) {
          const valor = (fields as any)[campo]
          if (valor !== undefined) {
            sets.push(`${coluna} = ?`)
            params.push(typeof valor === 'boolean' ? (valor ? 1 : 0) : (valor === '' ? null : valor))
          }
        }
        if (sets.length === 0) return { ok: true }

        await pool.execute(
          `UPDATE os_manutencao_plano SET ${sets.join(', ')}, updated_at = NOW()
           WHERE id = ? AND empresa_id = ?`,
          [...params, id, ctx.usuario.empresaId],
        )
        return { ok: true }
      }),

    // Gera uma OS avulsa pré-preenchida a partir do plano
    gerarOS: protectedProcedure
      .input(z.object({ planoId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const pool = getRawPool()
        const empId = ctx.usuario.empresaId

        const [planos]: any = await pool.execute(
          `SELECT * FROM os_manutencao_plano WHERE id = ? AND empresa_id = ? LIMIT 1`,
          [input.planoId, empId],
        )
        const plano = (planos as any[])[0]
        if (!plano) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plano não encontrado' })

        // Evita duas OS abertas do mesmo plano
        const [abertas]: any = await pool.execute(
          `SELECT numero FROM ordem_servico
           WHERE manutencao_plano_id = ? AND status IN ('aberta','em_execucao') LIMIT 1`,
          [input.planoId],
        )
        if ((abertas as any[]).length) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: `Já existe uma OS em andamento para este plano (${(abertas as any[])[0].numero}). Conclua-a antes de gerar outra.` })
        }

        const numero = await gerarNumeroOS(empId)
        // mysql2 devolve DATE como objeto Date — formatar como YYYY-MM-DD local
        const pd = plano.proxima_data
        const proximaData = pd instanceof Date
          ? `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}-${String(pd.getDate()).padStart(2, '0')}`
          : String(pd).slice(0, 10)

        await pool.execute(
          `INSERT INTO ordem_servico
             (empresa_id, proposta_id, cliente_id, manutencao_plano_id, origem, numero, status,
              titulo, resumo_servico, localizacao, data_prevista_inicio, tem_agendamento)
           VALUES (?, NULL, ?, ?, 'avulsa', ?, 'aberta', ?, ?, ?, ?, 0)`,
          [
            empId, plano.cliente_id, plano.id, numero,
            plano.titulo, plano.resumo ?? null, plano.localizacao ?? null,
            proximaData,
          ],
        )

        const [idRows]: any = await pool.execute(
          `SELECT id FROM ordem_servico WHERE numero = ? LIMIT 1`, [numero],
        )
        return { id: (idRows as any[])[0]?.id, numero }
      }),
  }),
})
