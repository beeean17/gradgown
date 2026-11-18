import { ThemeModeProvider } from '../shared/theme/ThemeModeContext'
import { LoadErrorState } from '../shared/ui/LoadState'

/**
 * Shown instead of the app when the Firebase config is missing or unsafe
 * (see shared/firebase/config.ts). A visitor gets one clear message rather
 * than every screen failing on its own; the detail is for whoever deploys.
 */
export function SetupErrorPage({ error }: { error: Error }) {
  return (
    <ThemeModeProvider>
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col justify-center px-4">
        <LoadErrorState
          title="서비스 연결 설정을 확인하고 있어요"
          description={import.meta.env.DEV ? error.message : '잠시 후 다시 접속해 주세요.'}
        />
      </main>
    </ThemeModeProvider>
  )
}
