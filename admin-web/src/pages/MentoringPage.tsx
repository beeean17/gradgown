import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { Table, proportional, type TableColumn } from '@astryxdesign/core/Table'
import { List, ListItem } from '@astryxdesign/core/List'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Selector } from '@astryxdesign/core/Selector'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import type { AdminApi, MentoringRegistration, MentoringSettings } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { useIsDesktop } from '../hooks/useIsDesktop.ts'
import { displayDate, errorMessage } from '../data/format.ts'
import { MENTORING_NONE, MENTORING_STATUS_LABELS, XLSX_MIME, filterMentoring, mentoringCounts, mentoringCsv, mentoringFileName, mentoringTable, mentoringXlsx, optionLabel, optionNumbers, type MentoringCount, type MentoringExportFormat, type MentoringExportScope, type MentoringFilter } from '../data/mentoring.ts'
import { VStack, HStack, Text, Heading, Button, PageHeader, Loaded, Empty, Message, Confirm, Token } from '../shared/ui.tsx'
import { MentoringEditor } from '../presentation/MentoringEditor.tsx'
import { useCan } from '../auth/access.ts'

// MNT-54 ~ 57 (docs/requirements/mentoring.md). An event holds a few hundred
// registrations at most, so the page reads the whole event once: the counts,
// search and every export then cover all of it, not one page.
export function MentoringPage({ api }: { api: AdminApi }) {
  const settings = useLoad(useCallback(() => api.getMentoringSettings(), [api]))
  return <VStack gap={6}><PageHeader title="St:talk 신청 현황" description="선택지별 신청 인원과 명단을 확인하고, 수동 추가·변경·취소와 명단 내려받기를 합니다." />
    <Loaded state={settings.state} retry={settings.refresh}>{value => value && value.schemaVersion === 2 && value.eventId
      ? <MentoringWorkspace api={api} settings={value} />
      : <Empty title="행사 설정이 필요합니다" detail="행사 설정에서 행사 ID와 선택지를 새 형식으로 저장하면 신청을 볼 수 있습니다." />}</Loaded>
  </VStack>
}

const rowKey = (r: MentoringRegistration) => `${r.key.userId}/${r.key.registrationId}`
const columnWidth = (weight: number) => proportional(weight, { minWidth: 0 })
const PAGE = 50
const statusToken = (r: MentoringRegistration) => <Token label={MENTORING_STATUS_LABELS[r.status]} color={r.status === 'reserved' ? 'blue' : r.status === 'unknown' ? 'orange' : 'gray'} size="sm" className="self-start" />

