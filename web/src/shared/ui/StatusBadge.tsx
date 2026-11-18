import { Badge } from '@astryxdesign/core/Badge'
import { badgeVariant, type BadgePresentation } from '../domain/status'

/**
 * The one way a domain status or content flag is rendered as a badge. Takes the
 * presentation pair straight out of a map in shared/domain/status.ts, so the
 * label and the color travel together and no page re-decides either:
 *
 *   <StatusBadge status={RESERVATION_STATUS[r.status]} />
 *   <StatusBadge status={CONTENT_FLAGS.pinned} />
 */
export function StatusBadge({ status }: { status: BadgePresentation }) {
  return <Badge variant={badgeVariant(status.tone)} label={status.label} />
}
