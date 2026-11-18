import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { useAuth } from '../../../shared/auth/useAuth'
import { formatClock, formatMonthDayWeekday } from '../../../shared/lib/datetime'
import { PATHS } from '../../../app/routes/paths'
import { SiteTitleBar } from '../../../app/layouts/SiteTitleBar'
import type { GownSize } from '../../../shared/types'
import { FLOW_NAME, FLOW_STEPS, LAST_STEP } from '../flowSteps'
import { RESERVATION_TERMS } from '../../../shared/content/terms'
import { ServiceTitleBar } from '../../../shared/ui/ServiceTitleBar'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { FlowBody, FlowShell } from '../../../shared/ui/flow/FlowShell'
import { FlowActions } from '../../../shared/ui/flow/FlowActions'
import { FlowBottomBar } from '../../../shared/ui/flow/FlowBottomBar'
import { ConfirmStep, type ConfirmRow } from '../../../shared/ui/flow/ConfirmStep'
import { emptyAgreement, isAgreementComplete, type TermsAgreement } from '../agreement'
import { TermsStep } from '../components/TermsStep'
import { ReservationDone } from '../components/ReservationDone'
import { useMyRegistrations } from '../../mentoring/useMentoring'
import { ApplicantStep } from '../components/ApplicantStep'
import { validateReservationApplicant, type ApplicantInputErrors } from '../applicant'
import { ScheduleStep } from '../components/ScheduleStep'
import { ClosedReservationNotice } from '../components/ClosedReservationNotice'
import { LoadErrorState, LoadingState } from '../../../shared/ui/LoadState'
import {
  createReservation,
  newOperationId,
  ReservationCommandError,
} from '../reservationCommands'
import {
  useActivePeriod,
  useMyReservations,
  useReservationTester,
  reservationAvailability,
  scheduleDays,
  scheduleLabel,
} from '../useReservation'

const PICKUP_LOCATION = '제1학생회관 3층 320호'
// Any prefix is fine as long as the length fits it; only 010 must be 11 digits.

/**
 * Immersive reservation flow. The global shell is replaced by this screen's own
 * header (see the router: this route sits outside PublicLayout), so nothing
 * invites the student out of a half-finished form. Progress remains pinned,
 * while each step keeps its back/next controls beside the important context.
 */
