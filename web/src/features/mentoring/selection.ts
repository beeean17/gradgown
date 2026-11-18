import { MENTORING_NONE } from '../../shared/types'

/**
 * The two choices a registration carries. `null` is "not chosen yet" — kept
 * apart from 0, which is a real choice (선택 안함).
 */
export interface SessionSelection {
  firstOption: number | null
  secondOption: number | null
}

export const EMPTY_SELECTION: SessionSelection = { firstOption: null, secondOption: null }

/** The client-side half of the server's selection rule (`mentoringSelections`). */
export function selectionError(value: SessionSelection): string {
  if (value.firstOption === null) return '1차시 선택지를 골라 주세요.'
  if (value.secondOption === null) return '2차시 선택지를 골라 주세요.'
  if (value.firstOption === MENTORING_NONE && value.secondOption === MENTORING_NONE) {
    return '두 차시 중 하나 이상은 참여해야 신청할 수 있어요.'
  }
  if (value.firstOption === value.secondOption) return '같은 선택지를 두 차시에 고를 수 없어요.'
  return ''
}

export const GRADES = [1, 2, 3, 4] as const
