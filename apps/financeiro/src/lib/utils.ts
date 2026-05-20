import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function fmtData(d: string | Date | null | undefined): string {
  if (!d) return '—'
  try {
    const date = typeof d === 'string' ? parseISO(d) : d
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '—'
  }
}

export function fmtDataHora(d: string | Date | null | undefined): string {
  if (!d) return '—'
  try {
    const date = typeof d === 'string' ? parseISO(d) : d
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return '—'
  }
}

export function classMerge(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
