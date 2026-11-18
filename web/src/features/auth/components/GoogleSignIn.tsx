import { useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { SignInError, signInWithGoogle } from '../../../shared/auth/session'
import { detectInAppBrowser, externalBrowserUrl } from '../../../shared/auth/inAppBrowser'

/**
 * The one Google sign-in control, shared by the dialog and `/login`. It owns
 * the pending state (a redirect keeps it spinning until the page leaves), the
 * error line, and the in-app-browser hand-off — Google blocks OAuth inside
 * KakaoTalk/Instagram webviews, so there the button alone would only fail.
 */
export function GoogleSignIn({
  label,
  returnTo,
  onSignedIn,
  initialError = null,
}: {
  label: string
  /** Where a redirect fallback should come back to. */
  returnTo?: string
  onSignedIn?: () => void
  initialError?: string | null
}) {
  const [isPending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [inApp] = useState(() => detectInAppBrowser())
  const [exitUrl] = useState(() => (inApp ? externalBrowserUrl(inApp) : null))

  const signIn = async () => {
    setPending(true)
    setError(null)
    try {
      const outcome = await signInWithGoogle(returnTo)
      if (outcome === 'redirecting') return
      setPending(false)
      if (outcome === 'signed-in') onSignedIn?.()
    } catch (caught) {
      setPending(false)
      setError(caught instanceof SignInError ? caught.message : '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <VStack gap={3} hAlign="stretch">
      {inApp && (
        <Banner
          status="warning"
          title="외부 브라우저에서 열어 주세요"
          description={
            exitUrl
              ? '이 앱의 내장 브라우저에서는 구글 로그인이 막혀 있어요. 아래 버튼으로 기본 브라우저에서 열어 주세요.'
              : '이 앱의 내장 브라우저에서는 구글 로그인이 막혀 있어요. 화면의 메뉴(⋯ 또는 공유)에서 "외부 브라우저로 열기" 또는 "다른 브라우저로 열기"를 선택해 주세요.'
          }
        />
      )}
      {exitUrl && (
        <Button
          label="기본 브라우저에서 열기"
          variant="secondary"
          width="100%"
          onClick={() => window.location.assign(exitUrl)}
        />
      )}
      <Button
        label={label}
        variant={inApp ? 'secondary' : 'primary'}
        isLoading={isPending}
        onClick={signIn}
        width="100%"
      />
      {error && (
        <Text type="supporting" weight="medium" justify="center" role="alert" className="text-[var(--color-text-red)]">
          {error}
        </Text>
      )}
    </VStack>
  )
}
