import type { ReactNode } from 'react'
import { VStack, HStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { FlowTitle } from './FlowTitle'
import { BriefList } from './BriefList'

export interface ConfirmRow {
  label: string
  value: string
  /** Muted trailing clause, e.g. "· 제1학생회관 3층 320호". */
  note?: string
  /** Step to jump back to. Rows without one are consequences, not inputs. */
  editStep?: number
  isEmphasized?: boolean
  /** Only in the phone's grouped list, e.g. the venue said once instead of as a note on two rows. */
  phoneOnly?: boolean
}

export interface ConfirmNotice {
  emphasis: string
  detail: string
  /** The phone's one-line version of `detail`. */
  brief?: string
}

/**
 * The last step. Every editable line carries its own way back, so a wrong
 * choice is one click to fix rather than three 이전 presses. The consequences
 * of confirming are restated here because this is the last point where they
 * still matter.
 */
export function ConfirmStep({
  flowName,
  step,
  totalSteps,
  stepName,
  title,
  sectionTitle,
  sectionLead = '잘못된 내용은 수정한 뒤 확정해 주세요',
  rows,
  onEdit,
  consequencesTitle,
  consequences,
  aside,
  actions,
  onBack,
  onExit,
  groupTitles = {},
}: {
  flowName: string
  step: number
  totalSteps: number
  stepName: string
  title: string
  sectionTitle: string
  sectionLead?: string
  rows: ConfirmRow[]
  onEdit: (step: number) => void
  consequencesTitle: string
  consequences: ConfirmNotice[]
  /** Extra rail content between the consequences and the actions. */
  aside?: ReactNode
  actions: ReactNode
  /** A phone's way back and out (FlowTitle); wide screens use `actions`. */
  onBack?: () => void
  onExit?: () => void
  /**
   * A phone groups consecutive rows by the step they go back to, with one 수정
   * per group: titles keyed by that step, or "none" for rows without one.
   */
  groupTitles?: Record<string, string>
}) {
  const groups: { editStep?: number; rows: ConfirmRow[] }[] = []
  for (const row of rows) {
    const current = groups[groups.length - 1]
    if (current && current.editStep === row.editStep) current.rows.push(row)
    else groups.push({ editStep: row.editStep, rows: [row] })
  }

  return (
    <div className="flex flex-col gap-6.5">
      <FlowTitle flowName={flowName} step={step} totalSteps={totalSteps} stepName={stepName} onBack={onBack} onExit={onExit}>
        {title}
      </FlowTitle>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_var(--rail-w)] lg:gap-[var(--rail-gap)]">
        <main className="min-w-0">
          {/* Phone: grouped by the step each block goes back to, one 수정 each. */}
          <div className="flex flex-col gap-7 desk:hidden">
            {groups.map((group) => {
              const title = groupTitles[String(group.editStep ?? 'none')]
              return (
                <section key={`${group.editStep ?? 'none'}-${group.rows[0].label}`} aria-label={title} className="flex flex-col gap-3">
                  {(title || group.editStep !== undefined) && (
                    <div className="flex items-baseline justify-between gap-3">
                      <Text type="label" size="sm" className="text-secondary">
                        {title}
                      </Text>
                      {group.editStep !== undefined && (
                        <button
                          type="button"
                          onClick={() => onEdit(group.editStep!)}
                          aria-label={`${title || '이 내용'} 수정`}
                          className="cursor-pointer rounded-[var(--radius-inner)] text-sm text-[var(--color-text-accent)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                        >
                          수정
                        </button>
                      )}
                    </div>
                  )}
                  <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
                    {group.rows.map((row) => (
                      <div key={row.label} className="contents">
                        <dt>
                          <Text type="body" color="secondary" className="whitespace-nowrap">
                            {row.label}
                          </Text>
                        </dt>
                        <dd>
                          <Text type="body" weight="semibold" color={row.isEmphasized ? 'accent' : 'primary'} className="break-keep">
                            {row.value}
                          </Text>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )
            })}
          </div>

          <VStack gap={0} className="hidden desk:flex">
            <div className="pb-4">
              <VStack gap={0.5}>
                <Text type="label" weight="bold" className="text-lg">
                  {sectionTitle}
                </Text>
                <Text type="supporting" color="secondary">
                  {sectionLead}
                </Text>
              </VStack>
            </div>
            <Divider />
            {rows.filter((row) => !row.phoneOnly).map((row, i) => (
              <div key={row.label}>
                {i > 0 && <Divider />}
                <HStack gap={3} vAlign="center" className="py-4">
                  <div className="w-24 shrink-0">
                    <Text type="supporting" color="secondary">
                      {row.label}
                    </Text>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Text type="body" color={row.isEmphasized ? 'accent' : 'primary'}>
                      {row.value}
                      {row.note && (
                        <Text type="supporting" color="secondary">
                          {' '}
                          {row.note}
                        </Text>
                      )}
                    </Text>
                  </div>
                  {row.editStep !== undefined && (
                    <Button label="수정" variant="ghost" onClick={() => onEdit(row.editStep!)} />
                  )}
                </HStack>
              </div>
            ))}
          </VStack>
        </main>

        <aside className="flex flex-col gap-4">
          <div className="desk:hidden">
            <BriefList
              title={consequencesTitle}
              items={consequences.map((notice) => ({ strong: notice.emphasis, rest: notice.brief ?? notice.detail }))}
            />
          </div>
          <section className="hidden rounded-xl border border-[var(--color-reservation-warning-border)] bg-[var(--color-reservation-warning-surface)] p-4.5 desk:block">
            <VStack gap={3}>
              <Text type="label" weight="bold">
                {consequencesTitle}
              </Text>
              {consequences.map((notice) => (
                <Text key={notice.emphasis} type="supporting" color="secondary">
                  <Text type="inherit" weight="bold" color="primary">
                    {notice.emphasis}
                  </Text>{' '}
                  {notice.detail}
                </Text>
              ))}
            </VStack>
          </section>
          {aside}
          {actions}
        </aside>
      </div>
    </div>
  )
}
