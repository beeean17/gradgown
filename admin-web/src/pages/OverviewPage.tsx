import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { Grid } from '@astryxdesign/core/Grid'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Link } from '@astryxdesign/core/Link'
import { Selector } from '@astryxdesign/core/Selector'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Tab, TabList } from '@astryxdesign/core/TabList'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useNavigate } from 'react-router-dom'
import type { AdminApi, AuditRow, FunctionLogFilter, FunctionLogRow, UserLookup } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { displayDate, errorMessage } from '../data/format.ts'
import { reservationCloudLoggingUrl } from '../data/cloud-logging.ts'
import { VStack, HStack, Heading, Text, Button, Banner, PageHeader, Loaded, Empty, Message, Token } from '../shared/ui.tsx'
import { useCan } from '../auth/access.ts'

const menuItems = [
  { href: '/reservations', group: '학위복 운영', title: '예약 관리', description: '예약 조회·검색·수정·취소와 수동 예약 추가', viewDescription: '회차별 예약 조회·검색과 선택 CSV 내보내기', permission: 'reservation.write', icon: 'calendar', variant: 'blue', primary: true },
  { href: '/reservations/settings', group: '학위복 운영', title: '접수 설정', description: '운영 회차와 신청 기간, 날짜별 대여 시간표 설정', viewDescription: '운영 회차와 신청 기간, 날짜별 대여 시간표 확인', permission: 'settings.write', icon: 'wrench', variant: 'cyan', primary: false },
  { href: '/mentoring', group: 'St:talk 운영', title: '신청 현황', description: '선택지별 인원, 명단 검색, 수동 추가·변경·취소와 xlsx·csv 내려받기', viewDescription: '선택지별 인원과 명단 확인, xlsx·csv 내려받기', permission: 'mentoring.write', icon: 'calendar', variant: 'blue', primary: false },
  { href: '/mentoring/settings', group: 'St:talk 운영', title: '행사 설정', description: '행사 ID·접수·신청 기간, 차시 시간, 멘토 선택지와 안내 문구 설정', viewDescription: '행사 ID·접수·신청 기간, 차시 시간, 멘토 선택지와 안내 문구 확인', permission: 'settings.write', icon: 'wrench', variant: 'default', primary: false },
  { href: '/announcements', group: '안내 콘텐츠', title: '공지사항', description: '학생에게 노출되는 공지 작성·편집과 이미지 관리', viewDescription: '학생에게 노출되는 공지 내용 확인', permission: 'content.write', icon: 'info', variant: 'default', primary: false },
  { href: '/faq', group: '안내 콘텐츠', title: '자주 묻는 질문', description: 'FAQ 작성·편집과 노출 순서 관리', viewDescription: 'FAQ 내용과 노출 순서 확인', permission: 'content.write', icon: 'checkDouble', variant: 'default', primary: false },
  { href: '/users', group: '운영 추적', title: 'UID 검색', description: 'Auth 계정·사용자 문서·최근 예약을 UID로 정확히 확인', icon: 'search', variant: 'cyan', primary: false },
  { href: '/logs', group: '운영 추적', title: '감사 로그', description: '예약·St:talk·설정 작업의 요청 거부·서버 실패·결과 불명을 operationId로 추적', icon: 'clock', variant: 'orange', primary: false },
] as const

