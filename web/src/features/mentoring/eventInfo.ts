import { formatClock, formatDateRange, formatMonthDayWeekday, kstParts, WEEKDAYS } from '../../shared/lib/datetime'
import type { MentoringEvent, MentoringSession } from '../../shared/types'
import type { MentoringAvailability } from './useMentoring'

const pad = (n: number) => String(n).padStart(2, '0')

/** "11월 20일 (목)" */
export function eventDateLabel(event: MentoringEvent | null): string {
  if (!event?.date) return ''
  const p = kstParts(event.date)
  return `${p.month}월 ${p.day}일 (${WEEKDAYS[p.weekday]})`
}

/** "14:00 – 14:40" */
export function sessionTimeLabel(session: MentoringSession): string {
  if (!session.startsAt || !session.endsAt) return ''
  const start = kstParts(session.startsAt)
  const end = kstParts(session.endsAt)
  return `${pad(start.hour)}:${pad(start.minute)} – ${pad(end.hour)}:${pad(end.minute)}`
}

/** "1차시 14:00 – 14:40", or just "1차시" while the time is not set. */
export function sessionLabel(session: MentoringSession): string {
  const time = sessionTimeLabel(session)
  return time ? `${session.label} ${time}` : session.label
}

/** "11월 10일 (월) – 11월 18일 (화)" */
export function applyPeriodLabel(event: MentoringEvent | null): string {
  if (!event?.applyStartAt || !event.applyEndAt) return ''
  return formatDateRange(event.applyStartAt, event.applyEndAt)
}

/** "11/18 (화) 23:59" — the moment changes stop being accepted. */
export function applyDeadlineLabel(event: MentoringEvent | null): string {
  if (!event?.applyEndAt) return ''
  return `${formatMonthDayWeekday(event.applyEndAt)} ${formatClock(event.applyEndAt)}`
}

/** "2026년 11월 St:talk", from the event id. */
export function eventTitle(event: MentoringEvent | null): string {
  const match = event ? /^(\d{4})-(\d{2})$/.exec(event.eventId) : null
  return match ? `${match[1]}년 ${Number(match[2])}월 St:talk` : 'St:talk'
}

/** The one-line state of the event, shared by the home cards and the guide. */
export function availabilityTitle(availability: MentoringAvailability): string {
  switch (availability) {
    case 'open':
      return 'St:talk 신청을 받고 있어요'
    case 'upcoming':
      return 'St:talk 신청을 준비하고 있어요'
    case 'suspended':
      return 'St:talk 접수가 잠시 닫혀 있어요'
    case 'ended':
      return '이번 St:talk 신청이 마감되었어요'
    default:
      return 'St:talk 일정을 준비하고 있어요'
  }
}

/** Short status for badges and menu rows. */
export function availabilityShort(availability: MentoringAvailability): string {
  switch (availability) {
    case 'open':
      return '신청 가능'
    case 'upcoming':
      return '신청 예정'
    case 'suspended':
      return '접수 닫힘'
    case 'ended':
      return '마감'
    default:
      return '준비 중'
  }
}

/**
 * The day and both sessions as one card row: the whole evening on the first
 * line ("11/20 (금) 19:00 ~ 20:50"), each session's hours on the second
 * ("1차시 19:00–19:50 · 2차시 20:00–20:50", unbroken inside a session so a
 * narrow card wraps only between them). Empty while the date is not set.
 */
export function eventScheduleLines(event: MentoringEvent | null): string {
  if (!event?.date) return ''
  const timed = event.sessions.filter((session) => session.startsAt && session.endsAt)
  const span = timed.length > 0 ? `${formatClock(timed[0].startsAt)} ~ ${formatClock(timed[timed.length - 1].endsAt)}` : ''
  const perSession = timed
    .map((session) => `${session.label} ${formatClock(session.startsAt)}–${formatClock(session.endsAt)}`.replace(/ /g, '\u00a0'))
    .join(' · ')
  return [[formatMonthDayWeekday(event.date), span].filter(Boolean).join(' '), perSession].filter(Boolean).join('\n')
}
