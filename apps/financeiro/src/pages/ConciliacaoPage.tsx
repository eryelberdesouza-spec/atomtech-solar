// ═══════════════════════════════════════════════════════════════════
// Conciliação bancária — fila do extrato × lançamentos do AGF
// ═══════════════════════════════════════════════════════════════════
// Importar OFX coloca as linhas numa fila; cada linha só sai dela quando é
// ligada a parcela(s), vira lançamento novo, transferência ou é ignorada.
// Nada é lançado sozinho — é isso que acaba com o "mesmo dinheiro duas vezes".

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
const chip = (c: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8,
  border: `1px solid ${c}55`, background: c + '14', color: C.text, fontSize: 12, cursor: 'pointer', textAlign: 'left',
  fontFamily: 'inherit', maxWidth: '100%',
})
const COR_SUG: Record<string, string> = {
  ja_baixado: C.emerald, aberta: C.emerald, varias_linhas: C.info, combinacao: C.info,
  parcial: C.warning, retencao: C.warning, transferencia: '#A78BFA', regra: '#A78BFA',
}

type Linha = {
  id: number; contaId: number; data: string; valor: number; descricao: string; status: string
  contraparte?: string; pessoaSugerida?: string | null; pessoaSugeridaId?: number | null
  sugestoes: any[]; ligacoes?: any[]; observacao?: string | null; conciliadoPor?: string | null
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
function ModalNovo({ linha, onClose, onFeito }: { linha: Linha; onClose: () => void; onFeito: () => void }) {
  const [descricao, setDescricao] = useState(linha.contraparte ? `${linha.valor > 0 ? 'Recebimento' : 'Pagamento'} — ${linha.contraparte}` : linha.descricao.slice(0, 120))
  const [planoId, setPlanoId] = useState('')
  const [pessoaId, setPessoaId] = useState(linha.pessoaSugeridaId ? String(linha.pessoaSugeridaId) : '')
  const [regra, setRegra] = useState(false)
  const [padrao, setPadrao] = useState(linha.contraparte || '')
  const [erro, setErro] = useState('')
  const { data: planos = [] } = trpc.fin.planoContas.list.useQuery()
  const { data: pessoas = [] } = trpc.fin.pessoa.list.useQuery()
  const criar = trpc.fin.conciliacao.criarLancamento.useMutation({ onSuccess: () => { onFeito(); onClose() }, onError: (e: any) => setErro(e.message) })
  const tipoPlano = linha.valor > 0 ? ['RECEITA', 'FINANCEIRO', 'TRANSFERENCIA'] : ['DESPESA', 'FINANCEIRO', 'TRANSFERENCIA']
  return (
    <Modal open onClose={onClose} title={`Novo lançamento — ${fmtBRLFull(linha.valor)}`} width={560}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={!descricao.trim() || criar.isLoading} onClick={() => criar.mutate({
          linhaId: linha.id, descricao: descricao.trim(), planoContasId: planoId ? Number(planoId) : null,
          pessoaId: pessoaId ? Number(pessoaId) : null, criarRegra: regra && padrao.trim().length >= 3 ? { padrao: padrao.trim() } : null,
        })}>{criar.isLoading ? 'Salvando...' : 'Lançar e conciliar'}</Btn></>}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{dataBR(linha.data)} · {linha.descricao}</div>
      {erro && <Alert type="danger">{erro}</Alert>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 11, color: C.textMuted }}>Descrição<input value={descricao} onChange={e => setDescricao(e.target.value)} style={inputSt} /></label>
        <label style={{ fontSize: 11, color: C.textMuted }}>Plano de contas
          <select value={planoId} onChange={e => setPlanoId(e.target.value)} style={inputSt}>
            <option value="">— sem classificação —</option>
            {(planos as any[]).filter(p => p.ativo && tipoPlano.includes(p.tipo)).map(p => <option key={p.id} value={p.id}>{p.codigo} · {p.nome}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 11, color: C.textMuted }}>{linha.valor > 0 ? 'Cliente' : 'Fornecedor'} (opcional)
          <select value={pessoaId} onChange={e => setPessoaId(e.target.value)} style={inputSt}>
            <option value="">—</option>
            {(pessoas as any[]).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: C.text, cursor: 'pointer' }}>
          <input type="checkbox" checked={regra} onChange={e => setRegra(e.target.checked)} />
          Criar regra: próximas linhas com este texto já vêm com esta classificação
        </label>
        {regra && <input value={padrao} onChange={e => setPadrao(e.target.value)} placeholder="Texto que identifica a linha (ex.: TARIFA COBRANÇA)" style={inputSt} />}
      </div>
    </Modal>
  )
}

