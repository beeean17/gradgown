import { useEffect, useRef } from 'react'

/**
 * Everything a full-screen layer owes the keyboard, for layers we draw
 * ourselves instead of taking from Astryx.
 *
 * Astryx `Dialog` already does all of this, and it is the right choice for
 * ordinary modals. This hook exists for the landing's own surfaces, whose look
 * is the design (the mobile menu's circular clip-path reveal, for one) and
 * which therefore can't inherit the dialog chrome. The behavior shouldn't have
 * to be re-derived per surface, so it lives here:
 *
 *   - Esc closes
 *   - Tab cycles inside the layer instead of walking into the page behind it
 *   - focus enters on open and returns to whatever opened it on close
 *   - the page behind stops scrolling
 *
 * The caller still owns visibility. Pair this with `inert` on the layer while
 * closed — without it a hidden-by-CSS panel keeps its place in the tab order,
 * and `aria-hidden` alone makes that worse by hiding what focus can still reach.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useOverlay<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const layerRef = useRef<T>(null)

  // Read through a ref so an inline `() => setOpen(false)` doesn't re-run the
  // effect on every render — that would re-capture the restore target (by then
  // an element *inside* the layer) and yank focus back to the first item.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const layer = layerRef.current
    if (!isOpen || !layer) return

    const restoreTo = document.activeElement as HTMLElement | null
    const focusables = () => Array.from(layer.querySelectorAll<HTMLElement>(FOCUSABLE))

    focusables()[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement

      // Wrap at both ends. `!layer.contains(current)` also pulls focus back in
      // when it has drifted outside entirely — after a click on the backdrop,
      // or a return trip through the browser chrome.
      if (event.shiftKey && (current === first || !layer.contains(current))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (current === last || !layer.contains(current))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = bodyOverflow
      // Skip when the opener has gone with the page — closing by navigating
      // away unmounts the trigger before this runs.
      if (restoreTo?.isConnected) restoreTo.focus()
    }
  }, [isOpen])

  return layerRef
}
