import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Heading } from '@astryxdesign/core/Heading'
import { PATHS } from '../../../app/routes/paths'
import { MyMentoringPage } from '../../mentoring/pages/MyMentoringPage'
import { MyReservationsPage } from '../../reservation/pages/MyReservationsPage'

/**
 * 내 신청 (MNT-45): the gown reservation and the St:talk registration as two
 * cards (shared/ui/ProgramCard) — stacked in the phone's tab, side by side on
 * a wide screen, where `/me`, `/me/reservations` and `/me/mentoring` all open
 * this page. Like the landing, it summarises other features, which is why it
 * may import both of them.
 */
export function MyApplicationsPage() {
  const { pathname } = useLocation()
  const mentoringRef = useRef<HTMLElement>(null)

  // Arriving at /me/mentoring (from the done screen, the account menu or a
  // link) means the St:talk section, which sits below the reservation.
  useEffect(() => {
    if (pathname !== PATHS.me.mentoring) return
    const section = mentoringRef.current
    const panel = section?.closest('[role="tabpanel"]')
    if (!section || !panel) return
    const top = section.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop
    panel.scrollTo({ top: Math.max(0, top - 16) })
  }, [pathname])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-8 pt-6 sm:px-6 lg:max-w-[calc(var(--page-max-w)+8rem)] lg:gap-6 lg:px-16 lg:pb-16 lg:pt-10">
      <Heading level={1} className="sr-only">
        내 신청
      </Heading>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <section aria-label="학위복 예약">
          <MyReservationsPage embedded />
        </section>

        <section ref={mentoringRef} aria-label="St:talk 신청">
          <MyMentoringPage embedded />
        </section>
      </div>
    </div>
  )
}
