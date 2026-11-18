import { useCallback, useState } from 'react'
import { TextInput } from '@astryxdesign/core/TextInput'
import { TextArea } from '@astryxdesign/core/TextArea'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { DateInput, type DateInputProps } from '@astryxdesign/core/DateInput'
import { TimeInput, type ISOTimeString } from '@astryxdesign/core/TimeInput'
import { MENTORING_OPTION_COUNT, type AdminApi, type MentoringOptionChange, type MentoringSettings, type MentoringSettingsInput } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { displayDate, errorMessage, fromLocalInput, toLocalInput } from '../data/format.ts'
import { VStack, HStack, Heading, Text, Button, PageHeader, Loaded, Message, DateField, Modal } from '../shared/ui.tsx'
import { useCan } from '../auth/access.ts'
import { TestingForm } from './SettingsPage.tsx'

// Requirements MNT-51 ~ 53 (docs/requirements/mentoring.md); save contract in
// docs/contracts/mentoring-command.md "mentoring.settings.save".
const DEFAULT_LOCATION = '중앙도서관 1층 St:art홀'
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export function MentoringSettingsPage({ api }: { api: AdminApi }) {
  const settings = useLoad(useCallback(() => api.getMentoringSettings(), [api]))
  const testing = useLoad(useCallback(() => api.getTesting('mentoring'), [api]))
  const editable = useCan()('settings.write')
  return <VStack gap={6}><PageHeader title="St:talk 행사 설정" description="현재 행사와 신청 기간, 차시 시간, 멘토 선택지, 학생 안내 문구를 관리합니다." />
    <Message>{editable ? '현재 행사 설정 한 문서를 편집합니다. 행사 ID나 선택지 이름을 바꿔도 기존 신청은 옮기거나 고치지 않습니다.' : '행사 설정 변경은 마스터 관리자만 할 수 있습니다.'}</Message>
    <Loaded state={settings.state} retry={settings.refresh}>{value => <MentoringSettingsForm key={value?.version || 'new'} api={api} initial={value} editable={editable} saved={settings.refresh} />}</Loaded>
    <Heading level={2}>테스트 허용</Heading><Text color="secondary">신청 기간 밖에서도 신청·변경·취소를 허용할 UID를 관리합니다. 테스트 사용자도 접수 열림(isOpen)이 필요합니다.</Text>
    <Loaded state={testing.state} retry={testing.refresh}>{value => <TestingForm key={value?.version || 'new'} kind="mentoring" api={api} initial={value} editable={editable} saved={testing.refresh} />}</Loaded>
  </VStack>
}

/** A Korean wall-clock time (HH:mm) of an ISO instant. */
const clock = (iso: string) => toLocalInput(iso).slice(11, 16)

