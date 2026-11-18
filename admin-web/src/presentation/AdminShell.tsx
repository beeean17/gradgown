import type { ReactNode } from 'react'
import { AppShell } from '@astryxdesign/core/AppShell'
import { TopNav } from '@astryxdesign/core/TopNav'
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav'
import { useLocation, useNavigate } from 'react-router-dom'
import { VStack, HStack, Text, Token } from '../shared/ui.tsx'
import { isViewOnly, roleBadge, roleTitle, useConsoleUser } from '../auth/access.ts'
import { AccountMenu } from './AccountMenu.tsx'

const navigation = [
  { title: '학위복 운영', items: [['/', '운영 메뉴'], ['/reservations', '예약 관리'], ['/reservations/settings', '접수 설정']] },
  { title: 'St:talk 운영', items: [['/mentoring', '신청 현황'], ['/mentoring/settings', '행사 설정']] },
  { title: '안내 콘텐츠', items: [['/announcements', '공지사항'], ['/faq', '자주 묻는 질문']] },
  { title: '운영 추적', items: [['/logs', '감사 로그']] },
]
export function AdminShell({ children, environment, logout, preview = false }: { children: ReactNode; environment: string; logout: () => void; preview?: boolean }) {
  const { pathname } = useLocation(), navigate = useNavigate()
  const { uid, email, access } = useConsoleUser(), viewOnly = isViewOnly(access)
  return <AppShell height="fill" variant="section" contentPadding={0} mobileNav={{ breakpoint: 'lg' }}
    sideNav={<SideNav header={<SideNavHeading heading="Grad42" superheading="ADMIN WORKSPACE" subheading="학위복·St:talk 운영" />} footer={<VStack gap={2} padding={4}><HStack><Token label={roleTitle(access)} color={roleBadge(access).color} size="sm" /></HStack><Text maxLines={1}>{email || '이메일 없음'}</Text><Text type="code" maxLines={1}>{uid}</Text></VStack>}>
      {navigation.map(group => <SideNavSection key={group.title} title={group.title}>{group.items.map(([href, label]) => <SideNavItem key={href} label={label} href={href} isSelected={pathname === href || (href === '/announcements' && pathname.startsWith('/announcements/')) || (href === '/faq' && pathname.startsWith('/faq/'))} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey) { event.preventDefault(); navigate(href) } }} />)}</SideNavSection>)}
    </SideNav>}
    topNav={<TopNav label="관리 메뉴" heading={<HStack gap={2} align="center"><Token label={environment} color="blue" size="sm" /><Text type="supporting" className="hidden sm:block">운영 콘솔</Text></HStack>} endContent={<AccountMenu logout={logout} />} />}
    banner={preview || viewOnly ? <VStack padding={2} gap={1} className="bg-surface">{preview && <Text type="supporting" justify="center">디자인 미리보기 · 실제 서버에 연결하지 않음</Text>}{viewOnly && <Text type="supporting" justify="center">조회만 할 수 있는 관리자 계정입니다. 변경이 필요하면 마스터 관리자에게 요청해 주세요.</Text>}</VStack> : undefined}>
    {/* Frame budget: nav 260 / content flex; below 1024 use mobile nav and list rows. */}
    <VStack padding={6} gap={6} width="100%" maxWidth="var(--admin-content-width)" className="mx-auto min-w-0">{children}</VStack>
  </AppShell>
}
