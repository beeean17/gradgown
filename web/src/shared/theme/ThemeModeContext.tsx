import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Theme } from '@astryxdesign/core/theme'
import { brandTheme } from '../../design/theme'
import { ThemeModeContext, type ThemeMode, type ThemePreference } from './themeMode'

const STORAGE_KEY = 'grad42:theme-mode'
const CHANGE_EVENT = 'grad42:theme-change'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function savedPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // Storage blocked (private mode): follow the device.
  }
  return 'system'
}

function systemMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/**
 * Light, dark, or the device's own setting — the default, followed live as the
 * device switches (an evening auto-dark included). An explicit choice is kept
 * in localStorage; 'system' is stored too, so the choice survives a reload.
 */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(savedPreference)
  const [deviceMode, setDeviceMode] = useState<ThemeMode>(systemMode)
  const mode: ThemeMode = preference === 'system' ? deviceMode : preference

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const onChange = () => setDeviceMode(query.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage blocked: the choice lasts until reload.
    }
  }, [])

  // Compatibility seam for any non-React surface that still dispatches the
  // original theme event. React controls use the context directly.
  useEffect(() => {
    const onThemeChange = (event: Event) => {
      const next = (event as CustomEvent<ThemePreference>).detail
      if (next === 'light' || next === 'dark' || next === 'system') setPreference(next)
    }

    window.addEventListener(CHANGE_EVENT, onThemeChange)
    return () => window.removeEventListener(CHANGE_EVENT, onThemeChange)
  }, [setPreference])

  // A home-screen web app takes its status bar colour from `theme-color`, not
  // from the page: without it the bar keeps the phone's own light/dark setting
  // whatever mode is picked here. Follow the canvas (design/base.css), which
  // the mode has just recoloured — <Theme> below sets it before this runs.
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.append(meta)
    }
    meta.content = getComputedStyle(document.documentElement).backgroundColor
  }, [mode])

  const value = useMemo(() => ({ mode, preference, setPreference }), [mode, preference, setPreference])

  return (
    <ThemeModeContext.Provider value={value}>
      <Theme theme={brandTheme} mode={mode}>
        {children}
      </Theme>
    </ThemeModeContext.Provider>
  )
}
