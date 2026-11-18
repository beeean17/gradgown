/**
 * Organisation identity and contact details, in one place so the landing CTA
 * and the footer can't drift apart. Copy — not user data — so it lives here
 * rather than in the mock dataset.
 */

export const ORG = {
  /** Product/brand name shown as the footer wordmark. */
  brand: 'Cand:ID',
  tagline: ['제42대 총졸업준비위원회 Cand:ID', '당신의 졸업을 응원합니다.'],
  university: '서울과학기술대학교',
  committee: '총졸업준비위원회',
} as const

/** No phone or office hours: inquiries go to Instagram (SOCIAL). */
export const CONTACT = [{ label: '이메일', value: 'seoultechgrad42@gmail.com' }] as const

export const SOCIAL = {
  instagram: {
    label: '인스타그램',
    value: '@grad_seoultech',
    href: 'https://www.instagram.com/grad_seoultech/',
  },
} as const

export const FOOTER_COLUMNS = [
  { title: '소속 정보', lines: [ORG.university, ORG.committee] },
  {
    title: '소셜 계정',
    lines: [
      '인스타그램 @grad_seoultech',
      '카카오톡 서울과기대 총졸업준비위원회',
      '에브리타임 총졸업준비위원회',
    ],
  },
  { title: '위치', lines: ['서울 노원구 공릉로58길 130', '제1학생회관 3층 320호'] },
] as const
