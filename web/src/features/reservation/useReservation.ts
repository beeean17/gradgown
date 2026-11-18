import { useCallback, useMemo } from 'react'
import { useAuth } from '../../shared/auth/useAuth'
import { restartLive, useLive } from '../../shared/data/live'
import { useRerenderAt } from '../../shared/hooks/useRerenderAt'
import { isWithin, kstParts, WEEKDAYS } from '../../shared/lib/datetime'
import type { GownSizeSpec, Reservation, ReservationPeriod, ReservationSlot } from '../../shared/types'
import { GOWN_SIZE_CHART } from './content/sizes'
import {
  PERIOD_KEY,
  myReservationsKey,
  myReservationsSource,
  periodSource,
  pickCurrent,
  testingKey,
  testingSource,
} from './reservationData'

/**
 * Why the apply flow is or isn't available. `suspended` and `ended` are both
 * "closed" to the user but mean different things — operations pulled the
 * switch versus the window simply passed — and the closed screen says so.
 */
export type ReservationAvailability = 'open' | 'upcoming' | 'suspended' | 'ended' | 'none'

/**
 * Mirrors `reservationCommand`: open switch AND (listed tester OR strictly
 * inside the create window).
 */
export function reservationAvailability(
  period: ReservationPeriod | null,
  now: Date = new Date(),
  isTester = false,
): ReservationAvailability {
  if (!period || !period.applyStartAt || !period.applyEndAt) return 'none'
  if (period.status === 'closed') return 'suspended'
  if (isTester) return 'open'
  if (now.getTime() <= new Date(period.applyStartAt).getTime()) return 'upcoming'
  if (isWithin(period.applyStartAt, period.applyEndAt, now)) return 'open'
  return 'ended'
}

/**
 * Whether the student can still change/cancel. The server accepts edits from a
 * listed tester, in the edit window OR the create window, and only while the
 * master switch is on.
 */
export function canEdit(period: ReservationPeriod | null, now: Date = new Date(), isTester = false): boolean {
  if (!period || period.status !== 'open') return false
  if (isTester) return true
  return isWithin(period.editStartAt, period.editEndAt, now) || isWithin(period.applyStartAt, period.applyEndAt, now)
}

/**
 * Whether operations listed this account in `settings_private/reservation_testing`
 * — the server then lets it reserve, change and cancel outside the windows.
 * `ready` and false without a user: there is nothing to wait for.
 */
export function useReservationTester() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const live = useLive(uid ? testingKey(uid) : null, uid ? testingSource(uid) : () => () => {})
  return { isTester: live.data === true, status: uid ? live.status : 'ready' }
}

const NO_EDGES: string[] = []

/**
 * The live reservation round (`settings/reservation`). Callers decide what is
 * open from the clock while rendering, so they re-render at each window edge.
 */
export function useActivePeriod() {
  const live = useLive(PERIOD_KEY, periodSource)
  const retry = useCallback(() => restartLive(PERIOD_KEY), [])
  const period = live.data ?? null
  useRerenderAt(
    period ? [period.applyStartAt, period.applyEndAt, period.editStartAt, period.editEndAt] : NO_EDGES,
  )
  return { period, status: live.status, retry }
}

const NO_RESERVATIONS: Reservation[] = []

/**
 * The signed-in student's reservations in the live round. `ready` with an
 * empty list when there is no user or no round — nothing to wait for.
 */
export function useMyReservations() {
  const { user } = useAuth()
  const { period, status: periodStatus } = useActivePeriod()
  const uid = user?.uid ?? null
  const periodId = period?.periodId ?? null
  const key = uid && periodId ? myReservationsKey(uid, periodId) : null
  const live = useLive(
    key,
    uid && periodId ? myReservationsSource(uid, periodId) : () => () => {},
  )
  const retry = useCallback(() => {
    // Without the round there is no list to read, so the round is what failed.
    if (periodStatus === 'error') restartLive(PERIOD_KEY)
    if (key) restartLive(key)
  }, [key, periodStatus])

  const status = periodStatus !== 'ready' ? periodStatus : key ? live.status : 'ready'
  const reservations = live.data ?? NO_RESERVATIONS
  const current = useMemo(() => pickCurrent(reservations), [reservations])
  return { reservations, current, period, status, retry }
}

/** Sizes in rack order. */
export function gownSizes(): GownSizeSpec[] {
  return GOWN_SIZE_CHART
}

/** One reservation day, with the slots that belong to it. */
export interface ScheduleDay {
  /** `YYYY-MM-DD`, used as the selection key. */
  date: string
  /** Tab label, e.g. "8/24 (월)". */
  label: string
  slots: ReservationSlot[]
}

/**
 * Groups reservation slots into days. The flow asks for a day first and then
 * a time for both rental and return.
 */
export function scheduleDays(slots: ReservationSlot[]): ScheduleDay[] {
  const byDate = new Map<string, ScheduleDay>()

  for (const slot of slots) {
    if (!slot.isActive) continue
    const at = kstParts(slot.startsAt)
    const date = slot.startsAt.slice(0, 10)
    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        label: `${at.month}/${at.day} (${WEEKDAYS[at.weekday]})`,
        slots: [],
      })
    }
    byDate.get(date)!.slots.push(slot)
  }

  return [...byDate.values()]
}

/** "8/24 (월) 11:00–12:00" — the cards' day format — for summaries. */
export function scheduleLabel(day: ScheduleDay | undefined, slot: ReservationSlot | undefined): string {
  if (!day || !slot) return ''
  const at = kstParts(slot.startsAt)
  return `${at.month}/${at.day} (${WEEKDAYS[at.weekday]}) ${slot.label}`
}
