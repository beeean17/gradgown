import { doc, onSnapshot, Timestamp } from 'firebase/firestore'
import { firebase } from '../firebase/runtime'
import type { LiveSource } from './live'
import { obj, type Data } from './values'

/**
 * `settings_private/{reservation_testing,mentoring_testing}`: the accounts
 * operations let through outside the public windows. The rules let admins and
 * the testers a document lists read it; everyone else is denied, which is the
 * ordinary "not a tester" answer rather than a failure — so it never blocks a
 * student.
 */

/** Mirrors the server's `isTester`: enabled, not expired, and this UID listed. */
export function isListedTester(data: Data | undefined, uid: string, now: Date = new Date()): boolean {
  const expiresAt = data?.expiresAt
  return (
    data?.enabled === true &&
    expiresAt instanceof Timestamp &&
    now.getTime() < expiresAt.toMillis() &&
    obj(data.allowedUserIds)[uid] === true
  )
}

export function testingKey(documentId: string, uid: string): string {
  return `user:${uid}:${documentId}`
}

export function testingSource(documentId: string, uid: string): LiveSource<boolean> {
  return ({ next }) =>
    onSnapshot(
      doc(firebase().db, 'settings_private', documentId),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.fromCache && !snapshot.exists()) return
        next(isListedTester(snapshot.data(), uid))
      },
      () => next(false),
    )
}
