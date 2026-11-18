import { useCallback, useMemo } from 'react'
import { useAuth } from '../../shared/auth/useAuth'
import { restartLive, useLive } from '../../shared/data/live'
import { useRerenderAt } from '../../shared/hooks/useRerenderAt'
import { isWithin } from '../../shared/lib/datetime'
import type { MentoringEvent, MentoringRegistration } from '../../shared/types'
import {
  EVENT_KEY,
  eventSource,
  myRegistrationsKey,
  myRegistrationsSource,
  pickCurrent,
  testingKey,
  testingSource,
} from './mentoringData'

/**
 * Why the apply flow is or isn't available. `suspended` and `ended` are both
 * "closed" to the student but mean different things — operations pulled the
 * switch (or the settings are still the old shape) versus the window simply
 * passed — and the closed screen says so.
 */
export type MentoringAvailability = 'open' | 'upcoming' | 'suspended' | 'ended' | 'none'

/**
 * Mirrors `mentoringCommand` (`isOpenFor`): switch on AND (listed tester OR
 * strictly inside the application period). Create, change and cancel all use
 * this one window — St:talk has no separate edit period (MNT-21).
 */
export function mentoringAvailability(
  event: MentoringEvent | null,
  now: Date = new Date(),
  isTester = false,
): MentoringAvailability {
  if (!event) return 'none'
  if (event.schema === 'v1') return 'suspended'
  if (!event.applyStartAt || !event.applyEndAt) return 'none'
  if (!event.isOpen) return 'suspended'
  if (isTester) return 'open'
  if (now.getTime() <= new Date(event.applyStartAt).getTime()) return 'upcoming'
  if (isWithin(event.applyStartAt, event.applyEndAt, now)) return 'open'
  return 'ended'
}

/**
 * Whether operations listed this account in `settings_private/mentoring_testing`
 * — the server then lets it apply, change and cancel outside the window while
 * the switch is on. `ready` and false without a user: nothing to wait for.
 */
export function useMentoringTester() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const live = useLive(uid ? testingKey(uid) : null, uid ? testingSource(uid) : () => () => {})
  return { isTester: live.data === true, status: uid ? live.status : 'ready' }
}

const NO_EDGES: string[] = []

/**
 * The current St:talk event (`settings/mentoring`). Callers decide what is
 * open from the clock while rendering, so they re-render at each window edge.
 */
export function useMentoringEvent() {
  const live = useLive(EVENT_KEY, eventSource)
  const retry = useCallback(() => restartLive(EVENT_KEY), [])
  const event = live.data ?? null
  useRerenderAt(event ? [event.applyStartAt, event.applyEndAt] : NO_EDGES)
  return { event, status: live.status, retry }
}

const NO_REGISTRATIONS: MentoringRegistration[] = []

/**
 * The signed-in student's St:talk registrations. `current` is this event's
 * (see `pickCurrent`); `latest` is the most recently changed one in any event,
 * which the apply flow uses to pre-fill the form (MNT-11). `ready` with an
 * empty list when there is no user — nothing to wait for.
 */
export function useMyRegistrations() {
  const { user } = useAuth()
  const { event, status: eventStatus } = useMentoringEvent()
  const uid = user?.uid ?? null
  const key = uid ? myRegistrationsKey(uid) : null
  const live = useLive(key, uid ? myRegistrationsSource(uid) : () => () => {})
  const retry = useCallback(() => {
    // `status` reports the event's failure first, so retry that read as well.
    if (eventStatus === 'error') restartLive(EVENT_KEY)
    if (key) restartLive(key)
  }, [key, eventStatus])

  const status = eventStatus !== 'ready' ? eventStatus : key ? live.status : 'ready'
  const registrations = live.data ?? NO_REGISTRATIONS
  const eventId = event?.eventId ?? ''
  const current = useMemo(() => pickCurrent(registrations, eventId), [registrations, eventId])
  const latest = registrations[0] ?? null
  return { registrations, current, latest, event, status, retry }
}
