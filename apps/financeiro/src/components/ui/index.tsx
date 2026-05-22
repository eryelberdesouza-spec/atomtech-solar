import type { ReactNode, CSSProperties, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ChangeEvent } from 'react'
import { useState, useEffect, forwardRef } from 'react'
import { maskCpfCnpj, maskCep, maskTelefone, maskMoeda, parseMoeda } from '../../lib/masks'
export { buscarCep } from '../../lib/viaCep'

// ─── CORES DO TEMA FINANCEIRO (Verde Esmeralda) ──────────────────────────────
export const C = {
  // Backgrounds
  bg:         '#091410',
  bgMid:      '#0D1C17',
  bgCard:     '#0F2118',
  bgHover:    '#162B23',
  // Borders
  border:     '#163526',
  borderMid:  '#1E4033',
  // Emerald accent
  emerald:    '#10B981',
  emeraldDim: '#059669',
  emeraldGlow:'#10B98140',
  emeraldFg:  '#34D399',
  // Text
  text:       '#E2F0EB',
  textMuted:  '#6B9E87',
  textDim:    '#2E5445',
  // Status
  success:    '#34D399',
  danger:     '#F87171',
  warning:    '#FBBF24',
  info:       '#60A5FA',
  // Fin-specific
  credit:     '#34D399',  // receitas / entradas
  debit:      '#F87171',  // despesas / saídas
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
interface BtnProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  style?: CSSProperties
  title?: string
}
const BTN_STYLES = {
  primary:   { background: C.emerald,    color: '#022C22', border: 'none', fontWeight: 700 },
  secondary: { background: C.bgHover,   color: C.text,    border: '1px solid ' + C.border, fontWeight: 500 },
  ghost:     { background: 'transparent', color: C.textMuted, border: '1px solid ' + C.border, fontWeight: 500 },
  danger:    { background: '#7F1D1D',    color: '#FCA5A5', border: '1px solid #B91C1C', fontWeight: 600 },
  success:   { background: '#064E3B',    color: '#34D399', border: '1px solid #065F46', fontWeight: 600 },
}
const BTN_SIZE = {
  sm: { padding: '5px 12px',  fontSize: 11, borderRadius: 7 },
  md: { padding: '8px 16px',  fontSize: 13, borderRadius: 8 },
  lg: { padding: '11px 22px', fontSize: 14, borderRadius: 9 },
}
export function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', style, title }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s, background 0.15s',
        fontFamily: 'inherit',
        ...BTN_STYLES[variant],
        ...BTN_SIZE[size],
        ...style,
      }}
      onMouseEnter={e => !disabled && ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85')}
      onMouseLeave={e => !disabled && ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
    >{children}</button>
  )
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
interface CardProps { children: ReactNode; style?: CSSProperties; onClick?: () => void; hover?: boolean; accent?: string }
export function Card({ children, style, onClick, hover, accent }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.bgCard,
        borderRadius: 12,
        border: '1px solid ' + C.border,
        borderTop: accent ? '3px solid ' + accent : undefined,
        cursor: onClick ? 'pointer' : undefined,
        transition: hover ? 'border-color 0.15s, transform 0.15s' : undefined,
        ...style,
      }}
      onMouseEnter={e => hover && onClick && ((e.currentTarget as HTMLDivElement).style.borderColor = C.emerald + '60')}
      onMouseLeave={e => hover && onClick && ((e.currentTarget as HTMLDivElement).style.borderColor = C.border)}
    >{children}</div>
  )
}

