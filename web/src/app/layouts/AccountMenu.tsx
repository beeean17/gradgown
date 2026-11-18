import { useState, type SVGProps } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Popover } from '@astryxdesign/core/Popover'
import { useAuth } from '../../shared/auth/useAuth'
import { useAuthModal } from '../../shared/auth/AuthModalContext'
import { signOutAndReload } from '../../shared/auth/session'
import { kstParts } from '../../shared/lib/datetime'
import { useMyReservations } from '../../features/reservation/useReservation'
import { useMyRegistrations } from '../../features/mentoring/useMentoring'
import { GuestThemeButton, ThemeModeControl } from './ThemeModeMenu'
import { PATHS } from '../routes/paths'
import { useIsDesktop } from '../../shared/hooks/useMediaQuery'
import { ConfirmationDialog } from '../../shared/ui/ConfirmationDialog'

const LOGIN_BUTTON_CLASS =
  '!h-auto !min-h-0 !rounded-[9px] !px-[13px] !py-[7px] !text-[13px] !leading-[1.25] focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-accent-bg'

function SignInGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h5" />
    </svg>
  )
}

/** A head and shoulders: the signed-in account, without an initial to read. */
function PersonGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5c1.2-3.3 3.9-5 7-5s5.8 1.7 7 5" />
    </svg>
  )
}

