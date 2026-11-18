import { useMemo, useState } from 'react'
import { VStack } from '@astryxdesign/core/Stack'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { PageContainer } from '../../../shared/ui/PageContainer'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { SearchFilterBar } from '../../../shared/ui/SearchFilterBar'
import { filterOptions } from '../../../shared/domain/status'
import { LECTURE_AVAILABILITY } from '../components/lectureStatus'
import { LectureCard } from '../components/LectureCard'
import { useLectures, lectureAvailability } from '../useLectures'

// `archived` is deliberately absent: the "신청 마감" filter below folds ended
// lectures in with closed ones, so a separate 종료 entry would return a subset
// of what the user just picked.
const STATUS_OPTIONS = filterOptions(LECTURE_AVAILABILITY, '전체 상태', [
  'open',
  'upcoming',
  'closed',
])

export function LecturesListPage() {
  const all = useLectures()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((l) => {
      if (status !== 'all') {
        const a = lectureAvailability(l)
        const matches = status === 'closed' ? a === 'closed' || a === 'archived' : a === status
        if (!matches) return false
      }
      if (!q) return true
      return l.title.toLowerCase().includes(q) || l.speakerName.toLowerCase().includes(q)
    })
  }, [all, query, status])

  return (
    <PageContainer width="wide">
      <VStack gap={5}>
        <PageHeader title="취업 강연회" description="신청 가능한 강연을 확인하고 바로 신청하세요." />
        <SearchFilterBar
          query={query}
          onQueryChange={setQuery}
          placeholder="강연·연사 검색"
          filters={[{ label: '상태', value: status, options: STATUS_OPTIONS, onChange: setStatus }]}
        />
        {items.length === 0 ? (
          <EmptyState title="강연이 없어요" description="다른 검색어나 상태를 선택해 보세요." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 gx-stagger">
            {items.map((l) => (
              <LectureCard key={l.lectureId} item={l} />
            ))}
          </div>
        )}
      </VStack>
    </PageContainer>
  )
}
