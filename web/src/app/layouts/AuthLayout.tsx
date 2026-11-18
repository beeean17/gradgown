import { AppShell } from '@astryxdesign/core/AppShell'
import { Outlet } from 'react-router-dom'
import { PageTransition } from '../PageTransition'
import { useIsDesktop } from '../../shared/hooks/useMediaQuery'

export function AuthLayout() {
  const isDesktop = useIsDesktop()
  return (
    // Wash like PublicLayout: the login card sits on the body colour, not on a lighter sheet.
    <AppShell height={isDesktop ? 'auto' : 'fill'} contentPadding={isDesktop ? 4 : 0} variant="wash">
      <PageTransition fill={!isDesktop}>
        <Outlet />
      </PageTransition>
    </AppShell>
  )
}
