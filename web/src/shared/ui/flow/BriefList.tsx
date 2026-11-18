import { Text } from '@astryxdesign/core/Text'

/** A plain line, or a lead in bold followed by the rest of the line. */
export type BriefItem = string | { strong: string; rest?: string }

const itemKey = (item: BriefItem) => (typeof item === 'string' ? item : item.strong)

/**
 * A flow step's points on a phone: one line each under a plain label. No
 * card — the label and the spacing carry the grouping, so the lines are what
 * the eye lands on. `numbered` for steps to follow, bullets otherwise;
 * `danger` colours the label and markers for consequences.
 */
export function BriefList({
  title,
  items,
  numbered = false,
  tone,
}: {
  title: string
  items: BriefItem[]
  numbered?: boolean
  tone?: 'danger'
}) {
  const isDanger = tone === 'danger'
  const marker = isDanger ? 'text-[var(--color-text-red)]' : 'text-accent'
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <Text type="label" size="sm" className={isDanger ? 'text-[var(--color-text-red)]' : 'text-secondary'}>
        {title}
      </Text>
      <ol className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={itemKey(item)} className="flex items-start gap-3">
            <Text type="body" weight="semibold" className={`w-4 shrink-0 text-center tabular-nums ${marker}`} aria-hidden>
              {numbered ? index + 1 : '•'}
            </Text>
            <Text type="body" className="break-keep text-pretty">
              {typeof item === 'string' ? (
                item
              ) : (
                <>
                  <Text type="inherit" weight="semibold">
                    {item.strong}
                  </Text>
                  {item.rest && (
                    <Text type="inherit" color="secondary">
                      {' '}
                      {item.rest}
                    </Text>
                  )}
                </>
              )}
            </Text>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** "label · value" rows under a plain label, for a step's own summary. */
export function BriefFacts({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <Text type="label" size="sm" className="text-secondary">
        {title}
      </Text>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt>
              <Text type="body" color="secondary" className="whitespace-nowrap">
                {row.label}
              </Text>
            </dt>
            <dd>
              <Text type="body" weight="semibold" className="break-keep">
                {row.value}
              </Text>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