/** The account's mark in a muted circle, in place of an initial avatar. */
function PersonAvatar({ size }: { size: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] ${
        size === 'md' ? 'size-9' : 'size-6'
      }`}
    >
      <Icon icon={PersonGlyph} size={size === 'md' ? 'md' : 'sm'} color="inherit" />
    </span>
  )
}

function SignOutGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 17l-5-5 5-5M4 12h11M13 4h5a2 2 0 012 2v12a2 2 0 01-2 2h-5" />
    </svg>
  )
}

/** "8.28 수령" beside 내 예약 while a reservation is live. */
function usePickupMenuLabel(): string | null {
  const { current } = useMyReservations()
  if (current?.status !== 'reserved' || !current.rentAt) return null
  const at = kstParts(current.rentAt)
  return `${at.month}.${at.day} 수령`
}

/** "11.20 참여" beside St:talk while a registration is live (MNT-43). */
function useMentoringMenuLabel(): string | null {
  const { current, event } = useMyRegistrations()
  if (current?.status !== 'reserved') return null
  if (!event?.date) return '신청 완료'
  const at = kstParts(event.date)
  return `${at.month}.${at.day} 참여`
}

function MenuLink({
  to,
  isCurrent,
  label,
  trailing,
  onNavigate,
}: {
  to: string
  isCurrent: boolean
  label: string
  trailing: string | null
  onNavigate: () => void
}) {
  return (
    <Link
      to={to}
      aria-current={isCurrent ? 'page' : undefined}
      onClick={onNavigate}
      className={`flex min-h-11 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-primary no-underline transition-colors duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bg motion-reduce:transition-none ${
        isCurrent ? 'bg-muted font-semibold' : ''
      }`}
    >
      <Icon icon="calendar" color="inherit" size="sm" />
      <span>{label}</span>
      {trailing && <span className="ml-auto text-xs font-normal tabular-nums text-secondary">{trailing}</span>}
    </Link>
  )
}

/** Public shell account control: sign-in CTA or the email-based account popover. */
export function AccountMenu({ triggerClassName }: { triggerClassName?: string }) {
  const { user, status } = useAuth()
  const { openLoginModal } = useAuthModal()
  const { pathname } = useLocation()
  const [isOpen, setOpen] = useState(false)
  const [isSignOutOpen, setSignOutOpen] = useState(false)
  const [isSigningOut, setSigningOut] = useState(false)
  const isDesktop = useIsDesktop()
  const pickupLabel = usePickupMenuLabel()
  const mentoringLabel = useMentoringMenuLabel()

  // Keep the slot empty while the session is being read so the
  // user never sees a sign-in flash before their account appears.
  if (status === 'loading') return null

  if (!user) {
    return (
      <div className={`flex items-center ${isDesktop ? 'gap-1.5' : 'gap-1'}`}>
        <GuestThemeButton className={isDesktop ? undefined : '!size-9 !min-h-9'} />
        {/* A phone's bar also carries the logo and the tab's name: the word alone fits 360px. */}
        <Button
          label="로그인"
          variant={isDesktop ? 'primary' : 'secondary'}
          size="sm"
          icon={isDesktop ? <Icon icon={SignInGlyph} size="sm" /> : undefined}
          className={isDesktop ? LOGIN_BUTTON_CLASS : '!min-h-9 !rounded-[var(--radius-inner)] !px-3'}
          onClick={() => openLoginModal()}
        />
      </div>
    )
  }

  const isReservationPage = pathname === PATHS.me.home || pathname.startsWith(PATHS.me.reservations)
  const isMentoringPage = pathname.startsWith(PATHS.me.mentoring)

  const confirmSignOut = () => {
    setOpen(false)
    setSignOutOpen(true)
  }

  return (
    <>
      <Popover
        isOpen={isOpen}
        onOpenChange={setOpen}
        placement="below"
        alignment="end"
        width="16.5rem"
        label={`${user.email} 계정`}
        closeButtonLabel="계정 메뉴 닫기"
        className="!p-1"
        content={
          <section className="flex flex-col">
            <header className="flex items-center gap-2.5 px-2.5 pb-3 pt-2.5">
              <PersonAvatar size="md" />
              <strong className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">
                {user.email}
              </strong>
            </header>

            <span aria-hidden className="mx-1.5 h-px bg-border" />

            <nav aria-label="내 신청" className="mt-1 flex flex-col">
              <MenuLink
                to={PATHS.me.reservations}
                isCurrent={isReservationPage}
                label="학위복 예약"
                trailing={pickupLabel}
                onNavigate={() => setOpen(false)}
              />
              <MenuLink
                to={PATHS.me.mentoring}
                isCurrent={isMentoringPage}
                label="St:talk 신청"
                trailing={mentoringLabel}
                onNavigate={() => setOpen(false)}
              />
            </nav>

            <span aria-hidden className="mx-1.5 mt-1 h-px bg-border" />

            <section className="flex items-center gap-2 px-2.5 py-2" aria-label="화면 모드">
              <span className="text-xs text-secondary">화면 모드</span>
              <ThemeModeControl className="ml-auto" />
            </section>

            <span aria-hidden className="mx-1.5 h-px bg-border" />

            <Button
              label="로그아웃"
              variant="ghost"
              size="sm"
              width="100%"
              icon={<Icon icon={SignOutGlyph} size="sm" />}
              className="mt-1 !min-h-11 !justify-start !px-2.5 !font-normal !text-secondary"
              onClick={confirmSignOut}
            />
          </section>
        }
      >
        <Button
          label={user.email}
          variant="ghost"
          size="sm"
          className={`${isDesktop ? triggerClassName ?? '' : '!size-11 !min-h-11 !rounded-full !p-0'} group !gap-0`}
        >
          {/* Phones show only the avatar the popover header repeats: no word
              fits "the signed-in you" as well as your own initial. */}
          {isDesktop ? (
            <span className="flex items-center gap-1.5">
              <PersonAvatar size="sm" />
              <span className="max-w-52 truncate">{user.email}</span>
              <Icon
                icon="chevronDown"
                color="disabled"
                size="xsm"
                className="transition-transform duration-200 group-aria-expanded:rotate-180 motion-reduce:transition-none"
              />
            </span>
          ) : (
            <PersonAvatar size="md" />
          )}
        </Button>
      </Popover>

      <ConfirmationDialog
        isOpen={isSignOutOpen}
        onOpenChange={(open) => {
          // The page is about to reload; there is nothing to go back to.
          if (!isSigningOut) setSignOutOpen(open)
        }}
        title="로그아웃할까요?"
        description="다시 로그인하면 예약 내역을 그대로 볼 수 있어요."
        actionLabel="로그아웃"
        isActionLoading={isSigningOut}
        onAction={() => {
          setSigningOut(true)
          void signOutAndReload()
        }}
      />
    </>
  )
}
