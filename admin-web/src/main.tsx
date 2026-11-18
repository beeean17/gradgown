import { Component, StrictMode, useMemo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AdminTheme } from './design/ThemeProvider.tsx'
import { createRuntime, type Runtime } from './data/firebase.ts'
import { createAdminApi } from './data/admin-api.ts'
import { useAdminSession } from './auth/useAdminSession.ts'
import { AdminAuthView } from './presentation/AdminAuthView.tsx'
import { ConsoleApp } from './app/ConsoleApp.tsx'
import './design/index.css'

let runtime: Runtime | null = null
let startupError = ''
try { runtime = createRuntime() } catch (error) { startupError = error instanceof Error ? error.message : '연결 설정을 확인해 주세요.' }
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() { return { error: true } }
  render() { return this.state.error ? <AdminAuthView state={{ status: 'error', message: '화면을 표시하지 못했습니다. 새로고침해 주세요.' }} environment="확인 필요" login={() => {}} logout={() => location.reload()} retry={() => location.reload()} /> : this.props.children }
}
function Connected({ runtime }: { runtime: Runtime }) {
  const session = useAdminSession(runtime), api = useMemo(() => createAdminApi(runtime), [runtime])
  return session.state.status === 'authorized' ? <ConsoleApp key={session.state.uid} api={api} environment={runtime.config.environment} projectId={runtime.config.firebase.projectId} uid={session.state.uid} email={session.state.email} access={session.state.access} logout={session.logout} /> : <AdminAuthView state={session.state} environment={runtime.config.environment} login={session.login} logout={session.logout} retry={session.retry} />
}
createRoot(document.getElementById('root')!).render(<StrictMode><AdminTheme><ErrorBoundary><BrowserRouter>{runtime ? <Connected runtime={runtime} /> : <AdminAuthView state={{ status: 'error', message: startupError }} environment="설정 필요" login={() => {}} logout={() => location.reload()} retry={() => location.reload()} />}</BrowserRouter></ErrorBoundary></AdminTheme></StrictMode>)
