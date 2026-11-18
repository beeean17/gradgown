import { useNavigate } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { Link } from '@astryxdesign/core/Link'
import { VStack } from '@astryxdesign/core/Stack'
import { PATHS } from '../../../app/routes/paths'
import { PeriodNotice } from '../../../shared/ui/PeriodNotice'
import type { MentoringEvent } from '../../../shared/types'
import type { MentoringAvailability } from '../useMentoring'
import { EventSummary } from './EventSummary'

/**
 * The apply window is shut. Which of the four reasons it is matters to the
 * student — "operations paused it", "you're early" and "it's over" lead to
 * different next actions — so each gets its own wording.
 */
const REASONS: Record<
  Exclude<MentoringAvailability, 'open'>,
  { status: 'info' | 'warning'; title: string; description: string }
> = {
  suspended: {
    status: 'warning',
    title: '현재 St:talk 접수가 잠시 닫혀 있어요',
    description: '운영진이 접수를 닫아 두었어요. 일정이나 공지사항을 확인해 주세요.',
  },
  upcoming: {
    status: 'info',
    title: '아직 St:talk 신청 시작 전이에요',
    description: '신청 시작 시간이 지나면 바로 신청할 수 있어요.',
  },
  ended: {
    status: 'warning',
    title: '이번 St:talk 신청이 마감되었어요',
    description: '신청 기간이 끝났어요. 문의는 총졸업준비위원회 인스타그램으로 해 주세요.',
  },
  none: {
    status: 'info',
    title: '아직 St:talk 신청이 열리지 않았어요',
    description: '행사 일정이 정해지면 공지사항으로 알려드려요.',
  },
}

export function ClosedMentoringNotice({
  availability,
  event,
  showMine = false,
}: {
  availability: Exclude<MentoringAvailability, 'open'>
  event: MentoringEvent | null
  /** Offer 내 신청 beside 공지사항 — for a student who may already hold one. */
  showMine?: boolean
}) {
  const navigate = useNavigate()
  const reason = REASONS[availability]
  const hasDetails = Boolean(event && event.schema === 'v2' && (event.applyStartAt || event.date))

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
      {hasDetails && event && <EventSummary event={event} showPeriod />}

      {showMine && (
        <div className="w-fit">
          <Button label="내 신청 보기" variant="secondary" onClick={() => navigate(PATHS.me.mentoring)} />
        </div>
      )}
    </VStack>
  )
}