export function OverviewPage({ api }: { api: AdminApi }) {
  const data = useLoad(useCallback(() => api.getSettings(), [api])), navigate = useNavigate(), can = useCan()
  return <VStack gap={8}><PageHeader title="관리할 업무를 선택하세요" description="학위복 예약·St:talk 운영과 학생 안내에 필요한 메뉴를 선택해 바로 시작하세요." />
    <Grid gap={4} className="grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {menuItems.map(item => <ClickableCard key={item.href} label={`${item.title} 열기`} onClick={() => navigate(item.href)} padding={6} variant={item.variant} elevation={item.primary ? 'med' : 'low'} className="min-h-44">
        <VStack gap={5} height="100%" justify="between">
          <VStack gap={3}><HStack gap={2} align="center"><Icon icon={item.icon} size="lg" color={item.primary ? 'accent' : 'secondary'} /><Text type="supporting" weight="semibold">{item.group}</Text></HStack><Heading level={2}>{item.title}</Heading><Text color="secondary">{'permission' in item && !can(item.permission) ? item.viewDescription : item.description}</Text></VStack>
          <HStack gap={1} align="center"><Text weight="semibold" color="accent">메뉴 열기</Text><Icon icon="chevronRight" color="accent" /></HStack>
        </VStack>
      </ClickableCard>)}
    </Grid>
    <HStack justify="between" align="center" wrap="wrap"><VStack gap={1}><Heading level={2}>현재 운영 상태</Heading><Text type="supporting">메뉴에 들어가기 전 접수 상태를 간단히 확인하세요.</Text></VStack><Button label="운영 상태 새로고침" onClick={data.refresh} /></HStack>
    <Loaded state={data.state} retry={data.refresh}>{settings => settings ? <VStack gap={4} className="grid md:grid-cols-3">
      <Card padding={5}><VStack gap={3}><Text type="supporting">운영 회차</Text><Heading level={2}>{settings.periodId}</Heading><Text type="supporting">설정된 현재 회차</Text></VStack></Card>
      <Card padding={5}><VStack gap={3}><Text type="supporting">학생 일반 접수</Text><Heading level={2}>{settings.isOpen && Date.now() > Date.parse(settings.createPeriod.startsAt) && Date.now() < Date.parse(settings.createPeriod.endsAt) ? '접수 중' : '접수 닫힘'}</Heading><Text type="supporting">스위치와 신청 기간 기준 · 테스터 예외 별도</Text></VStack></Card>
      <Card padding={5}><VStack gap={3}><Text type="supporting">활성 대여 슬롯</Text><Heading level={2}>{Object.values(settings.slotsByDate).reduce((n, g) => n + g.slots.filter(s => s.enabled).length, 0)}개</Heading><Text type="supporting">재고·정원과 무관한 시간표</Text></VStack></Card>
    </VStack> : <Empty title="운영할 회차를 준비해 주세요" detail="접수 설정에서 회차, 기간, 시간표를 등록할 수 있습니다." />}</Loaded>
    <Text type="supporting">예약 전체 집계·메일 발송 이력은 아직 연결하지 않았습니다. 확인할 수 없는 숫자를 0으로 표시하지 않습니다.</Text>
  </VStack>
}
export function UsersPage({ api }: { api: AdminApi }) {
  const [uid, setUid] = useState('')
  const [result, setResult] = useState<UserLookup | null>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lookup = async () => {
    const value = uid.trim()
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) { setError('Firebase Auth UID를 정확히 입력해 주세요.'); setResult(undefined); return }
    setBusy(true); setError(''); setResult(undefined)
    try { setResult(await api.getUser(value)) } catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }
  return <VStack gap={6}>
    <PageHeader title="UID로 사용자 찾기" description="수동 예약과 장애 확인에 사용할 사용자를 Firebase Auth UID로 정확히 조회합니다." />
    <Card padding={5} elevation="low"><VStack gap={4}>
      <HStack gap={3} align="end" wrap="wrap"><TextInput label="Firebase Auth UID" description="이메일이나 이름이 아닌 전체 UID를 입력하세요." value={uid} onChange={setUid} placeholder="UID 붙여넣기" hasClear width="min(100%, var(--admin-editor-width))" isLoading={busy} /><Button label="UID 조회" variant="primary" onClick={lookup} isLoading={busy} /></HStack>
      <Text type="supporting">Auth 계정, users 문서, 최근 학위복 예약을 서버에서 함께 확인합니다. 역할 변경 기능은 제공하지 않습니다.</Text>
    </VStack></Card>
    {error && <Message error>{error}</Message>}
    {result === null && <Empty title="일치하는 사용자가 없습니다" detail="Auth 계정·users 문서·예약 하위 컬렉션 어디에서도 이 UID를 찾지 못했습니다." />}
    {result && <UserLookupResult user={result} />}
  </VStack>
}

