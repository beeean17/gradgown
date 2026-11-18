import { useCallback, useState } from 'react'
import { TextInput } from '@astryxdesign/core/TextInput'
import { TextArea } from '@astryxdesign/core/TextArea'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { List, ListItem } from '@astryxdesign/core/List'
import type { AdminApi, ReservationSettings, TestingKind, TestingSettings } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { displayDate, errorMessage, fromLocalInput, toLocalInput } from '../data/format.ts'
import { VStack, HStack, Heading, Text, Button, PageHeader, Loaded, Message, DateField, Confirm } from '../shared/ui.tsx'
import { useCan } from '../auth/access.ts'

export function SettingsPage({ api }: { api: AdminApi }) {
  const settings = useLoad(useCallback(() => api.getSettings(), [api]))
  const testing = useLoad(useCallback(() => api.getTesting(), [api]))
  const editable = useCan()('settings.write')
  return <VStack gap={6}><PageHeader title="접수 설정" description="현재 회차와 신청·수정 기간, 날짜별 시간표를 관리합니다." />
    <Message>{editable ? '현재 운영 설정 한 문서를 편집합니다. 회차 변경은 기존 예약을 이동하거나 삭제하지 않습니다.' : '접수 설정 변경은 마스터 관리자만 할 수 있습니다.'}</Message>
    <Loaded state={settings.state} retry={settings.refresh}>{value => <SettingsForm key={value?.version || 'new'} api={api} initial={value} editable={editable} saved={settings.refresh} />}</Loaded>
    <Heading level={2}>테스트 허용</Heading><Text color="secondary">기간 외 접근을 허용할 UID를 관리합니다. 테스트 사용자도 접수 열림(isOpen)이 필요합니다.</Text>
    <Loaded state={testing.state} retry={testing.refresh}>{value => <TestingForm key={value?.version || 'new'} api={api} initial={value} editable={editable} saved={testing.refresh} />}</Loaded>
  </VStack>
}
function SettingsForm({ api, initial, editable, saved }: { api: AdminApi; initial: ReservationSettings | null; editable: boolean; saved: () => void }) {
  const [periodId, setPeriod] = useState(initial?.periodId || ''), [open, setOpen] = useState(initial?.isOpen || false)
  const [createStart, setCreateStart] = useState(toLocalInput(initial?.createPeriod.startsAt || '')), [createEnd, setCreateEnd] = useState(toLocalInput(initial?.createPeriod.endsAt || ''))
  const [editStart, setEditStart] = useState(toLocalInput(initial?.editPeriod.startsAt || '')), [editEnd, setEditEnd] = useState(toLocalInput(initial?.editPeriod.endsAt || ''))
  const [slots, setSlots] = useState(initial?.slotsByDate || {})
  const [slotStart, setSlotStart] = useState(''), [slotEnd, setSlotEnd] = useState('')
  const [error, setError] = useState(''), [pending, setPending] = useState<ReservationSettings | null>(null)
  // Leaving a round hides its live reservations from students; the server asks for this when any remain.
  const [periodChangeConfirmed, setPeriodChangeConfirmed] = useState(false)
  const leavingPeriod = initial?.periodId && pending && pending.periodId !== initial.periodId ? initial.periodId : ''
  function addSlot() {
    try {
      const startsAt = fromLocalInput(slotStart), endsAt = fromLocalInput(slotEnd), day = slotStart.slice(0, 10)
      if (startsAt >= endsAt || slotEnd.slice(0, 10) !== day) throw new Error('같은 날짜 안에서 시작보다 늦은 종료 시각을 선택해 주세요.')
      const id = `${slotStart.slice(11).replace(':', '')}-${slotEnd.slice(11).replace(':', '')}`
      if (slots[day]?.slots.some(s => s.id === id)) throw new Error('동일한 슬롯이 있습니다.')
      setSlots(old => ({ ...old, [day]: { date: day, slots: [...(old[day]?.slots || []), { id, startsAt, endsAt, enabled: true }] } })); setError('')
    } catch (e) { setError(errorMessage(e)) }
  }
  return <fieldset disabled={!editable} className="contents"><VStack gap={5} maxWidth="var(--admin-content-width)">
    <HStack gap={4} align="end" wrap="wrap"><TextInput label="현재 회차" value={periodId} onChange={setPeriod} placeholder="YYYY-MM" isRequired /><CheckboxInput label="학생 접수 열기" value={open} onChange={setOpen} description="실제 신청 가능 여부는 아래 기간 조건과 함께 결정됩니다." /></HStack>
    <VStack gap={4} className="grid md:grid-cols-2"><DateField label="신청 시작" value={createStart} onChange={setCreateStart} /><DateField label="신청 종료" value={createEnd} onChange={setCreateEnd} /><DateField label="수정 시작" value={editStart} onChange={setEditStart} /><DateField label="수정 종료" value={editEnd} onChange={setEditEnd} /></VStack>
    <Text type="supporting">학생의 수정은 신청 기간 또는 수정 기간에 허용됩니다. 시작·종료 시각과 정확히 같은 순간은 현재 Rules상 제외됩니다.</Text>
    <Heading level={2}>대여 시간표</Heading><Text color="secondary">슬롯은 선택 가능한 시간이며 재고나 정원을 의미하지 않습니다.</Text>
    <List hasDividers header={<Text type="supporting">등록된 시간표</Text>}>{Object.entries(slots).sort(([a], [b]) => a.localeCompare(b)).flatMap(([day, group]) => group.slots.map(slot => <ListItem key={`${day}_${slot.id}`} label={`${day} · ${slot.id}`} description={`${displayDate(slot.startsAt)} — ${displayDate(slot.endsAt)}`} startContent={<CheckboxInput label={`${day} ${slot.id} 사용`} isLabelHidden value={slot.enabled} onChange={enabled => setSlots(old => ({ ...old, [day]: { ...old[day], slots: old[day].slots.map(s => s.id === slot.id ? { ...s, enabled } : s) } }))} />} endContent={editable && <Button label="슬롯 제거" size="sm" variant="ghost" onClick={() => setSlots(old => { const next = { ...old, [day]: { ...old[day], slots: old[day].slots.filter(s => s.id !== slot.id) } }; if (!next[day].slots.length) delete next[day]; return next })} />} />))}</List>
    {editable && <HStack gap={3} wrap="wrap" align="end"><DateField label="추가 슬롯 시작" value={slotStart} onChange={setSlotStart} /><DateField label="추가 슬롯 종료" value={slotEnd} onChange={setSlotEnd} /><Button label="시간표에 추가" onClick={addSlot} /></HStack>}
    {error && <Message error>{error}</Message>}
    {editable && <HStack justify="end"><Button label="접수 설정 검토" variant="primary" onClick={() => { try { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodId)) throw new Error('회차를 YYYY-MM 형식으로 입력해 주세요.'); setPending({ version: initial?.version || '', periodId, isOpen: open, createPeriod: { startsAt: fromLocalInput(createStart), endsAt: fromLocalInput(createEnd) }, editPeriod: { startsAt: fromLocalInput(editStart), endsAt: fromLocalInput(editEnd) }, slotsByDate: slots }); setPeriodChangeConfirmed(false); setError('') } catch (e) { setError(errorMessage(e)) } }} /></HStack>}
    {pending && <Confirm title="현재 접수 설정을 변경할까요?" label="확인 후 설정 저장" close={() => setPending(null)} detail={<VStack gap={2}><Text>회차: {initial?.periodId || '미등록'} → {periodId}</Text><Text>접수: {initial?.isOpen ? '열림' : '닫힘'} → {open ? '열림' : '닫힘'}</Text><Text>신청 {displayDate(pending.createPeriod.startsAt)} — {displayDate(pending.createPeriod.endsAt)}</Text><Text>수정 {displayDate(pending.editPeriod.startsAt)} — {displayDate(pending.editPeriod.endsAt)}</Text><Text>슬롯 {Object.values(slots).reduce((n, group) => n + group.slots.length, 0)}개. 학생 화면에 바로 영향을 줍니다.</Text>{leavingPeriod && <VStack gap={2}><Message>회차를 바꾸면 {leavingPeriod} 회차 예약은 학생의 내 예약 화면에서 사라지고, 학생이 변경·취소할 수 없습니다.</Message><CheckboxInput label={`${leavingPeriod} 회차 예약이 학생 화면에서 사라지는 것을 확인했습니다`} value={periodChangeConfirmed} onChange={setPeriodChangeConfirmed} /></VStack>}</VStack>} action={async () => { await api.command({ action: 'settings.save', version: initial?.version || '', input: pending, ...(leavingPeriod && periodChangeConfirmed ? { confirmPeriodChange: leavingPeriod } : {}) }); saved() }} />}
  </VStack></fieldset>
}
/** Reused by the St:talk settings page with `kind="mentoring"` (settings_private/mentoring_testing). */
export function TestingForm({ api, initial, editable, saved, kind = 'reservation' }: { api: AdminApi; initial: TestingSettings | null; editable: boolean; saved: () => void; kind?: TestingKind }) {
  const [enabled, setEnabled] = useState(initial?.enabled || false), [uids, setUids] = useState(Object.keys(initial?.allowedUserIds || {}).join('\n')), [expiry, setExpiry] = useState(toLocalInput(initial?.expiresAt || ''))
  const [pending, setPending] = useState<TestingSettings | null>(null), [error, setError] = useState('')
  return <fieldset disabled={!editable} className="contents"><VStack gap={4}><CheckboxInput label="기간 외 테스트 허용" value={enabled} onChange={setEnabled} /><TextArea label="허용할 사용자 UID" description="한 줄에 한 UID. 관리자 권한을 부여하는 목록이 아닙니다." value={uids} onChange={setUids} /><DateField label="테스트 만료" value={expiry} onChange={setExpiry} />{error && <Message error>{error}</Message>}{editable && <HStack justify="end"><Button label="테스트 설정 검토" onClick={() => { try { setPending({ version: initial?.version || '', enabled, expiresAt: fromLocalInput(expiry), allowedUserIds: Object.fromEntries(uids.split('\n').map(s => s.trim()).filter(Boolean).map(uid => [uid, true])) }); setError('') } catch (e) { setError(errorMessage(e)) } }} /></HStack>}{pending && <Confirm title="테스트 허용 설정을 저장할까요?" detail={<Text>{pending.enabled ? '활성화' : '비활성화'} · {Object.keys(pending.allowedUserIds).length}명 · {displayDate(pending.expiresAt)} 만료</Text>} label="테스트 설정 저장" close={() => setPending(null)} action={async () => { await api.command({ action: 'testing.save', ...(kind === 'mentoring' ? { kind } : {}), version: initial?.version || '', input: pending }); saved() }} />}</VStack></fieldset>
}
