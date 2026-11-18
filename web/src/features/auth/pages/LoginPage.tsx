import { Card } from '@astryxdesign/core/Card'
import { VStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Link } from '@astryxdesign/core/Link'
import { useLocation } from 'react-router-dom'
import { PATHS } from '../../../app/routes/paths'
import { readRedirectTo } from '../../../app/routes/redirectTo'
import { ORG } from '../../../shared/content/contact'
import { GoogleSignIn } from '../components/GoogleSignIn'

/**
 * Login screen for guard redirects and shared links. Navigation after sign-in
 * is RequireGuest's job: as soon as the session exists it forwards to the
 * validated `redirectTo`, for the popup and the redirect fallback alike.
 */
export function LoginPage() {
  const { search } = useLocation()
  // Validated: an off-origin `redirectTo` is discarded, never followed.
  const redirectTo = readRedirectTo(search)

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
              구글 계정으로 로그인해 주세요.
            </Text>
          </VStack>

          <GoogleSignIn label="Google로 계속하기" returnTo={redirectTo} />

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
