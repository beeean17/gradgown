import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LoginDialog } from '../../features/auth/components/LoginDialog'
import { safeRedirectTo } from '../../app/routes/redirectTo'
import { completeRedirectSignIn } from './session'

interface AuthModalContextType {
  openLoginModal: (options?: { redirectTo?: string; onSuccess?: () => void }) => void
  closeLoginModal: () => void
  isLoginOpen: boolean
}

const AuthModalContext = createContext<AuthModalContextType | null>(null)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [redirectPath, setRedirectPath] = useState<string | null>(null)
  const [successCallback, setSuccessCallback] = useState<(() => void) | null>(null)
  const [initialError, setInitialError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // A redirect sign-in lands back on the page that started it; finish the trip
  // to where the student was headed, or reopen the dialog with the error.
  useEffect(() => {
    let active = true
    completeRedirectSignIn().then(({ returnTo, error }) => {
      if (!active) return
      if (returnTo) navigate(returnTo, { replace: true })
      if (error) {
        setInitialError(error)
        setIsOpen(true)
      }
    })
    return () => {
      active = false
    }
  }, [navigate])

  // Handle URL params like ?login=1&redirectTo=...
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('login') === '1' || params.get('login') === 'reserve') {
      const redirect = params.get('redirectTo')
      setRedirectPath(redirect ? safeRedirectTo(redirect) : null)
      setIsOpen(true)
      params.delete('login')
      params.delete('redirectTo')
      const remaining = params.toString()
      const newUrl = location.pathname + (remaining ? `?${remaining}` : '')
      window.history.replaceState({}, '', newUrl)
    }
  }, [location.pathname, location.search])

  const openLoginModal = useCallback(
    (options?: { redirectTo?: string; onSuccess?: () => void }) => {
      setRedirectPath(options?.redirectTo ? safeRedirectTo(options.redirectTo) : null)
      setSuccessCallback(() => options?.onSuccess ?? null)
      setInitialError(null)
      setIsOpen(true)
    },
    [],
  )

  const closeLoginModal = useCallback(() => {
    setIsOpen(false)
    setRedirectPath(null)
    setSuccessCallback(null)
    setInitialError(null)
  }, [])

  const handleSuccess = useCallback(() => {
    if (successCallback) {
      successCallback()
    }
    if (redirectPath) {
      navigate(redirectPath)
    }
    setRedirectPath(null)
    setSuccessCallback(null)
  }, [navigate, redirectPath, successCallback])

  return (
    <AuthModalContext.Provider value={{ openLoginModal, closeLoginModal, isLoginOpen: isOpen }}>
      {children}
      <LoginDialog
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) closeLoginModal()
          else setIsOpen(true)
        }}
        onSuccess={handleSuccess}
        returnTo={redirectPath ?? `${location.pathname}${location.search}`}
        initialError={initialError}
      />
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider')
  }
  return context
}
