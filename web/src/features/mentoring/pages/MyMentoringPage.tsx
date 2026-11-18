import { useState } from 'react'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { LoadErrorState, LoadingState } from '../../../shared/ui/LoadState'
import { MyMentoringMobile } from '../components/MyMentoringMobile'
import { useMyMentoringView } from '../useMyMentoringView'

/**
 * The account's St:talk registration (MNT-40~42) as a card, inside 내 신청
 * (MyApplicationsPage) on every screen.
 */
export function MyMentoringPage({ embedded = false }: { embedded?: boolean }) {
  const { loadStatus, retry, view, editor, beginEdit, openApply, cancelRegistration, isCancelling } =
    useMyMentoringView()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (loadStatus === 'loading') {
    return <LoadingState label="내 St:talk 신청을 불러오고 있어요" minHeight={embedded ? '12rem' : undefined} onRetry={retry} />
  }
  if (loadStatus === 'error') {
    return (
      <div className={embedded ? '' : 'mx-auto w-full max-w-3xl px-4'}>
        <LoadErrorState title="내 St:talk 신청을 불러오지 못했어요" onRetry={retry} />
      </div>
    )
  }

  return (
    <>
      <span className="sr-only" aria-live="polite">
        {view.announcement}
      </span>
      <MyMentoringMobile
          view={view}
          editor={editor}
          onOpenApply={openApply}
          onBeginEdit={beginEdit}
          onRequestCancel={() => setConfirmOpen(true)}
          embedded={embedded}
        />

      <ConfirmationDialog
        isOpen={confirmOpen}
        onOpenChange={(open) => {
          if (!isCancelling) setConfirmOpen(open)
        }}
        title="St:talk 신청을 취소할까요?"
        description={view.cancellationDialogDescription}
        actionLabel="신청 취소"
        cancelLabel="돌아가기"
        actionVariant="destructive"
        isActionLoading={isCancelling}
        onAction={async () => {
          await cancelRegistration()
          // A failure is reported beside the page's actions, not in the dialog.
          setConfirmOpen(false)
        }}
      />
    </>
  )
}
