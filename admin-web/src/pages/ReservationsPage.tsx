import { useCallback, useMemo, useState, type SVGProps } from 'react'
import { Table, proportional, type TableColumn } from '@astryxdesign/core/Table'
import { List, ListItem } from '@astryxdesign/core/List'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Selector } from '@astryxdesign/core/Selector'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import type { AdminApi, GownReservation, ReservationQuery } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { useCursor } from '../hooks/useCursor.ts'
import { useDebounced } from '../hooks/useDebounced.ts'
import { useIsDesktop } from '../hooks/useIsDesktop.ts'
import { displayDate } from '../data/format.ts'
import { VStack, HStack, Text, Button, PageHeader, Loaded, Empty, Status, Pager } from '../shared/ui.tsx'
import { ReservationDetail } from '../presentation/ReservationDetail.tsx'

export function ReservationsPage({ api }: { api: AdminApi }) {
  const period = useLoad(useCallback(() => api.getPeriod(), [api]))
  return <VStack gap={6}><PageHeader title="예약 관리" description="회차별 예약을 확인하고 이름·학번·연락처로 찾습니다." /><Loaded state={period.state} retry={period.refresh}>{value => value ? <ReservationWorkspace api={api} currentPeriod={value.periodId} /> : <Empty title="접수 설정이 없습니다" detail="현재 회차로 지정된 회차가 없습니다." />}</Loaded></VStack>
}
// The icon set has no refresh glyph; a clockwise arrow in the same stroke style.
function RefreshGlyph(props: SVGProps<SVGSVGElement>) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" /></svg>
}
const rowKey = (r: GownReservation) => r.reservationId
// Let the token-driven cell contents determine minimums; the library's default
// minimum applies to every fraction and otherwise makes narrow columns inflate the table.
const columnWidth = (weight: number) => proportional(weight, { minWidth: 0 })
// The search and the status filter go to the server, which applies them to the whole period
// before it cuts a page: a match outside the first page is found (docs/decisions/evaluation.md, A1).
function ReservationWorkspace({ api, currentPeriod }: { api: AdminApi; currentPeriod: string }) {
  const [period, setPeriod] = useState(currentPeriod), [periodInput, setPeriodInput] = useState(currentPeriod)
  const [searchInput, setSearchInput] = useState(''), [status, setStatus] = useState<ReservationQuery['status']>('all')
  const [detail, setDetail] = useState<GownReservation | null>(null)
  const search = useDebounced(searchInput.trim())
  const { cursor, page, first, next } = useCursor(JSON.stringify([period, search, status]))
  const { state, refresh } = useLoad(useCallback(() => api.listReservations({ periodId: period, search, status, cursor }), [api, period, search, status, cursor]))
  const desktop = useIsDesktop()
  const columns: TableColumn<GownReservation>[] = useMemo(() => [
    { key: 'name', header: '예약자', width: columnWidth(1.4), renderCell: r => <VStack gap={1}><Text weight="semibold">{r.name}</Text><Text type="supporting">{r.studentId} · {r.department}</Text></VStack> },
    { key: 'rentAt', header: '대여 / 반납', width: columnWidth(2), renderCell: r => <VStack gap={1}><Text>{displayDate(r.rentAt)}</Text><Text type="supporting">↳ {displayDate(r.returnAt)}</Text></VStack> },
    { key: 'size', header: '사이즈 / 수령', width: columnWidth(1), renderCell: r => <VStack gap={1}><Text>{r.size}</Text><Text type="supporting">{r.isProxy ? '대리 수령' : '본인 수령'}</Text></VStack> },
    { key: 'status', header: '상태', width: columnWidth(1), renderCell: r => <Status status={r.status} /> },
    { key: 'detail', header: '상세', width: columnWidth(0.7), renderCell: r => <Button label="상세" size="sm" variant="ghost" onClick={() => setDetail(r)} /> },
  ], [])
  return <VStack gap={5}>
    <HStack gap={3} align="end" wrap="wrap"><TextInput label="조회 회차" value={periodInput} onChange={setPeriodInput} placeholder="YYYY-MM" /><Button label="조회" onClick={() => { const value = periodInput.trim(); if (value === period) refresh(); else setPeriod(value) }} /></HStack>
    <HStack gap={3} align="end" wrap="wrap"><TextInput label="검색" value={searchInput} onChange={setSearchInput} placeholder="이름, 학번, 연락처" hasClear /><Selector label="상태" value={status} onChange={value => setStatus(value as ReservationQuery['status'])} options={[{ value: 'all', label: '전체 상태' }, { value: 'reserved', label: '예약 완료' }, { value: 'cancelled', label: '취소' }]} /></HStack>
    {/* Outside <Loaded> so the button stays put and spins while the list reloads. */}
    <HStack gap={3} justify="between" align="center"><Text type="supporting">페이지당 최대 50건 · 검색과 상태 필터는 회차 전체에 적용 · 한국 시간 기준</Text><IconButton label="예약 목록 새로고침" tooltip="예약 목록 새로고침" icon={<Icon icon={RefreshGlyph} size="sm" />} variant="ghost" size="sm" isLoading={state.status === 'loading'} onClick={refresh} /></HStack>
    <Loaded state={state} retry={refresh}>{data => <VStack gap={3}>
      {!data.items.length ? <Empty detail={search || status !== 'all' ? '검색어 또는 상태 필터를 바꿔 보세요.' : '해당 회차에 등록된 예약이 없습니다.'} /> : desktop ? <Table data={data.items} columns={columns} idKey={rowKey} density="balanced" hasHover /> : <List hasDividers header={<Text type="supporting">현재 페이지 {data.items.length}건</Text>}>{data.items.map(r => <ListItem key={rowKey(r)} label={r.name} description={<VStack gap={2}><Text type="supporting">{r.studentId} · {r.department} · {r.size} · {r.isProxy ? '대리 수령' : '본인 수령'}</Text><Text type="supporting">{displayDate(r.rentAt)} 대여</Text><Status status={r.status} /></VStack>} endContent={<Button label="상세" size="sm" onClick={() => setDetail(r)} />} />)}</List>}
      <Pager page={page} nextCursor={data.nextCursor} first={first} next={next} />
    </VStack>}</Loaded>
    {detail && <ReservationDetail row={detail} close={() => setDetail(null)} />}
  </VStack>
}
