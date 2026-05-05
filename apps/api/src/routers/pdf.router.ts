import { router, protectedProcedure } from './trpc'
import { z } from 'zod'

export const pdfRouter = router({
  gerar: protectedProcedure
    .input(z.object({ propostaId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      throw new Error('Geração de PDF não disponível neste ambiente. Use a versão local.')
    }),
})
