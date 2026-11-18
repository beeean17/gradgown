import { useState } from 'react'
import { Popover } from '@astryxdesign/core/Popover'
import { Icon } from '@astryxdesign/core/Icon'
import { PERMISSION_LABELS, roleBadge, roleTitle, useConsoleUser } from '../auth/access.ts'
import { useIsDesktop } from '../hooks/useIsDesktop.ts'
import { VStack, HStack, Text, Button, Token } from '../shared/ui.tsx'

/** Who is signed in, which tier they are, and what that tier may do. */
export function AccountMenu({ logout }: { logout: () => void }) {
  const { uid, email, access } = useConsoleUser(), [open, setOpen] = useState(false), desktop = useIsDesktop()
  const badge = roleBadge(access)
  return <Popover isOpen={open} onOpenChange={setOpen} placement="below" alignment="end" width="min(20rem, calc(100vw - var(--spacing-8)))" label="내 계정과 권한" closeButtonLabel="계정 메뉴 닫기" content={<VStack gap={4} padding={4}>
    <VStack gap={2}><HStack><Token label={roleTitle(access)} color={badge.color} size="sm" /></HStack><Text weight="semibold" maxLines={1}>{email || '이메일 없음'}</Text><Text type="code" maxLines={1}>{uid}</Text></VStack>
    <VStack gap={2}><Text type="supporting">이 계정으로 할 수 있는 일</Text>{PERMISSION_LABELS.map(([permission, label]) => {
      const allowed = access.permissions.includes(permission)
      return <HStack key={permission} gap={2} align="center"><Icon icon={allowed ? 'check' : 'close'} size="sm" color={allowed ? 'accent' : 'disabled'} /><Text color={allowed ? 'primary' : 'secondary'}>{label}</Text><Text type="supporting" className="sr-only">{allowed ? '가능' : '불가'}</Text></HStack>
    })}</VStack>
    {access.role !== 'master' && <Text type="supporting">변경이 필요하면 마스터 관리자에게 요청해 주세요.</Text>}
    <Button label="로그아웃" width="100%" onClick={() => { setOpen(false); logout() }} />
  </VStack>}>
    <Button size="sm" variant="ghost" label={`내 계정: ${badge.label} · ${email || uid}`}>{desktop ? `${badge.label} · ${email || uid}` : badge.label}</Button>
  </Popover>
}
