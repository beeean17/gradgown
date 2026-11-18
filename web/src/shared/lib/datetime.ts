/**
 * Lightweight date/time formatters for ISO strings used across the UI.
 * Every calendar fact — which day a slot falls on, "D-3", "8월 24일" — is
 * read in Asia/Seoul, so a visitor whose device sits in another timezone still
 * sees the counter's own schedule. Kept dependency-free.
 */
const TIME_ZONE = 'Asia/Seoul'
const KST_OFFSET_MS = 9 * 3_600_000

const DATE = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: TIME_ZONE })
const DATE_SHORT = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', timeZone: TIME_ZONE })
const TIME = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIME_ZONE })

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

const pad = (n: number) => String(n).padStart(2, '0')

/** Calendar fields of an instant as read on a wall clock in Seoul. */
export interface KstParts {
  year: number
  /** 1–12 */
  month: number
  day: number
  /** 0 = 일요일 */
  weekday: number
  hour: number
  minute: number
}

export function kstParts(value: string | Date): KstParts {
  const shifted = new Date(new Date(value).getTime() + KST_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  }
}

/**
 * `2026-09-20T09:00:00+09:00` — an ISO string whose first ten characters are
 * the Seoul calendar date, so grouping by `iso.slice(0, 10)` stays correct for
 * early-morning slots that fall on the previous day in UTC.
 */
export function toKstIso(date: Date): string {
  const p = kstParts(date)
  const seconds = new Date(date.getTime() + KST_OFFSET_MS).getUTCSeconds()
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(seconds)}+09:00`
}

/** `09:00` */
export function formatClock(iso: string): string {
  const p = kstParts(iso)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso))
}

export function formatDateShort(iso: string): string {
  return DATE_SHORT.format(new Date(iso))
}

/** Zero-padded numeric day, e.g. "08/07". Compact enough for dense rails. */
export function formatMonthDay(iso: string): string {
  const p = kstParts(iso)
  return `${pad(p.month)}/${pad(p.day)}`
}

/** "11/22 (일)": a day in a card row or a slot label. */
export function formatMonthDayWeekday(iso: string): string {
  const p = kstParts(iso)
  return `${p.month}/${p.day} (${WEEKDAYS[p.weekday]})`
}

export function formatTime(iso: string): string {
  return TIME.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`
}

/** e.g. "6월 20일 (금) – 6월 28일 (일)" */
export function formatDateRange(startIso: string, endIso: string): string {
  return `${formatDate(startIso)} – ${formatDate(endIso)}`
}

/**
 * True strictly inside (start, end) — the same open interval the server's
 * `reservationCommand` checks, so the UI never offers an action the function
 * would refuse at the boundary second.
 */
export function isWithin(startIso: string, endIso: string, now: Date = new Date()): boolean {
  if (!startIso || !endIso) return false
  const t = now.getTime()
  return t > new Date(startIso).getTime() && t < new Date(endIso).getTime()
}

/** Whole calendar days (Seoul) from today to `iso`; negative once it has passed. */
export function calendarDaysUntil(iso: string, now: Date = new Date()): number {
  const target = kstParts(iso)
  const today = kstParts(now)
  return Math.round(
    (Date.UTC(target.year, target.month - 1, target.day) - Date.UTC(today.year, today.month - 1, today.day)) /
      86_400_000,
  )
}
