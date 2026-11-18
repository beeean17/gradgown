import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { Selector } from '@astryxdesign/core/Selector'
import { AdminTheme } from '../design/ThemeProvider.tsx'
import { ConsoleApp } from '../app/ConsoleApp.tsx'
import { AdminAuthView } from '../presentation/AdminAuthView.tsx'
import { accessOf } from '../auth/access.ts'
import { HStack, Text } from '../shared/ui.tsx'
import { previewAccounts, previewApi } from './fixtures.ts'
import '../design/index.css'

function Preview() {
  const [scenario, setScenario] = useState(new URLSearchParams(location.search).get('scenario') || 'normal')
  const api = useMemo(() => previewApi(scenario), [scenario])
  const route = new URLSearchParams(location.search).get('route') || '/reservations'
  const viewer = scenario === 'viewer'
  return <AdminTheme><><HStack gap={3} padding={3} align="center" wrap="wrap"><Text type="supporting">실제 서버에 연결하지 않는 디자인 미리보기</Text><Selector label="상태 시나리오" value={scenario} onChange={setScenario} options={[['normal', '정상 (마스터)'], ['viewer', '관리자'], ['empty', '빈 데이터'], ['loading', '로딩'], ['error', '요청 실패'], ['signed-out', '로그인'], ['checking-auth', '로그인 확인']].map(([value, label]) => ({ value, label }))} /></HStack>{scenario === 'signed-out' || scenario === 'checking-auth' ? <AdminAuthView state={scenario === 'signed-out' ? { status: 'signed-out', accounts: previewAccounts } : { status: 'checking-auth' }} environment="디자인 미리보기" login={email => setScenario(email === previewAccounts[0].email ? 'viewer' : 'normal')} retry={() => setScenario('normal')} /> : <MemoryRouter key={scenario} initialEntries={[route]}><ConsoleApp api={api} environment="디자인 미리보기" uid={viewer ? 'preview-viewer' : 'preview-operator'} email={previewAccounts[viewer ? 0 : 1].email} access={accessOf(viewer ? 'admin' : 'master')} logout={() => setScenario('signed-out')} preview /></MemoryRouter>}</></AdminTheme>
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Preview />)
