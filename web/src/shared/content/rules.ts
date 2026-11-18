/**
 * A rule a student is told before agreeing, split into the half that changes
 * their behaviour (`term`, set bold) and the reason (`detail`). Guide pages
 * are scanned, not read, so the bold half has to carry the meaning alone.
 */
export interface Rule {
  term: string
  detail: string
}
