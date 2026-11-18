import type { ReactNode } from 'react'

/**
 * A flow step's decision on a phone: a bar on the bottom edge that stays put
 * while the step scrolls above it, so the next action is always in the same
 * place. Sits as the last child of FlowShell's column, not over the content.
 */
export function FlowBottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex-none border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-[41.25rem] flex-col gap-3">{children}</div>
    </div>
  )
}