function MentoringWorkspace({ api, settings }: { api: AdminApi; settings: MentoringSettings }) {
  const [eventId, setEventId] = useState(settings.eventId), [eventInput, setEventInput] = useState(settings.eventId)
  const [filter, setFilter] = useState<MentoringFilter>({ search: '', status: 'all', first: 'all', second: 'all' }), [page, setPage] = useState(0)
  const [editing, setEditing] = useState<MentoringRegistration | 'new' | null>(null)
  const [cancel, setCancel] = useState<MentoringRegistration | null>(null), [removing, setRemoving] = useState<MentoringRegistration | null>(null)
  const [notice, setNotice] = useState(''), [exportError, setExportError] = useState('')
  const { state, refresh } = useLoad(useCallback(() => api.listMentoring(eventId), [api, eventId]))
  const search = useDeferredValue(filter.search)
  const options = settings.options, current = eventId === settings.eventId
  const can = useCan(), desktop = useIsDesktop(), canEdit = can('mentoring.write'), canDelete = can('mentoring.delete')
  const all = state.status === 'ready' ? state.data : []
  const filtered = useMemo(() => filterMentoring(all, { ...filter, search }), [all, filter, search])
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE)
  const setFilterPart = (patch: Partial<MentoringFilter>) => { setFilter(old => ({ ...old, ...patch })); setPage(0) }
  const done = (message = '서버에 반영했습니다. 최신 데이터를 확인합니다.') => { setEditing(null); setCancel(null); setRemoving(null); setNotice(message); refresh() }
  // Any console account may export: the rows are ones it can already read.
  const exportRoster = (scope: MentoringExportScope, format: MentoringExportFormat) => {
    setNotice(''); setExportError('')
    try {
      const table = mentoringTable(all, options, scope)
      if (!table.body.length) { setNotice('내보낼 신청이 없습니다.'); return }
      const now = new Date(), name = mentoringFileName(eventId, scope, now, format)
      const blob = format === 'csv' ? new Blob([mentoringCsv(table)], { type: 'text/csv;charset=utf-8' }) : new Blob([mentoringXlsx(table, `St:talk ${eventId}`).slice().buffer], { type: XLSX_MIME })
      const url = URL.createObjectURL(blob), a = document.createElement('a')
      a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice(`${table.body.length}건을 ${format}로 내려받았습니다. 이름·학번·연락처·이메일이 담긴 파일이니 안전하게 보관해 주세요.`)
    } catch (e) { setExportError(errorMessage(e)) }
  }
  const exportItems = (format: MentoringExportFormat) => [
    { label: `전체 (${eventId})`, onClick: () => exportRoster('all', format) },
    { label: '신청 완료만', onClick: () => exportRoster('reserved', format) },
    { label: '1차시 선택지별', onClick: () => exportRoster('first', format) },
    { label: '2차시 선택지별', onClick: () => exportRoster('second', format) },
  ]
  const optionFilter = (label: string, value: MentoringFilter['first'], set: (value: MentoringFilter['first']) => void) => <Selector label={label} value={String(value)} onChange={v => set(v === 'all' ? 'all' : Number(v))} options={[{ value: 'all', label: '전체 선택지' }, ...optionNumbers().map(n => ({ value: String(n), label: n === MENTORING_NONE ? optionLabel(options, n) : `${n}. ${optionLabel(options, n)}` }))]} />
  const columns: TableColumn<MentoringRegistration>[] = useMemo(() => [
    { key: 'name', header: '신청자', width: columnWidth(1.4), renderCell: r => <VStack gap={1}><Text weight="semibold">{r.name || '확인 필요'}</Text><Text type="supporting">{[r.studentId, r.department, r.grade && `${r.grade}학년`].filter(Boolean).join(' · ') || '정보 없음'}</Text></VStack> },
    { key: 'first', header: '1차시', width: columnWidth(1.6), renderCell: r => <Text>{optionLabel(options, r.firstOption)}</Text> },
    { key: 'second', header: '2차시', width: columnWidth(1.6), renderCell: r => <Text>{optionLabel(options, r.secondOption)}</Text> },
    { key: 'contact', header: '연락처 / 신청일', width: columnWidth(1.4), renderCell: r => <VStack gap={1}><Text>{r.phone || '확인 필요'}</Text><Text type="supporting">{displayDate(r.createdAt)}</Text></VStack> },
    { key: 'status', header: '상태', width: columnWidth(0.8), renderCell: statusToken },
    { key: 'detail', header: '상세', width: columnWidth(0.6), renderCell: r => <Button label="상세" size="sm" variant="ghost" onClick={() => setEditing(r)} /> },
  ], [options])

  return <VStack gap={5}>
    {notice && <Message>{notice}</Message>}
    {exportError && <Message error>{exportError}</Message>}
    <HStack gap={3} align="end" wrap="wrap"><TextInput label="조회 행사" value={eventInput} onChange={setEventInput} placeholder="YYYY-MM" /><Button label="조회" onClick={() => { setPage(0); if (eventInput === eventId) refresh(); else setEventId(eventInput) }} />{canEdit && current && <Button label="수동 신청 추가" variant="primary" onClick={() => setEditing('new')} />}</HStack>
    {!current && <Message>지난 행사({eventId})를 보고 있습니다. 선택지 이름은 현재 설정 기준이고, 신청은 현재 행사({settings.eventId})만 편집할 수 있습니다.</Message>}
    <Loaded state={state} retry={refresh}>{rows => <VStack gap={6}>
      <Counts counts={mentoringCounts(rows, options)} total={rows.length} desktop={desktop} />
      <VStack gap={4}>
        <HStack gap={3} justify="between" align="center" wrap="wrap"><Heading level={2}>명단</Heading><HStack gap={2} wrap="wrap"><DropdownMenu button={{ label: 'xlsx 내보내기', size: 'sm' }} menuWidth="14rem" items={exportItems('xlsx')} /><DropdownMenu button={{ label: 'csv 내보내기', size: 'sm' }} menuWidth="14rem" items={exportItems('csv')} /><Button label="새로고침" size="sm" variant="ghost" onClick={refresh} /></HStack></HStack>
        <HStack gap={3} align="end" wrap="wrap">
          <TextInput label="검색" value={filter.search} onChange={search => setFilterPart({ search })} placeholder="이름, 학번, 전화번호" hasClear />
          <Selector label="상태" value={filter.status} onChange={status => setFilterPart({ status: status as MentoringFilter['status'] })} options={[{ value: 'all', label: '전체 상태' }, { value: 'reserved', label: '신청 완료' }, { value: 'cancelled', label: '취소' }]} />
          {optionFilter('1차시 선택지', filter.first, first => setFilterPart({ first }))}
          {optionFilter('2차시 선택지', filter.second, second => setFilterPart({ second }))}
        </HStack>
        <Text type="supporting">행사 전체 {rows.length}건에서 검색 · 조건에 맞는 {filtered.length}건 · 한국 시간 기준</Text>
        {!filtered.length ? <Empty detail={rows.length ? '검색어나 필터를 바꿔 보세요.' : '이 행사에 들어온 신청이 없습니다.'} />
          : desktop ? <Table data={shown} columns={columns} idKey={rowKey} density="balanced" hasHover />
          : <List hasDividers>{shown.map(r => <ListItem key={rowKey(r)} label={r.name || '이름 확인 필요'} description={<VStack gap={2}><Text type="supporting">{[r.studentId, r.department, r.grade && `${r.grade}학년`].filter(Boolean).join(' · ')}</Text><Text type="supporting">1차시 {optionLabel(options, r.firstOption)} · 2차시 {optionLabel(options, r.secondOption)}</Text>{statusToken(r)}</VStack>} endContent={<Button label="상세" size="sm" onClick={() => setEditing(r)} />} />)}</List>}
        {filtered.length > PAGE && <HStack justify="between" align="center"><Text type="supporting">{page * PAGE + 1}–{Math.min(filtered.length, page * PAGE + PAGE)} / {filtered.length}건</Text><HStack gap={2}><Button label="이전" isDisabled={page === 0} onClick={() => setPage(n => n - 1)} /><Button label="다음" isDisabled={(page + 1) * PAGE >= filtered.length} onClick={() => setPage(n => n + 1)} /></HStack></HStack>}
      </VStack>
    </VStack>}</Loaded>
    {editing && <MentoringEditor row={editing === 'new' ? null : editing} options={options} eventId={settings.eventId} canEdit={canEdit} close={() => setEditing(null)} saved={() => done()}
      save={(input, userId) => api.command(editing === 'new' ? { action: 'mentoring.create', key: { userId }, input } : { action: 'mentoring.update', key: editing.key, version: editing.version, input })}
      cancel={r => { setEditing(null); setCancel(r) }} remove={canDelete ? r => { setEditing(null); setRemoving(r) } : undefined} />}
    {cancel && <Confirm title="이 신청을 취소할까요?" label="신청 취소" detail={<Text>{cancel.name} · {cancel.eventId} · 1차시 {optionLabel(options, cancel.firstOption)} · 2차시 {optionLabel(options, cancel.secondOption)}. 신청 기록은 남고 상태만 취소로 바뀝니다.</Text>} close={() => setCancel(null)} action={async () => { await api.command({ action: 'mentoring.cancel', key: cancel.key, version: cancel.version }); done() }} />}
    {removing && <Confirm title="이 신청을 영구 삭제할까요?" label="영구 삭제" detail={<Text>{removing.name} · {removing.eventId}. 신청 문서를 데이터베이스에서 완전히 지웁니다. 되돌릴 수 없고 학생의 내 신청에서도 사라지며, 감사 로그에는 삭제했다는 기록만 남습니다.</Text>} close={() => setRemoving(null)} action={async () => { await api.command({ action: 'mentoring.delete', key: removing.key, version: removing.version }); done('신청을 영구 삭제했습니다.') }} />}
  </VStack>
}

