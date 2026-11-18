import { isCompleteStudentId } from '../../shared/forms/inputFormatting'
import { isCompletePhone } from '../../shared/lib/phone'

/**
 * The applicant's details on a gown reservation: entered in the flow's second
 * step and changeable afterwards from 내 신청, with the same fields and rules.
 */
export interface ReservationApplicant {
  name: string
  studentId: string
  department: string
  phone: string
  isProxy: boolean
  proxyName: string
  proxyPhone: string
}

export type ApplicantInputErrors = Partial<Record<Exclude<keyof ReservationApplicant, 'isProxy'>, string>>

export const PHONE_LENGTH_ERROR = '전화번호를 자릿수에 맞게 입력해 주세요. (010 번호는 11자리)'

export function validateReservationApplicant(applicant: ReservationApplicant): ApplicantInputErrors {
  const errors: ApplicantInputErrors = {}
  if (!applicant.name.trim()) errors.name = '이름을 입력해 주세요.'
  if (!isCompleteStudentId(applicant.studentId)) errors.studentId = '학번 8자리를 입력해 주세요.'
  if (!applicant.department.trim()) errors.department = '학과를 입력해 주세요.'
  if (!isCompletePhone(applicant.phone)) errors.phone = PHONE_LENGTH_ERROR
  if (applicant.isProxy && !applicant.proxyName.trim()) errors.proxyName = '대리 수령자 이름을 입력해 주세요.'
  if (applicant.isProxy && !isCompletePhone(applicant.proxyPhone)) errors.proxyPhone = PHONE_LENGTH_ERROR
  return errors
}

/** Whether two sets of details differ in anything that would be saved. */
export function applicantChanged(a: ReservationApplicant, b: ReservationApplicant): boolean {
  const proxy = (x: ReservationApplicant) => (x.isProxy ? [x.proxyName.trim(), x.proxyPhone.trim()] : ['', ''])
  return (
    a.name.trim() !== b.name.trim() ||
    a.studentId.trim() !== b.studentId.trim() ||
    a.department.trim() !== b.department.trim() ||
    a.phone.trim() !== b.phone.trim() ||
    a.isProxy !== b.isProxy ||
    proxy(a).join('\n') !== proxy(b).join('\n')
  )
}
