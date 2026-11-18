import { useState, type ReactNode } from 'react'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { Text } from '@astryxdesign/core/Text'
import type { TermsDocument } from '../../content/terms'
import type { TermsAgreement } from './agreement'
import { TermsViewer } from './TermsDialog'

export interface ConsentControl {
  /** The documents this flow asks for, in order. */
  documents: TermsDocument[]
  agreement: TermsAgreement
  onChange: (next: TermsAgreement) => void
}

/**
 * The consents on the step itself: "모두 동의해요" over one row per document —
 * its own checkbox, the line it commits to ("분실 시 15만 원 변상") and 보기,
 * which opens that document alone (TermsViewer). Each consent is given where
 * it is read about, and a privacy consent is never folded out of sight.
 */
export function ConsentList({ consent }: { consent: ConsentControl }) {
  const { documents, agreement, onChange } = consent
  const [viewing, setViewing] = useState<TermsDocument | null>(null)
  const all = documents.every((doc) => agreement[doc.id])
  const some = documents.some((doc) => agreement[doc.id])
  const setAll = (checked: boolean) => onChange(Object.fromEntries(documents.map((doc) => [doc.id, checked])))

  return (
    <div className="flex flex-col gap-2">
      <CheckboxInput label="모두 동의해요" value={all ? true : some ? 'indeterminate' : false} onChange={setAll} width="100%" />
      <ul className="m-0 flex list-none flex-col gap-1.5 border-t border-border p-0 ps-7 pt-2">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-start gap-3">
            <div className="min-w-0 flex-1 break-keep">
              <CheckboxInput
                label={`${doc.title} ${doc.isRequired ? '(필수)' : '(선택)'}`}
                description={doc.summary}
                value={Boolean(agreement[doc.id])}
                onChange={(checked) => onChange({ ...agreement, [doc.id]: checked })}
                width="100%"
                size="sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setViewing(doc)}
              aria-label={`${doc.title} 보기`}
              className="shrink-0 cursor-pointer rounded-[var(--radius-inner)] py-0.5 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            >
              <Text type="supporting" size="sm" color="accent">
                보기
              </Text>
            </button>
          </li>
        ))}
      </ul>
      <TermsViewer document={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

/**
 * The final decision in a wide terms step's summary rail. The surrounding
 * surface gives the decision enough visual weight to stand apart from the
 * informational cards above it. Phones use ConsentList in a FlowBottomBar.
 */
export function ConsentCard({ consent, actions }: { consent: ConsentControl; actions: ReactNode }) {
  const isSelected = consent.documents.every((doc) => consent.agreement[doc.id])
  return (
    <section
      aria-label="필수 약관 동의"
      className={`flex flex-col gap-3 rounded-xl border p-4.5 transition-[background-color,border-color] duration-200 motion-reduce:transition-none ${
        isSelected
          ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_9%,var(--color-reservation-neutral-surface))]'
          : 'border-[var(--color-reservation-neutral-border)] bg-[var(--color-reservation-neutral-surface)]'
      }`}
    >
      <ConsentList consent={consent} />
      {actions}
    </section>
  )
}
