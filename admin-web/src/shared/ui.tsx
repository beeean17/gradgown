import { useState, type ReactNode } from 'react'
import { VStack, HStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Banner } from '@astryxdesign/core/Banner'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Token } from '@astryxdesign/core/Token'
import type { GownReservation, LoadState } from '../contracts/admin-view.ts'
import { errorMessage } from '../data/format.ts'

export { VStack, HStack, Heading, Text, Button, Token }
export function PageHeader({ title, description }: { title: string; description: string }) {
  return <VStack gap={2}><Text type="supporting" color="accent">GRAD42 / OPERATIONS</Text><Heading level={1}>{title}</Heading><Text color="secondary">{description}</Text></VStack>
}
export function Message({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <Banner status={error ? 'error' : 'info'} title={children} />
}
export function Loaded<T>({ state, retry, children }: { state: LoadState<T>; retry: () => void; children: (data: T) => ReactNode }) {
  if (state.status === 'loading') return <VStack padding={8} gap={3} aria-busy="true" role="status"><Text>데이터를 확인하고 있습니다…</Text><Text type="supporting">서버에서 최신 정보를 불러오는 중입니다.</Text></VStack>
  if (state.status === 'error') return <VStack gap={3}><Message error>{state.message}</Message><Button label="다시 확인" onClick={retry} /></VStack>
  return children(state.data)
}
export function Empty({ title = '표시할 항목이 없습니다', detail }: { title?: string; detail: string }) {
  return <VStack padding={8} gap={2} align="center"><Heading level={2}>{title}</Heading><Text color="secondary">{detail}</Text></VStack>
}
export function Status({ status }: { status: GownReservation['status'] }) {
  const labels = { reserved: '예약 완료', cancelled: '취소' }
  return <Token label={labels[status]} color={status === 'reserved' ? 'blue' : 'gray'} size="sm" className="self-start" />
}
/** 열림 / 닫힘 of a period's or an event's applications. */
export function OpenToken({ isOpen }: { isOpen: boolean }) {
  return <Token label={isOpen ? '열림' : '닫힘'} color={isOpen ? 'blue' : 'gray'} size="sm" />
}
/** Moves through a list the server pages by cursor (hooks/useCursor.ts): forward one page, or back to the first. */
export function Pager({ page, nextCursor, first, next }: { page: number; nextCursor: string | null; first: () => void; next: (cursor: string) => void }) {
  return <HStack justify="between" align="center"><Text type="supporting">{page}페이지 · 서버 전체 건수는 집계하지 않습니다.</Text><HStack gap={2}><Button label="처음으로" isDisabled={page === 1} onClick={first} /><Button label="다음 페이지" isDisabled={!nextCursor} onClick={() => { if (nextCursor) next(nextCursor) }} /></HStack></HStack>
}
export function Modal({ title, close, busy = false, error = '', footer, children }: { title: string; close: () => void; busy?: boolean; error?: string; footer: ReactNode; children: ReactNode }) {
  const handleOpen = (open: boolean) => { if (!open && !busy) close() }
  // Dialog clips its body, so only LayoutContent scrolls; the footer keeps actions and their errors in view on short screens.
  return <Dialog isOpen onOpenChange={handleOpen} purpose={busy ? 'required' : 'form'} width="min(var(--admin-editor-width), calc(100vw - var(--spacing-8)))" maxHeight="90dvh"><Layout header={<DialogHeader title={title} onOpenChange={busy ? undefined : handleOpen} />} content={<LayoutContent><VStack gap={5}>{children}</VStack></LayoutContent>} footer={<LayoutFooter hasDivider><VStack gap={3}>{error && <Message error>{error}</Message>}{footer}</VStack></LayoutFooter>} /></Dialog>
}
/** A read-only dialog: nothing to save, one way out. */
export function Detail({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <Modal title={title} close={close} footer={<HStack justify="end"><Button label="닫기" onClick={close} /></HStack>}>{children}</Modal>
}
export function Confirm({ title, detail, label, action, close }: { title: string; detail: ReactNode; label: string; action: () => Promise<void>; close: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  return <Modal title={title} close={close} busy={busy} error={error} footer={<HStack justify="end" gap={2}><Button label="돌아가기" onClick={close} isDisabled={busy} /><Button label={label} variant="destructive" isLoading={busy} onClick={async () => { if (busy) return; setBusy(true); setError(''); try { await action(); close() } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) } }} /></HStack>}>{detail}</Modal>
}
