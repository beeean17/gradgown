import { AppShell } from '@astryxdesign/core/AppShell'
import { Outlet } from 'react-router-dom'
import { PageTransition } from '../PageTransition'
import { MobileTabs } from './MobileTabs'
import { SiteTitleBar } from './SiteTitleBar'
import { SiteFooter } from './SiteFooter'
import { useIsDesktop } from '../../shared/hooks/useMediaQuery'

/**
 * Desktop routes one page at a time under the title bar, the site footer under
 * every page. Below the desktop
 * breakpoint the tab screens become MobileTabs' swipeable panels instead,
 * with the bottom dock as the menu.
 *
 * Both use the wash shell: the title bar stays on the light surface and the
 * body below it takes the darker body colour, so cards stand out the same way
 * on a phone as on a desktop.
 */
export function PublicLayout() {
  const isDesktop = useIsDesktop()

  return (
    <AppShell
      height={isDesktop ? 'auto' : 'fill'}
      contentPadding={0}
      variant="wash"
      // A phone's top bar lives in MobileTabs: it names the tab in view.
      topNav={isDesktop ? <SiteTitleBar /> : undefined}
      mobileNav={false}
    >
      {isDesktop ? (
        // Every page at least a screen tall below the title bar, with the site
        // footer on the bottom edge however short the page is.
        <div className="flex min-h-[calc(100dvh-var(--title-bar-h))] flex-col">
          <div className="flex-1">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
          <SiteFooter />
        </div>
      ) : (
        <MobileTabs />
      )}
    </AppShell>
  )
}
