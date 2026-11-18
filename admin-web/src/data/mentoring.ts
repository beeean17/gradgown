import { strToU8, zipSync } from 'fflate'
import { MENTORING_OPTION_COUNT, type MentoringRegistration } from '../contracts/admin-view.ts'

// St:talk roster logic with no Firebase: labels, the option × session counts
// (MNT-54) and the xlsx/csv export (MNT-57). Options are numbers: 1–7 name
// `options[n - 1]`, 0 is 선택 안함 (docs/contracts/mentoring-command.md).
export const MENTORING_NONE = 0
export const NONE_LABEL = '선택 안함'
export const MENTORING_STATUS_LABELS: Record<MentoringRegistration['status'], string> = { reserved: '신청 완료', cancelled: '취소', unknown: '확인 필요' }

/** What a registration's option number reads as now. */
export function optionLabel(options: string[], option: number | null): string {
  if (option === null) return '확인 필요'
  if (option === MENTORING_NONE) return NONE_LABEL
  return options[option - 1]?.trim() || `이름 없는 선택지 ${option}`
}
/** Options 1–7 then 선택 안함, as the student sees them. */
export const optionNumbers = () => [...Array.from({ length: MENTORING_OPTION_COUNT }, (_, i) => i + 1), MENTORING_NONE]

export type MentoringCount = { option: number; label: string; first: number; second: number }
/** `reserved` registrations per option and session: 8 fixed rows, no capacity. */
export function mentoringCounts(rows: MentoringRegistration[], options: string[]): { rows: MentoringCount[]; reserved: number } {
  const live = rows.filter(r => r.status === 'reserved')
  return {
    rows: optionNumbers().map(option => ({ option, label: optionLabel(options, option), first: live.filter(r => r.firstOption === option).length, second: live.filter(r => r.secondOption === option).length })),
    reserved: live.length,
  }
}

/** Search (이름·학번·전화) and the three filters of MNT-55, over the whole event. */
export type MentoringFilter = { search: string; status: 'all' | MentoringRegistration['status']; first: 'all' | number; second: 'all' | number }
export function filterMentoring(rows: MentoringRegistration[], { search, status, first, second }: MentoringFilter): MentoringRegistration[] {
  const term = search.trim().toLowerCase(), digits = term.replace(/\D/g, '')
  return rows.filter(r => (status === 'all' || r.status === status) && (first === 'all' || r.firstOption === first) && (second === 'all' || r.secondOption === second)
    && (!term || [r.name, r.studentId, r.phone].some(value => value.toLowerCase().includes(term)) || (digits.length >= 3 && r.phone.replace(/\D/g, '').includes(digits))))
}

// --- Export ---------------------------------------------------------------
/**
 * all: every registration of the event · reserved: 신청 완료 only ·
 * first / second: 신청 완료 that attend that session, grouped by option — the
 * list each mentor gets.
 */
export type MentoringExportScope = 'all' | 'reserved' | 'first' | 'second'
export type MentoringExportFormat = 'xlsx' | 'csv'
export type MentoringTable = { header: string[]; body: string[][] }
const COLUMNS = ['이름', '학과', '학번', '학년', '전화번호', '1차시', '2차시', '상태', '신청일', '이메일']
const pad = (n: number) => String(n).padStart(2, '0')
function kst(ms: number) {
  const d = new Date(ms + 9 * 3600000)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() }
}
const kstStamp = (iso: string) => {
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return ''
  const t = kst(at)
  return `${t.year}-${pad(t.month)}-${pad(t.day)} ${pad(t.hour)}:${pad(t.minute)}`
}

