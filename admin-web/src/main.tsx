import { Component, StrictMode, useMemo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AdminTheme } from './design/ThemeProvider.tsx'
import { createAdminApi } from './data/admin-api.ts'
import { useAdminSession } from './auth/useAdminSession.ts'
import { AdminAuthView } from './presentation/AdminAuthView.tsx'
import { ConsoleApp } from './app/ConsoleApp.tsx'
import './design/index.css'

// The project runs locally only (docs/decisions/local-only.md).
const ENVIRONMENT = 'local'
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() { return { error: true } }
  render() { return this.state.error ? <AdminAuthView state={{ status: 'error', message: '화면을 표시하지 못했습니다. 새로고침해 주세요.' }} environment={ENVIRONMENT} login={() => {}} retry={() => location.reload()} /> : this.props.children }
}
function Connected() {
  const session = useAdminSession(), api = useMemo(() => createAdminApi(session.recheck), [session.recheck])
  return session.state.status === 'authorized' ? <ConsoleApp key={session.state.uid} api={api} environment={ENVIRONMENT} uid={session.state.uid} email={session.state.email} access={session.state.access} logout={session.logout} /> : <AdminAuthView state={session.state} environment={ENVIRONMENT} login={session.login} retry={session.recheck} />
}
createRoot(document.getElementById('root')!).render(<StrictMode><AdminTheme><ErrorBoundary><BrowserRouter><Connected /></BrowserRouter></ErrorBoundary></AdminTheme></StrictMode>)
