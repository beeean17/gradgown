import { lazy, Suspense, type ReactNode } from 'react'
import { LoadingState } from '../shared/ui/LoadState'

/**
 * Screens a visitor doesn't need on arrival, each in its own chunk: the
 * reservation and St:talk flows and the signed-in tabs (only after sign-in),
 * sign-in itself, and a notice's detail. The landing, notice list and the
 * St:talk guide stay in the entry chunk — the mobile pager mounts them all at
 * once.
 */
export const ReservationPage = lazy(() =>
  import('../features/reservation/pages/ReservationPage').then((m) => ({ default: m.ReservationPage })),
)
export const ReservationGuidePage = lazy(() =>
  import('../features/reservation/pages/ReservationGuidePage').then((m) => ({
    default: m.ReservationGuidePage,
  })),
)
export const MentoringApplyPage = lazy(() =>
  import('../features/mentoring/pages/MentoringApplyPage').then((m) => ({ default: m.MentoringApplyPage })),
)
export const MyApplicationsPage = lazy(() =>
  import('../features/account/pages/MyApplicationsPage').then((m) => ({ default: m.MyApplicationsPage })),
)
export const LoginPage = lazy(() =>
  import('../features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
export const AnnouncementDetailPage = lazy(() =>
  import('../features/announcements/pages/AnnouncementDetailPage').then((m) => ({
    default: m.AnnouncementDetailPage,
  })),
)

/** Holds a lazy screen's place with the same spinner its data load shows. */
export function Deferred({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>
}
