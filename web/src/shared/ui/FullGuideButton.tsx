import { useState, type ReactNode } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog } from '@astryxdesign/core/Dialog'
import { Heading } from '@astryxdesign/core/Heading'

/**
 * A tab's rules word for word, on demand: the tab itself shows their one-line
 * summary (the same one the flow's terms step shows), and this opens the full
 * text in a dialog whose title and 닫기 stay put while the text scrolls.
 */
export function FullGuideButton({
  title,
  label = '안내 전문 보기',
  width = '100%',
  children,
}: {
  title: string
  label?: string
  /** '100%' for a row of its own; omit beside another button. */
  width?: '100%'
  children: ReactNode
}) {
  const [isOpen, setOpen] = useState(false)
  return (
    <>
      <Button label={label} variant="secondary" size="lg" width={width} onClick={() => setOpen(true)} />
      <Dialog
        isOpen={isOpen}
        onOpenChange={setOpen}
        purpose="info"
        aria-label={title}
        width="min(40rem, calc(100vw - 2rem))"
        maxHeight="85vh"
        padding={5}
      >
        <div className="flex max-h-[calc(85vh-2.5rem)] flex-col gap-4">
          <Heading level={2} className="text-lg">
            {title}
          </Heading>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          <div className="flex justify-end">
            <Button label="닫기" variant="primary" onClick={() => setOpen(false)} />
          </div>
        </div>
      </Dialog>
    </>
  )
}
