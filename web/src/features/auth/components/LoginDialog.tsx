import { Dialog } from '@astryxdesign/core/Dialog'
import { VStack } from '@astryxdesign/core/Stack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { ORG } from '../../../shared/content/contact'
import { TestAccountSignIn } from './TestAccountSignIn'

/** The login modal, opened from anywhere through `useAuthModal`. */
export function LoginDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
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
              테스트 계정을 골라 로그인해 주세요.
            </Text>
          </VStack>
          {/* Remount per opening so a stale error never greets the next try. */}
          {isOpen && <TestAccountSignIn onSignedIn={onSignedIn} />}
        </VStack>
      </div>
    </Dialog>
  )
}
