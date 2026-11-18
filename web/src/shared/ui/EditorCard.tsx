import { useEffect, useRef, type ReactNode, type Ref } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'

/**
 * 내 신청's change screen as a card, in the same frame as the ProgramCard it
 * replaces: the heading stays at the top and save/cancel at the bottom, and
 * the fields between them scroll inside the card. The card is never taller
 * than the screen around it — on a phone, the tab panel between the top bar
 * (4rem) and the bottom tabs (3.5rem + the home indicator), less the page's
 * own padding; on a wide screen, the window under the title bar — so the
 * actions are always in reach without scrolling the page.
 */
export function EditorCard({
  kicker,
  title,
  titleRef,
  description,
  children,
  actions,
  error = '',
}: {
  kicker: string
  title: string
  /** Focus target when the screen swaps between the card and the editor. */
  titleRef?: Ref<HTMLHeadingElement>
  description?: string
  children: ReactNode
  actions: ReactNode
  /** A failed save, shown above the actions. When it appears the fields
      scroll to the first one marked wrong, which may be out of view. */
  error?: string
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!error) return
    bodyRef.current?.querySelector('[role="alert"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [error])

  return (
    <article
      aria-label={`${kicker} ${title}`}
      className="flex max-h-[calc(100dvh-11rem-env(safe-area-inset-bottom))] flex-col overflow-hidden rounded-xl border border-border bg-surface lg:max-h-[calc(100dvh-var(--title-bar-h)-5rem)]"
    >
      <header className="flex-none border-b border-border px-4.5 pb-3.5 pt-4.5">
        <Text type="supporting" weight="bold" color="accent">
          {kicker}
        </Text>
        <Heading
          level={2}
          ref={titleRef}
          tabIndex={titleRef ? -1 : undefined}
          className="mt-1 !text-lg !font-bold !leading-snug break-keep outline-none"
        >
          {title}
        </Heading>
        {description && (
          <Text as="p" display="block" type="supporting" color="secondary" className="mt-0.5">
            {description}
          </Text>
        )}
      </header>

      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4.5 py-5">{children}</div>

      <footer className="flex-none border-t border-border px-4.5 py-3.5">
        {error && (
          <p className="mb-3 mt-0 text-sm font-semibold text-[var(--color-text-red)]" role="alert">
            {error}
          </p>
        )}
        {actions}
      </footer>
    </article>
  )
}
