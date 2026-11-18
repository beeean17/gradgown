import { useParams, useNavigate } from 'react-router-dom'
import { VStack, HStack } from '@astryxdesign/core/Stack'
import { Card } from '@astryxdesign/core/Card'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Link } from '@astryxdesign/core/Link'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Token } from '@astryxdesign/core/Token'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { PageContainer } from '../../../shared/ui/PageContainer'
import { ContentDetail } from '../../../shared/content/ContentDetail'
import { formatDateTime, formatDateRange } from '../../../shared/lib/datetime'
import { useLecture, useMyRegistration, lectureAvailability } from '../useLectures'
import { LECTURE_AVAILABILITY } from '../components/lectureStatus'
import { PATHS } from '../../../app/routes/paths'
import { useAuth } from '../../../shared/auth/useAuth'
import { useAuthModal } from '../../../shared/auth/AuthModalContext'

export function LectureDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { openLoginModal } = useAuthModal()
  const lecture = useLecture(id)
  const registration = useMyRegistration(id)

  if (!lecture) {
    return (
      <PageContainer width="wide">
        <EmptyState title="강연을 찾을 수 없어요" description="삭제되었거나 잘못된 주소일 수 있어요." />
      </PageContainer>
    )
  }

  const avail = lectureAvailability(lecture)
  const { tone, label } = LECTURE_AVAILABILITY[avail]
  const canApply = avail === 'open' && !registration

  const applyPanel = (
    <Card padding={4} elevation="low">
      <VStack gap={3}>
        <HStack gap={1} vAlign="center">
          <StatusDot variant={tone} label={label} />
          <Text type="label">{label}</Text>
        </HStack>
        <MetadataList label={{ position: 'start', width: 72 }}>
          <MetadataListItem label="일시">{formatDateTime(lecture.startsAt)}</MetadataListItem>
          <MetadataListItem label="장소">{lecture.location}</MetadataListItem>
          <MetadataListItem label="연사">{lecture.speakerName}</MetadataListItem>
          <MetadataListItem label="신청 기간">
            {formatDateRange(lecture.applyStartAt, lecture.applyEndAt)}
          </MetadataListItem>
        </MetadataList>

        {registration ? (
          <VStack gap={2}>
            <Text type="body" color="accent">
              이미 신청했어요.
            </Text>
            <Button label="내 신청 상태 보기" variant="secondary" onClick={() => navigate(PATHS.me.lectures)} width="100%" />
          </VStack>
        ) : canApply ? (
          <Button
            label="신청하기"
            variant="primary"
            onClick={() => {
              if (!user) {
                openLoginModal({ redirectTo: PATHS.public.lectureRegister(lecture.lectureId) })
              } else {
                navigate(PATHS.public.lectureRegister(lecture.lectureId))
              }
            }}
            width="100%"
          />
        ) : (
          <Text type="supporting" color="secondary">
            {avail === 'upcoming' ? '아직 신청 기간이 아니에요.' : '신청이 마감됐어요.'}
          </Text>
        )}
      </VStack>
    </Card>
  )

  return (
    <PageContainer width="wide">
      <div className="mb-4">
        <Link href={PATHS.public.lectures} isStandalone>
          ← 강연 목록
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_21.25rem]">
        <ContentDetail
          title={lecture.title}
          meta={
            <HStack gap={1} vAlign="center" wrap="wrap">
              <Token label="취업 강연회" size="sm" />
              <Text type="supporting" color="secondary">
                {formatDateTime(lecture.startsAt)} · {lecture.location}
              </Text>
            </HStack>
          }
          body={
            lecture.description +
            (lecture.speakerBio ? `\n\n연사 · ${lecture.speakerName} (${lecture.speakerBio})` : '')
          }
        />
        <div className="lg:sticky lg:top-6 lg:self-start">{applyPanel}</div>
      </div>
    </PageContainer>
  )
}
