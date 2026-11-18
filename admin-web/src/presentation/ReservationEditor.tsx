import { useState } from 'react'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Selector } from '@astryxdesign/core/Selector'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import type { GownReservation, ReservationInput, ReservationSettings } from '../contracts/admin-view.ts'
import { displayDate, errorMessage, fromLocalInput, toLocalInput } from '../data/format.ts'
import { VStack, HStack, Text, Button, Heading, Modal, Message, DateField, Status } from '../shared/ui.tsx'

export function ReservationEditor({ save, settings, row, canEdit, close, saved, cancel, remove }: { save: (input: ReservationInput, userId: string) => Promise<void>; settings: ReservationSettings; row: GownReservation | null; canEdit: boolean; close: () => void; saved: () => void; cancel: (r: GownReservation) => void; remove?: (r: GownReservation) => void }) {
  const [draft, setDraft] = useState<ReservationInput>(row || { name: '', studentId: '', department: '', phone: '', size: '', slotId: '', rentAt: '', returnAt: '', isProxy: false, proxyName: '', proxyPhone: '' })
  const [userId, setUserId] = useState(row?.key.userId || ''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [review, setReview] = useState(false)
  const [rentLocal, setRentLocal] = useState(toLocalInput(draft.rentAt)), [backLocal, setBackLocal] = useState(toLocalInput(draft.returnAt))
  const locked = !!row && (row.status !== 'reserved' || row.periodId !== settings.periodId || !row.version), readOnly = !canEdit || locked
  const slots = Object.entries(settings.slotsByDate).flatMap(([date, group]) => group.slots.filter(s => s.enabled).map(s => ({ ...s, value: `${date}_${s.id}`, label: `${date} · ${s.id}` })))
  const update = (key: keyof ReservationInput, value: string | boolean) => { setDraft(d => ({ ...d, [key]: value })); setReview(false) }
  const submit = async () => {
    if (busy) return
    setError('')
    try {
      const input = { ...draft, rentAt: fromLocalInput(rentLocal), returnAt: fromLocalInput(backLocal) }
      if (!userId || !input.name.trim() || !input.studentId.trim() || !input.phone.trim() || !input.size.trim() || !input.slotId) throw new Error('사용자 UID와 예약 필수 정보를 입력해 주세요.')
      // Same instant is allowed: students may pick one slot for pickup and return.
      if (input.rentAt > input.returnAt) throw new Error('반납 시각은 대여 시각과 같거나 이후여야 합니다.')
      if (!review) { setDraft(input); setReview(true); return }
      setBusy(true)
      await save(input, userId)
      saved()
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  return <Modal title={row ? '예약 상세' : '수동 예약 추가'} close={close} busy={busy} error={error} footer={<HStack gap={2} justify="between" wrap="wrap"><HStack gap={2} align="center" wrap="wrap">{!canEdit ? <Text type="supporting">예약 변경은 마스터 관리자만 할 수 있습니다.</Text> : row?.status === 'reserved' && row.version ? <Button label="예약 취소" variant="ghost" isDisabled={busy} onClick={() => cancel(row)} /> : <Text type="supporting">서버에서 입력값과 변경 버전을 다시 검사합니다.</Text>}{remove && row?.version && !review && <Button label="영구 삭제" variant="destructive" isDisabled={busy} onClick={() => remove(row)} />}</HStack><HStack gap={2}><Button label={review ? '입력으로 돌아가기' : '닫기'} isDisabled={busy} onClick={() => review ? setReview(false) : close()} />{!readOnly && <Button label={review ? '확인 후 저장' : '변경 내용 확인'} variant="primary" isLoading={busy} onClick={submit} />}</HStack></HStack>}>
    {row && <HStack gap={3} wrap="wrap" align="center"><Status status={row.status} /><Text type="supporting">{row.periodId} · 수정 {displayDate(row.modifiedAt)}</Text></HStack>}
    {row?.warnings.length ? <Message>{row.warnings.join(' · ')}</Message> : null}
    {canEdit && locked && <Message>현재 회차의 예약 상태 항목만 편집할 수 있습니다. 완료 상태의 수령·반납 처리 정책은 아직 지원하지 않습니다.</Message>}
    {review ? <VStack gap={3}><Heading level={2}>변경 내용을 확인해 주세요</Heading><Text>{[draft.name, draft.studentId, draft.department, draft.phone, draft.size].filter(Boolean).join(' · ')}</Text><Text>대여 {displayDate(draft.rentAt)} / 반납 {displayDate(draft.returnAt)}</Text><Text>{draft.isProxy ? `대리 수령: ${draft.proxyName} · ${draft.proxyPhone}` : '본인 수령'}</Text>{row && <Text type="supporting">이전: {row.name} · {row.size} · {displayDate(row.rentAt)} / {displayDate(row.returnAt)}</Text>}</VStack> : <fieldset disabled={busy || readOnly} className="contents"><VStack gap={4}>
      <TextInput label="예약 대상 사용자 UID" value={userId} onChange={setUserId} isDisabled={!!row} description="UID 검색에서 계정 상태를 확인하세요. 등록된 기존 사용자에게만 예약을 추가할 수 있습니다." />
      <VStack gap={4} className="grid md:grid-cols-2"><TextInput label="이름" value={draft.name} onChange={v => update('name', v)} isRequired /><TextInput label="학번" value={draft.studentId} onChange={v => update('studentId', v)} isRequired /><TextInput label="학과" value={draft.department} onChange={v => update('department', v)} /><TextInput label="연락처" value={draft.phone} onChange={v => update('phone', v)} isRequired /><TextInput label="사이즈" value={draft.size} onChange={v => update('size', v)} placeholder="예: S, M, L" isRequired /></VStack>
      <Selector label="대여 슬롯" value={draft.slotId} options={slots} onChange={v => { update('slotId', v); const slot = slots.find(s => s.value === v); if (slot) setRentLocal(toLocalInput(slot.startsAt)) }} isRequired />
      <VStack gap={4} className="grid md:grid-cols-2"><DateField label="대여" value={rentLocal} onChange={setRentLocal} /><DateField label="반납" value={backLocal} onChange={setBackLocal} /></VStack>
      <Text type="supporting">반납 시각은 운영 정책에 맞게 직접 확인합니다. 자동으로 계산하지 않습니다.</Text>
      <CheckboxInput label="대리 수령" value={draft.isProxy} onChange={v => update('isProxy', v)} />
      {draft.isProxy && <HStack gap={3} wrap="wrap"><TextInput label="대리인 이름" value={draft.proxyName} onChange={v => update('proxyName', v)} /><TextInput label="대리인 연락처" value={draft.proxyPhone} onChange={v => update('proxyPhone', v)} /></HStack>}
    </VStack></fieldset>}
  </Modal>
}
