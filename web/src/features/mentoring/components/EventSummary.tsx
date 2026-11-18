import { Card } from '@astryxdesign/core/Card'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import type { MentoringEvent } from '../../../shared/types'
import { applyPeriodLabel, eventDateLabel, sessionTimeLabel } from '../eventInfo'

/**
 * When and where: the event day, the venue and both sessions' hours, plus
 * the application window when asked. The same card answers "then when?" on
 * the guide, the closed notice and the done screen.
 */
export function EventSummary({
  event,
  showPeriod = false,
  elevation = 'low',
}: {
  event: MentoringEvent
  showPeriod?: boolean
  elevation?: 'none' | 'low'
}) {
  const date = eventDateLabel(event)
  const period = applyPeriodLabel(event)
  return (
    <Card padding={4} elevation={elevation}>
      <MetadataList label={{ position: 'start', width: 88 }}>
        {showPeriod && period && <MetadataListItem label="신청 기간">{period}</MetadataListItem>}
        <MetadataListItem label="행사 일시">{date || '추후 안내'}</MetadataListItem>
        <MetadataListItem label="장소">{event.location || '추후 안내'}</MetadataListItem>
        {event.sessions.map((session) => (
          <MetadataListItem key={session.id} label={session.label}>
            {sessionTimeLabel(session) || '추후 안내'}
          </MetadataListItem>
        ))}
      </MetadataList>
    </Card>
  )
}
