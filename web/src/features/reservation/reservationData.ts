import type { LiveSource } from '../../shared/data/live'
import { fetchSource } from '../../shared/data/fetchSource'
import {
  testingKey as sharedTestingKey,
  testingSource as sharedTestingSource,
} from '../../shared/data/testing'
import type { GownSize, Reservation, ReservationPeriod, ReservationSlot } from '../../shared/types'

/**
 * Where the reservation screens get their data: the student server
 * (docs/contracts/web-api.md). The server answers in the screen types
 * (`ReservationPeriod`, `Reservation`), so nothing is mapped here; the
 * Firestore-document mappers of the original are gone.
 */

/**
 * Mapping between the live reservation schema and the UI model.
 *
 * `settings/reservation` (public read):
 *   { periodId: 'YYYY-MM', isOpen, createPeriod: {startsAt, endsAt},
 *     editPeriod: {startsAt, endsAt},
 *     slotsByDate: { 'YYYY-MM-DD': { date, slots: [{ id, startsAt, endsAt, enabled }] } } }
 *
 * `users/{uid}/gown_reservations/{id}` (owner read; writes only through the
 * `reservationCommand` callable).
 */

/** Sizes are stored lowercase (`s`/`m`/`l`) — the confirmation mail and the
 *  Flutter export both read that form — and displayed uppercase. */
export function normalizeSize(raw: string): GownSize | null {
  const upper = raw.trim().toUpperCase()
  return upper === 'S' || upper === 'M' || upper === 'L' ? upper : null
}

export function storedSize(size: GownSize): string {
  return size.toLowerCase()
}

export const PERIOD_KEY = 'doc:settings/reservation'

/** The current round and its slots; `null` when there is none. Public. */
export const periodSource: LiveSource<ReservationPeriod | null> = fetchSource('/api/gown/periods/current')

export function myReservationsKey(uid: string, periodId: string): string {
  return `user:${uid}:gown_reservations:${periodId}`
}

/** The signed-in student's reservations in one round, newest change first. */
/**
 * The signed-in student's reservations of one round, newest change first. The
 * server takes the student from the session; `uid` only names the stream.
 */
export function myReservationsSource(_uid: string, periodId: string): LiveSource<Reservation[]> {
  return fetchSource(`/api/gown/reservations/me?periodId=${encodeURIComponent(periodId)}`)
}

const TESTING_DOC = 'reservation_testing'

export function testingKey(uid: string): string {
  return sharedTestingKey(TESTING_DOC, uid)
}

/** `settings_private/reservation_testing` — see shared/data/testing.ts. */
export function testingSource(uid: string): LiveSource<boolean> {
  return sharedTestingSource(TESTING_DOC, uid)
}

/**
 * The reservation the account pages talk about: the live one if any (the
 * server allows only one `reserved` per round), otherwise the latest change so
 * a cancellation stays visible with its "다시 예약하기" path.
 */
export function pickCurrent(reservations: Reservation[]): Reservation | null {
  return reservations.find((item) => item.status === 'reserved') ?? reservations[0] ?? null
}

/**
 * Finds the slot an instant falls in. Reservations store the chosen time, not
 * always a resolvable slot id (Flutter wrote `YYYY-MM-DD_HH`), so the editor
 * re-derives its selection from the stored instant.
 */
export function slotAt(slots: ReservationSlot[], at: string): ReservationSlot | undefined {
  if (!at) return undefined
  const t = new Date(at).getTime()
  return slots.find((slot) => t >= new Date(slot.startsAt).getTime() && t < new Date(slot.endsAt).getTime())
}
