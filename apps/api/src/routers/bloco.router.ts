// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Blocos da Proposta â€” configuraÃ§Ã£o de seÃ§Ãµes do PDF
// Template padrÃ£o armazenado em textoInstitucional (chave especial)
// Por proposta: tabela bloco_proposta existente no schema
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
import { z } from 'zod'
import { router, protectedProcedure } from './trpc'
import { blocoProposta, textoInstitucional } from '../db/schema'
import { eq, and } from 'drizzle-orm'

// CatÃ¡logo completo de blocos disponÃ­veis â€” espelha o proposta.template.ts
export const BLOCOS_CATALOGO = [
  { tipoBloco: 'capa',                    titulo: 'Capa',                                grupo: 'estrutura',  ativo: true,  ordem: 1  },
  { tipoBloco: 'apresentacao_empresa',    titulo: 'ApresentaÃ§Ã£o da Empresa',             grupo: 'empresa',    ativo: true,  ordem: 2  },
  { tipoBloco: 'como_funciona',           titulo: 'Como Funciona a Energia Solar',       grupo: 'empresa',    ativo: true,  ordem: 3  },
  { tipoBloco: 'regulamentacao',          titulo: 'RegulamentaÃ§Ã£o no Brasil',            grupo: 'empresa',    ativo: false, ordem: 4  },
  { tipoBloco: 'diferenciais',            titulo: 'Diferenciais da Atom Tech',           grupo: 'empresa',    ativo: true,  ordem: 5  },
  { tipoBloco: 'garantias',               titulo: 'Garantias Inclusas',                  grupo: 'empresa',    ativo: true,  ordem: 6  },
  { tipoBloco: 'fornecedores',            titulo: 'Fornecedores e Fabricantes',          grupo: 'empresa',    ativo: true,  ordem: 7  },
  { tipoBloco: 'dimensionamento',         titulo: 'Dimensionamento do Sistema',          grupo: 'tecnico',    ativo: true,  ordem: 8  },
  { tipoBloco: 'equipamentos',            titulo: '\u21b3 Tabela de Equipamentos',       grupo: 'tecnico',    ativo: true,  ordem: 9  },
  { tipoBloco: 'cronograma',              titulo: '\u21b3 Cronograma de ImplantaÃ§Ã£o',    grupo: 'tecnico',    ativo: true,  ordem: 10 },
  { tipoBloco: 'analise_financeira',      titulo: 'AnÃ¡lise Financeira',                  grupo: 'financeiro', ativo: true,  ordem: 11 },
  { tipoBloco: 'indicadores_financeiros', titulo: '\u21b3 Indicadores (VPL/TIR/Payback)',grupo: 'financeiro', ativo: true,  ordem: 12 },
  { tipoBloco: 'reducao_conta',           titulo: '\u21b3 ReduÃ§Ã£o da Conta de Energia',  grupo: 'financeiro', ativo: true,  ordem: 13 },
  { tipoBloco: 'fluxo_caixa',             titulo: 'Fluxo de Caixa (25 anos)',            grupo: 'financeiro', ativo: true,  ordem: 14 },
  { tipoBloco: 'condicoes_comerciais',    titulo: 'CondiÃ§Ãµes Comerciais',                grupo: 'comercial',  ativo: true,  ordem: 15 },
  { tipoBloco: 'formas_pagamento',        titulo: '\u21b3 Formas de Pagamento',          grupo: 'comercial',  ativo: true,  ordem: 16 },
  { tipoBloco: 'aceite',                  titulo: 'Aceite e Assinaturas',                grupo: 'comercial',  ativo: true,  ordem: 17 },
  { tipoBloco: 'contato',                 titulo: '\u21b3 InformaÃ§Ãµes de Contato',       grupo: 'comercial',  ativo: true,  ordem: 18 },
]

const CHAVE_TEMPLATE = '__blocos_padrao__'

const BlocoSchema = z.object({
  tipoBloco: z.string(),
  titulo:    z.string(),
  grupo:     z.string().optional().default(''),
  ativo:     z.boolean(),
  ordem:     z.number().int(),
})

export const blocoRouter = router({

  // â”€â”€ Template padrÃ£o da empresa (ConfiguraÃ§Ãµes â†’ Blocos) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getTemplate: protectedProcedure.query(async ({ ctx }) => {
    const { empresaId } = ctx.usuario
    const [registro] = await ctx.db
      .select()
      .from(textoInstitucional)
      .where(and(
        eq(textoInstitucional.empresaId, empresaId),
        eq(textoInstitucional.chave, CHAVE_TEMPLATE),
      ))
    if (registro?.conteudo) {
      try { return JSON.parse(registro.conteudo) as typeof BLOCOS_CATALOGO } catch { /* usa fallback */ }
    }
    return BLOCOS_CATALOGO
  }),

  saveTemplate: protectedProcedure
    .input(z.array(BlocoSchema))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario
      const json = JSON.stringify(input)
      const [existing] = await ctx.db
        .select({ id: textoInstitucional.id })
        .from(textoInstitucional)
        .where(and(
          eq(textoInstitucional.empresaId, empresaId),
          eq(textoInstitucional.chave, CHAVE_TEMPLATE),
        ))
      if (existing) {
        await ctx.db
          .update(textoInstitucional)
          .set({ conteudo: json })
          .where(eq(textoInstitucional.id, existing.id))
      } else {
        await ctx.db.insert(textoInstitucional).values({
          empresaId,
          chave:    CHAVE_TEMPLATE,
          titulo:   'Template de Blocos',
          conteudo: json,
          versao:   1,
          ativo:    1 as any,
        })
      }
      return { ok: true }
    }),

  // â”€â”€ Blocos de uma proposta especÃ­fica â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getByProposta: protectedProcedure
    .input(z.object({ propostaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const blocos = await ctx.db
        .select()
        .from(blocoProposta)
        .where(eq(blocoProposta.propostaId, input.propostaId))
        .orderBy(blocoProposta.ordem)
      if (blocos.length > 0) return blocos
      const { empresaId } = ctx.usuario
      const [registro] = await ctx.db
        .select()
        .from(textoInstitucional)
        .where(and(
          eq(textoInstitucional.empresaId, empresaId),
          eq(textoInstitucional.chave, CHAVE_TEMPLATE),
        ))
      if (registro?.conteudo) {
        try { return JSON.parse(registro.conteudo) } catch { /* usa fallback */ }
      }
      return BLOCOS_CATALOGO
    }),

  saveByProposta: protectedProcedure
    .input(z.object({
      propostaId: z.number(),
      blocos:     z.array(BlocoSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(blocoProposta)
        .where(eq(blocoProposta.propostaId, input.propostaId))
      if (input.blocos.length > 0) {
        await ctx.db.insert(blocoProposta).values(
          input.blocos.map(b => ({
            propostaId: input.propostaId,
            tipoBloco:  b.tipoBloco,
            ativo:      b.ativo,
            ordem:      b.ordem,
          }))
        )
      }
      return { ok: true }
    }),
})