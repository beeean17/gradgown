import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { GownReservation, ReservationSettings } from '../contracts/admin-view.ts'

// Fills the operations team's printed sign-off sheet (docs/MON_reservation_yymmdd_hhmm.xlsx).
// The template keeps its own fonts, widths, notes and print setup; only the title
// and the table body are rewritten, so replacing the .xlsx updates the layout.
export type RosterScope = 'all' | 'reserved' | 'selected'
export const ROSTER_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const SHEET = 'xl/worksheets/sheet1.xml', STYLES = 'xl/styles.xml'
// Row 11 is the header; row 12 is the styled blank row every data row copies.
const FIRST_ROW = 12, LAST_COLUMN = 'M'
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const STATUS_NOTES: Record<GownReservation['status'], string> = { reserved: '', cancelled: '취소', completed: '완료', unknown: '상태 확인 필요' }
// The rack and the printed sheet use 소·중·대; the system stores s/m/l.
const SIZE_LABELS: Record<string, string> = { s: '소', m: '중', l: '대' }
const pad = (n: number) => String(n).padStart(2, '0')

function kst(ms: number) {
  const d = new Date(ms + 9 * 3600000)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() }
}
const clock = (ms: number) => { const t = kst(ms); return `${pad(t.hour)}:${pad(t.minute)}` }

/** `OCT_reservation_261008_1712.xlsx`: the round's month, then the export time (KST). */
export function rosterFileName(periodId: string, now: Date): string {
  const t = kst(now.getTime()), month = /^\d{4}-(\d{2})$/.exec(periodId)?.[1]
  return `${MONTHS[(month ? Number(month) : t.month) - 1]}_reservation_${pad(t.year % 100)}${pad(t.month)}${pad(t.day)}_${pad(t.hour)}${pad(t.minute)}.xlsx`
}

/** The rows a scope prints, in pickup order. */
export function rosterRows(rows: GownReservation[], scope: RosterScope): GownReservation[] {
  return rows.filter(r => scope !== 'reserved' || r.status === 'reserved')
    .sort((a, b) => (Date.parse(a.rentAt) || 0) - (Date.parse(b.rentAt) || 0) || a.name.localeCompare(b.name, 'ko'))
}

// The sheet has no status column, so an "all" export marks a cancelled or
// completed booking under the name rather than passing it as live.
export function rosterName(r: GownReservation): string {
  const note = STATUS_NOTES[r.status]
  return note ? `${r.name}\n(${note})` : r.name
}
export const rosterSize = (size: string) => SIZE_LABELS[size.toLowerCase()] ?? size.toUpperCase()

/** "13:00 ~ 14:00" when the instant opens a slot of the round, otherwise the bare time. */
export function rosterTime(iso: string, slotsByDate: ReservationSettings['slotsByDate']): string {
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return ''
  const slot = Object.values(slotsByDate).flatMap(group => group.slots).find(s => Date.parse(s.startsAt) === at)
  return slot ? `${clock(at)} ~ ${clock(Date.parse(slot.endsAt))}` : clock(at)
}

/** Excel's day serial for the KST date; the template formats it as "10월 22일". */
function excelDay(iso: string): number | null {
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return null
  const t = kst(at)
  return Date.UTC(t.year, t.month - 1, t.day) / 86400000 + 25569
}

// eslint-disable-next-line no-control-regex -- XML 1.0 forbids these characters, so they are dropped.
const xml = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
// Inline strings are never evaluated, so "=…" input cannot become a formula.
const text = (ref: string, style: number, value: string) => value ? `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>` : `<c r="${ref}" s="${style}"/>`
const number = (ref: string, style: number, value: number | null) => value === null ? `<c r="${ref}" s="${style}"/>` : `<c r="${ref}" s="${style}"><v>${value}</v></c>`

