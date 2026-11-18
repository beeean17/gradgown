import { Fragment, useState, type ReactNode } from 'react'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import type { Rule } from '../../../shared/content/rules'
import type { MentoringEvent } from '../../../shared/types'
import { FlowTitle } from '../../../shared/ui/flow/FlowTitle'
import { ConsentCard, ConsentList, type ConsentControl } from '../../../shared/ui/flow/ConsentCard'
import { FlowBottomBar } from '../../../shared/ui/flow/FlowBottomBar'
import type { TermsNext } from '../../reservation/components/TermsStep'
import { DEFAULT_NOTES, EPIC_FOLIO, HOW_TO_APPLY, HOW_TO_APPLY_STEPS, NOTES_GUIDE, PROGRAM, TERMS_BRIEF } from '../content/guide'
import { BriefList } from '../../../shared/ui/flow/BriefList'
import { eventDateLabel, sessionTimeLabel } from '../eventInfo'
import { FLOW_NAME, FLOW_STEPS } from '../flowSteps'
import { EpicFolioNotice } from './EpicFolioNotice'

/* --- Shared pieces ------------------------------------------------------ */

function RuleItem({ rule }: { rule: Rule }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Text type="label">{rule.term}</Text>
      <Text type="supporting" size="sm" color="secondary" display="block" className="text-pretty">
        {rule.detail}
      </Text>
    </div>
  )
}

function NoteList({ notes }: { notes: string[] }) {
  return (
    <ul className="m-0 flex list-disc flex-col gap-1.5 ps-4">
      {notes.map((note) => (
        <li key={note}>
          <Text type="supporting" size="sm" color="secondary" display="block" className="text-pretty">
            {note}
          </Text>
        </li>
      ))}
    </ul>
  )
}

function Intro({ event }: { event: MentoringEvent }) {
  return (
    <Text type="body" color="secondary" display="block" className="text-pretty leading-relaxed">
      {event.intro.trim() || PROGRAM.defaultIntro}
    </Text>
  )
}

/* --- Shared content ------------------------------------------------------ */

/**
 * The step's content, the same on every screen: one tinted box (when and
 * where — what a student plans the day around), then one-line points under
 * plain labels. The operator's notes are shown as written; only the fixed
 * rules are briefed. The full wording is the documents' 보기.
 */
function TermsContent({ event }: { event: MentoringEvent }) {
  const notes = event.notes.length > 0 ? event.notes : DEFAULT_NOTES
  const facts = [
    ['일시', eventDateLabel(event)],
    ['장소', event.location],
    ...event.sessions.map((session) => [session.label, sessionTimeLabel(session)]),
  ]
  return (
    <>
      <section
        aria-label="행사 안내"
        className="flex flex-col gap-3 rounded-2xl border border-[var(--color-reservation-warning-border)] bg-[var(--color-reservation-warning-surface)] p-4"
      >
        <Text type="label" weight="bold">
          {PROGRAM.tagline}
        </Text>
        <dl className="grid grid-cols-[3.5rem_1fr] gap-x-3 gap-y-2">
          {facts.map(([label, value]) => (
            <Fragment key={label}>
              <dt>
                <Text type="body" color="secondary">
                  {label}
                </Text>
              </dt>
              <dd>
                <Text type="body" weight="semibold">
                  {value || '추후 안내'}
                </Text>
              </dd>
            </Fragment>
          ))}
        </dl>
      </section>

      <BriefList title={TERMS_BRIEF.howTo.title} items={TERMS_BRIEF.howTo.items} numbered />
      <BriefList title={TERMS_BRIEF.warnings.title} items={[TERMS_BRIEF.warnings.epic, ...notes]} tone="danger" />
    </>
  )
}

/* --- Wide layout -------------------------------------------------------- */

/** Wide: the phone's content in a reading column, the consents and the actions in a rail. */
function WideTerms({ event, consent, actions }: { event: MentoringEvent; consent: ConsentControl; actions: ReactNode }) {
  return (
    <div className="hidden min-h-0 flex-1 overflow-y-auto px-16 pt-9 pb-6 desk:block">
      <div className="mx-auto flex w-full max-w-[var(--page-max-w)] flex-col gap-6.5 pb-7">
        <FlowTitle flowName={FLOW_NAME} step={1} totalSteps={FLOW_STEPS.length} stepName={FLOW_STEPS[0].nav}>
          약관에 동의해 주세요
        </FlowTitle>
        <div className="grid items-start grid-cols-[minmax(0,1fr)_var(--rail-w)] gap-[var(--rail-gap)]">
          <main className="flex min-w-0 flex-col gap-7">
            <TermsContent event={event} />
          </main>
          <aside className="sticky top-0 flex flex-col gap-4">
            <EpicFolioNotice event={event} compact />
            <ConsentCard consent={consent} actions={actions} />
          </aside>
        </div>
      </div>
    </div>
  )
}

