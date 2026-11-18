import type { ReactNode } from 'react'
import { useReveal } from '../hooks/useReveal'

/**
 * Wraps content so it smoothly fades/slides in when scrolled into view.
 * `delay` (1–4) staggers siblings. No-op visual under reduced motion.
 */
export function Reveal({
  children,
  delay,
  className = '',
}: {
  children: ReactNode
  delay?: 1 | 2 | 3 | 4
  className?: string
}) {
  const { ref, shown } = useReveal()
  return (
    <div
      ref={ref}
      className={`reveal ${delay ? `reveal-${delay}` : ''} ${shown ? 'is-shown' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
