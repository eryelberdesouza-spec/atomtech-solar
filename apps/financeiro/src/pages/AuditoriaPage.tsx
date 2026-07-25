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

function fmtBRL(v: any) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDataBR(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ─── Duplicidades — checagem de rotina (auditoria semanal) ────────────────────
function DuplicatasSection() {
  const utils = (trpc as any).useUtils()
  const { data = [], isLoading } = (trpc as any).fin.auditoria.duplicatas.useQuery(undefined, { staleTime: 0 })
  const ignorarMut = (trpc as any).fin.auditoria.ignorarDuplicata.useMutation({
    onSuccess: () => utils.fin.auditoria.duplicatas.invalidate(),
  })
  const [mostrarIgnoradas, setMostrarIgnoradas] = useState(false)

  const pares = (data as any[]).filter(p => mostrarIgnoradas || !p.ignorado)
  const pendentes = (data as any[]).filter(p => !p.ignorado).length

  return (
    <>
      <Alert type={pendentes > 0 ? 'warning' : 'info'}>
        {pendentes > 0
          ? `⚠ ${pendentes} par(es) com mesma pessoa, valor, descrição e data — confira se não é lançamento duplicado.`
          : 'Nenhuma possível duplicata encontrada no momento. ✓'}
        {' '}Sugestão: revise esta lista uma vez por semana.
      </Alert>

      {(data as any[]).some(p => p.ignorado) && (
        <div style={{ marginTop: 10 }}>
          <Btn size="sm" variant="ghost" onClick={() => setMostrarIgnoradas(v => !v)}>
            {mostrarIgnoradas ? '− Ocultar já revisadas' : `+ Mostrar já revisadas (${(data as any[]).filter(p => p.ignorado).length})`}
          </Btn>
        </div>
      )}

      <Card style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : pares.length === 0 ? (
          <EmptyState icon="✓" title="Nada para revisar" />
        ) : (
          <div>
            {pares.map(p => (
              <div key={`${p.idA}-${p.idB}`} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 18px', borderBottom: `1px solid ${C.border}`,
                opacity: p.ignorado ? 0.5 : 1,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: p.tipo === 'RECEBER' ? C.credit + '18' : C.debit + '18',
                      color: p.tipo === 'RECEBER' ? C.credit : C.debit,
                    }}>
                      {p.tipo === 'RECEBER' ? '↓ Receber' : '↑ Pagar'}
                    </span>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{p.descricao}</span>
                    {p.ignorado && <span style={{ fontSize: 10, color: C.textMuted }}>· revisado, não é duplicata</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    Títulos <strong>#{p.idA}</strong> e <strong>#{p.idB}</strong> · {p.pessoaNome ?? 'sem pessoa vinculada'} · {fmtDataBR(p.data)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{fmtBRL(p.valor)}</span>
                  {!p.ignorado && (
                    <Btn size="sm" variant="ghost" disabled={ignorarMut.isLoading}
                      onClick={() => ignorarMut.mutate({ tituloIdA: p.idA, tituloIdB: p.idB })}>
                      Não é duplicata
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

export function AuditoriaPage() {
  const [aba, setAba] = useState<'trilha' | 'duplicatas'>('duplicatas')
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['duplicatas', '👯 Duplicidades'], ['trilha', '🕵️ Trilha de Alterações']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setAba(v)} style={{
            padding: '7px 16px', borderRadius: 20, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
            border: `1px solid ${aba === v ? C.emerald : C.border}`,
            background: aba === v ? C.emerald + '18' : 'transparent',
            color: aba === v ? C.emerald : C.textMuted, transition: 'all 0.12s',
          }}>{l}</button>
        ))}
      </div>

      {aba === 'duplicatas' && <DuplicatasSection />}

      {aba === 'trilha' && <>
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
      </>}

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
