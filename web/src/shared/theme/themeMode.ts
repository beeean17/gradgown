import { createContext, useContext } from 'react'

/** The colours on screen. */
export type ThemeMode = 'light' | 'dark'
/** What the student picked: a fixed mode, or the device's (the default). */
export type ThemePreference = 'system' | ThemeMode

export interface ThemeModeContextValue {
  /** Resolved: the device's mode while `preference` is 'system'. */
  mode: ThemeMode
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext)
  if (!context) throw new Error('useThemeMode must be used within ThemeModeProvider')
  return context
}
