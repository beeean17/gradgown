import type { LiveSource } from '../../shared/data/live'
import { fetchSource } from '../../shared/data/fetchSource'
import {
  testingKey as sharedTestingKey,
  testingSource as sharedTestingSource,
} from '../../shared/data/testing'
import {
  MENTORING_NONE,
  type MentoringChoice,
  type MentoringEvent,
  type MentoringRegistration,
} from '../../shared/types'

/**
 * Where the St:talk screens get their data: the student server
 * (docs/contracts/web-api.md). The server answers in the screen types
 * (`MentoringEvent`, `MentoringRegistration`), so nothing is mapped here; the
 * Firestore-document mappers of the original are gone.
 */

export const EVENT_KEY = 'doc:settings/mentoring'

/** The current event; `null` when there is none. Public. */
export const eventSource: LiveSource<MentoringEvent | null> = fetchSource('/api/mentoring/events/current')

export function myRegistrationsKey(uid: string): string {
  return `user:${uid}:mentoring_registrations`
}

/**
 * Every St:talk registration of the signed-in student, newest change first —
 * across events, because an earlier event's form is what pre-fills the next
 * one (MNT-11). Callers filter to the current `eventId` for status.
 */
/**
 * The signed-in student's registrations, newest change first. The server takes
 * the student from the session; `uid` only names the stream.
 */
export function myRegistrationsSource(_uid: string): LiveSource<MentoringRegistration[]> {
  return fetchSource('/api/mentoring/registrations/me')
}

const TESTING_DOC = 'mentoring_testing'

export function testingKey(uid: string): string {
  return sharedTestingKey(TESTING_DOC, uid)
}

/** `settings_private/mentoring_testing` — see shared/data/testing.ts. */
export function testingSource(uid: string): LiveSource<boolean> {
  return sharedTestingSource(TESTING_DOC, uid)
}

/**
 * The registration the account pages talk about: the live one in this event
 * if any (the server allows only one `reserved` per event), otherwise the
 * latest change so a cancellation stays visible with its "다시 신청하기" path.
 */
export function pickCurrent(registrations: MentoringRegistration[], eventId: string): MentoringRegistration | null {
  const inEvent = eventId ? registrations.filter((item) => item.eventId === eventId) : []
  return inEvent.find((item) => item.status === 'reserved') ?? inEvent[0] ?? null
}

/**
 * An option's name as entered in the admin console, "회사/직무/학과"
 * ("현대로템/SI/컴퓨터공학과"), in parts. A name without slashes is one part.
 */
export function splitOptionName(name: string): { name: string; details: string[] } {
  const [first = '', ...rest] = name.split('/').map((part) => part.trim()).filter(Boolean)
  return { name: first, details: rest }
}

/** The name on one line wherever a choice is listed: "현대로템 · SI · 컴퓨터공학과". */
export function formatOptionName(name: string): string {
  const { name: first, details } = splitOptionName(name)
  return [first, ...details].join(' · ')
}

/** Label for option 0. */
export const NONE_LABEL = '선택 안함'

/** Label for an option 1–7 whose name is empty — only in a closed draft. */
export function unnamedLabel(option: number): string {
  return `이름 없는 선택지 ${option}`
}

/** How a stored choice reads against the current settings. */
export function describeOption(
  event: MentoringEvent | null,
  option: number | null,
): { label: string; kind: 'option' | 'none' | 'unnamed' | 'invalid' } {
  if (option === null) return { label: '확인 필요', kind: 'invalid' }
  if (option === MENTORING_NONE) return { label: NONE_LABEL, kind: 'none' }
  const name = event?.options[option - 1] ?? ''
  return name ? { label: formatOptionName(name), kind: 'option' } : { label: unnamedLabel(option), kind: 'unnamed' }
}

/** Whether a choice can be sent to the server now: 선택 안함, or an option that has a name. */
export function isOfferedOption(event: MentoringEvent | null, option: number | null): boolean {
  if (option === null) return false
  if (option === MENTORING_NONE) return true
  return Boolean(event?.options[option - 1])
}

/** The eight choices a session lists: options 1–7 in order, then 선택 안함. */
export function optionChoices(event: MentoringEvent): MentoringChoice[] {
  const named = event.options.map((name, index) => {
    const value = index + 1
    return { value, label: name ? formatOptionName(name) : unnamedLabel(value), isNamed: Boolean(name) }
  })
  return [...named, { value: MENTORING_NONE, label: NONE_LABEL, isNamed: true }]
}

/** Options 1–7 that have a name — what the public guide lists as mentors (MNT-4). */
export function namedOptions(event: MentoringEvent): MentoringChoice[] {
  return optionChoices(event).filter((choice) => choice.value !== MENTORING_NONE && choice.isNamed)
}
