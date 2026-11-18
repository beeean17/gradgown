import { useCallback, useMemo } from 'react'
import { restartLive, useLive } from '../../shared/data/live'
import { fetchSource } from '../../shared/data/fetchSource'
import type { Announcement } from '../../shared/types'

/**
 * The announcements come from the student server, which reads the view of
 * visible announcements: a hidden one never reaches the browser. In the
 * original they were one public Firestore document, hidden entries included,
 * and this module filtered them. One stream serves every screen.
 */
const KEY = 'doc:information/announcements'

/** Visible announcements only, pinned first, then newest first: the server filters and sorts. */
const source = fetchSource<Announcement[]>('/api/announcements')

const EMPTY: Announcement[] = []

/** Visible announcements, pinned first, then newest first. */
export function useAnnouncements() {
  const live = useLive(KEY, source)
  const retry = useCallback(() => restartLive(KEY), [])
  return { items: live.data ?? EMPTY, status: live.status, retry }
}

/**
 * Only what an admin pinned — the landing hero shows these and nothing else,
 * so pinning is the single lever that decides what greets a visitor.
 */
export function usePinnedAnnouncements(limit = 3) {
  const { items, status } = useAnnouncements()
  const pinned = useMemo(
    () =>
      items
        .filter((a) => a.isPinned)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    [items, limit],
  )
  return { items: pinned, status }
}

export function useAnnouncement(id: string | undefined) {
  const { items, status, retry } = useAnnouncements()
  return { item: items.find((a) => a.id === id), all: items, status, retry }
}

export function announcementCategories(items: Announcement[]): string[] {
  return Array.from(new Set(items.map((a) => a.category)))
}
