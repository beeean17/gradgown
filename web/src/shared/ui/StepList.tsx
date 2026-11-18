import { Text } from '@astryxdesign/core/Text'

export interface Step {
  term: string
  /** `strong` is the part a student most often forgets: set in bold accent. */
  detail: { text: string; strong?: boolean }[]
}

/**
 * How a programme goes, as a vertical stepper: numbered dots joined by a rule,
 * one step per row. The 예약 and St:talk tabs' "…란" cards.
 */
export function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {steps.map((step, index) => (
        <li key={step.term} className="relative flex gap-3 pb-4 last:pb-0">
          {index < steps.length - 1 && (
            <span aria-hidden className="absolute bottom-0 left-3.5 top-8 w-px -translate-x-1/2 bg-border" />
          )}
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-sm font-bold tabular-nums text-[var(--color-text-accent)]"
          >
            {index + 1}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
            <Text type="body" weight="bold">
              {step.term}
            </Text>
            <Text type="body" color="secondary" className="break-keep">
              {step.detail.map((part) =>
                part.strong ? (
                  <Text key={part.text} type="inherit" weight="bold" color="accent">
                    {part.text}
                  </Text>
                ) : (
                  part.text
                ),
              )}
            </Text>
          </span>
        </li>
      ))}
    </ol>
  )
}
