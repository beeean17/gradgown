import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Re-runs an entrance animation on every route change by keying the wrapper on
 * the pathname (a new key remounts the subtree, replaying the CSS animation).
 * The `.gx-rise` animation is disabled under prefers-reduced-motion.
 */
export function PageTransition({ children, fill = false }: { children: ReactNode; fill?: boolean }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className={`gx-rise${fill ? ' h-full min-h-0' : ''}`}>
      {children}
    </div>
  )
}
