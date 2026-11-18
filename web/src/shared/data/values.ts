import { Timestamp } from 'firebase/firestore'
import { toKstIso } from '../lib/datetime'

/**
 * Defensive readers for Firestore data. Documents are written by three
 * generations of code (Flutter, admin-web, Functions), so every field is read
 * as `unknown` and narrowed here instead of being trusted by a cast.
 */
export type Data = Record<string, unknown>

export const str = (value: unknown): string => (typeof value === 'string' ? value : '')

/** A finite number, else `null`. */
export const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/** An array of strings, dropping anything else. */
export const strList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

export const obj = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Data) : {}

/** Timestamp → Seoul ISO string; anything else → '' (shown as "확인 필요"). */
export function iso(value: unknown): string {
  if (value instanceof Timestamp) return toKstIso(value.toDate())
  return ''
}

/** The server's optimistic-lock token: `seconds:nanoseconds` of a Timestamp. */
export function version(value: unknown): string {
  return value instanceof Timestamp ? `${value.seconds}:${value.nanoseconds}` : ''
}
