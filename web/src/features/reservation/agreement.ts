import { RESERVATION_TERMS } from '../../shared/content/terms'
import {
  emptyAgreement as emptyAgreementFor,
  isAgreementComplete as isAgreementCompleteFor,
  type TermsAgreement,
} from '../../shared/ui/flow/agreement'

export type { TermsAgreement }

export const emptyAgreement: TermsAgreement = emptyAgreementFor(RESERVATION_TERMS)

/** Every required consent given — the gate the flow's first step guards. */
export function isAgreementComplete(agreement: TermsAgreement): boolean {
  return isAgreementCompleteFor(RESERVATION_TERMS, agreement)
}
