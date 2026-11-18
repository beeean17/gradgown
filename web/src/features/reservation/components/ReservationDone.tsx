import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { downloadCalendar } from '../../../shared/lib/calendar'
import type { ReservationSlot } from '../../../shared/types'

/**
 * The booking's receipt, the page after 예약 확정 — the same shape as the
 * St:talk done screen (MentoringResult): when to come and go, where, what to
 * bring and until when it can change, with the two times as a calendar file.
 */
export function ReservationDone({
  size,
  rentLabel,
  returnLabel,
  rentSlot,
  returnSlot,
  location,
  changeDeadline,
  onOpenMine,
  onHome,
}: {
  size: string
  rentLabel: string
  returnLabel: string
  rentSlot?: ReservationSlot
  returnSlot?: ReservationSlot
  location: string
  /** e.g. "11/22 (일) 09:00": until when 내 신청 can change or cancel it. */
  changeDeadline: string
  onOpenMine: () => void
  onHome: () => void
}) {
  const rows = [
    { label: '사이즈', value: `${size} (학사모 포함)` },
    { label: '수령', value: rentLabel },
    { label: '반납', value: returnLabel },
    { label: '장소', value: location },
    { label: '가져올 것', value: '실물 학생증 (없으면 실물 신분증 + 모바일 학생증 또는 재학증명서)' },
  ]
  const addToCalendar = () => {
    if (!rentSlot || !returnSlot) return
    downloadCalendar(
      [
        { title: '학위복 수령', startsAt: rentSlot.startsAt, endsAt: rentSlot.endsAt, location, description: '실물 학생증을 가져와요. 없으면 실물 신분증과 모바일 학생증(또는 재학증명서)을 함께 가져와요.' },
        { title: '학위복 반납', startsAt: returnSlot.startsAt, endsAt: returnSlot.endsAt, location },
      ],
      'gown-reservation',
    )
  }
  return (
    <div className="mx-auto flex w-full max-w-[28rem] flex-col gap-5">
        <div className="flex flex-col gap-1">
          <Heading level={1} className="!text-2xl !font-extrabold !tracking-tight">
            예약이 확정됐어요
          </Heading>
          {changeDeadline && (
            <Text type="supporting" color="secondary">
              {changeDeadline}까지 내 신청에서 바꾸거나 취소할 수 있어요
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
              <dd className="m-0">
                <Text type="body" weight="semibold" className="break-keep">
                  {row.value}
                </Text>
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-2">
          {rentSlot && returnSlot && (
            <Button label="캘린더에 추가" variant="secondary" size="lg" width="100%" icon={<Icon icon="calendar" size="sm" />} onClick={addToCalendar} />
          )}
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Button label="홈으로" variant="secondary" size="lg" width="100%" onClick={onHome} />
            </div>
            <div className="min-w-0 flex-1">
              <Button label="내 신청 보기" variant="primary" size="lg" width="100%" onClick={onOpenMine} />
            </div>
          </div>
        </div>
    </div>
  )
}
