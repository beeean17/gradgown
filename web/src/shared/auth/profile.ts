import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { firebase } from '../firebase/runtime'

const pending = new Map<string, Promise<void>>()

async function writeProfile(user: User): Promise<void> {
  const { db } = firebase()
  const ref = doc(db, 'users', user.uid)
  const email = user.email ?? ''
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) {
    // Exactly the four keys the rules accept on create.
    await setDoc(ref, { email, role: 'student', createdAt: serverTimestamp(), lastLogin: serverTimestamp() })
    return
  }
  try {
    await updateDoc(ref, { email, lastLogin: serverTimestamp() })
  } catch (error) {
    // Older documents may miss fields the update rule compares; the profile
    // already exists, which is all reservations need, so this is not fatal.
    console.warn('[grad42] lastLogin 갱신을 건너뜁니다.', error)
  }
}

/**
 * `reservationCommand` refuses users without a `users/{uid}` document, so the
 * first sign-in creates it. Memoised per uid: the auth listener starts it, and
 * a reservation submit awaits the same promise instead of racing it.
 */
export function ensureProfile(user: User): Promise<void> {
  let task = pending.get(user.uid)
  if (!task) {
    task = writeProfile(user).catch((error) => {
      pending.delete(user.uid)
      throw error
    })
    pending.set(user.uid, task)
  }
  return task
}
