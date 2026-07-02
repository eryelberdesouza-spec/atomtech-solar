// ═══════════════════════════════════════════════════════════════════
// Utilitários compartilhados no frontend
// ═══════════════════════════════════════════════════════════════════

import { clsx, type ClassValue } from 'clsx'

// Mescla classes Tailwind de forma segura
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Formatação de moeda brasileira
export function formatCurrency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0)
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

// Formatação de kWh
export function formatKwh(value: number | string | null | undefined, decimals = 0): string {
  const n = Number(value ?? 0)
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: decimals })} kWh`
}

// Formatação de kWp
export function formatKwp(value: number | string | null | undefined): string {
  return `${Number(value ?? 0).toFixed(2)} kWp`
}

// Payback em texto
export function formatPayback(meses: number): string {
  const anos = Math.floor(meses / 12)
  const m = meses % 12
  if (anos === 0) return `${m} meses`
  if (m === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`
  return `${anos}a ${m}m`
}

// Data BR — para campos DATE puros (dataEmissao, dataValidade, dataConclusao etc).
// Extrai ano/mês/dia direto da string sem passar pelo construtor `Date`: campos DATE do MySQL
// chegam como "YYYY-MM-DD..." (UTC-meia-noite), e `new Date(s)` desloca para o dia anterior
// em fusos negativos (Brasília, UTC-3). Parse manual evita esse deslocamento.
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const match = String(dateStr).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return '—'
  const [, y, m, d] = match
  return `${d}/${m}/${y}`
}

// Data BR — para campos TIMESTAMP reais (createdAt, canceladoEm etc), onde a hora importa
// e a conversão de fuso horário UTC → local é o comportamento correto (não um bug).
export function formatTimestampDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

// Percentual
export function formatPct(value: number | string | null | undefined, decimals = 2): string {
  return `${Number(value ?? 0).toFixed(decimals)}%`
}

// Número compacto (ex: 1.2M, 450K)
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(0)
}

// Status da proposta
export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  rascunho:  { label: 'Rascunho',  color: '#8A9BB5', bg: '#2D3F58' },
  enviada:   { label: 'Enviada',   color: '#4FC3F7', bg: '#1A3A5C' },
  aceita:    { label: 'Aceita',    color: '#66BB6A', bg: '#1A3A28' },
  recusada:  { label: 'Recusada',  color: '#EF5350', bg: '#3A1A1A' },
  expirada:  { label: 'Expirada',  color: '#FFA726', bg: '#2A2A1A' },
  cancelada: { label: 'Cancelada', color: '#9CA3AF', bg: '#2A2A2E' },
}

// Tipo de telhado
export const TELHADO_LABELS: Record<string, string> = {
  carport: 'Carport',
  ceramico: 'Cerâmico',
  fibrocimento: 'Fibrocimento',
  laje: 'Laje',
  shingle: 'Shingle',
  metalico: 'Metálico',
  zipado: 'Zipado',
  solo: 'Solo',
}

// Topologia
export const TOPOLOGIA_LABELS: Record<string, string> = {
  tradicional: 'Tradicional (String)',
  microinversor: 'Microinversor',
  otimizador: 'Otimizador',
}

// Debounce
export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// Calcula média de array
export function media(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

// Gera cores para gráficos
export const CHART_COLORS = {
  solar: '#F5A623',
  green: '#2D9C4E',
  blue: '#4FC3F7',
  dark: '#0E2040',
  muted: '#8A9BB5',
  success: '#66BB6A',
  danger: '#EF5350',
  warning: '#FFA726',
}
