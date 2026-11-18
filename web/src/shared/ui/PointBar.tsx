/**
 * Small yellow "point" accent (logo tassel color). A brand signature mark used
 * sparingly above page/hero titles. Uses the --color-point custom token.
 */
export function PointBar({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block h-1 w-8 rounded-full bg-[var(--color-point)] ${className}`}
    />
  )
}
