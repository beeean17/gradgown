import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LoginDialog } from '../../features/auth/components/LoginDialog'
import { safeRedirectTo } from '../../app/routes/redirectTo'

interface AuthModalContextType {
  openLoginModal: (options?: { redirectTo?: string; onSuccess?: () => void }) => void
  closeLoginModal: () => void
  isLoginOpen: boolean
}

const AuthModalContext = createContext<AuthModalContextType | null>(null)

/**
 * One login modal for the whole app. A screen opens it with where to go, or
 * what to do, once the student has signed in.
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [redirectPath, setRedirectPath] = useState<string | null>(null)
  const [successCallback, setSuccessCallback] = useState<(() => void) | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // `?login=1` (or `?login=reserve`) in a link opens the modal on arrival.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('login') === '1' || params.get('login') === 'reserve') {
      const redirect = params.get('redirectTo')
      setRedirectPath(redirect ? safeRedirectTo(redirect) : null)
      setIsOpen(true)

      // Clean the URL so a refresh does not open the modal again.
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
      setIsOpen(true)
    },
    [],
  )

  const closeLoginModal = useCallback(() => {
    setIsOpen(false)
    setRedirectPath(null)
    setSuccessCallback(null)
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
