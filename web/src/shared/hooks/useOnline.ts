import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/**
 * The browser's own view of connectivity. `false` is reliable — the device
 * knows it has no network — while `true` only means "not known to be
 * offline", so screens use it to warn before a request, never to promise one
 * will succeed.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}

export const OFFLINE_MESSAGE = '오프라인 상태예요. 연결을 확인한 뒤 다시 시도해 주세요.'
