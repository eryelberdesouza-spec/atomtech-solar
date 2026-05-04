// PropostasPage.tsx
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Btn, Badge, Card, PageWrapper, EmptyState, Spinner, SectionHeader, C } from '../../components/ui'

export function PropostasPage() {
  const navigate = useNavigate()
  const { data, isLoading } = trpc.proposta.list.useQuery({ isTemplate: false, porPagina: 50 })
  const lista = data?.data ?? []

  return (
    <PageWrapper>
      <SectionHeader
        title={`Propostas (${lista.length})`}
        action={<Btn icon="+" onClick={() => navigate('/propostas/nova')}>Nova Proposta</Btn>}
      />

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : lista.length === 0 ? (
        <EmptyState icon="📄" title="Nenhuma proposta" description="Crie sua primeira proposta comercial"
          action={<Btn onClick={() => navigate('/propostas/nova')}>Nova Proposta</Btn>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lista.map(p => (
            <Card key={p.id} hover style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}
              onClick={() => navigate(`/propostas/${p.id}`)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ color: C.accent, fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{p.numero}</span>
                  <Badge status={p.status} />
                  <span style={{ fontSize: 11, color: C.textDim }}>v{p.versao}</span>
                </div>
                <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{p.clienteNome}</span>
                <span style={{ color: C.textDim, fontSize: 12, marginLeft: 8 }}>
                  {p.clienteEstado} · {formatDate(p.dataEmissao)}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: C.textDim, fontSize: 11 }}>›</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