function UserLookupResult({ user }: { user: UserLookup }) {
  return <VStack gap={5} aria-live="polite">
    <HStack gap={2} align="center" wrap="wrap"><Heading level={2}>조회 결과</Heading><Token label={user.disabled ? 'Auth 비활성' : user.authExists ? 'Auth 확인' : 'Auth 없음'} color={user.disabled || !user.authExists ? 'orange' : 'blue'} size="sm" /><Token label={user.profileExists ? 'users 문서 확인' : 'users 문서 없음'} color={user.profileExists ? 'gray' : 'orange'} size="sm" /></HStack>
    <Grid gap={4} className="grid-cols-1 md:grid-cols-2">
      <Card padding={5}><VStack gap={3}><Text type="supporting">UID</Text><Text type="code" className="break-all">{user.uid}</Text><Text type="supporting">감사 로그에서 이 값을 검색하면 같은 사용자의 요청을 모아볼 수 있습니다.</Text></VStack></Card>
      <Card padding={5}><VStack gap={3}><Text type="supporting">계정 정보</Text><Heading level={3}>{user.email || '이메일 확인 필요'}</Heading><Text type="supporting">이메일 인증 {user.emailVerified ? '완료' : '미확인'} · 저장 역할 {user.role || '없음'}</Text><Text type="supporting">최근 로그인 {displayDate(user.lastLogin)} · 생성 {displayDate(user.createdAt)}</Text></VStack></Card>
    </Grid>
    <VStack gap={3}><Heading level={2}>최근 학위복 예약</Heading>{user.reservations.length ? <List hasDividers>{user.reservations.map(reservation => <ListItem key={reservation.reservationId} label={`${reservation.periodId || '회차 확인 필요'} · ${reservation.status || '상태 확인 필요'}`} description={<VStack gap={1}><Text type="code" className="break-all">{reservation.reservationId}</Text><Text type="supporting">수정 {displayDate(reservation.modifiedAt)} · 생성 {displayDate(reservation.createdAt)}</Text></VStack>} />)}</List> : <Empty detail="이 UID 아래에 학위복 예약이 없습니다." />}</VStack>
  </VStack>
}

const outcomeLabels: Record<AuditRow['outcome'], string> = { received: '처리 중/결과 불명', succeeded: '성공', rejected: '요청 거부', failed: '서버 실패', unknown: '분류 확인 필요' }
const actionLabels: Record<string, string> = { 'reservation.create': '예약 생성', 'reservation.update': '예약 변경', 'reservation.cancel': '예약 취소', 'reservation.delete': '예약 삭제', 'settings.save': '접수 설정 저장', 'testing.save': '테스트 설정 저장', 'content.save': '콘텐츠 저장', 'content.delete': '콘텐츠 삭제', 'mentoring.create': 'St:talk 신청', 'mentoring.update': 'St:talk 신청 변경', 'mentoring.cancel': 'St:talk 신청 취소', 'mentoring.delete': 'St:talk 신청 삭제', 'mentoring.settings.save': 'St:talk 행사 설정 저장', 'members.add': '관리자 등록', 'members.remove': '관리자 해제' }
const failureKindLabels: Record<string, string> = { authentication: '인증 실패', authorization: '권한 거부', validation: '입력 오류', 'business-rule': '운영 조건 불일치', 'not-found': '대상 없음', duplicate: '중복 요청', conflict: '변경 충돌', infrastructure: '인프라 장애', internal: '서버 내부 오류' }
const stageLabels: Record<string, string> = { 'request-received': '요청 수신', authentication: '인증', 'request-validation': '요청 검증', transaction: '저장 트랜잭션', completed: '처리 완료' }
function auditStatus(log: AuditRow) {
  if (log.outcome === 'succeeded') return { variant: 'success' as const, label: outcomeLabels.succeeded }
  if (log.outcome === 'rejected') return { variant: 'warning' as const, label: outcomeLabels.rejected }
  if (log.outcome === 'failed') return { variant: 'error' as const, label: outcomeLabels.failed }
  if (log.outcome === 'received') {
    const pending = Number.isFinite(Date.parse(log.updatedAt)) && Date.now() - Date.parse(log.updatedAt) < 120000
    return { variant: pending ? 'accent' as const : 'warning' as const, label: pending ? '처리 중' : '결과 불명', pending }
  }
  return { variant: 'neutral' as const, label: outcomeLabels.unknown }
}
export function LogsPage({ api, projectId }: { api: AdminApi; projectId: string }) {
  const [view, setView] = useState('audit')
  const { state, refresh } = useLoad(useCallback(() => api.listAudit(), [api]))
  return <VStack gap={6}><PageHeader title="감사 로그" description="예약·St:talk·설정 작업 결과와 Firebase 함수 실행 상태를 UID와 요청 추적 ID로 확인합니다." />
    <TabList value={view} onChange={setView} hasDivider layout="fill"><Tab value="audit" label="작업 감사" /><Tab value="functions" label="서버 로그" /></TabList>
    {view === 'audit' ? <><Message>함수의 감사 처리를 시작한 요청을 한 작업당 한 건으로 정리합니다. 인증·플랫폼 단계에서 거부된 요청은 서버 로그에서 확인하세요.</Message><Loaded state={state} retry={refresh}>{logs => <AuditWorkspace logs={logs} refresh={refresh} />}</Loaded></> : <FunctionLogsWorkspace api={api} projectId={projectId} />}
  </VStack>
}

