import { useNavigate } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { PATHS } from '../../../app/routes/paths'
import { downloadCalendar } from '../../../shared/lib/calendar'
import { formatClock, formatMonthDayWeekday } from '../../../shared/lib/datetime'
import type { MentoringEvent, MentoringRegistration } from '../../../shared/types'
import { MENTORING_NONE } from '../../../shared/types'
import { eventScheduleLines } from '../eventInfo'
import { describeOption } from '../mentoringData'
import type { SessionSelection } from '../selection'
import { EpicFolioNotice } from './EpicFolioNotice'

export interface SubmittedApplicant {
  name: string
  studentId: string
  department: string
  grade: number | null
  phone: string
}

/**
 * The done screen (MNT-14), in the gown receipt's shape: what was chosen,
 * when and where to come, until when it can change — then the EPIC Folio
 * reminder once more and the chosen sessions as a calendar file. No mail is
 * sent this round, so this screen and 내 신청 are the record.
 *
 * The server's response already means the write is committed; the card shows
 * the form's values until the live subscription delivers the stored document
 * (`stored`), then switches to that — what the server kept is what counts.
 */
export function MentoringResult({
  event,
  selection,
  applicant,
  stored,
}: {
  event: MentoringEvent
  selection: SessionSelection
  applicant: SubmittedApplicant
  /** The saved document, once the subscription has read it back. */
  stored: MentoringRegistration | null
}) {
  const navigate = useNavigate()
  const shown = stored
    ? { firstOption: stored.firstOption, secondOption: stored.secondOption, name: stored.name, studentId: stored.studentId, department: stored.department }
    : { firstOption: selection.firstOption, secondOption: selection.secondOption, name: applicant.name, studentId: applicant.studentId, department: applicant.department }
  const choices = event.sessions.slice(0, 2).map((session, index) => ({
    session,
    option: index === 0 ? shown.firstOption : shown.secondOption,
  }))
  const rows = [
    ...choices.map(({ session, option }) => ({ label: session.label, value: describeOption(event, option).label, isMuted: option === MENTORING_NONE })),
    { label: '일시', value: eventScheduleLines(event) || '추후 안내' },
    { label: '장소', value: event.location || '추후 안내' },
    { label: '신청자', value: [shown.name, shown.studentId].filter(Boolean).join(' · ') },
    { label: '학과', value: shown.department || '-' },
  ]
  const deadline = event.applyEndAt ? `${formatMonthDayWeekday(event.applyEndAt)} ${formatClock(event.applyEndAt)}` : ''
  const attending = choices.filter(({ session, option }) => option !== MENTORING_NONE && option !== null && session.startsAt && session.endsAt)
  const addToCalendar = () =>
    downloadCalendar(
      attending.map(({ session, option }) => ({
        title: `St:talk ${session.label} · ${describeOption(event, option).label}`,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        location: event.location,
        description: '시작 5분 전에 도착하기를 권해요. EPIC Folio에서도 따로 신청해야 EPIC 점수를 받아요.',
      })),
      'sttalk',
    )

  return (
    <div className="mx-auto flex w-full max-w-[28rem] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Heading level={1} className="!text-2xl !font-extrabold !tracking-tight">
          St:talk 신청이 완료됐어요
        </Heading>
        {deadline && (
          <Text type="supporting" color="secondary">
            {deadline}까지 내 신청에서 바꾸거나 취소할 수 있어요
          </Text>
        )}
      </div>

      <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 rounded-xl border border-border bg-surface p-4">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt>
              <Text type="body" color="secondary" className="whitespace-nowrap">
                {row.label}
              </Text>
            </dt>
            <dd className="m-0 min-w-0">
              <Text
                type="body"
                weight="semibold"
                color={'isMuted' in row && row.isMuted ? 'secondary' : 'primary'}
                className="whitespace-pre-line break-keep tabular-nums"
              >
                {row.value}
              </Text>
            </dd>
          </div>
        ))}
      </dl>
      <Text type="supporting" size="sm" color={stored ? 'secondary' : 'disabled'} display="block" role="status">
        {stored ? '신청 내용이 저장됐어요.' : '저장된 내용을 불러오고 있어요…'}
      </Text>

      <EpicFolioNotice event={event} compact />

      <div className="flex flex-col gap-2">
        {attending.length > 0 && (
          <Button label="캘린더에 추가" variant="secondary" size="lg" width="100%" icon={<Icon icon="calendar" size="sm" />} onClick={addToCalendar} />
        )}
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Button label="홈으로" variant="secondary" size="lg" width="100%" onClick={() => navigate(PATHS.home, { replace: true })} />
          </div>
          <div className="min-w-0 flex-1">
            <Button label="내 신청 보기" variant="primary" size="lg" width="100%" onClick={() => navigate(PATHS.me.mentoring, { replace: true })} />
          </div>
        </div>
      </div>
    </div>
  )
}
