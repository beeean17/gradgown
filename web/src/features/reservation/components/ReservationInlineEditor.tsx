import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/Stack'
import { BriefList } from '../../../shared/ui/flow/BriefList'
import { PairedActions } from '../../../shared/ui/PairedActions'
import type { MyReservationEditorController } from '../useMyReservationsView'
import { PROXY_BRIEF } from '../content/guide'
import { ReservationApplicantFields } from './ApplicantStep'
import { ScheduleSelectionFields } from './ScheduleStep'

const PICKUP_LOCATION = '제1학생회관 3층 320호'

export function ReservationInlineEditor({
  editor,
  externalActions = false,
}: {
  editor: MyReservationEditorController
  externalActions?: boolean
}) {
  return (
    <section aria-labelledby="reservation-edit-heading">
      {/* Inside 내 신청 the card's own heading names the edit already. */}
      {!externalActions && (
        <header className="border-b border-border pb-4">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-accent">예약 변경</p>
          <h2 id="reservation-edit-heading" className="mb-0 mt-2 text-2xl font-bold tracking-tight text-primary">
            예약 내용을 변경해 주세요
          </h2>
          <p className="mb-0 mt-2 text-sm leading-relaxed text-secondary">
            저장하기 전까지 기존 예약은 그대로예요.
          </p>
        </header>
      )}

      <section className={externalActions ? 'pb-6' : 'py-6'}>
        <ScheduleSelectionFields
          size={editor.size}
          onSizeChange={editor.onSizeChange}
          rentDays={editor.rentDays}
          rentDayIndex={editor.rentDayIndex}
          onRentDayChange={editor.onRentDayChange}
          rentSlotId={editor.rentSlotId}
          onRentSlotChange={editor.onRentSlotChange}
          returnDays={editor.returnDays}
          returnDayIndex={editor.returnDayIndex}
          onReturnDayChange={editor.onReturnDayChange}
          returnSlotId={editor.returnSlotId}
          onReturnSlotChange={editor.onReturnSlotChange}
          location={PICKUP_LOCATION}
          sizeDescription="사이즈표를 보고 바꿀 사이즈를 골라 주세요"
          initialTarget="rent"
        />
      </section>

      <aside className={externalActions ? 'border-y border-border py-3' : 'rounded-xl border border-[var(--color-reservation-neutral-border)] bg-[var(--color-reservation-neutral-surface)] p-4.5'}>
        <Text type="supporting" color="secondary" display="block" className="leading-relaxed">
          수령 시간을 바꾸면 반납 시간을 다시 확인해 주세요. 반납은 수령과 같은 시간 또는 이후 시간만 고를 수 있어요.
        </Text>
      </aside>

      {/* The details on the reservation, changeable like the slots: the
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
        <ReservationApplicantFields
          values={editor.applicant}
          onChange={editor.onApplicantChange}
          errors={editor.applicantErrors}
        />
        {editor.applicant.isProxy && <BriefList title="대리 수령" items={PROXY_BRIEF} />}
      </section>

      {/* In a card the error sits by the actions (EditorCard), which stay on screen. */}
      {!externalActions && editor.error && (
        <p className="mb-0 mt-4 text-sm font-semibold text-[var(--color-text-red)]" role="alert">
          {editor.error}
        </p>
      )}

      {!externalActions && (
        <footer className="mt-6 w-full sm:ml-auto sm:max-w-[var(--reservation-actions-max-w)]">
          <ReservationEditorActions editor={editor} />
        </footer>
      )}
    </section>
  )
}

export function ReservationEditorActions({ editor }: { editor: MyReservationEditorController }) {
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
