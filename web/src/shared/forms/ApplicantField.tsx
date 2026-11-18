import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'

/**
 * One applicant text field in the immersive flows: the label, the input, and
 * its error right-aligned beneath. Every field here is required, so none is
 * marked. Shared by the reservation and St:talk applicant steps so the two
 * forms look the same. `inputMode` picks the phone keypad (numeric for a
 * student id, tel for a phone number); Astryx's TextInput does not type it, so
 * it is set on the element.
 */
export function ApplicantField({
  label,
  value,
  onChange,
  placeholder,
  error,
  inputMode,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  error?: string
  inputMode?: 'numeric' | 'tel'
  autoComplete?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Text type="label">{label}</Text>
      <TextInput
        label={label}
        isLabelHidden
        isRequired
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        status={error ? { type: 'error' } : undefined}
        statusVariant="detached"
        className="[&_input::placeholder]:text-disabled"
        width="100%"
        ref={(element: HTMLInputElement | null) => {
          if (!element) return
          if (inputMode) element.inputMode = inputMode
          if (autoComplete) element.autocomplete = autoComplete as AutoFill
        }}
      />
      {error && (
        <Text
          type="supporting"
          size="xsm"
          weight="medium"
          className="self-end text-right text-[var(--color-text-red)]"
          role="alert"
        >
          {error}
        </Text>
      )}
    </div>
  )
}
