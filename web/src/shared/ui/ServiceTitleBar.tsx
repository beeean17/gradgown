import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ORG } from '../content/contact'
import { useAuth } from '../auth/useAuth'
import { useAuthModal } from '../auth/AuthModalContext'
import { PATHS } from '../../app/routes/paths'

export interface TitleBarNavItem {
  label: string
  href: string
  isCurrent?: boolean
}

interface GlobalTitleBarProps {
  variant: 'global'
  navItems: TitleBarNavItem[]
  endAction: ReactNode
}

interface FlowProgress {
  step: number
  totalSteps: number
  stepName: string
}

interface FlowTitleBarProps {
  variant: 'flow'
  /** Omitted while the flow is loading: the bar holds its place without steps. */
  progress?: FlowProgress
  onExit: () => void
}

export type ServiceTitleBarProps = GlobalTitleBarProps | FlowTitleBarProps

export const TITLE_BAR_ACTION_CLASS =
  '!h-auto !min-h-0 !rounded-[9px] !border !border-border !bg-transparent !px-[13px] !py-[7px] !text-[13px] !leading-[1.25] !text-secondary hover:!bg-muted focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-accent-bg'

/** The two-line university · committee mark, linking home. Also the phone's tab bar (MobileTabs). */
export function LogoLockup() {
  return (
    <Link
      to="/"
      aria-label={`${ORG.university} ${ORG.committee} 홈`}
      className="flex shrink-0 flex-col whitespace-nowrap leading-[1.25] no-underline outline-none focus-visible:rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bg"
    >
      <span className="text-secondary text-[11px] font-normal">{ORG.university}</span>
      <span className="text-primary text-[15px] font-bold">{ORG.committee}</span>
    </Link>
  )
}

/**
 * Below lg the menu is the mobile tab dock (app/layouts/MobileTabs.tsx), so
 * the bar keeps only the logo and the account control.
 */
function GlobalTitleBar({ navItems, endAction }: Omit<GlobalTitleBarProps, 'variant'>) {
  const { user } = useAuth()
  const { openLoginModal } = useAuthModal()

  return (
    <div className="border-border bg-surface/95 sticky top-0 z-50 h-16 border-b backdrop-blur-[12px]">
      <div className="flex h-full items-center px-4 lg:px-7">
        <LogoLockup />

        <nav aria-label="주요 메뉴" className="ml-9 hidden h-full items-stretch gap-7 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              aria-current={item.isCurrent ? 'page' : undefined}
              onClick={(e) => {
                // Signed-in pages ask for an account in place instead of a redirect.
                if (!user && (item.href === PATHS.public.reservationGuide || item.href === PATHS.me.home)) {
                  e.preventDefault()
                  openLoginModal({ redirectTo: item.href })
                }
              }}
              // The phone bar's tab name size (15px bold); the page in view in
              // accent with a bar along the bottom edge, so it reads at a glance.
              className={`relative flex items-center whitespace-nowrap text-[15px] no-underline outline-none transition-colors duration-200 focus-visible:rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bg motion-reduce:transition-none ${
                item.isCurrent
                  ? 'font-bold text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-[var(--color-accent)]'
                  : 'font-semibold text-secondary hover:text-primary'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">{endAction}</div>
      </div>
    </div>
  )
}

function FlowTitleBar({ progress, onExit }: Omit<FlowTitleBarProps, 'variant'>) {
  const percent = progress ? Math.min(Math.max(progress.step / progress.totalSteps, 0), 1) * 100 : 0

  return (
    <div className={`bg-surface/95 sticky top-0 z-50 flex-none backdrop-blur-[12px] ${progress ? 'hidden desk:block' : ''}`} role="banner">
      {/* A phone hides this bar during the steps: FlowTitle carries the step, a
          segmented indicator and the ✕. Gate, loading and result screens have no
          progress, so they keep the bar and its 홈으로. */}
      <div className="flex h-16 items-center px-7 max-[360px]:px-4">
        <LogoLockup />

        {progress && (
          <>
            <span aria-hidden className="bg-border ml-5 h-[22px] w-px shrink-0" />
            <div className="ml-5 flex min-w-0 items-baseline gap-[10px] whitespace-nowrap">
              <span
                aria-label={`${progress.step}단계, 전체 ${progress.totalSteps}단계`}
                className="inline-flex items-baseline gap-1 text-[12px] font-bold tracking-[.06em] max-[900px]:hidden"
              >
                <span aria-hidden className="text-accent">
                  STEP {String(progress.step).padStart(2, '0')}
                </span>
                <span aria-hidden className="text-disabled">
                  / {String(progress.totalSteps).padStart(2, '0')}
                </span>
              </span>
              <span className="text-primary truncate text-[15px] font-semibold">{progress.stepName}</span>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onExit}
          className={`${TITLE_BAR_ACTION_CLASS} ml-auto shrink-0 cursor-pointer`}
        >
          홈으로
        </button>
      </div>

      {progress ? (
        <div
          role="progressbar"
          aria-label="예약 진행 단계"
          aria-valuenow={progress.step}
          aria-valuemin={0}
          aria-valuemax={progress.totalSteps}
          className="bg-track h-[2px]"
        >
          <div
            aria-hidden
            className="bg-accent-bg h-full transition-[width] duration-[240ms] ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : (
        <div aria-hidden className="bg-track h-[2px]" />
      )}
    </div>
  )
}

export function ServiceTitleBar(props: ServiceTitleBarProps) {
  return props.variant === 'global' ? (
    <GlobalTitleBar navItems={props.navItems} endAction={props.endAction} />
  ) : (
    <FlowTitleBar progress={props.progress} onExit={props.onExit} />
  )
}
