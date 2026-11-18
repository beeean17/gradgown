import { LinkProvider } from '@astryxdesign/core/Link'
import { Outlet } from 'react-router-dom'
import { RouterLink } from './RouterLink'
import { AuthModalProvider } from '../shared/auth/AuthModalContext'

/**
 * Top-level route element. Lives inside the router so RouterLink can use
 * useNavigate, and registers it for every Astryx link in the tree.
 */
export function Root() {
  return (
    <LinkProvider component={RouterLink}>
      <AuthModalProvider>
        <Outlet />
      </AuthModalProvider>
    </LinkProvider>
  )
}
