import { useNavigate } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { PATHS } from '../../../app/routes/paths'
import { calendarDaysUntil, formatClock, formatMonthDayWeekday as day } from '../../../shared/lib/datetime'
import { SOCIAL } from '../../../shared/content/contact'
import { campusMapUrl } from '../../../shared/lib/map'
import { FullGuideButton } from '../../../shared/ui/FullGuideButton'
import { LoadingState } from '../../../shared/ui/LoadState'
import { ProgramCard, type ProgramRow } from '../../../shared/ui/ProgramCard'
import { StepList } from '../../../shared/ui/StepList'
import { availabilityShort, availabilityTitle, useSchedule } from '../../landing/schedule'
import { ReservationGuideFull } from '../components/TermsStep'
import { ABOUT } from '../content/guide'
import { rentalHours, reservationSummary } from '../summary'
import { useActivePeriod, useMyReservations } from '../useReservation'

const PICKUP_LOCATION = '제1학생회관 3층 320호'

/**
 * The mobile 예약 tab (and the desktop `/reservation/guide`). The flow itself
 * is immersive and sits outside the tabs (see the router), so this panel is
 * the way in: the round as the home's card with every date in rows, 예약하기
 * beside 유의사항 (the rules word for word in a dialog); the venue says it
 * once, with a map link, and the hours come from the round's slots. Then
 * what the flow does not say — what the rental is and how it goes — and a
 * way to ask. The rules' one-line summary is not repeated here —
 * the flow's terms step shows it right after 예약하기, and the size table is
 * in the size step. Signed-in only, like the
 * flow — guests get the tab's sign-in prompt (app/layouts/MobileTabs.tsx) or
 * RequireAuth on desktop.
 */
export function ReservationGuidePage() {
  const navigate = useNavigate()
  const { status, phases, periodTitle, availability, canReserve } = useSchedule()
  const { current, status: mineStatus } = useMyReservations()
  const { period } = useActivePeriod()
  const reserved = current?.status === 'reserved' ? current : null

  const apply = phases.find((phase) => phase.key === 'apply')
  const edit = phases.find((phase) => phase.key === 'edit')
  const rent = phases.find((phase) => phase.key === 'rentReturn')
  // The closing minute too: "until 11/22" alone reads as midnight.
  const range = (start: string, end: string) => `${day(start)} ~ ${day(end)} ${formatClock(end)}까지`
  const rows: ProgramRow[] = []
  if (apply) {
    rows.push({
      label: '예약 기간',
      value: range(apply.startAt, apply.endAt),
      emphasis: availability === 'open' ? `D-${Math.max(0, calendarDaysUntil(apply.endAt))}` : undefined,
    })
  }
  // Editing usually closes with booking; a separate row only when it doesn't.
  if (edit && (edit.startAt !== apply?.startAt || edit.endAt !== apply?.endAt)) {
    rows.push({ label: '수정 기간', value: range(edit.startAt, edit.endAt) })
  }
  if (rent) rows.push({ label: '수령·반납', value: `${day(rent.startAt)} ~ ${day(rent.endAt)}` })
  const hours = rentalHours(period)
  if (hours) rows.push({ label: '시간', value: hours })
  rows.push({ label: '장소', value: PICKUP_LOCATION, link: { label: '지도', href: campusMapUrl(PICKUP_LOCATION) } })

  return (
    <article
      className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-4 pb-8 pt-6 sm:px-6 lg:max-w-[calc(var(--page-max-w)+8rem)] lg:px-16 lg:pb-28 lg:pt-10"
      aria-labelledby="reservation-guide-title"
    >
      <Heading id="reservation-guide-title" level={1} className="sr-only">
        학위복 대여
      </Heading>

      {/* A phone stacks the card over the rest; a wide screen sets the card in a
          sticky rail on the right, like the St:talk page. */}
      <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1fr)_var(--rail-w)] lg:items-start lg:gap-[var(--rail-gap)]">
      <div className="lg:sticky lg:top-24 lg:order-2">
      {status === 'loading' ? (
        <section className="rounded-xl border border-border bg-surface">
          <LoadingState label="예약 일정을 불러오고 있어요" minHeight="15rem" />
        </section>
      ) : (
        <ProgramCard
          kicker={periodTitle.replace(/\s*학위복 대여$/, '') || periodTitle}
          title={status === 'error' ? '예약 일정을 불러오지 못했어요' : availabilityTitle(availability)}
          status={availabilityShort(availability)}
          isActive={availability === 'open'}
          rows={status === 'error' ? [] : rows}
          mine={reserved ? { label: '예약했어요', value: reservationSummary(reserved) } : undefined}
          actions={
            reserved ? (
              <Button label="내 신청 보기" variant="secondary" size="lg" width="100%" onClick={() => navigate(PATHS.me.reservations)} />
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <Button
                    label="학위복 예약하기"
                    variant="primary"
                    size="lg"
                    width="100%"
                    isDisabled={!canReserve || mineStatus === 'loading'}
                    onClick={() => navigate(PATHS.public.reservation)}
                  />
                </div>
                <div className="shrink-0">
                  <FullGuideButton title="학위복 대여 유의사항" label="유의사항" width={undefined}>
                    <ReservationGuideFull />
                  </FullGuideButton>
                </div>
              </>
            )
          }
        />
      )}

      </div>

      <div className="flex min-w-0 flex-col gap-7 lg:order-1">
      {/* The heading inside the card, so on a wide screen its top lines up with
          the rail's card beside it. */}
      <section aria-labelledby="reservation-about-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4.5">
          <Heading id="reservation-about-heading" level={2} className="!text-lg !font-bold">
            {ABOUT.title}
          </Heading>
          <Text as="p" display="block" type="body" className="text-pretty break-keep !leading-relaxed">
            {ABOUT.summary}
          </Text>
          <StepList steps={ABOUT.steps} />
        </div>
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
      </div>
      </div>
    </article>
  )
}
