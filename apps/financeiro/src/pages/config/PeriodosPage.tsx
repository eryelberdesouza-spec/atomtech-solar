// ═══════════════════════════════════════════════════════════════════
// Fechamento de Período — bloqueia edição de lançamentos em meses fechados
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { trpc } from '../../lib/trpc'
import {
  PageWrapper, SectionHeader, Card, Btn, Table, Modal,
  Select, Input, Spinner, EmptyState, C, Alert,
} from '../../components/ui'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function anoAtual() { return new Date().getFullYear() }
function mesAtual()  { return new Date().getMonth() + 1 }

function ModalReabrir({ periodo, onClose, onConfirmar, isLoading, erro }: {
  periodo: { ano: number; mes: number }
  onClose: () => void
  onConfirmar: (senha: string) => void
  isLoading: boolean
  erro: string
}) {
  const [senha, setSenha] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title={`Reabrir ${MESES[periodo.mes - 1]}/${periodo.ano}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="danger" disabled={isLoading || !senha} onClick={() => onConfirmar(senha)}>
            {isLoading ? 'Reabrindo...' : 'Reabrir Período'}
          </Btn>
        </>
      }
    >
      <p style={{ color: C.text, margin: '0 0 16px' }}>
        Reabrir este período volta a permitir lançar, editar, baixar, estornar ou excluir contas com data dentro dele.
      </p>
      {erro && <div style={{ marginBottom: 12 }}><Alert type="danger">{erro}</Alert></div>}
      <Input
        label="Senha do Administrador *"
        type="password"
        value={senha}
        onChange={e => setSenha(e.target.value)}
        placeholder="Digite a senha de administrador"
        onKeyDown={e => { if (e.key === 'Enter' && senha) onConfirmar(senha) }}
        autoFocus
      />
    </Modal>
  )
}

export function PeriodosPage() {
  const [ano, setAno] = useState(anoAtual())
  const [mes, setMes] = useState(mesAtual())
  const [erroFechar, setErroFechar] = useState('')
  const [reabrirAlvo, setReabrirAlvo] = useState<{ ano: number; mes: number } | null>(null)
  const [erroReabrir, setErroReabrir] = useState('')

  const { data: periodos = [], isLoading, refetch } = (trpc as any).fin.periodo.list.useQuery()

  const fechar = (trpc as any).fin.periodo.fechar.useMutation({
    onSuccess: () => { refetch(); setErroFechar('') },
    onError: (e: any) => setErroFechar(e.message),
  })
  const reabrir = (trpc as any).fin.periodo.reabrir.useMutation({
    onSuccess: () => { refetch(); setReabrirAlvo(null); setErroReabrir('') },
    onError: (e: any) => setErroReabrir(e.message),
  })

  const anos = Array.from({ length: 6 }, (_, i) => anoAtual() - i)

  const rows = periodos.map((p: any) => ({
    periodo:  <span style={{ color: C.text, fontWeight: 600 }}>{MESES[p.mes - 1]}/{p.ano}</span>,
    fechadoPor: <span style={{ color: C.textMuted, fontSize: 12 }}>{p.fechadoPorNome ?? '—'}</span>,
    fechadoEm:  <span style={{ color: C.textMuted, fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>,
    acoes: (
      <Btn size="sm" variant="danger" onClick={() => { setErroReabrir(''); setReabrirAlvo({ ano: p.ano, mes: p.mes }) }}>
        Reabrir
      </Btn>
    ),
  }))

  return (
    <PageWrapper>
      <SectionHeader title="Fechamento de Período" />

      <Alert type="info">
        Fechar um período bloqueia lançar, editar, baixar, estornar ou excluir contas com vencimento ou pagamento dentro dele — protege o histórico financeiro contra alterações depois que o mês já foi fechado/conferido.
      </Alert>

      <Card style={{ marginTop: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Select
            label="Mês"
            value={String(mes)}
            onChange={e => setMes(Number(e.target.value))}
            options={MESES.map((m, i) => ({ value: String(i + 1), label: m }))}
          />
          <Select
            label="Ano"
            value={String(ano)}
            onChange={e => setAno(Number(e.target.value))}
            options={anos.map(a => ({ value: String(a), label: String(a) }))}
          />
          <Btn
            onClick={() => fechar.mutate({ ano, mes })}
            disabled={fechar.isLoading}
          >
            {fechar.isLoading ? 'Fechando...' : '🔒 Fechar Período'}
          </Btn>
        </div>
        {erroFechar && <div style={{ marginTop: 12 }}><Alert type="danger">{erroFechar}</Alert></div>}
      </Card>

      <Card style={{ marginTop: 16 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : periodos.length === 0 ? (
          <EmptyState icon="🔓" title="Nenhum período fechado — todos os meses estão abertos para edição" />
        ) : (
          <Table
            columns={[
              { key: 'periodo',    label: 'Período' },
              { key: 'fechadoPor', label: 'Fechado por' },
              { key: 'fechadoEm',  label: 'Fechado em' },
              { key: 'acoes',      label: '', width: '120px', align: 'right' },
            ]}
            rows={rows}
          />
        )}
      </Card>

      {reabrirAlvo && (
        <ModalReabrir
          periodo={reabrirAlvo}
          onClose={() => setReabrirAlvo(null)}
          onConfirmar={senha => reabrir.mutate({ ano: reabrirAlvo.ano, mes: reabrirAlvo.mes, senhaAdmin: senha })}
          isLoading={reabrir.isLoading}
          erro={erroReabrir}
        />
      )}
    </PageWrapper>
  )
}
