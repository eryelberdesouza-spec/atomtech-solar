import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import { formatDate } from '../../lib/utils'
import { Btn, Badge, PageWrapper, Spinner, C } from '../../components/ui'
import { NovaPropostaDropdown } from '../../components/ui/NovaPropostaDropdown'
import { useIsMobile } from '../../hooks/useIsMobile'

type StatusFiltro = 'todos' | 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'expirada'

const STATUS_FILTROS: { id: StatusFiltro; label: string; color: string }[] = [
  { id: 'todos',    label: 'Todas',    color: '#9FB0C9' },
  { id: 'rascunho', label: 'Rascunho', color: '#8B949E' },
  { id: 'enviada',  label: 'Enviada',  color: '#58A6FF' },
  { id: 'aceita',   label: 'Aceita',   color: '#3EBB7A' },
  { id: 'recusada', label: 'Recusada', color: '#F85149' },
  { id: 'expirada', label: 'Expirada', color: '#D29922' },
]

type Periodo = 'mes' | 'quinzena' | 'ano' | 'tudo'
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'mes',      label: 'Mês atual'    },
  { id: 'quinzena', label: 'Quinzena'     },
  { id: 'ano',      label: 'Este ano'     },
  { id: 'tudo',     label: 'Todo período' },
]

// Data de corte no fuso de quem olha a tela — o servidor roda em UTC, e
// calcular lá erraria a virada do mês pra quem está em -03.
function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function desdeDoPeriodo(periodo: Periodo): string | undefined {
  const d = new Date()
  if (periodo === 'tudo') return undefined
  if (periodo === 'mes') return isoLocal(new Date(d.getFullYear(), d.getMonth(), 1))
  if (periodo === 'ano') return isoLocal(new Date(d.getFullYear(), 0, 1))
  const q = new Date(); q.setDate(q.getDate() - 15); return isoLocal(q)
}