function AuditWorkspace({ logs, refresh }: { logs: AuditRow[]; refresh: () => void }) {
  const [outcome, setOutcome] = useState('attention')
  const [source, setSource] = useState('all')
  const [domain, setDomain] = useState('all')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim().toLowerCase())
  const counts = useMemo(() => ({
    request: logs.filter(log => log.failureSource === 'request').length,
    server: logs.filter(log => log.failureSource === 'server').length,
    unknown: logs.filter(log => log.outcome === 'received' || !log.resultKnown).length,
    success: logs.filter(log => log.outcome === 'succeeded').length,
  }), [logs])
  const filtered = useMemo(() => logs.filter(log => {
    const matchesOutcome = outcome === 'all' || outcome === log.outcome || (outcome === 'attention' && (log.outcome === 'rejected' || log.outcome === 'failed' || log.outcome === 'received' || log.outcome === 'unknown'))
    const matchesSource = source === 'all' || source === log.failureSource || source === log.origin
    const matchesDomain = domain === 'all' || log.domain === domain
    const values = [log.operationId, log.actorUid, log.targetUserId, log.reservationId, log.registrationId, log.action, log.errorCode, log.message]
    return matchesOutcome && matchesSource && matchesDomain && (!deferredSearch || values.some(value => value.toLowerCase().includes(deferredSearch)))
  }), [logs, outcome, source, domain, deferredSearch])
  return <VStack gap={5}>
    <Grid gap={3} className="grid-cols-2 xl:grid-cols-4">
      <Card padding={4}><VStack gap={2}><Text type="supporting">요청 거부</Text><Heading level={2}>{counts.request}건</Heading><Text type="supporting">검증·권한·충돌</Text></VStack></Card>
      <Card padding={4}><VStack gap={2}><Text type="supporting">서버 실패</Text><Heading level={2}>{counts.server}건</Heading><Text type="supporting">내부·인프라 오류</Text></VStack></Card>
      <Card padding={4}><VStack gap={2}><Text type="supporting">결과 불명</Text><Heading level={2}>{counts.unknown}건</Heading><Text type="supporting">수동 확인 우선</Text></VStack></Card>
      <Card padding={4}><VStack gap={2}><Text type="supporting">성공</Text><Heading level={2}>{counts.success}건</Heading><Text type="supporting">저장과 로그 동시 확정</Text></VStack></Card>
    </Grid>
    <HStack gap={3} align="end" wrap="wrap"><TextInput label="UID 또는 요청 추적 ID" value={search} onChange={setSearch} placeholder="UID, operationId, 예약·신청 ID, 오류 코드" hasClear width="min(100%, var(--admin-editor-width))" /><Selector label="업무" value={domain} onChange={setDomain} options={[{ value: 'all', label: '전체 업무' }, { value: 'reservation', label: '학위복 예약' }, { value: 'mentoring', label: 'St:talk' }, { value: 'settings', label: '접수 설정' }, { value: 'testing', label: '테스터' }, { value: 'content', label: '콘텐츠' }, { value: 'members', label: '관리자' }]} /><Selector label="처리 결과" value={outcome} onChange={setOutcome} options={[{ value: 'attention', label: '확인 필요만' }, { value: 'all', label: '전체 결과' }, { value: 'rejected', label: '요청 거부' }, { value: 'failed', label: '서버 실패' }, { value: 'received', label: '처리 중/결과 불명' }, { value: 'succeeded', label: '성공' }]} /><Selector label="실패 위치·호출 주체" value={source} onChange={setSource} options={[{ value: 'all', label: '전체 위치' }, { value: 'request', label: '요청 문제' }, { value: 'server', label: '서버 문제' }, { value: 'student-web', label: '학생 예약' }, { value: 'admin-console', label: '관리자 작업' }]} /><Button label="감사 로그 새로고침" onClick={refresh} /></HStack>
    <Text type="supporting">최근 200건 안에서 검색·필터 · 개인정보 입력값은 저장하지 않고 UID·예약 ID·오류 분류만 기록</Text>
    {!filtered.length ? <Empty detail={logs.length ? '검색어나 필터를 바꿔 보세요.' : '함수에 도달해 기록된 작업이 아직 없습니다. Cloud Logging의 플랫폼 거부 기록은 별도로 확인하세요.'} /> : <List hasDividers header={<Text type="supporting">조건에 맞는 로그 {filtered.length}건</Text>}>{filtered.map(log => {
      const status = auditStatus(log)
      return <ListItem key={log.id} label={`${actionLabels[log.action] || log.action} · ${status.label}`} startContent={<StatusDot variant={status.variant} label={status.label} isPulsing={'pending' in status && status.pending === true} />} description={<VStack gap={2}>
        <HStack gap={2} wrap="wrap"><Token label={log.failureSource === 'request' ? '요청 문제' : log.failureSource === 'server' ? '서버 문제' : log.origin === 'student-web' ? '학생 요청' : '관리자 작업'} color={log.failureSource === 'server' ? 'red' : log.failureSource === 'request' ? 'orange' : 'gray'} size="sm" />{log.failureKind && <Token label={failureKindLabels[log.failureKind] || log.failureKind} color={log.failureSource === 'server' ? 'red' : 'orange'} size="sm" />}<Token label={`단계 ${stageLabels[log.stage] || log.stage || '확인 필요'}`} color="gray" size="sm" />{!log.resultKnown && <Token label="결과 불명" color="orange" size="sm" />}{log.retryable && <Token label="재시도 가능" color="blue" size="sm" />}</HStack>
        {log.message && <Text>{log.message}</Text>}
        <Text type="code" className="break-all">operationId {log.operationId}</Text>
        <Text type="supporting" className="break-all">UID {log.actorUid || '확인 불가'}{log.reservationId ? ` · 예약 ${log.reservationId}` : ''}{log.registrationId ? ` · St:talk 신청 ${log.registrationId}` : ''}{log.eventId ? ` · 행사 ${log.eventId}` : ''}{log.errorCode ? ` · ${log.errorCode}` : ''}</Text>
        {log.target && <Text type="supporting" className="break-all">{log.target}</Text>}
        <Text type="supporting">{displayDate(log.createdAt)}{log.durationMs !== null ? ` · ${log.durationMs}ms` : ''}</Text>
      </VStack>} />
    })}</List>}
  </VStack>
}

