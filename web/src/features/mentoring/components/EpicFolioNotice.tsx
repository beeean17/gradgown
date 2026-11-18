import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import type { MentoringEvent } from '../../../shared/types'
import { EPIC_FOLIO } from '../content/guide'

/**
 * The reminder that this form is not the EPIC Folio one (MNT-3). `compact`
 * drops the path list — the done screen and 내 신청 only need the link.
 */
export function EpicFolioNotice({
  event,
  compact = false,
  tone = 'warning',
}: {
  event: MentoringEvent | null
  compact?: boolean
  tone?: 'warning' | 'plain'
}) {
  const isLinkOpen = Boolean(event?.isEpicFolioLinkOpen && event.epicFolioUrl)
  const surface =
    tone === 'warning'
      ? 'rounded-xl border border-[var(--color-reservation-warning-border)] bg-[var(--color-reservation-warning-surface)] p-4.5'
      : 'border-y border-border py-4'

  return (
    <section className={`flex flex-col gap-3 ${surface}`} aria-label={EPIC_FOLIO.title}>
      <div className="flex flex-col gap-1">
        <Text type="label" weight="bold">
          {EPIC_FOLIO.title}
        </Text>
        <Text type="supporting" color="secondary" display="block" className="text-pretty">
          {EPIC_FOLIO.summary}
        </Text>
      </div>

      {!compact && (
        <div className="flex flex-col gap-1.5">
          <Text type="supporting" size="sm" weight="bold" display="block">
            {EPIC_FOLIO.pathTitle}
          </Text>
          <ol className="m-0 flex list-decimal flex-col gap-1 ps-4">
            {EPIC_FOLIO.paths.map((path) => (
              <li key={path}>
                <Text type="supporting" size="sm" color="secondary" display="block" className="text-pretty">
                  {path}
                </Text>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* The operator turns the link on in the admin console once it exists;
          until then there is nothing to tap, so nothing is shown. */}
      {isLinkOpen && (
        <div className="w-fit">
          <Button
            label={EPIC_FOLIO.linkLabel}
            variant="secondary"
            size="md"
            href={event!.epicFolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            endContent={<Icon icon="externalLink" size="sm" />}
          />
        </div>
      )}
    </section>
  )
}
