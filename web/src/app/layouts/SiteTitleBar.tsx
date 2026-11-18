import { useLocation } from 'react-router-dom'
import { PATHS } from '../routes/paths'
import { AccountMenu } from './AccountMenu'
import { ServiceTitleBar, TITLE_BAR_ACTION_CLASS } from '../../shared/ui/ServiceTitleBar'

const NAV = [
  // The guide first, like St:talk; the flow is one button away there.
  { label: '학위복 대여', href: PATHS.public.reservationGuide },
  { label: 'St:talk', href: PATHS.public.mentoring },
  { label: '공지사항', href: PATHS.public.announcements },
  { label: '내 신청', href: PATHS.me.home },
]

/**
 * The site header: PublicLayout's top bar, and the reservation route's while
 * it shows a notice instead of the form — a screen outside the shell still
 * needs a way to the rest of the site.
 */
export function SiteTitleBar() {
  const { pathname } = useLocation()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const navItems = NAV.map((item) => ({ ...item, isCurrent: isActive(item.href) }))

  return (
    <ServiceTitleBar
      variant="global"
      navItems={navItems}
      endAction={<AccountMenu triggerClassName={TITLE_BAR_ACTION_CLASS} />}
    />
  )
}
