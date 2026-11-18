import { defineTheme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'

/**
 * Grad42 brand theme (logo: blue cap + yellow tassel).
 *
 * - MAIN  #3858c6 → the design-system accent. Drives primary buttons, links,
 *   selected nav/tabs, focus rings — the structural brand color.
 * - POINT #fdc953 → the custom `--color-point` token, defined in
 *   design/tokens.css (custom tokens can't go through the typed theme map).
 *   Used sparingly for highlights: pinned badges, the reservation step
 *   progress, small accent marks. Not for body text (low contrast).
 */
export const brandTheme = defineTheme({
  name: 'grad42',
  extends: neutralTheme,
  color: { accent: '#3858c6', neutralStyle: 'cool' },
  tokens: {
    '--color-accent': ['#3858c6', '#7c93e6'],
    // Noto Sans + Noto Sans KR (self-hosted, see design/index.css). Latin
    // first so it wins for ASCII; the KR face covers 한글 and everything else.
    '--font-family-body': "'Noto Sans Variable', 'Noto Sans KR Variable', system-ui, sans-serif",
    '--font-family-heading': "'Noto Sans Variable', 'Noto Sans KR Variable', system-ui, sans-serif",
  },
  components: {
    // Solid fills are independent of the lighter dark-mode text accents.
    // Keep shared button sizing, focus, hover, pressed and disabled behavior.
    button: {
      'variant:primary': {
        backgroundColor: 'var(--color-button-primary)',
        color: 'var(--color-on-dark)',
      },
      'variant:destructive': {
        backgroundColor: 'var(--color-button-destructive)',
        color: 'var(--color-on-dark)',
      },
    },
    // Every modal shares the same surface chrome. Content and action hierarchy
    // live in shared modal components such as ConfirmationDialog.
    dialog: {
      base: {
        backgroundColor: 'var(--color-background-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-container)',
        boxShadow: 'var(--shadow-high)',
      },
    },
  },
})
