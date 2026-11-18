/**
 * A campus place on Kakao Map, searched by its building: "중앙도서관 1층
 * St:art홀" → "서울과학기술대학교 중앙도서관", since the map knows buildings,
 * not rooms. The 지도 link beside a venue.
 */
export function campusMapUrl(place: string): string {
  const building = place.trim().split(/\s+/)[0] ?? ''
  return `https://map.kakao.com/link/search/${encodeURIComponent(`서울과학기술대학교 ${building}`.trim())}`
}
