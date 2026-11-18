import { useEffect, useRef } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { FOOTER_COLUMNS } from '../../../shared/content/contact'
import { EditorCard } from '../../../shared/ui/EditorCard'
import { PairedActions } from '../../../shared/ui/PairedActions'
import { ProgramCard, type ProgramRow } from '../../../shared/ui/ProgramCard'
import { campusMapUrl } from '../../../shared/lib/map'
import type {
  MyReservationEditorController,
  MyReservationsViewModel,
} from '../useMyReservationsView'
import { ReservationEditorActions, ReservationInlineEditor } from './ReservationInlineEditor'

interface MyReservationsMobileProps {
  view: MyReservationsViewModel
  editor: MyReservationEditorController
  onOpenReservation: () => void
  onBeginEdit: () => void
  onRequestCancel: () => void
  /** Inside the 내 신청 panel: a section heading instead of the page header. */
  embedded?: boolean
}

export function MyReservationsMobile({
  view,
  editor,
  onOpenReservation,
  onBeginEdit,
  onRequestCancel,
  embedded = false,
}: MyReservationsMobileProps) {
  const isCancelled = view.status === 'cancelled'
  const headingRef = useRef<HTMLHeadingElement>(null)
  const wasEditing = useRef(editor.isOpen)

  useEffect(() => {
    if (wasEditing.current !== editor.isOpen) {
      headingRef.current?.focus({ preventScroll: true })
      wasEditing.current = editor.isOpen
    }
  }, [editor.isOpen])

  // Opening the editor, saving and cancelling swap the whole screen, and the
  // button that did it sits at the bottom: start the new screen from its top.
  // Only the tab panel this screen scrolls in moves (app/layouts/MobileTabs) —
  // scrollIntoView would also slide the pager over if a live update changed
  // the status while another tab was on screen.
  const scrollKey = editor.isOpen ? 'edit' : view.status
  const lastScrollKey = useRef(scrollKey)
  useEffect(() => {
    if (lastScrollKey.current === scrollKey) return
    lastScrollKey.current = scrollKey
    headingRef.current?.closest('[role="tabpanel"]')?.scrollTo({ top: 0 })
  }, [scrollKey])

  const location = FOOTER_COLUMNS[2].lines[1]
  const monthTitle = `${view.periodTitle.replace(/^\d{4}년\s*/, '')} 학위복 대여`.trim()
  const shell = embedded ? '' : 'mx-auto max-w-2xl px-4 pb-8 pt-6 sm:px-6'

  // Changing the reservation: the editor takes the card's place, its fields
  // scrolling inside it between the heading and save/cancel (EditorCard).
  if (editor.isOpen) {
    return (
      <section className={shell}>
        <EditorCard
          kicker="학위복 대여"
          title="예약 변경"
          titleRef={headingRef}
          description={monthTitle}
          actions={<ReservationEditorActions editor={editor} />}
          error={editor.error}
        >
          <ReservationInlineEditor editor={editor} externalActions />
        </EditorCard>
      </section>
    )
  }

  if (view.status === 'empty') {
    return (
      <section className={shell}>
        <ProgramCard
          kicker="학위복 대여"
          title="아직 예약이 없어요"
          titleRef={headingRef}
          description={view.emptyDescription}
          actions={
            view.canReserve ? (
              <Button label="학위복 예약하기" variant="secondary" size="lg" width="100%" onClick={onOpenReservation} />
            ) : undefined
          }
        />
      </section>
    )
  }

  // A cancelled card keeps what was chosen — the slots and the size — and
  // drops the venue and the student's own details, which no longer matter.
  const rows: ProgramRow[] = [
    { label: '수령', value: view.pickup.label, emphasis: view.pickup.dday !== null ? `D-${view.pickup.dday}` : undefined },
    { label: '반납', value: view.return.label },
    ...(isCancelled ? [] : [{ label: '장소', value: location, link: { label: '지도', href: campusMapUrl(location) } }]),
    { label: '사이즈', value: view.details.size },
    ...(isCancelled
      ? []
      : [
          { label: '예약자', value: view.details.nameAndId },
          { label: '학과', value: view.details.department },
          { label: '연락처', value: view.details.phone },
          ...(view.details.proxy ? [{ label: '대리 수령', value: view.details.proxy }] : []),
        ]),
  ]

  return (
    <section className={shell}>
      <ProgramCard
        kicker="학위복 대여"
        title={monthTitle}
        titleRef={headingRef}
        description={view.statusDateLabel}
        status={view.statusLabel}
        statusColor={view.status === 'reserved' ? 'green' : isCancelled ? 'red' : 'gray'}
        isDimmed={isCancelled}
        rows={rows}
        actions={
          isCancelled ? (
            view.canReserve ? (
              <Button label="다시 예약하기" variant="secondary" size="lg" width="100%" onClick={onOpenReservation} />
            ) : undefined
          ) : view.status === 'reserved' && view.editable ? (
            <div className="flex w-full flex-col gap-2">
              <PairedActions
                leading={{ label: '예약 변경', variant: 'secondary', onClick: onBeginEdit }}
                trailing={{ label: '예약 취소', variant: 'ghost', tone: 'danger', onClick: onRequestCancel }}
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
            <Text as="p" display="block" type="supporting" color="secondary" className="!leading-relaxed">
              수령 당일{' '}
              <Text type="inherit" weight="bold" color="accent">
                실물 학생증
              </Text>
              을 가져와요. 없으면 실물 신분증과 모바일 학생증(또는 재학증명서)을 함께 가져와요. 모바일 학생증은 보증물이 될 수 없어요.
            </Text>
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
