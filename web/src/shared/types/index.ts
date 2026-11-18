/**
 * Domain types for the student app. Reservation and content shapes follow the
 * live Firestore schema (`settings/reservation`,
 * `users/{uid}/gown_reservations/*`, `information/{announcements,faq}`) as
 * documented in private/documents/03-react-v2/admin-api-inventory.md.
 * Firestore Timestamps become Seoul-offset ISO strings at the data boundary;
 * the UI never depends on the Timestamp class.
 */

// --- Reservation ---------------------------------------------------------

/** `settings/reservation.isOpen` — the operator's master switch. */
export type ReservationPeriodStatus = 'open' | 'closed'
/** The three gown sizes offered at the counter. */
export type GownSize = 'S' | 'M' | 'L'
export type ReservationStatus = 'reserved' | 'cancelled' | 'completed'

/** A row of the sizing table: a size's measured dimensions. */
export interface GownSizeSpec {
  size: GownSize
  lengthLabel: string
  totalLengthCm: number
  chestWidthCm: number
  shoulderWidthCm: number
  sleeveLengthCm: number
}

export interface ReservationSlot {
  /** `${date}_${slot.id}` — the key `reservationCommand` resolves. */
  slotId: string
  periodId: string
  type: 'rent' | 'return'
  startsAt: string
  endsAt: string
  label: string
  isActive: boolean
}

/** The single live reservation round (`settings/reservation`). */
export interface ReservationPeriod {
  /** `YYYY-MM` */
  periodId: string
  title: string
  status: ReservationPeriodStatus
  applyStartAt: string
  applyEndAt: string
  editStartAt: string
  editEndAt: string
  rentSlots: ReservationSlot[]
  returnSlots: ReservationSlot[]
}

/** One `users/{uid}/gown_reservations/{reservationId}` document. */
export interface Reservation {
  reservationId: string
  periodId: string
  /** `unknown` keeps an unexpected stored value visible instead of guessing. */
  status: ReservationStatus | 'unknown'
  name: string
  studentId: string
  /** Empty on reservations made before the field existed (Flutter era). */
  department: string
  phone: string
  /** Normalised size; `null` when the stored value is not S/M/L. */
  size: GownSize | null
  /** The stored size as-is, for display when it could not be normalised. */
  sizeRaw: string
  slotId: string
  /** Empty when the stored timestamp is missing or malformed. */
  rentAt: string
  returnAt: string
  isProxy: boolean
  proxyName: string
  proxyPhone: string
  createdAt: string
  modifiedAt: string
  /** Opaque optimistic-lock token the server compares on update/cancel. */
  version: string
}

// --- St:talk (mentoring) ---------------------------------------------------

/** `users/{uid}/mentoring_registrations/*.status`. No `attended` this round (MNT-58). */
export type MentoringStatus = 'reserved' | 'cancelled'

/**
 * St:talk offers a fixed set of choices shared by both sessions: options 1–7,
 * named in `settings/mentoring.options[n - 1]`, and 0 = "선택 안함", the only
 * choice both sessions may share (`admin-validation.js` MENTORING_NONE /
 * MENTORING_OPTION_COUNT). Registrations store the number; names may change.
 */
export const MENTORING_NONE = 0
export const MENTORING_OPTION_COUNT = 7

/** One of the eight choices as the screens list it. */
export interface MentoringChoice {
  /** 0 (선택 안함) or 1–7. */
  value: number
  /** The current name, "선택 안함", or "이름 없는 선택지 n" for an unnamed slot. */
  label: string
  /** False only for an option 1–7 whose name is empty (a closed draft). */
  isNamed: boolean
}

/** 1차시 / 2차시 of the event day. */
export interface MentoringSession {
  id: string
  label: string
  startsAt: string
  endsAt: string
}

/**
 * The current St:talk event (`settings/mentoring`, schemaVersion 2). A v1
 * (Flutter) document maps to `schema: 'v1'` with the switch off — the server
 * treats it as closed too (contract: "설정 문서 읽기").
 */
export interface MentoringEvent {
  schema: 'v2' | 'v1'
  /** `YYYY-MM`; empty on a v1 document. */
  eventId: string
  /** The operator's master switch (`isOpen`). */
  isOpen: boolean
  applyStartAt: string
  applyEndAt: string
  /** KST midnight of the event day; empty when not set. */
  date: string
  location: string
  sessions: MentoringSession[]
  /** Exactly 7 names for options 1–7 (`options[n - 1]`); `''` where unnamed. */
  options: string[]
  intro: string
  notes: string[]
  epicFolioUrl: string
  isEpicFolioLinkOpen: boolean
}

/** One `users/{uid}/mentoring_registrations/{registrationId}` document. */
export interface MentoringRegistration {
  registrationId: string
  eventId: string
  /** `unknown` keeps an unexpected stored value visible instead of guessing. */
  status: MentoringStatus | 'unknown'
  /** 0 = 선택 안함, 1–7 = `options[n - 1]`; `null` when the stored value is not one of those. */
  firstOption: number | null
  secondOption: number | null
  name: string
  studentId: string
  department: string
  phone: string
  /** 1–4; `null` when missing or malformed. */
  grade: number | null
  createdAt: string
  modifiedAt: string
  /** Opaque optimistic-lock token the server compares on update/cancel. */
  version: string
}

// --- Lecture -------------------------------------------------------------

export type LectureStatus = 'draft' | 'open' | 'closed' | 'archived'
export type RegistrationStatus = 'registered' | 'cancelled' | 'attended' | 'noShow'

export interface Lecture {
  lectureId: string
  title: string
  description: string
  speakerName: string
  speakerBio: string | null
  location: string
  startsAt: string
  endsAt: string
  status: LectureStatus
  applyStartAt: string
  applyEndAt: string
  capacity: number
  registeredCount: number
  isVisible: boolean
  summary: string | null
}

export interface LectureRegistration {
  registrationId: string
  lectureId: string
  uid: string
  userEmail: string
  name: string
  studentId: string
  major: string
  phone: string
  question: string | null
  status: RegistrationStatus
  emailSent: boolean
  createdAt: string
  updatedAt: string
}

// --- Content (announcements / FAQ) --------------------------------------

export interface Attachment {
  fileId: string
  name: string
  size: number
  url: string
}

/**
 * One entry of the `information/announcements` map. `showOnHome` is the stored
 * `showOnToggle`; tags and attachments are not part of the stored schema and
 * stay empty until operations can author them.
 */export interface Announcement {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  attachments: Attachment[]
  isPinned: boolean
  isVisible: boolean
  showOnHome: boolean
  isPopup: boolean
  authorId: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

