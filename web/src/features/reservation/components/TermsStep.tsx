import { useRef, useState, type ReactNode } from 'react'
import { formatClock, formatMonthDayWeekday } from '../../../shared/lib/datetime'
import { Text } from '@astryxdesign/core/Text'
import { Heading } from '@astryxdesign/core/Heading'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { FlowTitle } from '../../../shared/ui/flow/FlowTitle'
import { ConsentCard, ConsentList, type ConsentControl } from '../../../shared/ui/flow/ConsentCard'
import { FlowBottomBar } from '../../../shared/ui/flow/FlowBottomBar'
import { BriefList } from '../../../shared/ui/flow/BriefList'
import { FLOW_NAME, FLOW_STEPS } from '../flowSteps'
import {
  PICKUP_ESSENTIALS,
  PICKUP_GUIDE,
  PICKUP_CHECKS,
  ID_CARD_RULE,
  PROXY_GUIDE,
  PROXY_RULES,
  PROXY_NOTE,
  WARNINGS_GUIDE,
  RESERVATION_WARNINGS,
  TERMS_BRIEF,
  type Rule,
} from '../content/guide'

export type { ConsentControl }

/* --- Shared pieces ------------------------------------------------------ */

/** One rule: the headline that changes behaviour, then the reason. */
function RuleItem({
  rule,
  tone,
  note,
}: {
  rule: Rule
  tone?: 'danger'
  note?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <Text
        type="label"
        weight="semibold"
        className={`!text-sm ${tone === 'danger' ? 'text-[var(--color-text-red)]' : ''}`}
      >
        {rule.term}
      </Text>
      <Text type="supporting" size="sm" color="secondary" display="block" className="text-pretty">
        {rule.detail}
      </Text>
      {note && (
        <Text type="supporting" size="sm" color="secondary" display="block" className="text-pretty">
          {note}
        </Text>
      )}
    </div>
  )
}

/* --- Shared content ------------------------------------------------------ */

/** "11/22 (일) 09:00 이후에는 일정을 바꿀 수 없어요", or the generic line without a deadline. */
function lockedLine(editDeadline?: string): string {
  const { warnings } = TERMS_BRIEF
  return editDeadline
    ? warnings.locked.replace('{deadline}', `${formatMonthDayWeekday(editDeadline)} ${formatClock(editDeadline)}`)
    : warnings.lockedFallback
}

