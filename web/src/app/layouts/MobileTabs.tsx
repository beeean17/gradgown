import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ComponentType, CSSProperties, KeyboardEvent, ReactNode, SVGProps } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Icon, type IconName, type IconType } from '@astryxdesign/core/Icon'
import { AnnouncementsListPage } from '../../features/announcements/pages/AnnouncementsListPage'
import { MobileLanding } from '../../features/landing/MobileLanding'
import { MentoringGuidePage } from '../../features/mentoring/pages/MentoringGuidePage'
import { useAuth } from '../../shared/auth/useAuth'
import { useAuthModal } from '../../shared/auth/AuthModalContext'
import { LoadingState } from '../../shared/ui/LoadState'
import { Deferred, MyApplicationsPage, ReservationGuidePage } from '../lazyPages'
import { PageTransition } from '../PageTransition'
import { PATHS } from '../routes/paths'
import { LogoLockup } from '../../shared/ui/ServiceTitleBar'
import { AccountMenu } from './AccountMenu'

/**
 * The mobile app frame, carried over from the ST:talk mobile site: the tab
 * screens sit side by side in a horizontal scroll-snap pager, and a bottom
 * navigation bar switches between them — the same edge-to-edge bar, top rule
 * and surface as the flows' FlowBottomBar, so the bottom edge reads as one
 * system across the site.
 *
 * - Swiping moves between tabs; the URL follows once the pager comes to rest
 *   (replace), while a tap on the bar is a real navigation (push), so the
 *   browser's back returns to the tab seen before the tap.
 * - Each panel scrolls on its own and keeps its place while another is shown.
 * - A page beneath a tab (a notice) opens over the pager, which stays mounted
 *   underneath so the list is exactly where it was on the way back.
 * - The bar sits below the panels rather than over them, so no screen needs
 *   room at its foot to clear it.
 */

const SETTLE_DELAY_MS = 120
// A glide's length; the `duration-220` classes below must match it.
const GLIDE_MS = 220

function Glyph({ children, ...props }: SVGProps<SVGSVGElement>) {
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
      {children}
    </svg>
  )
}

function HomeGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
    </Glyph>
  )
}

function GownGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M2.5 9.5 12 5l9.5 4.5L12 14z" />
      <path d="M6.5 11.8V16c1.6 1.4 3.4 2 5.5 2s3.9-.6 5.5-2v-4.2M21.5 9.5V15" />
    </Glyph>
  )
}

/** Two speech bubbles: the St:talk small-group talk. */
function TalkGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M4 5.5h10a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 14 13.5H8.5L5 16.5v-3H4A1.5 1.5 0 0 1 2.5 12V7A1.5 1.5 0 0 1 4 5.5z" />
      <path d="M17.5 9.5H20a1.5 1.5 0 0 1 1.5 1.5v4.5a1.5 1.5 0 0 1-1.5 1.5h-1v2.5l-3-2.5h-4" />
    </Glyph>
  )
}

function NoticeGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 5.5 2 7 2 7H4s2-1.5 2-7M10 20a2.2 2.2 0 0 0 4 0" />
    </Glyph>
  )
}

/**
 * 예약 and 내 예약 need a session, but a panel that is always mounted can't sit
 * behind RequireAuth's redirect — a guest swiping past it would be thrown to
 * sign-in. Each asks in place instead, and turns back into the prompt the
 * moment the session ends.
 */
function SignInPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  const { user, status } = useAuth()
  const { openLoginModal } = useAuthModal()

  if (status === 'loading') return <LoadingState label="로그인 상태를 확인하고 있어요" />
  if (user) return <Deferred>{children}</Deferred>
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-12">
      <EmptyState
        title={title}
        headingLevel={1}
        description={description}
        actions={
          <Button label="로그인" variant="primary" size="lg" onClick={() => openLoginModal()} />
        }
      />
    </section>
  )
}