/* --- Narrow layout ------------------------------------------------------ */

/**
 * The phone, the same shape as the reservation terms: one tinted box (when and
 * where — what a student plans the day around), then one-line points under
 * plain labels. The full wording — the programme intro, the rules, the
 * notes' lead and the EPIC Folio paths — is under 전문 보기 (MentoringGuideFull).
 * The operator's notes are shown as written; only the fixed rules are briefed.
 */
function NarrowTerms({ event, consent, onExit, next }: { event: MentoringEvent; consent: ConsentControl; onExit: () => void; next: TermsNext }) {
  // 다음 stays pressable: pressed before agreeing, it points at the consents.
  const [isNudged, setNudged] = useState(false)
  return (
    <div className="flex min-h-0 flex-1 flex-col desk:hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-8">
        <div className="flex flex-col gap-7">
          <FlowTitle flowName={FLOW_NAME} step={1} totalSteps={FLOW_STEPS.length} stepName={FLOW_STEPS[0].nav} onExit={onExit} exitLabel="St:talk 신청 나가기">
            약관에 동의해 주세요
          </FlowTitle>

          <TermsContent event={event} />
        </div>
      </div>

      <FlowBottomBar>
        <div className={`rounded-[var(--radius-inner)] ${isNudged && next.isDisabled ? 'ring-2 ring-[var(--color-text-red)] ring-offset-4 ring-offset-[var(--color-background-surface)]' : ''}`}>
          <ConsentList consent={consent} />
        </div>
        {isNudged && next.isDisabled && (
          <Text type="supporting" weight="semibold" className="text-[var(--color-text-red)]" role="alert">
            필수 약관에 동의해야 다음으로 넘어갈 수 있어요
          </Text>
        )}
        <Button label="다음" variant="primary" size="lg" width="100%" onClick={() => (next.isDisabled ? setNudged(true) : next.onNext())} />
      </FlowBottomBar>
    </div>
  )
}

/** The programme's wording in full, for 전문 보기: the phone shows only a summary. */
export function MentoringGuideFull({ event }: { event: MentoringEvent }) {
  const notes = event.notes.length > 0 ? event.notes : DEFAULT_NOTES
  const block = (title: string, lead: string | undefined, children: ReactNode) => (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <Text type="label">{title}</Text>
        {lead && (
          <Text type="supporting" size="sm" color="secondary" display="block">
            {lead}
          </Text>
        )}
      </div>
      {children}
    </div>
  )
  return (
    <div className="flex flex-col gap-5">
      {block(`${PROGRAM.name} · ${PROGRAM.tagline}`, undefined, <Intro event={event} />)}
      {block(
        HOW_TO_APPLY.title,
        HOW_TO_APPLY.lead,
        HOW_TO_APPLY_STEPS.map((rule) => <RuleItem key={rule.term} rule={rule} />),
      )}
      {block(NOTES_GUIDE.title, NOTES_GUIDE.lead, <NoteList notes={notes} />)}
      {block(
        EPIC_FOLIO.title,
        EPIC_FOLIO.summary,
        <>
          <Text type="supporting" size="sm" color="secondary" display="block">
            {EPIC_FOLIO.detail}
          </Text>
          <Text type="supporting" size="sm" weight="bold" display="block">
            {EPIC_FOLIO.pathTitle}
          </Text>
          <ol className="m-0 flex list-decimal flex-col gap-1 ps-4">
            {EPIC_FOLIO.paths.map((path) => (
              <li key={path}>
                <Text type="supporting" size="sm" color="secondary" display="block" className="text-pretty">
                  {path}
                </Text>
              </li>
            ))}
          </ol>
        </>,
      )}
    </div>
  )
}

/**
 * Step 1 (MNT-10): the event summary and the programme's rules, then the
 * consent. Two layouts rather than one that stretches: a phone stacks the
 * sections as cards, a reading column sets them beside a summary rail.
 */
export function MentoringTermsStep({
  event,
  consent,
  actions,
  onExit,
  next,
}: {
  event: MentoringEvent
  consent: ConsentControl
  actions: ReactNode
  onExit: () => void
  next: TermsNext
}) {
  return (
    <>
      <WideTerms event={event} consent={consent} actions={actions} />
      <NarrowTerms event={event} consent={consent} onExit={onExit} next={next} />
    </>
  )
}
