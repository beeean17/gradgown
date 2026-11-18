import type { TermsDocument } from '../../content/terms'

/** Which consents the user has given, keyed by document id. */
export type TermsAgreement = Record<string, boolean>

export function emptyAgreement(documents: TermsDocument[]): TermsAgreement {
  return Object.fromEntries(documents.map((t) => [t.id, false]))
}

/** Every required consent given — the gate a flow's first step guards. */
export function isAgreementComplete(documents: TermsDocument[], agreement: TermsAgreement): boolean {
  return documents.every((t) => !t.isRequired || agreement[t.id])
}
