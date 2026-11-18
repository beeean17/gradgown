import { MENTORING_OPTION_COUNT, type MentoringCount, type MentoringRegistration } from '../contracts/admin-view.ts'

// St:talk labels. Options are numbers: 1–7 name `options[n - 1]`, 0 is 선택 안함
// (docs/contracts/web-api.md). Counting and filtering are the server's.
export const MENTORING_NONE = 0
export const NONE_LABEL = '선택 안함'
export const MENTORING_STATUS_LABELS: Record<MentoringRegistration['status'], string> = { reserved: '신청 완료', cancelled: '취소' }

/** What a registration's option number reads as. */
export function optionLabel(options: string[], option: number): string {
  if (option === MENTORING_NONE) return NONE_LABEL
  return options[option - 1]?.trim() || `이름 없는 선택지 ${option}`
}
/** Options 1–7 then 선택 안함, as the student sees them. */
export const optionNumbers = () => [...Array.from({ length: MENTORING_OPTION_COUNT }, (_, i) => i + 1), MENTORING_NONE]
/** The seven option names of the event the counts were read for. */
export const optionNames = (counts: MentoringCount[]) => Array.from({ length: MENTORING_OPTION_COUNT }, (_, i) => counts.find(count => count.option === i + 1)?.name || '')
