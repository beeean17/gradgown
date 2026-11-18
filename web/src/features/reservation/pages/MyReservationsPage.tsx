import { useState } from 'react'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { LoadErrorState, LoadingState } from '../../../shared/ui/LoadState'
import { MyReservationsMobile } from '../components/MyReservationsMobile'
import { useMyReservationsView } from '../useMyReservationsView'

/**
 * The account's current gown reservation as a card, inside 내 신청
 * (MyApplicationsPage) on every screen.
 */
export function MyReservationsPage({ embedded = false }: { embedded?: boolean }) {
  const {
    loadStatus,
    retry,
    view,
    editor,
    beginEdit,
    openReservation,
    cancelReservation,
    isCancelling,
  } = useMyReservationsView()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (loadStatus === 'loading') {
    return <LoadingState label="예약을 불러오고 있어요" minHeight={embedded ? '12rem' : undefined} />
  }
  if (loadStatus === 'error') {
    return (
      <div className={embedded ? '' : 'mx-auto w-full max-w-3xl px-4'}>
        <LoadErrorState title="예약을 불러오지 못했어요" onRetry={retry} />
      </div>
    )
  }

  return (
    <>
      <span className="sr-only" aria-live="polite">{view.announcement}</span>
      <MyReservationsMobile
          view={view}
          editor={editor}
          onOpenReservation={openReservation}
          onBeginEdit={beginEdit}
          onRequestCancel={() => setConfirmOpen(true)}
          embedded={embedded}
        />

      <ConfirmationDialog
        isOpen={confirmOpen}
        onOpenChange={(open) => {
          if (!isCancelling) setConfirmOpen(open)
        }}
        title="예약을 취소할까요?"
        description={view.cancellationDialogDescription}
        actionLabel="예약 취소"
        cancelLabel="돌아가기"
        actionVariant="destructive"
        isActionLoading={isCancelling}
        onAction={async () => {
          await cancelReservation()
          // A failure is reported beside the page's actions, not in the dialog.
          setConfirmOpen(false)
        }}
      />
    </>
  )
}
