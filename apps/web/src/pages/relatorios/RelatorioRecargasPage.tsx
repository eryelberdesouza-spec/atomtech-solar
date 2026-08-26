// ═══════════════════════════════════════════════════════════════════
// Relatório de Recargas (Moove) — sobe o Excel exportado da plataforma
// de eletropostos, pergunta na hora o cliente/local/comissão de
// qualquer estação nova, calcula o valor líquido por transação
// (bruto − 7% Moove − comissão Atom Tech por estação) e gera um .xlsx
// por cliente com a marca Atom Tech. Tudo processado em apps/api
// (POST /moove/preview e /moove/gerar) — nunca no navegador.
// ═══════════════════════════════════════════════════════════════════

import { useRef, useState } from 'react'
import { trpc, API_BASE } from '../../lib/trpc'
import { useIsMobile } from '../../hooks/useIsMobile'
import { Spinner } from '../../components/ui'

function getToken() {
  return localStorage.getItem('atomtech_token') || ''
}

interface EstacaoPreview {
  nome: string
  numeroRecargas: number
  cadastrada: boolean
  clienteId: number | null
  clienteNome: string | null
  local: string | null
  comissaoAtomPercentual: number
}

interface EdicaoEstacao {
  clienteId: number | ''
  local: string
  comissaoAtomPercentual: string
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, color: '#7488A8',
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0C1828', border: '1px solid #1E3050',
  borderRadius: 7, padding: '9px 10px', color: '#C8D8EC',
  fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

export function RelatorioRecargasPage() {
  const isMobile = useIsMobile()

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [estacoes, setEstacoes] = useState<EstacaoPreview[] | null>(null)
  const [edicoes, setEdicoes] = useState<Record<string, EdicaoEstacao>>({})
  const [carregandoPreview, setCarregandoPreview] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<{ clienteId: number; clienteNome: string; relatorioId: number; arquivoNome: string }[] | null>(null)

  const arquivoRef = useRef<HTMLInputElement>(null)

  const { data: clientesData, isLoading: carregandoClientes } = (trpc as any).cliente.list.useQuery({ porPagina: 200 })
  const clientes: any[] = (clientesData?.data ?? []).filter((c: any) => !c.cancelado)

  const { data: historico = [], isLoading: carregandoHistorico, refetch: refetchHistorico } =
    (trpc as any).moove.historico.list.useQuery(undefined)

  const chaveEdicao = (nome: string, campo: keyof EdicaoEstacao, valor: any) => {
    setEdicoes(prev => ({ ...prev, [nome]: { ...prev[nome], [campo]: valor } }))
  }

  const selecionarArquivo = async (file: File | null) => {
    setErro('')
    setResultado(null)
    setEstacoes(null)
    setEdicoes({})
    setArquivo(file)
    if (!file) return

    setCarregandoPreview(true)
    try {
      const form = new FormData()
      form.append('arquivo', file)
      const resp = await fetch(`${API_BASE}/moove/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      if (!resp.ok) {
        let detalhe = `HTTP ${resp.status}`
        try { detalhe = (await resp.json())?.error ?? detalhe } catch { /* corpo não-JSON */ }
        throw new Error(detalhe)
      }
      const data = await resp.json()
      const lista: EstacaoPreview[] = data.estacoes
      setEstacoes(lista)

      const iniciais: Record<string, EdicaoEstacao> = {}
      for (const e of lista) {
        iniciais[e.nome] = {
          clienteId: e.clienteId ?? '',
          local: e.local ?? '',
          comissaoAtomPercentual: String(e.comissaoAtomPercentual),
        }
      }
      setEdicoes(iniciais)
    } catch (e: any) {
      setErro(e.message || 'Falha ao ler o arquivo')
    } finally {
      setCarregandoPreview(false)
    }
  }

  const todasEstacoesPreenchidas = !!estacoes && estacoes.every(e => !!edicoes[e.nome]?.clienteId)

  const gerar = async () => {
    setErro('')
    setResultado(null)
    if (!arquivo || !estacoes) return

    const mapeamentos = estacoes.map(e => ({
      nomeEstacao: e.nome,
      clienteId: Number(edicoes[e.nome].clienteId),
      local: edicoes[e.nome].local || undefined,
      comissaoAtomPercentual: Number(edicoes[e.nome].comissaoAtomPercentual.replace(',', '.')) || 0,
    }))

    setGerando(true)
    try {
      const form = new FormData()
      form.append('arquivo', arquivo)
      form.append('mapeamentos', JSON.stringify(mapeamentos))

      const resp = await fetch(`${API_BASE}/moove/gerar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      if (!resp.ok) {
        let detalhe = `HTTP ${resp.status}`
        try { detalhe = (await resp.json())?.error ?? detalhe } catch { /* corpo não-JSON */ }
        throw new Error(detalhe)
      }
      const data = await resp.json()
      setResultado(data.relatorios)
      setArquivo(null)
      setEstacoes(null)
      setEdicoes({})
      if (arquivoRef.current) arquivoRef.current.value = ''
      refetchHistorico()
    } catch (e: any) {
      setErro(e.message || 'Falha ao gerar relatório')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div style={{ padding: isMobile ? '16px 14px' : '24px 28px', maxWidth: 760 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: '#E2EAF5', fontSize: isMobile ? 17 : 20, fontWeight: 800, margin: 0 }}>
          🔌 Relatório de Recargas
        </h1>
        <p style={{ color: '#7488A8', fontSize: 11, margin: '2px 0 0' }}>
          Sobe o Excel exportado da Moove e gera o relatório semanal por cliente, com a marca
          Atom Tech, gráfico de horários e valor líquido já calculado
        </p>
      </div>

      <div style={{ background: '#111D2E', border: '1px solid #1E3050', borderRadius: 12, padding: isMobile ? 16 : 22, marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Excel exportado da Moove</label>
          <input
            ref={arquivoRef}
            type="file"
            accept=".xlsx"
            onChange={e => selecionarArquivo(e.target.files?.[0] ?? null)}
            style={inputStyle}
          />
        </div>

        {carregandoPreview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7488A8', fontSize: 12 }}>
            <Spinner size={14} /> Lendo arquivo...
          </div>
        )}

        {erro && (
          <div style={{ background: '#F8514918', border: '1px solid #F8514940', borderRadius: 8, padding: '8px 12px', color: '#F85149', fontSize: 12, marginBottom: 14 }}>
            {erro}
          </div>
        )}

        {estacoes && estacoes.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ color: '#C8D8EC', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              {estacoes.length} estação(ões) encontrada(s) no arquivo
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {estacoes.map(e => (
                <div key={e.nome} style={{ background: '#0C1828', border: '1px solid #1E3050', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ color: '#E2EAF5', fontSize: 12.5, fontWeight: 700 }}>{e.nome}</span>
                    <span style={{ color: '#7488A8', fontSize: 11 }}>{e.numeroRecargas} recarga(s)</span>
                  </div>
                  {!e.cadastrada && (
                    <div style={{ color: '#F5A623', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                      Estação nova — preencha os dados abaixo
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr 0.7fr', gap: 8 }}>
                    <div>
                      <label style={labelStyle}>Cliente (proprietário)</label>
                      {carregandoClientes ? (
                        <div style={{ color: '#7488A8', fontSize: 12 }}>Carregando...</div>
                      ) : (
                        <select
                          value={edicoes[e.nome]?.clienteId ?? ''}
                          onChange={ev => chaveEdicao(e.nome, 'clienteId', ev.target.value ? parseInt(ev.target.value) : '')}
                          style={inputStyle}
                        >
                          <option value="">Selecione...</option>
                          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Local (opcional)</label>
                      <input
                        value={edicoes[e.nome]?.local ?? ''}
                        onChange={ev => chaveEdicao(e.nome, 'local', ev.target.value)}
                        placeholder="ex.: Águas Claras, DF"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Comissão Atom Tech (%)</label>
                      <input
                        value={edicoes[e.nome]?.comissaoAtomPercentual ?? '10'}
                        onChange={ev => chaveEdicao(e.nome, 'comissaoAtomPercentual', ev.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={gerar}
              disabled={gerando || !todasEstacoesPreenchidas}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: gerando || !todasEstacoesPreenchidas ? '#F5A62360' : '#F5A623', color: '#0C1421',
                cursor: gerando || !todasEstacoesPreenchidas ? 'default' : 'pointer', fontSize: 13, fontWeight: 700,
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {gerando && <Spinner size={14} />}
              {gerando ? 'Gerando relatório(s)...' : 'Gerar relatório(s)'}
            </button>
            {!todasEstacoesPreenchidas && (
              <div style={{ color: '#7488A8', fontSize: 11, marginTop: 8 }}>
                Selecione o cliente de todas as estações para habilitar a geração
              </div>
            )}
          </div>
        )}

        {resultado && resultado.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed #1E3050' }}>
            <div style={{ color: '#3EBB7A', fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>
              {resultado.length} relatório(s) gerado(s):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {resultado.map(r => (
                <a
                  key={r.relatorioId}
                  href={`${API_BASE}/moove/historico/${r.relatorioId}/download?token=${encodeURIComponent(getToken())}`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#0C1828', borderRadius: 8, textDecoration: 'none' }}
                >
                  <span style={{ color: '#C8D8EC', fontSize: 12.5 }}>{r.clienteNome}</span>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: '#3EBB7A18', color: '#3EBB7A', letterSpacing: '0.02em' }}>
                    ✓ Baixar
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: '#111D2E', border: '1px solid #1E3050', borderRadius: 12, padding: isMobile ? 16 : 22 }}>
        <div style={{ color: '#C8D8EC', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Últimos relatórios gerados</div>
        {carregandoHistorico ? (
          <div style={{ color: '#7488A8', fontSize: 12 }}>Carregando histórico...</div>
        ) : historico.length === 0 ? (
          <div style={{ color: '#7488A8', fontSize: 12 }}>Nenhum relatório gerado ainda</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {historico.map((h: any) => (
              <a
                key={h.id}
                href={`${API_BASE}/moove/historico/${h.id}/download?token=${encodeURIComponent(getToken())}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#0C1828', borderRadius: 8, textDecoration: 'none' }}
              >
                <span style={{ color: '#C8D8EC', fontSize: 12.5 }}>{h.clienteNome}</span>
                <span style={{ color: '#7488A8', fontSize: 11 }}>
                  {new Date(h.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
