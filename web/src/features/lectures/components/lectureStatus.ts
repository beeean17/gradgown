import type { StatusPresentation } from '../../../shared/domain/status'
import type { LectureAvailability } from '../useLectures'

/**
 * What a STUDENT sees for a lecture — derived from the apply window, not from
 * the admin's publication status (that one is `PUBLICATION_STATUS` in
 * shared/domain/status.ts). "접수 중" there means the admin opened it; "신청
 * 받는 중" here means the student can actually press the button today.
 *
 * The list page's status filter is built from this map, so its labels can't
 * drift from the badge on the card.
 */
export const LECTURE_AVAILABILITY: Record<LectureAvailability, StatusPresentation> = {
  open: { label: '신청 받는 중', tone: 'success' },
  upcoming: { label: '신청 예정', tone: 'accent' },
  closed: { label: '신청 마감', tone: 'neutral' },
  archived: { label: '종료', tone: 'neutral' },
}