/** What to bring, in the one tinted box: the thing a student acts on before the day. */
function BringCard() {
  const { bring } = TERMS_BRIEF
  return (
    <section
      aria-label={bring.title}
      className="flex flex-col gap-3 rounded-2xl border border-[var(--color-reservation-warning-border)] bg-[var(--color-reservation-warning-surface)] p-4"
    >
      <Text type="label" weight="bold">
        {bring.title}
      </Text>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {bring.items.map((item) => (
          <li key={item.strong} className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0">
              <Icon icon="check" color="accent" size="sm" />
            </span>
            <Text type="body" className="break-keep">
              <Text type="inherit" weight="semibold">
                {item.strong}
              </Text>
              {item.rest.startsWith('도 ') ? '' : ' '}
              <Text type="inherit" color="secondary">
                {item.rest}
              </Text>
            </Text>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The step's content, the same on every screen: what to bring, then the rules. */
function TermsContent({ editDeadline }: { editDeadline?: string }) {
  const { pickup, warnings } = TERMS_BRIEF
  return (
    <>
      <BringCard />
      <BriefList title={pickup.title} items={pickup.items} />
      <BriefList title={warnings.title} items={[warnings.lost, lockedLine(editDeadline), warnings.stock]} tone="danger" />
    </>
  )
}

/* --- Wide layout -------------------------------------------------------- */

/**
 * Wide: the phone's content in a reading column, the consents and the step's
 * actions in a rail beside it.
 */
function WideTerms({ consent, actions, editDeadline }: { consent: ConsentControl; actions: ReactNode; editDeadline?: string }) {
  return (
    <div className="hidden min-h-0 flex-1 overflow-y-auto px-16 pt-9 pb-6 desk:block">
      <div className="mx-auto flex w-full max-w-[var(--page-max-w)] flex-col gap-6.5 pb-7">
        <FlowTitle flowName={FLOW_NAME} step={1} totalSteps={FLOW_STEPS.length} stepName={FLOW_STEPS[0].nav}>
          약관에 동의해 주세요
        </FlowTitle>
        <div className="grid items-start grid-cols-[minmax(0,1fr)_var(--rail-w)] gap-[var(--rail-gap)]">
          <main className="flex min-w-0 flex-col gap-7">
            <TermsContent editDeadline={editDeadline} />
          </main>
          <aside className="sticky top-0 flex flex-col gap-4">
            <ConsentCard consent={consent} actions={actions} />
          </aside>
        </div>
      </div>
    </div>
  )
}

/* --- Narrow layout ------------------------------------------------------ */

/** What the phone's bottom bar needs: the step's own next action. */
export interface TermsNext {
  onNext: () => void
  isDisabled: boolean
}

/**
 * The phone: a short checklist, not a document. One tinted box (what to bring
 * — the one thing a student acts on before the day), then the rules as
 * one-liners under plain labels. The full wording is under 전문 보기
 * (ReservationGuideFull). The decision stays in a bottom bar with the step's
 * single next action; the way out is the ✕ beside the step label.
 */
function NarrowTerms({
  consent,
  onExit,
  next,
  editDeadline,
}: {
  consent: ConsentControl
  onExit: () => void
  next: TermsNext
  editDeadline?: string
}) {
  // 다음 stays pressable: pressed before agreeing, it points at the checkbox
  // instead of doing nothing.
  const [isNudged, setNudged] = useState(false)
  const consentRef = useRef<HTMLDivElement>(null)
  const onNext = () => {
    if (next.isDisabled) {
      setNudged(true)
      consentRef.current?.querySelector('input')?.focus()
      return
    }
    next.onNext()
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col desk:hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-8">
        <div className="flex flex-col gap-7">
          <FlowTitle flowName={FLOW_NAME} step={1} totalSteps={FLOW_STEPS.length} stepName={FLOW_STEPS[0].nav} onExit={onExit} exitLabel="예약 나가기">
            약관에 동의해 주세요
          </FlowTitle>

          <TermsContent editDeadline={editDeadline} />
        </div>
      </div>

      <FlowBottomBar>
        <div
          ref={consentRef}
          className={`rounded-[var(--radius-inner)] transition-shadow ${isNudged && next.isDisabled ? 'ring-2 ring-[var(--color-text-red)] ring-offset-4 ring-offset-[var(--color-background-surface)]' : ''}`}
        >
          <ConsentList consent={consent} />
        </div>
        {isNudged && next.isDisabled && (
          <Text type="supporting" weight="semibold" className="text-[var(--color-text-red)]" role="alert">
            필수 약관에 동의해야 다음으로 넘어갈 수 있어요
          </Text>
        )}
        <Button label="다음" variant="primary" size="lg" width="100%" onClick={onNext} />
      </FlowBottomBar>
    </div>
  )
}

/** The rules word for word, for 전문 보기: the phone shows only their summary. */
export function ReservationGuideFull() {
  // Section titles one step up from the rule titles inside them, so the two
  // levels read apart.
  const block = (title: string, lead: string, children: ReactNode) => (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <Heading level={3} className="!text-base !font-bold">
          {title}
        </Heading>
        <Text type="supporting" size="sm" color="secondary" display="block">
          {lead}
        </Text>
      </div>
      {children}
    </div>
  )
  return (
    <div className="flex flex-col gap-5">
      {block(
        PICKUP_GUIDE.title,
        PICKUP_GUIDE.lead,
        <>
          <ul className="m-0 flex list-disc flex-col gap-1 ps-4">
            {PICKUP_ESSENTIALS.map((item) => (
              <li key={item.label}>
                <Text type="supporting" size="sm" display="block">
                  <Text type="inherit" weight="semibold">
                    {item.label}
                  </Text>{' '}
                  {item.note}
                </Text>
              </li>
            ))}
          </ul>
          {PICKUP_CHECKS.map((rule) => (
            <RuleItem key={rule.term} rule={rule} />
          ))}
          <RuleItem rule={ID_CARD_RULE} />
        </>,
      )}
      {block(
        PROXY_GUIDE.title,
        PROXY_GUIDE.lead,
        <>
          {PROXY_RULES.map((rule) => (
            <RuleItem key={rule.term} rule={rule} />
          ))}
          <Text type="supporting" size="sm" color="secondary" display="block">
            {PROXY_NOTE}
          </Text>
        </>,
      )}
      {block(
        WARNINGS_GUIDE.title,
        WARNINGS_GUIDE.lead,
        RESERVATION_WARNINGS.map((rule) => <RuleItem key={rule.term} rule={rule} tone="danger" />),
      )}
    </div>
  )
}

/**
 * Step 1. Two layouts rather than one that stretches: a reading column beside
 * a summary rail on wide screens, a one-line checklist with a bottom bar on a
 * phone. `actions` belong to the wide rail; the phone takes `next` and `onExit`.
 */
export function TermsStep({
  consent,
  actions,
  onExit,
  next,
  editDeadline,
}: {
  consent: ConsentControl
  actions: ReactNode
  onExit: () => void
  next: TermsNext
  /** When schedule changes stop (ISO): the phone's 꼭 알아 두세요 names it. */
  editDeadline?: string
}) {
  return (
    <>
      <WideTerms consent={consent} actions={actions} editDeadline={editDeadline} />
      <NarrowTerms consent={consent} onExit={onExit} next={next} editDeadline={editDeadline} />
    </>
  )
}
