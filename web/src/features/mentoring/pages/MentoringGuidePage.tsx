import { useNavigate } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { PATHS } from '../../../app/routes/paths'
import { useAuth } from '../../../shared/auth/useAuth'
import { useAuthModal } from '../../../shared/auth/AuthModalContext'
import { SOCIAL } from '../../../shared/content/contact'
import { useIsDesktop } from '../../../shared/hooks/useMediaQuery'
import { calendarDaysUntil, formatClock, formatMonthDayWeekday as day } from '../../../shared/lib/datetime'
import { campusMapUrl } from '../../../shared/lib/map'
import type { MentoringEvent, MentoringRegistration } from '../../../shared/types'
import { FullGuideButton } from '../../../shared/ui/FullGuideButton'
import { LoadErrorState, LoadingState } from '../../../shared/ui/LoadState'
import { ProgramCard, type ProgramRow } from '../../../shared/ui/ProgramCard'
import { StepList } from '../../../shared/ui/StepList'
import { MentoringGuideFull } from '../components/MentoringTermsStep'
import { ABOUT_STEPS, EPIC_FOLIO, PROGRAM } from '../content/guide'
import { availabilityShort, availabilityTitle, eventScheduleLines } from '../eventInfo'
import { describeOption, namedOptions, splitOptionName } from '../mentoringData'
import { mentoringAvailability, useMentoringTester, useMyRegistrations, type MentoringAvailability } from '../useMentoring'

/**
 * The named options (MNT-4), visible before sign-in so a student can decide
 * first: two columns of tiles, the company large and "직무 · 학과" under it
 * (entered as "회사/직무/학과"). No numbers — they would read as steps.
 */
