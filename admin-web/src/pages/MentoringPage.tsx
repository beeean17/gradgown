import { useCallback, useMemo, useState } from 'react'
import { Table, proportional, type TableColumn } from '@astryxdesign/core/Table'
import { List, ListItem } from '@astryxdesign/core/List'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Selector } from '@astryxdesign/core/Selector'
import type { AdminApi, MentoringCount, MentoringQuery, MentoringRegistration } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { useDebounced } from '../hooks/useDebounced.ts'
import { useIsDesktop } from '../hooks/useIsDesktop.ts'
import { displayDate } from '../data/format.ts'
import { MENTORING_NONE, MENTORING_STATUS_LABELS, optionLabel, optionNames, optionNumbers } from '../data/mentoring.ts'
import { VStack, HStack, Text, Heading, Button, PageHeader, Loaded, Empty, Message, Token } from '../shared/ui.tsx'
import { MentoringDetail } from '../presentation/MentoringDetail.tsx'

// MNT-54 ~ 56 (docs/requirements/mentoring.md). The server counts the option × session
// table in one GROUP BY and applies the search and the three filters in its WHERE clause;
// the browser only shows what comes back (docs/contracts/web-api.md "관리자 API").
export function MentoringPage({ api }: { api: AdminApi }) {
  const event = useLoad(useCallback(() => api.getEvent(), [api]))
  return <VStack gap={6}><PageHeader title="St:talk 신청 현황" description="선택지별 신청 인원과 명단을 확인합니다." />
    <Loaded state={event.state} retry={event.refresh}>{value => value
      ? <MentoringWorkspace api={api} currentEvent={value.eventId} />
      : <Empty title="행사 설정이 필요합니다" detail="현재 행사로 지정된 행사가 없습니다." />}</Loaded>
  </VStack>
}

type Filter = Omit<MentoringQuery, 'eventId'>
const rowKey = (r: MentoringRegistration) => r.registrationId
const columnWidth = (weight: number) => proportional(weight, { minWidth: 0 })
const PAGE = 50
const statusToken = (r: MentoringRegistration) => <Token label={MENTORING_STATUS_LABELS[r.status]} color={r.status === 'reserved' ? 'blue' : 'gray'} size="sm" className="self-start" />

