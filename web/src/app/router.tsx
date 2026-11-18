import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Root } from './Root'
import { PublicLayout } from './layouts/PublicLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { FlowLayout } from './layouts/FlowLayout'
import { RequireAuth, RequireGuest } from './routes/guards'
import { LEGACY_PATHS, PATHS } from './routes/paths'
import { LandingPage } from '../features/landing/LandingPage'
import { AnnouncementsListPage } from '../features/announcements/pages/AnnouncementsListPage'
import { MentoringGuidePage } from '../features/mentoring/pages/MentoringGuidePage'
// import { LecturesListPage } from '../features/lectures/pages/LecturesListPage'
// import { LectureDetailPage } from '../features/lectures/pages/LectureDetailPage'
// import { LectureRegisterPage } from '../features/lectures/pages/LectureRegisterPage'
// import { MyLecturesPage } from '../features/lectures/pages/MyLecturesPage'
import { PlaceholderPage } from '../shared/ui/PlaceholderPage'
import {
  AnnouncementDetailPage,
  Deferred,
  LoginPage,
  MentoringApplyPage,
  MyApplicationsPage,
  ReservationGuidePage,
  ReservationPage,
} from './lazyPages'

/**
 * Route policy:
 * - `/` is the landing deck and the app's only home, signed in or out.
 * - public: discoverable before sign-in
 * - protected: actions and the email account's reservation state
 *
 * Operations live in the separate `admin-web/` app (its own hosting target and
 * UID allowlist); this student app deliberately has no `/admin` routes.
 *
 * Keep URL migration redirects explicit at the edge instead of teaching new
 * feature code legacy paths. The route tree is the single source of truth;
 * `PATHS` is its public API for links and navigation.
 */
export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <LandingPage /> },
          { path: 'announcements', element: <AnnouncementsListPage /> },
          { path: 'announcements/:id', element: <Deferred><AnnouncementDetailPage /></Deferred> },
          // FAQ was folded into 공지사항: old links land on the notice list.
          { path: 'faq', element: <Navigate to={PATHS.public.announcements} replace /> },
          // St:talk guide is public (MNT-4): the mentor list is readable before sign-in.
          { path: 'mentoring', element: <MentoringGuidePage /> },
          // Lecture feature disabled temporarily (files preserved for future development)
          // { path: 'lectures', element: <LecturesListPage /> },
          // { path: 'lectures/:id', element: <LectureDetailPage /> },
          {
            element: <RequireAuth />,
            children: [
              // { path: 'lectures/:id/register', element: <LectureRegisterPage /> },
              { path: 'reservation/guide', element: <Deferred><ReservationGuidePage /></Deferred> },
              {
                // The account has no profile hub: email is the only identity
                // shown in the shell, and `/me` opens the reservation page.
                path: 'me',
                children: [
                  // One 내 신청 page on every screen (both cards); the two
                  // sub-paths are links into it.
                  { index: true, element: <Deferred><MyApplicationsPage /></Deferred> },
                  { path: 'reservations', element: <Deferred><MyApplicationsPage /></Deferred> },
                  { path: 'mentoring', element: <Deferred><MyApplicationsPage /></Deferred> },
                  // { path: 'lectures', element: <MyLecturesPage /> },
                  { path: 'notices', element: <Navigate to={PATHS.public.announcements} replace /> },
                  { path: 'profile', element: <Navigate to={PATHS.me.reservations} replace /> },
                ],
              },
            ],
          },

          // URL migration: legacy names are inbound-only aliases.
          { path: LEGACY_PATHS.profile.slice(1), element: <Navigate to={PATHS.me.reservations} replace /> },
          { path: LEGACY_PATHS.status.slice(1), element: <Navigate to={PATHS.me.home} replace /> },
          { path: LEGACY_PATHS.reservations.slice(1), element: <Navigate to={PATHS.me.reservations} replace /> },
          { path: LEGACY_PATHS.myStatus.slice(1), element: <Navigate to={PATHS.me.home} replace /> },
          { path: LEGACY_PATHS.myReservations.slice(1), element: <Navigate to={PATHS.me.reservations} replace /> },
          { path: LEGACY_PATHS.reservationCreate.slice(1), element: <Navigate to={PATHS.public.reservation} replace /> },
          { path: LEGACY_PATHS.home.slice(1), element: <Navigate to={PATHS.home} replace /> },
          { path: '*', element: <PlaceholderPage title="페이지를 찾을 수 없어요" /> },
        ],
      },
      {
        // Immersive flow: no PublicLayout. The reservation screen renders its
        // own header so nothing invites a student out of a half-finished form.
        path: 'reservation',
        element: <FlowLayout />,
        children: [{ element: <RequireAuth />, children: [{ index: true, element: <Deferred><ReservationPage /></Deferred> }] }],
      },
      {
        // Same for the St:talk apply flow; its guide stays inside the shell above.
        path: 'mentoring/apply',
        element: <FlowLayout />,
        children: [{ element: <RequireAuth />, children: [{ index: true, element: <Deferred><MentoringApplyPage /></Deferred> }] }],
      },
      {
        // The layout sits outside the guest check so its ground shows while the session restores.
        path: 'login',
        element: <AuthLayout />,
        children: [{ element: <RequireGuest />, children: [{ index: true, element: <Deferred><LoginPage /></Deferred> }] }],
      },
    ],
  },
])
