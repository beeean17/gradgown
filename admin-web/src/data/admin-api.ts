import { collection, collectionGroup, doc, getDocFromServer, getDocsFromServer, limit, orderBy, query, startAfter, where } from 'firebase/firestore'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import type { AdminApi, FunctionLogFilter, FunctionLogPage, UserLookup } from '../contracts/admin-view.ts'
import type { Runtime } from './firebase.ts'
import { auditRow, contentRows, membersRow, mentoringRow, mentoringSettingsRow, reservationRow, settingsRow, testingRow } from './mapper.ts'

// An event is ~8 mentors × ~8 students per session; this is far above it.
const MENTORING_READ_LIMIT = 1000
export function createAdminApi(runtime: Runtime): AdminApi {
  const { db, functions, storage } = runtime
  const api: AdminApi = {
    async getSettings() { const snap = await getDocFromServer(doc(db, 'settings/reservation')); return snap.exists() ? settingsRow(snap.data()) : null },
    async getTesting(kind = 'reservation') { const snap = await getDocFromServer(doc(db, `settings_private/${kind}_testing`)); return snap.exists() ? testingRow(snap.data()) : null },
    async getMentoringSettings() { const snap = await getDocFromServer(doc(db, 'settings/mentoring')); return snap.exists() ? mentoringSettingsRow(snap.data()) : null },
    async listReservations(periodId, cursor) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodId)) throw new Error('회차를 YYYY-MM 형식으로 입력해 주세요.')
      const constraints = [where('periodId', '==', periodId), orderBy('createdAt', 'desc'), ...(cursor ? [startAfter(cursor as QueryDocumentSnapshot)] : []), limit(51)]
      const snap = await getDocsFromServer(query(collectionGroup(db, 'gown_reservations'), ...constraints))
      return { rows: snap.docs.slice(0, 50).map(d => reservationRow(d.ref.path, d.data())), hasNext: snap.docs.length > 50, cursor: snap.docs[49] }
    },
    async listMentoring(eventId) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(eventId)) throw new Error('행사 ID를 YYYY-MM 형식으로 입력해 주세요.')
      // Same shape as the server's settings check, so the (eventId, createdAt) index serves it.
      const snap = await getDocsFromServer(query(collectionGroup(db, 'mentoring_registrations'), where('eventId', '==', eventId), orderBy('createdAt', 'desc'), limit(MENTORING_READ_LIMIT + 1)))
      if (snap.size > MENTORING_READ_LIMIT) throw new Error(`이 행사의 신청이 ${MENTORING_READ_LIMIT}건을 넘어 한 번에 읽지 않았습니다. 관리자 앱의 명단 조회를 페이지 방식으로 바꿔야 합니다.`)
      return snap.docs.map(d => mentoringRow(d.ref.path, d.data()))
    },
    async getUser(uid) { return (await httpsCallable<{ uid: string }, UserLookup | null>(functions, 'getAdminUser', { timeout: 30000 })({ uid })).data },
    async getContent(kind) { const snap = await getDocFromServer(doc(db, 'information', kind)); return contentRows(kind, snap.data() || {}) },
    async listAudit() { const snap = await getDocsFromServer(query(collection(db, 'adminAuditLogs'), orderBy('createdAt', 'desc'), limit(200))); return snap.docs.map(d => auditRow(d.id, d.data())) },
    async listFunctionLogs(filter) { return (await httpsCallable<FunctionLogFilter, FunctionLogPage>(functions, 'getReservationFunctionLogs', { timeout: 30000 })(filter)).data },
    async getMembers() { const snap = await getDocFromServer(doc(db, 'settings_private/console_members')); return membersRow(snap.data() || {}) },
    async command(input) { await httpsCallable(functions, 'adminCommand', { timeout: 70000 })(input) },
    async uploadImage(file, progress) {
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) || file.size >= 5 * 1024 * 1024) throw new Error('JPEG·PNG·GIF·WebP 이미지, 5 MiB 미만만 업로드할 수 있습니다.')
      const task = uploadBytesResumable(ref(storage, `announcements/${crypto.randomUUID()}`), file, { contentType: file.type })
      await new Promise<void>((resolve, reject) => task.on('state_changed', snap => progress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)), reject, resolve))
      return getDownloadURL(task.snapshot.ref)
    },
  }
  // A revoked UID must also lose data already rendered in this tab.
  return Object.fromEntries(Object.entries(api).map(([name, method]) => [name, async (...args: unknown[]) => {
    try { return await Reflect.apply(method, api, args) }
    catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
      if (code.includes('permission-denied') || code.includes('unauthenticated') || code === 'storage/unauthorized') runtime.access.dispatchEvent(new Event('denied'))
      throw error
    }
  }])) as unknown as AdminApi
}
