import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '@astryxdesign/core/Spinner'
import { VStack } from '@astryxdesign/core/Stack'
import { useAuth } from '../../shared/auth/useAuth'
import { readRedirectTo } from './redirectTo'

/**
 * The session is read from the server asynchronously, so the first render after a
 * reload has no user yet. Redirecting on that frame would throw a signed-in
 * user off every protected URL they refresh — `/me` would land on `/home`.
 * Guards therefore wait on `loading` instead of deciding.
 */
function AuthPending() {
  return (
    <VStack padding={6} hAlign="center" vAlign="center" minHeight="60dvh">
      <Spinner label="로그인 상태를 확인하고 있어요" />
    </VStack>
  )
}

/** Blocks unauthenticated tasks but preserves the requested destination. */
export function RequireAuth() {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <AuthPending />
  if (user) return <Outlet />
  const from = `${location.pathname}${location.search}${location.hash}`
  return <Navigate to={`/?login=1&redirectTo=${encodeURIComponent(from)}`} replace />
}

/** Keeps an already-signed-in user out of the sign-in screen. */
export function RequireGuest() {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <AuthPending />
  // Honour the destination even when the session already exists: a shared
  // `/login?redirectTo=/me/profile` link should still reach the profile.
  return user ? <Navigate to={readRedirectTo(location.search)} replace /> : <Outlet />
}
