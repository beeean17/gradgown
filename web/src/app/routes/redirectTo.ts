import { PATHS } from './paths'

/** Query parameter that carries "where the user was headed" through sign-in. */
export const REDIRECT_PARAM = 'redirectTo'

/**
 * Only in-app destinations survive. Anything that could leave the origin — an
 * absolute URL, or the protocol-relative `//host` and `/\host` forms — is
 * dropped in favour of the fallback, so a crafted `/login?redirectTo=…` link
 * cannot bounce a user off the site once real sign-in replaces the mock.
 */
export function safeRedirectTo(value: string | null | undefined, fallback: string = PATHS.home): string {
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}

/** Reads and validates the destination a sign-in should return to. */
export function readRedirectTo(search: string, fallback?: string): string {
  return safeRedirectTo(new URLSearchParams(search).get(REDIRECT_PARAM), fallback)
}
