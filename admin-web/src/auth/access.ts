import { createContext, useContext } from 'react'
import type { ConsoleAccess, ConsoleAccount, ConsolePermission } from '../contracts/admin-view.ts'

export type ConsoleUser = ConsoleAccount & { access: ConsoleAccess }
// Least privilege until a session provides its own.
export const ConsoleUserContext = createContext<ConsoleUser>({ uid: '', email: '', access: { role: 'admin', permissions: ['console.view'] } })
export const useConsoleUser = () => useContext(ConsoleUserContext)
/** Whether the server would allow this. adminCommand re-checks every write regardless. */
export function useCan(): (permission: ConsolePermission) => boolean {
  const { access } = useConsoleUser()
  return permission => access.permissions.includes(permission)
}
export const isViewOnly = ({ permissions }: ConsoleAccess) => permissions.every(permission => permission === 'console.view')
/** Every permission the server knows, in the order the account menu lists them. */
export const PERMISSION_LABELS: readonly (readonly [ConsolePermission, string])[] = [
  ['console.view', '예약·신청·설정·공지·로그 조회'],
  ['reservation.write', '예약 추가·변경·취소'],
  ['reservation.delete', '예약 영구 삭제'],
  ['mentoring.write', 'St:talk 신청 추가·변경·취소'],
  ['mentoring.delete', 'St:talk 신청 영구 삭제'],
  ['settings.write', '접수·행사 설정, 테스터 변경'],
  ['content.write', '공지·FAQ 작성·삭제'],
  ['mail.send', '메일 발송·예약 백업'],
  ['members.manage', '관리자 등록·해제'],
]
export function roleBadge(access: ConsoleAccess): { label: string; color: 'purple' | 'gray' | 'teal' } {
  if (access.role === 'master') return { label: '마스터', color: 'purple' }
  return { label: '관리자', color: isViewOnly(access) ? 'gray' : 'teal' }
}
export const roleTitle = (access: ConsoleAccess) => access.role === 'master' ? '마스터 관리자' : '관리자'
