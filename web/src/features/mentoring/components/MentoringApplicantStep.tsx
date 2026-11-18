import type { ReactNode } from 'react'
import { Text } from '@astryxdesign/core/Text'
import { ApplicantField } from '../../../shared/forms/ApplicantField'
import { formatStudentId } from '../../../shared/forms/inputFormatting'
import { formatPhone } from '../../../shared/lib/phone'
import { ChoiceTile } from '../../../shared/ui/ChoiceTile'
import { FlowTitle } from '../../../shared/ui/flow/FlowTitle'
import { BriefList } from '../../../shared/ui/flow/BriefList'
import { FLOW_NAME, FLOW_STEPS } from '../flowSteps'
import { GRADES } from '../selection'
import type { MentoringApplicant, MentoringApplicantErrors } from '../applicant'

export type { MentoringApplicantErrors }

/** Which grade a student is in, with the one rule students ask about. */
export function GradeField({
  value,
  onChange,
  error,
}: {
  value: number | null
  onChange: (grade: number) => void
  error?: string
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1.5 p-0">
        <Text type="label">학년</Text>
      </legend>
      <div className="grid grid-cols-4 gap-2">
        {GRADES.map((grade) => (
          <ChoiceTile
            key={grade}
            isSelected={value === grade}
            onSelect={() => onChange(grade)}
            title={`${grade}학년`}
          />
        ))}
      </div>
      <Text type="supporting" size="sm" color="secondary" display="block">
        초과학기생은 4학년을 선택해 주세요.
      </Text>
      {error && (
        <Text
          type="supporting"
          size="xsm"
          weight="medium"
          className="self-end text-right text-[var(--color-text-red)]"
          role="alert"
        >
          {error}
        </Text>
      )}
    </fieldset>
  )
}



/**
 * The applicant's details: the flow's second step and the 내 신청 editor use
 * the same fields, so a change here reaches both.
 */
export function MentoringApplicantFields({
  values,
  onChange,
  errors,
}: {
  values: MentoringApplicant
  onChange: { [K in keyof MentoringApplicant]: (value: MentoringApplicant[K]) => void }
  errors: MentoringApplicantErrors
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ApplicantField label="이름" value={values.name} onChange={onChange.name} placeholder="홍길동" error={errors.name} />
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

      <GradeField value={values.grade} onChange={onChange.grade} error={errors.grade} />
    </>
  )
}

/** Step 2 (MNT-11): who is coming, so the mentor knows the group. */
export function MentoringApplicantStep({
  name,
  onNameChange,
  studentId,
  onStudentIdChange,
  department,
  onDepartmentChange,
  grade,
  onGradeChange,
  phone,
  onPhoneChange,
  errors,
  isPrefilled,
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
  grade: number | null
  onGradeChange: (value: number) => void
  phone: string
  onPhoneChange: (value: string) => void
  errors: MentoringApplicantErrors
  /** The fields came from an earlier form: say so, so they get checked. */
  isPrefilled: boolean
  actions: ReactNode
  /** A phone's way back and out (FlowTitle); wide screens use `actions`. */
  onBack?: () => void
  onExit?: () => void
}) {
  return (
    <div className="flex flex-col gap-6.5">
      <FlowTitle flowName={FLOW_NAME} step={2} totalSteps={FLOW_STEPS.length} stepName={FLOW_STEPS[1].nav} onBack={onBack} onExit={onExit} exitLabel="St:talk 신청 나가기">
        {isPrefilled ? '정보가 맞는지 확인해 주세요' : '신청자 정보를 입력해 주세요'}
      </FlowTitle>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_var(--rail-w)] lg:gap-[var(--rail-gap)]">
        <main className="flex min-w-0 flex-col gap-6.5">
          <section aria-label="신청자 정보" className="flex flex-col gap-4">
            {isPrefilled && (
              <Text type="supporting" color="secondary">
                이전에 신청한 내용을 채워 두었어요. 바뀐 것이 있으면 고쳐 주세요
              </Text>
            )}

            <MentoringApplicantFields
              values={{ name, studentId, department, grade, phone }}
              onChange={{
                name: onNameChange,
                studentId: onStudentIdChange,
                department: onDepartmentChange,
                grade: (value) => value !== null && onGradeChange(value),
                phone: onPhoneChange,
              }}
              errors={errors}
            />
          </section>
        </main>

        <aside className="flex flex-col gap-4">
          <BriefList
            title="입력 안내"
            items={['명단에 쓰이니 본인 이름·학번으로', '학년은 그룹 구성 안내에만 써요', '일정이 바뀌면 이 번호로 연락드려요']}
          />

          {actions}
        </aside>
      </div>
    </div>
  )
}
