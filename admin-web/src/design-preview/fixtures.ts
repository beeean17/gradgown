import type { AdminApi, AuditRow, ConsoleMember, ConsoleMembers, ContentBundle, FunctionLogRow, GownReservation, MentoringRegistration, MentoringSettings, MentoringSettingsInput, ReservationSettings, TestingKind, TestingSettings, UserLookup } from '../contracts/admin-view.ts'

// PREVIEW_FIXTURE_ONLY: never import from the production entry point.
export function previewApi(scenario: string): AdminApi {
  const settings: ReservationSettings = { version: 'preview-1', periodId: '2026-09', isOpen: true, createPeriod: { startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-09-30T09:00:00.000Z' }, editPeriod: { startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-09-30T09:00:00.000Z' }, slotsByDate: { '2026-09-20': { date: '2026-09-20', slots: [{ id: '1000-1030', startsAt: '2026-09-20T01:00:00.000Z', endsAt: '2026-09-20T01:30:00.000Z', enabled: true }, { id: '1100-1130', startsAt: '2026-09-20T02:00:00.000Z', endsAt: '2026-09-20T02:30:00.000Z', enabled: true }] } } }
  const rows: GownReservation[] = Array.from({ length: scenario === 'empty' ? 0 : 8 }, (_, index) => ({ key: { userId: `demo-preview-student-${index}`, reservationId: `reservation-${index}` }, periodId: '2026-09', status: index === 6 ? 'cancelled' : index === 7 ? 'completed' : 'reserved', name: `샘플 학생 ${index + 1}`, studentId: `TEST000${index + 1}`, department: '샘플학과', phone: '010-0000-0000', size: ['S', 'M', 'L'][index % 3], slotId: '2026-09-20_1000-1030', rentAt: '2026-09-20T01:00:00.000Z', returnAt: '2026-09-21T01:00:00.000Z', isProxy: index === 2, proxyName: index === 2 ? '샘플 대리인' : '', proxyPhone: index === 2 ? '010-0000-0000' : '', createdBy: `demo-preview-student-${index}`, createdAt: '2026-09-04T02:00:00.000Z', modifiedAt: '2026-09-04T02:00:00.000Z', version: 'preview-1', warnings: [] }))
  const bundles: Record<string, ContentBundle> = {
    announcements: { version: 'preview-1', entries: [{ id: 'notice-preview', title: '학위복 수령 전 꼭 확인해 주세요', content: '학위복을 수령하기 전에 예약 내역과 신분증을 준비해 주세요.\n\n대리 수령 시 대리인의 정보를 다시 확인해 주세요.', category: '학위복', isVisible: true, isPinned: true, isPopup: false, popupOrder: null, showOnToggle: false, tags: [], order: 0 }] },
    faq: { version: 'preview-1', entries: [{ id: 'faq-preview', title: '다른 사람이 대신 수령할 수 있나요?', content: '예약에 대리 수령 정보를 등록한 뒤 안내에 따라 수령해 주세요.', category: '수령', isVisible: true, isPinned: false, isPopup: false, popupOrder: null, showOnToggle: false, tags: ['학위복'], order: 0 }] },
  }
  const auditBase = { registrationId: '', eventId: '', schemaVersion: 2, domain: 'reservation', origin: 'student-web', actorType: 'student', periodId: '2026-09', retryable: false, resultKnown: true, resolvedAt: '', updatedAt: '2026-09-04T02:00:00.000Z', durationMs: 184 } as const
  const auditRows: AuditRow[] = [
    { ...auditBase, id: 'op-success', operationId: 'op-success', action: 'reservation.create', actorUid: rows[0]?.key.userId || 'demo-preview-student-0', targetUserId: rows[0]?.key.userId || 'demo-preview-student-0', reservationId: 'reservation-0', target: 'users/demo-preview-student-0/gown_reservations/reservation-0', stage: 'completed', outcome: 'succeeded', failureSource: '', failureKind: '', errorCode: '', message: '', severity: 'info', createdAt: '2026-09-04T02:00:00.000Z' },
    { ...auditBase, id: 'op-request-invalid', operationId: 'op-request-invalid', action: 'reservation.create', actorUid: 'demo-preview-student-2', targetUserId: 'demo-preview-student-2', reservationId: 'op-request-invalid', target: 'users/demo-preview-student-2/gown_reservations/op-request-invalid', stage: 'request-validation', outcome: 'rejected', failureSource: 'request', failureKind: 'validation', errorCode: 'invalid-argument', message: '연락처 형식을 확인해 주세요.', severity: 'warning', createdAt: '2026-09-04T01:58:00.000Z', durationMs: 96 },
    { ...auditBase, id: 'op-server-failed', operationId: 'op-server-failed', action: 'reservation.create', actorUid: 'demo-preview-student-3', targetUserId: 'demo-preview-student-3', reservationId: 'op-server-failed', target: 'users/demo-preview-student-3/gown_reservations/op-server-failed', stage: 'transaction', outcome: 'failed', failureSource: 'server', failureKind: 'infrastructure', errorCode: 'unavailable', message: '예약 저장 서버에 일시적으로 연결하지 못했습니다.', severity: 'error', retryable: true, resultKnown: false, createdAt: '2026-09-04T01:55:00.000Z', durationMs: 70000 },
    { ...auditBase, id: 'op-conflict', operationId: 'op-conflict', action: 'reservation.update', origin: 'admin-console', actorType: 'admin', actorUid: 'preview-operator', targetUserId: 'demo-preview-student-4', reservationId: 'reservation-4', target: 'users/demo-preview-student-4/gown_reservations/reservation-4', stage: 'transaction', outcome: 'rejected', failureSource: 'request', failureKind: 'conflict', errorCode: 'aborted', message: '데이터가 변경되었습니다. 새로고침해 주세요.', severity: 'warning', retryable: true, createdAt: '2026-09-04T01:52:00.000Z', durationMs: 141 },
    { ...auditBase, id: 'op-pending', operationId: 'op-pending', action: 'reservation.create', actorUid: 'demo-preview-student-5', targetUserId: 'demo-preview-student-5', reservationId: 'op-pending', target: 'users/demo-preview-student-5/gown_reservations/op-pending', stage: 'transaction', outcome: 'received', failureSource: '', failureKind: '', errorCode: '', message: '', severity: 'info', retryable: null, resultKnown: false, createdAt: '2026-09-04T01:50:00.000Z', durationMs: null },
  ]
  const functionLogs: FunctionLogRow[] = [
    { id: 'cloud-success', timestamp: '2026-09-04T02:00:01.000Z', severity: 'info', functionName: 'reservationCommand', executionId: 'exec-success', operationId: 'op-success', actorUid: 'demo-preview-student-0', targetUserId: 'demo-preview-student-0', reservationId: 'reservation-0', action: 'reservation.create', outcome: 'succeeded', failureSource: '', errorCode: '', stage: 'completed', message: 'Reservation operation succeeded', httpStatus: 200 },
    { id: 'cloud-rejected', timestamp: '2026-09-04T01:58:01.000Z', severity: 'warning', functionName: 'reservationCommand', executionId: 'exec-rejected', operationId: 'op-request-invalid', actorUid: 'demo-preview-student-2', targetUserId: 'demo-preview-student-2', reservationId: 'op-request-invalid', action: 'reservation.create', outcome: 'rejected', failureSource: 'request', errorCode: 'invalid-argument', stage: 'request-validation', message: 'Operation rejected', httpStatus: 400 },
    { id: 'cloud-failed', timestamp: '2026-09-04T01:55:01.000Z', severity: 'error', functionName: 'reservationCommand', executionId: 'exec-failed', operationId: 'op-server-failed', actorUid: 'demo-preview-student-3', targetUserId: 'demo-preview-student-3', reservationId: 'op-server-failed', action: 'reservation.create', outcome: 'failed', failureSource: 'server', errorCode: 'unavailable', stage: 'transaction', message: 'Operation failed', httpStatus: 500 },
    { id: 'cloud-appcheck', timestamp: '2026-09-04T01:45:01.000Z', severity: 'warning', functionName: 'reservationCommand', executionId: 'exec-appcheck', operationId: '', actorUid: '', targetUserId: '', reservationId: '', action: '', outcome: 'rejected', failureSource: 'platform', errorCode: '', stage: '', message: 'Callable request verification failed', httpStatus: 401 },
  ]
  const testing: Record<TestingKind, TestingSettings | null> = { reservation: null, mentoring: null }
  let mentoring: MentoringSettings | null = scenario === 'empty' ? null : { version: 'preview-1', schemaVersion: 2, eventId: '2026-11', isOpen: false, applicationPeriod: { startsAt: '2026-11-02T00:00:00.000Z', endsAt: '2026-11-10T15:00:00.000Z' }, event: { date: '2026-11-17T15:00:00.000Z', location: '중앙도서관 1층 St:art홀', sessions: [{ startsAt: '2026-11-18T09:00:00.000Z', endsAt: '2026-11-18T09:50:00.000Z' }, { startsAt: '2026-11-18T10:00:00.000Z', endsAt: '2026-11-18T10:50:00.000Z' }] }, options: ['샘플 A사 공정설계', '샘플 B사 양산기술', '샘플 C사 연구개발', '샘플 D사 품질관리', '샘플 E사 영업', '', ''], intro: '졸업생 초청 소그룹 진로·취업 멘토링입니다.', notes: ['지각 시 입장이 제한될 수 있습니다.'], epicFolioUrl: '', isEpicFolioLinkOpen: false, warnings: [] }
  const names = ['김샘플', '이샘플', '박샘플', '최샘플', '정샘플', '강샘플', '조샘플', '윤샘플', '장샘플', '임샘플', '한샘플', '오샘플']
  const picks: [number, number][] = [[1, 2], [1, 0], [2, 3], [3, 1], [4, 5], [5, 0], [0, 4], [2, 1], [1, 3], [3, 4], [4, 2], [5, 1]]
  const registrations: MentoringRegistration[] = scenario === 'empty' ? [] : names.map((name, index) => ({ key: { userId: `demo-preview-student-${index}`, registrationId: `registration-${index}` }, eventId: '2026-11', status: index === 9 ? 'cancelled' : 'reserved', name, department: '샘플학과', studentId: `2023${String(index).padStart(4, '0')}`, grade: index % 4 + 1, phone: '010-0000-0000', email: `student${index}@example.test`, firstOption: picks[index][0], secondOption: picks[index][1], createdBy: `demo-preview-student-${index}`, createdAt: `2026-11-0${index % 9 + 1}T02:00:00.000Z`, modifiedAt: `2026-11-0${index % 9 + 1}T02:00:00.000Z`, version: 'preview-1', warnings: [] }))
  // Pretend live registrations chose option 1, so renaming it asks for confirmation as the server does.
  const mentoringInUse: Record<number, { first: number; second: number }> = { 1: { first: 3, second: 1 } }
  const members: ConsoleMembers = { version: 'preview-1', entries: scenario === 'empty' ? [] : [{ kind: 'email', key: 'helper@example.test', label: '샘플 운영 도우미', addedAt: '2026-09-02T02:00:00.000Z', addedBy: 'preview-operator' }, { kind: 'uid', key: 'demo-preview-viewer', label: '', addedAt: '2026-09-01T02:00:00.000Z', addedBy: 'preview-operator' }] }
  async function respond<T>(value: T): Promise<T> {
    if (scenario === 'loading') return new Promise<T>(() => {})
    await new Promise(resolve => setTimeout(resolve, 100))
    if (scenario === 'error') throw new Error('미리보기: 서버 연결 실패 상태입니다.')
    return structuredClone(value)
  }
  return {
    getSettings: () => respond(settings), getTesting: (kind = 'reservation') => respond(testing[kind]), getMentoringSettings: () => respond(mentoring), listMentoring: eventId => respond(registrations.filter(r => r.eventId === eventId)), listReservations: () => respond({ rows, hasNext: false, cursor: undefined }),
    getUser: uid => respond(rows.some(r => r.key.userId === uid) ? { uid, authExists: true, profileExists: true, email: `${uid}@example.test`, emailVerified: true, disabled: false, role: 'student', createdAt: rows[0].createdAt, lastLogin: rows[0].createdAt, reservations: rows.filter(r => r.key.userId === uid).map(r => ({ reservationId: r.key.reservationId, periodId: r.periodId, status: r.status, createdAt: r.createdAt, modifiedAt: r.modifiedAt })) } satisfies UserLookup : null),
    getContent: kind => respond(scenario === 'empty' ? { version: '', entries: [] } : bundles[kind]), listAudit: () => respond(scenario === 'empty' ? [] : auditRows),
    listFunctionLogs: filter => respond({ rows: scenario === 'empty' ? [] : functionLogs.filter(row => (filter.severity === 'all' || filter.severity === 'warning' && row.severity !== 'info' || filter.severity === 'error' && row.severity === 'error') && (!filter.search || [row.operationId, row.actorUid, row.targetUserId, row.reservationId, row.executionId].includes(filter.search))), unavailableReason: '' }),
    getMembers: () => respond(members),
    uploadImage: async () => { throw new Error('디자인 미리보기에서는 실제 업로드하지 않습니다.') },
    command: async input => {
      if (scenario === 'conflict') throw Object.assign(new Error('충돌'), { code: 'functions/aborted' })
      await respond(null)
      const key = input.key as { userId: string; reservationId: string }
      const row = rows.find(r => r.key.userId === key?.userId && r.key.reservationId === key?.reservationId)
      if (input.action === 'reservation.cancel' && row) row.status = 'cancelled'
      if (input.action === 'reservation.delete' && row) rows.splice(rows.indexOf(row), 1)
      if (input.action === 'reservation.update' && row) Object.assign(row, input.input)
      if (input.action === 'reservation.create') rows.unshift({ ...rows[0], ...(input.input as object), key: { userId: key.userId, reservationId: crypto.randomUUID() }, periodId: settings.periodId, status: 'reserved', version: 'preview-1', warnings: [] })
      if (input.action === 'settings.save') Object.assign(settings, input.input)
      if (input.action === 'testing.save') testing[input.kind === 'mentoring' ? 'mentoring' : 'reservation'] = input.input as TestingSettings
      if (['mentoring.create', 'mentoring.update', 'mentoring.cancel', 'mentoring.delete'].includes(String(input.action))) {
        const key = input.key as { userId: string; registrationId?: string }
        const found = registrations.find(r => r.key.userId === key.userId && r.key.registrationId === key.registrationId)
        if (input.action === 'mentoring.cancel' && found) found.status = 'cancelled'
        if (input.action === 'mentoring.delete' && found) registrations.splice(registrations.indexOf(found), 1)
        if (input.action === 'mentoring.update' && found) Object.assign(found, input.input)
        if (input.action === 'mentoring.create') registrations.unshift({ ...registrations[0], ...(input.input as object), key: { userId: key.userId, registrationId: crypto.randomUUID() }, eventId: mentoring?.eventId || '2026-11', status: 'reserved', email: `${key.userId}@example.test`, createdAt: new Date().toISOString(), version: 'preview-1', warnings: [] })
      }
      if (input.action === 'mentoring.settings.save') {
        const next = input.input as MentoringSettingsInput
        if (mentoring && mentoring.eventId !== next.eventId && input.confirmEventChange !== mentoring.eventId) throw Object.assign(new Error(`현재 행사(${mentoring.eventId})에 신청 완료 4건이 있습니다.`), { code: 'functions/failed-precondition', details: { reserved: 4 } })
        const confirmed = Array.isArray(input.confirmChangedOptions) ? input.confirmChangedOptions : []
        const before = mentoring?.eventId === next.eventId ? mentoring.options : []
        const changedOptions = next.options.map((after, index) => ({ option: index + 1, before: before[index] || '', after })).filter(c => mentoringInUse[c.option] && c.before !== c.after && !confirmed.includes(c.option)).map(c => ({ ...c, ...mentoringInUse[c.option] }))
        if (changedOptions.length) throw Object.assign(new Error('이름을 바꾸려는 선택지를 고른 신청이 있습니다.'), { code: 'functions/failed-precondition', details: { changedOptions } })
        mentoring = { ...next, version: `preview-${Date.now()}`, schemaVersion: 2, warnings: [] }
      }
      if (input.action === 'members.add' || input.action === 'members.remove') {
        const member = input.input as Pick<ConsoleMember, 'kind' | 'key' | 'label'>
        members.entries = members.entries.filter(m => !(m.kind === member.kind && m.key === member.key))
        if (input.action === 'members.add') members.entries.unshift({ ...member, label: member.label || '', addedAt: new Date().toISOString(), addedBy: 'preview-operator' })
      }
      if (input.action === 'content.save' || input.action === 'content.delete') {
        const bundle = bundles[String(input.kind)]; bundle.entries = bundle.entries.filter(e => e.id !== input.id)
        if (input.action === 'content.save') bundle.entries.push(input.input as ContentBundle['entries'][number])
      }
    },
  }
}
