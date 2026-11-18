import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { VStack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { SignInError, listTestAccounts, signInAs, type TestAccount } from '../../../shared/auth/session'

/**
 * The seeded test accounts as buttons; picking one signs in as it
 * (docs/decisions/test-login.md). It takes the place of the Google button of
 * the original service.
 */
export function TestAccountSignIn({
  onSignedIn,
  initialError = null,
}: {
  onSignedIn?: () => void
  initialError?: string | null
}) {
  const [accounts, setAccounts] = useState<TestAccount[] | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(initialError)

  useEffect(() => {
    let active = true
    listTestAccounts().then(
      (list) => active && setAccounts(list),
      () => active && setError('테스트 계정 목록을 불러오지 못했어요. 서버가 켜져 있는지 확인해 주세요.'),
    )
    return () => {
      active = false
    }
  }, [])

  const signIn = async (email: string) => {
    setPending(email)
    setError(null)
    try {
      await signInAs(email)
      setPending(null)
      onSignedIn?.()
    } catch (caught) {
      setPending(null)
      setError(caught instanceof SignInError ? caught.message : '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <VStack gap={3} hAlign="stretch">
      {accounts === null && !error && (
        <Text type="supporting" color="secondary" justify="center">
          테스트 계정을 불러오는 중이에요.
        </Text>
      )}
      {accounts?.map((account) => (
        <Button
          key={account.email}
          label={account.email}
          variant="secondary"
          isLoading={pending === account.email}
          isDisabled={pending !== null && pending !== account.email}
          onClick={() => signIn(account.email)}
          width="100%"
        />
      ))}
      {error && (
        <Text type="supporting" weight="medium" justify="center" role="alert" className="text-[var(--color-text-red)]">
          {error}
        </Text>
      )}
    </VStack>
  )
}