// MNT-54: 8 fixed rows, reserved only, no capacity.
function Counts({ counts, total, desktop }: { counts: { rows: MentoringCount[]; reserved: number }; total: number; desktop: boolean }) {
  const columns: TableColumn<MentoringCount>[] = [
    { key: 'label', header: '선택지', width: columnWidth(3), renderCell: c => <Text weight={c.option === MENTORING_NONE ? 'normal' : 'semibold'} color={c.option === MENTORING_NONE ? 'secondary' : 'primary'}>{c.option === MENTORING_NONE ? c.label : `${c.option}. ${c.label}`}</Text> },
    { key: 'first', header: '1차시', width: columnWidth(1), renderCell: c => <Text>{c.first}명</Text> },
    { key: 'second', header: '2차시', width: columnWidth(1), renderCell: c => <Text>{c.second}명</Text> },
  ]
  return <VStack gap={3}>
    <HStack gap={3} justify="between" align="center" wrap="wrap"><Heading level={2}>선택지별 신청 현황</Heading><Text type="supporting">신청 완료 {counts.reserved}명 · 취소 포함 전체 {total}건 · 정원 없음</Text></HStack>
    {desktop ? <Table data={counts.rows} columns={columns} idKey={c => String(c.option)} density="compact" />
      : <List hasDividers>{counts.rows.map(c => <ListItem key={c.option} label={c.option === MENTORING_NONE ? c.label : `${c.option}. ${c.label}`} endContent={<Text type="supporting">1차시 {c.first} · 2차시 {c.second}</Text>} />)}</List>}
  </VStack>
}
