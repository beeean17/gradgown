import type { ReactNode } from 'react'
import { VStack } from '@astryxdesign/core/Stack'

/**
 * An immersive flow is an app shell, not a document: the title bar stays
 * pinned while only the middle scrolls, and step actions remain beside their
 * context. Shared by the reservation and St:talk flows, which both sit outside
 * PublicLayout (see the router).
 */
export function FlowShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--color-background-body)]">
      {children}
    </div>
  )
}

/**
 * The scrolling middle for the form steps. Primary steps use the same wide
 * measure as the terms screen; gate and result messages keep the narrow measure.
 */
export function FlowBody({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  if (wide) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-6 desk:px-16 desk:pt-9">
        {/* The public pages' frame (--page-max-w), so the side card stays put. */}
        <div className="mx-auto w-full max-w-[var(--page-max-w)] pb-10 desk:pb-7">
          <VStack gap={6}>{children}</VStack>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[41.25rem] px-4 pt-6 pb-10 desk:pt-9">
        <VStack gap={4}>{children}</VStack>
      </div>
    </div>
  )
}
