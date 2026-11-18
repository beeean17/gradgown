import { lazy, Suspense } from 'react'
import { stripMarkdown } from '../lib/markdown'
import type { MarkdownProps } from './MarkdownContent'

// react-markdown and remark-gfm are a tenth of the bundle and only a notice's
// body or an opened FAQ answer needs them, so they load with the first one.
const MarkdownContent = lazy(() =>
  import('./MarkdownContent').then((module) => ({ default: module.MarkdownContent })),
)

/** Markdown body. Until the parser arrives, the same words show as plain text. */
export function MarkdownRenderer(props: MarkdownProps) {
  return (
    <Suspense
      fallback={
        <p
          className={`prose-container my-3 break-words leading-relaxed text-primary ${
            props.compact ? 'text-sm' : 'text-[0.9375rem] sm:text-base'
          } ${props.className ?? ''}`}
        >
          {stripMarkdown(props.content)}
        </p>
      }
    >
      <MarkdownContent {...props} />
    </Suspense>
  )
}
