/**
 * One source of truth for "what does this status look like, and what do we call
 * it in Korean".
 *
 * Every status the UI shows lives here as a `{ label, tone }` pair, and the
 * option lists for Selectors/filters are DERIVED from those same pairs — so a
 * label can't say "예약" in the admin table and "예약 완료" on the student's
 * page, and a filter dropdown can't drift from the badge it filters on.
 *
 * `tone` is our own semantic name, not an Astryx variant: Astryx `Badge` and
 * `StatusDot` accept overlapping-but-different unions (Badge has `info` and no
 * `accent`; StatusDot has `accent` and no `info`). Callers pick a tone and the
 * adapters below translate — see `badgeVariant`, and `StatusDot` takes a
 * `StatusTone` directly.
 */
import type { BadgeVariant } from '@astryxdesign/core/Badge'
import type { LectureStatus, MentoringStatus, RegistrationStatus, ReservationStatus } from '../types'

/** Tones both Badge and StatusDot can render — anything that is a *status*. */
export type StatusTone = 'success' | 'warning' | 'error' | 'accent' | 'neutral'

/**
 * Badge-only additions. `highlight` is the yellow that marks pinned content;
 * there is no StatusDot equivalent, and nothing that carries it is ever a dot.
 */
export type BadgeTone = StatusTone | 'highlight'

export interface StatusPresentation {
  label: string
  tone: StatusTone
}

export interface BadgePresentation {
  label: string
  tone: BadgeTone
}

/** Badge has no `accent`; `info` is its equivalent blue. Everything else maps 1:1. */
export function badgeVariant(tone: BadgeTone): BadgeVariant {
  if (tone === 'accent') return 'info'
  if (tone === 'highlight') return 'yellow'
  return tone
}

// --- Reservation ---------------------------------------------------------

export const RESERVATION_STATUS: Record<ReservationStatus, StatusPresentation> = {
  reserved: { label: '예약 완료', tone: 'success' },
  cancelled: { label: '취소', tone: 'neutral' },
  // Set only by operations at the counter; the student can no longer change it.
  completed: { label: '처리 완료', tone: 'accent' },
}

// --- St:talk registration --------------------------------------------------

export const MENTORING_STATUS: Record<MentoringStatus, StatusPresentation> = {
  reserved: { label: '신청 완료', tone: 'success' },
  cancelled: { label: '취소', tone: 'neutral' },
}

// --- Lecture registration ------------------------------------------------

export const REGISTRATION_STATUS: Record<RegistrationStatus, StatusPresentation> = {
  registered: { label: '신청 완료', tone: 'success' },
  attended: { label: '참석', tone: 'success' },
  noShow: { label: '불참', tone: 'warning' },
  cancelled: { label: '취소', tone: 'neutral' },
}

// --- Publication lifecycle -----------------------------------------------

/**
 * The lecture lifecycle — the operator's view of whether a lecture is
 * published and taking entries. What a student sees for a lecture is `lectureAvailability`, which folds in the
 * apply window; see features/lectures/components/lectureStatus.ts.
 */
export const PUBLICATION_STATUS: Record<LectureStatus, StatusPresentation> = {
  draft: { label: '준비 중', tone: 'warning' },
  open: { label: '접수 중', tone: 'success' },
  closed: { label: '마감', tone: 'neutral' },
  archived: { label: '보관', tone: 'neutral' },
}

// --- Content flags -------------------------------------------------------

/**
 * The boolean markers on announcements and FAQs. Not a status — a piece of
 * content can carry several at once — but the same rule applies: "고정" is
 * yellow everywhere or it is meaningless, and it appears on the home list, the
 * public card and the detail page.
 */
export const CONTENT_FLAGS = {
  pinned: { label: '고정', tone: 'highlight' },
  onHome: { label: '홈', tone: 'neutral' },
  popup: { label: '팝업', tone: 'warning' },
  visible: { label: '공개', tone: 'success' },
  hidden: { label: '비공개', tone: 'neutral' },
} satisfies Record<string, BadgePresentation>

// --- Option builders -----------------------------------------------------

export interface StatusOption {
  value: string
  label: string
}

/**
 * Selector/dropdown options for a status map, in the map's declaration order.
 * Pass `only` to narrow to the statuses an admin may actually assign — e.g. the
 * reservation table lets a row move between reserved/cancelled and nothing else.
 */
export function statusOptions<K extends string>(
  map: Record<K, StatusPresentation>,
  only?: readonly K[],
): StatusOption[] {
  const keys = only ?? (Object.keys(map) as K[])
  return keys.map((key) => ({ value: key, label: map[key].label }))
}

/** Same list with a leading "전체" entry, for SearchFilterBar filters. */
export function filterOptions<K extends string>(
  map: Record<K, StatusPresentation>,
  allLabel: string,
  only?: readonly K[],
): StatusOption[] {
  return [{ value: 'all', label: allLabel }, ...statusOptions(map, only)]
}
