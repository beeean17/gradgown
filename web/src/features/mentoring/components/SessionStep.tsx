import { useRef, useState, type ReactNode } from 'react'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { MENTORING_NONE, type MentoringEvent, type MentoringSession } from '../../../shared/types'
import { ChoiceTile } from '../../../shared/ui/ChoiceTile'
import { FlowTitle } from '../../../shared/ui/flow/FlowTitle'
import { BriefList } from '../../../shared/ui/flow/BriefList'
import { sessionLabel, sessionTimeLabel } from '../eventInfo'
import { describeOption, optionChoices } from '../mentoringData'
import { FLOW_NAME, FLOW_STEPS } from '../flowSteps'
import type { SessionSelection } from '../selection'

/**
 * One session's eight choices: options 1–7 and 선택 안함, the same list for
 * both sessions. The number already chosen for the other session stays
 * visible but disabled (MNT-12), so the student sees why it is not on offer
 * here rather than wondering where it went. An option without a name (only
 * in a closed draft) is listed by number and cannot be chosen.
 */
function SessionChoices({
  session,
  event,
  value,
  otherValue,
  onChange,
  hasHeader = true,
}: {
  session: MentoringSession
  event: MentoringEvent
  value: number | null
  otherValue: number | null
  onChange: (option: number) => void
  /** Off inside the phone's tabs, where the tab already names the session. */
  hasHeader?: boolean
}) {
  const time = sessionTimeLabel(session)
  return (
    <section className="flex flex-col gap-3" aria-label={`${session.label} 선택`}>
      <VStack gap={0.5} className={hasHeader ? undefined : 'hidden'}>
        <Text type="label" weight="bold" className="text-lg">
          {session.label}
        </Text>
        {time && (
          <Text type="supporting" color="secondary" hasTabularNumbers>
            {time}
          </Text>
        )}
      </VStack>
      <div className="grid grid-cols-1 gap-2">
        {optionChoices(event).map((choice) => {
          const isNone = choice.value === MENTORING_NONE
          const takenElsewhere = !isNone && otherValue === choice.value
          const isDisabled = takenElsewhere || !choice.isNamed
          return (
            <ChoiceTile
              key={choice.value}
              align="start"
              isSelected={value === choice.value}
              isDisabled={isDisabled}
              onSelect={() => onChange(choice.value)}
              title={isNone ? choice.label : `${choice.value}. ${choice.label}`}
              note={
                takenElsewhere
                  ? '다른 차시에서 선택함'
                  : !choice.isNamed
                    ? '아직 이름이 정해지지 않았어요'
                    : isNone
                      ? '이 차시에는 참여하지 않아요'
                      : undefined
              }
            />
          )
        })}
      </div>
    </section>
  )
}

/**
 * Both sessions' choices. Shared by the apply flow and the inline editor.
 *
 * Wide screens set the two lists side by side. A phone shows one at a time:
 * two tabs (each naming its session, its hours and the current pick) over a
 * pager that swipes between them, kept in step both ways. Picking the first
 * session moves on to the second while the second is still open.
 */
