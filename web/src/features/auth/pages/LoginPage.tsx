import { Card } from '@astryxdesign/core/Card'
import { VStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Link } from '@astryxdesign/core/Link'
import { PATHS } from '../../../app/routes/paths'
import { ORG } from '../../../shared/content/contact'
import { TestAccountSignIn } from '../components/TestAccountSignIn'

/**
 * The full-page login. Signing in changes the auth state, and the route guard
 * around this page (`GuestOnly`) then sends the student on to where they were
 * going.
 */
export function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[26.25rem] flex-col justify-center px-4 py-8">
      <Card padding={6} elevation="low">
        <VStack gap={5} hAlign="stretch">
          <VStack gap={2} hAlign="center">
            <div className="flex flex-col items-center leading-[1.25]">
              <span className="text-secondary text-[12px] font-normal">{ORG.university}</span>
              <Heading level={1} className="text-primary text-[20px] font-bold">
                {ORG.committee}
              </Heading>
            </div>
            <Text type="body" color="secondary" justify="center">
              테스트 계정을 골라 로그인해 주세요.
            </Text>
          </VStack>
          <TestAccountSignIn />
          <div className="flex justify-center">
            <Link href={PATHS.home} isStandalone>
              로그인 없이 둘러보기
            </Link>
          </div>
        </VStack>
      </Card>
    </div>
  )
}
