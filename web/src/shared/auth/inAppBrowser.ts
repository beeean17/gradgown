/**
 * Google refuses OAuth inside embedded webviews (`disallowed_useragent`), and
 * most students arrive from KakaoTalk, Instagram or 에브리타임 links. Neither
 * popup nor redirect sign-in can work there, so the login UI detects these
 * browsers and sends the student to a real one instead of failing silently.
 */
const IN_APP_MARKERS = ['kakaotalk', 'everytimeapp', 'everytime', 'instagram', 'fban', 'fbav', 'fbios', 'line/', 'snapchat', 'naver(inapp', 'daumapps', 'band/']

export type InAppBrowser = { kind: 'android' | 'ios' | 'other'; app: 'kakaotalk' | 'line' | 'other' } | null

export function detectInAppBrowser(userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): InAppBrowser {
  const ua = userAgent.toLowerCase()
  if (!IN_APP_MARKERS.some((marker) => ua.includes(marker))) return null
  const app = ua.includes('kakaotalk') ? 'kakaotalk' : ua.includes('line/') ? 'line' : 'other'
  if (ua.includes('android')) return { kind: 'android', app }
  if (/iphone|ipad|ipod/.test(ua)) return { kind: 'ios', app }
  return { kind: 'other', app }
}

/**
 * The URL that hands the current page to the phone's default browser, or null
 * when the app offers no way out and the student has to use its menu.
 * KakaoTalk and LINE have their own hand-off on both platforms; any other
 * Android webview gets an intent without a package, which the system resolves
 * to the default browser (or asks, when none is set).
 */
export function externalBrowserUrl(inApp: NonNullable<InAppBrowser>, href: string = window.location.href): string | null {
  if (inApp.kind === 'other') return null
  if (inApp.app === 'kakaotalk') return `kakaotalk://web/openExternal?url=${encodeURIComponent(href)}`
  const url = new URL(href)
  if (inApp.app === 'line') {
    url.searchParams.set('openExternalBrowser', '1')
    return url.href
  }
  if (inApp.kind === 'android') return `intent://${url.host}${url.pathname}${url.search}${url.hash}#Intent;scheme=${url.protocol.replace(':', '')};end`
  return null
}
