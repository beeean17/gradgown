import type { AdminApi, ContentEntry } from '../contracts/admin-view.ts'
import { ApiError, query, request } from './http.ts'

// The two content lists as the server sends them; the screens read both as ContentEntry.
type Announcement = Omit<ContentEntry, 'tags' | 'order'>
type Faq = { id: string; question: string; answer: string; category: string; tags: string[]; order: number; isVisible: boolean }
const ID = /^\d{4}-(0[1-9]|1[0-2])$/
/** 'all' is this app's word for "no filter"; the server takes a missing parameter. */
const filter = <T extends string | number>(value: 'all' | T): T | null => value === 'all' ? null : value

/**
 * `AdminApi` over the admin server (docs/contracts/web-api.md "관리자 API"). Searching, filtering,
 * paging and counting are the server's: every argument here becomes a query parameter.
 */
export function createAdminApi(sessionLost: () => void): AdminApi {
  const api: AdminApi = {
    getPeriod: () => request('GET', '/api/admin/gown/periods/current'),
    listSlots: periodId => request('GET', `/api/admin/gown/slots${query({ periodId })}`),
    async listReservations({ periodId, search, status, cursor }) {
      if (!ID.test(periodId)) throw new Error('회차를 YYYY-MM 형식으로 입력해 주세요.')
      return request('GET', `/api/admin/gown/reservations${query({ periodId, q: search.trim(), status: filter(status), cursor })}`)
    },
    async setPeriodOpen(periodId, isOpen) { await request('PUT', `/api/admin/gown/periods/${encodeURIComponent(periodId)}/open`, { isOpen }) },
    getEvent: () => request('GET', '/api/admin/mentoring/events/current'),
    async listMentoring({ eventId, search, status, first, second }) {
      if (!ID.test(eventId)) throw new Error('행사 ID를 YYYY-MM 형식으로 입력해 주세요.')
      return request('GET', `/api/admin/mentoring/registrations${query({ eventId, q: search.trim(), status: filter(status), first: filter(first), second: filter(second) })}`)
    },
    async getMentoringCounts(eventId) {
      if (!ID.test(eventId)) throw new Error('행사 ID를 YYYY-MM 형식으로 입력해 주세요.')
      return request('GET', `/api/admin/mentoring/counts${query({ eventId })}`)
    },
    async setEventOpen(eventId, isOpen) { await request('PUT', `/api/admin/mentoring/events/${encodeURIComponent(eventId)}/open`, { isOpen }) },
    async getContent(kind) {
      if (kind === 'faq') return (await request<Faq[]>('GET', '/api/admin/faqs')).map(({ id, question, answer, category, tags, order, isVisible }) => ({ id, title: question, content: answer, category, isVisible, isPinned: false, isPopup: false, showOnHome: false, tags, order }))
      return (await request<Announcement[]>('GET', '/api/admin/announcements')).map(({ id, title, content, category, isVisible, isPinned, isPopup, showOnHome }) => ({ id, title, content, category, isVisible, isPinned, isPopup, showOnHome, tags: [], order: 0 }))
    },
    listAudit: ({ domain, outcome, operationId, cursor }) => request('GET', `/api/admin/audit-logs${query({ domain: filter(domain), outcome: filter(outcome), operationId: operationId || null, cursor })}`),
  }
  // The server keeps sessions in memory: after a restart every request is 401 and the app
  // goes back to the login screen. A 403 is not that: it is MySQL refusing an admin's write.
  return Object.fromEntries(Object.entries(api).map(([name, method]) => [name, async (...args: unknown[]) => {
    try { return await Reflect.apply(method, api, args) }
    catch (error) {
      if (error instanceof ApiError && error.code === 'unauthenticated') sessionLost()
      throw error
    }
  }])) as unknown as AdminApi
}
