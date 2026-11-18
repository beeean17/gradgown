import { useState } from 'react'
import { Switch } from '@astryxdesign/core/Switch'
import { Confirm, Text } from '../shared/ui.tsx'

/**
 * The console's one write: a master opens or closes the applications of a gown period or a
 * St:talk event (docs/decisions/scope.md). Shown to a master only. If an admin's request got
 * here anyway, MySQL would refuse it and the dialog would show the server's 403.
 */
export function OpenSwitch({ subject, isOpen, save }: { subject: string; isOpen: boolean; save: (isOpen: boolean) => Promise<void> }) {
  const [pending, setPending] = useState<boolean | null>(null)
  return <>
    <Switch label="학생 접수 열기" description="실제 신청 가능 여부는 신청 기간과 함께 결정됩니다." value={isOpen} onChange={setPending} />
    {pending !== null && <Confirm title={pending ? '학생 접수를 열까요?' : '학생 접수를 닫을까요?'} label={pending ? '접수 열기' : '접수 닫기'} detail={<Text>{subject} · 접수: {isOpen ? '열림' : '닫힘'} → {pending ? '열림' : '닫힘'}. 학생 화면에 바로 영향을 줍니다.</Text>} close={() => setPending(null)} action={() => save(pending)} />}
  </>
}
