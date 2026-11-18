import { useEffect, useRef, useState } from 'react'

/**
 * Reveal-on-scroll: returns a ref + `shown` flag that flips true once the
 * element scrolls into view (once, then stops observing). Pair with the
 * `.reveal` CSS classes for a smooth section entrance. Under
 * prefers-reduced-motion the CSS keeps content fully visible regardless.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Already in view at mount (above the fold): reveal immediately instead of
    // waiting on IO's async first callback, which can leave content invisible.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            io.disconnect()
            break
          }
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return { ref, shown }
}
