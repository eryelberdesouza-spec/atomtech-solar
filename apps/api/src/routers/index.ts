import { router } from './trpc'
import { authRouter }      from './auth.router'
import { clienteRouter }   from './cliente.router'
import { propostaRouter }  from './proposta.router'
import { empresaRouter }   from './empresa.router'
import { faturaRouter }    from './fatura.router'
import { premissasRouter } from './premissas.router'
import { pdfRouter }       from './pdf.router'
import { calculoRouter }   from './calculo.router'
import { usuarioRouter }   from './usuario.router'
import { textoRouter }       from './texto.router'
import { equipamentoRouter }  from './equipamento.router'
import { modeloBlocoRouter }  from './modeloBloco.router'
import { finRouter }          from './fin.router'
import { osRouter }           from './os.router'
import { relatorioEnergiaRouter } from './relatorioEnergia.router'
import { mooveRouter } from './moove.router'

export const appRouter = router({
  auth:               authRouter,
  empresa:            empresaRouter,
  cliente:            clienteRouter,
  fatura:             faturaRouter,
  proposta:           propostaRouter,
  premissas:          premissasRouter,
  calculo:            calculoRouter,
  pdf:                pdfRouter,
  usuario:            usuarioRouter,
  textoInstitucional: textoRouter,
  equipamento:        equipamentoRouter,
  modeloBloco:        modeloBlocoRouter,
  fin:                finRouter,
  os:                 osRouter,
  relatorioEnergia:   relatorioEnergiaRouter,
  moove:              mooveRouter,
})

export type AppRouter = typeof appRouter