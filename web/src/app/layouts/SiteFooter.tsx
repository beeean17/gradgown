import { FOOTER_COLUMNS, ORG } from '../../shared/content/contact'
import { useMediaQuery } from '../../shared/hooks/useMediaQuery'

/**
 * The site footer under every wide-screen page (PublicLayout). Phones have the
 * bottom navigation instead; below the wide breakpoint it would keep only the
 * brand block.
 */
export function SiteFooter() {
  const wide = useMediaQuery('(min-width: 1024px)')

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-background-surface)]">
      <div className="mx-auto grid w-full max-w-[73.75rem] grid-cols-[repeat(auto-fit,minmax(13.125rem,1fr))] gap-[clamp(1.25rem,3vw,2.5rem)] px-6 pb-[clamp(1.125rem,2vw,1.5rem)] pt-[clamp(1.25rem,2.4vw,1.75rem)]">
        <div>
          <p className="text-[1.3125rem] font-extrabold tracking-[-0.02em] text-[var(--color-accent)]">
            {ORG.brand}
          </p>
          <p className="mt-2 text-[0.8438rem] leading-[1.65] text-[var(--color-text-secondary)]">
            {ORG.tagline.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>

        {wide &&
          FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{col.title}</p>
              <p className="mt-2 text-[0.8438rem] leading-[1.75] text-[var(--color-text-secondary)]">
                {col.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            </div>
          ))}
      </div>
    </div>
  )
}
