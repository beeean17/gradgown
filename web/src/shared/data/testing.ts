import type { LiveSource } from './live'

/**
 * Tester privilege. The original service let listed testers apply outside the
 * application window (`settings_private/*_testing`). This project leaves that
 * out (docs/decisions/scope.md), so nobody is a tester: the source answers
 * `false` at once, and the screens that ask keep working unchanged.
 */

export function testingKey(documentId: string, uid: string): string {
  return `user:${uid}:${documentId}`
}

export function testingSource(_documentId: string, _uid: string): LiveSource<boolean> {
  return ({ next }) => {
    next(false)
    return () => {}
  }
}
