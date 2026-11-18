import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import type { AdminApi, ConsoleAccess } from '../contracts/admin-view.ts'
import { ConsoleUserContext } from '../auth/access.ts'
import { AdminShell } from '../presentation/AdminShell.tsx'
import { ReservationsPage } from '../pages/ReservationsPage.tsx'
import { SettingsPage } from '../pages/SettingsPage.tsx'
import { MentoringSettingsPage } from '../pages/MentoringSettingsPage.tsx'
import { MentoringPage } from '../pages/MentoringPage.tsx'
import { ContentPage } from '../pages/ContentPage.tsx'
import { OverviewPage, UsersPage, LogsPage } from '../pages/OverviewPage.tsx'
import { MembersPage } from '../pages/MembersPage.tsx'
import { Empty } from '../shared/ui.tsx'

export function ConsoleApp({ api, environment, projectId, uid, email, access, logout, preview = false }: { api: AdminApi; environment: string; projectId: string; uid: string; email: string; access: ConsoleAccess; logout: () => void; preview?: boolean }) {
  const location = useLocation(), user = useMemo(() => ({ uid, email, access }), [uid, email, access])
  useEffect(() => { document.title = 'Grad42 · 운영 콘솔' }, [location.pathname])
  return <ConsoleUserContext.Provider value={user}><AdminShell {...{ environment, logout, preview }}><Routes>
    <Route path="/" element={<OverviewPage api={api} />} />
    <Route path="/reservations" element={<ReservationsPage api={api} />} />
    <Route path="/reservations/settings" element={<SettingsPage api={api} />} />
    <Route path="/mentoring" element={<MentoringPage api={api} />} />
    <Route path="/mentoring/settings" element={<MentoringSettingsPage api={api} />} />
    <Route path="/announcements/*" element={<ContentPage key="announcements" api={api} kind="announcements" />} />
    <Route path="/faq/*" element={<ContentPage key="faq" api={api} kind="faq" />} />
    <Route path="/users" element={<UsersPage api={api} />} /><Route path="/logs" element={<LogsPage api={api} projectId={projectId} />} />
    <Route path="/members" element={<MembersPage api={api} />} />
    <Route path="/login" element={<Navigate to="/" replace />} /><Route path="/forbidden" element={<Navigate to="/" replace />} />
    <Route path="*" element={<Empty title="페이지를 찾을 수 없습니다" detail="왼쪽 메뉴에서 이동할 페이지를 선택해 주세요." />} />
  </Routes></AdminShell></ConsoleUserContext.Provider>
}