function functionLogStatus(log: FunctionLogRow) {
  if (log.outcome === 'succeeded') return { variant: 'success' as const, label: '성공' }
  if (log.outcome === 'rejected') return { variant: 'warning' as const, label: '요청 거부' }
  if (log.outcome === 'failed') return { variant: 'error' as const, label: '실패' }
  return { variant: 'neutral' as const, label: '시스템 기록' }
}

function FunctionLogsWorkspace({ api, projectId }: { api: AdminApi; projectId: string }) {
  const [hours, setHours] = useState('6')
  const [severity, setSeverity] = useState('all')
  const [search, setSearch] = useState('')
  const [searchError, setSearchError] = useState('')
  const [filter, setFilter] = useState<FunctionLogFilter>({ hours: 6, severity: 'all', search: '' })
  const { state, refresh } = useLoad(useCallback(() => api.listFunctionLogs(filter), [api, filter]))
  const apply = () => {
    const exact = search.trim()
    if (exact && !/^[A-Za-z0-9_-]{1,128}$/.test(exact)) { setSearchError('UID, operation ID, 예약 ID 또는 execution ID 전체 값을 입력해 주세요.'); return }
    setSearchError('')
    const next = { hours: Number(hours) as FunctionLogFilter['hours'], severity: severity as FunctionLogFilter['severity'], search: exact }
    if (next.hours === filter.hours && next.severity === filter.severity && next.search === filter.search) refresh()
    else setFilter(next)
  }
  return <VStack gap={5}>
    <Banner status="info" title="Cloud Logging에서 필요한 예약 함수 기록만 실시간으로 조회합니다." description="로그를 Firestore에 복사하지 않으며 원본 요청 본문·인증 토큰·스택은 이 화면에 반환하지 않습니다." endContent={<Link href={reservationCloudLoggingUrl(projectId)} isExternalLink isStandalone newTabLabel="(새 탭에서 열림)">Logs Explorer에서 원본 열기</Link>} />
    <HStack gap={3} align="end" wrap="wrap"><TextInput label="정확한 UID 또는 추적 ID" value={search} onChange={setSearch} placeholder="UID, operationId, 예약 ID, execution ID" hasClear width="min(100%, var(--admin-editor-width))" /><Selector label="조회 기간" value={hours} onChange={setHours} options={[{ value: '1', label: '최근 1시간' }, { value: '6', label: '최근 6시간' }, { value: '24', label: '최근 24시간' }]} /><Selector label="심각도" value={severity} onChange={setSeverity} options={[{ value: 'all', label: '전체 결과' }, { value: 'warning', label: '경고 이상' }, { value: 'error', label: '오류 이상' }]} /><Button label="서버 로그 조회" variant="primary" onClick={apply} /></HStack>
    {searchError && <Message error>{searchError}</Message>}
    <Loaded state={state} retry={refresh}>{page => page.unavailableReason ? <Empty title="이 환경에서는 조회할 수 없습니다" detail={page.unavailableReason} /> : <FunctionLogResults rows={page.rows} filter={filter} />}</Loaded>
  </VStack>
}

