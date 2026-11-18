import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PATHS } from '../../app/routes/paths'
import { describeCommandError } from '../../shared/api/command'
import { OFFLINE_MESSAGE, useOnline } from '../../shared/hooks/useOnline'
import { kstParts } from '../../shared/lib/datetime'
import type { MentoringEvent, MentoringRegistration } from '../../shared/types'
import { applyDeadlineLabel, eventDateLabel, eventTitle, sessionLabel } from './eventInfo'
import { describeOption, isOfferedOption } from './mentoringData'
import { cancelRegistration, newOperationId, updateRegistration } from './mentoringCommands'
import {
  mentoringApplicantChanged,
  validateMentoringApplicant,
  type MentoringApplicant,
  type MentoringApplicantErrors,
} from './applicant'
import { EMPTY_SELECTION, selectionError, type SessionSelection } from './selection'
import { mentoringAvailability, useMentoringTester, useMyRegistrations } from './useMentoring'

const pad = (n: number) => String(n).padStart(2, '0')

function dateStamp(iso: string): string {
  if (!iso) return ''
  const p = kstParts(iso)
  return `${p.year}.${pad(p.month)}.${pad(p.day)}`
}

export type MyMentoringStatus = 'reserved' | 'cancelled' | 'empty'

export interface MyMentoringSelection {
  /** "1차시 14:00 – 14:40" */
  sessionLabel: string
  /** The option's current name, "선택 안함", or "이름 없는 선택지 n". */
  optionLabel: string
  kind: 'option' | 'none' | 'unnamed' | 'invalid'
}

export interface MyMentoringViewModel {
  eventTitle: string
  event: MentoringEvent | null
  status: MyMentoringStatus
  statusLabel: string
  statusDateLabel: string
  selections: MyMentoringSelection[]
  eventDateLabel: string
  location: string
  /** `nameAndStudentId` keeps the department for the desktop row; the phone's card shows `nameAndId` and `department` apart. */
  details: { nameAndStudentId: string; nameAndId: string; department: string; grade: string; phone: string }
  /** Live and inside the window — change and cancel are offered. */
  editable: boolean
  /** The apply window is open, so "신청하기 / 다시 신청하기" leads somewhere. */
  canApply: boolean
  editDeadlineLabel: string
  cancellationMessage: string
  cancellationDialogDescription: string
  emptyDescription: string
  lockedMessage: string
  actionError: string
  announcement: string
}

export interface MyMentoringEditorController {
  isOpen: boolean
  selection: SessionSelection
  onSelectionChange: (next: SessionSelection) => void
  applicant: MentoringApplicant
  onApplicantChange: { [K in keyof MentoringApplicant]: (value: MentoringApplicant[K]) => void }
  applicantErrors: MentoringApplicantErrors
  hasChanges: boolean
  isSaving: boolean
  error: string
  onSave: () => void
  onCancel: () => void
}

/** The stored details as the editor's fields; empty before a registration loads. */
function applicantOf(registration: MentoringRegistration | null): MentoringApplicant {
  return {
    name: registration?.name ?? '',
    studentId: registration?.studentId ?? '',
    department: registration?.department ?? '',
    grade: registration?.grade || null,
    phone: registration?.phone ?? '',
  }
}