function ReservationPanel() {
  return (
    <SignInPanel
      title="로그인하고 학위복을 예약해요"
      description="구글 계정으로 로그인하면 예약 일정과 수령 안내를 확인하고 바로 예약할 수 있어요."
    >
      <ReservationGuidePage />
    </SignInPanel>
  )
}

function MyApplicationsPanel() {
  return (
    <SignInPanel
      title="로그인하고 내 신청을 확인해요"
      description="구글 계정으로 로그인하면 학위복 예약과 St:talk 신청 내용을 볼 수 있어요."
    >
      <MyApplicationsPage />
    </SignInPanel>
  )
}

interface MobileTab {
  label: string
  /** The screen's name beside the logo in the top bar; empty on the home, where the logo is the name. */
  title: string
  /** Where the tab's button, and a swipe onto its panel, lead. */
  path: string
  /** Every URL that shows the panel itself rather than a page beneath it. */
  roots: readonly string[]
  icon: IconType | IconName
  Panel: ComponentType
}

const TABS: readonly MobileTab[] = [
  { label: '홈', title: '', path: PATHS.home, roots: [PATHS.home], icon: HomeGlyph, Panel: MobileLanding },
  {
    label: '예약',
    title: '학위복 대여',
    path: PATHS.public.reservationGuide,
    roots: [PATHS.public.reservationGuide],
    icon: GownGlyph,
    Panel: ReservationPanel,
  },
  {
    // Public (MNT-4·44): the guide panel itself handles sign-in for 신청하기.
    label: 'St:talk',
    title: 'St:talk',
    path: PATHS.public.mentoring,
    roots: [PATHS.public.mentoring],
    icon: TalkGlyph,
    Panel: MentoringGuidePage,
  },
  {
    label: '공지',
    title: '공지사항',
    path: PATHS.public.announcements,
    roots: [PATHS.public.announcements],
    icon: NoticeGlyph,
    Panel: AnnouncementsListPage,
  },
  {
    // One panel for both applications (MNT-45); every account URL lands here.
    label: '내 신청',
    title: '내 신청',
    path: PATHS.me.home,
    roots: [PATHS.me.home, PATHS.me.reservations, PATHS.me.mentoring],
    icon: 'calendar',
    Panel: MyApplicationsPanel,
  },
]

const tabId = (index: number) => `mobile-tab-${index}`
const panelId = (index: number) => `mobile-panel-${index}`

/** The tab a URL belongs to: its panel (`isRoot`), or a page beneath it. */
function tabFor(pathname: string): { index: number; isRoot: boolean } | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  const root = TABS.findIndex((tab) => tab.roots.includes(path))
  if (root >= 0) return { index: root, isRoot: true }
  // Home is the parent of nothing: every path would otherwise start with it.
  const parent = TABS.findIndex(
    (tab) => tab.path !== PATHS.home && tab.roots.some((r) => path.startsWith(`${r}/`)),
  )
  return parent >= 0 ? { index: parent, isRoot: false } : null
}

/** The tab nearest to where the pager is scrolled. */
function pagerIndex(pager: HTMLElement): number {
  if (pager.clientWidth <= 0) return 0
  return Math.max(0, Math.min(TABS.length - 1, Math.round(pager.scrollLeft / pager.clientWidth)))
}

/** Whether the pager sits on a tab; scroll positions land on device pixels. */
function isAtTab(pager: HTMLElement, index: number): boolean {
  return Math.abs(pager.scrollLeft - index * pager.clientWidth) < 2
}

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'

/**
 * A bar tab's colour, read off the pager rather than the URL: `--tab-on` is 1
 * on the tab in view and fades to 0 a tab away, so the highlight moves with
 * the finger mid-swipe instead of switching once the pager comes to rest.
 */
