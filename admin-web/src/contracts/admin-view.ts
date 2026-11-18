export type ReservationKey = { userId: string; reservationId: string }
export type GownReservation = {
  key: ReservationKey
  periodId: string
  status: 'reserved' | 'cancelled' | 'completed' | 'unknown'
  name: string
  studentId: string
  /** Collected by the student web since 2026-10; empty on older reservations. */
  department: string
  phone: string
  size: string
  slotId: string
  rentAt: string
  returnAt: string
  isProxy: boolean
  proxyName: string
  proxyPhone: string
  createdBy: string
  createdAt: string
  modifiedAt: string
  version: string
  warnings: string[]
}
export type ReservationInput = Pick<GownReservation, 'name' | 'studentId' | 'department' | 'phone' | 'size' | 'slotId' | 'rentAt' | 'returnAt' | 'isProxy' | 'proxyName' | 'proxyPhone'>
export type Period = { startsAt: string; endsAt: string }
export type Slot = Period & { id: string; enabled: boolean }
export type ReservationSettings = {
  version: string
  periodId: string
  isOpen: boolean
  createPeriod: Period
  editPeriod: Period
  slotsByDate: Record<string, { date: string; slots: Slot[] }>
}
export type TestingSettings = { version: string; enabled: boolean; allowedUserIds: Record<string, boolean>; expiresAt: string }
/** Which private tester list: settings_private/{kind}_testing. */
export type TestingKind = 'reservation' | 'mentoring'
/**
 * St:talk offers a fixed set shared by both sessions: options 1–7, named in
 * `options[n - 1]`, and 0 = 선택 안함 (never stored in `options`).
 */
export const MENTORING_OPTION_COUNT = 7
/**
 * settings/mentoring (docs/contracts/mentoring-command.md). `schemaVersion` 1 is
 * the v1 (Flutter) shape: it reads as closed to students until saved again here.
 */
export type MentoringSettings = {
  version: string
  schemaVersion: 1 | 2
  eventId: string
  isOpen: boolean
  applicationPeriod: Period
  event: { date: string; location: string; sessions: [Period, Period] }
  /** Exactly MENTORING_OPTION_COUNT names; '' is allowed only while closed. */
  options: string[]
  intro: string
  notes: string[]
  epicFolioUrl: string
  isEpicFolioLinkOpen: boolean
  warnings: string[]
}
/** `adminCommand` `mentoring.settings.save` input. The server names the sessions (1차시·2차시). */
export type MentoringSettingsInput = Omit<MentoringSettings, 'version' | 'schemaVersion' | 'warnings'>
export type MentoringKey = { userId: string; registrationId: string }
/** users/{userId}/mentoring_registrations/{registrationId}. Options are 0 (선택 안함) or 1–7; null when the stored value is not one. */
export type MentoringRegistration = {
  key: MentoringKey
  eventId: string
  status: 'reserved' | 'cancelled' | 'unknown'
  name: string
  department: string
  studentId: string
  grade: number | null
  phone: string
  /** Verified sign-in email the server recorded; '' when it had none. */
  email: string
  firstOption: number | null
  secondOption: number | null
  createdBy: string
  createdAt: string
  modifiedAt: string
  version: string
  warnings: string[]
}
/** `adminCommand` `mentoring.create` / `mentoring.update` input (docs/contracts/mentoring-command.md). */
export type MentoringInput = { name: string; department: string; studentId: string; grade: number; phone: string; firstOption: number; secondOption: number }
/** `failed-precondition` details when a save renames an option live registrations chose (MNT-52). */
export type MentoringOptionChange = { option: number; before: string; after: string; first: number; second: number }
export type ContentKind = 'announcements' | 'faq'
export type ContentEntry = {
  id: string; title: string; content: string; category: string; isVisible: boolean
  isPinned: boolean; isPopup: boolean; popupOrder: number | null; showOnToggle: boolean
  tags: string[]; order: number
}
export type ContentBundle = { version: string; entries: ContentEntry[] }
export type UserLookup = {
  uid: string
  authExists: boolean
  profileExists: boolean
  email: string
  emailVerified: boolean
  disabled: boolean
  role: string
  createdAt: string
  lastLogin: string
  reservations: { reservationId: string; periodId: string; status: string; createdAt: string; modifiedAt: string }[]
}
export type AuditOutcome = 'received' | 'succeeded' | 'rejected' | 'failed' | 'unknown'
export type AuditRow = {
  id: string
  operationId: string
  schemaVersion: number
  domain: string
  action: string
  origin: string
  actorType: string
  actorUid: string
  target: string
  targetUserId: string
  reservationId: string
  /** St:talk operations name the registration and event instead of a reservation and round. */
  registrationId: string
  eventId: string
  periodId: string
  stage: string
  outcome: AuditOutcome
  failureSource: string
  failureKind: string
  errorCode: string
  message: string
  retryable: boolean | null
  resultKnown: boolean
  severity: string
  createdAt: string
  updatedAt: string
  durationMs: number | null
  resolvedAt: string
}
export type FunctionLogRow = {
  id: string
  timestamp: string
  severity: string
  functionName: string
  executionId: string
  operationId: string
  actorUid: string
  targetUserId: string
  reservationId: string
  action: string
  outcome: AuditOutcome
  failureSource: string
  errorCode: string
  stage: string
  message: string
  httpStatus: number | null
}
export type FunctionLogFilter = { hours: 1 | 6 | 24; severity: 'all' | 'warning' | 'error'; search: string }
export type FunctionLogPage = { rows: FunctionLogRow[]; unavailableReason: string }
export type LoadState<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string }
export type ConsoleRole = 'master' | 'admin'
export type ConsolePermission = 'console.view' | 'reservation.write' | 'reservation.delete' | 'mentoring.write' | 'mentoring.delete' | 'settings.write' | 'content.write' | 'mail.send' | 'members.manage'
/** What getAdminContext granted (functions/admin-policy.js). The UI hides what the server would refuse anyway. */
export type ConsoleAccess = { role: ConsoleRole; permissions: ConsolePermission[] }
export type ConsoleMember = { kind: 'uid' | 'email'; key: string; label: string; addedAt: string; addedBy: string }
export type ConsoleMembers = { version: string; entries: ConsoleMember[] }
export type ConsoleAccount = { uid: string; email: string }
export type AdminSessionState =
  | { status: 'checking-auth' | 'signed-out' | 'checking-permission' }
  /** `account` lets an unregistered person hand their email/UID to the master. */
  | { status: 'forbidden'; account?: ConsoleAccount }
  | { status: 'authorized'; uid: string; email: string; access: ConsoleAccess }
  | { status: 'error'; message: string }
export type ReservationPage = { rows: GownReservation[]; hasNext: boolean; cursor: unknown }
export type AdminApi = {
  getSettings(): Promise<ReservationSettings | null>
  getTesting(kind?: TestingKind): Promise<TestingSettings | null>
  getMentoringSettings(): Promise<MentoringSettings | null>
  /** Every registration of one event, newest first. An event holds a few hundred at most. */
  listMentoring(eventId: string): Promise<MentoringRegistration[]>
  listReservations(periodId: string, cursor?: unknown): Promise<ReservationPage>
  getUser(uid: string): Promise<UserLookup | null>
  getContent(kind: ContentKind): Promise<ContentBundle>
  listAudit(): Promise<AuditRow[]>
  listFunctionLogs(filter: FunctionLogFilter): Promise<FunctionLogPage>
  getMembers(): Promise<ConsoleMembers>
  command(input: Record<string, unknown>): Promise<void>
  uploadImage(file: File, progress: (percent: number) => void): Promise<string>
}
