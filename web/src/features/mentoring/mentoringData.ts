import { collection, doc } from 'firebase/firestore'
import { firebase } from '../../shared/firebase/runtime'
import type { LiveSource } from '../../shared/data/live'
import { docSource, querySource } from '../../shared/data/snapshots'
import {
  testingKey as sharedTestingKey,
  testingSource as sharedTestingSource,
} from '../../shared/data/testing'
import { iso, num, obj, str, strList, version, type Data } from '../../shared/data/values'
import {
  MENTORING_NONE,
  MENTORING_OPTION_COUNT,
  type MentoringChoice,
  type MentoringEvent,
  type MentoringRegistration,
  type MentoringSession,
} from '../../shared/types'

/**
 * Mapping between the St:talk schema and the UI model.
 *
 * `settings/mentoring` (public read, written by `adminCommand`):
 *   { metadata: { schemaVersion: 2 }, eventId: 'YYYY-MM', isOpen,
 *     applicationPeriod: { startsAt, endsAt },
 *     event: { date, location, sessions: [{ id, label, startsAt, endsAt }, …] },
 *     options: string[7], intro, notes[], epicFolioUrl, isEpicFolioLinkOpen }
 *
 * `users/{uid}/mentoring_registrations/{id}` (owner read; writes only through
 * the `mentoringCommand` callable). Contract: docs/contracts/mentoring-command.md
 * "설정 문서 읽기".
 */

/** Seven names for options 1–7; a missing or non-string slot reads as unnamed. */
function toOptions(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : []
  return Array.from({ length: MENTORING_OPTION_COUNT }, (_, index) => str(raw[index]).trim())
}

function toSessions(value: unknown): MentoringSession[] {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    const session = obj(item)
    return {
      id: str(session.id) || String(index + 1),
      label: str(session.label) || `${index + 1}차시`,
      startsAt: iso(session.startsAt),
      endsAt: iso(session.endsAt),
    }
  })
}

export function toMentoringEvent(data: Data | undefined): MentoringEvent | null {
  if (!data) return null
  const isV2 = obj(data.metadata).schemaVersion === 2
  if (!isV2) {
    // A v1 (Flutter) document: `isApplicationOpen`, "선택 안함" mixed into the
    // options. The server refuses every command against it, so it reads as
    // closed here too and nothing of it is offered to the student.
    return {
      schema: 'v1',
      eventId: '',
      isOpen: false,
      applyStartAt: '',
      applyEndAt: '',
      date: '',
      location: '',
      sessions: [],
      options: toOptions([]),
      intro: '',
      notes: [],
      epicFolioUrl: '',
      isEpicFolioLinkOpen: false,
    }
  }
  const period = obj(data.applicationPeriod)
  const event = obj(data.event)
  const epicFolioUrl = str(data.epicFolioUrl).trim()
  return {
    schema: 'v2',
    eventId: str(data.eventId),
    isOpen: data.isOpen === true,
    applyStartAt: iso(period.startsAt),
    applyEndAt: iso(period.endsAt),
    date: iso(event.date),
    location: str(event.location),
    sessions: toSessions(event.sessions),
    options: toOptions(data.options),
    intro: str(data.intro),
    notes: strList(data.notes),
    epicFolioUrl,
    isEpicFolioLinkOpen: data.isEpicFolioLinkOpen === true && /^https:\/\/\S+$/.test(epicFolioUrl),
  }
}

/** A stored choice: 0–7, else `null` so the screen says "확인 필요" instead of guessing. */
function optionNumber(value: unknown): number | null {
  const n = num(value)
  return n !== null && Number.isInteger(n) && n >= MENTORING_NONE && n <= MENTORING_OPTION_COUNT ? n : null
}

const STATUSES = ['reserved', 'cancelled'] as const

export function toRegistration(registrationId: string, data: Data): MentoringRegistration {
  const status = str(data.status)
  const grade = num(data.grade)
  return {
    registrationId,
    eventId: str(data.eventId),
    status: (STATUSES as readonly string[]).includes(status) ? (status as MentoringRegistration['status']) : 'unknown',
    firstOption: optionNumber(data.firstOption),
    secondOption: optionNumber(data.secondOption),
    name: str(data.name),
    studentId: str(data.studentId),
    department: str(data.department),
    phone: str(data.phone),
    grade: grade !== null && Number.isInteger(grade) && grade >= 1 && grade <= 4 ? grade : null,
    createdAt: iso(data.createdAt),
    modifiedAt: iso(data.modifiedAt) || iso(data.createdAt),
    version: version(data.modifiedAt),
  }
}

export const EVENT_KEY = 'doc:settings/mentoring'

export const eventSource: LiveSource<MentoringEvent | null> = docSource(
  () => doc(firebase().db, 'settings', 'mentoring'),
  toMentoringEvent,
)

export function myRegistrationsKey(uid: string): string {
  return `user:${uid}:mentoring_registrations`
}

/**
 * Every St:talk registration of the signed-in student, newest change first —
 * across events, because an earlier event's form is what pre-fills the next
 * one (MNT-11). Callers filter to the current `eventId` for status.
 */
export function myRegistrationsSource(uid: string): LiveSource<MentoringRegistration[]> {
  return querySource(
    () => collection(firebase().db, 'users', uid, 'mentoring_registrations'),
    (snapshot) =>
      snapshot.docs
        .map((item) => toRegistration(item.id, item.data()))
        .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)),
  )
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
