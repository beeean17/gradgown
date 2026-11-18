import { useCallback } from 'react'
import { List, ListItem } from '@astryxdesign/core/List'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { MENTORING_OPTION_COUNT, type AdminApi, type MentoringEvent } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { displayDateTime, seoulClock, seoulDay } from '../data/format.ts'
import { NONE_LABEL } from '../data/mentoring.ts'
import { VStack, Heading, Text, PageHeader, Loaded, Empty, Message, Token, OpenToken } from '../shared/ui.tsx'
import { OpenSwitch } from '../presentation/OpenSwitch.tsx'
import { useCan } from '../auth/access.ts'

// Read-only but for one switch: a master opens or closes applications, and opening needs
// all seven option names (MNT-51; docs/decisions/scope.md "관리자 쓰기").
export function MentoringSettingsPage({ api }: { api: AdminApi }) {
  const event = useLoad(useCallback(() => api.getEvent(), [api]))
  const canOpen = useCan()('applications.open')
  return <VStack gap={6}><PageHeader title="St:talk 행사 설정" description="현재 행사와 신청 기간, 차시 시간, 멘토 선택지, 학생 안내 문구를 확인합니다." />
    <Message>{canOpen ? '이 화면에서 바꿀 수 있는 것은 학생 접수 열기·닫기입니다. 행사, 기간, 선택지, 안내 문구는 조회만 합니다.' : '접수 열기·닫기는 마스터 관리자만 할 수 있습니다.'}</Message>
    <Loaded state={event.state} retry={event.refresh}>{value => value ? <EventSettings api={api} event={value} canOpen={canOpen} changed={event.refresh} /> : <Empty title="행사 설정이 없습니다" detail="현재 행사로 지정된 행사가 없습니다." />}</Loaded>
  </VStack>
}

function EventSettings({ api, event, canOpen, changed }: { api: AdminApi; event: MentoringEvent; canOpen: boolean; changed: () => void }) {
  return <VStack gap={5} maxWidth="var(--admin-content-width)">
    <MetadataList>
      <MetadataListItem label="행사 ID">{event.eventId}</MetadataListItem>
      <MetadataListItem label="학생 접수"><OpenToken isOpen={event.isOpen} /></MetadataListItem>
      <MetadataListItem label="신청 기간">{displayDateTime(event.applyStartAt)} — {displayDateTime(event.applyEndAt)}</MetadataListItem>
    </MetadataList>
    {canOpen && <OpenSwitch subject={`${event.eventId} 행사`} isOpen={event.isOpen} save={async isOpen => { await api.setEventOpen(event.eventId, isOpen); changed() }} />}
    <Text type="supporting">한국 시간 (Asia/Seoul). 신청·변경·취소는 모두 이 기간에만 됩니다. 시작·종료 시각과 정확히 같은 순간은 제외됩니다.</Text>

    <Heading level={2}>행사 일시·장소</Heading>
    <MetadataList>
      <MetadataListItem label="행사 날짜">{seoulDay(event.date) || '확인 필요'}</MetadataListItem>
      <MetadataListItem label="장소">{event.location}</MetadataListItem>
      {event.sessions.map(session => <MetadataListItem key={session.id} label={session.label}>{seoulClock(session.startsAt)}–{seoulClock(session.endsAt)}</MetadataListItem>)}
    </MetadataList>

    <Heading level={2}>멘토 선택지</Heading>
    <Text color="secondary">1·2차시가 같은 선택지 {MENTORING_OPTION_COUNT}개와 "{NONE_LABEL}"을 함께 씁니다. 학생은 1차시에 고른 선택지를 2차시에 고를 수 없고, 두 차시 모두 "{NONE_LABEL}"일 수도 없습니다.</Text>
    <List hasDividers>
      {event.options.map((name, index) => <ListItem key={index} label={name || '이름 없음'} startContent={<Token label={`선택지 ${index + 1}`} size="sm" color={name ? 'blue' : 'orange'} />} />)}
      <ListItem label={NONE_LABEL} description="모든 행사에 고정으로 제공됩니다. 한 차시만 참여할 때 고릅니다." startContent={<Token label="고정" size="sm" color="gray" />} />
    </List>
    <Text type="supporting">접수를 열려면 {MENTORING_OPTION_COUNT}개 모두 이름이 필요합니다.</Text>

    <Heading level={2}>안내 문구</Heading>
    <MetadataList>
      <MetadataListItem label="프로그램 소개">{event.intro || '없음'}</MetadataListItem>
      <MetadataListItem label="유의사항">{event.notes.length ? <VStack gap={1}>{event.notes.map((note, index) => <Text key={index}>{note}</Text>)}</VStack> : '없음'}</MetadataListItem>
      <MetadataListItem label="EPIC Folio 신청 주소">{event.epicFolioUrl || '없음'}</MetadataListItem>
      <MetadataListItem label="EPIC Folio 링크"><Token label={event.isEpicFolioLinkOpen ? '학생 화면에 보임' : '숨김'} size="sm" color={event.isEpicFolioLinkOpen ? 'blue' : 'gray'} /></MetadataListItem>
    </MetadataList>
  </VStack>
}
