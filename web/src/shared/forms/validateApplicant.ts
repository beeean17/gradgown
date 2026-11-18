import type { ApplicantValues, ApplicantErrors } from './ApplicantFields'
import { isCompletePhone } from '../lib/phone'

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Client-side validation for the shared applicant fields. */
export function validateApplicant(
  v: ApplicantValues,
  opts: { requireMajor?: boolean; requireConsent?: boolean } = {},
): ApplicantErrors {
  const { requireMajor = false, requireConsent = true } = opts
  const e: ApplicantErrors = {}
  if (!v.name.trim()) e.name = '이름을 입력해 주세요.'
  if (!v.studentId.trim()) e.studentId = '학번을 입력해 주세요.'
  if (requireMajor && !v.major.trim()) e.major = '학과를 입력해 주세요.'
  if (!EMAIL.test(v.email.trim())) e.email = '올바른 이메일을 입력해 주세요.'
  if (!isCompletePhone(v.phone)) e.phone = '연락처를 자릿수에 맞게 입력해 주세요.'
  // A flow that collects consent in its own step hides this field; validating
  // it anyway would block the user with an error they cannot see or fix.
  if (requireConsent && !v.consent) e.consent = '개인정보 수집에 동의해 주세요.'
  return e
}

export function hasErrors(e: ApplicantErrors): boolean {
  return Object.keys(e).length > 0
}
