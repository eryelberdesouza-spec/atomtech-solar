// ═══════════════════════════════════════════════════════════════════
// Relatório de Energia — gera o .pptx mensal de gestão de energia solar
// a partir da fatura (Neoenergia) + export do GDASH. Chama o serviço
// interno apps/relatorio-energia via proxy autenticado em apps/api
// (POST /relatorio-energia/gerar) — o AGO nunca fala direto com o
// serviço Python nem com a Anthropic.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { API_BASE } from '../../lib/trpc'
import { useIsMobile } from '../../hooks/useIsMobile'
import { Spinner } from '../../components/ui'

function getToken() {
  return localStorage.getItem('atomtech_token') || ''
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

type Cliente = { id: string; nome: string }

export function RelatorioEnergiaPage() {
  const isMobile = useIsMobile()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregandoClientes, setCarregandoClientes] = useState(true)
  const [erroClientes, setErroClientes] = useState('')

  const [clienteId, setClienteId] = useState('')
  const [fatura, setFatura] = useState<File | null>(null)
  const [gdash, setGdash] = useState<File | null>(null)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const faturaRef = useRef<HTMLInputElement>(null)
  const gdashRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${API_BASE}/relatorio-energia/clientes`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(async resp => {
        if (!resp.ok) throw new Error((await resp.json())?.error ?? `HTTP ${resp.status}`)
        return resp.json()
      })
      .then((data: Cliente[]) => {
        setClientes(data)
        if (data.length === 1) setClienteId(data[0].id)
      })
      .catch(e => setErroClientes(e.message || 'Falha ao carregar clientes'))
      .finally(() => setCarregandoClientes(false))
  }, [])

  const gerar = async () => {
    setErro('')
    setSucesso('')
    if (!clienteId) return setErro('Selecione o cliente')
    if (!fatura) return setErro('Envie o PDF da fatura de energia')
    if (!gdash) return setErro('Envie o PDF do export do GDASH')

    setGerando(true)
    try {
      const form = new FormData()
      form.append('cliente', clienteId)
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
    } catch (e: any) {
      setErro(e.message || 'Falha ao gerar relatório')
    } finally {
      setGerando(false)
    }
  }

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

      <div style={{ background: '#111D2E', border: '1px solid #1E3050', borderRadius: 12, padding: isMobile ? 16 : 22 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Cliente</label>
          {carregandoClientes ? (
            <div style={{ color: '#7488A8', fontSize: 12 }}>Carregando clientes...</div>
          ) : erroClientes ? (
            <div style={{ color: '#F85149', fontSize: 12 }}>{erroClientes}</div>
          ) : (
            <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={inputStyle}>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          )}
        </div>

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
      </div>
    </div>
  )
}
