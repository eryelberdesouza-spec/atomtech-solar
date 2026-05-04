// ═══════════════════════════════════════════════════════════════════
// Router de Empresa — configuração central da Atom Tech
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure } from './trpc'
import { empresa } from '../db/schema'

const empresaUpdateSchema = z.object({
  nome: z.string().min(2).max(200).optional(),
  cnpj: z.string().max(18).optional(),
  inscricaoEstadual: z.string().max(30).optional(),
  isentoIE: z.boolean().optional(),
  estado: z.string().max(2).optional(),
  cidade: z.string().max(100).optional(),
  endereco: z.string().max(500).optional(),
  cep: z.string().max(9).optional(),
  telefone: z.string().max(20).optional(),
  email: z.string().email().max(150).optional().or(z.literal('')),
  site: z.string().max(150).optional(),
  logoUrl: z.string().max(500).optional(),
  corPrimaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  corSecundaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  // Dados bancários
  bancoNome: z.string().max(100).optional(),
  bancoCodigo: z.string().max(10).optional(),
  bancoAgencia: z.string().max(10).optional(),
  bancoConta: z.string().max(20).optional(),
  bancoTipo: z.enum(['corrente', 'poupança']).optional(),
  bancoPixTipo: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatorio']).optional(),
  bancoPixChave: z.string().max(150).optional(),
  rodapeTexto: z.string().optional(),
  // Regras de cadastro
  bloquearDupNome: z.boolean().optional(),
  bloquearDupEmpresa: z.boolean().optional(),
  bloquearDupCpfCnpj: z.boolean().optional(),
  bloquearDupEmail: z.boolean().optional(),
  bloquearDupTelefone: z.boolean().optional(),
  obrigatorioTelefone: z.boolean().optional(),
  obrigatorioCep: z.boolean().optional(),
  obrigatorioEmpresa: z.boolean().optional(),
  obrigatorioCpfCnpj: z.boolean().optional(),
  obrigatorioEmail: z.boolean().optional(),
  obrigatorioEndereco: z.boolean().optional(),
  obrigatorioEstado: z.boolean().optional(),
  obrigatorioCidade: z.boolean().optional(),
})

export const empresaRouter = router({
  // Dados da empresa do usuário logado
  get: protectedProcedure.query(async ({ ctx }) => {
    const [emp] = await ctx.db
      .select()
      .from(empresa)
      .where(eq(empresa.id, ctx.usuario.empresaId))
      .limit(1)

    if (!emp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' })
    return emp
  }),

  // Atualiza configurações da empresa (apenas admin)
  update: adminProcedure
    .input(empresaUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(empresa)
        .set({ ...input, email: input.email || undefined })
        .where(eq(empresa.id, ctx.usuario.empresaId))
        .execute()

      const [atualizada] = await ctx.db
        .select()
        .from(empresa)
        .where(eq(empresa.id, ctx.usuario.empresaId))
        .limit(1)

      return atualizada
    }),
})
