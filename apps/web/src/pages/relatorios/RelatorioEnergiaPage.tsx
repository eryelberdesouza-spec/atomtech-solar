// ═══════════════════════════════════════════════════════════════════
// Relatório de Energia — gera o .pptx mensal de gestão de energia solar
// a partir da fatura (Neoenergia) + export do GDASH. Chama o serviço
// interno apps/relatorio-energia via proxy autenticado em apps/api
// (POST /relatorio-energia/gerar) — o AGO nunca fala direto com o
// serviço Python nem com a Anthropic. Cliente vem do cadastro real do
// AGO; dados técnicos (potência, quebra do nome na capa) ficam numa
// config 1:1 por cliente, e cada geração fica salva no histórico.
// ═══════════════════════════════════════════════════════════════════

import { useRef, useState } from 'react'
import { trpc, API_BASE } from '../../lib/trpc'
import { useIsMobile } from '../../hooks/useIsMobile'
import { Spinner } from '../../components/ui'

function getToken() {
  return localStorage.getItem('atomtech_token') || ''
}

const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
function formatarMes(chave: string) {
  const [ano, mes] = chave.split('-')
  return `${MESES_PT[parseInt(mes) - 1]}/${ano}`
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

export function RelatorioEnergiaPage() {
  const isMobile = useIsMobile()
  const utils = (trpc as any).useUtils()

  const [clienteId, setClienteId] = useState<number | ''>('')
  const [fatura, setFatura] = useState<File | null>(null)
  const [gdash, setGdash] = useState<File | null>(null)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [config, setConfig] = useState({ potenciaKwp: '', nomeL1: '', nomeL2: '', nomeL3: '', nomeL4: '' })

  const faturaRef = useRef<HTMLInputElement>(null)
  const gdashRef = useRef<HTMLInputElement>(null)

  const { data: clientesData, isLoading: carregandoClientes } = (trpc as any).cliente.list.useQuery({ porPagina: 200 })
  const clientes: any[] = (clientesData?.data ?? []).filter((c: any) => !c.cancelado)

  const { data: configSalva, isLoading: carregandoConfig } = (trpc as any).relatorioEnergia.config.get.useQuery(
    { clienteId },
    { enabled: !!clienteId },
  )
  const { data: historico = [], isLoading: carregandoHistorico } = (trpc as any).relatorioEnergia.historico.list.useQuery(
    { clienteId },
    { enabled: !!clienteId },
  )

  const salvarConfigMut = (trpc as any).relatorioEnergia.config.upsert.useMutation({
    onSuccess: () => utils.relatorioEnergia.config.get.invalidate({ clienteId }),
    onError: (e: any) => setErro(e.message ?? 'Erro ao salvar dados técnicos'),
  })

  const selecionarCliente = (id: string) => {
    setErro('')
    setSucesso('')
    setClienteId(id ? parseInt(id) : '')
  }

  const salvarConfig = () => {
    setErro('')
    if (!clienteId) return
    if (!config.potenciaKwp.trim()) return setErro('Informe a potência instalada (ex.: 32,49 kWp)')
    if (!config.nomeL1.trim()) return setErro('Informe ao menos a primeira linha do nome')
    salvarConfigMut.mutate({ clienteId, ...config })
  }

  const gerar = async () => {
    setErro('')
    setSucesso('')
    if (!clienteId) return setErro('Selecione o cliente')
    if (!fatura) return setErro('Envie o PDF da fatura de energia')
    if (!gdash) return setErro('Envie o PDF do export do GDASH')

    setGerando(true)
    try {
      const form = new FormData()
      form.append('clienteId', String(clienteId))
      form.append('fatura', fatura)
      form.append('gdash', gdash)

      const resp = await fetch(`${API_BASE}/relatorio-energia/gerar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })

      if (!resp.ok) {
        let detalhe = `HTTP ${resp.status}`
        try { detalhe = (await resp.json())?.error ?? detalhe } catch { /* corpo não-JSON */ }
        throw new Error(detalhe)
      }

      const blob = await resp.blob()
      const contentDisposition = resp.headers.get('content-disposition')
      const nome = contentDisposition?.match(/filename="(.+)"/)?.[1] ?? 'relatorio.pptx'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nome
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30_000)

      setSucesso(`Relatório gerado: ${nome}`)
      setFatura(null)
      setGdash(null)
      if (faturaRef.current) faturaRef.current.value = ''
      if (gdashRef.current) gdashRef.current.value = ''
      utils.relatorioEnergia.historico.list.invalidate({ clienteId })
    } catch (e: any) {
      setErro(e.message || 'Falha ao gerar relatório')
    } finally {
      setGerando(false)
    }
  }

  const precisaConfig = !!clienteId && !carregandoConfig && !configSalva

  return (
    <div style={{ padding: isMobile ? '16px 14px' : '24px 28px', maxWidth: 640 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: '#E2EAF5', fontSize: isMobile ? 17 : 20, fontWeight: 800, margin: 0 }}>
          ☀️ Relatório de Energia
        </h1>
        <p style={{ color: '#7488A8', fontSize: 11, margin: '2px 0 0' }}>
          Gera o relatório mensal de gestão de energia solar (.pptx) a partir da fatura de
          energia e do export do GDASH
        </p>
      </div>

      <div style={{ background: '#111D2E', border: '1px solid #1E3050', borderRadius: 12, padding: isMobile ? 16 : 22, marginBottom: 16 }}>
        <div style={{ marginBottom: precisaConfig ? 0 : 16 }}>
          <label style={labelStyle}>Cliente</label>
          {carregandoClientes ? (
            <div style={{ color: '#7488A8', fontSize: 12 }}>Carregando clientes...</div>
          ) : (
            <select value={clienteId} onChange={e => selecionarCliente(e.target.value)} style={inputStyle}>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          )}
        </div>

        {precisaConfig && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed #1E3050' }}>
            <div style={{ color: '#F5A623', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
              Cliente sem dados técnicos cadastrados — preencha antes de gerar
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Potência instalada</label>
              <input
                value={config.potenciaKwp}
                onChange={e => setConfig({ ...config, potenciaKwp: e.target.value })}
                placeholder="ex.: 32,49 kWp"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
              {(['nomeL1', 'nomeL2', 'nomeL3', 'nomeL4'] as const).map((campo, i) => (
                <div key={campo}>
                  <label style={labelStyle}>Nome — linha {i + 1}{i === 0 ? '' : ' (opcional)'}</label>
                  <input
                    value={config[campo]}
                    onChange={e => setConfig({ ...config, [campo]: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={salvarConfig}
              disabled={salvarConfigMut.isLoading}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#39C5CF', color: '#0C1421', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
            >
              {salvarConfigMut.isLoading ? 'Salvando...' : 'Salvar dados técnicos'}
            </button>
          </div>
        )}

        {!!clienteId && !precisaConfig && !carregandoConfig && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Fatura de energia (PDF)</label>
              <input
                ref={faturaRef}
                type="file"
                accept="application/pdf"
                onChange={e => setFatura(e.target.files?.[0] ?? null)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Export do GDASH (PDF)</label>
              <input
                ref={gdashRef}
                type="file"
                accept="application/pdf"
                onChange={e => setGdash(e.target.files?.[0] ?? null)}
                style={inputStyle}
              />
            </div>

            {erro && (
              <div style={{ background: '#F8514918', border: '1px solid #F8514940', borderRadius: 8, padding: '8px 12px', color: '#F85149', fontSize: 12, marginBottom: 14 }}>
                {erro}
              </div>
            )}
            {sucesso && (
              <div style={{ background: '#3EBB7A18', border: '1px solid #3EBB7A40', borderRadius: 8, padding: '8px 12px', color: '#3EBB7A', fontSize: 12, marginBottom: 14 }}>
                {sucesso}
              </div>
            )}

            <button
              onClick={gerar}
              disabled={gerando}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: gerando ? '#F5A62360' : '#F5A623', color: '#0C1421',
                cursor: gerando ? 'default' : 'pointer', fontSize: 13, fontWeight: 700,
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {gerando && <Spinner size={14} />}
              {gerando ? 'Gerando relatório... (pode levar até 1 minuto)' : 'Gerar relatório'}
            </button>
          </>
        )}
        {erro && precisaConfig && (
          <div style={{ background: '#F8514918', border: '1px solid #F8514940', borderRadius: 8, padding: '8px 12px', color: '#F85149', fontSize: 12, marginTop: 12 }}>
            {erro}
          </div>
        )}
      </div>

      {!!clienteId && !precisaConfig && (
        <div style={{ background: '#111D2E', border: '1px solid #1E3050', borderRadius: 12, padding: isMobile ? 16 : 22 }}>
          <div style={{ color: '#C8D8EC', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Últimos 12 meses</div>
          {carregandoHistorico ? (
            <div style={{ color: '#7488A8', fontSize: 12 }}>Carregando histórico...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {historico.map((h: any) => (
                <div key={h.mes} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#0C1828', borderRadius: 8 }}>
                  <span style={{ color: '#C8D8EC', fontSize: 12.5 }}>{formatarMes(h.mes)}</span>
                  {h.gerado ? (
                    <a
                      href={`${API_BASE}/relatorio-energia/historico/${h.id}/download?token=${encodeURIComponent(getToken())}`}
                      style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: '#3EBB7A18', color: '#3EBB7A', textDecoration: 'none', letterSpacing: '0.02em' }}
                    >
                      ✓ Gerado — baixar
                    </a>
                  ) : (
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: '#7488A818', color: '#7488A8', letterSpacing: '0.02em' }}>
                      Não gerado
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