function buildView(
  event: MentoringEvent | null,
  registration: MentoringRegistration | null,
  announcement: string,
  actionError: string,
  isTester: boolean,
): MyMentoringViewModel {
  const availability = mentoringAvailability(event, undefined, isTester)
  const canApply = availability === 'open'
  const status: MyMentoringStatus = !registration
    ? 'empty'
    : registration.status === 'cancelled'
      ? 'cancelled'
      : 'reserved'
  const [first, second] = event?.sessions ?? []
  const selections: MyMentoringSelection[] = registration
    ? [
        first && { session: first, option: registration.firstOption },
        second && { session: second, option: registration.secondOption },
      ]
        .filter((item): item is { session: NonNullable<typeof first>; option: number | null } => Boolean(item))
        .map(({ session, option }) => {
          const described = describeOption(event, option)
          return { sessionLabel: sessionLabel(session), optionLabel: described.label, kind: described.kind }
        })
    : []
  const editable = status === 'reserved' && canApply
  const deadline = applyDeadlineLabel(event)
  const title = eventTitle(event)

  return {
    eventTitle: title,
    event,
    status,
    statusLabel: status === 'reserved' ? '신청 완료' : status === 'cancelled' ? '취소됨' : '',
    statusDateLabel: !registration
      ? ''
      : status === 'cancelled'
        ? `${dateStamp(registration.modifiedAt)} 취소`
        : `${dateStamp(registration.modifiedAt)} ${registration.modifiedAt === registration.createdAt ? '신청' : '변경'}`,
    selections,
    eventDateLabel: eventDateLabel(event) || '일시 추후 안내',
    location: event?.location || '장소 추후 안내',
    details: {
      nameAndStudentId: registration
        ? [registration.name, registration.studentId, registration.department].filter(Boolean).join(' · ')
        : '',
      nameAndId: registration ? [registration.name, registration.studentId].filter(Boolean).join(' · ') : '',
      department: registration?.department || '-',
      grade: registration?.grade ? `${registration.grade}학년` : '-',
      phone: registration?.phone || '-',
    },
    editable,
    canApply,
    editDeadlineLabel: deadline ? `${deadline}까지 변경·취소` : '',
    cancellationMessage:
      canApply && deadline
        ? `신청을 취소했어요. ${deadline} 전이라면 다시 신청할 수 있어요.`
        : '신청을 취소했어요. 지금은 신청 기간이 아니라 다시 신청할 수 없어요.',
    cancellationDialogDescription:
      canApply && deadline
        ? `취소하면 선택한 차시 자리가 사라져요. 필요하면 ${deadline}까지 다시 신청할 수 있어요.`
        : '취소하면 선택한 차시 자리가 사라지고, 신청 기간이 아니라 다시 신청할 수 없어요.',
    emptyDescription: !event
      ? 'St:talk 일정이 정해지면 공지사항으로 알려드려요.'
      : canApply
        ? `${title} 신청 기간에 차시별 선택지를 고르면 여기에 표시돼요.`
        : '지금은 신청 기간이 아니에요. 일정은 St:talk 안내에서 확인해 주세요.',
    lockedMessage:
      availability === 'suspended'
        ? '지금은 St:talk 신청 변경·취소가 잠시 중단되어 있어요. 공지사항을 확인하거나 인스타그램(@grad_seoultech)으로 문의해 주세요.'
        : '변경·취소 가능 기간이 지났어요. 필요하면 인스타그램(@grad_seoultech)으로 문의해 주세요.',
    actionError,
    announcement,
  }
}