/** Adds a wrapping copy of cell format `base` (two-line name cells) and returns its index. */
function addWrapStyle(styles: string, base: number): { styles: string; index: number } {
  const block = /<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/.exec(styles)
  const xfs = block?.[2].match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g)
  if (!block || !xfs?.[base]) throw new Error('엑셀 양식의 셀 서식을 읽지 못했습니다.')
  const source = xfs[base]
  const open = /^<xf\b[^>]*?(?=\/?>)/.exec(source)![0].replace(/\s+applyAlignment="[^"]*"/, '')
  const alignment = /<alignment\b[^>]*\/>/.exec(source)?.[0] ?? '<alignment/>'
  const protection = /<protection\b[^>]*\/>/.exec(source)?.[0] ?? ''
  const wrapped = `${open} applyAlignment="1">${/wrapText=/.test(alignment) ? alignment : alignment.replace('<alignment', '<alignment wrapText="1"')}${protection}</xf>`
  return { styles: styles.replace(block[0], `<cellXfs count="${xfs.length + 1}">${block[2]}${wrapped}</cellXfs>`), index: xfs.length }
}

export function buildRoster(template: Uint8Array, rows: GownReservation[], { now, slotsByDate }: { now: Date; slotsByDate: ReservationSettings['slotsByDate'] }): Uint8Array {
  const files = unzipSync(template)
  if (!files[SHEET] || !files[STYLES]) throw new Error('엑셀 양식 파일이 올바르지 않습니다.')
  let sheet = strFromU8(files[SHEET])
  const prototype = new RegExp(`<row r="${FIRST_ROW}"[^>]*>([\\s\\S]*?)</row>`).exec(sheet)?.[1] ?? ''
  const style = (column: string) => Number(new RegExp(`<c r="${column}${FIRST_ROW}" s="(\\d+)"`).exec(prototype)?.[1] ?? 0)
  const { styles, index: nameStyle } = addWrapStyle(strFromU8(files[STYLES]), style('B'))
  const t = kst(now.getTime())
  const title = `학위복 대여 명단 - ${pad(t.month)}월 ${pad(t.day)}일 ${pad(t.hour)}:${pad(t.minute)}`
  const titleStyle = Number(/<c r="A1" s="(\d+)"/.exec(sheet)?.[1] ?? 0)
  const body = rows.map((r, i) => {
    const n = FIRST_ROW + i
    return `<row r="${n}" spans="1:13" ht="30" customHeight="1">${[
      number(`A${n}`, style('A'), i + 1), text(`B${n}`, nameStyle, rosterName(r)), text(`C${n}`, style('C'), r.studentId), text(`D${n}`, style('D'), r.phone),
      text(`E${n}`, style('E'), r.isProxy ? r.proxyName || '이름 없음' : ''), text(`F${n}`, style('F'), r.isProxy ? r.proxyPhone : ''),
      number(`G${n}`, style('G'), excelDay(r.rentAt)), text(`H${n}`, style('H'), rosterTime(r.rentAt, slotsByDate)), text(`I${n}`, style('I'), ''),
      number(`J${n}`, style('J'), excelDay(r.returnAt)), text(`K${n}`, style('K'), rosterTime(r.returnAt, slotsByDate)), text(`L${n}`, style('L'), ''),
      text(`M${n}`, style('M'), rosterSize(r.size)),
    ].join('')}</row>`
  }).join('')
  sheet = sheet
    .replace(/<c r="A1"[^>]*\/>|<c r="A1"[^>]*>[\s\S]*?<\/c>/, text('A1', titleStyle, title))
    .replace(/<row r="(\d+)"[^>]*\/>|<row r="(\d+)"[^>]*>[\s\S]*?<\/row>/g, (row, a, b) => Number(a ?? b) >= FIRST_ROW ? '' : row)
    .replace('</sheetData>', `${body}</sheetData>`)
    .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:${LAST_COLUMN}${Math.max(FIRST_ROW - 1, FIRST_ROW + rows.length - 1)}"/>`)
  files[SHEET] = strToU8(sheet)
  files[STYLES] = strToU8(styles)
  return zipSync(files, { level: 6 })
}
