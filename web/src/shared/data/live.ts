import { useSyncExternalStore } from 'react'

/**
 * A value that streams from Firestore. Screens render all three states:
 * `loading` must not flash a wrong "empty" answer, and `error` must not be
 * mistaken for "nothing there".
 */
export type Live<T> =
  | { status: 'loading'; data: undefined; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'error'; data: undefined; error: Error }

export type LiveEmitter<T> = {
  next: (data: T) => void
  fail: (error: Error) => void
}

/** Opens a Firestore listener and returns its unsubscribe. */
export type LiveSource<T> = (emit: LiveEmitter<T>) => () => void

const LOADING: Live<never> = { status: 'loading', data: undefined, error: null }

interface Entry {
  key: string
  state: Live<unknown>
  listeners: Set<() => void>
  source: LiveSource<unknown>
  stop: (() => void) | null
  idle: ReturnType<typeof setTimeout> | null
}

/**
 * One listener per key, shared by every component that reads it, and kept
 * alive briefly after the last reader leaves so moving between pages shows the
 * last value instead of a spinner. Firestore bills per document change, not
 * per subscriber, so sharing is free; the grace period is only for UX.
 */
const entries = new Map<string, Entry>()
const IDLE_MS = 30_000
// First values from somewhere faster than a key's listener (primeLive).
const primed = new Map<string, Live<unknown>>()

function entryFor(key: string, source: LiveSource<unknown>): Entry {
  let entry = entries.get(key)
  if (!entry) {
    entry = { key, state: LOADING, listeners: new Set(), source, stop: null, idle: null }
    entries.set(key, entry)
  }
  return entry
}

function publish(entry: Entry, state: Live<unknown>) {
  // The listener has answered; a primed value must never stand in for it again.
  if (state.status !== 'loading') primed.delete(entry.key)
  entry.state = state
  entry.listeners.forEach((listener) => listener())
}

function start(entry: Entry) {
  entry.stop = entry.source({
    next: (data) => publish(entry, { status: 'ready', data, error: null }),
    fail: (error) => {
      // Firestore closes a listener after an error; forget it so the next
      // reader (or `restartLive`) opens a fresh one.
      entry.stop = null
      publish(entry, { status: 'error', data: undefined, error })
    },
  })
}

function stop(entry: Entry) {
  if (entry.idle) clearTimeout(entry.idle)
  entry.idle = null
  entry.stop?.()
  entry.stop = null
}

function subscribe(key: string, source: LiveSource<unknown>, listener: () => void): () => void {
  const entry = entryFor(key, source)
  entry.listeners.add(listener)
  if (entry.idle) {
    clearTimeout(entry.idle)
    entry.idle = null
  }
  if (!entry.stop) start(entry)
  return () => {
    entry.listeners.delete(listener)
    if (entry.listeners.size > 0) return
    entry.idle = setTimeout(() => {
      stop(entry)
      // Data that belongs to someone should not outlive their session in memory.
      if (entry.state.status !== 'ready') entries.delete(key)
    }, IDLE_MS)
  }
}

/**
 * Subscribes to the stream named `key`. `null` means "nothing to read yet"
 * (e.g. no signed-in user) and reports `loading`. The source is captured the
 * first time a key is seen, so it must be fully determined by the key.
 */
export function useLive<T>(key: string | null, source: LiveSource<T>): Live<T> {
  const read = () => (key ? stateOf(key) : LOADING) as Live<T>
  return useSyncExternalStore(key ? subscriberFor(key, source as LiveSource<unknown>) : noSubscription, read, read)
}

function stateOf(key: string): Live<unknown> {
  const state = entries.get(key)?.state ?? LOADING
  return state.status === 'loading' ? (primed.get(key) ?? state) : state
}

/**
 * A first value for `key` from somewhere faster than its listener — the edge
 * copy of a public document. Readers see it only until the listener first
 * answers; after that it is dropped, so it can never replace live data.
 */
export function primeLive<T>(key: string, data: T) {
  const entry = entries.get(key)
  if (entry && entry.state.status !== 'loading') return
  primed.set(key, { status: 'ready', data, error: null })
  entry?.listeners.forEach((listener) => listener())
}

const noSubscription = () => () => {}
const subscribers = new Map<string, (listener: () => void) => () => void>()

/** A stable subscribe function per key, so React never resubscribes on re-render. */
function subscriberFor(key: string, source: LiveSource<unknown>) {
  let subscribeToKey = subscribers.get(key)
  if (!subscribeToKey) {
    subscribeToKey = (listener) => subscribe(key, source, listener)
    subscribers.set(key, subscribeToKey)
  }
  return subscribeToKey
}

/** Re-opens a listener that ended in an error (a "다시 시도" button). */
export function restartLive(key: string) {
  const entry = entries.get(key)
  if (!entry) return
  stop(entry)
  publish(entry, LOADING)
  if (entry.listeners.size > 0) start(entry)
}

/**
 * Closes every stream whose key matches and leaves readers on their last
 * value — called just before sign-out reloads the page, so a user's
 * reservations stop listening (and would then fail on the rules) without the
 * screen flashing a spinner on the way out.
 */
export function stopLive(match: (key: string) => boolean) {
  for (const [key, entry] of entries) {
    if (match(key)) stop(entry)
  }
}
