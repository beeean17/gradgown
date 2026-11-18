import { Button } from '@astryxdesign/core/Button'

/** A step's back/next pair, kept beside the step's own context. */
export function FlowActions({
  backLabel,
  onBack,
  nextLabel,
  onNext,
  isNextDisabled,
  isNextLoading = false,
  isContained = false,
}: {
  backLabel: string
  onBack: () => void
  nextLabel: string
  onNext: () => void
  isNextDisabled?: boolean
  /** A request is in flight: spin the primary and keep the student in place. */
  isNextLoading?: boolean
  isContained?: boolean
}) {
  const itemClass = isContained ? 'min-w-0 flex-1' : 'min-w-0 flex-1 xl:w-28 xl:flex-none'

  return (
    <div className="flex gap-2.5">
      <div className={itemClass}>
        <Button
          label={backLabel}
          variant="secondary"
          size="lg"
          width="100%"
          onClick={onBack}
          isDisabled={isNextLoading}
        />
      </div>
      <div className={itemClass}>
        <Button
          label={nextLabel}
          variant="primary"
          size="lg"
          width="100%"
          onClick={onNext}
          isDisabled={isNextDisabled}
          isLoading={isNextLoading}
        />
      </div>
    </div>
  )
}