export function ReservationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { period, status: periodStatus, retry: retryPeriod } = useActivePeriod()
  const { current, reservations, status: mineStatus, retry: retryMine } = useMyReservations()
  // The other place the student has typed their name, id and phone: a St:talk
  // registration (any event).
  const { latest: lastRegistration, status: registrationStatus } = useMyRegistrations()
  const { isTester, status: testerStatus } = useReservationTester()
  const existing = current?.status === 'reserved' ? current : null
  const avail = reservationAvailability(period, undefined, isTester)
  const rentDays = scheduleDays(period?.rentSlots ?? [])
  const returnDays = scheduleDays(period?.returnSlots ?? [])

  const [step, setStep] = useState(0)
  const [agreement, setAgreement] = useState<TermsAgreement>(emptyAgreement)
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [department, setDepartment] = useState('')
  const [phone, setPhone] = useState('')
  const [isProxy, setIsProxy] = useState(false)
  const [proxyName, setProxyName] = useState('')
  const [proxyPhone, setProxyPhone] = useState('')
  const [applicantErrors, setApplicantErrors] = useState<ApplicantInputErrors>({})
  const [size, setSize] = useState<GownSize | ''>('')
  const [rentDayIndex, setRentDayIndex] = useState(0)
  const [rentSlotId, setRentSlotId] = useState('')
  const [returnDayIndex, setReturnDayIndex] = useState(0)
  const [returnSlotId, setReturnSlotId] = useState('')
  const [stepError, setStepError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setSubmitting] = useState(false)
  const [isPrefilled, setPrefilled] = useState(false)
  // One id per submission intent. Kept across a retry after an unknown result
  // so the server can replay instead of double-booking; dropped as soon as the
  // student goes back to change anything.
  const operationIdRef = useRef<string | null>(null)

  const isLoading = periodStatus === 'loading' || mineStatus === 'loading' || testerStatus === 'loading'

  // Pre-fill once, from whichever earlier form is newer: a reservation in this
  // round (a cancelled one counts — it is why they are back) or the latest
  // St:talk registration. Only the four details; never the proxy.
  const prefillDone = useRef(false)
  useEffect(() => {
    if (prefillDone.current || isLoading || registrationStatus === 'loading') return
    prefillDone.current = true
    const fromReservation = reservations[0] ?? null
    const source =
      fromReservation && lastRegistration
        ? fromReservation.modifiedAt >= lastRegistration.modifiedAt
          ? fromReservation
          : lastRegistration
        : (fromReservation ?? lastRegistration)
    if (!source) return
    setName(source.name)
    setStudentId(source.studentId)
    setDepartment(source.department)
    setPhone(source.phone)
    setPrefilled(true)
  }, [isLoading, registrationStatus, reservations, lastRegistration])
  const isLoadError = periodStatus === 'error' || mineStatus === 'error'
  const isGated = !submitted && Boolean(avail !== 'open' || !user)
  // A student who already holds a booking gets the page as usual with a modal
  // on top that only leads out. A successful submit makes the new booking show
  // up here too, so the confirmation dialog keeps precedence over this one.
  const existingDialog = (
    <ConfirmationDialog
      isOpen={Boolean(existing) && !submitted}
      onOpenChange={() => {}}
      title="이미 예약했어요"
      description="예약은 한 번만 할 수 있어요. 변경이나 취소는 내 신청에서 할 수 있어요."
      actionLabel="내 신청 보기"
      cancelLabel="홈으로"
      purpose="required"
      onCancel={() => navigate(PATHS.home, { replace: true })}
      onAction={() => navigate(PATHS.me.reservations, { replace: true })}
    />
  )
  // Something on the form that leaving would throw away. Only the form can
  // hold a draft: if a notice replaced it (the round closed meanwhile), the
  // guard must not trap the student with no dialog on screen.
  const hasDraft =
    !isLoading && !isLoadError && Boolean(period) && !isGated && !submitted &&
    (step > 0 || Object.values(agreement).some(Boolean))
  // Every way out — the browser or phone back gesture, the title bar's 홈으로,
  // step 1's 홈으로 — is a router navigation, so one blocker guards them all.
  const leaveGuard = useBlocker(
    ({ currentLocation, nextLocation }) => hasDraft && currentLocation.pathname !== nextLocation.pathname,
  )
  const exit = () => navigate(PATHS.home)

  // --- Gates ------------------------------------------------------------
  // Loading keeps the flow bar: it usually resolves into the form, so the bar
  // should not swap under the student. Every other gate is a notice rather than
  // the form, so it carries the site header and its ways out.
  if (isLoading) {
    return (
      <FlowShell>
        <ServiceTitleBar variant="flow" onExit={exit} />
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <LoadingState label="예약 정보를 확인하고 있어요" />
        </div>
      </FlowShell>
    )
  }
  if (isLoadError) {
    return (
      <FlowShell>
        <SiteTitleBar />
        <FlowBody>
          <LoadErrorState
            title="예약 정보를 불러오지 못했어요"
            onRetry={() => {
              retryPeriod()
              retryMine()
            }}
          />
        </FlowBody>
      </FlowShell>
    )
  }
  if (!period || isGated) {
    return (
      <FlowShell>
        <SiteTitleBar />
        {avail === 'ended' ? (
          <ClosedReservationNotice availability="ended" period={period} />
        ) : (
          <FlowBody>
            <ClosedReservationNotice availability={avail === 'open' ? 'none' : avail} period={period} />
          </FlowBody>
        )}
        {existingDialog}
      </FlowShell>
    )
  }

  // Each document is agreed to on the step itself (ConsentList); 다음 waits for
  // every required one.
  const allRequiredAgreed = isAgreementComplete(agreement)

  const selectedRentDay = rentDays[rentDayIndex]
  const selectedRentSlot = selectedRentDay?.slots.find((s) => s.slotId === rentSlotId)
  const selectedReturnDay = returnDays[returnDayIndex]
  const selectedReturnSlot = selectedReturnDay?.slots.find((s) => s.slotId === returnSlotId)
  const rentLabel = scheduleLabel(selectedRentDay, selectedRentSlot)
  // When 내 신청 stops taking changes: the later of the edit and apply windows.
  const changeEnd = [period.editEndAt, period.applyEndAt].filter(Boolean).sort().at(-1) ?? ''
  const changeDeadline = changeEnd ? `${formatMonthDayWeekday(changeEnd)} ${formatClock(changeEnd)}` : ''
  const returnLabel = scheduleLabel(selectedReturnDay, selectedReturnSlot)

  const selectRentSlot = (id: string) => {
    const nextSlot = period.rentSlots.find((slot) => slot.slotId === id)
    setRentSlotId(id)
    if (!nextSlot) return

    if (selectedReturnSlot && new Date(selectedReturnSlot.startsAt) < new Date(nextSlot.startsAt)) {
      setReturnSlotId('')
    }

    const firstEligibleDay = returnDays.findIndex((day) => day.date >= nextSlot.startsAt.slice(0, 10))
    if (firstEligibleDay >= 0 && returnDayIndex < firstEligibleDay) {
      setReturnDayIndex(firstEligibleDay)
    }
  }

  // The receipt replaces the form once the server has saved the booking.
  if (submitted) {
    return (
      <FlowShell>
        <SiteTitleBar />
        <FlowBody>
          <ReservationDone
            size={size}
            rentLabel={rentLabel}
            returnLabel={returnLabel}
            rentSlot={selectedRentSlot}
            returnSlot={selectedReturnSlot}
            location={PICKUP_LOCATION}
            changeDeadline={changeDeadline}
            onHome={() => navigate(PATHS.home, { replace: true })}
            onOpenMine={() => navigate(PATHS.me.reservations, { replace: true })}
          />
        </FlowBody>
      </FlowShell>
    )
  }

  // --- Step gating ------------------------------------------------------
  const goNext = () => {
    setStepError('')

    if (step === 0 && !isAgreementComplete(agreement)) {
      return setStepError('필수 약관에 모두 동의해 주세요.')
    }
    if (step === 1) {
      const errors = validateReservationApplicant({ name, studentId, department, phone, isProxy, proxyName, proxyPhone })
      setApplicantErrors(errors)
      if (Object.keys(errors).length > 0) return
    }
    if (step === 2) {
      if (!size) return setStepError('사이즈를 선택해 주세요.')
      if (!rentSlotId) return setStepError('수령 시간을 선택해 주세요.')
      if (!returnSlotId) return setStepError('반납 시간을 선택해 주세요.')
      if (
        selectedRentSlot &&
        selectedReturnSlot &&
        new Date(selectedReturnSlot.startsAt) < new Date(selectedRentSlot.startsAt)
      ) {
        return setStepError('반납 시간은 수령 시간과 같거나 그 뒤여야 해요.')
      }
    }
    if (step === LAST_STEP) return void submit()

    setStep((s) => Math.min(s + 1, LAST_STEP))
  }

  const submit = async () => {
    if (isSubmitting || !size || !selectedRentSlot || !selectedReturnSlot) return
    operationIdRef.current ??= newOperationId()
    setSubmitting(true)
    try {
      await createReservation(
        {
          name,
          studentId,
          department,
          phone,
          size,
          rentSlot: selectedRentSlot,
          returnSlot: selectedReturnSlot,
          isProxy,
          proxyName,
          proxyPhone,
        },
        operationIdRef.current,
      )
      operationIdRef.current = null
      setSubmitted(true)
    } catch (error) {
      const failure =
        error instanceof ReservationCommandError
          ? error
          : new ReservationCommandError(
              'unknown',
              'client',
              '예약을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
              operationIdRef.current ?? '',
            )
      if (failure.kind !== 'unknown') operationIdRef.current = null
      setStepError(
        failure.kind === 'failed' ? `${failure.message} (요청 ID ${failure.operationId})` : failure.message,
      )
    } finally {
      setSubmitting(false)
    }
  }

  const goToStep = (target: number) => {
    operationIdRef.current = null
    setStepError('')
    setStep(target)
  }

  const goBack = () => (step === 0 ? exit() : goToStep(step - 1))

  const confirmRows: ConfirmRow[] = [
    { label: '예약자', value: `${name} · ${studentId}`, editStep: 1 },
    { label: '학과', value: department, editStep: 1 },
    { label: '연락처', value: phone, editStep: 1 },
    ...(isProxy
      ? [{ label: '대리 수령자', value: `${proxyName} · ${proxyPhone}`, editStep: 1 }]
      : []),
    { label: '사이즈', value: `${size} (학사모 포함)`, editStep: 2 },
    { label: '수령 시간', value: rentLabel, note: `· ${PICKUP_LOCATION}`, editStep: 2 },
    { label: '반납 시간', value: returnLabel, editStep: 2 },
    { label: '장소', value: PICKUP_LOCATION, editStep: 2, phoneOnly: true },
  ]

  const clearApplicantError = (key: keyof ApplicantInputErrors) => {
    if (!applicantErrors[key]) return
    setApplicantErrors((current) => ({ ...current, [key]: undefined }))
  }

  // Wide screens keep the back/next pair beside the step; a phone gets the
  // bottom bar below and FlowTitle's ‹ 이전 / ✕.
  const stepActions = (
    <div className="hidden flex-col gap-2 desk:flex">
      {stepError && (
        <Text type="supporting" color="accent" role="alert">
          {stepError}
        </Text>
      )}
      <FlowActions
        backLabel="이전"
        onBack={goBack}
        nextLabel={step === LAST_STEP ? '예약 확정' : '다음'}
        onNext={goNext}
        isNextLoading={isSubmitting}
        isContained
      />
    </div>
  )

  return (
    <FlowShell>
      <ServiceTitleBar
        variant="flow"
        progress={{ step: step + 1, totalSteps: LAST_STEP + 1, stepName: FLOW_STEPS[step].nav }}
        onExit={exit}
      />

      {step === 0 ? (
        <TermsStep
          consent={{ documents: RESERVATION_TERMS, agreement, onChange: setAgreement }}
          onExit={exit}
          next={{ onNext: goNext, isDisabled: !allRequiredAgreed }}
          editDeadline={changeEnd || undefined}
          actions={
            <FlowActions
              backLabel="홈으로"
              onBack={goBack}
              nextLabel="다음"
              onNext={goNext}
              isNextDisabled={!allRequiredAgreed}
              isContained
            />
          }
        />
      ) : (
        <FlowBody wide>
          {step === 1 && (
            <ApplicantStep
              name={name}
              onNameChange={(value) => {
                setName(value)
                clearApplicantError('name')
              }}
              studentId={studentId}
              onStudentIdChange={(value) => {
                setStudentId(value)
                clearApplicantError('studentId')
              }}
              department={department}
              onDepartmentChange={(value) => {
                setDepartment(value)
                clearApplicantError('department')
              }}
              phone={phone}
              onPhoneChange={(value) => {
                setPhone(value)
                clearApplicantError('phone')
              }}
              isProxy={isProxy}
              onProxyChange={(value) => {
                setIsProxy(value)
                if (!value) setApplicantErrors((current) => ({
                  ...current,
                  proxyName: undefined,
                  proxyPhone: undefined,
                }))
              }}
              proxyName={proxyName}
              onProxyNameChange={(value) => {
                setProxyName(value)
                clearApplicantError('proxyName')
              }}
              proxyPhone={proxyPhone}
              onProxyPhoneChange={(value) => {
                setProxyPhone(value)
                clearApplicantError('proxyPhone')
              }}
              errors={applicantErrors}
              isPrefilled={isPrefilled}
              actions={stepActions}
              onBack={goBack}
              onExit={exit}
            />
          )}

          {step === 2 && (
            <ScheduleStep
              size={size}
              onSizeChange={setSize}
              rentDays={rentDays}
              rentDayIndex={rentDayIndex}
              onRentDayChange={(i) => {
                // The return stays unless it is on an earlier day; on the same
                // day, choosing the new pickup time clears it only if it would
                // then come first (selectRentSlot).
                setRentDayIndex(i)
                setRentSlotId('')

                const rentDate = rentDays[i]?.date
                if (rentDate) {
                  const firstEligibleDay = returnDays.findIndex((day) => day.date >= rentDate)
                  if (firstEligibleDay >= 0 && returnDayIndex < firstEligibleDay) {
                    // A return on an earlier day than the new pickup day goes.
                    setReturnDayIndex(firstEligibleDay)
                    setReturnSlotId('')
                  }
                }
              }}
              rentSlotId={rentSlotId}
              onRentSlotChange={selectRentSlot}
              returnDays={returnDays}
              returnDayIndex={returnDayIndex}
              onReturnDayChange={(i) => {
                setReturnDayIndex(i)
                setReturnSlotId('')
              }}
              returnSlotId={returnSlotId}
              onReturnSlotChange={setReturnSlotId}
              location={PICKUP_LOCATION}
              actions={stepActions}
              onBack={goBack}
              onExit={exit}
            />
          )}

          {step === LAST_STEP && (
            <ConfirmStep
              flowName={FLOW_NAME}
              step={4}
              totalSteps={FLOW_STEPS.length}
              stepName={FLOW_STEPS[LAST_STEP].nav}
              title="예약 내용을 확인해 주세요"
              sectionTitle="예약 내용"
              sectionLead="잘못된 내용은 수정한 뒤 예약을 확정해 주세요"
              rows={confirmRows}
              onEdit={goToStep}
              consequencesTitle="예약 확정 후 안내"
              consequences={[
                {
                  emphasis: '가져올 것',
                  detail: '실물 학생증을 가져와요. 없으면 실물 신분증과 모바일 학생증(또는 재학증명서)을 함께 가져와요.',
                  brief: '실물 학생증 (없으면 실물 신분증 + 모바일 학생증)',
                },
                {
                  emphasis: '예약한 시간에',
                  detail: '수령도 반납도 예약한 시간에 와 주세요.',
                  brief: '수령·반납 모두 예약한 시간에 와요',
                },
                {
                  emphasis: '변경·취소',
                  detail: changeDeadline ? `${changeDeadline}까지 내 신청에서 바꾸거나 취소할 수 있어요.` : '수정 기간 안에 내 신청에서 바꾸거나 취소할 수 있어요.',
                  brief: changeDeadline ? `${changeDeadline}까지 내 신청에서 할 수 있어요` : '수정 기간 안에 내 신청에서 할 수 있어요',
                },
              ]}
              actions={stepActions}
              onBack={goBack}
              onExit={exit}
              groupTitles={{ '1': '신청자 정보', '2': '사이즈·시간' }}
            />
          )}
        </FlowBody>
      )}

      {step > 0 && (
        <div className="flex-none desk:hidden">
          <FlowBottomBar>
            {stepError && (
              <Text type="supporting" color="accent" role="alert">
                {stepError}
              </Text>
            )}
            <Button
              label={step === LAST_STEP ? '예약 확정' : '다음'}
              variant="primary"
              size="lg"
              width="100%"
              onClick={goNext}
              isLoading={isSubmitting}
            />
          </FlowBottomBar>
        </div>
      )}


      <ConfirmationDialog
        isOpen={leaveGuard.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open) leaveGuard.reset?.()
        }}
        title="작성 중인 예약을 그만둘까요?"
        description="지금 나가면 입력한 예약 정보와 고른 내용이 모두 사라져요."
        actionLabel="나가기"
        cancelLabel="계속 작성"
        actionVariant="destructive"
        onAction={() => leaveGuard.proceed?.()}
      />

      {existingDialog}
    </FlowShell>
  )
}