function tabTone(index: number | null): CSSProperties {
  return {
    '--tab-on':
      index === null
        ? 0
        : `max(0, 1 - max(var(--nav-active) - ${index}, ${index} - var(--nav-active)))`,
    color:
      'color-mix(in oklab, var(--color-text-accent) calc(var(--tab-on) * 100%), var(--color-text-secondary))',
  } as CSSProperties
}

interface AutoScroll {
  element: HTMLElement
  hasArrived: () => boolean
}

export function MobileTabs() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const match = tabFor(pathname)
  // The URL's tab. A page outside every tab (404, a legacy redirect) has none
  // and leaves the pager where it was.
  const current = match?.index ?? null
  const onRoot = match?.isRoot ?? false

  // The tab the pager has come to rest on. It trails the URL while a swipe or
  // a tap's slide is still moving: switching panels mid-move would make the one
  // under the finger inert.
  const [shown, setShown] = useState(current ?? 0)
  const rootRef = useRef<HTMLDivElement>(null)
  const pagerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLElement | null)[]>([])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  // Where the pager is, or is on its way to.
  const targetRef = useRef(current ?? 0)
  // The URL as the scroll listeners, attached once, see it.
  const routeRef = useRef({ current, onRoot })
  const wasOnRootRef = useRef(onRoot)

  // A slide the code started — a tap's glide, re-aligning after a resize — is
  // not the student swiping: it must not pick a tab on its way through. It
  // runs until it arrives, or until the student touches, wheels or types and
  // so takes over. Not a timer: a busy phone can deliver the first scroll
  // event long after any fixed delay.
  const autoRef = useRef<AutoScroll | null>(null)

  // A bar tap's glide. The browser's smooth scroll is slow, and slower the
  // further it goes; stepping scrollLeft per frame is quick but runs on the
  // main thread, which iOS holds to 60Hz while a swipe moves at 120Hz. So the
  // pager jumps to the tab at once — final and snapped from the first frame —
  // and the track eases in from where it showed as a transform transition,
  // which the compositor runs at full rate. While `data-gliding` is on the
  // root, the tab colours ease along on the same curve.
  const glideTimerRef = useRef(0)
  const endGlide = useCallback(() => {
    window.clearTimeout(glideTimerRef.current)
    const root = rootRef.current
    const track = trackRef.current
    if (!root || !track || root.dataset.gliding === undefined) return
    delete root.dataset.gliding
    // Not left at translateX(0): any transform makes the track a containing
    // block for `position: fixed` inside the panels (see design/motion.css).
    track.style.removeProperty('transform')
  }, [])

  const goTo = useCallback(
    (index: number, behavior: ScrollBehavior) => {
      const root = rootRef.current
      const pager = pagerRef.current
      const track = trackRef.current
      if (!root || !pager || !track) return
      targetRef.current = index
      const isHere = isAtTab(pager, index)
      if (isHere) setShown(index)
      // Already there with nothing in flight: there will be no scroll, so no
      // event would ever end the guard. Otherwise scroll even when "there" — it
      // cancels a slide still heading for another tab (back pressed mid-slide).
      if (isHere && autoRef.current?.element !== pager) return
      autoRef.current = { element: pager, hasArrived: () => isAtTab(pager, index) }
      const left = index * pager.clientWidth
      // Where the content shows now, a glide still under way included.
      const shownAt = pager.scrollLeft - new DOMMatrixReadOnly(getComputedStyle(track).transform).m41
      if (behavior !== 'smooth' || Math.abs(left - shownAt) < 1) {
        endGlide()
        pager.scrollTo({ left, behavior: 'instant' })
        return
      }
      // Snapping is off while gliding: snap areas move with the transform, and
      // mandatory snapping would drag the scroll after them.
      track.style.transition = 'none'
      root.dataset.gliding = ''
      track.style.transform = `translateX(${left - shownAt}px)`
      pager.scrollTo({ left, behavior: 'instant' })
      navRef.current?.style.setProperty('--nav-active', String(index))
      track.getBoundingClientRect() // start the transition from the offset
      track.style.removeProperty('transition')
      track.style.transform = 'translateX(0px)'
      // transitionend ends it; this covers a transition that never runs.
      window.clearTimeout(glideTimerRef.current)
      glideTimerRef.current = window.setTimeout(endGlide, GLIDE_MS + 100)
    },
    [endGlide],
  )

  useLayoutEffect(() => {
    const root = rootRef.current
    const pager = pagerRef.current
    if (!root || !pager) return
    let timer = 0
    const settle = () => {
      window.clearTimeout(timer)
      // A slide the code started ends here, once it has arrived and snapping
      // has finished moving it — not at its first scroll event on the target.
      const auto = autoRef.current
      if (auto?.element === pager) {
        if (!auto.hasArrived()) return
        autoRef.current = null
      }
      const index = pagerIndex(pager)
      targetRef.current = index
      setShown(index)
      const route = routeRef.current
      if (route.onRoot && index !== route.current) navigate(TABS[index].path, { replace: true })
    }
    const onInput = () => {
      autoRef.current = null
    }
    // A swipe settles as soon as the browser says it has ended. A scroll the
    // code drives doesn't: an instant scroll's scrollend can come before its
    // scroll event, and ending the guard there lets that event pick a tab
    // half-way. It settles once quiet instead.
    const onScrollEnd = () => {
      if (autoRef.current?.element !== pager) settle()
    }
    // The highlight follows the finger; the tab is decided at rest.
    const onScroll = () => {
      if (pager.clientWidth > 0) {
        navRef.current?.style.setProperty(
          '--nav-active',
          String(pager.scrollLeft / pager.clientWidth),
        )
      }
      window.clearTimeout(timer)
      timer = window.setTimeout(settle, SETTLE_DELAY_MS)
    }
    // A width change (rotation, unfolding) re-centres the tab being shown.
    // Height alone changes whenever the address bar slides, swipes included.
    let width = pager.clientWidth
    goTo(targetRef.current, 'instant')
    const observer = new ResizeObserver(() => {
      if (pager.clientWidth === width) return
      width = pager.clientWidth
      goTo(targetRef.current, 'instant')
    })
    observer.observe(pager)
    const inputs = ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const
    inputs.forEach((type) => root.addEventListener(type, onInput, { capture: true, passive: true }))
    pager.addEventListener('scroll', onScroll, { passive: true })
    pager.addEventListener('scrollend', onScrollEnd)
    return () => {
      window.clearTimeout(timer)
      endGlide()
      observer.disconnect()
      inputs.forEach((type) => root.removeEventListener(type, onInput, { capture: true }))
      pager.removeEventListener('scroll', onScroll)
      pager.removeEventListener('scrollend', onScrollEnd)
    }
  }, [endGlide, goTo, navigate])

  // The URL moved (a bar tap, back/forward, a link inside a panel): bring
  // the pager to its tab — sliding when it is on screen, at once from a page
  // that covered it.
  useEffect(() => {
    routeRef.current = { current, onRoot }
    const wasOnRoot = wasOnRootRef.current
    wasOnRootRef.current = onRoot
    if (current === null || current === targetRef.current) return
    goTo(current, wasOnRoot ? scrollBehavior() : 'instant')
  }, [current, onRoot, goTo])

  const scrollPanelToTop = (index: number) => {
    const panel = panelRefs.current[index]
    if (!panel || panel.scrollTop <= 0) return
    panel.scrollTo({ top: 0, behavior: scrollBehavior() })
  }

  // Another tab slides over to it. The tab already on screen goes back to its
  // top, and from a page beneath a tab its button returns to the panel.
  const pickTab = (index: number) => {
    if (index === current && onRoot) scrollPanelToTop(index)
    else navigate(TABS[index].path)
  }

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1
    const keyTargets: Record<string, number> = {
      ArrowRight: Math.min(last, index + 1),
      ArrowLeft: Math.max(0, index - 1),
      Home: 0,
      End: last,
    }
    const next = keyTargets[event.key]
    if (next === undefined) return
    event.preventDefault()
    if (next !== index) pickTab(next)
    tabRefs.current[next]?.focus({ preventScroll: true })
  }

  // The tab in view names the bar; a page outside every tab (404) shows the committee.
  const titleIndex = current ?? (match === null ? null : shown)
  const title = titleIndex === null ? null : TABS[titleIndex].title

  return (
    <div ref={rootRef} className="group/tabs flex h-full flex-col">
      {/* The site's logo with the tab in view beside it, the same shape as the
          flows' bar (logo | step); the panels' own h1s stay for screen readers
          (sr-only on a phone). */}
      <header className="flex h-16 flex-none items-center gap-3 border-b border-border bg-surface px-4">
        <LogoLockup />
        {title && (
          <>
            <span aria-hidden className="h-[22px] w-px shrink-0 bg-border" />
            <span aria-hidden className="min-w-0 flex-1 truncate text-[15px] font-bold text-primary">
              {title}
            </span>
          </>
        )}
        <span className="ml-auto shrink-0">
          <AccountMenu />
        </span>
      </header>
      <div className="relative min-h-0 flex-1">
        <div
          ref={pagerRef}
          inert={!onRoot}
          className={`h-full snap-x snap-mandatory overflow-x-auto group-data-[gliding]/tabs:snap-none overflow-y-hidden overscroll-x-contain [scrollbar-width:none] ${
            onRoot ? '' : 'invisible'
          }`}
        >
          <div
            ref={trackRef}
            className="flex h-full group-data-[gliding]/tabs:transition-transform group-data-[gliding]/tabs:duration-220 group-data-[gliding]/tabs:ease-[var(--ease-standard)]"
            onTransitionEnd={(event) => {
              if (event.target === event.currentTarget) endGlide()
            }}
          >
            {TABS.map((tab, index) => (
              <section
                key={tab.path}
                ref={(element) => {
                  panelRefs.current[index] = element
                }}
                id={panelId(index)}
                role="tabpanel"
                aria-labelledby={tabId(index)}
                tabIndex={index === shown ? 0 : -1}
                inert={index !== shown}
                className="relative h-full w-full shrink-0 snap-start snap-always overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-width:none] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-bg"
              >
                <tab.Panel />
              </section>
            ))}
          </div>
        </div>

        {!onRoot && (
          <div key={pathname} className="absolute inset-0 overflow-y-auto overscroll-y-contain bg-body [scrollbar-width:none]">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        )}
      </div>

      <div className="flex-none border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        <div
          ref={navRef}
          role="tablist"
          aria-label="주요 메뉴"
          className="mx-auto flex h-14 w-full max-w-[41.25rem] items-stretch px-1"
          style={{ '--nav-active': shown } as CSSProperties}
        >
          {TABS.map((tab, index) => (
            <button
              key={tab.path}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              type="button"
              role="tab"
              id={tabId(index)}
              aria-label={tab.label}
              aria-selected={index === current}
              aria-controls={panelId(index)}
              tabIndex={index === (current ?? shown) ? 0 : -1}
              className="flex min-w-0 flex-1 basis-0 cursor-pointer select-none flex-col items-center justify-center gap-0.5 rounded-[var(--radius-inner)] border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-bg group-data-[gliding]/tabs:transition-[color] group-data-[gliding]/tabs:duration-220 group-data-[gliding]/tabs:ease-[var(--ease-standard)] motion-reduce:transition-none"
              style={tabTone(current === null ? null : index)}
              onClick={() => pickTab(index)}
              onKeyDown={(event) => onTabKey(event, index)}
            >
              <Icon icon={tab.icon} size="md" color="inherit" />
              <span
                aria-hidden
                className="whitespace-nowrap text-[0.6875rem] leading-[1rem] [font-weight:calc(500_+_200_*_var(--tab-on))]"
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
