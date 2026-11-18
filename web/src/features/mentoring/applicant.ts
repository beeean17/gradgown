import { isCompleteStudentId } from '../../shared/forms/inputFormatting'
import { isCompletePhone } from '../../shared/lib/phone'

/**
 * Who is coming to St:talk: entered in the flow's second step and changeable
 * afterwards from 내 신청, with the same fields and rules.
 */
export interface MentoringApplicant {
  name: string
  studentId: string
  department: string
  /** `null` until chosen — and on an old registration that never had one. */
  grade: number | null
  phone: string
}

export type MentoringApplicantErrors = Partial<Record<keyof MentoringApplicant, string>>

export const PHONE_LENGTH_ERROR = '전화번호를 자릿수에 맞게 입력해 주세요. (010 번호는 11자리)'

export function validateMentoringApplicant(applicant: MentoringApplicant): MentoringApplicantErrors {
  const errors: MentoringApplicantErrors = {}
  if (!applicant.name.trim()) errors.name = '이름을 입력해 주세요.'
  if (!isCompleteStudentId(applicant.studentId)) errors.studentId = '학번 8자리를 입력해 주세요.'
  if (!applicant.department.trim()) errors.department = '학과를 입력해 주세요.'
  if (!applicant.grade) errors.grade = '학년을 선택해 주세요.'
  if (!isCompletePhone(applicant.phone)) errors.phone = PHONE_LENGTH_ERROR
  return errors
}

/** Whether two sets of details differ in anything that would be saved. */
export function mentoringApplicantChanged(a: MentoringApplicant, b: MentoringApplicant): boolean {
  return (
    a.name.trim() !== b.name.trim() ||
    a.studentId.trim() !== b.studentId.trim() ||
    a.department.trim() !== b.department.trim() ||
    a.grade !== b.grade ||
    a.phone.trim() !== b.phone.trim()
  )
}
