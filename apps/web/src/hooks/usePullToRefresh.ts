import { useRef, useState, useEffect } from 'react'

// Puxar-para-atualizar em PWA instalado (standalone não tem o gesto nativo do navegador).
// Anexa em um container rolável: quando ele está no topo e o usuário arrasta pra baixo
// além do limiar, recarrega a página. O token de login fica no localStorage, então
// recarregar NÃO desloga — só atualiza os dados.
const LIMIAR = 70   // px de arrasto (amortecido) para disparar
const MAX_PULL = 110

export function usePullToRefresh<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || !('ontouchstart' in window)) return

    let startY: number | null = null
    let dist = 0

    const onStart = (e: TouchEvent) => {
      startY = el.scrollTop <= 0 ? e.touches[0].clientY : null
      dist = 0
    }
    const onMove = (e: TouchEvent) => {
      if (startY === null) return
      const dy = e.touches[0].clientY - startY
      if (dy > 0 && el.scrollTop <= 0) {
        dist = Math.min(MAX_PULL, dy * 0.4)  // amortecimento
        setPull(dist)
        // Evita o overscroll nativo do iOS enquanto o gesto está ativo
        if (dist > 8 && e.cancelable) e.preventDefault()
      } else {
        dist = 0
        setPull(0)
      }
    }
    const onEnd = () => {
      if (startY === null) return
      startY = null
      if (dist >= LIMIAR) {
        setRefreshing(true)
        setPull(56)
        setTimeout(() => window.location.reload(), 250)
      } else {
        setPull(0)
      }
      dist = 0
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  return { ref, pull, refreshing, pronto: pull >= LIMIAR }
}
