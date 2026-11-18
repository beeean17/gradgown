import { VStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'

/**
 * Temporary stand-in for routes not yet implemented. Replace each usage with
 * the real feature page as it gets built.
 */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <VStack gap={2} padding={6} hAlign="center" vAlign="center" minHeight="60dvh">
      <Heading level={1}>{title}</Heading>
      <Text color="secondary">준비 중인 화면이에요.</Text>
    </VStack>
  )
}
