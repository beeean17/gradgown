import { useCallback, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { List, ListItem } from '@astryxdesign/core/List'
import type { AdminApi, ContentEntry, ContentKind } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { VStack, HStack, Text, Button, Heading, PageHeader, Loaded, Empty, Detail, Token } from '../shared/ui.tsx'

// Read-only: announcements and FAQs come from the seed data (docs/decisions/scope.md).
// Hidden entries are listed here; the student server never returns them.
export function ContentPage({ api, kind }: { api: AdminApi; kind: ContentKind }) {
  const { state, refresh } = useLoad(useCallback(() => api.getContent(kind), [api, kind]))
  const [viewing, setViewing] = useState<ContentEntry | null>(null)
  const title = kind === 'announcements' ? '공지사항' : '자주 묻는 질문'
  return <VStack gap={5}><PageHeader title={title} description="학생에게 전달하는 내용을 확인하세요." />
    <Loaded state={state} retry={refresh}>{entries => !entries.length ? <Empty detail="등록된 항목이 없습니다." /> : <List hasDividers header={<Text type="supporting">전체 {entries.length}개</Text>}>{entries.map(entry => <ListItem key={entry.id} label={entry.title || '제목 확인 필요'} description={`${entry.category} · ${kind === 'faq' ? `순서 ${entry.order}` : entry.isPinned ? '상단 고정' : '일반 공지'}`} startContent={<Token label={entry.isVisible ? '노출' : '숨김'} size="sm" color={entry.isVisible ? 'blue' : 'gray'} />} endContent={<Button label="보기" size="sm" onClick={() => setViewing(entry)} />} />)}</List>}</Loaded>
    {viewing && <ContentViewer kind={kind} entry={viewing} close={() => setViewing(null)} />}
  </VStack>
}
function ContentViewer({ kind, entry, close }: { kind: ContentKind; entry: ContentEntry; close: () => void }) {
  const flags = [entry.category, entry.isVisible ? '목록에 노출' : '숨김', ...(kind === 'faq' ? [`표시 순서 ${entry.order}`, ...entry.tags.map(tag => `#${tag}`)] : [entry.isPinned && '상단 고정', entry.isPopup && '팝업 표시', entry.showOnHome && '홈 화면 표시'])].filter((flag): flag is string => Boolean(flag))
  return <Detail title={`${kind === 'faq' ? 'FAQ' : '공지'} 보기`} close={close}>
    <VStack gap={3}><Heading level={2}>{entry.title}</Heading><HStack gap={2} wrap="wrap">{flags.map(flag => <Token key={flag} label={flag} size="sm" color="gray" />)}</HStack></VStack>
    <VStack gap={3} className="break-words"><ReactMarkdown skipHtml components={{ img: () => <Text type="supporting">[이미지: 미리보기에서는 외부 요청을 생략합니다]</Text> }}>{entry.content}</ReactMarkdown></VStack>
  </Detail>
}
