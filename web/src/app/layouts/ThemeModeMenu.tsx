import { useState, type SVGProps } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Popover } from '@astryxdesign/core/Popover'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { useThemeMode, type ThemePreference } from '../../shared/theme/themeMode'

const LABELS: Record<ThemePreference, string> = { system: '시스템', light: '라이트', dark: '다크' }

function Glyph({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

function SystemGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
      <path d="M9 20h6M12 16.5V20" />
    </Glyph>
  )
}

function LightGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </Glyph>
  )
}

function DarkGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph {...props}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </Glyph>
  )
}

const GLYPHS: Record<ThemePreference, typeof SystemGlyph> = { system: SystemGlyph, light: LightGlyph, dark: DarkGlyph }

/** 시스템 · 라이트 · 다크, the one control both the account menu and the guest's button use. */
export function ThemeModeControl({ className }: { className?: string }) {
  const { preference, setPreference } = useThemeMode()
  return (
    <SegmentedControl
      value={preference}
      onChange={(value) => setPreference(value as ThemePreference)}
      label="화면 모드"
      size="sm"
      className={className}
    >
      {(Object.keys(LABELS) as ThemePreference[]).map((key) => (
        <SegmentedControlItem key={key} value={key} label={LABELS[key]} />
      ))}
    </SegmentedControl>
  )
}

/**
 * The screen mode for a visitor who has not signed in — the signed-in keep it
 * in the account menu. An icon showing the current choice, opening the same
 * three-way control.
 */
export function GuestThemeButton({ className }: { className?: string }) {
  const { preference } = useThemeMode()
  const [isOpen, setOpen] = useState(false)
  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setOpen}
      placement="below"
      alignment="end"
      width="15rem"
      label="화면 모드"
      closeButtonLabel="화면 모드 닫기"
      className="!p-1"
      content={
        <section className="flex items-center gap-2 px-2.5 py-2" aria-label="화면 모드">
          <span className="text-xs text-secondary">화면 모드</span>
          <ThemeModeControl className="ml-auto" />
        </section>
      }
    >
      <Button
        label={`화면 모드: ${LABELS[preference]}`}
        variant="ghost"
        size="sm"
        isIconOnly
        icon={<Icon icon={GLYPHS[preference]} size="sm" />}
        className={className}
      />
    </Popover>
  )
}
