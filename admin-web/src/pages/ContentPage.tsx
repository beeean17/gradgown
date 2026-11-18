import { useCallback, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { TextInput } from '@astryxdesign/core/TextInput'
import { TextArea } from '@astryxdesign/core/TextArea'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { List, ListItem } from '@astryxdesign/core/List'
import type { AdminApi, ContentBundle, ContentEntry, ContentKind } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { errorMessage } from '../data/format.ts'
import { VStack, HStack, Text, Button, Heading, PageHeader, Loaded, Empty, Message, Modal, Confirm, Token } from '../shared/ui.tsx'
import { useCan } from '../auth/access.ts'

export function ContentPage({ api, kind }: { api: AdminApi; kind: ContentKind }) {
  const { state, refresh } = useLoad(useCallback(() => api.getContent(kind), [api, kind]))
  const [editing, setEditing] = useState<ContentEntry | 'new' | null>(null), [deleting, setDeleting] = useState<ContentEntry | null>(null), [notice, setNotice] = useState('')
  const title = kind === 'announcements' ? '공지사항' : '자주 묻는 질문', editable = useCan()('content.write')
  return <VStack gap={5}><PageHeader title={title} description="학생에게 전달할 내용을 확인하고 정리하세요." actions={editable && <Button label={`${kind === 'announcements' ? '공지' : 'FAQ'} 작성`} variant="primary" isDisabled={state.status !== 'ready'} onClick={() => setEditing('new')} />} />
    <Message>‘목록 노출’은 표시 여부 설정입니다. 이 문서와 이미지는 공개 읽기가 가능하므로 개인정보나 기밀 초안을 저장하지 마세요.</Message>{notice && <Message>{notice}</Message>}
    <Loaded state={state} retry={refresh}>{bundle => <>{!bundle.entries.length ? <Empty detail="첫 안내를 작성해 주세요." /> : <List hasDividers header={<Text type="supporting">전체 {bundle.entries.length}개</Text>}>{bundle.entries.map(entry => <ListItem key={entry.id} label={entry.title || '제목 확인 필요'} description={`${entry.category} · ${kind === 'faq' ? `순서 ${entry.order}` : entry.isPinned ? '상단 고정' : '일반 공지'}`} startContent={<Token label={entry.isVisible ? '노출' : '숨김'} size="sm" color={entry.isVisible ? 'blue' : 'gray'} />} endContent={editable ? <HStack gap={2}><Button label="편집" size="sm" onClick={() => setEditing(entry)} /><Button label="삭제" variant="ghost" size="sm" onClick={() => setDeleting(entry)} /></HStack> : <Button label="보기" size="sm" onClick={() => setEditing(entry)} />} />)}</List>}
      {editing && <ContentEditor api={api} kind={kind} bundle={bundle} entry={editing === 'new' ? null : editing} readOnly={!editable} close={() => setEditing(null)} saved={() => { setEditing(null); setNotice('콘텐츠를 저장했습니다.'); refresh() }} />}
      {deleting && <Confirm title="이 항목을 삭제할까요?" label="항목 삭제" detail={<Text>{deleting.title}. 해당 항목만 삭제하며 다른 공지/FAQ는 유지합니다.</Text>} close={() => setDeleting(null)} action={async () => { await api.command({ action: 'content.delete', kind, id: deleting.id, version: bundle.version }); setNotice('항목을 삭제했습니다.'); refresh() }} />}
    </>}</Loaded>
  </VStack>
}
function ContentEditor({ api, kind, bundle, entry, readOnly, close, saved }: { api: AdminApi; kind: ContentKind; bundle: ContentBundle; entry: ContentEntry | null; readOnly: boolean; close: () => void; saved: () => void }) {
  const [draft, setDraft] = useState<ContentEntry>(entry || { id: crypto.randomUUID(), title: '', content: '', category: kind === 'faq' ? '일반' : 'notice', isVisible: true, isPinned: false, isPopup: false, popupOrder: null, showOnToggle: false, tags: [], order: bundle.entries.length })
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [preview, setPreview] = useState(readOnly), [upload, setUpload] = useState<number | null>(null)
  const [tagsText, setTagsText] = useState(draft.tags.join(', '))
  const fileInput = useRef<HTMLInputElement>(null)
  const update = (key: keyof ContentEntry, value: unknown) => setDraft(old => ({ ...old, [key]: value }))
  async function save() {
    if (busy || upload !== null) return
    setBusy(true); setError('')
    try { await api.command({ action: 'content.save', kind, id: draft.id, version: bundle.version, input: { ...draft, tags: tagsText.split(',').map(s => s.trim()).filter(Boolean) } }); saved() } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  return <Modal title={`${kind === 'faq' ? 'FAQ' : '공지'} ${readOnly ? '보기' : entry ? '편집' : '작성'}`} close={close} busy={busy || upload !== null} error={error} footer={<HStack gap={2} justify="end"><Button label="닫기" onClick={close} isDisabled={busy || upload !== null} />{!readOnly && <Button label="내용 저장" variant="primary" isLoading={busy} isDisabled={upload !== null || !draft.title.trim() || !draft.content.trim()} onClick={save} />}</HStack>}>
    <fieldset disabled={busy || upload !== null || readOnly} className="contents"><VStack gap={4}>
      <TextInput label={kind === 'faq' ? '질문' : '제목'} value={draft.title} onChange={v => update('title', v)} isRequired />
      <TextInput label="분류" value={draft.category} onChange={v => update('category', v)} isRequired />
      {preview ? <VStack gap={3} className="break-words"><Heading level={2}>내용 미리보기</Heading><ReactMarkdown skipHtml components={{ img: () => <Text type="supporting">[이미지: 미리보기에서는 외부 요청을 생략합니다]</Text> }}>{draft.content}</ReactMarkdown></VStack> : <TextArea label={kind === 'faq' ? '답변 (Markdown)' : '내용 (Markdown)'} value={draft.content} onChange={v => update('content', v)} rows={10} maxLength={30000} isRequired />}
      {!readOnly && <HStack gap={2} wrap="wrap"><Button label={preview ? '편집으로 돌아가기' : '내용 미리보기'} onClick={() => setPreview(v => !v)} />{kind === 'announcements' && <><Button label="이미지 업로드" onClick={() => fileInput.current?.click()} /><input ref={fileInput} type="file" hidden aria-label="공지 이미지" accept="image/jpeg,image/png,image/gif,image/webp" onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; setUpload(0); setError(''); try { const url = await api.uploadImage(file, setUpload); setDraft(old => ({ ...old, content: `${old.content}\n\n![공지 이미지](${url})` })) } catch (e) { setError(errorMessage(e)) } finally { setUpload(null) } }} /></>}</HStack>}
      {upload !== null && <Text role="status">이미지 업로드 {upload}%</Text>}
      <CheckboxInput label="목록에 노출" value={draft.isVisible} onChange={v => update('isVisible', v)} />
      {kind === 'announcements' ? <VStack gap={3}><CheckboxInput label="상단 고정" value={draft.isPinned} onChange={v => update('isPinned', v)} /><CheckboxInput label="팝업 표시" value={draft.isPopup} onChange={v => update('isPopup', v)} /><TextInput label="팝업 순서 (선택)" value={draft.popupOrder === null ? '' : String(draft.popupOrder)} onChange={v => update('popupOrder', v === '' ? null : Number(v))} /><CheckboxInput label="토글 영역 표시" value={draft.showOnToggle} onChange={v => update('showOnToggle', v)} /></VStack> : <VStack gap={3}><TextInput label="태그 (쉼표로 구분)" value={tagsText} onChange={setTagsText} /><HStack gap={3} align="end"><TextInput label="표시 순서" value={String(draft.order)} onChange={v => update('order', Number(v))} /><Button label="순서 올리기" isDisabled={draft.order <= 0} onClick={() => update('order', Math.max(0, draft.order - 1))} /><Button label="순서 내리기" onClick={() => update('order', draft.order + 1)} /></HStack></VStack>}
    </VStack></fieldset>
    {!readOnly && <Text type="supporting">저장하면 공개 콘텐츠에 반영됩니다. 이미지 업로드는 공개 Storage에 즉시 반영되며, 편집을 취소해도 업로드한 파일은 자동 삭제되지 않습니다.</Text>}
  </Modal>
}
