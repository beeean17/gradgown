import { Children, isValidElement, type ReactNode } from 'react'

function elements(children: ReactNode) {
  return Children.toArray(children).filter(
    isValidElement<{
      children?: ReactNode
      node?: { tagName?: string }
    }>,
  )
}

/** Reflow the actual Markdown cells, including inline formatting, into rows. */
export function MobileMarkdownTable({ children }: { children?: ReactNode }) {
  const groups = elements(children)
  const head = groups.find((group) => (group.props.node?.tagName ?? group.type) === 'thead')
  const body = groups.find((group) => (group.props.node?.tagName ?? group.type) === 'tbody')
  const headerRow = elements(head?.props.children)[0]
  const labels = elements(headerRow?.props.children).map((cell) => cell.props.children)
  const rows = elements(body?.props.children)

  return (
    <section className="my-4 divide-y divide-border border-y border-border" aria-label="표">
      {rows.map((row, rowIndex) => {
        const cells = elements(row.props.children)
        return (
          <dl key={row.key ?? rowIndex} className="m-0 grid grid-cols-3 items-start gap-3 py-3">
            {cells.map((cell, index) => (
              <div key={cell.key ?? index} className="min-w-0">
                <dt className="text-xs text-secondary">{labels[index] ?? `항목 ${index + 1}`}</dt>
                <dd
                  className={`m-0 mt-1 break-words text-sm ${index === 0 ? 'font-bold text-accent' : 'text-primary'}`}
                >
                  {cell.props.children}
                </dd>
              </div>
            ))}
          </dl>
        )
      })}
    </section>
  )
}
