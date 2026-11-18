import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Spinner } from '@astryxdesign/core/Spinner'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { useOnline } from '../hooks/useOnline'

/** How long a spinner may turn before it admits the connection may be the problem. */
const SLOW_AFTER_MS = 8_000

/**
 * Waiting on the server. Never rendered as "empty" — that would be a wrong
 * answer. A request that gets no answer just leaves the stream `loading` until
 * it gives up, so this is where a student
 * with no connection learns why nothing is happening — at once when the
 * browser knows it is offline, otherwise after the wait turns suspicious.
 */
export function LoadingState({
  label = '불러오고 있어요',
  minHeight = '40dvh',
  onRetry,
}: {
  label?: string
  minHeight?: string
  /** Re-opens the stream. Shown once the wait is long enough to doubt. */
  onRetry?: () => void
}) {
  const isOnline = useOnline()
  const [isSlow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])
  const hint = !isOnline
    ? '오프라인 상태예요. 연결되면 자동으로 이어져요.'
    : isSlow
      ? '평소보다 오래 걸리고 있어요. 연결 상태를 확인해 주세요.'
      : ''

  return (
    <VStack padding={6} hAlign="center" vAlign="center" minHeight={minHeight} gap={3}>
      <Spinner label={label} />
      {hint && (
        <Text type="supporting" color="secondary" justify="center" display="block" role="status">
          {hint}
        </Text>
      )}
      {hint && onRetry && isOnline && <Button label="다시 시도" variant="secondary" size="sm" onClick={onRetry} />}
    </VStack>
  )
}

/** A read failed. Says so plainly and offers a retry instead of showing nothing. */
export function LoadErrorState({
  title = '정보를 불러오지 못했어요',
  description = '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="py-12">
      <EmptyState
        title={title}
        description={description}
        actions={onRetry ? <Button label="다시 시도" variant="secondary" onClick={onRetry} /> : undefined}
      />
    </div>
  )
}
