import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { PATHS } from '../../app/routes/paths'
import { useAuth } from '../../shared/auth/useAuth'
import { useAuthModal } from '../../shared/auth/AuthModalContext'
import { calendarDaysUntil, formatClock, formatMonthDayWeekday as day } from '../../shared/lib/datetime'
import type { ReactNode } from 'react'
import { useAnnouncements, usePinnedAnnouncements } from '../announcements/useAnnouncements'
import { AnnouncementRow } from '../../shared/ui/AnnouncementRow'
import { PROGRAM } from '../mentoring/content/guide'
import { availabilityShort as mentoringShort } from '../mentoring/eventInfo'
import { mentoringAvailability, useMentoringEvent, useMentoringTester, useMyRegistrations } from '../mentoring/useMentoring'
import { useMyReservations } from '../reservation/useReservation'
import { LoadingState } from '../../shared/ui/LoadState'
import { ProgramCard, type ProgramRow } from '../../shared/ui/ProgramCard'
import { reservationSummary } from '../reservation/summary'
import { availabilityShort, useSchedule } from './schedule'

/** A card's place while its data loads, at about its real height. */
function CardSkeleton({ label }: { label: string }) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <LoadingState label={label} minHeight="13rem" />
    </section>
  )
}

/** A card's main action, with 안내 (the programme's tab) beside it on every card. */
function CardActions({ main, guidePath }: { main: ReactNode; guidePath: string }) {
  const navigate = useNavigate()
  return (
    <>
      <div className="min-w-0 flex-1">{main}</div>
      <div className="shrink-0">
        <Button label="안내" variant="secondary" size="lg" onClick={() => navigate(guidePath)} />
      </div>
    </>
  )
}

/** The gown rental: the deadline that matters now, the pickup days, and the way in. */
function ReservationCard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { openLoginModal } = useAuthModal()
  const { status, phases, periodTitle, ddayToDeadline, availability, canReserve } = useSchedule()
  const { current, status: mineStatus } = useMyReservations()

  if (status === 'loading') return <CardSkeleton label="예약 일정을 불러오고 있어요" />

  const apply = phases.find((phase) => phase.key === 'apply')
  const rent = phases.find((phase) => phase.key === 'rentReturn')
  const rows: ProgramRow[] = []
  if (apply) {
    if (availability === 'open') rows.push({ label: '예약 마감', value: `${day(apply.endAt)} ${formatClock(apply.endAt)}`, emphasis: `D-${ddayToDeadline}` })
    else if (availability === 'upcoming') rows.push({ label: '예약 시작', value: day(apply.startAt) })
    else rows.push({ label: '예약 기간', value: `${day(apply.startAt)} ~ ${day(apply.endAt)}` })
  }
  if (rent) rows.push({ label: '수령·반납', value: `${day(rent.startAt)} ~ ${day(rent.endAt)}` })

  const reserved = current?.status === 'reserved' ? current : null
  const mine = reserved
    ? {
        label: '예약했어요',
        value: reservationSummary(reserved),
      }
    : undefined

  const startReservation = () => {
    if (user) navigate(PATHS.public.reservation)
    else openLoginModal({ redirectTo: PATHS.public.reservation })
  }

  return (
    <ProgramCard
      kicker="학위복 대여"
      title={status === 'error' ? '예약 일정을 불러오지 못했어요' : periodTitle.replace(/^\d{4}년\s*/, '')}
      // Once booked, the card says so: the state is the student's, not the round's.
      status={reserved ? '예약 완료' : availabilityShort(availability)}
      statusColor={reserved ? 'green' : undefined}
      isActive={availability === 'open'}
      rows={status === 'error' ? [] : rows}
      mine={mine}
      actions={
        <CardActions
          guidePath={PATHS.public.reservationGuide}
          main={
            reserved ? (
              <Button label="내 신청 보기" variant="secondary" size="lg" width="100%" onClick={() => navigate(PATHS.me.reservations)} />
            ) : (
              <Button
                label="학위복 예약하기"
                variant="primary"
                size="lg"
                width="100%"
                isDisabled={!canReserve || (Boolean(user) && mineStatus === 'loading')}
                onClick={startReservation}
              />
            )
          }
        />
      }
    />
  )
}

