import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { VStack } from '@astryxdesign/core/Stack'
import { TextArea } from '@astryxdesign/core/TextArea'
import { Button } from '@astryxdesign/core/Button'
import { Banner } from '@astryxdesign/core/Banner'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { PageContainer } from '../../../shared/ui/PageContainer'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { FormSection } from '../../../shared/forms/FormSection'
import { FormActions } from '../../../shared/forms/FormActions'
import {
  ApplicantFields,
  emptyApplicant,
  type ApplicantValues,
  type ApplicantErrors,
} from '../../../shared/forms/ApplicantFields'
import { validateApplicant, hasErrors } from '../../../shared/forms/validateApplicant'
import { SubmissionResult } from '../../../shared/ui/SubmissionResult'
import { formatDateTime } from '../../../shared/lib/datetime'
import { useLecture, lectureAvailability } from '../useLectures'
import { PATHS } from '../../../app/routes/paths'

export function LectureRegisterPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lecture = useLecture(id)

  const [applicant, setApplicant] = useState<ApplicantValues>(emptyApplicant)
  const [question, setQuestion] = useState('')
  const [errors, setErrors] = useState<ApplicantErrors>({})
  const [submitted, setSubmitted] = useState(false)

  if (!lecture) {
    return (
      <PageContainer width="narrow">
        <EmptyState title="강연을 찾을 수 없어요" />
      </PageContainer>
    )
  }

  const avail = lectureAvailability(lecture)
  if (avail !== 'open') {
    return (
      <PageContainer width="narrow">
        <VStack gap={4}>
          <PageHeader title="강연 신청" back={{ href: `/lectures/${lecture.lectureId}`, label: lecture.title }} />
          <Banner
            status="warning"
            container="section"
            title={avail === 'upcoming' ? '아직 신청 기간이 아니에요' : '신청이 마감됐어요'}
            description="강연 상세에서 신청 기간을 확인해 주세요."
          />
        </VStack>
      </PageContainer>
    )
  }

  const onSubmit = () => {
    // Mock submit: validate, then show the confirmed result card. Firebase
    // save + confirmation read replaces this later.
    const e = validateApplicant(applicant, { requireMajor: true })
    setErrors(e)
    if (hasErrors(e)) return
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <PageContainer width="narrow">
        <VStack gap={4}>
          <PageHeader title="신청 완료" />
          <SubmissionResult
            title="신청이 완료됐어요"
            description="신청 내역은 내 신청 상태에서 확인할 수 있어요."
            items={[
              { label: '강연', value: lecture.title },
              { label: '일시', value: formatDateTime(lecture.startsAt) },
              { label: '장소', value: lecture.location },
              { label: '신청자', value: applicant.name },
            ]}
            actions={
              <>
                <Button label="내 신청 상태" variant="primary" onClick={() => navigate(PATHS.me.lectures)} />
                <Button label="강연 목록" variant="secondary" onClick={() => navigate(PATHS.public.lectures)} />
              </>
            }
          />
        </VStack>
      </PageContainer>
    )
  }

  return (
    <PageContainer width="narrow">
      <VStack gap={5}>
        <PageHeader
          title="강연 신청"
          description={`${lecture.title} · ${formatDateTime(lecture.startsAt)}`}
          back={{ href: `/lectures/${lecture.lectureId}`, label: '강연 상세' }}
        />
        <FormSection title="신청자 정보">
          <ApplicantFields value={applicant} onChange={setApplicant} errors={errors} showMajor />
        </FormSection>
        <FormSection title="사전 질문" description="연사에게 미리 묻고 싶은 내용이 있다면 적어 주세요. (선택)">
          <TextArea
            label="사전 질문"
            isLabelHidden
            value={question}
            onChange={setQuestion}
            placeholder="예) 비전공자도 지원할 수 있을까요?"
            rows={4}
          />
        </FormSection>
        <FormActions
          primaryLabel="신청 제출"
          onPrimary={onSubmit}
          secondaryLabel="취소"
          onSecondary={() => navigate(PATHS.public.lecture(lecture.lectureId))}
          sticky
        />
      </VStack>
    </PageContainer>
  )
}
