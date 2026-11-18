import type { ReactNode } from 'react'

/**
 * Page width wrapper. `narrow` = mobile-first student screens (single column);
 * `wide` = admin/content screens that use the full desktop width. Layout via
 * Tailwind (backed by design tokens).
 */
export function PageContainer({
  children,
  width = 'narrow',
}: {
  children: ReactNode
  width?: 'narrow' | 'wide'
}) {
  const max = width === 'narrow' ? 'max-w-[45rem]' : 'max-w-[70rem]'
  return <div className={`mx-auto w-full ${max} px-4 py-6 md:px-6 md:py-8`}>{children}</div>
}
