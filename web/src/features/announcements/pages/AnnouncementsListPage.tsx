import { useDeferredValue, useMemo, useState } from 'react'
import { MobileAnnouncementList } from '../components/MobileAnnouncementList'
import { announcementCategories, useAnnouncements } from '../useAnnouncements'

/**
 * 공지사항: the search, category chips and the notices as one card of rows
 * (MobileAnnouncementList), on every screen — a wide one centres the column.
 */
export function AnnouncementsListPage() {
  const { items: all, status, retry } = useAnnouncements()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [category, setCategory] = useState('all')
  const categories = useMemo(() => announcementCategories(all), [all])

  const filteredItems = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()

    return all.filter((announcement) => {
      if (category === 'pinned' && !announcement.isPinned) return false
      if (category !== 'all' && category !== 'pinned' && announcement.category !== category) {
        return false
      }

      return (
        !normalizedQuery ||
        announcement.title.toLowerCase().includes(normalizedQuery) ||
        announcement.content.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [all, category, deferredQuery])

  const pinnedCount = all.filter((announcement) => announcement.isPinned).length
  const filters = [
    { key: 'all', label: '전체', count: all.length },
    ...(pinnedCount > 0 ? [{ key: 'pinned', label: '필독', count: pinnedCount }] : []),
    ...categories.map((item) => ({
      key: item,
      label: item,
      count: all.filter((announcement) => announcement.category === item).length,
    })),
  ]

  const resetFilters = () => {
    setQuery('')
    setCategory('all')
  }

  return (
    <MobileAnnouncementList
      items={filteredItems}
      total={all.length}
      status={status}
      retry={retry}
      filters={filters}
      category={category}
      onCategoryChange={setCategory}
      query={query}
      onQueryChange={setQuery}
      onReset={resetFilters}
    />
  )
}
