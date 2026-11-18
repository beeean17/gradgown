import type { AnchorHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'

const EXTERNAL = /^(https?:|mailto:|tel:)/

/**
 * Adapter that lets every Astryx link (TopNavItem, ClickableCard, Link, ...)
 * navigate client-side via React Router. Registered app-wide through
 * <LinkProvider component={RouterLink}>. Falls back to native anchor behavior
 * for modified clicks, new tabs, and external/absolute URLs.
 */
export function RouterLink({
  href,
  onClick,
  target,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const navigate = useNavigate()
  return (
    <a
      href={href}
      target={target}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        if (target && target !== '_self') return
        if (!href || EXTERNAL.test(href)) return
        e.preventDefault()
        navigate(href)
      }}
      {...props}
    >
      {children}
    </a>
  )
}
