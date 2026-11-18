import type { ReactNode } from 'react'
import { Banner } from '@astryxdesign/core/Banner'

/**
 * Period/availability banner shared by reservation and lecture screens
 * (shared-ui.md → PeriodNotice + AvailabilityBadge). Explains the current
 * window and, when an action is blocked, why + what to do next.
 */
export function PeriodNotice({
  status,
  title,
  description,
  action,
}: {
  status: 'info' | 'success' | 'warning' | 'error'
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <Banner
      status={status}
      container="section"
      title={title}
      description={description}
      endContent={action}
    />
  )
}
