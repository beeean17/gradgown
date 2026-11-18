import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { Selector } from '@astryxdesign/core/Selector'
import { AdminTheme } from '../design/ThemeProvider.tsx'
import { ConsoleApp } from '../app/ConsoleApp.tsx'
import { AdminAuthView } from '../presentation/AdminAuthView.tsx'
import { HStack, Text } from '../shared/ui.tsx'
import { previewApi } from './fixtures.ts'
import '../design/index.css'

function Preview() {
  const [scenario, setScenario] = useState(new URLSearchParams(location.search).get('scenario') || 'normal')
  const api = useMemo(() => previewApi(scenario), [scenario])
  const route = new URLSearchParams(location.search).get('route') || '/reservations'
  return <AdminTheme><><HStack gap={3} padding={3} align="center" wrap="wrap"><Text type="supporting">실제 서버에 연결하지 않는 디자인 미리보기</Text><Selector label="상태 시나리오" value={scenario} onChange={setScenario} options={[['normal', '정상'], ['empty', '빈 데이터'], ['loading', '로딩'], ['error', '요청 실패'], ['conflict', '저장 충돌'], ['signed-out', '로그인'], ['forbidden', '접근 거부'], ['checking-permission', '권한 확인'], ['viewer', '관리자']].map(([value, label]) => ({ value, label }))} /></HStack>{['signed-out', 'forbidden', 'checking-permission'].includes(scenario) ? <AdminAuthView state={scenario === 'forbidden' ? { status: 'forbidden', account: { uid: 'demo-preview-unregistered', email: 'someone@example.test' } } : { status: scenario as 'signed-out' | 'checking-permission' }} environment="디자인 미리보기" login={() => setScenario('normal')} logout={() => setScenario('signed-out')} retry={() => setScenario('normal')} /> : <MemoryRouter key={scenario} initialEntries={[route]}><ConsoleApp api={api} environment="디자인 미리보기" projectId="demo-grad42-admin" uid="preview-operator" email="operator@example.test" access={scenario === 'viewer' ? { role: 'admin', permissions: ['console.view'] } : { role: 'master', permissions: ['console.view', 'reservation.write', 'reservation.delete', 'mentoring.write', 'mentoring.delete', 'settings.write', 'content.write', 'mail.send', 'members.manage'] }} logout={() => setScenario('signed-out')} preview /></MemoryRouter>}</></AdminTheme>
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Preview />)
