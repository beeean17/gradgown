import type { ReactNode } from 'react'
import { Text } from '@astryxdesign/core/Text'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { formatStudentId } from '../../../shared/forms/inputFormatting'
import { formatPhone } from '../../../shared/lib/phone'
import { ApplicantField } from '../../../shared/forms/ApplicantField'
import { FlowTitle } from '../../../shared/ui/flow/FlowTitle'
import { BriefList } from '../../../shared/ui/flow/BriefList'
import { FLOW_NAME, FLOW_STEPS } from '../flowSteps'
import { PROXY_BRIEF } from '../content/guide'
import type { ApplicantInputErrors, ReservationApplicant } from '../applicant'

export type { ApplicantInputErrors }

/**
 * The applicant's details and the proxy option: the flow's second step and
 * the 내 신청 editor use the same fields, so a change here reaches both.
 */
export function ReservationApplicantFields({
  values,
  onChange,
  errors,
}: {
  values: ReservationApplicant
  onChange: { [K in keyof ReservationApplicant]: (value: ReservationApplicant[K]) => void }
  errors: ApplicantInputErrors
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ApplicantField
          label="이름"
          value={values.name}
          onChange={onChange.name}
          placeholder="홍길동"
          error={errors.name}
        />
        <ApplicantField
          label="학번"
          value={values.studentId}
          onChange={(value) => onChange.studentId(formatStudentId(value))}
          placeholder="20201234"
          error={errors.studentId}
          inputMode="numeric"
        />
        <ApplicantField
          label="학과"
          value={values.department}
          onChange={onChange.department}
          placeholder="디자인학과"
          error={errors.department}
        />
        <ApplicantField
          label="전화번호"
          value={values.phone}
          onChange={(value) => onChange.phone(formatPhone(value))}
          placeholder="010-1234-5678"
          error={errors.phone}
          inputMode="tel"
          autoComplete="tel"
        />
      </div>

      <CheckboxInput
        label="대리 수령을 신청해요"
        description="예약한 다른 재학생이 대신 받을 때 체크하고, 그 사람의 이름과 전화번호를 적어 주세요."
        value={values.isProxy}
        onChange={onChange.isProxy}
        width="100%"
      />

      {values.isProxy && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ApplicantField
            label="대리 수령자 이름"
            value={values.proxyName}
            onChange={onChange.proxyName}
            placeholder="김대리"
            error={errors.proxyName}
          />
          <ApplicantField
            label="대리 수령자 전화번호"
            value={values.proxyPhone}
            onChange={(value) => onChange.proxyPhone(formatPhone(value))}
            placeholder="010-1234-5678"
            error={errors.proxyPhone}
            inputMode="tel"
          />
        </div>
      )}
    </>
  )
}

/** Step 2 collects personal details only for this reservation. */
export function ApplicantStep({
  name,
  onNameChange,
  studentId,
  onStudentIdChange,
  department,
  onDepartmentChange,
  phone,
  onPhoneChange,
  isProxy,
  onProxyChange,
  proxyName,
  onProxyNameChange,
  proxyPhone,
  onProxyPhoneChange,
  errors,
  isPrefilled = false,
  actions,
  onBack,
  onExit,
}: {
  name: string
  onNameChange: (value: string) => void
  studentId: string
  onStudentIdChange: (value: string) => void
  department: string
  onDepartmentChange: (value: string) => void
  phone: string
  onPhoneChange: (value: string) => void
  isProxy: boolean
  onProxyChange: (value: boolean) => void
  proxyName: string
  onProxyNameChange: (value: string) => void
  proxyPhone: string
  onProxyPhoneChange: (value: string) => void
  errors: ApplicantInputErrors
  /** The four details came from an earlier form: say so, so they get checked. */
  isPrefilled?: boolean
  actions: ReactNode
  /** A phone's way back and out (FlowTitle); wide screens use `actions`. */
  onBack?: () => void
  onExit?: () => void
}) {
  return (
    <div className="flex flex-col gap-6.5">
      <FlowTitle flowName={FLOW_NAME} step={2} totalSteps={FLOW_STEPS.length} stepName={FLOW_STEPS[1].nav} onBack={onBack} onExit={onExit} exitLabel="예약 나가기">
        신청자 정보를 입력해 주세요
      </FlowTitle>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_var(--rail-w)] lg:gap-[var(--rail-gap)]">
        <main className="flex min-w-0 flex-col gap-6.5">
          <section aria-label="신청자 정보" className="flex flex-col gap-4">
            {isPrefilled && (
              <Text type="supporting" color="secondary">
                이전에 입력한 내용을 채워 두었어요. 바뀐 것이 있으면 고쳐 주세요
              </Text>
            )}
            <ReservationApplicantFields
              values={{ name, studentId, department, phone, isProxy, proxyName, proxyPhone }}
              onChange={{
                name: onNameChange,
                studentId: onStudentIdChange,
                department: onDepartmentChange,
                phone: onPhoneChange,
                isProxy: onProxyChange,
                proxyName: onProxyNameChange,
                proxyPhone: onProxyPhoneChange,
              }}
              errors={errors}
            />
          </section>
        </main>

        <aside className="flex flex-col gap-4">
          {/* The proxy rules in one-liners, the same on every screen; the full
              wording is in the 대여 규정 document. */}
          <BriefList title="대리 수령" items={PROXY_BRIEF} />

          {actions}
        </aside>
      </div>
    </div>
  )
}