function MentoringWorkspace({ api, currentEvent }: { api: AdminApi; currentEvent: string }) {
  const [eventId, setEventId] = useState(currentEvent), [eventInput, setEventInput] = useState(currentEvent)
  const [filter, setFilter] = useState<Filter>({ search: '', status: 'all', first: 'all', second: 'all' }), [page, setPage] = useState(0)
  const [detail, setDetail] = useState<MentoringRegistration | null>(null)
  const search = useDebounced(filter.search.trim()), { status, first, second } = filter
  const counts = useLoad(useCallback(() => api.getMentoringCounts(eventId), [api, eventId]))
  const list = useLoad(useCallback(() => api.listMentoring({ eventId, search, status, first, second }), [api, eventId, search, status, first, second]))
  // The counts carry the option names of the event they were read for, so a past event shows its own.
  const options = useMemo(() => counts.state.status === 'ready' ? optionNames(counts.state.data) : [], [counts.state])
  const desktop = useIsDesktop(), filtering = Boolean(search) || status !== 'all' || first !== 'all' || second !== 'all'
  const setFilterPart = (patch: Partial<Filter>) => { setFilter(old => ({ ...old, ...patch })); setPage(0) }
  const refresh = () => { counts.refresh(); list.refresh() }
  const optionFilter = (label: string, value: Filter['first'], set: (value: Filter['first']) => void) => <Selector label={label} value={String(value)} onChange={v => set(v === 'all' ? 'all' : Number(v))} options={[{ value: 'all', label: '전체 선택지' }, ...optionNumbers().map(n => ({ value: String(n), label: n === MENTORING_NONE ? optionLabel(options, n) : `${n}. ${optionLabel(options, n)}` }))]} />
  const columns: TableColumn<MentoringRegistration>[] = useMemo(() => [
    { key: 'name', header: '신청자', width: columnWidth(1.4), renderCell: r => <VStack gap={1}><Text weight="semibold">{r.name}</Text><Text type="supporting">{r.studentId} · {r.department} · {r.grade}학년</Text></VStack> },
    { key: 'first', header: '1차시', width: columnWidth(1.6), renderCell: r => <Text>{optionLabel(options, r.firstOption)}</Text> },
    { key: 'second', header: '2차시', width: columnWidth(1.6), renderCell: r => <Text>{optionLabel(options, r.secondOption)}</Text> },
    { key: 'contact', header: '연락처 / 신청일', width: columnWidth(1.4), renderCell: r => <VStack gap={1}><Text>{r.phone}</Text><Text type="supporting">{displayDate(r.createdAt)}</Text></VStack> },
    { key: 'status', header: '상태', width: columnWidth(0.8), renderCell: statusToken },
    { key: 'detail', header: '상세', width: columnWidth(0.6), renderCell: r => <Button label="상세" size="sm" variant="ghost" onClick={() => setDetail(r)} /> },
  ], [options])

  return <VStack gap={5}>
    <HStack gap={3} align="end" wrap="wrap"><TextInput label="조회 행사" value={eventInput} onChange={setEventInput} placeholder="YYYY-MM" /><Button label="조회" onClick={() => { const value = eventInput.trim(); setPage(0); if (value === eventId) refresh(); else setEventId(value) }} /></HStack>
    {eventId !== currentEvent && <Message>지난 행사({eventId})를 보고 있습니다. 현재 행사는 {currentEvent}입니다.</Message>}
    <Loaded state={counts.state} retry={counts.refresh}>{rows => <VStack gap={6}>
      <Counts counts={rows} options={options} desktop={desktop} />
      <VStack gap={4}>
        <HStack gap={3} justify="between" align="center" wrap="wrap"><Heading level={2}>명단</Heading><Button label="새로고침" size="sm" variant="ghost" onClick={refresh} /></HStack>
        {/* Outside the list's <Loaded>: the inputs stay mounted while the server answers a new filter. */}
        <HStack gap={3} align="end" wrap="wrap">
          <TextInput label="검색" value={filter.search} onChange={value => setFilterPart({ search: value })} placeholder="이름, 학번, 전화번호" hasClear />
          <Selector label="상태" value={status} onChange={value => setFilterPart({ status: value as Filter['status'] })} options={[{ value: 'all', label: '전체 상태' }, { value: 'reserved', label: '신청 완료' }, { value: 'cancelled', label: '취소' }]} />
          {optionFilter('1차시 선택지', first, value => setFilterPart({ first: value }))}
          {optionFilter('2차시 선택지', second, value => setFilterPart({ second: value }))}
        </HStack>
        <Loaded state={list.state} retry={list.refresh}>{found => {
          const shown = found.slice(page * PAGE, page * PAGE + PAGE)
          return <VStack gap={4}>
            <Text type="supporting">조건에 맞는 {found.length}건 · 검색과 필터는 행사 전체에 적용 · 한국 시간 기준</Text>
            {!found.length ? <Empty detail={filtering ? '검색어나 필터를 바꿔 보세요.' : '이 행사에 들어온 신청이 없습니다.'} />
              : desktop ? <Table data={shown} columns={columns} idKey={rowKey} density="balanced" hasHover />
              : <List hasDividers>{shown.map(r => <ListItem key={rowKey(r)} label={r.name} description={<VStack gap={2}><Text type="supporting">{r.studentId} · {r.department} · {r.grade}학년</Text><Text type="supporting">1차시 {optionLabel(options, r.firstOption)} · 2차시 {optionLabel(options, r.secondOption)}</Text>{statusToken(r)}</VStack>} endContent={<Button label="상세" size="sm" onClick={() => setDetail(r)} />} />)}</List>}
            {found.length > PAGE && <HStack justify="between" align="center"><Text type="supporting">{page * PAGE + 1}–{Math.min(found.length, page * PAGE + PAGE)} / {found.length}건</Text><HStack gap={2}><Button label="이전" isDisabled={page === 0} onClick={() => setPage(n => n - 1)} /><Button label="다음" isDisabled={(page + 1) * PAGE >= found.length} onClick={() => setPage(n => n + 1)} /></HStack></HStack>}
          </VStack>
        }}</Loaded>
      </VStack>
    </VStack>}</Loaded>
    {detail && <MentoringDetail row={detail} options={options} close={() => setDetail(null)} />}
  </VStack>
}

// MNT-54: 8 fixed rows, reserved only, no capacity. The numbers are the server's.
function Counts({ counts, options, desktop }: { counts: MentoringCount[]; options: string[]; desktop: boolean }) {
  const label = (c: MentoringCount) => c.option === MENTORING_NONE ? optionLabel(options, c.option) : `${c.option}. ${optionLabel(options, c.option)}`
  // Every reserved registration is in exactly one first-session row, 선택 안함 included.
  const reserved = counts.reduce((sum, c) => sum + c.first, 0)
  const columns: TableColumn<MentoringCount>[] = [
    { key: 'label', header: '선택지', width: columnWidth(3), renderCell: c => <Text weight={c.option === MENTORING_NONE ? 'normal' : 'semibold'} color={c.option === MENTORING_NONE ? 'secondary' : 'primary'}>{label(c)}</Text> },
    { key: 'first', header: '1차시', width: columnWidth(1), renderCell: c => <Text>{c.first}명</Text> },
    { key: 'second', header: '2차시', width: columnWidth(1), renderCell: c => <Text>{c.second}명</Text> },
  ]
  return <VStack gap={3}>
    <HStack gap={3} justify="between" align="center" wrap="wrap"><Heading level={2}>선택지별 신청 현황</Heading><Text type="supporting">신청 완료 {reserved}명 · 취소 건 제외 · 정원 없음</Text></HStack>
    {desktop ? <Table data={counts} columns={columns} idKey={c => String(c.option)} density="compact" />
      : <List hasDividers>{counts.map(c => <ListItem key={c.option} label={label(c)} endContent={<Text type="supporting">1차시 {c.first} · 2차시 {c.second}</Text>} />)}</List>}
  </VStack>
}
