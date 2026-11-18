import type { ReactNode } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Heading } from '@astryxdesign/core/Heading'
import { PointBar } from './PointBar'

/** KPI tile for the admin dashboard. */
export function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
}) {
  return (
    <Card padding={4}>
      <VStack gap={2}>
        <PointBar />
        <Text type="supporting" color="secondary">
          {label}
        </Text>
        <Heading level={2} type="display-3">
          {value}
        </Heading>
        {sub && (
          <Text type="supporting" color="secondary">
            {sub}
          </Text>
        )}
      </VStack>
    </Card>
  )
}
