import { useCallback, useDeferredValue, useMemo, useState, type SVGProps } from 'react'
import { Table, proportional, type TableColumn } from '@astryxdesign/core/Table'
import { List, ListItem } from '@astryxdesign/core/List'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Selector } from '@astryxdesign/core/Selector'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import type { AdminApi, GownReservation, ReservationSettings } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { useIsDesktop } from '../hooks/useIsDesktop.ts'
import { displayDate, errorMessage } from '../data/format.ts'
import { buildRoster, rosterFileName, rosterRows, ROSTER_MIME, type RosterScope } from '../data/roster.ts'
import rosterTemplateUrl from '../data/reservation-roster-template.xlsx?url'
import { VStack, HStack, Text, Button, PageHeader, Loaded, Empty, Status, Message, Confirm } from '../shared/ui.tsx'
import { ReservationEditor } from '../presentation/ReservationEditor.tsx'
import { useCan } from '../auth/access.ts'

export function ReservationsPage({ api }: { api: AdminApi }) {
  const settings = useLoad(useCallback(() => api.getSettings(), [api]))
  return <VStack gap={6}><PageHeader title="예약 관리" description="예약 확인부터 변경까지. 현재 회차의 운영을 이어가세요." /><Loaded state={settings.state} retry={settings.refresh}>{value => value ? <ReservationWorkspace api={api} settings={value} /> : <Empty title="접수 설정이 없습니다" detail="접수 설정에서 현재 회차와 시간표를 먼저 등록해 주세요." />}</Loaded></VStack>
}
// The icon set has no refresh glyph; a clockwise arrow in the same stroke style.
function RefreshGlyph(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" /></svg>
}
const rowKey = (r: GownReservation) => `${r.key.userId}/${r.key.reservationId}`
// Let the token-driven cell contents determine minimums; the library's default
// minimum applies to every fraction and otherwise makes narrow columns inflate the table.
const columnWidth = (weight: number) => proportional(weight, { minWidth: 0 })
function ReservationWorkspace({ api, settings }: { api: AdminApi; settings: ReservationSettings }) {
  const [period, setPeriod] = useState(settings.periodId), [periodInput, setPeriodInput] = useState(settings.periodId)
  const [cursor, setCursor] = useState<unknown>(), [page, setPage] = useState(1)
  const [search, setSearch] = useState(''), [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<string[]>([]), [editing, setEditing] = useState<GownReservation | 'new' | null>(null)
  const [cancel, setCancel] = useState<GownReservation | null>(null), [removing, setRemoving] = useState<GownReservation | null>(null)
  const [notice, setNotice] = useState(''), [exporting, setExporting] = useState(false), [exportError, setExportError] = useState('')
  const deferredSearch = useDeferredValue(search)
  const { state, refresh } = useLoad(useCallback(() => api.listReservations(period, cursor), [api, period, cursor]))
  const rows = state.status === 'ready' ? state.data.rows : []
  const filtered = rows.filter(r => (status === 'all' || r.status === status) && [r.name, r.studentId, r.department, r.phone].some(value => value.toLowerCase().includes(deferredSearch.toLowerCase())))
  const selectedRows = filtered.filter(r => selected.includes(rowKey(r)))
  const changeSelection = (r: GownReservation, checked: boolean) => setSelected(old => checked ? [...old.filter(key => key !== rowKey(r)), rowKey(r)] : old.filter(key => key !== rowKey(r)))
  const done = () => { setEditing(null); setCancel(null); setSelected([]); setNotice('서버에 반영했습니다. 최신 데이터를 확인합니다.'); refresh() }
  const can = useCan(), desktop = useIsDesktop(), canEdit = can('reservation.write'), canDelete = can('reservation.delete')
  // Any console account may export: the rows are ones it can already read.
  const exportRoster = async (scope: RosterScope) => {
    if (exporting) return
    setExporting(true); setNotice(''); setExportError('')
    try {
      let source = selectedRows
      if (scope !== 'selected') {
        source = []
        let next: unknown
        do { const page = await api.listReservations(period, next); source.push(...page.rows); next = page.hasNext ? page.cursor : undefined } while (next !== undefined)
      }
      const rows = rosterRows(source, scope)
      if (!rows.length) { setNotice(scope === 'reserved' ? '내보낼 예약 완료 건이 없습니다.' : '내보낼 예약이 없습니다.'); return }
      const response = await fetch(rosterTemplateUrl)
      if (!response.ok) throw new Error('엑셀 양식을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.')
      const now = new Date(), file = buildRoster(new Uint8Array(await response.arrayBuffer()), rows, { now, slotsByDate: settings.slotsByDate })
      const url = URL.createObjectURL(new Blob([file.slice().buffer], { type: ROSTER_MIME })), a = document.createElement('a')
      a.href = url; a.download = rosterFileName(period, now); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice(`${rows.length}건을 엑셀로 내려받았습니다. 이름·학번·연락처가 담긴 파일이니 안전하게 보관해 주세요.`)
    } catch (e) { setExportError(errorMessage(e)) } finally { setExporting(false) }
  }
  const columns: TableColumn<GownReservation>[] = useMemo(() => [
    { key: 'selection', header: '선택', width: columnWidth(0.5), renderCell: r => <CheckboxInput label={`${r.name || '이름 없음'} 선택`} isLabelHidden value={selected.includes(rowKey(r))} onChange={checked => changeSelection(r, checked)} /> },
    { key: 'name', header: '예약자', width: columnWidth(1.4), renderCell: r => <VStack gap={1}><Text weight="semibold">{r.name || '확인 필요'}</Text><Text type="supporting">{r.studentId || '학번 없음'}{r.department ? ` · ${r.department}` : ''}</Text></VStack> },
    { key: 'rentAt', header: '대여 / 반납', width: columnWidth(2), renderCell: r => <VStack gap={1}><Text>{displayDate(r.rentAt)}</Text><Text type="supporting">↳ {displayDate(r.returnAt)}</Text></VStack> },
    { key: 'size', header: '사이즈 / 수령', width: columnWidth(1), renderCell: r => <VStack gap={1}><Text>{r.size || '확인 필요'}</Text><Text type="supporting">{r.isProxy ? '대리 수령' : '본인 수령'}</Text></VStack> },
    { key: 'status', header: '상태', width: columnWidth(1), renderCell: r => <Status status={r.status} /> },
    { key: 'detail', header: '상세', width: columnWidth(0.7), renderCell: r => <Button label="상세" size="sm" variant="ghost" onClick={() => setEditing(r)} /> },
  ], [selected])
  return <VStack gap={5}>
    {notice && <Message>{notice}</Message>}
    {exportError && <Message error>{exportError}</Message>}
    <HStack gap={3} align="end" wrap="wrap"><TextInput label="조회 회차" value={periodInput} onChange={setPeriodInput} placeholder="YYYY-MM" /><Button label="조회" onClick={() => { setPeriod(periodInput); setCursor(undefined); setPage(1); setSelected([]); if (period === periodInput) refresh() }} />{canEdit && <Button label="수동 예약 추가" variant="primary" onClick={() => setEditing('new')} />}</HStack>
    <HStack gap={3} align="end" wrap="wrap"><TextInput label="현재 페이지 검색" value={search} onChange={v => { setSearch(v); setSelected([]) }} placeholder="이름, 학번, 연락처" hasClear /><Selector label="현재 페이지 상태" value={status} onChange={v => { setStatus(v); setSelected([]) }} options={[{ value: 'all', label: '전체 상태' }, { value: 'reserved', label: '예약 완료' }, { value: 'cancelled', label: '취소' }, { value: 'completed', label: '완료' }]} /></HStack>
    {/* Outside <Loaded> so the button stays put and spins while the list reloads. */}
    <HStack gap={3} justify="between" align="center"><Text type="supporting">페이지당 최대 50건 · 검색/상태 필터는 현재 페이지에만 적용 · 한국 시간 기준</Text><IconButton label="예약 목록 새로고침" tooltip="예약 목록 새로고침" icon={<Icon icon={RefreshGlyph} size="sm" />} variant="ghost" size="sm" isLoading={state.status === 'loading'} onClick={() => { setSelected([]); refresh() }} /></HStack>
    <Loaded state={state} retry={refresh}>{data => <VStack gap={3}>
      <HStack gap={3} justify="between" wrap="wrap" align="center"><CheckboxInput label={`현재 검색 결과 선택 (${filtered.length}건)`} value={selectedRows.length > 0 && selectedRows.length === filtered.length ? true : selectedRows.length ? 'indeterminate' : false} onChange={checked => setSelected(checked ? filtered.map(rowKey) : [])} /><HStack gap={2} align="center" wrap="wrap"><Text type="supporting">{selectedRows.length}건 선택</Text><DropdownMenu button={{ label: 'xlsx 내보내기', size: 'sm', isLoading: exporting }} menuWidth="15rem" items={[{ label: `전체 출력 (${period} 회차)`, onClick: () => exportRoster('all') }, { label: '예약만 출력 (예약 완료)', onClick: () => exportRoster('reserved') }, { label: `선택한 예약만 출력 (${selectedRows.length}건)`, isDisabled: !selectedRows.length, onClick: () => exportRoster('selected') }]} /><Button label="확인 메일" size="sm" isDisabled tooltip="빈 대상 전체 발송 방지·중복 발송 정책을 보강한 뒤 활성화합니다." /></HStack></HStack>
      {!filtered.length ? <Empty detail={data.rows.length ? '검색어 또는 상태 필터를 바꿔 보세요.' : '해당 회차에 등록된 예약이 없습니다.'} /> : desktop ? <Table data={filtered} columns={columns} idKey={rowKey} density="balanced" hasHover /> : <List hasDividers header={<Text type="supporting">현재 페이지 {filtered.length}건</Text>}>{filtered.map(r => <ListItem key={rowKey(r)} label={r.name || '이름 확인 필요'} startContent={<CheckboxInput label={`${r.name} 선택`} isLabelHidden value={selected.includes(rowKey(r))} onChange={checked => changeSelection(r, checked)} />} description={<VStack gap={2}><Text type="supporting">{[r.studentId, r.department].filter(Boolean).join(' · ')} · {r.size} · {r.isProxy ? '대리 수령' : '본인 수령'}</Text><Text type="supporting">{displayDate(r.rentAt)} 대여</Text><Status status={r.status} /></VStack>} endContent={<Button label="상세" size="sm" onClick={() => setEditing(r)} />} />)}</List>}
      <HStack justify="between" align="center"><Text type="supporting">{page}페이지 · 서버 전체 건수는 집계하지 않습니다.</Text><HStack gap={2}><Button label="처음으로" isDisabled={page === 1} onClick={() => { setCursor(undefined); setPage(1); setSelected([]) }} /><Button label="다음 페이지" isDisabled={!data.hasNext} onClick={() => { setCursor(data.cursor); setPage(n => n + 1); setSelected([]) }} /></HStack></HStack>
    </VStack>}</Loaded>
    {editing && <ReservationEditor save={(input, userId) => api.command({ action: editing === 'new' ? 'reservation.create' : 'reservation.update', key: editing === 'new' ? { userId } : editing.key, version: editing === 'new' ? '' : editing.version, input })} settings={settings} row={editing === 'new' ? null : editing} canEdit={canEdit} close={() => setEditing(null)} saved={done} cancel={r => { setEditing(null); setCancel(r) }} remove={canDelete ? r => { setEditing(null); setRemoving(r) } : undefined} />}
    {cancel && <Confirm title="이 예약을 취소할까요?" label="예약 취소" detail={<Text>{cancel.name} · {cancel.periodId} · {displayDate(cancel.rentAt)}. 예약 기록은 남고 상태만 취소로 바뀝니다.</Text>} close={() => setCancel(null)} action={async () => { await api.command({ action: 'reservation.cancel', key: cancel.key, version: cancel.version }); done() }} />}
    {removing && <Confirm title="이 예약을 영구 삭제할까요?" label="영구 삭제" detail={<Text>{removing.name} · {removing.periodId} · {displayDate(removing.rentAt)}. 예약 문서를 데이터베이스에서 완전히 지웁니다. 되돌릴 수 없고 학생의 내 예약에서도 사라지며, 감사 로그에는 삭제했다는 기록만 남습니다.</Text>} close={() => setRemoving(null)} action={async () => { await api.command({ action: 'reservation.delete', key: removing.key, version: removing.version }); done() }} />}
  </VStack>
}
