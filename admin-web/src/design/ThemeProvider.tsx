import type { ReactNode } from 'react'
import { Theme } from '@astryxdesign/core/theme'
import { brandTheme } from './theme.ts'
// Light or dark follows the operating system; the console keeps no switch of its own.
export function AdminTheme({ children }: { children: ReactNode }) {
  return <Theme theme={brandTheme} mode="system">{children}</Theme>
}