// ─── INPUT BASE ───────────────────────────────────────────────────────────────
interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'prefix'> {
  label?: string
  error?: string
  hint?: string
  suffix?: string
  leftIcon?: ReactNode
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, hint, suffix, leftIcon, style, ...props }, ref) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {label && (
          <label style={{ color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            {label}
          </label>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          {leftIcon && (
            <span style={{ position: 'absolute', left: 10, color: C.textMuted, fontSize: 12, pointerEvents: 'none' }}>
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            {...props}
            style={{
              flex: 1,
              padding: leftIcon ? '8px 12px 8px 28px' : '8px 12px',
              borderRadius: 8,
              background: C.bg,
              border: '1px solid ' + (error ? C.danger : C.border),
              color: C.text,
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.15s',
              fontFamily: 'inherit',
              width: '100%',
              ...style,
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = error ? C.danger : C.emerald
              props.onFocus?.(e)
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = error ? C.danger : C.border
              props.onBlur?.(e)
            }}
          />
          {suffix && <span style={{ color: C.textMuted, fontSize: 12, whiteSpace: 'nowrap' }}>{suffix}</span>}
        </div>
        {error && <span style={{ color: C.danger, fontSize: 11 }}>{error}</span>}
        {hint && !error && <span style={{ color: C.textDim, fontSize: 11 }}>{hint}</span>}
      </div>
    )
  }
)

// ─── INPUT CPF/CNPJ ───────────────────────────────────────────────────────────
interface InputCpfCnpjProps extends Omit<InputProps, 'onChange' | 'value'> {
  value?: string
  onChange?: (v: string) => void
}
export function InputCpfCnpj({ value = '', onChange, ...props }: InputCpfCnpjProps) {
  return (
    <Input
      {...props}
      value={maskCpfCnpj(value)}
      placeholder="CPF ou CNPJ"
      maxLength={18}
      inputMode="numeric"
      onChange={e => onChange?.(e.target.value)}
    />
  )
}

// ─── INPUT CEP (com busca automática via ViaCEP) ──────────────────────────────
interface InputCepProps extends Omit<InputProps, 'onChange' | 'value'> {
  value?: string
  onChange?: (v: string) => void
  onAddressFound?: (data: { logradouro: string; bairro: string; cidade: string; estado: string }) => void
}
export function InputCep({ value = '', onChange, onAddressFound, ...props }: InputCepProps) {
  const [loading, setLoading] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const masked = maskCep(raw)
    onChange?.(masked)

    const digits = raw.replace(/\D/g, '')
    if (digits.length === 8 && onAddressFound) {
      setLoading(true)
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
        if (res.ok) {
          const data = await res.json()
          if (!data.erro) {
            onAddressFound({
              logradouro: data.logradouro || '',
              bairro: data.bairro || '',
              cidade: data.localidade || '',
              estado: data.uf || '',
            })
          }
        }
      } catch { /* silencioso */ }
      setLoading(false)
    }
  }

  return (
    <Input
      {...props}
      value={maskCep(value)}
      placeholder="00000-000"
      maxLength={9}
      inputMode="numeric"
      suffix={loading ? '⟳' : undefined}
      onChange={handleChange}
    />
  )
}

// ─── INPUT TELEFONE ───────────────────────────────────────────────────────────
interface InputTelProps extends Omit<InputProps, 'onChange' | 'value'> {
  value?: string
  onChange?: (v: string) => void
}
export function InputTelefone({ value = '', onChange, ...props }: InputTelProps) {
  return (
    <Input
      {...props}
      value={maskTelefone(value)}
      placeholder="(00) 00000-0000"
      maxLength={15}
      inputMode="numeric"
      onChange={e => onChange?.(e.target.value)}
    />
  )
}

// ─── INPUT MOEDA ──────────────────────────────────────────────────────────────
interface InputMoedaProps extends Omit<InputProps, 'onChange' | 'value'> {
  value?: string
  onChange?: (v: string) => void
}
export function InputMoeda({ value = '', onChange, ...props }: InputMoedaProps) {
  const [editing, setEditing]   = useState(false)
  const [draft,   setDraft]     = useState('')

  function handleFocus() {
    const num = parseMoeda(value)
    setDraft(num > 0 ? String(num).replace('.', ',') : '')
    setEditing(true)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    // Permite apenas dígitos e vírgula (separador decimal BR)
    let raw = e.target.value.replace(/[^\d,]/g, '')
    // Garante no máximo uma vírgula
    const parts = raw.split(',')
    if (parts.length > 2) raw = parts[0] + ',' + parts.slice(1).join('')
    // Limita a 2 casas decimais após a vírgula
    if (parts[1] !== undefined && parts[1].length > 2) {
      raw = parts[0] + ',' + parts[1].slice(0, 2)
    }
    setDraft(raw)
    onChange?.(raw)
  }

  function handleBlur() {
    setEditing(false)
    const num = parseMoeda(draft)
    const masked = maskMoeda(num)
    onChange?.(masked)
  }

  return (
    <Input
      {...props}
      value={editing ? draft : maskMoeda(value)}
      placeholder="R$ 0,00"
      inputMode="decimal"
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      style={{ textAlign: 'right', ...props.style }}
    />
  )
}

// ─── TEXTAREA ─────────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string }
export function Textarea({ label, error, style, ...props }: TextareaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</label>}
      <textarea
        {...props}
        style={{
          padding: '8px 12px', borderRadius: 8, resize: 'vertical', minHeight: 80,
          background: C.bg, border: '1px solid ' + (error ? C.danger : C.border),
          color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', ...style,
        }}
        onFocus={e => (e.currentTarget.style.borderColor = C.emerald)}
        onBlur={e => (e.currentTarget.style.borderColor = error ? C.danger : C.border)}
      />
      {error && <span style={{ color: C.danger, fontSize: 11 }}>{error}</span>}
    </div>
  )
}

