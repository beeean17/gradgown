import { useCallback, useState } from 'react'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Selector } from '@astryxdesign/core/Selector'
import { List, ListItem } from '@astryxdesign/core/List'
import type { AdminApi, ConsoleMember, ConsoleMembers } from '../contracts/admin-view.ts'
import { useLoad } from '../hooks/useLoad.ts'
import { useCan, useConsoleUser } from '../auth/access.ts'
import { displayDate, errorMessage } from '../data/format.ts'
import { VStack, HStack, Heading, Text, Button, PageHeader, Loaded, Empty, Message, Confirm, Token } from '../shared/ui.tsx'

export function MembersPage({ api }: { api: AdminApi }) {
  const { state, refresh } = useLoad(useCallback(() => api.getMembers(), [api]))
  const manage = useCan()('members.manage'), me = useConsoleUser()
  const isMe = (member: ConsoleMember) => member.kind === 'uid' ? member.key === me.uid : member.key === me.email.toLowerCase()
  const [removing, setRemoving] = useState<ConsoleMember | null>(null), [notice, setNotice] = useState('')
  return <VStack gap={5}><PageHeader title="관리자 관리" description="운영 콘솔을 볼 수 있는 관리자를 등록하고 해제합니다." />
    <Message>마스터 계정은 코드에 고정되어 있어 여기서 바꿀 수 없습니다. 등록한 관리자는 예약·설정·공지·로그를 볼 수만 있고, 아무것도 바꿀 수 없습니다.{manage ? '' : ' 관리자 등록·해제는 마스터 관리자만 할 수 있습니다.'}</Message>{notice && <Message>{notice}</Message>}
    <Loaded state={state} retry={refresh}>{members => <>
      {manage && <MemberForm api={api} members={members} added={key => { setNotice(`${key}을(를) 관리자로 등록했습니다.`); refresh() }} />}
      {!members.entries.length && me.access.role !== 'master' ? <Empty detail="아직 등록한 관리자가 없습니다." /> : <List hasDividers header={<Text type="supporting">{me.access.role === 'master' ? `마스터 1명 · 등록된 관리자 ${members.entries.length}명` : `등록된 관리자 ${members.entries.length}명`}</Text>}>
        {me.access.role === 'master' && <ListItem label={me.email || me.uid} description={`UID ${me.uid} · 코드에 고정되어 해제할 수 없습니다`} startContent={<Token label="마스터" size="sm" color="purple" />} endContent={<Token label="나" size="sm" />} />}
        {members.entries.map(member => <ListItem key={`${member.kind}:${member.key}`} label={member.key} description={[member.label, `등록 ${displayDate(member.addedAt)}`].filter(Boolean).join(' · ')} startContent={<Token label={member.kind === 'email' ? '이메일' : 'UID'} size="sm" color={member.kind === 'email' ? 'blue' : 'gray'} />} endContent={manage ? <Button label="해제" variant="ghost" size="sm" onClick={() => setRemoving(member)} /> : isMe(member) && <Token label="나" size="sm" />} />)}
      </List>}
      {removing && <Confirm title="이 관리자를 해제할까요?" label="관리자 해제" detail={<Text>{removing.key}. 해제하면 바로 콘솔에 들어올 수 없습니다.</Text>} close={() => setRemoving(null)} action={async () => { await api.command({ action: 'members.remove', version: members.version, input: { kind: removing.kind, key: removing.key } }); setNotice('관리자를 해제했습니다.'); refresh() }} />}
    </>}</Loaded>
  </VStack>
}
function MemberForm({ api, members, added }: { api: AdminApi; members: ConsoleMembers; added: (key: string) => void }) {
  const [kind, setKind] = useState<ConsoleMember['kind']>('email'), [key, setKey] = useState(''), [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function add() {
    if (busy) return
    setBusy(true); setError('')
    try { await api.command({ action: 'members.add', version: members.version, input: { kind, key: key.trim(), label: label.trim() } }); added(key.trim()) } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  return <VStack gap={3}><Heading level={2}>관리자 등록</Heading>
    <HStack gap={3} align="end" wrap="wrap"><Selector label="등록 방식" value={kind} onChange={value => setKind(value as ConsoleMember['kind'])} options={[{ value: 'email', label: 'Google 이메일' }, { value: 'uid', label: 'Firebase UID' }]} /><TextInput label={kind === 'email' ? 'Google 이메일' : 'Firebase Auth UID'} value={key} onChange={setKey} placeholder={kind === 'email' ? 'name@gmail.com' : 'UID 붙여넣기'} hasClear width="min(100%, var(--admin-editor-width))" /><TextInput label="메모 (선택)" value={label} onChange={setLabel} placeholder="이름이나 역할" /><Button label="관리자 등록" variant="primary" isLoading={busy} isDisabled={!key.trim()} onClick={add} /></HStack>
    <Text type="supporting">{kind === 'email' ? '이 이메일로 Google 로그인한 계정이 관리자가 됩니다. 아직 한 번도 로그인하지 않았어도 미리 등록할 수 있습니다.' : 'UID 검색에서 계정을 확인한 뒤 전체 UID를 붙여 넣으세요.'}</Text>
    {error && <Message error>{error}</Message>}
  </VStack>
}