function fmtBRL(v: number): string {
  if (!v) return '—'
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const STATUS_COLOR: Record<string, string> = {
  rascunho: '#8B949E',
  enviada:  '#58A6FF',
  aceita:   '#3EBB7A',
  recusada: '#F85149',
  expirada: '#D29922',
}

export function PropostasPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [searchParams, setSearchParams] = useSearchParams()
  const filtro = (searchParams.get('status') as StatusFiltro) ?? 'todos'
  const busca  = searchParams.get('q') ?? ''
  const setFiltro = (v: StatusFiltro) => {
    v === 'todos' ? sessionStorage.removeItem('propostas_status') : sessionStorage.setItem('propostas_status', v)
    setSearchParams(p => { const n = new URLSearchParams(p); v === 'todos' ? n.delete('status') : n.set('status', v); return n }, { replace: true })
  }
  const setBusca  = (v: string) => {
    v ? sessionStorage.setItem('propostas_busca', v) : sessionStorage.removeItem('propostas_busca')
    setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('q', v) : n.delete('q'); return n }, { replace: true })
  }
  // Restaura busca e filtro salvos ao navegar pelo menu (sem parâmetros na URL)
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    let changed = false
    if (!params.get('q')) {
      const saved = sessionStorage.getItem('propostas_busca')
      if (saved) { params.set('q', saved); changed = true }
    }
    if (!params.get('status')) {
      const saved = sessionStorage.getItem('propostas_status')
      if (saved && saved !== 'todos') { params.set('status', saved); changed = true }
    }
    if (changed) setSearchParams(params, { replace: true })
  }, [])

  // Busca com atraso curto pra não disparar uma consulta por tecla digitada.
  const [buscaAdiada, setBuscaAdiada] = useState(busca)
  useEffect(() => {
    const t = setTimeout(() => setBuscaAdiada(busca), 300)
    return () => clearTimeout(t)
  }, [busca])

  // ── Resumo comercial (veio do Dashboard em 2026-09-09) ──────────────────
  // O período governa a tela INTEIRA: resumo, contadores por status e lista.
  // Padrão "Todo período" de propósito — recorte que esconde parte da base
  // por padrão já custou caro aqui antes (proposta antiga que não aparecia
  // em busca nenhuma). Quem quer a leitura do mês clica em "Mês atual".
  const [periodo, setPeriodo] = useState<Periodo>('tudo')
  const desdePeriodo = useMemo(() => desdeDoPeriodo(periodo), [periodo])

  const POR_PAGINA = 30
  const [pagina, setPagina] = useState(1)
  // Trocar busca ou status reinicia a paginação — senão a pessoa fica presa
  // numa página que não existe mais no novo recorte e vê uma lista vazia.
  useEffect(() => { setPagina(1) }, [buscaAdiada, filtro, periodo])

  // Busca, filtro de status, contagem e total vêm do SERVIDOR. Antes a tela
  // baixava as 100 mais recentes e filtrava no navegador: proposta mais
  // antiga que isso não era encontrada de jeito nenhum (caso da
  // AT-2026-06046, de junho), e os cards por status contavam só o pedaço
  // baixado, mostrando número parcial como se fosse o total.
  // Modo "Arquivadas": lista só o que foi arquivado, com opção de restaurar.
  const verArquivadas = searchParams.get('arquivadas') === '1'
  const setVerArquivadas = (v: boolean) => {
    setSearchParams(p => {
      const n = new URLSearchParams(p)
      v ? n.set('arquivadas', '1') : n.delete('arquivadas')
      n.delete('status')
      return n
    }, { replace: true })
    setPagina(1)
  }

  // Buscar SEMPRE varre a base inteira, ignorando o período. Com o recorte
  // aplicado à busca, procurar "ADRIANA" em "Mês atual" devolvia zero, mesmo
  // existindo a proposta em agosto — a mesma armadilha da AT-2026-06046, só
  // que por outro caminho. Quem digita um nome quer achar, não filtrar.
  const buscando = !!buscaAdiada
  const desde = buscando ? undefined : desdePeriodo

  const utils = trpc.useContext()
  const desarquivar = (trpc as any).proposta.desarquivar.useMutation({
    onSuccess: () => utils.proposta.list.invalidate(),
    onError: (e: any) => alert('Erro ao restaurar: ' + (e?.message ?? 'Tente novamente')),
  })

  const { data, isLoading } = trpc.proposta.list.useQuery({
    isTemplate: false,
    porPagina: POR_PAGINA,
    pagina,
    ...(desde ? { desde } : {}),
    ...(verArquivadas ? { arquivadas: true } : {}),
    ...(!verArquivadas && filtro !== 'todos' ? { status: filtro } : {}),
    ...(buscaAdiada ? { busca: buscaAdiada } : {}),
  } as any)

  // Valores do período. Os contadores por status já vêm do `list` acima —
  // aqui entram só os valores em reais e a conversão, que não estavam na tela.
  const { data: resumo } = (trpc as any).proposta.resumo.useQuery(
    { ...(desde ? { desde } : {}) },
    { enabled: !verArquivadas },
  )
  const { data: aVencer } = (trpc as any).proposta.aVencer.useQuery(
    { dias: 7 },
    { enabled: !verArquivadas },
  )
  const propostasAVencer: any[] = aVencer ?? []

  const filtradas = data?.data ?? []
  const total = (data as any)?.total ?? 0
  const totalGeral = (data as any)?.totalGeral ?? 0
  const porStatus: Record<string, number> = (data as any)?.porStatus ?? {}
  const contagem = STATUS_FILTROS.slice(1).reduce((acc, s) => ({
    ...acc, [s.id]: porStatus[s.id] ?? 0,
  }), {} as Record<string, number>)

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const primeiroDaPagina = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1
  const ultimoDaPagina = Math.min(pagina * POR_PAGINA, total)

  return (
    <div style={{ padding: isMobile ? '16px 14px' : '24px 32px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ color: '#E2EAF5', fontSize: isMobile ? 17 : 20, fontWeight: 800, margin: '0 0 4px' }}>Propostas</h2>
          <p style={{ color: '#7488A8', fontSize: 12, margin: 0 }}>
            {verArquivadas
              ? `${totalGeral} proposta${totalGeral !== 1 ? 's' : ''} arquivada${totalGeral !== 1 ? 's' : ''}`
              : `${totalGeral} proposta${totalGeral !== 1 ? 's' : ''} no total`}
            {buscaAdiada ? ` · ${total} encontrada${total !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setVerArquivadas(!verArquivadas)}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1px solid ${verArquivadas ? '#F5A623' : '#1E3050'}`,
              background: verArquivadas ? '#F5A62318' : 'transparent',
              color: verArquivadas ? '#F5A623' : '#7488A8',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{verArquivadas ? '← Voltar às ativas' : '📦 Arquivadas'}</button>
          {!verArquivadas && <NovaPropostaDropdown />}
        </div>
      </div>

      {/* Resumo comercial — período governa a tela inteira (resumo, cards e lista) */}
      {!verArquivadas && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
            {PERIODOS.map(p => (
              <button key={p.id} onClick={() => setPeriodo(p.id)} disabled={buscando}
                style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                  border: `1px solid ${!buscando && periodo === p.id ? '#F5A623' : '#1E3050'}`,
                  background: !buscando && periodo === p.id ? '#F5A62318' : 'transparent',
                  color: !buscando && periodo === p.id ? '#F5A623' : '#7488A8',
                  cursor: buscando ? 'default' : 'pointer', fontFamily: 'inherit',
                  opacity: buscando ? 0.45 : 1,
                }}>{p.label}</button>
            ))}
            {buscando && (
              <span style={{ color: '#F5A623', fontSize: 11.5, fontWeight: 600, marginLeft: 4 }}>
                🔍 buscando em todo o período
              </span>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: 1, background: '#1E3050', border: '1px solid #1E3050',
            borderRadius: 10, overflow: 'hidden',
          }}>
            {[
              { label: 'Volume orçado',  valor: fmtBRL(resumo?.valorTotal ?? 0),      sub: `${resumo?.total ?? 0} propostas`,  cor: '#E2EAF5' },
              { label: 'Aguardando',     valor: fmtBRL(resumo?.valorAguardando ?? 0), sub: `${resumo?.aguardando ?? 0} enviadas`, cor: '#58A6FF' },
              // "Aceitas" responde QUANTO FECHAMOS no período — por data de
              // aceite. Medir por emissão subnotifica: em setembro/2026 havia
              // 1 proposta fechada (emitida antes) e o card mostrava 0.
              // Enquanto sobrar aceita sem data de aceite (histórico anterior
              // a 31/08/2026), cai na coorte por emissão, que é completa, e
              // o rótulo diz qual base está sendo usada.
              ...(() => {
                const semData = resumo?.aceitasSemDataAceite ?? 0
                const porFechamento = semData === 0
                return [{
                  label: 'Aceitas',
                  valor: fmtBRL(porFechamento ? (resumo?.valorFechadas ?? 0) : (resumo?.valorAceitas ?? 0)),
                  sub: porFechamento
                    ? `${resumo?.fechadas ?? 0} fechada${(resumo?.fechadas ?? 0) !== 1 ? 's' : ''} no período`
                    : `${resumo?.aceitas ?? 0} por emissão`,
                  cor: '#3EBB7A',
                }]
              })(),
              // Conversão é da COORTE: das emitidas no período, quantas
              // fecharam. Base diferente da de cima de propósito — por isso o
              // rótulo diz "emitidas".
              { label: 'Conversão',      valor: `${resumo?.conversao ?? 0}%`,         sub: `${resumo?.aceitas ?? 0} de ${resumo?.total ?? 0} emitidas`, cor: '#BC8CFF' },
            ].map(k => (
              <div key={k.label} style={{ background: '#111D2E', padding: isMobile ? '10px 12px' : '12px 16px' }}>
                <div style={{ color: '#6A80A2', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{k.label}</div>
                <div style={{ color: k.cor, fontSize: isMobile ? 15 : 17, fontWeight: 800, marginTop: 3 }}>{k.valor}</div>
                <div style={{ color: '#6A80A2', fontSize: 11, marginTop: 1 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Vencimento não segue o período: é sempre sobre o que vem à frente */}
          {propostasAVencer.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              marginTop: 10, padding: '9px 14px', borderRadius: 9,
              background: '#2A1F0B', border: '1px solid #D2992240', borderLeft: '3px solid #D29922',
            }}>
              <span style={{ fontSize: 13 }}>⏰</span>
              <span style={{ color: '#F0D48A', fontSize: 12.5, fontWeight: 700 }}>
                {propostasAVencer.length} vencendo em até 7 dias
              </span>
              <span style={{ color: '#A8905C', fontSize: 11.5, flex: 1, minWidth: 140 }}>
                {propostasAVencer.slice(0, 3).map((p: any) => p.numero).join(' · ')}
                {propostasAVencer.length > 3 ? ` +${propostasAVencer.length - 3}` : ''}
              </span>
              <button
                onClick={() => { setPeriodo('tudo'); setFiltro('enviada') }}
                style={{
                  padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                  border: '1px solid #D2992255', background: 'transparent',
                  color: '#D29922', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >Ver enviadas →</button>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {!isLoading && totalGeral > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
          {STATUS_FILTROS.slice(1).map(s => (
            <button
              key={s.id}
              onClick={() => setFiltro(filtro === s.id ? 'todos' : s.id)}
              style={{
                background: filtro === s.id ? s.color + '18' : '#111D2E',
                border: `1px solid ${filtro === s.id ? s.color + '60' : '#1E3050'}`,
                borderRadius: 10, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: filtro === s.id ? s.color : '#E2EAF5', lineHeight: 1 }}>
                {contagem[s.id] ?? 0}
              </div>
              <div style={{ fontSize: 10, color: filtro === s.id ? s.color : '#7488A8', marginTop: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {s.label}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Busca */}
      <div style={{ marginBottom: 14 }}>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por número, cliente ou título..."
          style={{
            width: '100%', maxWidth: isMobile ? '100%' : 360,
            padding: '9px 14px', borderRadius: 9, boxSizing: 'border-box',
            background: '#111D2E', border: '1px solid #1E3050',
            color: '#E2EAF5', fontSize: 13, outline: 'none',
          }}
          onFocus={e => ((e.currentTarget as HTMLInputElement).style.borderColor = '#F5A623')}
          onBlur={e => ((e.currentTarget as HTMLInputElement).style.borderColor = '#1E3050')}
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #1E3050', borderTopColor: '#F5A623', animation: 'spin 0.8s linear infinite' }} />
          <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
        </div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#7488A8' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <p style={{ fontSize: 15, color: '#9FB0C9', margin: 0 }}>
            {verArquivadas
              ? (busca ? 'Nenhuma proposta arquivada encontrada com esta busca.' : 'Nenhuma proposta arquivada.')
              : busca || filtro !== 'todos'
                ? 'Nenhuma proposta encontrada com este filtro.'
                : 'Nenhuma proposta criada ainda.'}
          </p>
          {verArquivadas && !busca && (
            <p style={{ fontSize: 12.5, color: '#6A80A2', margin: '10px 0 0' }}>
              Propostas arquivadas saem das listagens e dos relatórios, mas continuam guardadas e podem ser restauradas aqui.
            </p>
          )}
          {!verArquivadas && !busca && filtro === 'todos' && (
            <button
              onClick={() => navigate('/propostas/nova')}
              style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #F5A623, #E8720C)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >+ Criar Proposta</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Cabeçalho da tabela — só desktop */}
          {!isMobile && (
            <div style={{
              display: 'grid', gridTemplateColumns: '140px 1fr 120px 100px 36px',
              padding: '6px 20px', gap: 12,
            }}>
              {['Nº Proposta', 'Cliente', 'Status', 'Data', ''].map(h => (
                <span key={h} style={{ fontSize: 10, color: '#6A80A2', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
              ))}
            </div>
          )}

          {filtradas.map(p => {
            const cor = STATUS_COLOR[p.status] ?? '#8B949E'
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/propostas/${p.id}`)}
                style={{
                  display: isMobile ? 'flex' : 'grid',
                  flexDirection: isMobile ? 'column' : undefined,
                  gridTemplateColumns: isMobile ? undefined : '140px 1fr 120px 100px 36px',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: isMobile ? 6 : 12,
                  padding: isMobile ? '12px 14px' : '13px 20px',
                  background: '#111D2E',
                  border: '1px solid #1E3050',
                  borderLeft: `3px solid ${cor}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {/* Linha superior mobile: número + badge + data */}
                {isMobile ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#F5A623', fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{p.numero}</span>
                        {p.tipoProposta === 'servico_geral'
                          ? <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#2D9C4E20', color: '#2D9C4E', textTransform: 'uppercase' }}>Serviço</span>
                          : <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#F5A62320', color: '#F5A623', textTransform: 'uppercase' }}>Solar</span>
                        }
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Badge status={p.status} />
                        <span style={{ color: '#6A80A2', fontSize: 18 }}>›</span>
                      </div>
                    </div>
                    <div style={{ color: '#C8D8EC', fontSize: 14, fontWeight: 600 }}>{p.clienteNome}</div>
                    <div style={{ color: '#7488A8', fontSize: 11 }}>
                      {formatDate(p.dataEmissao)}
                      {p.tituloServico && ` · ${p.tituloServico}`}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span style={{ color: '#F5A623', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{p.numero}</span>
                      <div style={{ marginTop: 3 }}>
                        {p.tipoProposta === 'servico_geral'
                          ? <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#2D9C4E20', color: '#2D9C4E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Serviço</span>
                          : <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#F5A62320', color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Solar</span>
                        }
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#C8D8EC', fontSize: 13, fontWeight: 600 }}>{p.clienteNome}</div>
                      {(p.tituloServico || p.clienteEstado) && <div style={{ color: '#6A80A2', fontSize: 11, marginTop: 1 }}>{p.tituloServico || p.clienteEstado}</div>}
                    </div>
                    <Badge status={p.status} />
                    <span style={{ color: '#7488A8', fontSize: 12 }}>{formatDate(p.dataEmissao)}</span>
                    {verArquivadas ? (
                      <button
                        onClick={e => {
                          e.stopPropagation()  // senão o clique abre a proposta
                          if (window.confirm(`Restaurar a proposta ${p.numero}?`)) desarquivar.mutate({ id: p.id })
                        }}
                        title="Restaurar"
                        style={{
                          padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: '1px solid #2D9C4E60', background: '#2D9C4E14',
                          color: '#3EBB7A', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                        }}
                      >↩ Restaurar</button>
                    ) : (
                      <span style={{ color: '#6A80A2', fontSize: 18 }}>›</span>
                    )}
                  </>
                )}
              </div>
            )
          })}

          {/* Paginação — sempre mostra o intervalo e o total, pra nunca ficar
              a dúvida de estar vendo a lista inteira ou só um pedaço dela. */}
          {total > POR_PAGINA && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, flexWrap: 'wrap', marginTop: 10, padding: '4px 2px',
            }}>
              <span style={{ color: '#7488A8', fontSize: 12 }}>
                Mostrando {primeiroDaPagina}–{ultimoDaPagina} de {total}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina <= 1}
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: '1px solid #1E3050', background: 'transparent',
                    color: pagina <= 1 ? '#3D5170' : '#C8D8EC',
                    cursor: pagina <= 1 ? 'default' : 'pointer', fontFamily: 'inherit',
                  }}
                >← Anterior</button>
                <span style={{ color: '#7488A8', fontSize: 12, minWidth: 76, textAlign: 'center' }}>
                  {pagina} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina >= totalPaginas}
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: '1px solid #1E3050', background: 'transparent',
                    color: pagina >= totalPaginas ? '#3D5170' : '#C8D8EC',
                    cursor: pagina >= totalPaginas ? 'default' : 'pointer', fontFamily: 'inherit',
                  }}
                >Próxima →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
