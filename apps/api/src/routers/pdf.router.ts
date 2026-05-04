// ═══════════════════════════════════════════════════════════════════
// Router de PDF — geração via Puppeteer com HTML template
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import path from 'path'
import fs from 'fs/promises'
import { router, protectedProcedure } from './trpc'
import {
  proposta, cliente, empresa, dimensionamento,
  precificacao, itemCustoProposta, analiseFinanceira,
  condicaoComercial, parcelaPagamento, blocoProposta,
  equipamentoProposta, premissasSnapshot, textoInstitucional,
  fatura, historicoConsumo, cronogracoMarco,
} from '../db/schema'
import { gerarHTMLProposta } from '../templates/proposta.template'

export const pdfRouter = router({
  // Gera PDF e retorna como base64
  generate: protectedProcedure
    .input(z.object({
      propostaId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { empresaId } = ctx.usuario

      // 1. Carrega proposta completa
      const [prop] = await ctx.db
        .select()
        .from(proposta)
        .where(and(eq(proposta.id, input.propostaId), eq(proposta.empresaId, empresaId)))
        .limit(1)

      if (!prop) throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposta não encontrada' })

      // 2. Carrega todos os dados relacionados em paralelo
      const [
        emp, cli, dim, prec, itens, af, blocos, equips, snap, cronograma, textos
      ] = await Promise.all([
        ctx.db.select().from(empresa).where(eq(empresa.id, empresaId)).limit(1),
        ctx.db.select().from(cliente).where(eq(cliente.id, prop.clienteId)).limit(1),
        ctx.db.select().from(dimensionamento).where(eq(dimensionamento.propostaId, input.propostaId)).limit(1),
        ctx.db.select().from(precificacao).where(eq(precificacao.propostaId, input.propostaId)).limit(1),
        ctx.db.select().from(itemCustoProposta).where(eq(itemCustoProposta.propostaId, input.propostaId)),
        ctx.db.select().from(analiseFinanceira).where(eq(analiseFinanceira.propostaId, input.propostaId)).limit(1),
        ctx.db.select().from(blocoProposta).where(eq(blocoProposta.propostaId, input.propostaId)).orderBy(blocoProposta.ordem),
        ctx.db.select().from(equipamentoProposta).where(eq(equipamentoProposta.propostaId, input.propostaId)).orderBy(equipamentoProposta.ordem),
        ctx.db.select().from(premissasSnapshot).where(eq(premissasSnapshot.propostaId, input.propostaId)).limit(1),
        ctx.db.select().from(cronogracoMarco).where(eq(cronogracoMarco.empresaId, empresaId)).orderBy(cronogracoMarco.ordem),
        ctx.db.select().from(textoInstitucional).where(eq(textoInstitucional.empresaId, empresaId)),
      ])

      // Fatura e histórico (opcional)
      let fat = null
      let historico: any[] = []
      if (prop.faturaId) {
        const [f] = await ctx.db.select().from(fatura).where(eq(fatura.id, prop.faturaId)).limit(1)
        if (f) {
          fat = f
          historico = await ctx.db.select().from(historicoConsumo).where(eq(historicoConsumo.faturaId, prop.faturaId)).orderBy(historicoConsumo.ordem)
        }
      }

      // Condições comerciais com parcelas
      const condições = await ctx.db.select().from(condicaoComercial).where(eq(condicaoComercial.propostaId, input.propostaId)).orderBy(condicaoComercial.ordem)
      const condicoesComParcelas = await Promise.all(
        condições.map(async (c) => {
          const parcelas = c.id
            ? await ctx.db.select().from(parcelaPagamento).where(eq(parcelaPagamento.condicaoId, c.id)).orderBy(parcelaPagamento.numeroParcela)
            : []
          return { ...c, parcelas }
        })
      )

      // Mapa de textos
      const textosMap = textos.reduce((acc, t) => {
        acc[t.chave] = t.conteudo
        return acc
      }, {} as Record<string, string>)

      // 3. Monta o objeto PropostaCompleta
      const propostaCompleta = {
        proposta: prop,
        empresa: emp[0],
        cliente: cli[0],
        fatura: fat ? { ...fat, historicoConsumo: historico } : undefined,
        premissasSnapshot: snap[0]?.dadosJson ?? {},
        dimensionamento: dim[0],
        equipamentos: equips,
        precificacao: prec[0] ? { ...prec[0], itens } : undefined,
        analiseFinanceira: af[0],
        condicoesComerciais: condicoesComParcelas,
        blocos: blocos.filter(b => b.ativo),
        textos: textosMap,
        cronograma,
      }

      // 4. Gera HTML
      const html = gerarHTMLProposta(propostaCompleta)

      // 5. Gera PDF via Puppeteer
      let pdfBuffer: Buffer

      try {
        const puppeteer = await import('puppeteer')
        const browser = await puppeteer.default.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
        })

        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle0' })

        pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        }) as Buffer

        await browser.close()
      } catch (err) {
        console.error('Erro Puppeteer:', err)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao gerar PDF. Puppeteer não disponível neste ambiente.',
        })
      }

      // 6. Salva arquivo e retorna base64
      const nomeCliente = cli[0]?.nome?.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) ?? 'Cliente'
      const nomeArquivo = `AtomTech_${prop.numero}_${nomeCliente}.pdf`
      const outputDir = path.join(process.cwd(), 'uploads', 'propostas')

      await fs.mkdir(outputDir, { recursive: true })
      const outputPath = path.join(outputDir, nomeArquivo)
      await fs.writeFile(outputPath, pdfBuffer)

      return {
        base64: pdfBuffer.toString('base64'),
        nomeArquivo,
        tamanhoBytes: pdfBuffer.length,
        ok: true,
      }
    }),

  // Preview HTML (sem PDF) — para debug e desenvolvimento
  previewHtml: protectedProcedure
    .input(z.object({ propostaId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      // Retorna HTML em string para renderização no browser
      // Implementação similar ao generate, mas retorna HTML
      return { html: '<p>Preview disponível após implementação completa do template</p>' }
    }),
})
