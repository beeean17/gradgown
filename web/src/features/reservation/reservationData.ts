import { collection, doc, query, where } from 'firebase/firestore'
import { firebase } from '../../shared/firebase/runtime'
import type { LiveSource } from '../../shared/data/live'
import { docSource, querySource } from '../../shared/data/snapshots'
import {
  isListedTester,
  testingKey as sharedTestingKey,
  testingSource as sharedTestingSource,
} from '../../shared/data/testing'
import { iso, obj, str, version, type Data } from '../../shared/data/values'
import { formatClock } from '../../shared/lib/datetime'
import type { GownSize, Reservation, ReservationPeriod, ReservationSlot } from '../../shared/types'

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

function periodTitle(periodId: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(periodId)
  return match ? `${match[1]}년 ${Number(match[2])}월 학위복 예약` : '학위복 예약'
}

function toSlots(data: Data, periodId: string): Omit<ReservationSlot, 'type'>[] {
  return Object.entries(obj(data.slotsByDate))
    .flatMap(([date, group]) => {
      const slots = obj(group).slots
      if (!Array.isArray(slots)) return []
      return slots.map((value) => {
        const slot = obj(value)
        const startsAt = iso(slot.startsAt)
        const endsAt = iso(slot.endsAt)
        return {
          slotId: `${date}_${str(slot.id)}`,
          periodId,
          startsAt,
          endsAt,
          label: startsAt && endsAt ? `${formatClock(startsAt)}–${formatClock(endsAt)}` : '',
          isActive: slot.enabled === true && Boolean(str(slot.id) && startsAt && endsAt),
        }
      })
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export function toPeriod(data: Data | undefined): ReservationPeriod | null {
  if (!data) return null
  const periodId = str(data.periodId)
  if (!periodId) return null
  const create = obj(data.createPeriod)
  const edit = obj(data.editPeriod)
  const slots = toSlots(data, periodId)
  // One timetable serves both directions: the student picks a pickup slot and,
  // separately, a return slot from the same list (as in the Flutter app).
  return {
    periodId,
    title: periodTitle(periodId),
    status: data.isOpen === true ? 'open' : 'closed',
    applyStartAt: iso(create.startsAt),
    applyEndAt: iso(create.endsAt),
    editStartAt: iso(edit.startsAt),
    editEndAt: iso(edit.endsAt),
    rentSlots: slots.map((slot) => ({ ...slot, type: 'rent' })),
    returnSlots: slots.map((slot) => ({ ...slot, type: 'return' })),
  }
}

const STATUSES = ['reserved', 'cancelled', 'completed'] as const

export function toReservation(reservationId: string, data: Data): Reservation {
  const status = str(data.status)
  const sizeRaw = str(data.size)
  return {
    reservationId,
    periodId: str(data.periodId),
    status: (STATUSES as readonly string[]).includes(status) ? (status as Reservation['status']) : 'unknown',
    name: str(data.name),
    studentId: str(data.studentId),
    department: str(data.department),
    phone: str(data.phone),
    size: normalizeSize(sizeRaw),
    sizeRaw,
    slotId: str(data.slotId),
    rentAt: iso(data.rentTime),
    returnAt: iso(data.returnTime),
    isProxy: data.isProxy === true,
    proxyName: str(data.proxyName),
    proxyPhone: str(data.proxyPhone),
    createdAt: iso(data.createdAt),
    modifiedAt: iso(data.modifiedAt) || iso(data.createdAt),
    version: version(data.modifiedAt),
  }
}

export const PERIOD_KEY = 'doc:settings/reservation'

export const periodSource: LiveSource<ReservationPeriod | null> = docSource(
  () => doc(firebase().db, 'settings', 'reservation'),
  toPeriod,
)

export function myReservationsKey(uid: string, periodId: string): string {
  return `user:${uid}:gown_reservations:${periodId}`
}

/** The signed-in student's reservations in one round, newest change first. */
export function myReservationsSource(uid: string, periodId: string): LiveSource<Reservation[]> {
  return querySource(
    () => query(collection(firebase().db, 'users', uid, 'gown_reservations'), where('periodId', '==', periodId)),
    (snapshot) =>
      snapshot.docs
        .map((item) => toReservation(item.id, item.data()))
        .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)),
  )
}

export { isListedTester }

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
