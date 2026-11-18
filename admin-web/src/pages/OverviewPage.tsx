import { useCallback, useState } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { Grid } from '@astryxdesign/core/Grid'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Selector } from '@astryxdesign/core/Selector'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { useNavigate } from 'react-router-dom'
import type { AdminApi, AuditQuery, AuditRow } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { useCursor } from '../hooks/useCursor.ts'
import { displayDate } from '../data/format.ts'
import { VStack, HStack, Heading, Text, Button, PageHeader, Loaded, Empty, Message, Token, Pager } from '../shared/ui.tsx'
import { useCan } from '../auth/access.ts'

const menuItems = [
  { href: '/reservations', group: '학위복 운영', title: '예약 관리', description: '회차별 예약 조회와 이름·학번·연락처 검색', icon: 'calendar', variant: 'blue', primary: true },
  { href: '/reservations/settings', group: '학위복 운영', title: '접수 설정', description: '운영 회차와 신청 기간, 날짜별 대여 시간표 확인, 접수 열기·닫기', viewDescription: '운영 회차와 신청 기간, 날짜별 대여 시간표 확인', permission: 'applications.open', icon: 'wrench', variant: 'cyan', primary: false },
  { href: '/mentoring', group: 'St:talk 운영', title: '신청 현황', description: '선택지별 인원과 명단 확인, 이름·학번·전화번호 검색', icon: 'calendar', variant: 'blue', primary: false },
  { href: '/mentoring/settings', group: 'St:talk 운영', title: '행사 설정', description: '행사 ID·접수·신청 기간, 차시 시간, 멘토 선택지와 안내 문구 확인, 접수 열기·닫기', viewDescription: '행사 ID·접수·신청 기간, 차시 시간, 멘토 선택지와 안내 문구 확인', permission: 'applications.open', icon: 'wrench', variant: 'default', primary: false },
  { href: '/announcements', group: '안내 콘텐츠', title: '공지사항', description: '학생에게 노출되는 공지 내용 확인', icon: 'info', variant: 'default', primary: false },
  { href: '/faq', group: '안내 콘텐츠', title: '자주 묻는 질문', description: 'FAQ 내용과 노출 순서 확인', icon: 'checkDouble', variant: 'default', primary: false },
  { href: '/logs', group: '운영 추적', title: '감사 로그', description: '학생의 예약·St:talk 신청 요청의 성공·거부·서버 실패를 operationId로 추적', icon: 'clock', variant: 'orange', primary: false },
] as const

export function OverviewPage({ api }: { api: AdminApi }) {
  const data = useLoad(useCallback(async () => { const period = await api.getPeriod(); return period && { period, slots: await api.listSlots(period.periodId) } }, [api])), navigate = useNavigate(), can = useCan()
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
    <Loaded state={data.state} retry={data.refresh}>{value => value ? <VStack gap={4} className="grid md:grid-cols-3">
      <Card padding={5}><VStack gap={3}><Text type="supporting">운영 회차</Text><Heading level={2}>{value.period.periodId}</Heading><Text type="supporting">설정된 현재 회차</Text></VStack></Card>
      <Card padding={5}><VStack gap={3}><Text type="supporting">학생 일반 접수</Text><Heading level={2}>{value.period.isOpen && Date.now() > Date.parse(value.period.applyStartAt) && Date.now() < Date.parse(value.period.applyEndAt) ? '접수 중' : '접수 닫힘'}</Heading><Text type="supporting">스위치와 신청 기간 기준</Text></VStack></Card>
      <Card padding={5}><VStack gap={3}><Text type="supporting">활성 대여 슬롯</Text><Heading level={2}>{value.slots.filter(slot => slot.enabled).length}개</Heading><Text type="supporting">재고·정원과 무관한 시간표</Text></VStack></Card>
    </VStack> : <Empty title="운영할 회차가 없습니다" detail="현재 회차로 지정된 회차가 없습니다." />}</Loaded>
  </VStack>
}