function MentoringSettingsForm({ api, initial, editable, saved }: { api: AdminApi; initial: MentoringSettings | null; editable: boolean; saved: () => void }) {
  const [eventId, setEventId] = useState(initial?.eventId || ''), [open, setOpen] = useState(initial?.isOpen || false)
  const [appStart, setAppStart] = useState(toLocalInput(initial?.applicationPeriod.startsAt || '')), [appEnd, setAppEnd] = useState(toLocalInput(initial?.applicationPeriod.endsAt || ''))
  const [eventDate, setEventDate] = useState(toLocalInput(initial?.event.date || initial?.event.sessions[0].startsAt || '').slice(0, 10))
  const [location, setLocation] = useState(initial?.event.location || DEFAULT_LOCATION)
  const [times, setTimes] = useState(() => (initial?.event.sessions || []).flatMap(s => [clock(s.startsAt), clock(s.endsAt)]).concat(['', '', '', '']).slice(0, 4))
  const [options, setOptions] = useState(initial?.options || Array<string>(MENTORING_OPTION_COUNT).fill(''))
  const [intro, setIntro] = useState(initial?.intro || ''), [notes, setNotes] = useState((initial?.notes || []).join('\n'))
  const [epicUrl, setEpicUrl] = useState(initial?.epicFolioUrl || ''), [epicOpen, setEpicOpen] = useState(initial?.isEpicFolioLinkOpen || false)
  const [error, setError] = useState(''), [pending, setPending] = useState<MentoringSettingsInput | null>(null)

  const setTime = (index: number) => (value: string) => setTimes(old => old.map((t, i) => i === index ? value : t))
  // Mirrors admin-validation.js mentoringSettings so most mistakes show before the round trip.
  function build(): MentoringSettingsInput {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(eventId)) throw new Error('행사 ID를 YYYY-MM 형식으로 입력해 주세요.')
    const applicationPeriod = { startsAt: fromLocalInput(appStart), endsAt: fromLocalInput(appEnd) }
    if (applicationPeriod.startsAt >= applicationPeriod.endsAt) throw new Error('신청 시작은 신청 종료보다 빨라야 합니다.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) throw new Error('행사 날짜를 선택해 주세요.')
    const labels = ['1차시 시작', '1차시 종료', '2차시 시작', '2차시 종료']
    const at = times.map((time, i) => { if (!TIME.test(time)) throw new Error(`${labels[i]} 시각을 입력해 주세요.`); return fromLocalInput(`${eventDate}T${time}`) })
    if (at[0] >= at[1] || at[2] >= at[3]) throw new Error('각 차시의 시작은 종료보다 빨라야 합니다.')
    if (at[2] < at[1]) throw new Error('2차시는 1차시가 끝난 뒤 시작해야 합니다.')
    const place = location.trim()
    if (!place || place.length > 100) throw new Error('장소를 1~100자로 입력해 주세요.')
    const trimmed = options.map(label => label.trim())
    const tooLong = trimmed.findIndex(label => label.length > 100)
    if (tooLong >= 0) throw new Error(`선택지 ${tooLong + 1} 이름을 100자 이하로 입력해 주세요.`)
    if (open && trimmed.some(label => !label)) throw new Error(`접수를 열려면 선택지 ${MENTORING_OPTION_COUNT}개의 이름이 모두 필요합니다.`)
    if (intro.length > 3000) throw new Error('소개는 3000자 이하로 입력해 주세요.')
    const noteList = notes.split('\n').map(note => note.trim()).filter(Boolean)
    if (noteList.length > 20 || noteList.some(note => note.length > 300)) throw new Error('유의사항은 최대 20줄, 줄마다 300자 이하로 입력해 주세요.')
    const url = epicUrl.trim()
    if (url && !/^https:\/\/\S+$/.test(url)) throw new Error('EPIC Folio 주소는 https 주소여야 합니다.')
    if (epicOpen && !url) throw new Error('EPIC Folio 링크를 보이려면 주소가 필요합니다.')
    return { eventId, isOpen: open, applicationPeriod, event: { date: fromLocalInput(`${eventDate}T00:00`), location: place, sessions: [{ startsAt: at[0], endsAt: at[1] }, { startsAt: at[2], endsAt: at[3] }] }, options: trimmed, intro: intro.trim(), notes: noteList, epicFolioUrl: url, isEpicFolioLinkOpen: epicOpen }
  }

  let validDate: DateInputProps['value']
  try { if (eventDate) { fromLocalInput(`${eventDate}T00:00`); validDate = eventDate as DateInputProps['value'] } } catch { /* An invalid stored date stays unselected. */ }
  const timeValue = (time: string) => TIME.test(time) ? time as ISOTimeString : undefined
  const session = (n: 0 | 1) => <HStack gap={2} wrap="wrap" align="end">
    <TimeInput label={`${n + 1}차시 시작`} value={timeValue(times[n * 2])} onChange={next => setTime(n * 2)(next ? next.slice(0, 5) : '')} hourFormat="24h" isDisabled={!editable} width="var(--admin-time-width)" />
    <TimeInput label={`${n + 1}차시 종료`} value={timeValue(times[n * 2 + 1])} onChange={next => setTime(n * 2 + 1)(next ? next.slice(0, 5) : '')} hourFormat="24h" isDisabled={!editable} width="var(--admin-time-width)" />
  </HStack>

  return <fieldset disabled={!editable} className="contents"><VStack gap={5} maxWidth="var(--admin-content-width)">
    {initial?.warnings.map(warning => <Message key={warning}>{warning}</Message>)}
    <HStack gap={4} align="end" wrap="wrap"><TextInput label="행사 ID" value={eventId} onChange={setEventId} placeholder="YYYY-MM" description="신청은 이 ID로 묶입니다. 새 행사는 새 ID로 시작합니다." isRequired /><CheckboxInput label="학생 접수 열기" value={open} onChange={setOpen} description="실제 신청 가능 여부는 아래 신청 기간과 함께 결정됩니다." /></HStack>
    <VStack gap={4} className="grid md:grid-cols-2"><DateField label="신청 시작" value={appStart} onChange={setAppStart} /><DateField label="신청 종료" value={appEnd} onChange={setAppEnd} /></VStack>
    <Text type="supporting">신청·변경·취소는 모두 이 기간에만 됩니다. 시작·종료 시각과 정확히 같은 순간은 제외됩니다.</Text>

    <Heading level={2}>행사 일시·장소</Heading>
    <VStack gap={4} className="grid md:grid-cols-2">
      <VStack gap={1}><DateInput label="행사 날짜" value={validDate} onChange={next => setEventDate(next || '')} format="system_date" isDisabled={!editable} width="min(100%, var(--admin-date-width))" /><Text type="supporting">한국 시간 (Asia/Seoul). 두 차시 모두 이 날짜에 진행합니다.</Text></VStack>
      <TextInput label="장소" value={location} onChange={setLocation} isRequired />
      {session(0)}{session(1)}
    </VStack>

    <Heading level={2}>멘토 선택지</Heading>
    <Text color="secondary">1·2차시가 같은 선택지 {MENTORING_OPTION_COUNT}개와 "선택 안함"을 함께 씁니다. 학생은 1차시에 고른 선택지를 2차시에 고를 수 없고, 두 차시 모두 "선택 안함"일 수도 없습니다. 신청은 번호로 저장되므로, 이름을 바꾸면 그 번호를 고른 신청도 새 이름으로 보입니다. 이름은 "회사/직무/학과"처럼 슬래시로 나눠 적으면 학생 화면에서 회사를 크게, 직무·학과를 작게 보여 줍니다.</Text>
    <VStack gap={3} className="grid md:grid-cols-2">
      {options.map((label, index) => <TextInput key={index} label={`선택지 ${index + 1}`} value={label} onChange={next => setOptions(old => old.map((l, i) => i === index ? next : l))} placeholder="회사/직무/학과 — 예: 현대로템/SI/컴퓨터공학과" />)}
      <TextInput label="선택 안함" value="선택 안함" onChange={() => {}} isDisabled disabledMessage="모든 행사에 고정으로 제공됩니다. 한 차시만 참여할 때 고릅니다." />
    </VStack>
    <Text type="supporting">접수가 닫혀 있는 동안은 비워 둘 수 있습니다. 접수를 열려면 {MENTORING_OPTION_COUNT}개 모두 이름이 필요합니다.</Text>

    <Heading level={2}>안내 문구</Heading>
    <TextArea label="프로그램 소개" description="학생 안내 페이지 첫머리에 보입니다." value={intro} onChange={setIntro} rows={5} maxLength={3000} />
    <TextArea label="유의사항" description="한 줄에 하나. 최대 20줄." value={notes} onChange={setNotes} rows={5} />
    <HStack gap={4} align="end" wrap="wrap"><TextInput label="EPIC Folio 신청 주소" value={epicUrl} onChange={setEpicUrl} placeholder="https://" width="min(100%, var(--admin-editor-width))" /><CheckboxInput label="학생 화면에 EPIC Folio 링크 보이기" value={epicOpen} onChange={setEpicOpen} description="본 신청과 별도로 신청해야 EPIC 점수를 받는다는 안내는 링크와 관계없이 보입니다." /></HStack>

    {error && <Message error>{error}</Message>}
    {editable && <HStack justify="end"><Button label="행사 설정 검토" variant="primary" onClick={() => { try { setPending(build()); setError('') } catch (e) { setError(errorMessage(e)) } }} /></HStack>}
    {pending && <SaveDialog api={api} initial={initial} next={pending} close={() => setPending(null)} saved={saved} />}
  </VStack></fieldset>
}

