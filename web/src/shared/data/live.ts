import { useSyncExternalStore } from 'react'

/**
 * A value that is read from the server and kept fresh (it streamed from
 * Firestore in the original). Screens render all three states:
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

/** Starts reading and returns a function that stops it. See `fetchSource`. */
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
 * last value instead of a spinner. Sharing also means one request per key
 * however many components show it.
 */
const entries = new Map<string, Entry>()
const IDLE_MS = 30_000

function entryFor(key: string, source: LiveSource<unknown>): Entry {
  let entry = entries.get(key)
  if (!entry) {
    entry = { key, state: LOADING, listeners: new Set(), source, stop: null, idle: null }
    entries.set(key, entry)
  }
  return entry
}

function publish(entry: Entry, state: Live<unknown>) {
  entry.state = state
  entry.listeners.forEach((listener) => listener())
}

function start(entry: Entry) {
  entry.stop = entry.source({
    next: (data) => publish(entry, { status: 'ready', data, error: null }),
    // The source keeps reading after a failure (see `fetchSource`), so its
    // stop function stays: `restartLive` and the idle timer still need it.
    fail: (error) => publish(entry, { status: 'error', data: undefined, error }),
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
  return entries.get(key)?.state ?? LOADING
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

/**
 * Reads again every stream whose key matches, leaving the last value on
 * screen until the new one arrives. Used after a command: the REST server does
 * not push changes the way a Firestore listener did.
 */
export function refreshLive(match: (key: string) => boolean) {
  entries.forEach((entry, key) => {
    if (!match(key) || !entry.stop) return
    if (entry.listeners.size === 0) {
      // Nobody is looking; the next reader starts a fresh read.
      stop(entry)
      return
    }
    entry.stop()
    start(entry)
  })
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
