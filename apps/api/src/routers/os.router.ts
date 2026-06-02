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
  propostaId:         z.number().int().positive(),
  titulo:             z.string().max(200).optional(),
  descricao:          z.string().optional(),
  tecnicoResponsavel: z.string().max(100).optional(),
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
           os.id, os.numero, os.status, os.titulo,
           os.tecnico_responsavel  AS tecnicoResponsavel,
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
         LEFT JOIN cliente  c ON c.id = p.cliente_id
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

      return {
        data:     rows as any[],
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
         LEFT JOIN cliente  c ON c.id = p.cliente_id
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

      // Verifica se proposta existe e pertence à empresa
      const [propRows]: any = await pool.execute(
        `SELECT id, status, contrato_formalizado, cliente_id
         FROM proposta WHERE id = ? AND empresa_id = ? LIMIT 1`,
        [input.propostaId, empId],
      )
      const prop = (propRows as any[])[0]
      if (!prop) throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposta não encontrada' })
      if (prop.status !== 'aceita') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Só é possível criar OS para propostas aceitas.' })
      if (Number(prop.contrato_formalizado) !== 1) throw new TRPCError({ code: 'BAD_REQUEST', message: 'O contrato ainda não foi formalizado.' })

      // Múltiplas OS por proposta são permitidas (projetos em etapas)

      const numero = await gerarNumeroOS(empId)

      await pool.execute(
        `INSERT INTO ordem_servico
           (empresa_id, proposta_id, numero, status, titulo, descricao,
            tecnico_responsavel, data_prevista_inicio, data_prevista_fim,
            tem_agendamento, observacoes)
         VALUES (?, ?, ?, 'aberta', ?, ?, ?, ?, ?, ?, ?)`,
        [
          empId,
          input.propostaId,
          numero,
          input.titulo ?? null,
          input.descricao ?? null,
          input.tecnicoResponsavel ?? null,
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

      // Cria marcos padrão
      for (let i = 0; i < MARCOS_PADRAO.length; i++) {
        await pool.execute(
          `INSERT INTO os_marco (ordem_servico_id, titulo, ordem) VALUES (?, ?, ?)`,
          [osId, MARCOS_PADRAO[i], i],
        )
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
  update: protectedProcedure
    .input(z.object({
      id:                 z.number().int().positive(),
      titulo:             z.string().max(200).optional(),
      descricao:          z.string().optional(),
      tecnicoResponsavel: z.string().max(100).optional(),
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

      await pool.execute(
        `UPDATE ordem_servico SET
           titulo = ?, descricao = ?, tecnico_responsavel = ?,
           data_prevista_inicio = ?, data_prevista_fim = ?,
           data_inicio = ?, data_conclusao = ?,
           observacoes = ?, updated_at = NOW()
         WHERE id = ? AND empresa_id = ?`,
        [
          fields.titulo             ?? null,
          fields.descricao          ?? null,
          fields.tecnicoResponsavel ?? null,
          fields.dataPrevistaInicio ?? null,
          fields.dataPrevistaFim    ?? null,
          fields.dataInicio         ?? null,
          fields.dataConclusao      ?? null,
          fields.observacoes        ?? null,
          id, ctx.usuario.empresaId,
        ],
      )
      return { ok: true }
    }),

  // ── Atualizar status da OS ───────────────────────────────────────
  updateStatus: protectedProcedure
    .input(z.object({
      id:     z.number().int().positive(),
      status: z.enum(['aberta','em_execucao','concluida','cancelada']),
    }))
    .mutation(async ({ ctx, input }) => {
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
})
