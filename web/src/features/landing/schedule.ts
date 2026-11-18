import { useEffect } from 'react'
import { calendarDaysUntil, kstParts } from '../../shared/lib/datetime'
import type { ReservationPeriod } from '../../shared/types'
import {
  reservationAvailability,
  useActivePeriod,
  useReservationTester,
  type ReservationAvailability,
} from '../reservation/useReservation'

export type PhaseStatus = 'done' | 'active' | 'upcoming'

export interface Phase {
  key: string
  /** Short label shown under the rail segment, e.g. "예약". */
  label: string
  startAt: string
  endAt: string
  status: PhaseStatus
  /** 0–1 fill of this segment's bar. Only the active phase is partial. */
  progress: number
  /** Days left in this phase — set only while it is the active one. */
  dday: number | null
}

export interface ScheduleInfo {
  /** `loading` until the round is read; screens hold their rail until then. */
  status: 'loading' | 'ready' | 'error'
  /** False when no round is configured at all — the rail has nothing to show. */
  hasPeriod: boolean
  /** The rental journey as ordered windows. Empty without a round. */
  phases: Phase[]
  /** Title above the rail, e.g. "2026년 8월 학위복 대여". */
  periodTitle: string
  /** e.g. "2026" for the "2026 Graduation" kicker. */
  periodYear: string
  availability: ReservationAvailability
  /** True while the reservation apply window is open. */
  applyOpen: boolean
  /**
   * Whether this viewer may start a reservation now: the public window, or a
   * listed tester while the switch is on. Copy keeps describing the public
   * schedule; only the apply button follows this.
   */
  canReserve: boolean
  /** Calendar days until the reservation deadline (negative once passed). */
  ddayToDeadline: number
  deadlineLabel: string
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/** Fraction of [start, end] already elapsed at `now`. */
function elapsed(startIso: string, endIso: string, now: Date): number {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (end <= start) return now.getTime() >= end ? 1 : 0
  return clamp01((now.getTime() - start) / (end - start))
}

function titleFor(period: ReservationPeriod): { title: string; year: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(period.periodId)
  if (match) return { title: `${match[1]}년 ${Number(match[2])}월 학위복 대여`, year: match[1] }
  const start = kstParts(period.applyStartAt || new Date().toISOString())
  return { title: `${start.year}년 ${start.month}월 학위복 대여`, year: String(start.year) }
}

export function buildSchedule(
  period: ReservationPeriod | null,
  now: Date = new Date(),
): Omit<ScheduleInfo, 'status' | 'canReserve'> {
  const availability = reservationAvailability(period, now)
  if (!period || !period.applyStartAt || !period.applyEndAt) {
    return {
      hasPeriod: false,
      phases: [],
      periodTitle: '학위복 대여',
      periodYear: String(kstParts(now).year),
      availability,
      applyOpen: false,
      ddayToDeadline: 0,
      deadlineLabel: '예약 마감',
    }
  }

  const slots = period.rentSlots.filter((slot) => slot.isActive)
  const rentStart = slots[0]?.startsAt ?? period.applyEndAt
  const rentEnd = slots[slots.length - 1]?.endsAt ?? rentStart

  // The three windows the hero rail shows. Pickup and return are one on-site
  // step from the student's side — two rail segments for a single trip to the
  // same desk read as more work than it is — so they collapse into one that
  // spans the first slot through the last.
  const rawPhases = [
    { key: 'apply', label: '예약', startAt: period.applyStartAt, endAt: period.applyEndAt },
    { key: 'edit', label: '수정', startAt: period.editStartAt || period.applyStartAt, endAt: period.editEndAt || period.applyEndAt },
    { key: 'rentReturn', label: '수령·반납', startAt: rentStart, endAt: rentEnd },
  ]

  // At most one phase is "active" (NOW): the first one not yet over, and only
  // once it has begun — before the round opens, or between edits closing and
  // pickup starting, nothing is happening now. Everything before it reads as
  // done, everything after as upcoming — so a window that overlaps an earlier
  // one (apply/edit often do) never lights up twice.
  const nextIdx = rawPhases.findIndex((ph) => now.getTime() <= new Date(ph.endAt).getTime())
  const hasBegun = nextIdx >= 0 && now.getTime() >= new Date(rawPhases[nextIdx].startAt).getTime()

  const phases: Phase[] = rawPhases.map((ph, i) => {
    const status: PhaseStatus =
      nextIdx === -1 || i < nextIdx ? 'done' : i === nextIdx && hasBegun ? 'active' : 'upcoming'
    return {
      ...ph,
      status,
      progress: status === 'done' ? 1 : status === 'active' ? elapsed(ph.startAt, ph.endAt, now) : 0,
      dday: status === 'active' ? calendarDaysUntil(ph.endAt, now) : null,
    }
  })

  const { title, year } = titleFor(period)
  return {
    hasPeriod: true,
    phases,
    periodTitle: title,
    periodYear: year,
    availability,
    applyOpen: availability === 'open',
    ddayToDeadline: calendarDaysUntil(period.applyEndAt, now),
    deadlineLabel: '예약 마감',
  }
}

let scheduleShown = false

/** The graduation "journey" for the live round (`settings/reservation`). */
export function useSchedule(now: Date = new Date()): ScheduleInfo {
  const { period, status } = useActivePeriod()
  const { isTester } = useReservationTester()
  // When the round first reaches the screen, as a User Timing mark that
  // perf-lighthouse.mjs reports in its `schedule` column.
  useEffect(() => {
    if (status !== 'ready' || scheduleShown) return
    scheduleShown = true
    performance.mark('grad42:schedule-ready')
  }, [status])
  return {
    status,
    ...buildSchedule(period, now),
    canReserve: reservationAvailability(period, now, isTester) === 'open',
  }
}

/** The round's state in a word or two, for card status tokens. */
export function availabilityShort(availability: ReservationAvailability): string {
  switch (availability) {
    // Not "예약 중": on a card that reads as the student's own reservation.
    case 'open':
      return '예약 가능'
    case 'upcoming':
      return '예약 예정'
    case 'suspended':
      return '접수 닫힘'
    case 'ended':
      return '예약 마감'
    default:
      return '준비 중'
  }
}

/** The one-line state of the round, the 예약 tab card's title (St:talk's eventInfo has the same tone). */
export function availabilityTitle(availability: ReservationAvailability): string {
  switch (availability) {
    case 'open':
      return '학위복 예약을 받고 있어요'
    case 'upcoming':
      return '학위복 예약을 준비하고 있어요'
    case 'suspended':
      return '학위복 예약이 잠시 닫혀 있어요'
    case 'ended':
      return '학위복 예약이 마감됐어요'
    default:
      return '학위복 예약 일정을 준비하고 있어요'
  }
}
