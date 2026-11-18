import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { VStack, HStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { formatDateTime } from '../../../shared/lib/datetime'
import { lectureAvailability } from '../useLectures'
import { LECTURE_AVAILABILITY } from './lectureStatus'
import type { Lecture } from '../../../shared/types'
import { PATHS } from '../../../app/routes/paths'

export function LectureCard({ item }: { item: Lecture }) {
  const avail = lectureAvailability(item)
  const { tone, label } = LECTURE_AVAILABILITY[avail]
  const seatsLeft = item.capacity > 0 ? item.capacity - item.registeredCount : null

  return (
    <ClickableCard label={item.title} href={PATHS.public.lecture(item.lectureId)} padding={4} elevation="low" className="gx-lift">
      <VStack gap={2}>
        <HStack gap={1} vAlign="center">
          <StatusDot variant={tone} label={label} />
          <Text type="label" color="secondary">
            {label}
          </Text>
          {seatsLeft !== null && seatsLeft > 0 && (
            <>
              <div className="flex-1" />
              <Text type="supporting" color="secondary">
                잔여 {seatsLeft}석
              </Text>
            </>
          )}
        </HStack>
        <Heading level={3} maxLines={2}>
          {item.title}
        </Heading>
        <VStack gap={0.5}>
          <Text type="supporting" color="secondary">
            {formatDateTime(item.startsAt)}
          </Text>
          <Text type="supporting" color="secondary">
            {item.location} · {item.speakerName}
          </Text>
        </VStack>
      </VStack>
    </ClickableCard>
  )
}
