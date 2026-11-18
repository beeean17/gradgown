import type { AuditOutcome, AuditRow, GownReservation, ContentBundle, ContentKind, ConsoleMember, ConsoleMembers, MentoringRegistration, MentoringSettings, ReservationSettings, TestingSettings } from '../contracts/admin-view.ts'
import { MENTORING_OPTION_COUNT } from '../contracts/admin-view.ts'
import { timestamp, version } from './format.ts'
type Data = Record<string, unknown>
const string = (value: unknown) => typeof value === 'string' ? value : ''
const object = (value: unknown): Data => value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {}
export function reservationRow(path: string, data: Data): GownReservation {
  const parts = path.split('/')
  if (parts.length !== 4 || parts[0] !== 'users' || parts[2] !== 'gown_reservations') throw new Error('지원하지 않는 예약 경로입니다.')
  const status = ['reserved', 'cancelled', 'completed'].includes(string(data.status)) ? data.status as GownReservation['status'] : 'unknown'
  const warnings = []
  if (status === 'unknown') warnings.push('예약 상태 확인 필요')
  if (!timestamp(data.rentTime) || !timestamp(data.returnTime)) warnings.push('대여·반납 시각 확인 필요')
  if (!data.name || !data.studentId || !data.phone || !data.size || !version(data.modifiedAt)) warnings.push('필수 정보 또는 수정 버전 확인 필요')
  return { key: { userId: parts[1], reservationId: parts[3] }, periodId: string(data.periodId), status,
    name: string(data.name), studentId: string(data.studentId), department: string(data.department), phone: string(data.phone), size: string(data.size), slotId: string(data.slotId),
    rentAt: timestamp(data.rentTime), returnAt: timestamp(data.returnTime), isProxy: data.isProxy === true,
    proxyName: string(data.proxyName), proxyPhone: string(data.proxyPhone), createdBy: string(data.createdBy), createdAt: timestamp(data.createdAt), modifiedAt: timestamp(data.modifiedAt), version: version(data.modifiedAt), warnings }
}
export function settingsRow(data: Data): ReservationSettings {
  const period = (value: unknown) => ({ startsAt: timestamp(object(value).startsAt), endsAt: timestamp(object(value).endsAt) })
  return { version: version(object(data.metadata).updatedAt), periodId: string(data.periodId), isOpen: data.isOpen === true, createPeriod: period(data.createPeriod), editPeriod: period(data.editPeriod),
    slotsByDate: Object.fromEntries(Object.entries(object(data.slotsByDate)).map(([day, group]) => {
      const g = object(group)
      if (!Array.isArray(g.slots)) throw new Error('날짜별 슬롯 구조를 확인해 주세요.')
      return [day, { date: string(g.date), slots: g.slots.map((item: unknown) => { const s = object(item); return { id: string(s.id), enabled: s.enabled === true, ...period(s) } }) }]
    })) }
}
// settings/mentoring. v1 (Flutter) documents keep `isApplicationOpen` and a
// variable list with "선택 안함" in it; they show here as a closed draft to
// re-save, never as live settings. Either way the form gets exactly 7 names.
export function mentoringSettingsRow(data: Data): MentoringSettings {
  const metadata = object(data.metadata), schemaVersion = metadata.schemaVersion === 2 ? 2 : 1
  const period = (value: unknown) => ({ startsAt: timestamp(object(value).startsAt), endsAt: timestamp(object(value).endsAt) })
  const raw: unknown[] = Array.isArray(data.options) ? data.options : []
  const names = schemaVersion === 2
    ? raw.map(item => typeof item === 'string' ? item : '')
    : raw.filter((label): label is string => typeof label === 'string' && label.trim() !== '' && label.trim() !== '선택 안함').map(label => label.trim())
  const options = Array.from({ length: MENTORING_OPTION_COUNT }, (_, index) => names[index] || '')
  const event = object(data.event), sessions: unknown[] = Array.isArray(event.sessions) ? event.sessions : []
  const warnings: string[] = []
  if (schemaVersion === 1) warnings.push(data.isApplicationOpen === true ? '이전(v1) 형식 설정입니다. v1에서는 접수가 열려 있었지만, 새 형식으로 저장하기 전까지 학생 신청은 닫혀 있습니다.' : '이전(v1) 형식 설정입니다. 새 형식으로 저장하기 전까지 학생 신청은 닫혀 있습니다.')
  if (names.length > MENTORING_OPTION_COUNT || (schemaVersion === 2 && (raw.length !== MENTORING_OPTION_COUNT || raw.some(item => typeof item !== 'string')))) warnings.push(`저장된 선택지가 ${MENTORING_OPTION_COUNT}개 이름 형식이 아니어서 맞춰 표시했습니다. 저장하면 보이는 ${MENTORING_OPTION_COUNT}개만 남습니다.`)
  return {
    version: version(metadata.updatedAt), schemaVersion,
    eventId: schemaVersion === 2 ? string(data.eventId) : '', isOpen: schemaVersion === 2 && data.isOpen === true,
    applicationPeriod: period(data.applicationPeriod),
    event: { date: timestamp(event.date), location: string(event.location), sessions: [period(sessions[0]), period(sessions[1])] },
    options, intro: string(data.intro), notes: Array.isArray(data.notes) ? data.notes.filter((note): note is string => typeof note === 'string') : [],
    epicFolioUrl: string(data.epicFolioUrl), isEpicFolioLinkOpen: data.isEpicFolioLinkOpen === true, warnings,
  }
}
// users/{uid}/mentoring_registrations/{id}: identity comes from the path, as for reservations.
export function mentoringRow(path: string, data: Data): MentoringRegistration {
  const parts = path.split('/')
  if (parts.length !== 4 || parts[0] !== 'users' || parts[2] !== 'mentoring_registrations') throw new Error('지원하지 않는 St:talk 신청 경로입니다.')
  const option = (value: unknown) => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MENTORING_OPTION_COUNT ? value as number : null
  const status = data.status === 'reserved' || data.status === 'cancelled' ? data.status : 'unknown'
  const grade = Number.isInteger(data.grade) && (data.grade as number) >= 1 && (data.grade as number) <= 4 ? data.grade as number : null
  const firstOption = option(data.firstOption), secondOption = option(data.secondOption)
  const warnings: string[] = []
  if (status === 'unknown') warnings.push('신청 상태 확인 필요')
  if (firstOption === null || secondOption === null) warnings.push('차시 선택 확인 필요 (번호 형식이 아닌 신청)')
  if (!data.name || !data.studentId || !data.phone || grade === null || !version(data.modifiedAt)) warnings.push('필수 정보 또는 수정 버전 확인 필요')
  return { key: { userId: parts[1], registrationId: parts[3] }, eventId: string(data.eventId), status, name: string(data.name), department: string(data.department), studentId: string(data.studentId),
    grade, phone: string(data.phone), email: string(data.email), firstOption, secondOption, createdBy: string(data.createdBy), createdAt: timestamp(data.createdAt), modifiedAt: timestamp(data.modifiedAt), version: version(data.modifiedAt), warnings }
}
export function testingRow(data: Data): TestingSettings {
  return { version: version(data.updatedAt), enabled: data.enabled === true, expiresAt: timestamp(data.expiresAt), allowedUserIds: Object.fromEntries(Object.entries(object(data.allowedUserIds)).filter(([, allowed]) => allowed === true).map(([uid]) => [uid, true])) }
}
export function membersRow(data: Data): ConsoleMembers {
  const entries = (kind: ConsoleMember['kind'], map: unknown) => Object.entries(object(map)).map(([key, item]) => { const d = object(item); return { kind, key, label: string(d.label), addedAt: timestamp(d.addedAt), addedBy: string(d.addedBy) } })
  return { version: version(data.updatedAt), entries: [...entries('email', data.emails), ...entries('uid', data.uids)].sort((a, b) => b.addedAt.localeCompare(a.addedAt)) }
}
export function contentRows(kind: ContentKind, data: Data): ContentBundle {
  return { version: version(object(data.metadata).lastUpdated), entries: Object.entries(data).filter(([id]) => id !== 'metadata').map(([id, item]) => {
    const d = object(item)
    return { id, title: string(kind === 'faq' ? d.question : d.title), content: string(kind === 'faq' ? d.answer : d.content), category: string(d.category), isVisible: d.isVisible === true, isPinned: d.isPinned === true, isPopup: d.isPopup === true, popupOrder: typeof d.popupOrder === 'number' ? d.popupOrder : null, showOnToggle: d.showOnToggle === true, tags: Array.isArray(d.tags) ? d.tags.filter((v): v is string => typeof v === 'string') : [], order: typeof d.order === 'number' ? d.order : 0 }
  }).sort((a, b) => kind === 'faq' ? a.order - b.order : Number(b.isPinned) - Number(a.isPinned)) }
}
export function auditRow(id: string, data: Data): AuditRow {
  const rawOutcome = string(data.outcome)
  const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null
  const schemaVersion = number(data.schemaVersion) || 1
  const outcome: AuditOutcome = ['received', 'succeeded', 'rejected', 'failed'].includes(rawOutcome) ? rawOutcome as AuditOutcome : schemaVersion < 2 ? 'succeeded' : 'unknown'
  return {
    id,
    operationId: string(data.operationId) || id,
    schemaVersion,
    domain: string(data.domain) || string(data.action).split('.')[0] || 'unknown',
    action: string(data.action) || 'unknown',
    origin: string(data.origin) || 'admin-console',
    actorType: string(data.actorType) || 'admin',
    actorUid: string(data.actorUid) || string(data.actor),
    target: string(data.target),
    targetUserId: string(data.targetUserId),
    reservationId: string(data.reservationId),
    registrationId: string(data.registrationId),
    eventId: string(data.eventId),
    periodId: string(data.periodId),
    stage: string(data.stage) || (outcome === 'succeeded' ? 'completed' : 'unknown'),
    outcome,
    failureSource: string(data.failureSource),
    failureKind: string(data.failureKind),
    errorCode: string(data.errorCode),
    message: string(data.message),
    retryable: typeof data.retryable === 'boolean' ? data.retryable : null,
    resultKnown: data.resultKnown === true || outcome === 'succeeded',
    severity: string(data.severity) || (outcome === 'failed' ? 'error' : outcome === 'rejected' ? 'warning' : 'info'),
    createdAt: timestamp(data.createdAt),
    updatedAt: timestamp(data.updatedAt) || timestamp(data.createdAt),
    durationMs: number(data.durationMs),
    resolvedAt: timestamp(data.resolvedAt),
  }
}
