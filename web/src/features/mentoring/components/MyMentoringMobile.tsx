import { useEffect, useRef } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { EditorCard } from '../../../shared/ui/EditorCard'
import { PairedActions } from '../../../shared/ui/PairedActions'
import { ProgramCard, type ProgramRow } from '../../../shared/ui/ProgramCard'
import { PROGRAM } from '../content/guide'
import { eventScheduleLines } from '../eventInfo'
import { campusMapUrl } from '../../../shared/lib/map'
import type { MyMentoringEditorController, MyMentoringViewModel } from '../useMyMentoringView'
import { EpicFolioNotice } from './EpicFolioNotice'
import { MentoringEditorActions, MentoringInlineEditor } from './MentoringInlineEditor'

interface MyMentoringMobileProps {
  view: MyMentoringViewModel
  editor: MyMentoringEditorController
  onOpenApply: () => void
  onBeginEdit: () => void
  onRequestCancel: () => void
  /** Inside the 내 신청 panel: a section heading instead of the page header. */
  embedded?: boolean
}

export function MyMentoringMobile({
  view,
  editor,
  onOpenApply,
  onBeginEdit,
  onRequestCancel,
  embedded = false,
}: MyMentoringMobileProps) {
  const isCancelled = view.status === 'cancelled'
  const headingRef = useRef<HTMLHeadingElement>(null)
  const wasEditing = useRef(editor.isOpen)

  useEffect(() => {
    if (wasEditing.current !== editor.isOpen) {
      headingRef.current?.focus({ preventScroll: true })
      wasEditing.current = editor.isOpen
    }
  }, [editor.isOpen])

  const shell = embedded ? '' : 'mx-auto max-w-2xl px-4 pb-8 pt-6 sm:px-6'

  // Changing the registration: the editor takes the card's place, its fields
  // scrolling inside it between the heading and save/cancel (EditorCard).
  if (editor.isOpen && view.event) {
    return (
      <section className={shell}>
        <EditorCard
          kicker={PROGRAM.name}
          title="신청 변경"
          titleRef={headingRef}
          description={view.eventTitle}
          actions={<MentoringEditorActions editor={editor} />}
          error={editor.error}
        >
          <MentoringInlineEditor event={view.event} editor={editor} externalActions />
        </EditorCard>
      </section>
    )
  }

  if (view.status === 'empty') {
    return (
      <section className={shell}>
        <ProgramCard
          kicker={PROGRAM.name}
          title="아직 신청이 없어요"
          titleRef={headingRef}
          description={view.emptyDescription}
          actions={
            view.canApply ? (
              <Button label="St:talk 신청하기" variant="secondary" size="lg" width="100%" onClick={onOpenApply} />
            ) : undefined
          }
        />
      </section>
    )
  }

  // A cancelled card keeps what was chosen — the sessions and the day — and
  // drops the venue and the student's own details, which no longer matter.
  const rows: ProgramRow[] = [
    // "1차시 14:00 – 14:40" → the session's name as the label; the hours are under 일시.
    ...view.selections.map((item) => ({
      label: item.sessionLabel.split(' ')[0],
      value: item.optionLabel,
      isMuted: item.kind !== 'option',
    })),
    { label: '일시', value: eventScheduleLines(view.event) || view.eventDateLabel },
    ...(isCancelled
      ? []
      : [
          { label: '장소', value: view.location, link: view.event?.location ? { label: '지도', href: campusMapUrl(view.event.location) } : undefined },
          { label: '신청자', value: view.details.nameAndId },
          { label: '학과', value: view.details.department },
          { label: '학년', value: view.details.grade },
          { label: '연락처', value: view.details.phone },
        ]),
  ]

  return (
    <section className={shell}>
      <ProgramCard
        kicker={PROGRAM.name}
        title={PROGRAM.tagline}
        titleRef={headingRef}
        description={view.statusDateLabel}
        status={view.statusLabel}
        statusColor={view.status === 'reserved' ? 'green' : isCancelled ? 'red' : 'gray'}
        isDimmed={isCancelled}
        rows={rows}
        actions={
          isCancelled ? (
            view.canApply ? (
              <Button label="다시 신청하기" variant="secondary" size="lg" width="100%" onClick={onOpenApply} />
            ) : undefined
          ) : view.status === 'reserved' && view.editable ? (
            <div className="flex w-full flex-col gap-2">
              <PairedActions
                leading={{ label: '신청 변경', variant: 'secondary', onClick: onBeginEdit }}
                trailing={{ label: '신청 취소', variant: 'ghost', tone: 'danger', onClick: onRequestCancel }}
              />
              <Text as="p" display="block" type="supporting" justify="center" hasTabularNumbers>
                {view.editDeadlineLabel}
              </Text>
            </div>
          ) : undefined
        }
      >
        {isCancelled ? (
          <Text as="p" display="block" type="supporting" color="secondary">
            {view.cancellationMessage}
          </Text>
        ) : (
          <>
            <EpicFolioNotice event={view.event} compact tone="plain" />
            {view.actionError && (
              <Text as="p" display="block" type="supporting" weight="semibold" className="text-[var(--color-text-red)]" role="alert">
                {view.actionError}
              </Text>
            )}
            {!view.editable && (
              <Text as="p" display="block" type="supporting">
                {view.lockedMessage}
              </Text>
            )}
          </>
        )}
      </ProgramCard>
    </section>
  )
}
