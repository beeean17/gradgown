/**
 * Korean phone numbers, judged by digit count for their prefix rather than by
 * prefix alone: 010 is always 11 digits, Seoul (02) 9–10, and every other
 * number — legacy 011–019 mobiles, area codes, 070 — 10–11.
 */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function isCompletePhone(value: string): boolean {
  const digits = phoneDigits(value)
  if (digits.startsWith('010')) return digits.length === 11
  if (digits.startsWith('02')) return digits.length === 9 || digits.length === 10
  return digits.length === 10 || digits.length === 11
}

/** Hyphenates while typing, keeping every digit the user enters (up to 11). */
export function formatPhone(value: string): string {
  const digits = phoneDigits(value).slice(0, 11)
  if (digits.startsWith('02')) {
    const d = digits.slice(0, 10)
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
  }
  if (digits.length <= 3) return digits
  // 010 is always 3-4-4, so group it that way from the start.
  if (digits.startsWith('010')) {
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}
