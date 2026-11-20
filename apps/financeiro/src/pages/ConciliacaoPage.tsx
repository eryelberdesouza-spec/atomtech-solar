// ═══════════════════════════════════════════════════════════════════
// Conciliação bancária — fila do extrato × lançamentos do AGF
// ═══════════════════════════════════════════════════════════════════
// Importar OFX coloca as linhas numa fila; cada linha só sai dela quando é
// ligada a parcela(s), vira lançamento novo, transferência ou é ignorada.
// Nada é lançado sozinho — é isso que acaba com o "mesmo dinheiro duas vezes".
//
// A fila pendente é dividida em grupos pelo grau de certeza do servidor
// (`pronta`, calculado em conciliacao.router → fila): "Prontas" se confirmam
// em lote; "Escolher" pede decisão; "Sem sugestão" quase sempre é lançamento
// novo (o formulário já vem preenchido pelo histórico da contraparte).

import { useEffect, useMemo, useRef, useState } from 'react'
import { trpc } from '../lib/trpc'
import { PageWrapper, C, Btn, Modal, Spinner, Alert } from '../components/ui'
import { fmtBRLFull } from '../lib/masks'

const dataBR = (iso?: string | null) => (iso ? iso.split('-').reverse().join('/') : '')
const cor = (v: number) => (v >= 0 ? C.credit : C.debit)

const inputSt: React.CSSProperties = {
  width: '100%', background: C.bg, border: '1px solid ' + C.borderMid, borderRadius: 8,
  padding: '8px 10px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const caixaSug = (c: string): React.CSSProperties => ({
  flex: 1, minWidth: 200, padding: '6px 10px', borderRadius: 8, border: `1px solid ${c}55`, background: c + '14',
  color: C.text, fontSize: 12,
})
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, color: C.textMuted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }
const COR_SUG: Record<string, string> = {
  ja_baixado: C.emerald, aberta: C.emerald, varias_linhas: C.info, combinacao: C.info, historico: C.info,
  parcial: C.warning, retencao: C.warning, transferencia: '#A78BFA', regra: '#A78BFA',
}

type Linha = {
  id: number; contaId: number; data: string; valor: number; descricao: string; status: string
  contraparte?: string; pessoaSugerida?: string | null; pessoaSugeridaId?: number | null
  sugestoes: any[]; ligacoes?: any[]; observacao?: string | null; conciliadoPor?: string | null
  lancamentoSugerido?: { descricao: string; planoContasId: number | null; planoNome: string | null; pessoaId?: number | null; centroCustoId?: number | null; usos: number } | null
  futuro?: boolean; pronta?: boolean
}

type Grupo = 'prontas' | 'escolher' | 'sem' | 'agendadas'
const grupoDe = (l: Linha): Grupo => (l.futuro ? 'agendadas' : l.pronta ? 'prontas' : l.sugestoes.length ? 'escolher' : 'sem')
const GRUPOS: { id: Grupo; rotulo: string; cor: string; dica: string }[] = [
  { id: 'prontas', rotulo: '✅ Prontas para confirmar', cor: C.emerald,
    dica: 'Valor, data e destino batem e nenhuma outra linha disputa o mesmo lançamento. Passe o olho na lista e confirme todas de uma vez.' },
  { id: 'escolher', rotulo: '🤔 Escolher', cor: C.warning,
    dica: 'Existe sugestão, mas com dúvida: mais de uma opção parecida, pagamento parcial ou data distante. Confira a ★ — se não for ela, abra "Outras opções".' },
  { id: 'sem', rotulo: '✍ Sem sugestão', cor: C.textMuted,
    dica: 'Nada no AGF bate com estas linhas. Quase sempre é despesa ou receita que ainda não foi lançada: use "Novo lançamento" (vem preenchido) ou "Buscar parcela".' },
  { id: 'agendadas', rotulo: '📅 Agendadas', cor: C.info,
    dica: 'O banco já mostra estes lançamentos, mas com data futura. Espere a data passar para conciliar — podem mudar ou ser cancelados.' },
]

// Destinos que uma sugestão consome — duas linhas não podem usar o mesmo no lote.
const alvosDe = (l: Linha, s: any): string[] => [
  ...(s.itens ?? []).map((i: any) => `p${i.parcelaId}`),
  ...(s.linhaParId ? [`l${s.linhaParId}`] : []),
  ...((s.linhaIds ?? []).filter((id: number) => id !== l.id).map((id: number) => `l${id}`)),
]

