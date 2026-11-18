import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/Stack'
import type { MentoringEvent } from '../../../shared/types'
import { PairedActions } from '../../../shared/ui/PairedActions'
import type { MyMentoringEditorController } from '../useMyMentoringView'
import { MentoringApplicantFields } from './MentoringApplicantStep'
import { SessionSelectionFields } from './SessionStep'

/** In-page change (MNT-41): both sessions and the applicant's details. */
export function MentoringInlineEditor({
  event,
  editor,
  externalActions = false,
}: {
  event: MentoringEvent
  editor: MyMentoringEditorController
  externalActions?: boolean
}) {
  return (
    <section aria-labelledby="mentoring-edit-heading">
      {/* Inside 내 신청 the card's own heading names the edit already. */}
      {!externalActions && (
        <header className="border-b border-border pb-4">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-accent">신청 변경</p>
          <h2 id="mentoring-edit-heading" className="mb-0 mt-2 text-2xl font-bold tracking-tight text-primary">
            신청 내용을 변경해 주세요
          </h2>
          <p className="mb-0 mt-2 text-sm leading-relaxed text-secondary">
            저장하기 전까지 기존 신청은 그대로예요.
          </p>
        </header>
      )}

      <section className={externalActions ? 'pb-6' : 'py-6'}>
        <SessionSelectionFields event={event} value={editor.selection} onChange={editor.onSelectionChange} />
      </section>

      <aside
        className={
          externalActions
            ? 'border-y border-border py-3'
            : 'rounded-xl border border-[var(--color-reservation-neutral-border)] bg-[var(--color-reservation-neutral-surface)] p-4.5'
        }
      >
        <Text type="supporting" color="secondary" display="block" className="leading-relaxed">
          같은 선택지를 두 차시에 고를 수 없고, 두 차시 모두 "선택 안함"으로 저장할 수는 없어요.
        </Text>
      </aside>

      {/* The details on the registration, changeable like the sessions: the
          server takes the whole input on every update. */}
      <section aria-label="신청자 정보" className="mt-6.5 flex flex-col gap-4">
        <VStack gap={0.5}>
          <Text type="label" weight="bold" className="text-lg">
            신청자 정보
          </Text>
          <Text type="supporting" color="secondary">
            바뀐 것이 있으면 고쳐 주세요
          </Text>
        </VStack>
        <MentoringApplicantFields
          values={editor.applicant}
          onChange={editor.onApplicantChange}
          errors={editor.applicantErrors}
        />
      </section>

      {/* In a card the error sits by the actions (EditorCard), which stay on screen. */}
      {!externalActions && editor.error && (
        <p className="mb-0 mt-4 text-sm font-semibold text-[var(--color-text-red)]" role="alert">
          {editor.error}
        </p>
      )}

      {!externalActions && (
        <footer className="mt-6 w-full sm:ml-auto sm:max-w-[var(--reservation-actions-max-w)]">
          <MentoringEditorActions editor={editor} />
        </footer>
      )}
    </section>
  )
}

export function MentoringEditorActions({ editor }: { editor: MyMentoringEditorController }) {
  return (
    <PairedActions
      leading={{ label: '변경 취소', variant: 'secondary', isDisabled: editor.isSaving, onClick: editor.onCancel }}
      trailing={{
        label: '변경 저장',
        variant: 'primary',
        isDisabled: !editor.hasChanges,
        isLoading: editor.isSaving,
        onClick: editor.onSave,
      }}
    />
  )
}
