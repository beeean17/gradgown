import { defineTheme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'

// Brand baseline: web/src/design/theme.ts, 2026-09-05. No cross-app imports.
export const brandTheme = defineTheme({
  name: 'grad42-admin',
  extends: neutralTheme,
  color: { accent: '#3858c6', neutralStyle: 'cool' },
  tokens: {
    '--color-accent': ['#3858c6', '#7c93e6'],
    '--font-family-body': "'Noto Sans', 'Noto Sans KR', system-ui, sans-serif",
    '--font-family-heading': "'Noto Sans', 'Noto Sans KR', system-ui, sans-serif",
  },
})
