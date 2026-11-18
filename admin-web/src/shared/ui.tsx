import { useEffect, useState, type ReactNode } from 'react'
import { VStack, HStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Banner } from '@astryxdesign/core/Banner'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Token } from '@astryxdesign/core/Token'
import { DateInput, type DateInputProps } from '@astryxdesign/core/DateInput'
import { TimeInput, type ISOTimeString } from '@astryxdesign/core/TimeInput'
import type { GownReservation, LoadState } from '../contracts/admin-view.ts'
import { errorMessage, fromLocalInput } from '../data/format.ts'

export { VStack, HStack, Heading, Text, Button, Banner, Token }
export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <HStack gap={4} justify="between" align="center" wrap="wrap"><VStack gap={2}><Text type="supporting" color="accent">GRAD42 / OPERATIONS</Text><Heading level={1}>{title}</Heading><Text color="secondary">{description}</Text></VStack>{actions}</HStack>
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
  const labels = { reserved: '예약 완료', cancelled: '취소', completed: '완료', unknown: '확인 필요' }
  return <Token label={labels[status]} color={status === 'reserved' ? 'blue' : status === 'unknown' ? 'orange' : 'gray'} size="sm" className="self-start" />
}
export function DateField({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [date, setDate] = useState(value.slice(0, 10)), [time, setTime] = useState(value.slice(11, 16))
  useEffect(() => { setDate(value.slice(0, 10)); setTime(value.slice(11, 16)) }, [value])
  let validDate: DateInputProps['value'], validTime: ISOTimeString | undefined
  try { if (date) { fromLocalInput(`${date}T00:00`); validDate = date as DateInputProps['value'] } } catch { /* Invalid legacy dates stay unselected. */ }
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) validTime = time as ISOTimeString
  return <VStack gap={1}><HStack gap={2} wrap="wrap" align="end">
    <DateInput label={`${label} 날짜`} value={validDate} onChange={next => { setDate(next || ''); onChange(next && time ? `${next}T${time}` : '') }} format="system_date" isDisabled={disabled} width="min(100%, var(--admin-date-width))" />
    <TimeInput label={`${label} 시각`} value={validTime} onChange={next => { setTime(next || ''); onChange(date && next ? `${date}T${next.slice(0, 5)}` : '') }} hourFormat="24h" isDisabled={disabled} width="var(--admin-time-width)" />
  </HStack><Text type="supporting">한국 시간 (Asia/Seoul)</Text></VStack>
}
export function Modal({ title, close, busy = false, error = '', footer, children }: { title: string; close: () => void; busy?: boolean; error?: string; footer: ReactNode; children: ReactNode }) {
  const handleOpen = (open: boolean) => { if (!open && !busy) close() }
  // Dialog clips its body, so only LayoutContent scrolls; the footer keeps actions and their errors in view on short screens.
  return <Dialog isOpen onOpenChange={handleOpen} purpose={busy ? 'required' : 'form'} width="min(var(--admin-editor-width), calc(100vw - var(--spacing-8)))" maxHeight="90dvh"><Layout header={<DialogHeader title={title} onOpenChange={busy ? undefined : handleOpen} />} content={<LayoutContent><VStack gap={5}>{children}</VStack></LayoutContent>} footer={<LayoutFooter hasDivider><VStack gap={3}>{error && <Message error>{error}</Message>}{footer}</VStack></LayoutFooter>} /></Dialog>
}
export function Confirm({ title, detail, label, action, close }: { title: string; detail: ReactNode; label: string; action: () => Promise<void>; close: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  return <Modal title={title} close={close} busy={busy} error={error} footer={<HStack justify="end" gap={2}><Button label="돌아가기" onClick={close} isDisabled={busy} /><Button label={label} variant="destructive" isLoading={busy} onClick={async () => { if (busy) return; setBusy(true); setError(''); try { await action(); close() } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) } }} /></HStack>}>{detail}</Modal>
}
