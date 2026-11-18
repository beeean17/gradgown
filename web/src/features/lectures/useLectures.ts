import { mockLectures, mockRegistrations } from './mockData'
import { isWithin } from '../../shared/lib/datetime'
import type { Lecture, LectureRegistration } from '../../shared/types'

export type LectureAvailability =
  | 'open' // within apply window
  | 'upcoming' // before apply window
  | 'closed' // after apply window or status closed
  | 'archived'

export function lectureAvailability(lecture: Lecture, now: Date = new Date()): LectureAvailability {
  if (lecture.status === 'archived') return 'archived'
  if (lecture.status === 'closed') return 'closed'
  if (now.getTime() < new Date(lecture.applyStartAt).getTime()) return 'upcoming'
  if (isWithin(lecture.applyStartAt, lecture.applyEndAt, now)) return 'open'
  return 'closed'
}

/** Public, visible lectures, soonest first. Firestore seam (lecturesIndex). */
export function useLectures(): Lecture[] {
  return [...mockLectures]
    .filter((l) => l.isVisible && l.status !== 'draft')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export function useLecture(id: string | undefined): Lecture | undefined {
  return mockLectures.find((l) => l.lectureId === id)
}

/** The current user's registration for a lecture, if any (mocked as u_101). */
export function useMyRegistration(lectureId: string | undefined): LectureRegistration | undefined {
  return mockRegistrations.find(
    (r) => r.lectureId === lectureId && r.uid === 'u_101' && r.status !== 'cancelled',
  )
}
