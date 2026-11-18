import { Icon } from '@astryxdesign/core/Icon'
import { HStack } from '@astryxdesign/core/Stack'
import { TextInput } from '@astryxdesign/core/TextInput'

export interface ContentFilterChip {
  key: string
  label: string
}

interface ContentSearchFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  size?: 'sm' | 'md'
}

export function ContentSearchField({
  label,
  value,
  onChange,
  placeholder,
  size = 'md',
}: ContentSearchFieldProps) {
  return (
    <TextInput
      label={label}
      isLabelHidden
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      startIcon={<Icon icon="search" color="secondary" size="sm" />}
      hasClear
      size={size}
      width="100%"
    />
  )
}

interface ContentFilterChipsProps {
  label: string
  chips: ContentFilterChip[]
  activeKey: string
  onChange: (key: string) => void
  isScrollable?: boolean
}

export function ContentFilterChips({
  label,
  chips,
  activeKey,
  onChange,
  isScrollable = false,
}: ContentFilterChipsProps) {
  return (
    <HStack
      gap={2}
      wrap={isScrollable ? 'nowrap' : 'wrap'}
      role="group"
      aria-label={label}
      className={isScrollable ? '-mx-4 overflow-x-auto px-4 py-1 no-scrollbar' : undefined}
    >
      {chips.map((chip) => {
        const isActive = activeKey === chip.key

        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(chip.key)}
            className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bg motion-reduce:transition-none sm:px-4 sm:py-2 ${
              isActive
                ? 'border-primary bg-primary text-body shadow-sm'
                : 'border-border bg-card text-secondary hover:border-border-strong hover:text-primary'
            }`}
          >
            {chip.label}
          </button>
        )
      })}
    </HStack>
  )
}
