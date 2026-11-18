import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { PATHS } from '../../../app/routes/paths'
import { SiteTitleBar } from '../../../app/layouts/SiteTitleBar'
import { useAuth } from '../../../shared/auth/useAuth'
import { MENTORING_TERMS } from '../../../shared/content/terms'
import { describeCommandError } from '../../../shared/firebase/command'
import { OFFLINE_MESSAGE, useOnline } from '../../../shared/hooks/useOnline'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { LoadErrorState, LoadingState } from '../../../shared/ui/LoadState'
import { ServiceTitleBar } from '../../../shared/ui/ServiceTitleBar'
import { ConfirmStep, type ConfirmRow } from '../../../shared/ui/flow/ConfirmStep'
import { FlowActions } from '../../../shared/ui/flow/FlowActions'
import { FlowBottomBar } from '../../../shared/ui/flow/FlowBottomBar'
import { FlowBody, FlowShell } from '../../../shared/ui/flow/FlowShell'
import { emptyAgreement, isAgreementComplete, type TermsAgreement } from '../../../shared/ui/flow/agreement'
import { useMyReservations } from '../../reservation/useReservation'
import { ClosedMentoringNotice } from '../components/ClosedMentoringNotice'
import { EpicFolioNotice } from '../components/EpicFolioNotice'
import { MentoringApplicantStep } from '../components/MentoringApplicantStep'
import { validateMentoringApplicant, type MentoringApplicantErrors } from '../applicant'
import { MentoringResult } from '../components/MentoringResult'
import { MentoringTermsStep } from '../components/MentoringTermsStep'
import { SessionStep } from '../components/SessionStep'
import { EMPTY_SELECTION, selectionError, type SessionSelection } from '../selection'
import { applyDeadlineLabel, eventDateLabel, sessionLabel } from '../eventInfo'
import { FLOW_NAME, FLOW_STEPS, LAST_STEP } from '../flowSteps'
import { describeOption } from '../mentoringData'
import { createRegistration, newOperationId } from '../mentoringCommands'
import { mentoringAvailability, useMentoringTester, useMyRegistrations } from '../useMentoring'


/**
 * Immersive St:talk apply flow (MNT-10~14). Same chrome and rules as the
 * reservation flow: the global shell is replaced by the flow's own header
 * (the route sits outside PublicLayout), progress stays pinned, and each
 * step keeps its back/next beside the important context.
 */
