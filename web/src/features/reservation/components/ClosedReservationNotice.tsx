import { useNavigate } from 'react-router-dom'
import { VStack } from '@astryxdesign/core/Stack'
import { Link } from '@astryxdesign/core/Link'
import { Card } from '@astryxdesign/core/Card'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { PeriodNotice } from '../../../shared/ui/PeriodNotice'
import { formatDateRange } from '../../../shared/lib/datetime'
import { PATHS } from '../../../app/routes/paths'
import type { ReservationPeriod } from '../../../shared/types'
import type { ReservationAvailability } from '../useReservation'

/**
 * The apply window is shut. Which of the four reasons it is matters to the
 * student — "operations paused it" and "you're early" and "it's over" lead to
 * different next actions — so each gets its own wording rather than one
 * catch-all "마감" banner. Wording follows the Flutter screen it replaces.
 */
const REASONS: Record<
  Exclude<ReservationAvailability, 'open'>,
  { status: 'info' | 'warning'; title: string; description: string }
> = {
  suspended: {
    status: 'warning',
    title: '현재 학위복 예약이 잠시 중단되어 있어요',
    description: '운영진이 예약을 잠시 닫아 두었어요. 아래 일정이나 공지사항을 확인해 주세요.',
  },
  upcoming: {
    status: 'info',
    title: '아직 예약 시작 전이에요',
    description: '예약 시작 시간이 지나면 바로 신청할 수 있어요.',
  },
  ended: {
    status: 'warning',
    title: '이번 학위복 예약 기간이 종료되었어요',
    description: '예약과 수정 기간이 모두 끝났어요. 문의는 총졸업준비위원회 인스타그램(@grad_seoultech)으로 해 주세요.',
  },
  none: {
    status: 'info',
    title: '아직 예약이 열리지 않았어요',
    description: '예약 기간이 정해지면 공지사항으로 알려드려요.',
  },
}

export function ClosedReservationNotice({
  availability,
  period,
}: {
  availability: Exclude<ReservationAvailability, 'open'>
  period: ReservationPeriod | null
}) {
  const reason = REASONS[availability]

  if (availability === 'ended') {
    return <EndedReservationNotice period={period} />
  }

  return (
    <VStack gap={4}>
      <PeriodNotice
        status={reason.status}
        title={reason.title}
        description={reason.description}
        action={
          <Link href={PATHS.public.announcements} isStandalone>
            공지사항 보기
          </Link>
        }
      />

      {/* The dates are the answer to "then when?", so they stay on screen
          even though the flow itself is unavailable. */}
      {period && (
        <Card padding={4} elevation="low">
          <MetadataList label={{ position: 'start', width: 88 }}>
            <MetadataListItem label="예약 기간">
              {formatDateRange(period.applyStartAt, period.applyEndAt)}
            </MetadataListItem>
            <MetadataListItem label="수정 기간">
              {formatDateRange(period.editStartAt, period.editEndAt)}
            </MetadataListItem>
          </MetadataList>
        </Card>
      )}
    </VStack>
  )
}

/**
 * The end-of-window state is a destination rather than an inline warning.
 * It keeps the same immersive reservation chrome but trades the empty flow
 * body for the compact, centred summary from the approved mockup.
 */
function EndedReservationNotice({ period }: { period: ReservationPeriod | null }) {
  const navigate = useNavigate()
  const dates = period && {
    apply: formatDateRange(period.applyStartAt, period.applyEndAt),
    edit: formatDateRange(period.editStartAt, period.editEndAt),
  }

  const actions = (
    <div className="flex gap-2.5 [&>*]:flex-1 desk:[&>*]:flex-none">
      <Button
        label="공지사항 보기"
        variant="primary"
        size="lg"
        onClick={() => navigate(PATHS.public.announcements)}
      />
      <Button
        label="내 신청 보기"
        variant="secondary"
        size="lg"
        onClick={() => navigate(PATHS.me.reservations)}
      />
    </div>
  )

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6 desk:items-center desk:justify-center desk:px-8">
        <div className="gx-pop flex w-full max-w-[35rem] flex-col gap-6">
          <div className="flex flex-col gap-2.5 desk:gap-3">
            <div className="flex flex-col gap-2.5 desk:flex-row desk:items-center">
              <Icon icon="warning" color="warning" size="lg" />
              <Heading level={1} className="text-2xl desk:text-3xl">
                이번 학위복 예약 기간이 종료되었어요
              </Heading>
            </div>
            <Text type="body" color="secondary" display="block" className="text-pretty">
              예약 기간이 끝났어요. 문의는 총졸업준비위원회 인스타그램(@grad_seoultech)으로 해 주세요.
            </Text>
          </div>

          {dates && (
            <Card padding={4} elevation="none">
              <MetadataList
                label={{ position: 'start', width: 'var(--spacing-20)' }}
                className="hidden desk:block"
              >
                <MetadataListItem label="예약 기간">{dates.apply}</MetadataListItem>
                <MetadataListItem label="수정 기간">{dates.edit}</MetadataListItem>
              </MetadataList>
              <MetadataList label={{ position: 'top' }} className="desk:hidden">
                <MetadataListItem label="예약 기간">{dates.apply}</MetadataListItem>
                <MetadataListItem label="수정 기간">{dates.edit}</MetadataListItem>
              </MetadataList>
            </Card>
          )}

          <div className="hidden desk:block">{actions}</div>
        </div>
      </div>

      <footer className="flex-none rounded-t-[var(--radius-container)] border-t border-[var(--color-border)] bg-[var(--color-background-body)] px-4 pt-4 pb-[calc(var(--spacing-5)+env(safe-area-inset-bottom))] desk:hidden">
        {actions}
      </footer>
    </main>
  )
}
