import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PATHS } from '../../app/routes/paths'
import { calendarDaysUntil, kstParts, WEEKDAYS } from '../../shared/lib/datetime'
import type { GownSize, Reservation, ReservationPeriod, ReservationSlot } from '../../shared/types'
import { slotAt } from './reservationData'
import {
  cancelReservation,
  newOperationId,
  ReservationCommandError,
  updateReservation,
} from './reservationCommands'
import {
  applicantChanged,
  validateReservationApplicant,
  type ApplicantInputErrors,
  type ReservationApplicant,
} from './applicant'
import {
  canEdit,
  reservationAvailability,
  scheduleDays,
  useMyReservations,
  useReservationTester,
  type ScheduleDay,
} from './useReservation'

const pad = (n: number) => String(n).padStart(2, '0')

function dateStamp(iso: string): string {
  if (!iso) return ''
  const p = kstParts(iso)
  return `${p.year}.${pad(p.month)}.${pad(p.day)}`
}

/** "11/22 (일) 09:00" — the flow's and the cards' deadline format. */
function monthDayTime(iso: string): string {
  const p = kstParts(iso)
  return `${p.month}/${p.day} (${WEEKDAYS[p.weekday]}) ${pad(p.hour)}:${pad(p.minute)}`
}

/** "8/28 (금) 13:00 – 14:00" — the cards' day format — or the bare stored instant when its slot is gone. */
function scheduleText(slot: ReservationSlot | undefined, at: string): string {
  if (slot) {
    const start = kstParts(slot.startsAt)
    const end = kstParts(slot.endsAt)
    return `${start.month}/${start.day} (${WEEKDAYS[start.weekday]}) ${pad(start.hour)}:${pad(start.minute)} – ${pad(end.hour)}:${pad(end.minute)}`
  }
  if (!at) return '시간 확인 필요'
  const p = kstParts(at)
  return `${p.month}/${p.day} (${WEEKDAYS[p.weekday]}) ${pad(p.hour)}:${pad(p.minute)}`
}

/** The stored details as the editor's fields; empty before a reservation loads. */
function applicantOf(reservation: Reservation | null): ReservationApplicant {
  return {
    name: reservation?.name ?? '',
    studentId: reservation?.studentId ?? '',
    department: reservation?.department ?? '',
    phone: reservation?.phone ?? '',
    isProxy: reservation?.isProxy ?? false,
    proxyName: reservation?.proxyName ?? '',
    proxyPhone: reservation?.proxyPhone ?? '',
  }
}

function dayIndexForSlot(days: ScheduleDay[], slotId: string): number {
  const index = days.findIndex((day) => day.slots.some((slot) => slot.slotId === slotId))
  return index >= 0 ? index : 0
}

/** The later of two ISO instants; `''` counts as missing. */
function later(a: string, b: string): string {
  if (!a) return b
  if (!b) return a
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b
}

interface EditDraft {
  applicant: ReservationApplicant
  size: GownSize | ''
  rentDayIndex: number
  rentSlotId: string
  returnDayIndex: number
  returnSlotId: string
}

export type MyReservationStatus = 'reserved' | 'cancelled' | 'completed' | 'empty'

export interface MyReservationsViewModel {
  periodTitle: string
  periodStart: string
  periodEnd: string
  editable: boolean
  /** The create window is open, so "예약하기 / 다시 예약하기" can lead somewhere. */
  canReserve: boolean
  status: MyReservationStatus
  statusLabel: string
  statusDateLabel: string
  pickup: { label: string; dday: number | null }
  return: { label: string }
  /** `nameAndStudentId` keeps the department for the desktop row; the phone's card shows `nameAndId` and `department` apart. */
  details: { size: string; nameAndStudentId: string; nameAndId: string; department: string; phone: string; proxy: string | null }
  editDeadlineLabel: string
  cancellationMessage: string
  cancellationDialogDescription: string
  /** Why the empty state cannot offer a reservation, when it cannot. */
  emptyDescription: string
  /** Why a live reservation can no longer be changed here (when `editable` is false). */
  lockedMessage: string
  /** Failure of the last cancel request, shown beside the actions. */
  actionError: string
  announcement: string
}

