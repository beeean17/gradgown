import { AppShell } from '@astryxdesign/core/AppShell'
import { Card } from '@astryxdesign/core/Card'
import type { AdminSessionState } from '../contracts/admin-view.ts'
import { VStack, Heading, Text, Button, Message, Token } from '../shared/ui.tsx'

export function AdminAuthView({ state, environment, login, logout, retry }: { state: AdminSessionState; environment: string; login: () => void; logout: () => void; retry: () => void }) {
  const loading = state.status === 'checking-auth' || state.status === 'checking-permission'
  return <AppShell height="auto" contentPadding={6} variant="surface"><VStack minHeight="85dvh" align="center" justify="center" gap={6}><VStack width="100%" maxWidth="var(--admin-auth-width)" gap={6}>
    <VStack gap={2}><Text type="supporting" color="accent">GRAD42 / ADMIN</Text><Heading level={1}>운영을 위한 공간</Heading><Text color="secondary">학위복 예약과 안내 콘텐츠를 한곳에서 관리합니다.</Text></VStack>
    <Card padding={6}><VStack gap={5}><Token label={environment} color={environment === 'production' ? 'orange' : 'blue'} />
      {loading ? <VStack role="status" aria-busy="true" gap={2}><Heading level={2}>{state.status === 'checking-auth' ? '로그인 확인 중' : '관리자 권한 확인 중'}</Heading><Text color="secondary">확인이 끝나기 전에는 운영 데이터를 불러오지 않습니다.</Text></VStack>
        : state.status === 'forbidden' ? <><Heading level={2}>접근 권한이 없습니다</Heading><Text>등록된 관리자 계정만 이 공간을 사용할 수 있습니다.</Text>{state.account && <VStack gap={2}><Text type="supporting">관리자가 되려면 마스터 관리자에게 아래 이메일이나 UID를 전달해 등록을 요청하세요.</Text><Text weight="semibold">{state.account.email || '이메일 없음'}</Text><Text type="code">{state.account.uid}</Text></VStack>}<Button label="다른 계정으로 로그인" variant="primary" onClick={logout} /></>
        : state.status === 'error' ? <><Message error>{state.message}</Message><Button label="다시 확인" onClick={retry} /><Button label="로그아웃 / 계정 전환" variant="ghost" onClick={logout} /></>
        : <><Heading level={2}>관리자 로그인</Heading><Text color="secondary">등록된 Google 계정으로 계속해 주세요.</Text><Button label="Google 계정으로 로그인" variant="primary" size="lg" width="100%" onClick={login} /></>}
    </VStack></Card><Text type="supporting">등록 계정 확인 · App Check · 서버 권한 검증</Text>
  </VStack></VStack></AppShell>
}