function FunctionLogResults({ rows, filter }: { rows: FunctionLogRow[]; filter: FunctionLogFilter }) {
  const counts = useMemo(() => ({
    failed: rows.filter(row => row.outcome === 'failed').length,
    rejected: rows.filter(row => row.outcome === 'rejected').length,
    succeeded: rows.filter(row => row.outcome === 'succeeded').length,
    platform: rows.filter(row => row.failureSource === 'platform').length,
  }), [rows])
  return <VStack gap={4}>
    <Grid gap={3} className="grid-cols-2 xl:grid-cols-4">
      <Card padding={4}><VStack gap={2}><Text type="supporting">서버 실패</Text><Heading level={2}>{counts.failed}건</Heading></VStack></Card>
      <Card padding={4}><VStack gap={2}><Text type="supporting">요청 거부</Text><Heading level={2}>{counts.rejected}건</Heading></VStack></Card>
      <Card padding={4}><VStack gap={2}><Text type="supporting">성공</Text><Heading level={2}>{counts.succeeded}건</Heading></VStack></Card>
      <Card padding={4}><VStack gap={2}><Text type="supporting">플랫폼 단계</Text><Heading level={2}>{counts.platform}건</Heading></VStack></Card>
    </Grid>
    <Text type="supporting">최근 {filter.hours}시간 · 최대 100건 · {filter.search ? `정확한 ID ${filter.search}` : '전체 UID'} · Cloud Logging 원본은 별도 저장하지 않음</Text>
    {!rows.length ? <Empty detail="조건에 맞는 예약 함수 로그가 없습니다. 기간이나 심각도 필터를 바꿔 보세요." /> : <List hasDividers header={<Text type="supporting">Cloud Functions 로그 {rows.length}건</Text>}>{rows.map(log => {
      const status = functionLogStatus(log)
      const source = log.failureSource === 'platform' ? 'Firebase 플랫폼' : log.failureSource === 'server' ? '서버 처리' : log.failureSource === 'request' ? '요청 검증' : '예약 함수'
      return <ListItem key={log.id} label={`${actionLabels[log.action] || log.functionName || '플랫폼 요청'} · ${status.label}`} startContent={<StatusDot variant={status.variant} label={status.label} />} description={<VStack gap={2}>
        <HStack gap={2} wrap="wrap"><Token label={source} color={log.failureSource === 'server' ? 'red' : log.failureSource === 'platform' || log.failureSource === 'request' ? 'orange' : 'gray'} size="sm" /><Token label={log.severity.toUpperCase()} color={log.severity === 'error' || log.severity === 'critical' ? 'red' : log.severity === 'warning' ? 'orange' : 'gray'} size="sm" />{log.stage && <Token label={`단계 ${stageLabels[log.stage] || log.stage}`} color="gray" size="sm" />}{log.httpStatus && <Token label={`HTTP ${log.httpStatus}`} color={log.httpStatus >= 500 ? 'red' : log.httpStatus >= 400 ? 'orange' : 'gray'} size="sm" />}</HStack>
        <Text>{log.message}</Text>
        {log.operationId && <Text type="code" className="break-all">operationId {log.operationId}</Text>}
        <Text type="supporting" className="break-all">요청 UID {log.actorUid || '플랫폼 단계에서 확인 불가'}{log.targetUserId && log.targetUserId !== log.actorUid ? ` · 대상 UID ${log.targetUserId}` : ''}{log.reservationId ? ` · 예약 ${log.reservationId}` : ''}{log.errorCode ? ` · ${log.errorCode}` : ''}</Text>
        <Text type="supporting" className="break-all">{log.functionName || '함수명 확인 불가'}{log.executionId ? ` · execution ${log.executionId}` : ''}</Text>
        <Text type="supporting">{displayDate(log.timestamp)}</Text>
      </VStack>} />
    })}</List>}
  </VStack>
}
