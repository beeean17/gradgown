import { useState } from 'react'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Selector } from '@astryxdesign/core/Selector'
import type { MentoringInput, MentoringRegistration } from '../contracts/admin-view.ts'
import { displayDate, errorMessage } from '../data/format.ts'
import { MENTORING_NONE, MENTORING_STATUS_LABELS, optionLabel, optionNumbers } from '../data/mentoring.ts'
import { VStack, HStack, Text, Button, Heading, Modal, Message, Token } from '../shared/ui.tsx'

// MNT-56: detail, change and manual registration. The server re-checks every
// field and the selection rule (docs/contracts/mentoring-command.md).
export function MentoringEditor({ row, options, eventId, canEdit, save, close, saved, cancel, remove }: {
  row: MentoringRegistration | null; options: string[]; eventId: string; canEdit: boolean
  save: (input: MentoringInput, userId: string) => Promise<void>; close: () => void; saved: () => void
  cancel: (row: MentoringRegistration) => void; remove?: (row: MentoringRegistration) => void
}) {
  const named = (n: number) => n === MENTORING_NONE || Boolean(options[n - 1]?.trim())
  // A stored choice whose name is gone (closed draft) must be picked again.
  const keep = (n: number | null) => n !== null && named(n) ? n : null
  const [draft, setDraft] = useState({ name: row?.name || '', department: row?.department || '', studentId: row?.studentId || '', phone: row?.phone || '', grade: row?.grade ?? null as number | null, firstOption: keep(row ? row.firstOption : null), secondOption: keep(row ? row.secondOption : null) })
  const [userId, setUserId] = useState(row?.key.userId || ''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [review, setReview] = useState(false)
  const locked = !!row && (row.status !== 'reserved' || row.eventId !== eventId || !row.version), readOnly = !canEdit || locked
  const update = (patch: Partial<typeof draft>) => { setDraft(d => ({ ...d, ...patch })); setReview(false) }
  const choices = (other: number | null) => optionNumbers().map(n => ({ value: String(n), label: n === MENTORING_NONE ? optionLabel(options, n) : `${n}. ${optionLabel(options, n)}`, disabled: !named(n) || (n !== MENTORING_NONE && n === other) }))
  const submit = async () => {
    if (busy) return
    setError('')
    try {
      if (!userId.trim() || !draft.name.trim() || !draft.department.trim() || !draft.phone.trim()) throw new Error('사용자 UID와 신청자 정보를 모두 입력해 주세요.')
      if (!/^\d{8}$/.test(draft.studentId.trim())) throw new Error('학번은 숫자 8자리여야 합니다.')
      if (draft.grade === null) throw new Error('학년을 선택해 주세요.')
      if (draft.firstOption === null || draft.secondOption === null) throw new Error('1·2차시 선택지를 모두 골라 주세요.')
      if (draft.firstOption === draft.secondOption) throw new Error(draft.firstOption === MENTORING_NONE ? '두 차시 중 하나 이상은 선택해 주세요.' : '같은 선택지를 두 차시에 고를 수 없습니다.')
      if (!review) { setReview(true); return }
      setBusy(true)
      await save({ name: draft.name.trim(), department: draft.department.trim(), studentId: draft.studentId.trim(), grade: draft.grade, phone: draft.phone.trim(), firstOption: draft.firstOption, secondOption: draft.secondOption }, userId.trim())
      saved()
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  const status = row && <Token label={MENTORING_STATUS_LABELS[row.status]} color={row.status === 'reserved' ? 'blue' : row.status === 'unknown' ? 'orange' : 'gray'} size="sm" />
  return <Modal title={row ? 'St:talk 신청 상세' : 'St:talk 수동 신청 추가'} close={close} busy={busy} error={error} footer={<HStack gap={2} justify="between" wrap="wrap">
    <HStack gap={2} align="center" wrap="wrap">{!canEdit ? <Text type="supporting">신청 변경은 마스터 관리자만 할 수 있습니다.</Text> : row?.status === 'reserved' && row.version && row.eventId === eventId ? <Button label="신청 취소" variant="ghost" isDisabled={busy} onClick={() => cancel(row)} /> : <Text type="supporting">서버에서 입력값과 변경 버전을 다시 검사합니다.</Text>}{remove && row?.version && !review && <Button label="영구 삭제" variant="destructive" isDisabled={busy} onClick={() => remove(row)} />}</HStack>
    <HStack gap={2}><Button label={review ? '입력으로 돌아가기' : '닫기'} isDisabled={busy} onClick={() => review ? setReview(false) : close()} />{!readOnly && <Button label={review ? '확인 후 저장' : '변경 내용 확인'} variant="primary" isLoading={busy} onClick={submit} />}</HStack>
  </HStack>}>
    {row && <HStack gap={3} wrap="wrap" align="center">{status}<Text type="supporting">{row.eventId || '행사 확인 필요'} · 신청 {displayDate(row.createdAt)} · 수정 {displayDate(row.modifiedAt)}</Text></HStack>}
    {row?.warnings.length ? <Message>{row.warnings.join(' · ')}</Message> : null}
    {canEdit && locked && <Message>현재 행사({eventId})의 신청 완료 항목만 편집할 수 있습니다.</Message>}
    {review ? <VStack gap={3}><Heading level={2}>변경 내용을 확인해 주세요</Heading>
      <Text>{[draft.name, draft.department, draft.studentId, draft.grade && `${draft.grade}학년`, draft.phone].filter(Boolean).join(' · ')}</Text>
      <Text>1차시 {optionLabel(options, draft.firstOption)} · 2차시 {optionLabel(options, draft.secondOption)}</Text>
      {row && <Text type="supporting">이전: {row.name} · 1차시 {optionLabel(options, row.firstOption)} · 2차시 {optionLabel(options, row.secondOption)}</Text>}
      {!row && <Text type="supporting">신청 기간과 관계없이 {eventId} 행사에 추가합니다. 이메일은 대상 계정의 것을 서버가 넣습니다.</Text>}
    </VStack> : <fieldset disabled={busy || readOnly} className="contents"><VStack gap={4}>
      <TextInput label="신청 대상 사용자 UID" value={userId} onChange={setUserId} isDisabled={!!row} description="UID 검색에서 계정을 확인하세요. Auth 계정이 있는 사용자에게만 추가할 수 있습니다." />
      {row && <Text type="supporting">이메일 {row.email || '없음'}</Text>}
      <VStack gap={4} className="grid md:grid-cols-2">
        <TextInput label="이름" value={draft.name} onChange={name => update({ name })} isRequired />
        <TextInput label="학과" value={draft.department} onChange={department => update({ department })} isRequired />
        <TextInput label="학번" value={draft.studentId} onChange={studentId => update({ studentId })} placeholder="숫자 8자리" isRequired />
        <Selector label="학년" value={draft.grade === null ? '' : String(draft.grade)} onChange={value => update({ grade: Number(value) })} options={[1, 2, 3, 4].map(n => ({ value: String(n), label: `${n}학년` }))} isRequired />
        <TextInput label="전화번호" value={draft.phone} onChange={phone => update({ phone })} isRequired />
      </VStack>
      <VStack gap={4} className="grid md:grid-cols-2">
        <Selector label="1차시" value={draft.firstOption === null ? '' : String(draft.firstOption)} onChange={value => update({ firstOption: Number(value) })} options={choices(draft.secondOption)} isRequired />
        <Selector label="2차시" value={draft.secondOption === null ? '' : String(draft.secondOption)} onChange={value => update({ secondOption: Number(value) })} options={choices(draft.firstOption)} isRequired />
      </VStack>
      <Text type="supporting">다른 차시에서 고른 선택지와 이름이 없는 선택지는 고를 수 없습니다. 두 차시 모두 "선택 안함"은 안 됩니다.</Text>
    </VStack></fieldset>}
  </Modal>
}