export function SessionSelectionFields({
  event,
  value,
  onChange,
}: {
  event: MentoringEvent
  value: SessionSelection
  onChange: (next: SessionSelection) => void
}) {
  const [first, second] = event.sessions
  const [tab, setTab] = useState(0)
  const pagerRef = useRef<HTMLDivElement>(null)
  const panels = [
    first && { session: first, value: value.firstOption, other: value.secondOption, set: (firstOption: number) => onChange({ ...value, firstOption }) },
    second && { session: second, value: value.secondOption, other: value.firstOption, set: (secondOption: number) => onChange({ ...value, secondOption }) },
  ].filter((panel): panel is NonNullable<typeof panel> => Boolean(panel))

  const goTo = (index: number) => {
    setTab(index)
    const pager = pagerRef.current
    if (!pager) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    pager.scrollTo({ left: index * pager.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
  }
  const onScroll = () => {
    const pager = pagerRef.current
    if (pager && pager.clientWidth) setTab(Math.round(pager.scrollLeft / pager.clientWidth))
  }
  const pick = (index: number, option: number) => {
    panels[index].set(option)
    if (index === 0 && panels.length > 1 && value.secondOption === null) goTo(1)
  }

  return (
    <>
      <div className="flex flex-col gap-4 desk:hidden">
        <div role="tablist" aria-label="차시" className="grid grid-cols-2 gap-2.5">
          {panels.map((panel, index) => {
            const time = sessionTimeLabel(panel.session)
            const isActive = tab === index
            return (
              <button
                key={panel.session.id}
                type="button"
                role="tab"
                id={`session-tab-${index}`}
                aria-selected={isActive}
                aria-controls={`session-panel-${index}`}
                onClick={() => goTo(index)}
                className={`min-w-0 cursor-pointer rounded-[var(--radius-inner)] border px-3.5 py-3 text-left transition-colors ${
                  isActive
                    ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]'
                    : 'border-[var(--color-border)] bg-[var(--color-background-muted)] hover:border-[var(--color-border-emphasized)]'
                }`}
              >
                <span className="block text-xs font-semibold text-[var(--color-text-accent)] tabular-nums">
                  {panel.session.label}
                  {time && ` · ${time}`}
                </span>
                <span className="mt-1 block truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {panel.value === null ? '선택 전' : describeOption(event, panel.value).label}
                </span>
              </button>
            )
          })}
        </div>
        <div
          ref={pagerRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {panels.map((panel, index) => (
            <div
              key={panel.session.id}
              role="tabpanel"
              id={`session-panel-${index}`}
              aria-labelledby={`session-tab-${index}`}
              inert={tab !== index}
              className="w-full shrink-0 snap-start snap-always"
            >
              <SessionChoices
                session={panel.session}
                event={event}
                value={panel.value}
                otherValue={panel.other}
                onChange={(option) => pick(index, option)}
                hasHeader={false}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="hidden grid-cols-2 gap-8 desk:grid">
        {panels.map((panel) => (
          <SessionChoices
            key={panel.session.id}
            session={panel.session}
            event={event}
            value={panel.value}
            otherValue={panel.other}
            onChange={panel.set}
          />
        ))}
      </div>
    </>
  )
}

/** Step 3 (MNT-12). */
export function SessionStep({
  event,
  value,
  onChange,
  actions,
  onBack,
  onExit,
}: {
  event: MentoringEvent
  value: SessionSelection
  onChange: (next: SessionSelection) => void
  actions: ReactNode
  /** A phone's way back and out (FlowTitle); wide screens use `actions`. */
  onBack?: () => void
  onExit?: () => void
}) {
  const [first, second] = event.sessions
  const summary = (session: MentoringSession | undefined, option: number | null) =>
    session
      ? { label: sessionLabel(session), value: option === null ? '선택 전' : describeOption(event, option).label }
      : null
  const rows = [summary(first, value.firstOption), summary(second, value.secondOption)].filter(
    (row): row is { label: string; value: string } => row !== null,
  )

  return (
    <div className="flex flex-col gap-6.5">
      <FlowTitle flowName={FLOW_NAME} step={3} totalSteps={FLOW_STEPS.length} stepName={FLOW_STEPS[2].nav} onBack={onBack} onExit={onExit} exitLabel="St:talk 신청 나가기">
        차시별 선택지를 골라 주세요
      </FlowTitle>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_var(--rail-w)] lg:gap-[var(--rail-gap)]">
        <main className="min-w-0">
          <SessionSelectionFields event={event} value={value} onChange={onChange} />
        </main>

        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-7 desk:hidden">
            <BriefList
              title="선택 규칙"
              items={['차시마다 하나씩, 1·2차시가 같은 선택지를 써요', '한 차시에서 고른 번호는 다른 차시에서 못 골라요', '한 차시만 들으면 다른 차시는 "선택 안함"', '둘 다 "선택 안함"은 안 돼요']}
            />
          </div>
          <div className="hidden flex-col gap-4 desk:flex">
            <section className="flex flex-col gap-3 rounded-xl border border-[var(--color-reservation-warning-border)] bg-[var(--color-reservation-warning-surface)] p-4.5">
              <Text type="label" weight="bold">
                선택 규칙
              </Text>
              <VStack gap={2}>
                <Text type="supporting" size="sm" color="secondary" display="block">
                  <Text type="inherit" weight="bold" color="primary">
                    차시마다 하나씩
                  </Text>{' '}
                  1차시와 2차시가 같은 선택지를 써요. 하나씩 골라요.
                </Text>
                <Text type="supporting" size="sm" color="secondary" display="block">
                  <Text type="inherit" weight="bold" color="primary">
                    같은 선택지는 한 번만
                  </Text>{' '}
                  한 차시에서 고른 번호는 다른 차시에서 고를 수 없어요.
                </Text>
                <Text type="supporting" size="sm" color="secondary" display="block">
                  <Text type="inherit" weight="bold" color="primary">
                    한 차시만 참여해도 돼요
                  </Text>{' '}
                  참여하지 않는 차시는 "선택 안함"을 골라요. 둘 다 선택 안함은 안 돼요.
                </Text>
              </VStack>
            </section>

            <section className="flex flex-col gap-3 rounded-xl border border-[var(--color-reservation-neutral-border)] bg-[var(--color-reservation-neutral-surface)] p-4.5">
              <Text type="label" weight="bold">
                선택 내용
              </Text>
              <VStack gap={2}>
                {rows.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-3">
                    <Text type="supporting" color="secondary" className="shrink-0">
                      {row.label}
                    </Text>
                    <Text type="supporting" weight="semibold" color="primary" className="min-w-0 text-right text-pretty">
                      {row.value}
                    </Text>
                  </div>
                ))}
              </VStack>
            </section>
          </div>

          {actions}
        </aside>
      </div>
    </div>
  )
}
