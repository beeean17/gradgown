import { createContext, useContext } from 'react'
import type { ConsoleAccess, ConsoleAccount, ConsolePermission, ConsoleRole } from '../contracts/admin-view.ts'

export type ConsoleUser = ConsoleAccount & { access: ConsoleAccess }
/** What each role may do: an admin reads, a master also opens and closes applications (docs/decisions/scope.md). */
export const accessOf = (role: ConsoleRole): ConsoleAccess => ({ role, permissions: role === 'master' ? ['console.view', 'applications.open'] : ['console.view'] })
// Least privilege until a session provides its own.
export const ConsoleUserContext = createContext<ConsoleUser>({ uid: '', email: '', access: accessOf('admin') })
export const useConsoleUser = () => useContext(ConsoleUserContext)
/**
 * Whether to show a control. This is a convenience, not the boundary: the server does not check
 * the role, and for an admin it is MySQL that refuses the write (403 `permission-denied`).
 */
export function useCan(): (permission: ConsolePermission) => boolean {
  const { access } = useConsoleUser()
  return permission => access.permissions.includes(permission)
}
export const isViewOnly = ({ permissions }: ConsoleAccess) => permissions.every(permission => permission === 'console.view')
/** Every permission, in the order the account menu lists them. */
export const PERMISSION_LABELS: readonly (readonly [ConsolePermission, string])[] = [
  ['console.view', '예약·신청·설정·공지·로그 조회'],
  ['applications.open', '회차·행사 접수 열기·닫기'],
]
export function roleBadge(access: ConsoleAccess): { label: string; color: 'purple' | 'gray' } {
  return access.role === 'master' ? { label: '마스터', color: 'purple' } : { label: '관리자', color: 'gray' }
}
export const roleTitle = (access: ConsoleAccess) => access.role === 'master' ? '마스터 관리자' : '관리자'
