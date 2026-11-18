import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import type { GownReservation } from '../contracts/admin-view.ts'
import { displayDate } from '../data/format.ts'
import { HStack, Text, Detail, Status } from '../shared/ui.tsx'

/** Everything the list row leaves out. Read-only: the console does not change reservations (docs/decisions/scope.md). */
export function ReservationDetail({ row, close }: { row: GownReservation; close: () => void }) {
  return <Detail title="예약 상세" close={close}>
    <HStack gap={3} wrap="wrap" align="center"><Status status={row.status} /><Text type="supporting">{row.periodId} · 신청 {displayDate(row.createdAt)} · 수정 {displayDate(row.modifiedAt)}</Text></HStack>
    <MetadataList>
      <MetadataListItem label="이름">{row.name}</MetadataListItem>
      <MetadataListItem label="학번">{row.studentId}</MetadataListItem>
      <MetadataListItem label="학과">{row.department}</MetadataListItem>
      <MetadataListItem label="연락처">{row.phone}</MetadataListItem>
      <MetadataListItem label="사이즈">{row.size}</MetadataListItem>
      <MetadataListItem label="대여">{displayDate(row.rentAt)}</MetadataListItem>
      <MetadataListItem label="반납">{displayDate(row.returnAt)}</MetadataListItem>
      <MetadataListItem label="수령">{row.isProxy ? `대리 수령: ${row.proxyName} · ${row.proxyPhone}` : '본인 수령'}</MetadataListItem>
      <MetadataListItem label="계정">{row.email} · 사용자 ID {row.userId}</MetadataListItem>
    </MetadataList>
  </Detail>
}
