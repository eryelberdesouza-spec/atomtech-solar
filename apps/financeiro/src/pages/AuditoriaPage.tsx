// ═══════════════════════════════════════════════════════════════════
// Auditoria — trilha de quem criou/editou/excluiu lançamentos financeiros
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { trpc } from '../lib/trpc'
import {
  PageWrapper, SectionHeader, Card, Btn, Table, Badge, Modal,
  Select, Input, Spinner, EmptyState, C, Alert,
} from '../components/ui'

const ACAO_BADGE: Record<string, { bg: string; color: string }> = {
  CREATE:   { bg: '#064E3B', color: '#34D399' },
  UPDATE:   { bg: '#1E3A5F', color: '#60A5FA' },
  DELETE:   { bg: '#450A0A', color: '#FCA5A5' },
  BAIXA:    { bg: '#064E3B', color: '#34D399' },
  ESTORNO:  { bg: '#451A03', color: '#FBBF24' },
}

function AcaoBadge({ acao }: { acao: string }) {
  const s = ACAO_BADGE[acao] ?? { bg: C.bgHover, color: C.textMuted }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 600,
      background: s.bg, color: s.color, letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>{acao}</span>
  )
}

function fmtDataHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function AuditoriaPage() {
  const [entidade, setEntidade] = useState('')
  const [acao, setAcao] = useState('')
  const [dataIni, setDataIni] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [pagina, setPagina] = useState(1)
  const [detalhe, setDetalhe] = useState<any>(null)

  const { data, isLoading } = (trpc as any).fin.auditoria.list.useQuery({
    entidade: entidade || undefined,
    acao: acao || undefined,
    dataIni: dataIni || undefined,
    dataFim: dataFim || undefined,
    pagina,
    porPagina: 30,
  }, { staleTime: 0 })

  const itens = data?.itens ?? []
  const total = data?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / 30))

  const rows = itens.map((r: any) => ({
    data:      <span style={{ color: C.textMuted, fontSize: 12 }}>{fmtDataHora(r.createdAt)}</span>,
    usuario:   <span style={{ color: C.text, fontWeight: 600 }}>{r.usuarioNome ?? '—'}</span>,
    acao:      <AcaoBadge acao={r.acao} />,
    entidade:  <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.textMuted }}>{r.entidade} #{r.entidadeId}</span>,
    detalhe:   <Btn size="sm" variant="ghost" onClick={() => setDetalhe(r)}>Ver detalhes</Btn>,
  }))

  return (
    <PageWrapper>
      <SectionHeader title="Auditoria" />

      <Alert type="info">
        Registro de quem excluiu, deu baixa ou estornou lançamentos financeiros — quem, quando e o que mudou.
      </Alert>

      <Card style={{ marginTop: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Select
            label="Entidade"
            value={entidade}
            onChange={e => { setEntidade(e.target.value); setPagina(1) }}
            placeholder="Todas"
            options={[
              { value: 'fin_titulo', label: 'Título' },
              { value: 'fin_parcela', label: 'Parcela' },
            ]}
          />
          <Select
            label="Ação"
            value={acao}
            onChange={e => { setAcao(e.target.value); setPagina(1) }}
            placeholder="Todas"
            options={[
              { value: 'CREATE', label: 'Criação' },
              { value: 'UPDATE', label: 'Edição' },
              { value: 'DELETE', label: 'Exclusão' },
              { value: 'BAIXA', label: 'Baixa' },
              { value: 'ESTORNO', label: 'Estorno' },
            ]}
          />
          <Input label="De" type="date" value={dataIni} onChange={e => { setDataIni(e.target.value); setPagina(1) }} />
          <Input label="Até" type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPagina(1) }} />
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : itens.length === 0 ? (
          <EmptyState icon="🕵️" title="Nenhum registro de auditoria encontrado" />
        ) : (
          <>
            <Table
              columns={[
                { key: 'data',     label: 'Data/Hora', width: '150px' },
                { key: 'usuario',  label: 'Usuário' },
                { key: 'acao',     label: 'Ação',      width: '110px' },
                { key: 'entidade', label: 'Registro' },
                { key: 'detalhe',  label: '',          width: '120px', align: 'right' },
              ]}
              rows={rows}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
              <span style={{ color: C.textMuted, fontSize: 12 }}>{total} registro(s) — página {pagina} de {totalPaginas}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn size="sm" variant="ghost" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>← Anterior</Btn>
                <Btn size="sm" variant="ghost" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima →</Btn>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title={`${detalhe?.entidade ?? ''} #${detalhe?.entidadeId ?? ''} — ${detalhe?.acao ?? ''}`}
        footer={<Btn variant="ghost" onClick={() => setDetalhe(null)}>Fechar</Btn>}
      >
        {detalhe && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 12, color: C.textMuted }}>
              Por <strong style={{ color: C.text }}>{detalhe.usuarioNome ?? '—'}</strong> em {fmtDataHora(detalhe.createdAt)}
            </div>
            {detalhe.dadosAntes && (
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: C.textMuted, fontWeight: 700, marginBottom: 6 }}>Antes</div>
                <pre style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, fontSize: 11, color: C.text, overflow: 'auto', maxHeight: 220 }}>
                  {JSON.stringify(JSON.parse(detalhe.dadosAntes), null, 2)}
                </pre>
              </div>
            )}
            {detalhe.dadosDepois && (
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: C.textMuted, fontWeight: 700, marginBottom: 6 }}>Depois</div>
                <pre style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, fontSize: 11, color: C.text, overflow: 'auto', maxHeight: 220 }}>
                  {JSON.stringify(JSON.parse(detalhe.dadosDepois), null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageWrapper>
  )
}
