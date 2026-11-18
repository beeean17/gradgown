import { Dialog } from '@astryxdesign/core/Dialog'
import { Heading } from '@astryxdesign/core/Heading'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import type { TermsDocument } from '../../content/terms'

/**
 * One consent document, read-only, in a single scroll: the 보기 beside its
 * checkbox. The checkboxes themselves stay on the step, so nothing is agreed
 * to in here and 닫기 can't leave a consent in doubt.
 *
 * Body lines: "## " starts a part ("대여 규정"), "제n조" an article — both set
 * as headings so the levels read; everything else is plain text.
 */
export function TermsViewer({
  document: doc,
  onClose,
}: {
  document: TermsDocument | null
  onClose: () => void
}) {
  return (
    <Dialog
      isOpen={doc !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      purpose="info"
      aria-label={doc?.title ?? '약관'}
      width="min(40rem, calc(100vw - 2rem))"
      maxHeight="85vh"
      padding={5}
    >
      {doc && (
        <div className="flex max-h-[calc(85vh-2.5rem)] flex-col gap-4">
          <Heading level={2} className="text-lg">
            {doc.title} {doc.isRequired ? '(필수)' : '(선택)'}
          </Heading>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pe-1">
            {doc.body.split('\n').map((line, index) =>
              line.startsWith('## ') ? (
                <Text key={index} type="label" weight="bold" display="block" className={`text-base ${index > 0 ? 'mt-4' : ''}`}>
                  {line.slice(3)}
                </Text>
              ) : /^제\d+조/.test(line) ? (
                <Text key={index} type="supporting" weight="bold" display="block" className="mt-2">
                  {line}
                </Text>
              ) : line.trim() ? (
                <Text key={index} type="supporting" color="secondary" display="block" className="text-pretty">
                  {line}
                </Text>
              ) : null,
            )}
          </div>
          <div className="flex flex-none justify-end">
            <Button label="닫기" variant="primary" onClick={onClose} />
          </div>
        </div>
      )}
    </Dialog>
  )
}
