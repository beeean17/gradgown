import { useSyncExternalStore } from 'react'

/**
 * Subscribes to a CSS media query and re-renders on change. Reads the current
 * match synchronously (no first-paint flash). Client-only (SPA).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

// Desktop presentation kicks in at >= 1024px; below is the mobile action hub.
// Keep this threshold in sync with Tailwind's `lg` breakpoint.
export const DESKTOP_QUERY = '(min-width: 1024px)'

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY)
}

// The shell collapses its nav into a drawer at 640px (AppShell's `sm`). Screens
// that must match that collapse — e.g. the top bar's own heading — read this
// rather than re-deriving the number.
export const MOBILE_NAV_QUERY = '(max-width: 640px)'

export function useIsMobileNav(): boolean {
  return useMediaQuery(MOBILE_NAV_QUERY)
}
