// What the admin server (admin-server, docs/contracts/web-api.md "관리자 API") answers,
// and the one interface the screens read it through. Times are Seoul-offset ISO strings.

/** GET /api/auth/accounts: the seeded accounts the test login offers. */
export type TestAccount = { email: string; role: ConsoleRole }

/** One row of GET /api/admin/gown/reservations. */
export type GownReservation = {
  reservationId: string
  userId: string
  /** The sign-in email of the user, joined from users. */
  email: string
  periodId: string
  status: 'reserved' | 'cancelled'
  name: string
  studentId: string
  department: string
  phone: string
  size: string
  slotId: string
  rentAt: string
  returnAt: string
  isProxy: boolean
  proxyName: string
  proxyPhone: string
  createdAt: string
  modifiedAt: string
  version: string
}
/** The server applies `search` (이름·학번·연락처) and `status` before it cuts the page. */
export type ReservationQuery = { periodId: string; search: string; status: 'all' | GownReservation['status']; cursor: string | null }
/** `nextCursor` goes back as `cursor` for the next page; null on the last one. */
export type ReservationPage = { items: GownReservation[]; nextCursor: string | null }
/** GET /api/admin/gown/periods/current. */
export type GownPeriod = {
  periodId: string
  title: string
  isOpen: boolean
  isCurrent: boolean
  applyStartAt: string
  applyEndAt: string
  editStartAt: string
  editEndAt: string
  slotCount: number
  reservedCount: number
}
/** GET /api/admin/gown/slots: one line of a period's timetable. */
export type GownSlot = { slotId: string; periodId: string; startsAt: string; endsAt: string; enabled: boolean }

/**
 * St:talk offers a fixed set shared by both sessions: options 1–7, named in
 * `options[n - 1]`, and 0 = 선택 안함 (never stored in `options`).
 */
export const MENTORING_OPTION_COUNT = 7
/** GET /api/admin/mentoring/events/current. `options` always has MENTORING_OPTION_COUNT names; '' is an unnamed one. */
export type MentoringEvent = {
  eventId: string
  isOpen: boolean
  isCurrent: boolean
  applyStartAt: string
  applyEndAt: string
  date: string
  location: string
  sessions: { id: string; label: string; startsAt: string; endsAt: string }[]
  options: string[]
  intro: string
  notes: string[]
  epicFolioUrl: string
  isEpicFolioLinkOpen: boolean
  reservedCount: number
}
/** One row of GET /api/admin/mentoring/registrations. Options are 0 (선택 안함) or 1–7. */
export type MentoringRegistration = {
  registrationId: string
  userId: string
  /** The sign-in email of the user, joined from users. */
  email: string
  eventId: string
  status: 'reserved' | 'cancelled'
  firstOption: number
  secondOption: number
  name: string
  studentId: string
  department: string
  phone: string
  grade: number
  createdAt: string
  modifiedAt: string
  version: string
}
/** Search (이름·학번·전화) and the three filters of MNT-55, all applied by the server. */
export type MentoringQuery = { eventId: string; search: string; status: 'all' | MentoringRegistration['status']; first: 'all' | number; second: 'all' | number }
/** One row of GET /api/admin/mentoring/counts: reserved registrations per option and session (MNT-54). Option 0 is 선택 안함. */
export type MentoringCount = { option: number; name: string; first: number; second: number }

export type ContentKind = 'announcements' | 'faq'
/** An announcement or a FAQ. A FAQ's question and answer read as `title` and `content`. */
export type ContentEntry = {
  id: string; title: string; content: string; category: string; isVisible: boolean
  isPinned: boolean; isPopup: boolean; showOnHome: boolean
  tags: string[]; order: number
}

export type AuditOutcome = 'received' | 'succeeded' | 'rejected' | 'failed'
export type AuditDomain = 'reservation' | 'mentoring'
/** One row of GET /api/admin/audit-logs: a student command. `completedAt` is '' while the result is not recorded. */
export type AuditRow = {
  operationId: string
  domain: string
  action: string
  actorId: string
  actorEmail: string
  targetId: string | null
  outcome: AuditOutcome
  failureKind: string | null
  errorCode: string | null
  createdAt: string
  completedAt: string
}
export type AuditQuery = { domain: 'all' | AuditDomain; outcome: 'all' | AuditOutcome; cursor: string | null }
export type AuditPage = { items: AuditRow[]; nextCursor: string | null }

export type LoadState<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string }
export type ConsoleRole = 'master' | 'admin'
export type ConsolePermission = 'console.view' | 'applications.open'
/**
 * What a role may do. The role comes from GET /api/me; the permissions follow from it here.
 * The UI hides what the database would refuse anyway (docs/decisions/admin-server-split.md).
 */
export type ConsoleAccess = { role: ConsoleRole; permissions: ConsolePermission[] }
export type ConsoleAccount = { uid: string; email: string }
export type AdminSessionState =
  | { status: 'checking-auth' }
  | { status: 'signed-out'; accounts: TestAccount[] }
  | { status: 'authorized'; uid: string; email: string; access: ConsoleAccess }
  | { status: 'error'; message: string }
export type AdminApi = {
  /** The current gown period, or null when none is marked current. */
  getPeriod(): Promise<GownPeriod | null>
  listSlots(periodId: string): Promise<GownSlot[]>
  listReservations(query: ReservationQuery): Promise<ReservationPage>
  /** Master only: for an admin MySQL refuses the write and the server answers `permission-denied`. */
  setPeriodOpen(periodId: string, isOpen: boolean): Promise<void>
  /** The current St:talk event, or null when none is marked current. */
  getEvent(): Promise<MentoringEvent | null>
  /** Every registration of one event that matches, newest first. An event holds a few hundred at most. */
  listMentoring(query: MentoringQuery): Promise<MentoringRegistration[]>
  /** Eight rows: options 1–7, then 0. */
  getMentoringCounts(eventId: string): Promise<MentoringCount[]>
  /** Master only, as setPeriodOpen. Opening needs all seven option names (MNT-51). */
  setEventOpen(eventId: string, isOpen: boolean): Promise<void>
  getContent(kind: ContentKind): Promise<ContentEntry[]>
  listAudit(query: AuditQuery): Promise<AuditPage>
}
