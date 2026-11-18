import {
  onSnapshot,
  type DocumentReference,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore'
import type { LiveSource } from './live'
import type { Data } from './values'

/**
 * Firestore sources for `useLive` that never report an unconfirmed "nothing".
 *
 * A listener that cannot reach the server is answered from the local cache,
 * which for data not fetched yet this session is "no document" / "no results".
 * Passed on, that tells a student there is no schedule, no notice — or no
 * reservation — when the truth is "not loaded". So an empty answer from the
 * cache is held back and the stream stays `loading` until the server confirms
 * it. `includeMetadataChanges` is what delivers that confirmation: without it,
 * Firestore stays silent when the server agrees with the empty cache.
 *
 * References are built lazily so importing a feature never touches Firebase.
 */
export function docSource<T>(
  ref: () => DocumentReference,
  map: (data: Data | undefined) => T,
): LiveSource<T> {
  return ({ next, fail }) =>
    onSnapshot(
      ref(),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.fromCache && !snapshot.exists()) return
        next(map(snapshot.data()))
      },
      fail,
    )
}

export function querySource<T>(
  query: () => Query,
  map: (snapshot: QuerySnapshot) => T,
): LiveSource<T> {
  return ({ next, fail }) =>
    onSnapshot(
      query(),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.fromCache && snapshot.empty) return
        next(map(snapshot))
      },
      fail,
    )
}
