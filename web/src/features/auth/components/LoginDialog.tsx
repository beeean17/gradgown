import { Dialog } from '@astryxdesign/core/Dialog'
import { VStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { ORG } from '../../../shared/content/contact'
import { GoogleSignIn } from './GoogleSignIn'

/**
 * Sign-in without leaving the page. `/login` still exists for guard redirects
 * and shared links; this is the shell's own entry point, so signing in from a
 * list or a detail page doesn't lose the reader's place.
 */
export function LoginDialog({
  isOpen,
  onOpenChange,
  onSuccess,
  returnTo,
  initialError = null,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  /** Destination for the redirect fallback, which reloads the page. */
  returnTo?: string
  initialError?: string | null
}) {
  const onSignedIn = () => {
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width="22rem"
      padding={6}
      purpose="info"
      aria-label="로그인"
    >
      <div className="relative">
        <Button
          label="모달 닫기"
          variant="ghost"
          size="sm"
          isIconOnly
          icon={<Icon icon="close" />}
          onClick={() => onOpenChange(false)}
          className="absolute right-0 top-0"
        />

        <VStack gap={5} hAlign="stretch">
          <VStack gap={2} hAlign="center">
            <div className="flex flex-col items-center leading-[1.25]">
              <span className="text-secondary text-[11px] font-normal">{ORG.university}</span>
              <Heading level={2} className="text-primary text-[18px] font-bold">
                {ORG.committee}
              </Heading>
            </div>
            <Text type="supporting" color="secondary" justify="center">
              구글 계정으로 로그인해 주세요.
            </Text>
          </VStack>

          {/* Remount per opening so a stale error never greets the next try. */}
          {isOpen && (
            <GoogleSignIn
              label="Google로 로그인"
              returnTo={returnTo}
              onSignedIn={onSignedIn}
              initialError={initialError}
            />
          )}
        </VStack>
      </div>
    </Dialog>
  )
}
