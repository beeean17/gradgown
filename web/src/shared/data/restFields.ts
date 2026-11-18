import { Timestamp } from 'firebase/firestore'
import type { Data } from './values'

/**
 * Firestore REST typed values (`{ stringValue }`, `{ mapValue: { fields } }`,
 * …) → the plain data a snapshot's `data()` returns, Timestamps included, so
 * the same mappers (`toPeriod`, …) read both.
 */
export function fromRestFields(fields: unknown): Data {
  const out: Data = {}
  if (!fields || typeof fields !== 'object') return out
  for (const [name, value] of Object.entries(fields)) out[name] = fromRestValue(value)
  return out
}

function fromRestValue(value: unknown): unknown {
  if (!value || typeof value !== 'object') return null
  const typed = value as Record<string, unknown>
  if ('stringValue' in typed) return typed.stringValue
  if ('booleanValue' in typed) return typed.booleanValue
  if ('integerValue' in typed) return Number(typed.integerValue)
  if ('doubleValue' in typed) return typed.doubleValue
  if ('timestampValue' in typed) return Timestamp.fromDate(new Date(String(typed.timestampValue)))
  if ('mapValue' in typed) return fromRestFields((typed.mapValue as { fields?: unknown })?.fields)
  if ('arrayValue' in typed) {
    const values = (typed.arrayValue as { values?: unknown[] })?.values
    return Array.isArray(values) ? values.map(fromRestValue) : []
  }
  return null
}
