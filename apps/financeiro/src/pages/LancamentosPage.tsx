import { PageWrapper, C, EmptyState, Btn } from '../components/ui'
import { useNavigate } from 'react-router-dom'

export function LancamentosPage() {
  return (
    <PageWrapper>
      <EmptyState
        icon="↕"
        title="Módulo de Lançamentos"
        description="Contas a Pagar, Contas a Receber e Transferências serão gerenciados aqui. Esta funcionalidade está prevista para a Fase 2."
        action={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Btn variant="secondary">📥 Conta a Receber</Btn>
            <Btn variant="secondary">📤 Conta a Pagar</Btn>
            <Btn variant="secondary">⇄ Transferência</Btn>
          </div>
        }
      />
    </PageWrapper>
  )
}
