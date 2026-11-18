import type { ReactNode, Ref } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'

export interface ProgramRow {
  label: string
  /** Line breaks (`\n`) are kept: one run of days per line, say. */
  value: string
  /** Accent trailing clause, e.g. "D-12". */
  emphasis?: string
  /** A value that is not a real choice ("선택 안함"): shown muted. */
  isMuted?: boolean
  /** A small outside link after the value, e.g. 지도 beside the venue. */
  link?: { label: string; href: string }
}

/**
 * One programme as a card — on the home, at the top of its tab, and as the
 * student's own application in 내 신청: what it is, where it stands, the
 * dates and details that matter as label · value rows, and the way in. The
 * gown rental and St:talk get the same card, so neither reads as a footnote
 * to the other.
 */
export function ProgramCard({
  kicker,
  title,
  titleRef,
  description,
  status,
  statusColor,
  isActive = false,
  isDimmed = false,
  rows = [],
  mine,
  children,
  actions,
}: {
  kicker: string
  title: string
  /** Focus target when the screen around the card swaps (내 신청's editor). */
  titleRef?: Ref<HTMLHeadingElement>
  /** A muted line under the title, e.g. "11.10 신청". */
  description?: string
  /** Short state, e.g. "예약 가능". */
  status?: string
  /** Overrides the state's colour; by default blue when `isActive`, else gray. */
  statusColor?: 'blue' | 'green' | 'gray' | 'red'
  /** Whether it can be acted on now: colours the kicker and the state. */
  isActive?: boolean
  /** A cancelled application: the whole card fades so it reads as inactive at a glance. */
  isDimmed?: boolean
  rows?: ProgramRow[]
  /** The student's own application, in place of the pitch once there is one. */
  mine?: { label: string; value: string }
  /** Notes between the rows and the actions. */
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <article aria-label={kicker} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4.5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* As written ("St:talk", "학위복 대여"): no uppercase or wide tracking. */}
          <Text type="supporting" weight="bold" color={isActive ? 'accent' : 'secondary'}>
            {kicker}
          </Text>
          <Heading
            level={2}
            ref={titleRef}
            tabIndex={titleRef ? -1 : undefined}
            className="mt-1 !text-lg !font-bold !leading-snug break-keep outline-none"
          >
            {title}
          </Heading>
          {description && (
            <Text as="p" display="block" type="supporting" color="secondary" className="mt-0.5" hasTabularNumbers>
              {description}
            </Text>
          )}
        </div>
        {status && (
          <span className="shrink-0">
            <Token label={status} size="sm" color={statusColor ?? (isActive ? 'blue' : 'gray')} />
          </span>
        )}
      </header>

      {rows.length > 0 && (
        <dl className={`m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 ${isDimmed ? 'opacity-60' : ''}`}>
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt>
                <Text type="body" color="secondary" className="whitespace-nowrap">
                  {row.label}
                </Text>
              </dt>
              <dd className="m-0 min-w-0">
                <Text
                  type="body"
                  weight="semibold"
                  color={row.isMuted ? 'secondary' : 'primary'}
                  className="whitespace-pre-line break-keep tabular-nums"
                >
                  {row.value}
                  {row.emphasis && !isDimmed && (
                    <Text type="inherit" color="accent">
                      {' · '}
                      {row.emphasis}
                    </Text>
                  )}
                </Text>
                {row.link && (
                  <a
                    href={row.link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="ms-2 inline-flex items-center gap-0.5 whitespace-nowrap text-sm font-semibold text-accent no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bg"
                  >
                    {row.link.label}
                    <Icon icon="externalLink" size="xsm" color="inherit" />
                  </a>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {mine && (
        <div className="flex flex-col gap-0.5 rounded-[var(--radius-inner)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-3.5 py-3">
          <Text type="supporting" weight="bold" color="accent">
            {mine.label}
          </Text>
          <Text type="body" weight="semibold" className="break-keep tabular-nums">
            {mine.value}
          </Text>
        </div>
      )}

      {children}

      {actions && <div className="flex gap-2.5">{actions}</div>}
    </article>
  )
}
