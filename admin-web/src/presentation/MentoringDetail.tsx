import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import type { MentoringRegistration } from '../contracts/admin-view.ts'
import { displayDate } from '../data/format.ts'
import { MENTORING_STATUS_LABELS, optionLabel } from '../data/mentoring.ts'
import { HStack, Text, Detail, Token } from '../shared/ui.tsx'

/** MNT-56, the detail only: the console does not change registrations (docs/decisions/scope.md). */
export function MentoringDetail({ row, options, close }: { row: MentoringRegistration; options: string[]; close: () => void }) {
  return <Detail title="St:talk 신청 상세" close={close}>
    <HStack gap={3} wrap="wrap" align="center"><Token label={MENTORING_STATUS_LABELS[row.status]} color={row.status === 'reserved' ? 'blue' : 'gray'} size="sm" /><Text type="supporting">{row.eventId} · 신청 {displayDate(row.createdAt)} · 수정 {displayDate(row.modifiedAt)}</Text></HStack>
    <MetadataList>
      <MetadataListItem label="이름">{row.name}</MetadataListItem>
      <MetadataListItem label="학과">{row.department}</MetadataListItem>
      <MetadataListItem label="학번">{row.studentId}</MetadataListItem>
      <MetadataListItem label="학년">{row.grade}학년</MetadataListItem>
      <MetadataListItem label="전화번호">{row.phone}</MetadataListItem>
      <MetadataListItem label="1차시">{optionLabel(options, row.firstOption)}</MetadataListItem>
      <MetadataListItem label="2차시">{optionLabel(options, row.secondOption)}</MetadataListItem>
      <MetadataListItem label="계정">{row.email} · 사용자 ID {row.userId}</MetadataListItem>
    </MetadataList>
  </Detail>
}
