import { Link } from 'react-router-dom'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Token } from '@astryxdesign/core/Token'
import { PATHS } from '../../app/routes/paths'
import { formatMonthDayWeekday } from '../lib/datetime'
import { stripMarkdown } from '../lib/markdown'
import type { Announcement } from '../types'

/**
 * One notice as a row of a list card (`<ul>` of these, divided): what kind,
 * when, the title and its first line. The 공지 tab, the home's pinned notices
 * and the 예약 tab's gown notices share it.
 */
export function AnnouncementRow({ item }: { item: Announcement }) {
  const publishedAt = item.publishedAt ?? item.createdAt
  const snippet = stripMarkdown(item.content.split(/\n\s*\n/)[0] ?? item.content)
  return (
    <li>
      <Link
        to={PATHS.public.announcement(item.id)}
        className="group flex items-center gap-3 px-4 py-4 text-primary no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-bg"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs">
            {item.isPinned && <Token label="필독" color="yellow" size="sm" />}
            <span className="text-secondary">{item.category}</span>
            <time dateTime={publishedAt} className="ml-auto shrink-0 tabular-nums text-secondary">
              {formatMonthDayWeekday(publishedAt)}
            </time>
          </span>
          <Heading level={2} className="!text-base !font-bold !leading-snug break-keep group-hover:text-accent">
            {item.title}
          </Heading>
          {snippet && <span className="line-clamp-1 text-sm text-secondary">{snippet}</span>}
        </span>
        <Icon icon="chevronRight" size="sm" color="secondary" />
      </Link>
    </li>
  )
}

