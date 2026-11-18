import { List, ListItem } from '@astryxdesign/core/List'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import { REGISTRATION_STATUS } from '../../../shared/domain/status'
import { formatDateTime } from '../../../shared/lib/datetime'
import { mockMyLectureRegistrations } from '../mockData'
import { PATHS } from '../../../app/routes/paths'

/** Future private route: the lectures this user applied to. */
export function MyLecturesPage() {
  const navigate = useNavigate()
  const registrations = mockMyLectureRegistrations

  if (registrations.length === 0) {
    return (
      <EmptyState
        title="강연 신청 내역이 없어요"
        description="신청 기간에 강연을 신청하면 여기에서 확인할 수 있어요."
        actions={<Button label="강연 보기" variant="primary" onClick={() => navigate(PATHS.public.lectures)} />}
      />
    )
  }

  return (
    <List hasDividers>
      {registrations.map((r) => (
        <ListItem
          key={r.registrationId}
          label={r.title}
          description={formatDateTime(r.startsAt)}
          href={PATHS.public.lecture(r.lectureId)}
          endContent={<StatusBadge status={REGISTRATION_STATUS[r.status]} />}
        />
      ))}
    </List>
  )
}
