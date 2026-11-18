import type { ReactNode } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'

/**
 * A step's heading — the task, in a sentence — and where it sits in the flow.
 * On a phone the sentence is visually hidden: the navigation row names the step.
 *
 * Wide screens keep the flow's title bar, so here they get "<flow> · STEP 02"
 * under the heading. A phone hides that bar during the steps and gets a
 * navigation row instead: ‹ (onBack) · the step's short name with one segment
 * per step under it · ✕ (onExit), both icons the same size so the name stays
 * centred. Steps live in page state, not history, so the browser's back
 * button would leave the whole flow; ‹ is the way to the last step. A step
 * without ‹ (the first) keeps an empty slot of the same width.
 */
export function FlowTitle({
  flowName,
  step,
  totalSteps,
  stepName,
  onBack,
  onExit,
  exitLabel = '나가기',
  children,
}: {
  /** e.g. "학위복 대여 예약", "St:talk 신청" */
  flowName: string
  step: number
  totalSteps: number
  /** The short step name shown between ‹ and ✕ on a phone, e.g. "사이즈·시간". */
  stepName: string
  onBack?: () => void
  onExit?: () => void
  exitLabel?: string
  children: ReactNode
}) {
  const slot = 'flex size-10 items-center justify-center'
  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-2 -mt-3 mb-2 grid grid-cols-[2.5rem_1fr_2.5rem] items-center desk:hidden">
        <span className={slot}>
          {onBack && <IconButton label="이전 단계" icon={<Icon icon="chevronLeft" />} variant="ghost" size="sm" onClick={onBack} />}
        </span>
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <Text type="label" weight="semibold" className="truncate">
            {stepName}
          </Text>
          <span role="img" aria-label={`${flowName} ${step}단계, 전체 ${totalSteps}단계`} className="flex items-center gap-1">
            {Array.from({ length: totalSteps }, (_, index) => (
              <span key={index} className={`h-1 w-3.5 rounded-full ${index < step ? 'bg-accent-bg' : 'bg-track'}`} />
            ))}
            <span aria-hidden className="ms-1 text-xs font-semibold tabular-nums text-[var(--color-text-secondary)]">
              {step}/{totalSteps}
            </span>
          </span>
        </div>
        <span className={slot}>
          {onExit && <IconButton label={exitLabel} icon={<Icon icon="close" />} variant="ghost" size="sm" onClick={onExit} />}
        </span>
      </div>
      {/* The step's sentence heading is for wide screens; a phone already names the
          step in the row above, so the heading stays only for screen readers there. */}
      <Heading level={1} className="sr-only break-keep text-3xl desk:not-sr-only">
        {children}
      </Heading>
      <Text as="p" type="supporting" size="sm" weight="normal" color="secondary" className="hidden tracking-[.06em] desk:block">
        {flowName} · STEP {String(step).padStart(2, '0')}
      </Text>
    </div>
  )
}