function MentorList({ event }: { event: MentoringEvent }) {
  const mentors = namedOptions(event)
  if (mentors.length === 0) {
    return (
      <Text type="body" color="secondary">
        멘토는 확정되면 여기에 표시돼요.
      </Text>
    )
  }
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0">
      {mentors.map((choice) => {
        const { name, details } = splitOptionName(event.options[choice.value - 1] ?? '')
        return (
          <li key={choice.value} className="flex min-w-0 flex-col gap-0.5 rounded-[var(--radius-inner)] bg-[var(--color-background-muted)] px-3.5 py-3">
            <Text type="body" weight="bold" className="break-keep">
              {name}
            </Text>
            {details.length > 0 && (
              <Text type="supporting" color="secondary" className="break-keep">
                {details.join(' · ')}
              </Text>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** The event as a card: where it stands, every date and hour in rows, and the way in. */
function EventCard({
  event,
  availability,
  registration,
  onApply,
  onOpenMine,
}: {
  event: MentoringEvent
  availability: MentoringAvailability
  registration: MentoringRegistration | null
  onApply: () => void
  onOpenMine: () => void
}) {
  const rows: ProgramRow[] = []
  if (event.applyStartAt && event.applyEndAt) {
    // The closing minute too: on the event day itself, "until 11/20" alone
    // reads as "apply at the door".
    rows.push({
      label: '신청 기간',
      value: `${day(event.applyStartAt)} ~ ${day(event.applyEndAt)} ${formatClock(event.applyEndAt)}까지`,
      emphasis: availability === 'open' ? `D-${Math.max(0, calendarDaysUntil(event.applyEndAt))}` : undefined,
    })
  }
  rows.push({ label: '일시', value: eventScheduleLines(event) || '추후 안내' })
  rows.push({
    label: '장소',
    value: event.location || '추후 안내',
    link: event.location ? { label: '지도', href: campusMapUrl(event.location) } : undefined,
  })

  const choices = registration
    ? [registration.firstOption, registration.secondOption]
        .map((option, index) => `${event.sessions[index]?.label ?? `${index + 1}차시`} ${describeOption(event, option).label}`)
        .join(' · ')
    : ''

  return (
    <ProgramCard
      kicker={PROGRAM.tagline}
      title={availabilityTitle(availability)}
      status={availabilityShort(availability)}
      isActive={availability === 'open'}
      rows={rows}
      mine={registration ? { label: '신청했어요', value: choices } : undefined}
      actions={
        registration ? (
          <Button label="내 신청 보기" variant="secondary" size="lg" width="100%" onClick={onOpenMine} />
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <Button label="St:talk 신청하기" variant="primary" size="lg" width="100%" isDisabled={availability !== 'open'} onClick={onApply} />
            </div>
            <div className="shrink-0">
              <FullGuideButton title="St:talk 유의사항" label="유의사항" width={undefined}>
                <MentoringGuideFull event={event} />
              </FullGuideButton>
            </div>
          </>
        )
      }
    />
  )
}

/**
 * The St:talk guide (MNT-2~4): the mobile St:talk tab and the desktop
 * `/mentoring` page, in the 예약 tab's shape. The event card (dates, hours,
 * venue once with a map link) with 신청하기 beside 유의사항 (the rules word for
 * word in a dialog); then what the flow does not say — "St:talk이란" with the
 * three steps (EPIC Folio's separate sign-up in bold) and the mentor list —
 * and a way to ask. The terms step's one-line rules are not repeated here.
 * Public: readable before sign-in; only 신청하기 asks for an account.
 */
export function MentoringGuidePage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const { user } = useAuth()
  const { openLoginModal } = useAuthModal()
  const { event, current, status, retry } = useMyRegistrations()
  const { isTester } = useMentoringTester()
  const availability = mentoringAvailability(event, undefined, isTester)

  const startApply = () => {
    if (user) navigate(PATHS.public.mentoringApply)
    else openLoginModal({ redirectTo: PATHS.public.mentoringApply })
  }
  const openMine = () => {
    if (user) navigate(PATHS.me.mentoring)
    else openLoginModal({ redirectTo: PATHS.me.mentoring })
  }

  const registration = current?.status === 'reserved' ? current : null
  const isEpicOpen = Boolean(event?.isEpicFolioLinkOpen && event.epicFolioUrl)

  const title = (
    <Heading id="mentoring-guide-title" level={1} className="sr-only">
      {PROGRAM.name}
    </Heading>
  )

  const card =
    status === 'loading' ? (
      <section className="rounded-xl border border-border bg-surface">
        <LoadingState label="St:talk 일정을 불러오고 있어요" minHeight="18rem" />
      </section>
    ) : status === 'error' ? (
      <LoadErrorState title="St:talk 일정을 불러오지 못했어요" onRetry={retry} />
    ) : event ? (
      <EventCard event={event} availability={availability} registration={registration} onApply={startApply} onOpenMine={openMine} />
    ) : (
      <Text as="p" display="block" type="body" color="secondary">
        행사 일정이 정해지면 이곳과 공지사항에서 알려드려요.
      </Text>
    )

  const body = event && (
    <>
      {/* The heading inside the card, so on a wide screen its top lines up with
          the rail's card beside it. */}
      <section aria-labelledby="mentoring-about-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4.5">
          <Heading id="mentoring-about-heading" level={2} className="!text-lg !font-bold">
            St:talk이란
          </Heading>
          <Text as="p" display="block" type="body" className="text-pretty break-keep !leading-relaxed">
            {event.intro.trim() || PROGRAM.defaultIntro}
          </Text>
          <StepList steps={ABOUT_STEPS} />
          {/* The operator switches this on in the admin console once the link
              exists (it often comes late); off, there is nothing to show. */}
          {isEpicOpen && event && (
            <Button
              label={EPIC_FOLIO.linkLabel}
              variant="primary"
              size="lg"
              width="100%"
              href={event.epicFolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              endContent={<Icon icon="externalLink" size="sm" />}
            />
          )}
        </div>
      </section>
      {/* Its own card, like "St:talk이란" beside it: the heading inside, the
          mentors as tiles on the card's muted ground. */}
      <section aria-labelledby="mentoring-mentors-heading" className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4.5">
        <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <Heading id="mentoring-mentors-heading" level={2} className="!text-lg !font-bold">
            멘토
          </Heading>
          <Text type="supporting" color="secondary">
            1·2차시 모두 같은 멘토가 나와요
          </Text>
        </header>
        <MentorList event={event} />
      </section>
      <Button
        label="인스타그램으로 문의하기"
        variant="secondary"
        size="lg"
        width="100%"
        href={SOCIAL.instagram.href}
        target="_blank"
        rel="noopener noreferrer"
        endContent={<Icon icon="externalLink" size="sm" />}
      />
    </>
  )

  if (isDesktop) {
    return (
      <section className="w-full px-16 pb-28 pt-10" aria-labelledby="mentoring-guide-title">
        <div className="mx-auto w-full max-w-[var(--page-max-w)]">
          {title}
          <div className="grid items-start grid-cols-[minmax(0,1fr)_var(--rail-w)] gap-[var(--rail-gap)]">
            <article className="flex min-w-0 flex-col gap-7" aria-label="St:talk 안내">
              {body}
            </article>
            <aside className="sticky top-24 flex flex-col gap-6">{card}</aside>
          </div>
        </div>
      </section>
    )
  }

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-4 pb-8 pt-6 sm:px-6" aria-labelledby="mentoring-guide-title">
      {title}
      {card}
      {body}
    </article>
  )
}