const outcomeLabels: Record<AuditRow['outcome'], string> = { received: '처리 중/결과 불명', succeeded: '성공', rejected: '요청 거부', failed: '서버 실패' }
const actionLabels: Record<string, string> = { 'reservation.create': '예약 생성', 'reservation.update': '예약 변경', 'reservation.cancel': '예약 취소', 'mentoring.create': 'St:talk 신청', 'mentoring.update': 'St:talk 신청 변경', 'mentoring.cancel': 'St:talk 신청 취소' }
const failureKindLabels: Record<string, string> = { authentication: '인증 실패', authorization: '권한 거부', validation: '입력 오류', 'business-rule': '운영 조건 불일치', 'not-found': '대상 없음', duplicate: '중복 요청', conflict: '변경 충돌', infrastructure: '인프라 장애', internal: '서버 내부 오류' }
function auditStatus(log: AuditRow) {
  if (log.outcome === 'succeeded') return { variant: 'success' as const, label: outcomeLabels.succeeded }
  if (log.outcome === 'rejected') return { variant: 'warning' as const, label: outcomeLabels.rejected }
  if (log.outcome === 'failed') return { variant: 'error' as const, label: outcomeLabels.failed }
  // A command whose result was never recorded counts as failed after two minutes (docs/contracts/web-api.md).
  const pending = Number.isFinite(Date.parse(log.createdAt)) && Date.now() - Date.parse(log.createdAt) < 120000
  return { variant: pending ? 'accent' as const : 'warning' as const, label: pending ? '처리 중' : '결과 불명', pending }
}
// The server filters by 업무 and 처리 결과 and pages by cursor, over the whole log; the original
// read the latest 200 documents and searched them in the browser (docs/decisions/evaluation.md, A5).
export function LogsPage({ api }: { api: AdminApi }) {
  const [domain, setDomain] = useState<AuditQuery['domain']>('all'), [outcome, setOutcome] = useState<AuditQuery['outcome']>('all')
  const { cursor, page, first, next } = useCursor(JSON.stringify([domain, outcome]))
  const { state, refresh } = useLoad(useCallback(() => api.listAudit({ domain, outcome, cursor }), [api, domain, outcome, cursor]))
  return <VStack gap={6}><PageHeader title="감사 로그" description="학생의 예약·St:talk 신청 요청과 그 결과를 사용자와 요청 추적 ID로 확인합니다." />
    <Message>학생용 서버가 받은 요청을 한 작업당 한 건으로 기록합니다. 접수 열기·닫기는 기록하지 않습니다.</Message>
    <HStack gap={3} align="end" wrap="wrap"><Selector label="업무" value={domain} onChange={value => setDomain(value as AuditQuery['domain'])} options={[{ value: 'all', label: '전체 업무' }, { value: 'reservation', label: '학위복 예약' }, { value: 'mentoring', label: 'St:talk' }]} /><Selector label="처리 결과" value={outcome} onChange={value => setOutcome(value as AuditQuery['outcome'])} options={[{ value: 'all', label: '전체 결과' }, { value: 'rejected', label: '요청 거부' }, { value: 'failed', label: '서버 실패' }, { value: 'received', label: '처리 중/결과 불명' }, { value: 'succeeded', label: '성공' }]} /><Button label="감사 로그 새로고침" onClick={refresh} /></HStack>
    <Text type="supporting">페이지당 최대 50건 · 업무와 처리 결과 필터는 전체 로그에 적용 · 개인정보 입력값은 저장하지 않고 사용자·대상 ID·오류 분류만 기록</Text>
    <Loaded state={state} retry={refresh}>{data => <VStack gap={3}>
      {!data.items.length ? <Empty detail={domain !== 'all' || outcome !== 'all' ? '필터를 바꿔 보세요.' : '기록된 작업이 아직 없습니다.'} /> : <List hasDividers header={<Text type="supporting">현재 페이지 {data.items.length}건</Text>}>{data.items.map(log => {
        const status = auditStatus(log)
        return <ListItem key={log.operationId} label={`${actionLabels[log.action] || log.action} · ${status.label}`} startContent={<StatusDot variant={status.variant} label={status.label} isPulsing={'pending' in status && status.pending === true} />} description={<VStack gap={2}>
          {(log.failureKind || log.errorCode) && <HStack gap={2} wrap="wrap">{log.failureKind && <Token label={failureKindLabels[log.failureKind] || log.failureKind} color={log.outcome === 'failed' ? 'red' : 'orange'} size="sm" />}{log.errorCode && <Token label={log.errorCode} color="gray" size="sm" />}</HStack>}
          <Text type="code" className="break-all">operationId {log.operationId}</Text>
          <Text type="supporting" className="break-all">사용자 {log.actorId} · {log.actorEmail}{log.targetId ? ` · ${log.domain === 'mentoring' ? 'St:talk 신청' : '예약'} ${log.targetId}` : ''}</Text>
          <Text type="supporting">{displayDate(log.createdAt)}{log.completedAt ? ` · 완료 ${displayDate(log.completedAt)}` : ''}</Text>
        </VStack>} />
      })}</List>}
      <Pager page={page} nextCursor={data.nextCursor} first={first} next={next} />
    </VStack>}</Loaded>
  </VStack>
}
