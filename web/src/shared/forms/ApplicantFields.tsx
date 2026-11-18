import { VStack } from '@astryxdesign/core/Stack'
import { TextInput } from '@astryxdesign/core/TextInput'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'

export interface ApplicantValues {
  name: string
  studentId: string
  major: string
  email: string
  phone: string
  consent: boolean
}

export type ApplicantErrors = Partial<Record<keyof ApplicantValues, string>>

export const emptyApplicant: ApplicantValues = {
  name: '',
  studentId: '',
  major: '',
  email: '',
  phone: '',
  consent: false,
}

function status(message?: string) {
  return message ? ({ type: 'error', message } as const) : undefined
}

/**
 * Applicant fields shared by reservation and lecture registration
 * (shared-ui.md "신청 폼"). Pure UI: it owns no submit logic and knows no
 * feature schema — the parent controls value/onChange/errors.
 */
export function ApplicantFields({
  value,
  onChange,
  errors = {},
  showMajor = true,
  showConsent = true,
}: {
  value: ApplicantValues
  onChange: (next: ApplicantValues) => void
  errors?: ApplicantErrors
  showMajor?: boolean
  /** Off when the flow already collected consent in its own step. */
  showConsent?: boolean
}) {
  const set = <K extends keyof ApplicantValues>(key: K, v: ApplicantValues[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <VStack gap={4}>
      <TextInput label="이름" isRequired value={value.name} onChange={(v) => set('name', v)} status={status(errors.name)} placeholder="홍길동" />
      <TextInput label="학번" isRequired value={value.studentId} onChange={(v) => set('studentId', v)} status={status(errors.studentId)} placeholder="20201234" />
      {showMajor && (
        <TextInput label="학과" isRequired value={value.major} onChange={(v) => set('major', v)} status={status(errors.major)} placeholder="컴퓨터공학과" />
      )}
      <TextInput label="이메일" type="email" isRequired value={value.email} onChange={(v) => set('email', v)} status={status(errors.email)} placeholder="you@example.com" />
      <TextInput label="연락처" isRequired value={value.phone} onChange={(v) => set('phone', v)} status={status(errors.phone)} placeholder="010-1234-5678" />
      {showConsent && (
        <CheckboxInput
          label="개인정보 수집 및 이용에 동의합니다."
          description="이름·학번·연락처는 신청 처리 목적에만 사용돼요."
          value={value.consent}
          onChange={(checked) => set('consent', checked)}
        />
      )}
    </VStack>
  )
}
