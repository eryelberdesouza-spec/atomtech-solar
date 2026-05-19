import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface NovaPropostaDropdownProps {
  label?: string
  size?: 'sm' | 'md'
}

export function NovaPropostaDropdown({ label = '+ Nova Proposta', size = 'md' }: NovaPropostaDropdownProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const btnStyle: React.CSSProperties = size === 'sm'
    ? { padding: '5px 12px', fontSize: 11, borderRadius: 7 }
    : { padding: '7px 16px', fontSize: 12, borderRadius: 8 }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          ...btnStyle,
          border: 'none',
          background: 'linear-gradient(135deg, #F5A623, #E8720C)',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 700,
          fontFamily: 'inherit',
          boxShadow: '0 2px 10px rgba(245,166,35,0.35)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
      >
        {label} ▾
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            background: '#111D2E',
            border: '1px solid #1E3050',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 200,
            minWidth: 240,
          }}
        >
          <button
            onClick={() => { setOpen(false); navigate('/propostas/nova') }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #1E3050' }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#F5A62310')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
          >
            <span style={{ color: '#E2EAF5', fontSize: 13, fontWeight: 700 }}>☀️ Sistema Fotovoltaico</span>
            <span style={{ color: '#4A6080', fontSize: 11, marginTop: 2 }}>Proposta com dimensionamento e análise financeira</span>
          </button>
          <button
            onClick={() => { setOpen(false); navigate('/propostas/nova-servico') }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#F5A62310')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
          >
            <span style={{ color: '#E2EAF5', fontSize: 13, fontWeight: 700 }}>🔧 Serviço / Instalação</span>
            <span style={{ color: '#4A6080', fontSize: 11, marginTop: 2 }}>CFTV, Carregadores, Elétrica, Manutenção...</span>
          </button>
        </div>
      )}
    </div>
  )
}
