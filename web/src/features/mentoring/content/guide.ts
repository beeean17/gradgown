import type { Rule } from '../../../shared/content/rules'
import type { Step } from '../../../shared/ui/StepList'

export type { Rule }

/**
 * What a St:talk applicant has to know. Operations edit the event-specific
 * copy (`intro`, `notes`) in the admin console; what is here is the part of
 * the programme that does not change between events, carried over from the
 * Flutter recruit screen.
 */

export const PROGRAM = {
  /** The brand, as shown in headings. */
  name: 'St:talk',
  /** One line that says what it is. */
  tagline: '졸업생 초청 취업 테이블 토크',
  /** Shown when the operator has not written an `intro` yet. */
  defaultIntro:
    '졸업생 멘토가 취업 과정과 현직 직무 경험을 나누고, 소그룹으로 질문을 이어 가는 자리예요. 1차시와 2차시에서 듣고 싶은 멘토를 하나씩 골라요.',
}

/**
 * How St:talk goes, for the St:talk tab's "St:talk이란" card: what the flow's
 * terms step does not say in this shape. The rules themselves stay the terms
 * step's (HOW_TO_APPLY_STEPS, TERMS_BRIEF).
 */
export const ABOUT_STEPS: Step[] = [
  { term: '신청', detail: [{ text: '신청 기간에 1·2차시마다 듣고 싶은 멘토를 한 명씩 골라요.' }] },
  {
    term: 'EPIC Folio',
    detail: [{ text: 'EPIC 점수를 받으려면 ' }, { text: 'EPIC Folio에서도 따로 신청', strong: true }, { text: '해야 해요.' }],
  },
  { term: '참여', detail: [{ text: '행사 당일 신청한 차시에 행사 장소로 와요. 시작 5분 전에 도착하면 좋아요.' }] },
]

export const HOW_TO_APPLY = {
  title: '참여 방법',
  lead: '신청부터 당일까지',
}

export const HOW_TO_APPLY_STEPS: Rule[] = [
  {
    term: '차시별로 선택지 하나씩',
    detail: '1차시와 2차시가 같은 선택지(멘토와 "선택 안함")를 써요. 차시마다 하나씩 고르면 신청이 끝나고, 한 차시만 참여한다면 다른 차시는 "선택 안함"을 골라요.',
  },
  {
    term: '같은 선택지는 한 번만',
    detail: '같은 선택지를 1차시와 2차시에 모두 고를 수는 없어요.',
  },
  {
    term: '행사 당일 행사 장소로',
    detail: '신청한 차시에 행사 장소로 와서 운영진의 안내를 따라 주세요. 시작 5분 전에 도착하기를 권해요.',
  },
]

export const NOTES_GUIDE = {
  title: '유의사항',
  lead: '신청하면 아래 내용에 동의하게 돼요',
}

/** Shown when the operator has not written `notes` yet. */
export const DEFAULT_NOTES: string[] = [
  '입력한 정보가 실제와 다르면 참여가 제한될 수 있어요',
  '신청·변경·취소는 신청 기간 안에서만 할 수 있어요',
  '운영 상황에 따라 일정과 구성이 일부 바뀔 수 있어요',
]

/**
 * EPIC Folio is a separate university system; this form does not register
 * the student there. The reminder appears on the guide, the confirm step and
 * the done screen (MNT-3) because missing it costs the student the credit.
 */
export const EPIC_FOLIO = {
  title: 'EPIC Folio 별도 신청',
  summary: '본 신청과 별도로 EPIC Folio에서도 신청해야 EPIC 점수를 받을 수 있어요.',
  detail: 'EPIC Folio에서 신청하지 않으면 EPIC 점수를 받을 수 없어요. 둘 다 신청해야 해요.',
  pathTitle: 'EPIC Folio에서 찾는 방법',
  paths: [
    '학습활동 → 교내 비교과 → 총졸업준비위원회 동문 선배들과의 취업 진로 테이블 토크 ST:alk_ST동문특강',
    '비교과 신청 프로그램 바로가기 → 총졸업준비위원회 동문 선배들과의 취업 진로 테이블 토크 ST:alk_ST동문특강',
  ],
  linkLabel: 'EPIC Folio에서 신청하기',
}

export const CONTACT_GUIDE = {
  title: '문의',
  detail: '문의 사항은 총졸업준비위원회 인스타그램으로 연락해 주세요.',
}

/**
 * The phone's terms step: one line per point. HOW_TO_APPLY_STEPS, the notes
 * and EPIC_FOLIO stay the source and are shown word for word under 전문 보기
 * (MentoringGuideFull); a change there needs a matching line here. The
 * operator's own `notes` are shown as written — they are not summarised.
 */
export const TERMS_BRIEF = {
  howTo: {
    title: '참여 방법',
    items: [
      '1·2차시마다 멘토를 한 명씩 골라요',
      '같은 멘토는 한 번만, 둘 다 "선택 안함"은 안 돼요',
      '한 차시만 듣는다면 다른 차시는 "선택 안함"',
      '당일 행사 장소로, 차시 시작 5분 전 도착을 권해요',
    ],
  },
  warnings: {
    title: '꼭 알아 두세요',
    epic: 'EPIC 점수는 EPIC Folio에서 따로 신청해야 받아요',
  },
}
