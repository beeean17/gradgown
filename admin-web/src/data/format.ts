/** `YYYY-MM-DDTHH:mm` on the Seoul wall clock, or '' when the text is not a time. */
function seoulLocal(iso: string): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return ''
  return new Date(Date.parse(iso) + 9 * 3600000).toISOString().slice(0, 16)
}
/** The Seoul calendar day (YYYY-MM-DD) of an ISO instant. */
export const seoulDay = (iso: string) => seoulLocal(iso).slice(0, 10)
/** The Seoul wall-clock time (HH:mm) of an ISO instant. */
export const seoulClock = (iso: string) => seoulLocal(iso).slice(11, 16)
export function displayDate(iso: string): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '확인 필요'
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
}
/** With the year, for periods that run across one: `2026-11-01 09:00`. */
export function displayDateTime(iso: string): string {
  return seoulLocal(iso).replace('T', ' ') || '확인 필요'
}
export function errorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  if (code === 'permission-denied') return '권한이 없습니다. 이 작업은 마스터 관리자만 할 수 있습니다.'
  if (code === 'unauthenticated') return '로그인이 풀렸습니다. 다시 로그인해 주세요.'
  if (code === 'unavailable') return '서버에 연결할 수 없습니다. 관리자용 서버가 켜져 있는지 확인하고 다시 시도해 주세요.'
  // Everything else the server refuses (invalid-argument, not-found, failed-precondition) explains itself.
  if (code !== 'internal' && error instanceof Error && error.message) return error.message
  return '요청을 처리하지 못했습니다. 서버 상태를 확인해 주세요.'
}
