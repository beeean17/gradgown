import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleAuthProvider, onIdTokenChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import type { Runtime } from '../data/firebase.ts'
import type { AdminSessionState, ConsoleAccess, ConsoleAccount } from '../contracts/admin-view.ts'
import { errorMessage } from '../data/format.ts'

const accountOf = (user: User | null): ConsoleAccount | undefined => user ? { uid: user.uid, email: user.email ?? '' } : undefined

export function useAdminSession(runtime: Runtime) {
  const [state, setState] = useState<AdminSessionState>({ status: 'checking-auth' })
  const sequence = useRef(0)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let unsubscribe = () => {}
    let disposed = false
    const denied = () => { sequence.current++; setState({ status: 'forbidden', account: accountOf(runtime.auth.currentUser) }) }
    runtime.access.addEventListener('denied', denied)
    runtime.ready.then(() => {
      if (disposed) return
      unsubscribe = onIdTokenChanged(runtime.auth, async user => {
        const ticket = ++sequence.current
        if (!user) { setState({ status: 'signed-out' }); return }
        setState({ status: 'checking-permission' })
        try {
          const result = await httpsCallable<unknown, { uid: string } & ConsoleAccess>(runtime.functions, 'getAdminContext')({})
          if (result.data.uid !== user.uid) throw new Error('서버 권한 확인 결과가 현재 계정과 다릅니다.')
          const { role, permissions } = result.data
          if (!['master', 'admin'].includes(role) || !Array.isArray(permissions)) throw new Error('서버 권한 확인 결과를 해석하지 못했습니다. 새로고침해 주세요.')
          if (!disposed && ticket === sequence.current) setState({ status: 'authorized', uid: user.uid, email: user.email ?? '', access: { role, permissions } })
        } catch (error) {
          if (disposed || ticket !== sequence.current) return
          const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
          setState(code.includes('permission-denied') ? { status: 'forbidden', account: accountOf(user) } : { status: 'error', message: errorMessage(error) })
        }
      })
    }).catch(error => { if (!disposed) setState({ status: 'error', message: errorMessage(error) }) })
    return () => { disposed = true; sequence.current++; unsubscribe(); runtime.access.removeEventListener('denied', denied) }
  }, [runtime, retry])
  const login = useCallback(async () => {
    try {
      await runtime.ready
      const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(runtime.auth, provider)
    } catch (error) { setState({ status: 'error', message: errorMessage(error) }) }
  }, [runtime])
  const logout = useCallback(async () => {
    sequence.current++
    setState({ status: 'checking-auth' }) // Unmount all private state before asynchronous sign-out.
    try { await signOut(runtime.auth); setState({ status: 'signed-out' }) }
    catch (error) { setState({ status: 'error', message: errorMessage(error) }) }
  }, [runtime])
  return { state, login, logout, retry: () => setRetry(n => n + 1) }
}
