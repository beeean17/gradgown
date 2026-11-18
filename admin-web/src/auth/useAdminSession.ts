import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdminSessionState, TestAccount } from '../contracts/admin-view.ts'
import { ApiError, request } from '../data/http.ts'
import { errorMessage } from '../data/format.ts'
import { accessOf } from './access.ts'

type Me = { uid: string; email: string; role: string }
function authorized({ uid, email, role }: Me): AdminSessionState {
  if (role !== 'master' && role !== 'admin') throw new Error('서버가 알려 준 계정 등급을 해석하지 못했습니다. 새로고침해 주세요.')
  return { status: 'authorized', uid, email, access: accessOf(role) }
}

/**
 * The test login (docs/decisions/test-login.md): the server lists the seeded admin and master
 * accounts, and picking one signs in as it. There is no password. The session is a cookie.
 */
export function useAdminSession() {
  const [state, setState] = useState<AdminSessionState>({ status: 'checking-auth' })
  // Only the latest check, login or logout may set the state.
  const sequence = useRef(0)
  const [check, setCheck] = useState(0)
  useEffect(() => {
    const ticket = ++sequence.current
    setState({ status: 'checking-auth' })
    void (async () => {
      try {
        let next: AdminSessionState
        try { next = authorized(await request<Me>('GET', '/api/me')) }
        catch (error) {
          if (!(error instanceof ApiError) || error.code !== 'unauthenticated') throw error
          next = { status: 'signed-out', accounts: await request<TestAccount[]>('GET', '/api/auth/accounts') }
        }
        if (ticket === sequence.current) setState(next)
      } catch (error) { if (ticket === sequence.current) setState({ status: 'error', message: errorMessage(error) }) }
    })()
  }, [check])
  /** Asks the server again who is signed in. The API layer calls it when a request comes back 401. */
  const recheck = useCallback(() => setCheck(n => n + 1), [])
  const login = useCallback(async (email: string) => {
    const ticket = ++sequence.current
    setState({ status: 'checking-auth' })
    try {
      const next = authorized(await request<Me>('POST', '/api/auth/login', { email }))
      if (ticket === sequence.current) setState(next)
    } catch (error) { if (ticket === sequence.current) setState({ status: 'error', message: errorMessage(error) }) }
  }, [])
  const logout = useCallback(async () => {
    const ticket = ++sequence.current
    setState({ status: 'checking-auth' }) // Unmount all private state before the request.
    try { await request('POST', '/api/auth/logout'); if (ticket === sequence.current) recheck() }
    catch (error) { if (ticket === sequence.current) setState({ status: 'error', message: errorMessage(error) }) }
  }, [recheck])
  return { state, login, logout, recheck }
}
