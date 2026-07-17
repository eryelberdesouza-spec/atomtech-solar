import type { ReactNode, CSSProperties, InputHTMLAttributes, SelectHTMLAttributes } from 'react'

export const C = {
  solar:      '#F5A623',
  green:      '#2D9C4E',
  dark:       '#0F1923',
  darkMid:    '#1A2535',
  darkCard:   '#212F42',
  darkBorder: '#2D3F58',
  text:       '#E8EDF5',
  textMuted:  '#9FB0C9',
  textDim:    '#7488A8',
  accent:     '#4FC3F7',
  success:    '#66BB6A',
  danger:     '#EF5350',
  warning:    '#FFA726',
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
interface BtnProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'green' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  style?: CSSProperties
}
const BTN_STYLES = {
  primary:   { background: C.solar,      color: '#000', border: 'none', fontWeight: 700 },
  secondary: { background: C.darkBorder, color: C.text, border: 'none', fontWeight: 500 },
  ghost:     { background: 'transparent', color: C.textMuted, border: '1px solid ' + C.darkBorder, fontWeight: 500 },
  green:     { background: C.green,      color: '#fff', border: 'none', fontWeight: 700 },
  danger:    { background: C.danger,     color: '#fff', border: 'none', fontWeight: 700 },
}
const BTN_SIZE = {
  sm: { padding: '5px 12px',  fontSize: 11, borderRadius: 7 },
  md: { padding: '8px 16px',  fontSize: 13, borderRadius: 8 },
  lg: { padding: '11px 22px', fontSize: 14, borderRadius: 9 },
}
export function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', style }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s',
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

// ─── BADGE ────────────────────────────────────────────────────────────────────
import { STATUS_CONFIG } from '../../lib/utils'
export function Badge({ status }: { status: string }) {
  const s = (STATUS_CONFIG as any)[status] ?? { label: status, color: C.textMuted, bg: C.darkBorder }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 600,
      background: s.bg, color: s.color,
      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
interface CardProps { children: ReactNode; style?: CSSProperties; onClick?: () => void; hover?: boolean }
export function Card({ children, style, onClick, hover }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.darkCard, borderRadius: 12,
        border: '1px solid ' + C.darkBorder,
        cursor: onClick ? 'pointer' : undefined,
        transition: hover ? 'border-color 0.15s' : undefined,
        ...style,
      }}
      onMouseEnter={e => hover && onClick && ((e.currentTarget as HTMLDivElement).style.borderColor = C.solar + '60')}
      onMouseLeave={e => hover && onClick && ((e.currentTarget as HTMLDivElement).style.borderColor = C.darkBorder)}
    >{children}</div>
  )
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; suffix?: string }
export function Input({ label, error, suffix, style, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</label>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          {...props}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            background: C.dark, border: '1px solid ' + (error ? C.danger : C.darkBorder),
            color: C.text, fontSize: 13, outline: 'none', transition: 'border-color 0.15s',
            ...style,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = C.solar)}
          onBlur={e => (e.currentTarget.style.borderColor = error ? C.danger : C.darkBorder)}
        />
        {suffix && <span style={{ color: C.textDim, fontSize: 12 }}>{suffix}</span>}
      </div>
      {error && <span style={{ color: C.danger, fontSize: 11 }}>{error}</span>}
    </div>
  )
}

// ─── SELECT ───────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; error?: string; options: { value: string; label: string }[] }
export function Select({ label, error, options, style, ...props }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ color: C.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</label>}
      <select
        {...props}
        style={{
          padding: '8px 12px', borderRadius: 8,
          background: C.dark, border: '1px solid ' + (error ? C.danger : C.darkBorder),
          color: C.text, fontSize: 13, outline: 'none', ...style,
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span style={{ color: C.danger, fontSize: 11 }}>{error}</span>}
    </div>
  )
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
interface KpiCardProps { label: string; value: string | number; sub?: string; trend?: number; icon?: string; color?: string }
export function KpiCard({ label, value, sub, trend, icon, color = C.solar }: KpiCardProps) {
  return (
    <Card style={{ padding: '20px', position: 'relative', overflow: 'hidden', borderTop: '3px solid ' + color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>{label}</p>
          <p style={{ color: C.text, fontSize: 28, fontWeight: 800, lineHeight: 1, margin: '0 0 8px' }}>{value}</p>
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

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <h2 style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h2>
      {action}
    </div>
  )
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '2px solid ' + C.darkBorder,
      borderTopColor: C.solar,
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: { icon?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 40px', color: C.textMuted }}>
      {icon && <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>}
      <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>{title}</p>
      {description && <p style={{ fontSize: 13, marginBottom: 20 }}>{description}</p>}
      {action}
    </div>
  )
}

// ─── PAGE WRAPPER ─────────────────────────────────────────────────────────────
export function PageWrapper({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ padding: '24px 28px', ...style }}>{children}</div>
}

// ─── TABLE ────────────────────────────────────────────────────────────────────
interface TableProps {
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[]
  rows: Record<string, ReactNode>[]
  onRowClick?: (index: number) => void
}
export function Table({ columns, rows, onRowClick }: TableProps) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} style={{ padding: '10px 14px', textAlign: col.align ?? 'left', fontSize: 10, color: C.textDim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid ' + C.darkBorder }}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            onClick={() => onRowClick?.(i)}
            style={{ borderBottom: i < rows.length - 1 ? '1px solid ' + C.darkBorder + '40' : 'none', cursor: onRowClick ? 'pointer' : undefined }}
            onMouseEnter={e => onRowClick && ((e.currentTarget as HTMLTableRowElement).style.background = C.darkBorder + '40')}
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

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: checked ? C.green : C.darkBorder, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'left 0.2s', left: checked ? 20 : 4 }} />
    </button>
  )
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
interface TabsProps { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid ' + C.darkBorder }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '11px 18px', border: 'none', background: 'transparent',
            color: active === tab.id ? C.solar : C.textMuted,
            fontSize: 13, fontWeight: active === tab.id ? 600 : 400, cursor: 'pointer',
            borderBottom: active === tab.id ? '2px solid ' + C.solar : '2px solid transparent',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}
        >{tab.label}</button>
      ))}
    </div>
  )
}