// ─── SELECT ───────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; error?: string; hint?: string; options: { value: string; label: string }[]; placeholder?: string }
export function Select({ label, error, hint, options, placeholder, style, ...props }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</label>}
      <select
        {...props}
        style={{
          padding: '8px 12px', borderRadius: 8,
          background: C.bg, border: '1px solid ' + (error ? C.danger : C.border),
          color: props.value ? C.text : C.textMuted,
          fontSize: 13, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', ...style,
        }}
        onFocus={e => (e.currentTarget.style.borderColor = C.emerald)}
        onBlur={e => (e.currentTarget.style.borderColor = error ? C.danger : C.border)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span style={{ color: C.danger, fontSize: 11 }}>{error}</span>}
      {hint && !error && <span style={{ color: C.textDim, fontSize: 11 }}>{hint}</span>}
    </div>
  )
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
const BADGE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  ABERTA:    { bg: '#1E3A5F', color: '#60A5FA', label: 'Em Aberto' },
  PAGA:      { bg: '#064E3B', color: '#34D399', label: 'Pago' },
  CANCELADA: { bg: '#450A0A', color: '#FCA5A5', label: 'Cancelado' },
  PAGAR:     { bg: '#451A03', color: '#FBBF24', label: 'A Pagar' },
  RECEBER:   { bg: '#064E3B', color: '#34D399', label: 'A Receber' },
  ativo:     { bg: '#064E3B', color: '#34D399', label: 'Ativo' },
  inativo:   { bg: '#1F2937', color: '#9CA3AF', label: 'Inativo' },
  CORRENTE:  { bg: '#1E3A5F', color: '#60A5FA', label: 'Corrente' },
  POUPANCA:  { bg: '#1E3A5F', color: '#60A5FA', label: 'Poupança' },
  CAIXA:     { bg: '#3B2A00', color: '#FBBF24', label: 'Caixa' },
}
export function Badge({ status, label }: { status: string; label?: string }) {
  const s = BADGE_COLORS[status] ?? { bg: C.bgHover, color: C.textMuted, label: status }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 600,
      background: s.bg, color: s.color,
      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{label ?? s.label}</span>
  )
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
interface KpiCardProps { label: string; value: string | number; sub?: string; icon?: string; color?: string; trend?: number }
export function KpiCard({ label, value, sub, icon, color = C.emerald, trend }: KpiCardProps) {
  return (
    <Card accent={color} style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>{label}</p>
          <p style={{ color: C.text, fontSize: 26, fontWeight: 800, lineHeight: 1, margin: '0 0 6px' }}>{value}</p>
          {sub && <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>{sub}</p>}
          {trend !== undefined && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 8, fontSize: 11, fontWeight: 600, color: trend >= 0 ? C.success : C.danger }}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs. mês anterior
            </div>
          )}
        </div>
        {icon && (
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>{icon}</div>
        )}
      </div>
    </Card>
  )
}