// ─── Ajuda recolhível ─────────────────────────────────────────────────
function ComoFunciona() {
  const [aberto, setAberto] = useState(() => { try { return localStorage.getItem('concil_ajuda') !== 'fechada' } catch { return true } })
  const alternar = () => { const n = !aberto; setAberto(n); try { localStorage.setItem('concil_ajuda', n ? 'aberta' : 'fechada') } catch { /* sem storage */ } }
  return (
    <div style={{ background: C.bgCard, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
      <button onClick={alternar} style={{ ...linkBtn, color: C.text, fontWeight: 700, fontSize: 13 }}>{aberto ? '▾' : '▸'} Como funciona</button>
      {aberto && (
        <ol style={{ margin: '8px 0 2px', paddingLeft: 20, fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
          <li><b style={{ color: C.text }}>Importe o OFX</b> do banco (pode repetir o mesmo arquivo: linha já importada é ignorada).</li>
          <li>Comece por <b style={{ color: C.text }}>✅ Prontas</b>: confira a lista e clique em <b style={{ color: C.text }}>Confirmar todas</b>.</li>
          <li>Em <b style={{ color: C.text }}>🤔 Escolher</b>, clique em <b style={{ color: C.text }}>✓ Confirmar</b> se a sugestão ★ estiver certa; senão, <b style={{ color: C.text }}>Outras opções</b>.</li>
          <li>Em <b style={{ color: C.text }}>✍ Sem sugestão</b>, use <b style={{ color: C.text }}>Novo lançamento</b> (despesa/receita ainda não lançada) ou <b style={{ color: C.text }}>Buscar parcela</b>.</li>
          <li><b style={{ color: C.text }}>PIX dividido</b> (cliente pagou uma parcela em duas vezes): marque as duas linhas e clique em <b style={{ color: C.text }}>Conciliar juntas</b>.</li>
          <li>Terminou? O cartão da conta mostra se o <b style={{ color: C.text }}>saldo do AGF bate com o banco</b>.</li>
        </ol>
      )}
    </div>
  )
}

// ─── Cartão da conta (saldo AGF × banco) ──────────────────────────────
function CardConta({ c, ativa, onClick }: { c: any; ativa: boolean; onClick: () => void }) {
  const dif = c.banco?.diferenca ?? null
  const ok = dif != null && Math.abs(dif) < 1
  return (
    <button onClick={onClick} style={{
      flex: '1 1 240px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
      background: ativa ? C.bgHover : C.bgCard, border: `1px solid ${ativa ? C.emerald : C.border}`, borderRadius: 12, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{c.nome}</span>
        {c.pendentes > 0
          ? <span style={{ fontSize: 11, fontWeight: 700, color: C.warning, background: C.warning + '18', borderRadius: 10, padding: '2px 8px' }}>{c.pendentes} pendentes</span>
          : <span style={{ fontSize: 11, color: C.success }}>fila zerada</span>}
      </div>
      <div style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>Saldo no AGF</div>
      <div style={{ color: C.text, fontSize: 18, fontWeight: 800 }}>{fmtBRLFull(c.saldo)}</div>
      {c.banco ? (
        <div style={{ marginTop: 6, fontSize: 11, color: C.textMuted }}>
          Banco em {dataBR(c.banco.data)}: <b style={{ color: C.text }}>{fmtBRLFull(c.banco.saldo)}</b>
          <div style={{ marginTop: 3, fontWeight: 700, color: ok ? C.success : C.danger }}>
            {ok ? '✔ bate com o banco' : `diferença ${fmtBRLFull(dif)} (AGF ${dif > 0 ? 'acima' : 'abaixo'})`}
          </div>
        </div>
      ) : <div style={{ marginTop: 6, fontSize: 11, color: C.textDim }}>Importe um OFX para comparar com o banco</div>}
    </button>
  )
}

// ─── Modal: escolher parcelas e alocar valores ────────────────────────
function ModalAlocar({ linhas, contaId, onClose, onFeito }: { linhas: Linha[]; contaId: number; onClose: () => void; onFeito: () => void }) {
  const total = Math.round(linhas.reduce((s, l) => s + Math.abs(l.valor), 0) * 100) / 100
  const tipo = linhas[0].valor > 0 ? 'RECEBER' : 'PAGAR'
  const [termo, setTermo] = useState(linhas[0].pessoaSugerida || '')
  const [itens, setItens] = useState<{ p: any; valor: string; quitar: boolean }[]>([])
  const [erro, setErro] = useState('')
  const { data: achadas = [], isFetching } = trpc.fin.conciliacao.buscarParcelas.useQuery({ tipo, contaId, termo }, { keepPreviousData: true })
  const conciliar = trpc.fin.conciliacao.conciliar.useMutation({ onSuccess: () => { onFeito(); onClose() }, onError: (e: any) => setErro(e.message) })
  const alocado = Math.round(itens.reduce((s, i) => s + (Number(i.valor.replace(',', '.')) || 0), 0) * 100) / 100
  const resta = Math.round((total - alocado) * 100) / 100

  const adicionar = (p: any) => {
    if (itens.some(i => i.p.id === p.id)) return
    const base = p.status === 'PAGA' ? p.valorPago : p.valor
    const v = p.status === 'PAGA' ? base : Math.min(base, Math.max(resta, 0) || base)
    setItens(s => [...s, { p, valor: v.toFixed(2), quitar: false }])
  }

  return (
    <Modal open onClose={onClose} title={`Conciliar ${linhas.length > 1 ? linhas.length + ' linhas' : 'linha'} — ${fmtBRLFull(total)}`} width={760}
      footer={<>
        <span style={{ marginRight: 'auto', fontSize: 12, color: Math.abs(resta) < 0.005 ? C.success : C.warning }}>
          Alocado {fmtBRLFull(alocado)} · {Math.abs(resta) < 0.005 ? 'valores batem' : `falta ${fmtBRLFull(resta)}`}
        </span>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={Math.abs(resta) >= 0.005 || !itens.length || conciliar.isLoading}
          onClick={() => conciliar.mutate({ linhaIds: linhas.map(l => l.id), itens: itens.map(i => ({ parcelaId: i.p.id, valor: Number(i.valor.replace(',', '.')), quitar: i.quitar })) })}>
          {conciliar.isLoading ? 'Conciliando...' : 'Conciliar'}
        </Btn>
      </>}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
        {linhas.map(l => <div key={l.id}>{dataBR(l.data)} · <b style={{ color: cor(l.valor) }}>{fmtBRLFull(l.valor)}</b> · {l.descricao}</div>)}
      </div>
      {erro && <Alert type="danger">{erro}</Alert>}
      {itens.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Alocação</div>
          {itens.map((i, idx) => {
            const v = Number(i.valor.replace(',', '.')) || 0
            const menor = i.p.status === 'ABERTA' && v < i.p.valor - 0.005
            return (
              <div key={i.p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid ' + C.border, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220, fontSize: 12, color: C.text }}>
                  {i.p.descricao}{i.p.pessoaNome ? ` · ${i.p.pessoaNome}` : ''}
                  <div style={{ color: C.textMuted, fontSize: 11 }}>
                    {i.p.status === 'PAGA' ? `já baixada em ${dataBR(i.p.dataPag)} — só vincula` : `em aberto ${fmtBRLFull(i.p.valor)} · vence ${dataBR(i.p.venc)}`}
                  </div>
                </div>
                <input value={i.valor} disabled={i.p.status === 'PAGA'} onChange={e => setItens(s => s.map((x, j) => j === idx ? { ...x, valor: e.target.value } : x))}
                  style={{ ...inputSt, width: 120, textAlign: 'right' }} />
                {menor && (
                  <label style={{ fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input type="checkbox" checked={i.quitar} onChange={e => setItens(s => s.map((x, j) => j === idx ? { ...x, quitar: e.target.checked } : x))} />
                    {i.quitar ? `quitar (diferença ${fmtBRLFull(i.p.valor - v)} como desconto/retenção)` : `parcial (resto ${fmtBRLFull(i.p.valor - v)} fica em aberto)`}
                  </label>
                )}
                <button onClick={() => setItens(s => s.filter((_, j) => j !== idx))} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer' }}>✕</button>
              </div>
            )
          })}
        </div>
      )}
      <input autoFocus value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar por cliente/fornecedor, descrição ou valor" style={inputSt} />
      <div style={{ marginTop: 8, maxHeight: 280, overflowY: 'auto' }}>
        {isFetching && <div style={{ padding: 10 }}><Spinner size={18} /></div>}
        {(achadas as any[]).map(p => (
          <div key={p.id} onClick={() => adicionar(p)} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: C.text, opacity: itens.some(i => i.p.id === p.id) ? 0.4 : 1 }}
            onMouseEnter={e => (e.currentTarget.style.background = C.bgHover)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div>
              {p.descricao}{p.pessoaNome ? <span style={{ color: C.textMuted }}> · {p.pessoaNome}</span> : null}
              <div style={{ fontSize: 11, color: C.textMuted }}>{p.status === 'PAGA' ? `baixada em ${dataBR(p.dataPag)}${p.contaId ? '' : ' (sem conta)'}` : `vence ${dataBR(p.venc)}`}</div>
            </div>
            <b style={{ whiteSpace: 'nowrap' }}>{fmtBRLFull(p.status === 'PAGA' ? p.valorPago : p.valor)}</b>
          </div>
        ))}
        {!isFetching && !(achadas as any[]).length && <div style={{ padding: 10, fontSize: 12, color: C.textMuted }}>Nada encontrado. Se não existe lançamento, use "Novo lançamento".</div>}
      </div>
    </Modal>
  )
}

// ─── Modal: novo lançamento a partir da linha ─────────────────────────
// Vem preenchido com o que foi usado antes para a mesma contraparte
// (lancamentoSugerido); sem histórico, com a categoria provável pelo texto.
function ModalNovo({ linha, onClose, onFeito }: { linha: Linha; onClose: () => void; onFeito: () => void }) {
  const sug = linha.lancamentoSugerido
  const [descricao, setDescricao] = useState(sug?.descricao || (linha.contraparte ? `${linha.valor > 0 ? 'Recebimento' : 'Pagamento'} — ${linha.contraparte}` : linha.descricao.slice(0, 120)))
  const [planoId, setPlanoId] = useState(sug?.planoContasId ? String(sug.planoContasId) : '')
  const [nomePessoa, setNomePessoa] = useState(linha.pessoaSugerida || '')
  const [regra, setRegra] = useState(false)
  const [padrao, setPadrao] = useState(linha.contraparte || '')
  const [erro, setErro] = useState('')
  const { data: planos = [] } = trpc.fin.planoContas.list.useQuery()
  const { data: pessoas = [] } = trpc.fin.pessoa.list.useQuery()
  // Pessoa vinda do histórico: só se conhece o id; o nome aparece quando a lista chega.
  useEffect(() => {
    if (!nomePessoa && sug?.pessoaId) { const p = (pessoas as any[]).find(x => x.id === sug.pessoaId); if (p) setNomePessoa(p.nome) }
  }, [pessoas]) // eslint-disable-line react-hooks/exhaustive-deps
  const normNome = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
  const pessoa = nomePessoa.trim() ? (pessoas as any[]).find(p => normNome(p.nome) === normNome(nomePessoa)) : null
  const criar = trpc.fin.conciliacao.criarLancamento.useMutation({ onSuccess: () => { onFeito(); onClose() }, onError: (e: any) => setErro(e.message) })
  const tipoPlano = linha.valor > 0 ? ['RECEITA', 'FINANCEIRO', 'TRANSFERENCIA'] : ['DESPESA', 'FINANCEIRO', 'TRANSFERENCIA']
  const mesmoPlanoDoHistorico = !!sug?.planoContasId && planoId === String(sug.planoContasId)
  return (
    <Modal open onClose={onClose} title={`Novo lançamento — ${fmtBRLFull(linha.valor)}`} width={560}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={!descricao.trim() || criar.isLoading} onClick={() => criar.mutate({
          linhaId: linha.id, descricao: descricao.trim(), planoContasId: planoId ? Number(planoId) : null,
          pessoaId: pessoa?.id ?? null, centroCustoId: mesmoPlanoDoHistorico ? sug?.centroCustoId ?? null : null,
          criarRegra: regra && padrao.trim().length >= 3 ? { padrao: padrao.trim() } : null,
        })}>{criar.isLoading ? 'Salvando...' : 'Lançar e conciliar'}</Btn></>}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>{dataBR(linha.data)} · {linha.descricao}</div>
      {sug?.usos ? <div style={{ fontSize: 12, color: C.info, marginBottom: 10 }}>Preenchido como das outras {sug.usos} vez(es) para esta contraparte — confira e salve.</div> : null}
      {erro && <Alert type="danger">{erro}</Alert>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 11, color: C.textMuted }}>Descrição<input value={descricao} onChange={e => setDescricao(e.target.value)} style={inputSt} /></label>
        <label style={{ fontSize: 11, color: C.textMuted }}>Plano de contas
          <select value={planoId} onChange={e => setPlanoId(e.target.value)} style={inputSt}>
            <option value="">— sem classificação —</option>
            {(planos as any[]).filter(p => p.ativo && tipoPlano.includes(p.tipo)).map(p => <option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 11, color: C.textMuted }}>{linha.valor > 0 ? 'Cliente' : 'Fornecedor'} (opcional — digite para buscar)
          <input list="concil-pessoas" value={nomePessoa} onChange={e => setNomePessoa(e.target.value)} placeholder="Comece a digitar o nome" style={inputSt} />
          <datalist id="concil-pessoas">{(pessoas as any[]).map(p => <option key={p.id} value={p.nome} />)}</datalist>
          {nomePessoa.trim() && !pessoa && <span style={{ color: C.warning }}>Nome não encontrado no cadastro — o lançamento fica sem {linha.valor > 0 ? 'cliente' : 'fornecedor'}.</span>}
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: C.text, cursor: 'pointer' }}>
          <input type="checkbox" checked={regra} onChange={e => setRegra(e.target.checked)} />
          Criar regra: as próximas linhas com este texto já vêm prontas com esta classificação
        </label>
        {regra && <input value={padrao} onChange={e => setPadrao(e.target.value)} placeholder="Texto que identifica a linha (ex.: TARIFA COBRANÇA)" style={inputSt} />}
      </div>
    </Modal>
  )
}

// ─── Modal: ignorar com motivo ────────────────────────────────────────
const MOTIVOS_IGNORAR = [
  'Movimentação da conta de eletropostos (fora desta contabilidade)',
  'Repasse do cartão de crédito já lançado de outra forma',
  'Estorno/devolução que se anula com outra linha',
  'Linha duplicada no extrato',
]
function ModalIgnorar({ linha, onClose, onFeito }: { linha: Linha; onClose: () => void; onFeito: () => void }) {
  const [motivo, setMotivo] = useState('')
  const [outro, setOutro] = useState('')
  const [erro, setErro] = useState('')
  const ignorar = trpc.fin.conciliacao.ignorar.useMutation({ onSuccess: () => { onFeito(); onClose() }, onError: (e: any) => setErro(e.message) })
  const texto = motivo === 'outro' ? outro.trim() : motivo
  return (
    <Modal open onClose={onClose} title={`Ignorar linha — ${fmtBRLFull(linha.valor)}`} width={520}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="danger" disabled={texto.length < 3 || ignorar.isLoading} onClick={() => ignorar.mutate({ linhaId: linha.id, motivo: texto })}>{ignorar.isLoading ? 'Salvando...' : 'Ignorar linha'}</Btn></>}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>{dataBR(linha.data)} · {linha.descricao}</div>
      <Alert type="warning">Linha ignorada <b>não entra no saldo do AGF</b>. Use só para o que de fato não pertence a esta conta. Dá para desfazer na aba "Ignoradas" → Reabrir.</Alert>
      {erro && <Alert type="danger">{erro}</Alert>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {[...MOTIVOS_IGNORAR, 'outro'].map(m => (
          <label key={m} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: C.text, cursor: 'pointer' }}>
            <input type="radio" name="motivo" checked={motivo === m} onChange={() => setMotivo(m)} /> {m === 'outro' ? 'Outro motivo:' : m}
          </label>
        ))}
        {motivo === 'outro' && <input autoFocus value={outro} onChange={e => setOutro(e.target.value)} placeholder="Descreva o motivo" style={inputSt} />}
      </div>
    </Modal>
  )
}

// ─── Linha pendente: uma ação principal + "outras opções" ─────────────
function LinhaPendente({ l, sel, travado, onSel, onAplicar, onAlocar, onNovo, onIgnorar }: {
  l: Linha; sel: boolean; travado: boolean; onSel: () => void; onAplicar: (l: Linha, s: any) => Promise<unknown>
  onAlocar: () => void; onNovo: () => void; onIgnorar: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const usar = async (s: any) => {
    setErro(''); setOcupado(true)
    try { await onAplicar(l, s) } catch (e: any) { setErro(e.message); setOcupado(false) }
  }
  const [s1, ...outras] = l.sugestoes
  const bloq = travado || ocupado
  const ls = l.lancamentoSugerido
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${sel ? C.info : C.border}`, borderRadius: 10, padding: '10px 12px', opacity: ocupado ? 0.6 : 1 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <input type="checkbox" checked={sel} onChange={onSel} style={{ marginTop: 3 }} title="Selecionar (para confirmar em lote ou conciliar várias linhas juntas)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 13, color: C.text, minWidth: 0, wordBreak: 'break-word' }}>
              <span style={{ color: C.textMuted, marginRight: 8 }}>{dataBR(l.data)}</span>{l.descricao}
              {l.futuro && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: C.info, background: C.info + '18', borderRadius: 8, padding: '1px 6px' }}>AGENDADO</span>}
              {l.pessoaSugerida && <div style={{ fontSize: 11, color: C.emeraldFg, marginTop: 2 }}>👤 {l.pessoaSugerida}</div>}
            </div>
            <b style={{ color: cor(l.valor), whiteSpace: 'nowrap', fontSize: 14 }}>{fmtBRLFull(l.valor)}</b>
          </div>

          {s1 ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <div style={{ ...caixaSug(COR_SUG[s1.tipo] || C.textMuted), fontWeight: 700 }}>
                ★ {s1.titulo}{s1.detalhe ? <span style={{ color: C.textMuted, fontWeight: 400 }}> — {s1.detalhe}</span> : null}
              </div>
              <Btn size="sm" disabled={bloq} onClick={() => usar(s1)}>{ocupado ? 'Salvando...' : '✓ Confirmar'}</Btn>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <Btn size="sm" disabled={bloq} onClick={onNovo}>+ Novo lançamento{ls?.planoNome ? ` · ${ls.planoNome}` : ''}</Btn>
              <Btn size="sm" variant="secondary" disabled={bloq} onClick={onAlocar}>Buscar parcela…</Btn>
            </div>
          )}
          {erro && <div style={{ marginTop: 6, fontSize: 12, color: C.danger }}>{erro}</div>}

          <button onClick={() => setAberto(a => !a)} style={{ ...linkBtn, marginTop: 8 }}>
            {aberto ? 'Menos opções ▴' : `Outras opções${outras.length ? ` (${outras.length} sugest${outras.length > 1 ? 'ões' : 'ão'})` : ''} ▾`}
          </button>
          {aberto && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
              {outras.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={caixaSug(COR_SUG[s.tipo] || C.textMuted)}>
                    {s.titulo}{s.detalhe ? <span style={{ color: C.textMuted }}> — {s.detalhe}</span> : null}
                  </div>
                  <Btn size="sm" variant="secondary" disabled={bloq} onClick={() => usar(s)}>Usar esta</Btn>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Btn size="sm" variant="secondary" disabled={bloq} onClick={onAlocar}>Buscar parcela…</Btn>
                <Btn size="sm" variant="secondary" disabled={bloq} onClick={onNovo}>Novo lançamento</Btn>
                <Btn size="sm" variant="ghost" disabled={bloq} onClick={onIgnorar}>Ignorar…</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────
export function ConciliacaoPage() {
  const utils = trpc.useUtils()
  const { data: resumo, isLoading } = trpc.fin.conciliacao.contas.useQuery()
  const contas: any[] = resumo?.contas ?? []
  const [contaSel, setContaSel] = useState<number | null>(null)
  const contaId = contaSel ?? contas[0]?.contaId ?? null
  const [status, setStatus] = useState<'pendente' | 'conciliado' | 'ignorado'>('pendente')
  const [grupoSel, setGrupoSel] = useState<Grupo | null>(null)
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [alocar, setAlocar] = useState<Linha[] | null>(null)
  const [novo, setNovo] = useState<Linha | null>(null)
  const [ignorarL, setIgnorarL] = useState<Linha | null>(null)
  const [msgImport, setMsgImport] = useState<{ tipo: 'success' | 'danger' | 'warning'; texto: string }[]>([])
  const [importando, setImportando] = useState(false)
  const [lote, setLote] = useState<{ feitas: number; total: number; ok: number; erros: string[]; rodando: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busca, setBusca] = useState('')
  const [buscaDeb, setBuscaDeb] = useState('')
  const [limite, setLimite] = useState(150)
  useEffect(() => { const t = setTimeout(() => { setBuscaDeb(busca.trim()); setLimite(150) }, 400); return () => clearTimeout(t) }, [busca])

  // Pendentes vêm todas (até 600) para os grupos contarem a fila inteira.
  const { data: fila, isFetching } = trpc.fin.conciliacao.fila.useQuery(
    { contaId: contaId!, status, limite: status === 'pendente' ? 600 : limite, busca: buscaDeb || undefined },
    { enabled: !!contaId, keepPreviousData: true },
  )
  const totalFila: number = fila?.total ?? 0
  const linhas: Linha[] = fila?.linhas ?? []
  const importar = trpc.fin.conciliacao.importar.useMutation()
  const aplicarRegras = trpc.fin.conciliacao.aplicarRegras.useMutation()
  const reabrir = trpc.fin.conciliacao.reabrir.useMutation()
  const mConciliar = trpc.fin.conciliacao.conciliar.useMutation()
  const mTransferir = trpc.fin.conciliacao.transferir.useMutation()
  const mCriar = trpc.fin.conciliacao.criarLancamento.useMutation()

  // ATENÇÃO: nada de `?.` nos proxies do tRPC (utils.x?.y?.()) — no build de
  // produção vira `.call()` e quebra com "(intermediate value)...is not a function".
  const refresh = () => {
    setSel(new Set())
    utils.fin.conciliacao.fila.invalidate()
    utils.fin.conciliacao.contas.invalidate()
    utils.fin.dashboard.resumo.invalidate()
  }

  const aplicarSug = (l: Linha, s: any): Promise<unknown> => {
    if (s.tipo === 'transferencia') return mTransferir.mutateAsync({ linhaId: l.id, linhaParId: s.linhaParId })
    if (s.tipo === 'regra') return mCriar.mutateAsync({ linhaId: l.id, descricao: s.regra.descricao || s.regra.padrao, planoContasId: s.regra.planoContasId, centroCustoId: s.regra.centroCustoId, pessoaId: s.regra.pessoaId })
    if (s.tipo === 'historico') return mCriar.mutateAsync({ linhaId: l.id, descricao: s.lancamento.descricao, planoContasId: s.lancamento.planoContasId, centroCustoId: s.lancamento.centroCustoId, pessoaId: s.lancamento.pessoaId })
    return mConciliar.mutateAsync({ linhaIds: s.linhaIds ?? [l.id], itens: s.itens })
  }
  const aplicarUma = async (l: Linha, s: any) => { await aplicarSug(l, s); refresh() }

  // Confirma a sugestão ★ de cada linha, uma por vez. Se duas linhas
  // apontam para o mesmo lançamento, a segunda fica para decisão manual.
  const confirmarLote = async (lista: Linha[]) => {
    const usados = new Set<string>(), feitas = new Set<number>(), erros: string[] = []
    let ok = 0
    setLote({ feitas: 0, total: lista.length, ok: 0, erros: [], rodando: true })
    for (let i = 0; i < lista.length; i++) {
      const l = lista[i], s = l.sugestoes[0]
      if (s && !feitas.has(l.id)) {
        const alvos = alvosDe(l, s)
        if (alvos.some(a => usados.has(a))) erros.push(`${dataBR(l.data)} · ${fmtBRLFull(l.valor)}: outra linha deste lote já usou o mesmo lançamento — resolva à mão.`)
        else {
          try {
            await aplicarSug(l, s); ok++
            alvos.forEach(a => usados.add(a)); feitas.add(l.id)
            ;(s.linhaIds ?? []).forEach((id: number) => feitas.add(id)); if (s.linhaParId) feitas.add(s.linhaParId)
          } catch (e: any) { erros.push(`${dataBR(l.data)} · ${fmtBRLFull(l.valor)}: ${e.message}`) }
        }
      }
      setLote({ feitas: i + 1, total: lista.length, ok, erros: [...erros], rodando: true })
    }
    setLote({ feitas: lista.length, total: lista.length, ok, erros, rodando: false })
    refresh()
  }

  const comRegra = useMemo(() => linhas.filter(l => l.sugestoes?.[0]?.tipo === 'regra').length, [linhas])
  const contagem = useMemo(() => {
    const c: Record<Grupo, number> = { prontas: 0, escolher: 0, sem: 0, agendadas: 0 }
    if (status === 'pendente') for (const l of linhas) c[grupoDe(l)]++
    return c
  }, [linhas, status])
  // Grupo escolhido vazio (ex.: acabou de zerar as prontas) → vai para o próximo com linhas.
  const grupo: Grupo = grupoSel && contagem[grupoSel] > 0 ? grupoSel : (GRUPOS.find(g => contagem[g.id] > 0)?.id ?? grupoSel ?? 'prontas')
  const linhasVis = status === 'pendente' ? linhas.filter(l => grupoDe(l) === grupo) : linhas
  const infoGrupo = GRUPOS.find(g => g.id === grupo)!
  const selecionadas = linhas.filter(l => sel.has(l.id))
  const totalSel = selecionadas.reduce((s, l) => s + l.valor, 0)
  const selComSug = selecionadas.filter(l => l.sugestoes.length > 0)
  const travado = !!lote?.rodando

  const lerBase64 = (f: File) => new Promise<string>((ok, nok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = nok; r.readAsDataURL(f) })
  const importarArquivos = async (files: FileList | null) => {
    if (!files?.length || !contaId) return
    setImportando(true); setMsgImport([])
    const msgs: typeof msgImport = []
    for (const f of Array.from(files)) {
      try {
        const r = await importar.mutateAsync({ contaId, arquivo: f.name, conteudoBase64: await lerBase64(f) })
        const sal = r.saldo ? ` Banco em ${dataBR(r.saldo.data)}: ${fmtBRLFull(r.saldo.banco)} · AGF: ${fmtBRLFull(r.saldo.agf)}${Math.abs(r.saldo.diferenca) < 1 ? ' ✔' : ` · diferença ${fmtBRLFull(r.saldo.diferenca)}`}.` : ''
        msgs.push({ tipo: r.saldo && Math.abs(r.saldo.diferenca) >= 1 ? 'warning' : 'success',
          texto: `${f.name}: ${r.novas} novas linhas na fila${r.repetidas ? `, ${r.repetidas} já importadas antes` : ''}${r.autoConciliadas ? `, ${r.autoConciliadas} conciliadas automaticamente (importação antiga)` : ''}.${sal}` })
      } catch (e: any) {
        msgs.push({ tipo: 'danger', texto: `${f.name}: ${e.message}` })
      }
    }
    setMsgImport(msgs); setImportando(false); refresh()
    if (fileRef.current) fileRef.current.value = ''
  }

  if (isLoading) return <PageWrapper><Spinner /></PageWrapper>

  const pilula = (ativo: boolean, c: string): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
    border: `1px solid ${ativo ? c : C.border}`, background: ativo ? c + '22' : 'transparent', color: ativo ? C.text : C.textMuted,
  })

  return (
    <PageWrapper>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: 0 }}>Conciliação bancária</h1>
          <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0', maxWidth: 640 }}>
            Cada linha do extrato fica na fila até ser ligada a um lançamento do AGF. Nada é lançado sem a sua confirmação.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {comRegra > 0 && status === 'pendente' && (
            <Btn variant="secondary" disabled={aplicarRegras.isLoading || travado} onClick={async () => { const r = await aplicarRegras.mutateAsync({ contaId }); setMsgImport([{ tipo: 'success', texto: `${r.criados} lançamentos criados pelas regras${r.bloqueados ? ` (${r.bloqueados} em período fechado)` : ''}.` }]); refresh() }}>
              Aplicar regras ({comRegra})
            </Btn>
          )}
          <Btn disabled={importando || !contaId || travado} onClick={() => fileRef.current?.click()}>{importando ? 'Importando...' : '⬆ Importar OFX'}</Btn>
          <input ref={fileRef} type="file" accept=".ofx,.qfx" multiple style={{ display: 'none' }} onChange={e => importarArquivos(e.target.files)} />
        </div>
      </div>

      <ComoFunciona />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {contas.map(c => <CardConta key={c.contaId} c={c} ativa={c.contaId === contaId} onClick={() => { if (!travado) { setContaSel(c.contaId); setSel(new Set()); setGrupoSel(null); setLote(null) } }} />)}
      </div>
      {resumo && Math.abs(resumo.semConta) > 0.005 && (
        <Alert type="warning">Há {fmtBRLFull(resumo.semConta)} em lançamentos pagos sem conta bancária — entram no total, mas em nenhuma conta. Concilie-os pela fila (a sugestão "Já baixado" define a conta).</Alert>
      )}
      {msgImport.map((m, i) => <Alert key={i} type={m.tipo}>{m.texto}</Alert>)}

      <div style={{ display: 'flex', gap: 6, margin: '12px 0', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['pendente', 'conciliado', 'ignorado'] as const).map(s => (
          <button key={s} disabled={travado} onClick={() => { setStatus(s); setSel(new Set()) }} style={pilula(status === s, C.emerald)}>
            {{ pendente: 'Pendentes', conciliado: 'Conciliadas', ignorado: 'Ignoradas' }[s]}{s === 'pendente' && status === 'pendente' ? ` (${totalFila})` : ''}
          </button>
        ))}
        {isFetching && <Spinner size={16} />}
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por texto ou valor" style={{ ...inputSt, width: 220, marginLeft: 'auto', padding: '6px 10px' }} />
      </div>

      {lote && (
        <div style={{ marginBottom: 10 }}>
          <Alert type={lote.rodando ? 'info' : lote.erros.length ? 'warning' : 'success'}>
            {lote.rodando
              ? `Confirmando ${lote.feitas} de ${lote.total}…`
              : `${lote.ok} linha(s) conciliada(s).${lote.erros.length ? ` ${lote.erros.length} ficaram para resolver à mão:` : ''}`}
            {!lote.rodando && lote.erros.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12 }}>{lote.erros.slice(0, 15).map((e, i) => <li key={i}>{e}</li>)}</ul>
            )}
          </Alert>
          {!lote.rodando && <button style={linkBtn} onClick={() => setLote(null)}>fechar aviso</button>}
        </div>
      )}

      {status === 'pendente' && linhas.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {GRUPOS.filter(g => g.id !== 'agendadas' || contagem.agendadas > 0).map(g => (
              <button key={g.id} disabled={travado} onClick={() => { setGrupoSel(g.id); setSel(new Set()) }} style={pilula(grupo === g.id, g.cor)}>
                {g.rotulo} <span style={{ opacity: 0.8 }}>({contagem[g.id]})</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
            <span style={{ flex: '1 1 320px' }}>{infoGrupo.dica}</span>
            {grupo === 'prontas' && contagem.prontas > 0 && (
              <Btn disabled={travado} onClick={() => { if (window.confirm(`Confirmar a sugestão ★ das ${contagem.prontas} linhas prontas?`)) confirmarLote(linhasVis) }}>
                ✓ Confirmar todas ({contagem.prontas})
              </Btn>
            )}
            {linhasVis.length > 1 && (
              <button style={linkBtn} disabled={travado} onClick={() => setSel(s => s.size === linhasVis.length ? new Set() : new Set(linhasVis.map(l => l.id)))}>
                {sel.size === linhasVis.length ? 'desmarcar todas' : 'selecionar todas'}
              </button>
            )}
          </div>
        </>
      )}
      {totalFila > linhas.length && (
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>
          Mostrando {linhas.length} de {totalFila} linhas (as mais antigas primeiro){status === 'pendente' ? ' — concilie estas e as próximas aparecem.' : '.'}
        </div>
      )}

      {selecionadas.length > 0 && (
        <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: C.bgMid, border: '1px solid ' + C.info, borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: C.text }}>{selecionadas.length} selecionada(s) · total <b style={{ color: cor(totalSel) }}>{fmtBRLFull(totalSel)}</b></span>
          {selComSug.length > 0 && (
            <Btn size="sm" disabled={travado} onClick={() => confirmarLote(selComSug)}>✓ Confirmar sugestão ★ ({selComSug.length})</Btn>
          )}
          {selecionadas.length > 1 && (
            <Btn size="sm" variant="secondary" disabled={travado || new Set(selecionadas.map(l => Math.sign(l.valor))).size > 1}
              title="Para PIX dividido: várias linhas pagando a mesma parcela (ou uma linha pagando várias)" onClick={() => setAlocar(selecionadas)}>
              Conciliar juntas…
            </Btn>
          )}
          <Btn size="sm" variant="ghost" onClick={() => setSel(new Set())}>Limpar seleção</Btn>
        </div>
      )}

      {!linhasVis.length && !isFetching && (
        <div style={{ textAlign: 'center', padding: 40, color: C.textMuted, fontSize: 13, border: '1px dashed ' + C.border, borderRadius: 12 }}>
          {buscaDeb ? 'Nenhuma linha encontrada para esta busca.' : status === 'pendente' ? '🎉 Nenhuma linha pendente nesta conta. Importe um OFX novo quando quiser.' : 'Nada por aqui.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {status === 'pendente'
          ? linhasVis.map(l => (
            <LinhaPendente key={l.id} l={l} sel={sel.has(l.id)} travado={travado}
              onSel={() => setSel(s => { const n = new Set(s); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n })}
              onAplicar={aplicarUma} onAlocar={() => setAlocar([l])} onNovo={() => setNovo(l)} onIgnorar={() => setIgnorarL(l)} />
          ))
          : linhasVis.map(l => (
            <div key={l.id} style={{ background: C.bgCard, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.text }}>
                <span style={{ color: C.textMuted, marginRight: 8 }}>{dataBR(l.data)}</span>{l.descricao}
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>
                  {l.status === 'ignorado' ? `Ignorada: ${l.observacao}` : (l.ligacoes ?? []).map((g: any) => g.transferenciaId ? 'transferência entre contas' : `${g.descricao} (${fmtBRLFull(Number(g.valor))})`).join(' + ')}
                  {l.conciliadoPor ? ` · por ${l.conciliadoPor}` : ''}
                </div>
              </div>
              <b style={{ color: cor(l.valor), whiteSpace: 'nowrap' }}>{fmtBRLFull(l.valor)}</b>
              <Btn size="sm" variant="ghost" title="Volta a linha para a fila. A baixa da parcela não é desfeita." onClick={async () => { await reabrir.mutateAsync({ linhaId: l.id }); refresh() }}>Reabrir</Btn>
            </div>
          ))}
      </div>

      {status !== 'pendente' && totalFila > linhas.length && (
        <div style={{ textAlign: 'center', margin: '12px 0' }}>
          <Btn variant="secondary" disabled={isFetching} onClick={() => setLimite(n => Math.min(n + 150, 600))}>Carregar mais ({totalFila - linhas.length} restantes)</Btn>
        </div>
      )}

      {alocar && contaId && <ModalAlocar linhas={alocar} contaId={contaId} onClose={() => setAlocar(null)} onFeito={refresh} />}
      {novo && <ModalNovo linha={novo} onClose={() => setNovo(null)} onFeito={refresh} />}
      {ignorarL && <ModalIgnorar linha={ignorarL} onClose={() => setIgnorarL(null)} onFeito={refresh} />}
    </PageWrapper>
  )
}