export function MentoringApplyPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { event, current, latest, status: mineStatus, retry } = useMyRegistrations()
  const { isTester, status: testerStatus } = useMentoringTester()
  // The current gown reservation is the other place the student has already
  // typed their name, id and phone (MNT-11).
  const { current: reservation, status: reservationStatus } = useMyReservations()
  const existing = current?.status === 'reserved' ? current : null
  const avail = mentoringAvailability(event, undefined, isTester)

  const [step, setStep] = useState(0)
  const [agreement, setAgreement] = useState<TermsAgreement>(() => emptyAgreement(MENTORING_TERMS))
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [department, setDepartment] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [phone, setPhone] = useState('')
  const [applicantErrors, setApplicantErrors] = useState<MentoringApplicantErrors>({})
  const [selection, setSelection] = useState<SessionSelection>(EMPTY_SELECTION)
  const [stepError, setStepError] = useState('')
  // The id of the registration this visit created, once the server said so
  // (or once the subscription showed it — see below). Null until then.
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const submitted = submittedId !== null
  const [isSubmitting, setSubmitting] = useState(false)
  const [isPrefilled, setPrefilled] = useState(false)
  const isOnline = useOnline()
  // One id per submission intent. Kept across a retry after an unknown result
  // so the server can replay instead of double-booking; dropped as soon as the
  // student goes back to change anything. Mirrored in state so the render can
  // recognise its own registration arriving through the subscription.
  const operationIdRef = useRef<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  // The answer that may never arrive: a request whose response was lost
  // (`unknown`) still lands in the student's own subscription. The document
  // carrying this attempt's id is this attempt's success.
  const confirmedId = current?.status === 'reserved' && current.registrationId === pendingId ? current.registrationId : null
  useEffect(() => {
    if (!confirmedId || submittedId) return
    operationIdRef.current = null
    setPendingId(null)
    setStepError('')
    setSubmittedId(confirmedId)
  }, [confirmedId, submittedId])
  const stored = submittedId && current?.registrationId === submittedId ? current : null

  const isLoading =
    mineStatus === 'loading' || testerStatus === 'loading' || (Boolean(user) && reservationStatus === 'loading')
  const isLoadError = mineStatus === 'error'
  const isGated = !submitted && Boolean(avail !== 'open' || !user)

  // Pre-fill once, from whichever earlier form is newer: the latest St:talk
  // registration (which also knows the grade) or the current gown reservation.
  const prefillDone = useRef(false)
  useEffect(() => {
    if (prefillDone.current || isLoading) return
    prefillDone.current = true
    const fromMentoring = latest
    const fromReservation = reservation
    const source =
      fromMentoring && fromReservation
        ? fromMentoring.modifiedAt >= fromReservation.modifiedAt
          ? fromMentoring
          : fromReservation
        : (fromMentoring ?? fromReservation)
    if (!source) return
    setName(source.name)
    setStudentId(source.studentId)
    setDepartment(source.department)
    setPhone(source.phone)
    if (fromMentoring?.grade) setGrade(fromMentoring.grade)
    setPrefilled(true)
  }, [isLoading, latest, reservation])

  // A student who already holds a registration gets the page as usual with a
  // modal on top that only leads out. A successful submit makes the new
  // registration show up here too, so the result screen keeps precedence.
  const existingDialog = (
    <ConfirmationDialog
      isOpen={Boolean(existing) && !submitted && !confirmedId}
      onOpenChange={() => {}}
      title="이미 신청했어요"
      description="St:talk 신청은 한 번만 할 수 있어요. 변경이나 취소는 내 신청에서 할 수 있어요."
      actionLabel="내 신청 보기"
      cancelLabel="홈으로"
      purpose="required"
      onCancel={() => navigate(PATHS.home, { replace: true })}
      onAction={() => navigate(PATHS.me.mentoring, { replace: true })}
    />
  )

  const hasDraft =
    !isLoading && !isLoadError && Boolean(event) && !isGated && !submitted &&
    (step > 0 || Object.values(agreement).some(Boolean))
  const leaveGuard = useBlocker(
    ({ currentLocation, nextLocation }) => hasDraft && currentLocation.pathname !== nextLocation.pathname,
  )
  const exit = () => navigate(PATHS.public.mentoring)

  // --- Gates ------------------------------------------------------------
  if (isLoading) {
    return (
      <FlowShell>
        <ServiceTitleBar variant="flow" onExit={exit} />
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <LoadingState label="St:talk 정보를 확인하고 있어요" onRetry={retry} />
        </div>
      </FlowShell>
    )
  }
  if (isLoadError) {
    return (
      <FlowShell>
        <SiteTitleBar />
        <FlowBody>
          <LoadErrorState title="St:talk 정보를 불러오지 못했어요" onRetry={retry} />
        </FlowBody>
      </FlowShell>
    )
  }
  if (!event || isGated) {
    return (
      <FlowShell>
        <SiteTitleBar />
        <FlowBody>
          <ClosedMentoringNotice availability={avail === 'open' ? 'none' : avail} event={event} showMine={Boolean(user)} />
        </FlowBody>
        {existingDialog}
      </FlowShell>
    )
  }

  if (submitted) {
    return (
      <FlowShell>
        <SiteTitleBar />
        <FlowBody>
          <MentoringResult
            event={event}
            selection={selection}
            applicant={{ name, studentId, department, grade, phone }}
            stored={stored}
          />
        </FlowBody>
      </FlowShell>
    )
  }

  // Each document is agreed to on the step itself (ConsentList); 다음 waits for
  // every required one.
  const allRequiredAgreed = isAgreementComplete(MENTORING_TERMS, agreement)

  // --- Step gating ------------------------------------------------------
  const goNext = () => {
    setStepError('')

    if (step === 0 && !allRequiredAgreed) {
      return setStepError('필수 약관에 모두 동의해 주세요.')
    }
    if (step === 1) {
      const errors = validateMentoringApplicant({ name, studentId, department, grade, phone })
      setApplicantErrors(errors)
      if (Object.keys(errors).length > 0) return
    }
    if (step === 2) {
      const error = selectionError(selection)
      if (error) return setStepError(error)
    }
    if (step === LAST_STEP) return void submit()

    setStep((s) => Math.min(s + 1, LAST_STEP))
  }

  const submit = async () => {
    // Step 3 already refused a half-made selection; the checks here only narrow the types.
    if (isSubmitting || !grade || selection.firstOption === null || selection.secondOption === null) return
    // The browser knows there is no network: say so instead of sending a
    // request that can only end as "unknown".
    if (!isOnline) return setStepError(OFFLINE_MESSAGE)
    operationIdRef.current ??= newOperationId()
    setPendingId(operationIdRef.current)
    setSubmitting(true)
    try {
      const result = await createRegistration(
        {
          name,
          studentId,
          department,
          grade,
          phone,
          firstOption: selection.firstOption,
          secondOption: selection.secondOption,
        },
        operationIdRef.current,
      )
      operationIdRef.current = null
      setPendingId(null)
      setSubmittedId(result.registrationId)
    } catch (error) {
      const { message, keepOperation } = describeCommandError(
        error,
        '신청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      )
      if (!keepOperation) {
        operationIdRef.current = null
        setPendingId(null)
      }
      setStepError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const goToStep = (target: number) => {
    operationIdRef.current = null
    setPendingId(null)
    setStepError('')
    setStep(target)
  }

  const goBack = () => (step === 0 ? exit() : goToStep(step - 1))

  const clearApplicantError = (key: keyof MentoringApplicantErrors) => {
    if (!applicantErrors[key]) return
    setApplicantErrors((current) => ({ ...current, [key]: undefined }))
  }

  const [first, second] = event.sessions
  const confirmRows: ConfirmRow[] = [
    {
      label: '신청자',
      value: [name, studentId, department, grade ? `${grade}학년` : ''].filter(Boolean).join(' · '),
      editStep: 1,
    },
    { label: '연락처', value: phone, editStep: 1 },
    ...(first
      ? [{ label: sessionLabel(first), value: describeOption(event, selection.firstOption).label, editStep: 2 }]
      : []),
    ...(second
      ? [{ label: sessionLabel(second), value: describeOption(event, selection.secondOption).label, editStep: 2 }]
      : []),
    { label: '일시', value: eventDateLabel(event) || '일시 추후 안내', note: event.location ? `· ${event.location}` : undefined },
    ...(event.location ? [{ label: '장소', value: event.location, phoneOnly: true }] : []),
  ]

  const deadline = applyDeadlineLabel(event)

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
        nextLabel={step === LAST_STEP ? '신청 확정' : '다음'}
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
        <MentoringTermsStep
          event={event}
          consent={{ documents: MENTORING_TERMS, agreement, onChange: setAgreement }}
          onExit={goBack}
          next={{ onNext: goNext, isDisabled: !allRequiredAgreed }}
          actions={
            <FlowActions
              backLabel="안내로"
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
            <MentoringApplicantStep
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
              grade={grade}
              onGradeChange={(value) => {
                setGrade(value)
                clearApplicantError('grade')
              }}
              phone={phone}
              onPhoneChange={(value) => {
                setPhone(value)
                clearApplicantError('phone')
              }}
              errors={applicantErrors}
              isPrefilled={isPrefilled}
              actions={stepActions}
              onBack={goBack}
              onExit={exit}
            />
          )}

          {step === 2 && (
            <SessionStep
              event={event}
              value={selection}
              onChange={(next) => {
                setStepError('')
                setSelection(next)
              }}
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
              title="신청 내용을 확인해 주세요"
              sectionTitle="신청 내용"
              sectionLead="잘못된 내용은 수정한 뒤 신청을 확정해 주세요"
              rows={confirmRows}
              onEdit={goToStep}
              consequencesTitle="신청 확정 후 안내"
              consequences={[
                {
                  emphasis: '당일 행사 장소로',
                  detail: `${eventDateLabel(event) || '행사 당일'} 신청한 차시에 ${event.location || '행사 장소'}로 와 주세요. 시작 5분 전 도착을 권해요.`,
                  brief: '차시 시작 5분 전 도착을 권해요',
                },
                {
                  emphasis: '변경·취소',
                  detail: deadline ? `${deadline}까지 내 신청에서 바꾸거나 취소할 수 있어요.` : '신청 기간 안에 내 신청에서 바꾸거나 취소할 수 있어요.',
                  brief: deadline ? `${deadline}까지 내 신청에서` : '신청 기간 안에 내 신청에서',
                },
                {
                  emphasis: '확인 메일 없음',
                  detail: '신청 내용은 내 신청에서 언제든 다시 볼 수 있어요.',
                  brief: '내 신청에서 다시 볼 수 있어요',
                },
              ]}
              aside={
                <>
                  <div className="desk:hidden">
                    <EpicFolioNotice event={event} compact tone="plain" />
                  </div>
                  <div className="hidden desk:block">
                    <EpicFolioNotice event={event} compact />
                  </div>
                </>
              }
              actions={stepActions}
              onBack={goBack}
              onExit={exit}
              groupTitles={{ '1': '신청자 정보', '2': '차시 선택', none: '행사' }}
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
              label={step === LAST_STEP ? '신청 확정' : '다음'}
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
        title="작성 중인 신청을 그만둘까요?"
        description="지금 나가면 입력한 신청 정보와 고른 내용이 모두 사라져요."
        actionLabel="나가기"
        cancelLabel="계속 작성"
        actionVariant="destructive"
        onAction={() => leaveGuard.proceed?.()}
      />
      {existingDialog}
    </FlowShell>
  )
}
