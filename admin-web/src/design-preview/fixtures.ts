import type { AdminApi, AuditRow, ContentEntry, ContentKind, GownPeriod, GownReservation, GownSlot, MentoringEvent, MentoringRegistration, TestAccount } from '../contracts/admin-view.ts'
import { optionNumbers } from '../data/mentoring.ts'

// PREVIEW_FIXTURE_ONLY: never import from the production entry point. Every value is made up.
export const previewAccounts: TestAccount[] = [{ email: 'viewer@example.test', role: 'admin' }, { email: 'operator@example.test', role: 'master' }]
const PAGE = 50
/** The preview stands in for the server, so it also does the server's filtering and paging. */
function pageOf<T>(rows: T[], cursor: string | null, id: (row: T) => string): { items: T[]; nextCursor: string | null } {
  const rest = cursor ? rows.slice(rows.findIndex(row => id(row) === cursor) + 1) : rows
  return { items: rest.slice(0, PAGE), nextCursor: rest.length > PAGE ? id(rest[PAGE - 1]) : null }
}
export function previewApi(scenario: string): AdminApi {
  const empty = scenario === 'empty'
  const period: GownPeriod = { periodId: '2026-09', title: '2026년 9월 학위복 예약', isOpen: true, isCurrent: true, applyStartAt: '2026-09-01T09:00:00+09:00', applyEndAt: '2026-09-30T18:00:00+09:00', editStartAt: '2026-09-01T09:00:00+09:00', editEndAt: '2026-09-30T18:00:00+09:00', slotCount: 2, reservedCount: 6 }
  const slots: GownSlot[] = [{ slotId: '1', periodId: '2026-09', startsAt: '2026-09-20T10:00:00+09:00', endsAt: '2026-09-20T10:30:00+09:00', enabled: true }, { slotId: '2', periodId: '2026-09', startsAt: '2026-09-20T11:00:00+09:00', endsAt: '2026-09-20T11:30:00+09:00', enabled: false }]
  const reservations: GownReservation[] = Array.from({ length: empty ? 0 : 8 }, (_, index) => ({ reservationId: String(8 - index), userId: String(index + 1), email: `student${index + 1}@example.test`, periodId: '2026-09', status: index === 6 ? 'cancelled' : 'reserved', name: `샘플 학생 ${index + 1}`, studentId: `9999000${index + 1}`, department: '샘플학과', phone: '010-0000-0000', size: ['S', 'M', 'L'][index % 3], slotId: '1', rentAt: '2026-09-20T10:00:00+09:00', returnAt: '2026-09-21T10:00:00+09:00', isProxy: index === 2, proxyName: index === 2 ? '샘플 대리인' : '', proxyPhone: index === 2 ? '010-0000-0000' : '', createdAt: '2026-09-04T11:00:00+09:00', modifiedAt: '2026-09-04T11:00:00+09:00', version: '1' }))
  const content: Record<ContentKind, ContentEntry[]> = {
    announcements: [{ id: '1', title: '학위복 수령 전 꼭 확인해 주세요', content: '학위복을 수령하기 전에 예약 내역과 신분증을 준비해 주세요.\n\n대리 수령 시 대리인의 정보를 다시 확인해 주세요.', category: 'notice', isVisible: true, isPinned: true, isPopup: false, showOnHome: true, tags: [], order: 0 }],
    faq: [{ id: '1', title: '다른 사람이 대신 수령할 수 있나요?', content: '예약에 대리 수령 정보를 등록한 뒤 안내에 따라 수령해 주세요.', category: '수령', isVisible: true, isPinned: false, isPopup: false, showOnHome: false, tags: ['학위복'], order: 1 }],
  }
  const audit: AuditRow[] = [
    { operationId: 'op-success', domain: 'reservation', action: 'reservation.create', actorId: '1', actorEmail: 'student1@example.test', targetId: '8', outcome: 'succeeded', failureKind: null, errorCode: null, createdAt: '2026-09-04T11:00:00+09:00', completedAt: '2026-09-04T11:00:00+09:00' },
    { operationId: 'op-request-invalid', domain: 'reservation', action: 'reservation.create', actorId: '3', actorEmail: 'student3@example.test', targetId: null, outcome: 'rejected', failureKind: 'validation', errorCode: 'invalid-argument', createdAt: '2026-09-04T10:58:00+09:00', completedAt: '2026-09-04T10:58:00+09:00' },
    { operationId: 'op-server-failed', domain: 'mentoring', action: 'mentoring.create', actorId: '4', actorEmail: 'student4@example.test', targetId: null, outcome: 'failed', failureKind: 'internal', errorCode: 'internal', createdAt: '2026-09-04T10:55:00+09:00', completedAt: '2026-09-04T10:55:00+09:00' },
    { operationId: 'op-conflict', domain: 'reservation', action: 'reservation.update', actorId: '5', actorEmail: 'student5@example.test', targetId: null, outcome: 'rejected', failureKind: 'conflict', errorCode: 'aborted', createdAt: '2026-09-04T10:52:00+09:00', completedAt: '2026-09-04T10:52:00+09:00' },
    { operationId: 'op-pending', domain: 'reservation', action: 'reservation.create', actorId: '6', actorEmail: 'student6@example.test', targetId: null, outcome: 'received', failureKind: null, errorCode: null, createdAt: '2026-09-04T10:50:00+09:00', completedAt: '' },
  ]
  const event: MentoringEvent = { eventId: '2026-11', isOpen: false, isCurrent: true, applyStartAt: '2026-11-02T09:00:00+09:00', applyEndAt: '2026-11-11T00:00:00+09:00', date: '2026-11-18T00:00:00+09:00', location: '중앙도서관 1층 St:art홀', sessions: [{ id: '1', label: '1차시', startsAt: '2026-11-18T18:00:00+09:00', endsAt: '2026-11-18T18:50:00+09:00' }, { id: '2', label: '2차시', startsAt: '2026-11-18T19:00:00+09:00', endsAt: '2026-11-18T19:50:00+09:00' }], options: ['샘플 A사 공정설계', '샘플 B사 양산기술', '샘플 C사 연구개발', '샘플 D사 품질관리', '샘플 E사 영업', '', ''], intro: '졸업생 초청 소그룹 진로·취업 멘토링입니다.', notes: ['지각 시 입장이 제한될 수 있습니다.'], epicFolioUrl: '', isEpicFolioLinkOpen: false, reservedCount: 11 }
  const names = ['김샘플', '이샘플', '박샘플', '최샘플', '정샘플', '강샘플', '조샘플', '윤샘플', '장샘플', '임샘플', '한샘플', '오샘플']
  const picks: [number, number][] = [[1, 2], [1, 0], [2, 3], [3, 1], [4, 5], [5, 0], [0, 4], [2, 1], [1, 3], [3, 4], [4, 2], [5, 1]]
  const registrations: MentoringRegistration[] = empty ? [] : names.map((name, index) => ({ registrationId: String(names.length - index), userId: String(index + 1), email: `student${index + 1}@example.test`, eventId: '2026-11', status: index === 9 ? 'cancelled' : 'reserved', name, department: '샘플학과', studentId: `9999${String(index).padStart(4, '0')}`, grade: index % 4 + 1, phone: '010-0000-0000', firstOption: picks[index][0], secondOption: picks[index][1], createdAt: `2026-11-0${index % 9 + 1}T11:00:00+09:00`, modifiedAt: `2026-11-0${index % 9 + 1}T11:00:00+09:00`, version: '1' }))
  const matches = (term: string, ...values: string[]) => !term.trim() || values.some(value => value.includes(term.trim()))
  async function respond<T>(value: T): Promise<T> {
    if (scenario === 'loading') return new Promise<T>(() => {})
    await new Promise(resolve => setTimeout(resolve, 100))
    if (scenario === 'error') throw new Error('미리보기: 서버 연결 실패 상태입니다.')
    return structuredClone(value)
  }
  const write = async (change: () => void) => { await respond(null); change() }
  return {
    getPeriod: () => respond(empty ? null : period),
    listSlots: periodId => respond(slots.filter(slot => slot.periodId === periodId)),
    listReservations: ({ periodId, search, status, cursor }) => respond(pageOf(reservations.filter(r => r.periodId === periodId && (status === 'all' || r.status === status) && matches(search, r.name, r.studentId, r.phone)), cursor, r => r.reservationId)),
    setPeriodOpen: (_, isOpen) => write(() => { period.isOpen = isOpen }),
    getEvent: () => respond(empty ? null : event),
    listMentoring: ({ eventId, search, status, first, second }) => respond(registrations.filter(r => r.eventId === eventId && (status === 'all' || r.status === status) && (first === 'all' || r.firstOption === first) && (second === 'all' || r.secondOption === second) && matches(search, r.name, r.studentId, r.phone))),
    getMentoringCounts: eventId => {
      const live = registrations.filter(r => r.eventId === eventId && r.status === 'reserved')
      return respond(optionNumbers().map(option => ({ option, name: option ? eventId === event.eventId ? event.options[option - 1] : '' : '선택 안함', first: live.filter(r => r.firstOption === option).length, second: live.filter(r => r.secondOption === option).length })))
    },
    setEventOpen: (_, isOpen) => write(() => {
      if (isOpen && event.options.some(name => !name)) throw Object.assign(new Error('선택지 7개의 이름을 모두 채워야 접수를 열 수 있습니다.'), { code: 'failed-precondition' })
      event.isOpen = isOpen
    }),
    getContent: kind => respond(empty ? [] : content[kind]),
    listAudit: ({ domain, outcome, cursor }) => respond(pageOf(empty ? [] : audit.filter(log => (domain === 'all' || log.domain === domain) && (outcome === 'all' || log.outcome === outcome)), cursor, log => log.operationId)),
  }
}