export function useMyMentoringView() {
  const navigate = useNavigate()
  const { current: registration, event, status: loadStatus, retry } = useMyRegistrations()
  const { isTester } = useMentoringTester()

  const [announcement, setAnnouncement] = useState('')
  const [isEditing, setEditing] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [isCancelling, setCancelling] = useState(false)
  const [editError, setEditError] = useState('')
  const [actionError, setActionError] = useState('')
  const [applicantErrors, setApplicantErrors] = useState<MentoringApplicantErrors>({})
  const [draft, setDraft] = useState<{ selection: SessionSelection; applicant: MentoringApplicant }>({
    selection: EMPTY_SELECTION,
    applicant: applicantOf(null),
  })
  // Same idempotency rule as the create flow: reuse only after an unknown result.
  const saveOperation = useRef<string | null>(null)
  const cancelOperation = useRef<string | null>(null)
  const isOnline = useOnline()

  // A save or cancel whose response was lost (`unknown`) may still have been
  // applied. The subscription tells: the document moving to the draft's
  // values (or to `cancelled`) is that request succeeding, so the screen
  // settles the same way it would have on a normal response.
  const [awaitingSave, setAwaitingSave] = useState<{ version: string; selection: SessionSelection; applicant: MentoringApplicant } | null>(null)
  const [awaitingCancel, setAwaitingCancel] = useState(false)
  const savedByRead = Boolean(
    awaitingSave &&
      registration &&
      registration.version !== awaitingSave.version &&
      registration.firstOption === awaitingSave.selection.firstOption &&
      registration.secondOption === awaitingSave.selection.secondOption &&
      !mentoringApplicantChanged(applicantOf(registration), awaitingSave.applicant),
  )
  useEffect(() => {
    if (!savedByRead) return
    saveOperation.current = null
    setAwaitingSave(null)
    setEditing(false)
    setEditError('')
    setAnnouncement('신청 변경이 저장되었습니다.')
  }, [savedByRead])
  const cancelledByRead = awaitingCancel && registration?.status === 'cancelled'
  useEffect(() => {
    if (!cancelledByRead) return
    cancelOperation.current = null
    setAwaitingCancel(false)
    setEditing(false)
    setActionError('')
    setAnnouncement('St:talk 신청이 취소되었습니다.')
  }, [cancelledByRead])

  const view = buildView(event, registration, announcement, actionError, isTester)

  const beginEdit = () => {
    if (!registration) return
    // The stored numbers as they are. An option that has lost its name (only
    // in a closed draft) cannot be sent back, so that session starts empty.
    setDraft({
      selection: {
        firstOption: isOfferedOption(event, registration.firstOption) ? registration.firstOption : null,
        secondOption: isOfferedOption(event, registration.secondOption) ? registration.secondOption : null,
      },
      applicant: applicantOf(registration),
    })
    saveOperation.current = null
    setAwaitingSave(null)
    setEditError('')
    setApplicantErrors({})
    setActionError('')
    setEditing(true)
    setAnnouncement('신청 변경 입력 화면이 열렸습니다.')
  }

  const touch = () => {
    // Any change to the draft is a new intent and needs a new operation id.
    saveOperation.current = null
    setAwaitingSave(null)
    setEditError('')
  }

  const changeApplicant = <K extends keyof MentoringApplicant>(key: K, value: MentoringApplicant[K]) => {
    touch()
    setDraft((current) => ({ ...current, applicant: { ...current.applicant, [key]: value } }))
    setApplicantErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const hasChanges = Boolean(
    registration &&
      (draft.selection.firstOption !== registration.firstOption ||
        draft.selection.secondOption !== registration.secondOption ||
        mentoringApplicantChanged(draft.applicant, applicantOf(registration))),
  )

  const saveEdit = async () => {
    if (!registration || isSaving) return
    const error = selectionError(draft.selection)
    if (error) return setEditError(error)
    const errors = validateMentoringApplicant(draft.applicant)
    setApplicantErrors(errors)
    if (Object.keys(errors).length > 0) return setEditError('신청자 정보를 확인해 주세요.')
    // validateMentoringApplicant has ruled out a missing grade; narrow for the wire type.
    const grade = draft.applicant.grade ?? 0
    if (!isOnline) return setEditError(OFFLINE_MESSAGE)
    // selectionError has ruled out null; narrow for the wire type.
    const firstOption = draft.selection.firstOption ?? 0
    const secondOption = draft.selection.secondOption ?? 0

    saveOperation.current ??= newOperationId()
    setSaving(true)
    setEditError('')
    try {
      await updateRegistration(
        registration,
        {
          ...draft.applicant,
          grade,
          firstOption,
          secondOption,
        },
        saveOperation.current,
      )
      saveOperation.current = null
      setAwaitingSave(null)
      setEditing(false)
      setAnnouncement('신청 변경이 저장되었습니다.')
    } catch (error) {
      const { message, keepOperation } = describeCommandError(error)
      if (keepOperation) setAwaitingSave({ version: registration.version, selection: draft.selection, applicant: draft.applicant })
      else saveOperation.current = null
      setEditError(message)
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditError('')
    setAnnouncement('신청 변경을 취소했습니다.')
  }

  const editor: MyMentoringEditorController = {
    isOpen: isEditing && view.editable,
    selection: draft.selection,
    onSelectionChange: (selection) => {
      touch()
      setDraft((current) => ({ ...current, selection }))
    },
    applicant: draft.applicant,
    onApplicantChange: {
      name: (value) => changeApplicant('name', value),
      studentId: (value) => changeApplicant('studentId', value),
      department: (value) => changeApplicant('department', value),
      grade: (value) => changeApplicant('grade', value),
      phone: (value) => changeApplicant('phone', value),
    },
    applicantErrors,
    hasChanges,
    isSaving,
    error: editError,
    onSave: () => void saveEdit(),
    onCancel: cancelEdit,
  }

  const openApply = () => navigate(PATHS.public.mentoringApply)

  /** Resolves true when the registration is cancelled, so the dialog can close. */
  const cancelCurrent = async (): Promise<boolean> => {
    if (!registration || isCancelling) return false
    if (!isOnline) {
      setActionError(OFFLINE_MESSAGE)
      return false
    }
    cancelOperation.current ??= newOperationId()
    setCancelling(true)
    setActionError('')
    try {
      await cancelRegistration(registration, cancelOperation.current)
      cancelOperation.current = null
      setAwaitingCancel(false)
      setEditing(false)
      setAnnouncement('St:talk 신청이 취소되었습니다.')
      return true
    } catch (error) {
      const { message, keepOperation } = describeCommandError(error)
      if (keepOperation) setAwaitingCancel(true)
      else cancelOperation.current = null
      setActionError(message)
      return false
    } finally {
      setCancelling(false)
    }
  }

  return {
    loadStatus,
    retry,
    view,
    editor,
    beginEdit,
    openApply,
    cancelRegistration: cancelCurrent,
    isCancelling,
  }
}