// ─── Linha pendente com sugestões ─────────────────────────────────────
function LinhaPendente({ l, sel, onSel, onAlocar, onNovo, onRefresh }: { l: Linha; sel: boolean; onSel: () => void; onAlocar: () => void; onNovo: () => void; onRefresh: () => void }) {
  const [erro, setErro] = useState('')
  const onErr = (e: any) => setErro(e.message)
  const conciliar = trpc.fin.conciliacao.conciliar.useMutation({ onSuccess: onRefresh, onError: onErr })
  const transferir = trpc.fin.conciliacao.transferir.useMutation({ onSuccess: onRefresh, onError: onErr })
  const criar = trpc.fin.conciliacao.criarLancamento.useMutation({ onSuccess: onRefresh, onError: onErr })
  const ignorar = trpc.fin.conciliacao.ignorar.useMutation({ onSuccess: onRefresh, onError: onErr })
  const ocupado = conciliar.isLoading || transferir.isLoading || criar.isLoading

  const aplicar = (s: any) => {
    setErro('')
    if (s.tipo === 'transferencia') return transferir.mutate({ linhaId: l.id, linhaParId: s.linhaParId })
    if (s.tipo === 'regra') return criar.mutate({ linhaId: l.id, descricao: s.regra.descricao || s.regra.padrao, planoContasId: s.regra.planoContasId, centroCustoId: s.regra.centroCustoId, pessoaId: s.regra.pessoaId })
    conciliar.mutate({ linhaIds: s.linhaIds ?? [l.id], itens: s.itens })
  }

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${sel ? C.info : C.border}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <input type="checkbox" checked={sel} onChange={onSel} style={{ marginTop: 3 }} title="Selecionar para conciliar várias linhas juntas" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 13, color: C.text, minWidth: 0 }}>
              <span style={{ color: C.textMuted, marginRight: 8 }}>{dataBR(l.data)}</span>{l.descricao}
              {l.pessoaSugerida && <div style={{ fontSize: 11, color: C.emeraldFg, marginTop: 2 }}>👤 {l.pessoaSugerida}</div>}
            </div>
            <b style={{ color: cor(l.valor), whiteSpace: 'nowrap', fontSize: 14 }}>{fmtBRLFull(l.valor)}</b>
          </div>
          {l.sugestoes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
              {l.sugestoes.map((s, i) => (
                <button key={i} disabled={ocupado} onClick={() => aplicar(s)} style={{ ...chip(COR_SUG[s.tipo] || C.textMuted), fontWeight: i === 0 ? 700 : 400 }} title="Clique para aplicar">
                  <span>{i === 0 ? '★' : '•'}</span>
                  <span style={{ minWidth: 0 }}>{s.titulo}{s.detalhe ? <span style={{ color: C.textMuted, fontWeight: 400 }}> — {s.detalhe}</span> : null}</span>
                </button>
              ))}
            </div>
          )}
          {erro && <div style={{ marginTop: 6, fontSize: 12, color: C.danger }}>{erro}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <Btn size="sm" variant="secondary" onClick={onAlocar}>Buscar parcela…</Btn>
            <Btn size="sm" variant="secondary" onClick={onNovo}>Novo lançamento</Btn>
            <Btn size="sm" variant="ghost" onClick={() => { const m = window.prompt('Por que ignorar esta linha? (ex.: movimentação da conta de eletropostos)'); if (m && m.trim().length >= 3) ignorar.mutate({ linhaId: l.id, motivo: m.trim() }) }}>Ignorar</Btn>
          </div>
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
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [alocar, setAlocar] = useState<Linha[] | null>(null)
  const [novo, setNovo] = useState<Linha | null>(null)
  const [msgImport, setMsgImport] = useState<{ tipo: 'success' | 'danger' | 'warning'; texto: string }[]>([])
  const [importando, setImportando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busca, setBusca] = useState('')
  const [buscaDeb, setBuscaDeb] = useState('')
  const [limite, setLimite] = useState(150)
  useEffect(() => { const t = setTimeout(() => { setBuscaDeb(busca.trim()); setLimite(150) }, 400); return () => clearTimeout(t) }, [busca])

  const { data: fila, isFetching } = trpc.fin.conciliacao.fila.useQuery({ contaId: contaId!, status, limite, busca: buscaDeb || undefined }, { enabled: !!contaId, keepPreviousData: true })
  const totalFila: number = fila?.total ?? 0
  const linhas: Linha[] = fila?.linhas ?? []
  const importar = trpc.fin.conciliacao.importar.useMutation()
  const aplicarRegras = trpc.fin.conciliacao.aplicarRegras.useMutation()
  const reabrir = trpc.fin.conciliacao.reabrir.useMutation()

  const refresh = () => {
    setSel(new Set())
    utils.fin.conciliacao.fila.invalidate()
    utils.fin.conciliacao.contas.invalidate()
    utils.fin.dashboard?.resumo?.invalidate?.()
  }
  const comRegra = useMemo(() => linhas.filter(l => l.sugestoes?.[0]?.tipo === 'regra').length, [linhas])
  const selecionadas = linhas.filter(l => sel.has(l.id))
  const totalSel = selecionadas.reduce((s, l) => s + l.valor, 0)

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

  return (
    <PageWrapper>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: 0 }}>Conciliação bancária</h1>
          <p style={{ color: C.textMuted, fontSize: 12, margin: '4px 0 0', maxWidth: 640 }}>
            Importe o OFX do banco: cada linha entra na fila e só sai quando for ligada a um lançamento. Clique na sugestão ★ para aceitar,
            marque várias linhas para juntar PIX divididos, ou busque a parcela à mão.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {comRegra > 0 && status === 'pendente' && (
            <Btn variant="secondary" disabled={aplicarRegras.isLoading} onClick={async () => { const r = await aplicarRegras.mutateAsync({ contaId }); setMsgImport([{ tipo: 'success', texto: `${r.criados} lançamentos criados pelas regras${r.bloqueados ? ` (${r.bloqueados} em período fechado)` : ''}.` }]); refresh() }}>
              Aplicar regras ({comRegra})
            </Btn>
          )}
          <Btn disabled={importando || !contaId} onClick={() => fileRef.current?.click()}>{importando ? 'Importando...' : '⬆ Importar OFX'}</Btn>
          <input ref={fileRef} type="file" accept=".ofx,.qfx" multiple style={{ display: 'none' }} onChange={e => importarArquivos(e.target.files)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {contas.map(c => <CardConta key={c.contaId} c={c} ativa={c.contaId === contaId} onClick={() => { setContaSel(c.contaId); setSel(new Set()) }} />)}
      </div>
      {resumo && Math.abs(resumo.semConta) > 0.005 && (
        <Alert type="warning">Há {fmtBRLFull(resumo.semConta)} em lançamentos pagos sem conta bancária — entram no total, mas em nenhuma conta. Concilie-os pela fila (a sugestão "Já baixado" define a conta).</Alert>
      )}
      {msgImport.map((m, i) => <Alert key={i} type={m.tipo}>{m.texto}</Alert>)}

      <div style={{ display: 'flex', gap: 6, margin: '12px 0' }}>
        {(['pendente', 'conciliado', 'ignorado'] as const).map(s => (
          <button key={s} onClick={() => { setStatus(s); setSel(new Set()) }} style={{
            padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
            border: `1px solid ${status === s ? C.emerald : C.border}`, background: status === s ? C.emerald + '22' : 'transparent', color: status === s ? C.emeraldFg : C.textMuted,
          }}>{{ pendente: 'Pendentes', conciliado: 'Conciliadas', ignorado: 'Ignoradas' }[s]}</button>
        ))}
        {isFetching && <Spinner size={16} />}
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por texto ou valor" style={{ ...inputSt, width: 220, marginLeft: 'auto', padding: '6px 10px' }} />
      </div>
      {totalFila > linhas.length && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>Mostrando {linhas.length} de {totalFila} linhas (as mais antigas primeiro).</div>}

      {selecionadas.length > 1 && (
        <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 10, background: C.bgMid, border: '1px solid ' + C.info, borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: C.text }}>{selecionadas.length} linhas · total <b style={{ color: cor(totalSel) }}>{fmtBRLFull(totalSel)}</b></span>
          <Btn size="sm" disabled={new Set(selecionadas.map(l => Math.sign(l.valor))).size > 1} onClick={() => setAlocar(selecionadas)}>Conciliar juntas…</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setSel(new Set())}>Limpar seleção</Btn>
        </div>
      )}

      {!linhas.length && !isFetching && (
        <div style={{ textAlign: 'center', padding: 40, color: C.textMuted, fontSize: 13, border: '1px dashed ' + C.border, borderRadius: 12 }}>
          {buscaDeb ? 'Nenhuma linha encontrada para esta busca.' : status === 'pendente' ? 'Nenhuma linha pendente nesta conta. Importe um OFX para começar.' : 'Nada por aqui.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {status === 'pendente'
          ? linhas.map(l => (
            <LinhaPendente key={l.id} l={l} sel={sel.has(l.id)} onRefresh={refresh}
              onSel={() => setSel(s => { const n = new Set(s); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n })}
              onAlocar={() => setAlocar([l])} onNovo={() => setNovo(l)} />
          ))
          : linhas.map(l => (
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

      {totalFila > linhas.length && (
        <div style={{ textAlign: 'center', margin: '12px 0' }}>
          <Btn variant="secondary" disabled={isFetching} onClick={() => setLimite(n => Math.min(n + 150, 600))}>Carregar mais ({totalFila - linhas.length} restantes)</Btn>
        </div>
      )}

      {alocar && contaId && <ModalAlocar linhas={alocar} contaId={contaId} onClose={() => setAlocar(null)} onFeito={refresh} />}
      {novo && <ModalNovo linha={novo} onClose={() => setNovo(null)} onFeito={refresh} />}
    </PageWrapper>
  )
}
