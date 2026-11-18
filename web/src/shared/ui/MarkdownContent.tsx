import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MobileMarkdownTable } from './MobileMarkdownTable'

export interface MarkdownProps {
  content: string
  className?: string
  compact?: boolean
}

export function MarkdownContent({ content, className = '', compact = false }: MarkdownProps) {
  return (
    <div className={`prose-container ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }: ComponentPropsWithoutRef<'h1'>) => (
            <h2
              className="mt-6 mb-3 text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] first:mt-0"
              {...props}
            >
              {children}
            </h2>
          ),
          h2: ({ children, ...props }: ComponentPropsWithoutRef<'h2'>) => (
            <h3
              className="mt-5 mb-2.5 text-lg sm:text-xl font-bold tracking-tight text-[var(--color-text-primary)]"
              {...props}
            >
              {children}
            </h3>
          ),
          h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
            <h4
              className="mt-4 mb-2 text-base sm:text-lg font-bold text-[var(--color-text-primary)]"
              {...props}
            >
              {children}
            </h4>
          ),
          h4: ({ children, ...props }: ComponentPropsWithoutRef<'h4'>) => (
            <h5
              className="mt-3 mb-1.5 text-sm sm:text-base font-semibold text-[var(--color-text-primary)]"
              {...props}
            >
              {children}
            </h5>
          ),
          p: ({ children, ...props }: ComponentPropsWithoutRef<'p'>) => (
            <p
              className={compact ? 'my-3 text-sm leading-relaxed text-primary break-words' : 'my-3 text-[0.9375rem] sm:text-base leading-relaxed text-[var(--color-text-primary)] break-words'}
              {...props}
            >
              {children}
            </p>
          ),
          ul: ({ children, ...props }: ComponentPropsWithoutRef<'ul'>) => (
            <ul
              className={compact ? 'my-3 pl-5 list-disc space-y-1.5 text-sm text-primary leading-relaxed' : 'my-3 pl-5 list-disc space-y-1.5 text-[0.9375rem] sm:text-base text-[var(--color-text-primary)] leading-relaxed'}
              {...props}
            >
              {children}
            </ul>
          ),
          ol: ({ children, ...props }: ComponentPropsWithoutRef<'ol'>) => (
            <ol
              className={compact ? 'my-3 pl-5 list-decimal space-y-1.5 text-sm text-primary leading-relaxed' : 'my-3 pl-5 list-decimal space-y-1.5 text-[0.9375rem] sm:text-base text-[var(--color-text-primary)] leading-relaxed'}
              {...props}
            >
              {children}
            </ol>
          ),
          li: ({ children, ...props }: ComponentPropsWithoutRef<'li'>) => (
            <li className="leading-relaxed" {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children }: ComponentPropsWithoutRef<'blockquote'>) => {
            if (compact) {
              return <blockquote className="my-4 border-y border-border py-1 text-sm leading-relaxed text-primary">{children}</blockquote>
            }
            const text = String(children || '')
            const isDanger = text.includes('[위험]') || text.includes('[유의]')
            const isPoint = text.includes('[안내]') || text.includes('[필수]')

            let toneClasses =
              'border-[var(--color-border)] bg-[var(--color-background-muted)]'
            if (isDanger) {
              toneClasses = 'border-[var(--color-border-red)] bg-[color-mix(in_srgb,var(--color-error)_8%,transparent)]'
            } else if (isPoint) {
              toneClasses = 'border-[var(--color-border-yellow)] bg-[color-mix(in_srgb,var(--color-warning)_8%,transparent)]'
            }

            return (
              <blockquote
                className={`my-4 rounded-xl border p-4 text-[0.9375rem] leading-relaxed text-[var(--color-text-primary)] ${toneClasses}`}
              >
                {children}
              </blockquote>
            )
          },
          table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => compact ? (
            <MobileMarkdownTable>{children}</MobileMarkdownTable>
          ) : (
            <div className="my-4 overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full text-left text-sm border-collapse" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }: ComponentPropsWithoutRef<'thead'>) => (
            <thead
              className="border-b border-[var(--color-border)] bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] font-semibold"
              {...props}
            >
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }: ComponentPropsWithoutRef<'tbody'>) => (
            <tbody className="divide-y divide-[var(--color-border)]" {...props}>
              {children}
            </tbody>
          ),
          th: ({ children, ...props }: ComponentPropsWithoutRef<'th'>) => (
            <th className="px-4 py-3 font-semibold" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }: ComponentPropsWithoutRef<'td'>) => (
            <td className="px-4 py-3 text-[var(--color-text-primary)]" {...props}>
              {children}
            </td>
          ),
          hr: ({ ...props }: ComponentPropsWithoutRef<'hr'>) => (
            <hr className="my-6 border-[var(--color-border)]" {...props} />
          ),
          strong: ({ children, ...props }: ComponentPropsWithoutRef<'strong'>) => (
            <strong className="font-bold text-[var(--color-text-primary)]" {...props}>
              {children}
            </strong>
          ),
          a: ({ children, ...props }: ComponentPropsWithoutRef<'a'>) => (
            <a
              className="font-medium text-[var(--color-text-accent)] underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          code: ({ children, className: codeClass, ...props }: ComponentPropsWithoutRef<'code'>) => (
            <code
              className={`rounded border border-[var(--color-border)] bg-[var(--color-background-muted)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-text-accent)] ${codeClass || ''}`}
              {...props}
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