/** St:talk: the application deadline, the event day, and 신청하기 beside the guide. */
function MentoringCard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { openLoginModal } = useAuthModal()
  const { event, current, status } = useMyRegistrations()
  const { isTester } = useMentoringTester()

  if (status === 'loading') return <CardSkeleton label="St:talk 일정을 불러오고 있어요" />
  // A home without St:talk is normal: no card until an event is set up (v2).
  if (!event || event.schema !== 'v2') return null

  const availability = mentoringAvailability(event, undefined, isTester)
  const rows: ProgramRow[] = []
  if (event.applyStartAt && event.applyEndAt) {
    if (availability === 'open') {
      const left = Math.max(0, calendarDaysUntil(event.applyEndAt))
      rows.push({ label: '신청 마감', value: `${day(event.applyEndAt)} ${formatClock(event.applyEndAt)}`, emphasis: `D-${left}` })
    } else if (availability === 'upcoming') rows.push({ label: '신청 시작', value: day(event.applyStartAt) })
    else rows.push({ label: '신청 기간', value: `${day(event.applyStartAt)} ~ ${day(event.applyEndAt)}` })
  }
  // Dates only on the home, like the gown card; the venue is on the St:talk tab.
  if (event.date) rows.push({ label: '행사', value: day(event.date) })

  const registered = current?.status === 'reserved'
  const startApply = () => {
    if (user) navigate(PATHS.public.mentoringApply)
    else openLoginModal({ redirectTo: PATHS.public.mentoringApply })
  }

  return (
    <ProgramCard
      kicker={PROGRAM.name}
      // A one-off event: named for what it is, not for the month like a rental round.
      title={PROGRAM.tagline}
      status={registered ? '신청 완료' : mentoringShort(availability)}
      statusColor={registered ? 'green' : undefined}
      isActive={availability === 'open'}
      rows={rows}
      mine={registered ? { label: '신청했어요', value: event.date ? `${day(event.date)} 참여` : '신청 완료' } : undefined}
      actions={
        <CardActions
          guidePath={PATHS.public.mentoring}
          main={
            registered ? (
              <Button label="내 신청 보기" variant="secondary" size="lg" width="100%" onClick={() => navigate(PATHS.me.mentoring)} />
            ) : (
              <Button label="St:talk 신청하기" variant="primary" size="lg" width="100%" isDisabled={availability !== 'open'} onClick={startApply} />
            )
          }
        />
      }
    />
  )
}

/**
 * The home: the two programmes as equal cards — each with its state, the
 * dates that matter and one way in — then the notices. The phone's 홈 tab and,
 * side by side, the wide screen's home (LandingPage adds the footer there).
 * The cards are shortcuts, not hubs: each programme has its own tab and page.
 */
export function MobileLanding() {
  const { items: pinned, status: pinnedStatus } = usePinnedAnnouncements(2)
  const { items: allNotices, status: noticesStatus } = useAnnouncements()
  // No pinned notice: the latest ones instead, under a plain 공지사항.
  const notices = pinned.length > 0 ? pinned : allNotices.slice(0, 2)
  const noticeTitle = pinned.length > 0 ? '중요 공지사항' : '공지사항'
  const isNoticesReady = pinnedStatus === 'ready' && noticesStatus === 'ready'

  // The programme that closes first goes first while both are open; otherwise
  // the gown rental leads. Read from the same subscriptions the cards use.
  const { phases, availability } = useSchedule()
  const { event } = useMentoringEvent()
  const { isTester } = useMentoringTester()
  const gownEnd = availability === 'open' ? phases.find((phase) => phase.key === 'apply')?.endAt : undefined
  const talkEnd = event && mentoringAvailability(event, undefined, isTester) === 'open' ? event.applyEndAt : undefined
  const talkFirst = Boolean(talkEnd && (!gownEnd || new Date(talkEnd).getTime() < new Date(gownEnd).getTime()))

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6 lg:max-w-[calc(var(--page-max-w)+8rem)] lg:gap-6 lg:px-16 lg:pb-16 lg:pt-10">
      <Heading level={1} className="sr-only">
        진행 중인 행사
      </Heading>

      {/* Stacked on a phone, side by side on a wide screen. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        {talkFirst ? (
          <>
            <MentoringCard />
            <ReservationCard />
          </>
        ) : (
          <>
            <ReservationCard />
            <MentoringCard />
          </>
        )}
      </div>

      <section className="mt-4 flex flex-col gap-3" aria-labelledby="mobile-notice-heading">
        <header className="flex items-center justify-between gap-3">
          <Heading id="mobile-notice-heading" level={2} className="!text-lg !font-bold">
            {noticeTitle}
          </Heading>
          <Link
            to={PATHS.public.announcements}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-accent no-underline focus-visible:outline-2 focus-visible:outline-accent-bg"
          >
            전체 보기
          </Link>
        </header>
        {notices.length > 0 ? (
          <ul className="m-0 list-none divide-y divide-border rounded-xl border border-border bg-surface p-0">
            {notices.map((item) => (
              <AnnouncementRow key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          isNoticesReady && (
            <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center">
              <Text type="supporting" color="secondary">
                아직 올라온 공지가 없어요.
              </Text>
            </div>
          )
        )}
      </section>
    </section>
  )
}
