import { TextInput } from '@astryxdesign/core/TextInput'
import { Selector } from '@astryxdesign/core/Selector'

export interface FilterConfig {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

/**
 * Search + filter row shared by content lists and admin tables. Stacks on
 * mobile, flows into a row on desktop. Filters render as compact Selectors.
 */
export function SearchFilterBar({
  query,
  onQueryChange,
  placeholder = '검색',
  filters = [],
  endContent,
}: {
  query: string
  onQueryChange: (value: string) => void
  placeholder?: string
  filters?: FilterConfig[]
  endContent?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="sm:flex-1 sm:max-w-[22.5rem]">
        <TextInput
          label="검색"
          isLabelHidden
          value={query}
          onChange={onQueryChange}
          placeholder={placeholder}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Selector
            key={f.label}
            label={f.label}
            isLabelHidden
            size="md"
            value={f.value}
            onChange={f.onChange}
            options={f.options}
          />
        ))}
        {endContent}
      </div>
    </div>
  )
}
