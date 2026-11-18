import { AppShell } from '@astryxdesign/core/AppShell'
import { Card } from '@astryxdesign/core/Card'
import { List, ListItem } from '@astryxdesign/core/List'
import type { AdminSessionState } from '../contracts/admin-view.ts'
import { accessOf, roleBadge, roleTitle } from '../auth/access.ts'
import { VStack, Heading, Text, Button, Message, Token } from '../shared/ui.tsx'

/** The test login: pick one of the accounts the server lists (docs/decisions/test-login.md). */
export function AdminAuthView({ state, environment, login, retry }: { state: AdminSessionState; environment: string; login: (email: string) => void; retry: () => void }) {
  return <AppShell height="auto" contentPadding={6} variant="surface"><VStack minHeight="85dvh" align="center" justify="center" gap={6}><VStack width="100%" maxWidth="var(--admin-auth-width)" gap={6}>
    <VStack gap={2}><Text type="supporting" color="accent">GRAD42 / ADMIN</Text><Heading level={1}>운영을 위한 공간</Heading><Text color="secondary">학위복 예약과 안내 콘텐츠를 한곳에서 관리합니다.</Text></VStack>
    <Card padding={6}><VStack gap={5}><Token label={environment} color="blue" />
      {state.status === 'error' ? <><Message error>{state.message}</Message><Button label="다시 확인" onClick={retry} /></>
        : state.status === 'signed-out' ? <><Heading level={2}>관리자 로그인</Heading><Text color="secondary">로그인할 테스트 계정을 골라 주세요. 비밀번호는 없습니다.</Text>
          {state.accounts.length ? <List hasDividers>{state.accounts.map(account => {
            const access = accessOf(account.role)
            return <ListItem key={account.email} label={account.email} description={account.role === 'master' ? '조회와 접수 열기·닫기' : '조회'} startContent={<Token label={roleTitle(access)} color={roleBadge(access).color} size="sm" />} endContent={<Button label={`${account.email} 계정으로 로그인`} variant="primary" size="sm" onClick={() => login(account.email)}>로그인</Button>} />
          })}</List> : <Message>로그인할 수 있는 관리자 계정이 없습니다. 시드 데이터를 확인해 주세요.</Message>}</>
        : <VStack role="status" aria-busy="true" gap={2}><Heading level={2}>로그인 확인 중</Heading><Text color="secondary">확인이 끝나기 전에는 운영 데이터를 불러오지 않습니다.</Text></VStack>}
    </VStack></Card><Text type="supporting">테스트 로그인 · 계정 등급에 맞는 DB 계정으로 접속</Text>
  </VStack></VStack></AppShell>
}
