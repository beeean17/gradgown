export function timestamp(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date: Date = value.toDate()
    return Number.isFinite(date.getTime()) ? date.toISOString() : ''
  }
  return ''
}
export function version(value: unknown): string {
  if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value)
    return `${value.seconds}:${value.nanoseconds}`
  return ''
}
export function displayDate(iso: string): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '확인 필요'
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
}
export function toLocalInput(iso: string): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return ''
  return new Date(Date.parse(iso) + 9 * 3600000).toISOString().slice(0, 16)
}
export function fromLocalInput(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('날짜와 시각을 YYYY-MM-DDTHH:mm 형식으로 입력해 주세요.')
  const date = new Date(`${value}:00+09:00`)
  if (!Number.isFinite(date.getTime()) || toLocalInput(date.toISOString()) !== value) throw new Error('유효한 날짜와 시각을 입력해 주세요.')
  return date.toISOString()
}
export function errorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  const details = error && typeof error === 'object' && 'details' in error && error.details && typeof error.details === 'object' ? error.details as Record<string, unknown> : {}
  const operationId = typeof details.operationId === 'string' ? details.operationId : ''
  const trace = (message: string) => operationId ? `${message} 요청 추적 ID: ${operationId}` : message
  if (code.includes('permission-denied')) return trace('관리자 권한이 없거나 변경되었습니다. 다시 로그인해 주세요.')
  if (code.includes('unauthenticated')) return trace('인증 또는 App Check 확인에 실패했습니다. 다시 로그인해 주세요.')
  if (code.includes('aborted')) return trace('다른 탭에서 변경된 데이터입니다. 닫은 뒤 새로고침하고 다시 확인해 주세요.')
  if (code.includes('not-found')) return trace('대상 데이터 또는 관리자 서버가 없습니다. 연결 설정을 확인해 주세요.')
  if (code.includes('unavailable') || code.includes('network')) return trace('서버에 연결할 수 없습니다. 연결을 확인하고 다시 시도해 주세요.')
  if (code.includes('deadline-exceeded')) return trace('처리 결과를 확인하지 못했습니다. 새로고침으로 반영 여부를 확인한 후 다시 시도해 주세요.')
  if (error instanceof Error && (!code || code.includes('invalid-argument') || code.includes('failed-precondition'))) return trace(error.message)
  return trace('요청을 처리하지 못했습니다. 연결 설정과 서버 상태를 확인해 주세요.')
}
