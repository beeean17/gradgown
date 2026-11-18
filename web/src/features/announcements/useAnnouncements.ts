import { useCallback, useMemo } from 'react'
import { doc } from 'firebase/firestore'
import { firebase } from '../../shared/firebase/runtime'
import { restartLive, useLive } from '../../shared/data/live'
import { docSource } from '../../shared/data/snapshots'
import { iso, obj, str, type Data } from '../../shared/data/values'
import type { Announcement } from '../../shared/types'

/**
 * `information/announcements` is one public document: `metadata` plus one map
 * entry per announcement. One listener serves every screen that shows them.
 */
const KEY = 'doc:information/announcements'

export function toAnnouncements(data: Data): Announcement[] {
  return Object.entries(data)
    .filter(([id]) => id !== 'metadata')
    .map(([id, value]) => {
      const entry = obj(value)
      const createdAt = iso(entry.createdAt)
      return {
        id,
        title: str(entry.title),
        content: str(entry.content),
        category: str(entry.category) || '일반',
        tags: [],
        attachments: [],
        isPinned: entry.isPinned === true,
        isVisible: entry.isVisible === true,
        showOnHome: entry.showOnToggle === true,
        isPopup: entry.isPopup === true,
        authorId: str(entry.authorId),
        createdAt,
        updatedAt: iso(entry.updatedAt) || createdAt,
        publishedAt: createdAt || null,
      }
    })
    .filter((item) => item.isVisible && item.title)
    .sort(
      (a, b) => Number(b.isPinned) - Number(a.isPinned) || b.createdAt.localeCompare(a.createdAt),
    )
}

const source = docSource(
  () => doc(firebase().db, 'information', 'announcements'),
  (data) => toAnnouncements(data ?? {}),
)

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