export interface MyReservationEditorController {
  isOpen: boolean
  applicant: ReservationApplicant
  onApplicantChange: { [K in keyof ReservationApplicant]: (value: ReservationApplicant[K]) => void }
  applicantErrors: ApplicantInputErrors
  size: GownSize | ''
  onSizeChange: (size: GownSize) => void
  rentDays: ScheduleDay[]
  rentDayIndex: number
  onRentDayChange: (index: number) => void
  rentSlotId: string
  onRentSlotChange: (id: string) => void
  returnDays: ScheduleDay[]
  returnDayIndex: number
  onReturnDayChange: (index: number) => void
  returnSlotId: string
  onReturnSlotChange: (id: string) => void
  hasChanges: boolean
  isSaving: boolean
  error: string
  onSave: () => void
  onCancel: () => void
}

function describe(error: unknown): { message: string; keepOperation: boolean } {
  if (error instanceof ReservationCommandError) {
    return {
      message: error.kind === 'failed' ? `${error.message} (요청 ID ${error.operationId})` : error.message,
      keepOperation: error.kind === 'unknown',
    }
  }
  return { message: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.', keepOperation: false }
}

function buildView(
  period: ReservationPeriod | null,
  reservation: Reservation | null,
  announcement: string,
  actionError: string,
  isTester: boolean,
): MyReservationsViewModel {
  const rentSlot = reservation && period ? slotAt(period.rentSlots, reservation.rentAt) : undefined
  const returnSlot = reservation && period ? slotAt(period.returnSlots, reservation.returnAt) : undefined
  const pickupLabel = reservation ? scheduleText(rentSlot, reservation.rentAt) : ''
  const returnLabel = reservation ? scheduleText(returnSlot, reservation.returnAt) : ''
  const status: MyReservationStatus = !reservation
    ? 'empty'
    : reservation.status === 'reserved' || reservation.status === 'cancelled'
      ? reservation.status
      : 'completed'
  const canReserve = reservationAvailability(period, undefined, isTester) === 'open'
  const editDeadline = period ? later(period.editEndAt, period.applyEndAt) : ''
  const dday = reservation?.rentAt ? calendarDaysUntil(reservation.rentAt) : null

  return {
    periodTitle: period?.title.replace(/ 학위복 예약$/, '') ?? '',
    periodStart: period?.applyStartAt ?? '',
    periodEnd: period?.applyEndAt ?? '',
    editable: status === 'reserved' && canEdit(period, undefined, isTester),
    canReserve,
    status,
    statusLabel:
      status === 'reserved'
        ? '예약 완료'
        : status === 'cancelled'
          ? '취소됨'
          : reservation?.status === 'completed'
            ? '처리 완료'
            : status === 'completed'
              ? '확인 필요'
              : '',
    statusDateLabel: !reservation
      ? ''
      : status === 'cancelled'
        ? `${dateStamp(reservation.modifiedAt)} 취소`
        : `${dateStamp(reservation.modifiedAt)} ${reservation.modifiedAt === reservation.createdAt ? '신청' : '변경'}`,
    pickup: { label: pickupLabel, dday: dday !== null && dday >= 0 ? dday : null },
    return: { label: returnLabel },
    details: {
      size: reservation
        ? reservation.size
          ? reservation.size
          : reservation.sizeRaw || '확인 필요'
        : '',
      nameAndStudentId: reservation
        ? [reservation.name, reservation.studentId, reservation.department].filter(Boolean).join(' · ')
        : '',
      nameAndId: reservation ? [reservation.name, reservation.studentId].filter(Boolean).join(' · ') : '',
      department: reservation?.department || '-',
      phone: reservation?.phone || '-',
      proxy: reservation?.isProxy ? `${reservation.proxyName} · ${reservation.proxyPhone}` : null,
    },
    editDeadlineLabel: editDeadline ? `${monthDayTime(editDeadline)}까지 변경·취소` : '',
    cancellationMessage:
      canReserve && period
        ? `예약을 취소했어요. ${monthDayTime(period.applyEndAt)}까지 다시 예약할 수 있어요.`
        : '예약을 취소했어요. 지금은 예약 기간이 아니라 다시 예약할 수 없어요.',
    cancellationDialogDescription:
      canReserve && period
        ? `취소하면 ${pickupLabel.replace(/\s*–.*$/, '')} 수령 시간이 사라져요. 필요하면 ${monthDayTime(period.applyEndAt)}까지 다시 예약할 수 있어요.`
        : `취소하면 ${pickupLabel.replace(/\s*–.*$/, '')} 수령 시간이 사라지고, 예약 기간이 아니라 다시 예약할 수 없어요.`,
    emptyDescription: !period
      ? '예약 일정이 정해지면 공지사항으로 알려드려요.'
      : canReserve
        ? `${period.title.replace(/ 학위복 예약$/, '')} 예약 기간에 사이즈와 수령·반납 시간을 고르면 여기에 표시돼요.`
        : '지금은 예약 기간이 아니에요. 일정은 공지사항에서 확인해 주세요.',
    lockedMessage:
      status === 'completed'
        ? '현장 처리가 끝난 예약이에요. 문의 사항은 총졸업준비위원회로 연락해 주세요.'
        : period?.status === 'closed'
          ? '지금은 예약 변경·취소가 잠시 중단되어 있어요. 공지사항을 확인하거나 인스타그램(@grad_seoultech)으로 문의해 주세요.'
          : '변경·취소 가능 기간이 지났어요. 필요하면 인스타그램(@grad_seoultech)으로 문의해 주세요.',
    actionError,
    announcement,
  }
}

export function useMyReservationsView() {
  const navigate = useNavigate()
  const { current: reservation, period, status: loadStatus, retry } = useMyReservations()
  const { isTester } = useReservationTester()
  const rentSlots = period?.rentSlots ?? []
  const returnSlots = period?.returnSlots ?? []
  const rentDays = scheduleDays(rentSlots)
  const returnDays = scheduleDays(returnSlots)

  const [announcement, setAnnouncement] = useState('')
  const [isEditing, setEditing] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [isCancelling, setCancelling] = useState(false)
  const [editError, setEditError] = useState('')
  const [actionError, setActionError] = useState('')
  const [applicantErrors, setApplicantErrors] = useState<ApplicantInputErrors>({})
  const [draft, setDraft] = useState<EditDraft>({
    applicant: applicantOf(null),
    size: '',
    rentDayIndex: 0,
    rentSlotId: '',
    returnDayIndex: 0,
    returnSlotId: '',
  })
  // Same idempotency rule as the create flow: reuse only after an unknown result.
  const saveOperation = useRef<string | null>(null)
  const cancelOperation = useRef<string | null>(null)

  const view = buildView(period, reservation, announcement, actionError, isTester)

  // The stored selection, re-derived from the stored instants (see `slotAt`).
  const savedRentSlotId = reservation ? (slotAt(rentSlots, reservation.rentAt)?.slotId ?? '') : ''
  const savedReturnSlotId = reservation ? (slotAt(returnSlots, reservation.returnAt)?.slotId ?? '') : ''

  const beginEdit = () => {
    if (!reservation) return
    setDraft({
      applicant: applicantOf(reservation),
      size: reservation.size ?? '',
      rentDayIndex: dayIndexForSlot(rentDays, savedRentSlotId),
      rentSlotId: savedRentSlotId,
      returnDayIndex: dayIndexForSlot(returnDays, savedReturnSlotId),
      returnSlotId: savedReturnSlotId,
    })
    saveOperation.current = null
    setEditError('')
    setApplicantErrors({})
    setActionError('')
    setEditing(true)
    setAnnouncement('예약 변경 입력 화면이 열렸습니다.')
  }

  const touch = () => {
    // Any change to the draft is a new intent and needs a new operation id.
    saveOperation.current = null
    setEditError('')
  }

  const changeRentDay = (index: number) => {
    touch()
    setDraft((current) => {
      const rentDate = rentDays[index]?.date
      const firstEligibleDay = rentDate ? returnDays.findIndex((day) => day.date >= rentDate) : -1
      // A return on a day before the new pickup day goes; otherwise it stays, and
      // the new pickup time clears it only if it would then come first.
      const moves = firstEligibleDay >= 0 && current.returnDayIndex < firstEligibleDay
      return {
        ...current,
        rentDayIndex: index,
        rentSlotId: '',
        returnDayIndex: moves ? firstEligibleDay : current.returnDayIndex,
        returnSlotId: moves ? '' : current.returnSlotId,
      }
    })
  }

  const selectRentSlot = (id: string) => {
    touch()
    setDraft((current) => {
      const nextSlot = rentSlots.find((slot) => slot.slotId === id)
      const selectedReturn = returnSlots.find((slot) => slot.slotId === current.returnSlotId)
      const returnIsTooEarly = Boolean(
        nextSlot && selectedReturn && new Date(selectedReturn.startsAt) < new Date(nextSlot.startsAt),
      )
      return { ...current, rentSlotId: id, returnSlotId: returnIsTooEarly ? '' : current.returnSlotId }
    })
  }

  const changeReturnDay = (index: number) => {
    touch()
    setDraft((current) => ({ ...current, returnDayIndex: index, returnSlotId: '' }))
  }

  const changeApplicant = <K extends keyof ReservationApplicant>(key: K, value: ReservationApplicant[K]) => {
    touch()
    setDraft((current) => ({ ...current, applicant: { ...current.applicant, [key]: value } }))
    setApplicantErrors((current) => {
      // Unticking the proxy box takes its two fields, and their errors, away.
      const cleared = key === 'isProxy' && !value ? ['proxyName', 'proxyPhone'] : [key]
      if (!cleared.some((field) => field in current)) return current
      const next = { ...current }
      for (const field of cleared) delete next[field as keyof ApplicantInputErrors]
      return next
    })
  }

  const hasChanges = Boolean(
    reservation &&
      (applicantChanged(draft.applicant, applicantOf(reservation)) ||
        draft.size !== (reservation.size ?? '') ||
        draft.rentSlotId !== savedRentSlotId ||
        draft.returnSlotId !== savedReturnSlotId),
  )

  const saveEdit = async () => {
    if (!reservation || isSaving) return
    const selectedRent = rentSlots.find((slot) => slot.slotId === draft.rentSlotId)
    const selectedReturn = returnSlots.find((slot) => slot.slotId === draft.returnSlotId)

    const errors = validateReservationApplicant(draft.applicant)
    setApplicantErrors(errors)
    if (Object.keys(errors).length > 0) return setEditError('신청자 정보를 확인해 주세요.')
    if (!draft.size) return setEditError('학위복 사이즈를 선택해 주세요.')
    if (!selectedRent) return setEditError('수령 시간을 선택해 주세요.')
    if (!selectedReturn) return setEditError('반납 시간을 선택해 주세요.')
    if (new Date(selectedReturn.startsAt) < new Date(selectedRent.startsAt)) {
      return setEditError('반납 시간은 수령 시간과 같거나 그 뒤여야 해요.')
    }

    saveOperation.current ??= newOperationId()
    setSaving(true)
    setEditError('')
    try {
      await updateReservation(
        reservation,
        {
          ...draft.applicant,
          size: draft.size,
          rentSlot: selectedRent,
          returnSlot: selectedReturn,
        },
        saveOperation.current,
      )
      saveOperation.current = null
      setEditing(false)
      setAnnouncement('예약 변경이 저장되었습니다.')
    } catch (error) {
      const { message, keepOperation } = describe(error)
      if (!keepOperation) saveOperation.current = null
      setEditError(message)
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditError('')
    setAnnouncement('예약 변경을 취소했습니다.')
  }

  const editor: MyReservationEditorController = {
    isOpen: isEditing && view.editable,
    applicant: draft.applicant,
    onApplicantChange: {
      name: (value) => changeApplicant('name', value),
      studentId: (value) => changeApplicant('studentId', value),
      department: (value) => changeApplicant('department', value),
      phone: (value) => changeApplicant('phone', value),
      isProxy: (value) => changeApplicant('isProxy', value),
      proxyName: (value) => changeApplicant('proxyName', value),
      proxyPhone: (value) => changeApplicant('proxyPhone', value),
    },
    applicantErrors,
    size: draft.size,
    onSizeChange: (size) => {
      touch()
      setDraft((current) => ({ ...current, size }))
    },
    rentDays,
    rentDayIndex: draft.rentDayIndex,
    onRentDayChange: changeRentDay,
    rentSlotId: draft.rentSlotId,
    onRentSlotChange: selectRentSlot,
    returnDays,
    returnDayIndex: draft.returnDayIndex,
    onReturnDayChange: changeReturnDay,
    returnSlotId: draft.returnSlotId,
    onReturnSlotChange: (id) => {
      touch()
      setDraft((current) => ({ ...current, returnSlotId: id }))
    },
    hasChanges,
    isSaving,
    error: editError,
    onSave: () => void saveEdit(),
    onCancel: cancelEdit,
  }

  const openReservation = () => navigate(PATHS.public.reservation)

  /** Resolves true when the reservation is cancelled, so the dialog can close. */
  const cancelCurrent = async (): Promise<boolean> => {
    if (!reservation || isCancelling) return false
    cancelOperation.current ??= newOperationId()
    setCancelling(true)
    setActionError('')
    try {
      await cancelReservation(reservation, cancelOperation.current)
      cancelOperation.current = null
      setEditing(false)
      setAnnouncement('학위복 예약이 취소되었습니다.')
      return true
    } catch (error) {
      const { message, keepOperation } = describe(error)
      if (!keepOperation) cancelOperation.current = null
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
    openReservation,
    cancelReservation: cancelCurrent,
    isCancelling,
  }
}