// ─── TABLE ────────────────────────────────────────────────────────────────────
interface TableProps {
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center'; width?: string }[]
  rows: Record<string, ReactNode>[]
  onRowClick?: (index: number) => void
  emptyMessage?: string
}
export function Table({ columns, rows, onRowClick, emptyMessage }: TableProps) {
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: C.textMuted, fontSize: 13 }}>
        {emptyMessage ?? 'Nenhum registro encontrado'}
      </div>
    )
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} style={{
              padding: '10px 14px', textAlign: col.align ?? 'left', fontSize: 10,
              color: C.textDim, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', borderBottom: '1px solid ' + C.border,
              width: col.width,
            }}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            onClick={() => onRowClick?.(i)}
            style={{
              borderBottom: i < rows.length - 1 ? '1px solid ' + C.border + '60' : 'none',
              cursor: onRowClick ? 'pointer' : undefined,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => onRowClick && ((e.currentTarget as HTMLTableRowElement).style.background = C.bgHover)}
            onMouseLeave={e => onRowClick && ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
          >
            {columns.map(col => (
              <td key={col.key} style={{ padding: '11px 14px', textAlign: col.align ?? 'left', fontSize: 13, color: C.text }}>{row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '2px solid ' + C.border,
      borderTopColor: C.emerald,
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: { icon?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 40px', color: C.textMuted }}>
      {icon && <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.6 }}>{icon}</div>}
      <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>{title}</p>
      {description && <p style={{ fontSize: 13, marginBottom: 20 }}>{description}</p>}
      {action}
    </div>
  )
}

// ─── PAGE WRAPPER ─────────────────────────────────────────────────────────────
export function PageWrapper({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="fade-in" style={{ padding: '24px 28px', ...style }}>{children}</div>
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <h2 style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h2>
      {action}
    </div>
  )
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
interface TabsProps { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid ' + C.border }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '10px 18px', border: 'none', background: 'transparent',
            color: active === tab.id ? C.emerald : C.textMuted,
            fontSize: 13, fontWeight: active === tab.id ? 600 : 400, cursor: 'pointer',
            borderBottom: active === tab.id ? '2px solid ' + C.emerald : '2px solid transparent',
            transition: 'all 0.15s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              background: active === tab.id ? C.emerald + '22' : C.bgHover,
              color: active === tab.id ? C.emerald : C.textMuted,
              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
            }}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: checked ? C.emerald : C.border, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'left 0.2s', left: checked ? 20 : 4 }} />
    </button>
  )
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number; footer?: ReactNode }
export function Modal({ open, onClose, title, children, width = 560, footer }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="fade-in" style={{
        background: C.bgMid, borderRadius: 14, border: '1px solid ' + C.borderMid,
        width: '100%', maxWidth: width, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px 16px', borderBottom: '1px solid ' + C.border,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: C.bgHover, color: C.textMuted, cursor: 'pointer',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>{children}</div>
        {/* Footer */}
        {footer && (
          <div style={{
            padding: '14px 24px', borderTop: '1px solid ' + C.border,
            display: 'flex', justifyContent: 'flex-end', gap: 10,
          }}>{footer}</div>
        )}
      </div>
    </div>
  )
}

// ─── FORM ROW ─────────────────────────────────────────────────────────────────
export function FormRow({ children, cols = 2 }: { children: ReactNode; cols?: number }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 16, marginBottom: 16,
    }}>{children}</div>
  )
}

// ─── DIVIDER ──────────────────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {label && <span style={{ color: C.textDim, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

// ─── SEARCH INPUT ─────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Buscar...', style }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: CSSProperties }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.textDim, fontSize: 13 }}>🔍</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 12px 8px 30px', borderRadius: 8,
          background: C.bg, border: '1px solid ' + C.border,
          color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = C.emerald)}
        onBlur={e => (e.currentTarget.style.borderColor = C.border)}
      />
    </div>
  )
}

// ─── ALERT ────────────────────────────────────────────────────────────────────
export function Alert({ type = 'info', children }: { type?: 'info' | 'success' | 'warning' | 'danger'; children: ReactNode }) {
  const styles = {
    info:    { bg: '#1E3A5F20', border: '#1E3A5F', color: '#60A5FA', icon: 'ℹ' },
    success: { bg: '#064E3B20', border: '#065F46', color: '#34D399', icon: '✓' },
    warning: { bg: '#3B2A0020', border: '#92400E', color: '#FBBF24', icon: '⚠' },
    danger:  { bg: '#7F1D1D20', border: '#B91C1C', color: '#FCA5A5', icon: '✕' },
  }
  const s = styles[type]
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 16px', borderRadius: 8,
      background: s.bg, border: '1px solid ' + s.border,
      color: s.color, fontSize: 13,
    }}>
      <span style={{ flexShrink: 0, fontWeight: 700 }}>{s.icon}</span>
      <div>{children}</div>
    </div>
  )
}
