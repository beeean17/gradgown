import { useCallback } from 'react'
import { List, ListItem } from '@astryxdesign/core/List'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import type { AdminApi, GownPeriod, GownSlot } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { displayDateTime, seoulClock, seoulDay } from '../data/format.ts'
import { VStack, Heading, Text, PageHeader, Loaded, Empty, Message, Token, OpenToken } from '../shared/ui.tsx'
import { OpenSwitch } from '../presentation/OpenSwitch.tsx'
import { useCan } from '../auth/access.ts'

// Read-only but for one switch: a master opens or closes applications
// (docs/decisions/scope.md "관리자 쓰기"). The period, its windows and its timetable come from the seed data.
export function SettingsPage({ api }: { api: AdminApi }) {
  const settings = useLoad(useCallback(async () => { const period = await api.getPeriod(); return period && { period, slots: await api.listSlots(period.periodId) } }, [api]))
  const canOpen = useCan()('applications.open')
  return <VStack gap={6}><PageHeader title="접수 설정" description="현재 회차와 신청·수정 기간, 날짜별 시간표를 확인합니다." />
    <Message>{canOpen ? '이 화면에서 바꿀 수 있는 것은 학생 접수 열기·닫기입니다. 회차, 기간, 시간표는 조회만 합니다.' : '접수 열기·닫기는 마스터 관리자만 할 수 있습니다.'}</Message>
    <Loaded state={settings.state} retry={settings.refresh}>{value => value ? <PeriodSettings api={api} period={value.period} slots={value.slots} canOpen={canOpen} changed={settings.refresh} /> : <Empty title="접수 설정이 없습니다" detail="현재 회차로 지정된 회차가 없습니다." />}</Loaded>
  </VStack>
}
function PeriodSettings({ api, period, slots, canOpen, changed }: { api: AdminApi; period: GownPeriod; slots: GownSlot[]; canOpen: boolean; changed: () => void }) {
  return <VStack gap={5} maxWidth="var(--admin-content-width)">
    <MetadataList>
      <MetadataListItem label="현재 회차">{period.periodId}</MetadataListItem>
      <MetadataListItem label="학생 접수"><OpenToken isOpen={period.isOpen} /></MetadataListItem>
      <MetadataListItem label="신청 기간">{displayDateTime(period.applyStartAt)} — {displayDateTime(period.applyEndAt)}</MetadataListItem>
      <MetadataListItem label="수정 기간">{displayDateTime(period.editStartAt)} — {displayDateTime(period.editEndAt)}</MetadataListItem>
    </MetadataList>
    {canOpen && <OpenSwitch subject={`${period.periodId} 회차`} isOpen={period.isOpen} save={async isOpen => { await api.setPeriodOpen(period.periodId, isOpen); changed() }} />}
    <Text type="supporting">한국 시간 (Asia/Seoul). 학생의 수정은 신청 기간 또는 수정 기간에 허용됩니다. 시작·종료 시각과 정확히 같은 순간은 제외됩니다.</Text>
    <Heading level={2}>대여 시간표</Heading><Text color="secondary">슬롯은 선택 가능한 시간이며 재고나 정원을 의미하지 않습니다.</Text>
    {slots.length ? <List hasDividers header={<Text type="supporting">등록된 시간표 {slots.length}개</Text>}>{slots.map(slot => <ListItem key={slot.slotId} label={`${seoulDay(slot.startsAt)} · ${seoulClock(slot.startsAt)}–${seoulClock(slot.endsAt)}`} endContent={<Token label={slot.enabled ? '사용' : '사용 안 함'} size="sm" color={slot.enabled ? 'blue' : 'gray'} />} />)}</List> : <Empty detail="이 회차에 등록된 시간표가 없습니다." />}
  </VStack>
}
