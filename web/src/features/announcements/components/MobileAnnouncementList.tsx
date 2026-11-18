import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import type { Announcement } from '../../../shared/types'
import { AnnouncementRow } from '../../../shared/ui/AnnouncementRow'
import { LoadErrorState, LoadingState } from '../../../shared/ui/LoadState'

export interface AnnouncementFilter {
  key: string
  label: string
  count: number
}

/**
 * The 공지 tab (and the wide screen's 공지사항), in the same language as the other tabs: a plain
 * heading, a boxed search, category chips in the size boxes' selection style
 * (accent border and tint when chosen), and the notices as rows of one card.
 */
export function MobileAnnouncementList({
  items,
  total,
  status,
  retry,
  filters,
  category,
  onCategoryChange,
  query,
  onQueryChange,
  onReset,
}: {
  items: Announcement[]
  total: number
  status: 'loading' | 'ready' | 'error'
  retry: () => void
  filters: AnnouncementFilter[]
  category: string
  onCategoryChange: (key: string) => void
  query: string
  onQueryChange: (value: string) => void
  onReset: () => void
}) {
  const empty = (title: string, detail: string, action?: boolean) => (
    <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
      <Text type="body" weight="semibold">
        {title}
      </Text>
      <Text type="supporting" color="secondary">
        {detail}
      </Text>
      {action && (
        <div className="mt-3">
          <Button label="필터 초기화" variant="secondary" onClick={onReset} />
        </div>
      )}
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-8 pt-6 sm:px-6 lg:max-w-3xl lg:gap-5 lg:pb-16 lg:pt-10">
      <Heading level={1} className="sr-only">
        공지사항
      </Heading>

      {/* Nothing to search or filter until there is a notice. */}
      {total > 0 && (
        <>
          <label className="flex h-11 items-center gap-2 rounded-[var(--radius-inner)] border border-border bg-surface px-3 focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-accent-bg">
            <span className="sr-only">공지 검색</span>
            <Icon icon="search" color="secondary" size="sm" />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="제목·내용 검색"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-primary outline-none placeholder:text-disabled"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="검색어 지우기"
                className="-mr-2 grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-secondary focus-visible:outline-2 focus-visible:outline-accent-bg"
              >
                <Icon icon="close" color="inherit" size="xsm" />
              </button>
            )}
          </label>

          {filters.length > 1 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar" role="group" aria-label="공지 카테고리 필터">
              {filters.map((filter) => {
                const isActive = category === filter.key
                return (
                  <button
                    key={filter.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onCategoryChange(filter.key)}
                    className={`flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-[var(--radius-inner)] border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bg ${
                      isActive
                        ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] font-semibold text-[var(--color-text-accent)]'
                        : 'border-border bg-surface text-secondary'
                    }`}
                  >
                    {filter.label}
                    <span className="tabular-nums opacity-70">{filter.count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      <section aria-label="공지사항 목록" className="rounded-xl border border-border bg-surface">
        <span className="sr-only" aria-live="polite">
          검색된 공지 {items.length}건
        </span>
        {status === 'loading' ? (
          <LoadingState label="공지사항을 불러오고 있어요" minHeight="10rem" />
        ) : status === 'error' ? (
          <div className="p-4">
            <LoadErrorState title="공지사항을 불러오지 못했어요" onRetry={retry} />
          </div>
        ) : total === 0 ? (
          empty('등록된 공지가 없어요', '새 공지가 올라오면 이곳에서 확인할 수 있어요.')
        ) : items.length === 0 ? (
          empty('검색 결과가 없어요', '다른 검색어나 카테고리를 선택해 보세요.', true)
        ) : (
          <ul className="m-0 list-none divide-y divide-border p-0">
            {items.map((item) => (
              <AnnouncementRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