export function mentoringTable(rows: MentoringRegistration[], options: string[], scope: MentoringExportScope): MentoringTable {
  const byCreated = (a: MentoringRegistration, b: MentoringRegistration) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0)
  const line = (r: MentoringRegistration) => [r.name, r.department, r.studentId, r.grade === null ? '' : `${r.grade}학년`, r.phone, optionLabel(options, r.firstOption), optionLabel(options, r.secondOption), MENTORING_STATUS_LABELS[r.status], kstStamp(r.createdAt), r.email]
  if (scope === 'all' || scope === 'reserved') return { header: COLUMNS, body: rows.filter(r => scope === 'all' || r.status === 'reserved').sort(byCreated).map(line) }
  const pick = (r: MentoringRegistration) => scope === 'first' ? r.firstOption : r.secondOption
  const session = scope === 'first' ? '1차시' : '2차시'
  const body = rows.filter(r => r.status === 'reserved' && pick(r) !== null && pick(r) !== MENTORING_NONE)
    .sort((a, b) => pick(a)! - pick(b)! || a.name.localeCompare(b.name, 'ko'))
    .map(r => [`${pick(r)}. ${optionLabel(options, pick(r))}`, ...line(r)])
  return { header: [`${session} 선택지`, ...COLUMNS], body }
}

/** `NOV_sttalk_1차시_261110_1712.xlsx`: the event's month, the scope, then the export time (KST). */
export function mentoringFileName(eventId: string, scope: MentoringExportScope, now: Date, format: MentoringExportFormat): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const t = kst(now.getTime()), month = /^\d{4}-(\d{2})$/.exec(eventId)?.[1]
  const part = { all: '전체', reserved: '신청완료', first: '1차시', second: '2차시' }[scope]
  return `${months[(month ? Number(month) : t.month) - 1]}_sttalk_${part}_${pad(t.year % 100)}${pad(t.month)}${pad(t.day)}_${pad(t.hour)}${pad(t.minute)}.${format}`
}

// A cell starting with these is read as a formula by spreadsheet apps (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/
/** UTF-8 with BOM (so Excel reads Korean), CRLF, quoted fields, formulas defused with a leading '. */
export function mentoringCsv({ header, body }: MentoringTable): string {
  const cell = (value: string) => { const safe = FORMULA_START.test(value) ? `'${value}` : value; return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe }
  return '﻿' + [header, ...body].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
// eslint-disable-next-line no-control-regex -- XML 1.0 forbids these characters, so they are dropped.
const xml = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const column = (index: number) => { let name = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name; return name }
const WIDTHS: Record<string, number> = { 이름: 10, 학과: 16, 학번: 11, 학년: 7, 전화번호: 15, '1차시': 28, '2차시': 28, 상태: 9, 신청일: 17, 이메일: 28, '1차시 선택지': 30, '2차시 선택지': 30 }

/**
 * A one-sheet workbook built from scratch: bold frozen header, column widths,
 * every cell an inline string — never evaluated, so "=…" input cannot become a formula.
 */
export function mentoringXlsx({ header, body }: MentoringTable, sheetName: string): Uint8Array {
  const cell = (ref: string, value: string, style = 0) => value ? `<c r="${ref}"${style ? ` s="${style}"` : ''} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>` : ''
  const rows = [header, ...body].map((row, r) => `<row r="${r + 1}">${row.map((value, c) => cell(`${column(c)}${r + 1}`, value, r === 0 ? 1 : 0)).join('')}</row>`).join('')
  const cols = header.map((name, i) => `<col min="${i + 1}" max="${i + 1}" width="${WIDTHS[name] ?? 14}" customWidth="1"/>`).join('')
  const last = `${column(Math.max(header.length - 1, 0))}${body.length + 1}`
  const name = xml(sheetName.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'St:talk')
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  return zipSync({
    '[Content_Types].xml': strToU8(`${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    '_rels/.rels': strToU8(`${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`${head}<workbook xmlns="${main}" xmlns:r="${rel}"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(`${head}<styleSheet xmlns="${main}"><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`),
    'xl/worksheets/sheet1.xml': strToU8(`${head}<worksheet xmlns="${main}"><dimension ref="A1:${last}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${rows}</sheetData></worksheet>`),
  }, { level: 6 })
}