type Needs = { reserved?: number; changedOptions?: MentoringOptionChange[] }
/** The server's request to confirm (failed-precondition details), if that is what this error is. */
function confirmationNeeded(error: unknown): Needs | null {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  const details = error && typeof error === 'object' && 'details' in error && error.details && typeof error.details === 'object' ? error.details as Record<string, unknown> : null
  if (!code.includes('failed-precondition') || !details) return null
  if (typeof details.reserved === 'number') return { reserved: details.reserved }
  if (Array.isArray(details.changedOptions)) return { changedOptions: details.changedOptions as MentoringOptionChange[] }
  return null
}

function SaveDialog({ api, initial, next, close, saved }: { api: AdminApi; initial: MentoringSettings | null; next: MentoringSettingsInput; close: () => void; saved: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [needs, setNeeds] = useState<Needs>({}), [confirmed, setConfirmed] = useState(false)
  const leavingEvent = initial?.schemaVersion === 2 && initial.eventId && initial.eventId !== next.eventId ? initial.eventId : ''
  const before = initial?.schemaVersion === 2 ? initial.options : []
  const renamed = next.options.map((after, index) => ({ option: index + 1, before: before[index] || '', after })).filter(change => change.before !== change.after)
  const asking = needs.reserved !== undefined || needs.changedOptions !== undefined
  async function save() {
    if (busy) return
    setBusy(true); setError('')
    try {
      await api.command({ action: 'mentoring.settings.save', version: initial?.version || '', input: next,
        ...(confirmed && needs.reserved !== undefined ? { confirmEventChange: leavingEvent } : {}),
        ...(confirmed && needs.changedOptions ? { confirmChangedOptions: needs.changedOptions.map(o => o.option) } : {}) })
      saved(); close()
    } catch (e) {
      const asked = confirmationNeeded(e)
      // Ask once with what the server counted; a second refusal is a real error.
      if (asked && !confirmed) { setNeeds(asked); setError('') } else setError(errorMessage(e))
    } finally { setBusy(false) }
  }
  const s = next.event.sessions
  return <Modal title="St:talk 행사 설정을 저장할까요?" close={close} busy={busy} error={error} footer={<HStack justify="end" gap={2}><Button label="돌아가기" onClick={close} isDisabled={busy} /><Button label={asking ? '확인했고 저장' : '확인 후 설정 저장'} variant={asking ? 'destructive' : 'primary'} isLoading={busy} isDisabled={asking && !confirmed} onClick={save} /></HStack>}>
    <VStack gap={2}>
      <Text>행사: {initial?.eventId || '미등록'} → {next.eventId}</Text>
      <Text>접수: {initial?.isOpen ? '열림' : '닫힘'} → {next.isOpen ? '열림' : '닫힘'}</Text>
      <Text>신청 {displayDate(next.applicationPeriod.startsAt)} — {displayDate(next.applicationPeriod.endsAt)}</Text>
      <Text>행사 {toLocalInput(next.event.date).slice(0, 10)} ·1차시 {clock(s[0].startsAt)}–{clock(s[0].endsAt)} · 2차시 {clock(s[1].startsAt)}–{clock(s[1].endsAt)} · {next.event.location}</Text>
      <Text>선택지 이름 {next.options.filter(Boolean).length}/{MENTORING_OPTION_COUNT}개{renamed.length ? ` · 바뀌는 번호 ${renamed.map(change => change.option).join(', ')}` : ' · 바뀌는 이름 없음'}</Text>
      <Text>EPIC Folio 링크 {next.isEpicFolioLinkOpen ? '보임' : '숨김'}. 학생 화면에 바로 영향을 줍니다.</Text>
      {initial?.schemaVersion === 1 && <Message>이전(v1) 형식 설정을 새 형식으로 바꿔 저장합니다. v1 전용 필드는 지워지고, v1 신청은 새 행사 화면에 보이지 않습니다.</Message>}
    </VStack>
    {needs.reserved !== undefined && <VStack gap={2}><Message error>현재 행사({leavingEvent})에 신청 완료 {needs.reserved}건이 있습니다. 행사 ID를 바꾸면 이 신청은 학생의 내 신청 화면에서 사라지고, 학생이 변경·취소할 수 없습니다.</Message><CheckboxInput label={`${leavingEvent} 행사 신청이 학생 화면에서 사라지는 것을 확인했습니다`} value={confirmed} onChange={setConfirmed} /></VStack>}
    {needs.changedOptions && <VStack gap={2}><Message error>이름을 바꾸려는 선택지를 고른 신청이 있습니다. 신청은 번호로 저장되어 있어, 저장하면 이 학생들의 신청 내역에 새 이름이 보입니다.</Message>
      {needs.changedOptions.map(change => <Text key={change.option}>{change.option}번 "{change.before || '이름 없음'}" → "{change.after || '이름 없음'}" — 1차시 {change.first}명 · 2차시 {change.second}명</Text>)}
      <CheckboxInput label="위 신청이 새 이름으로 보이는 것을 확인했습니다" value={confirmed} onChange={setConfirmed} /></VStack>}
  </Modal>
}
