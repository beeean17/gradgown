/**
 * What a borrower has to know before agreeing. Carried over from the Flutter
 * reservation screen's 약관 step so nothing a student used to be told goes
 * missing in the rebuild.
 *
 * Rules are split into `term` + `detail` rather than kept as one sentence:
 * this step is scanned, not read, so the part that changes the student's
 * behaviour gets to be the bold half of the line.
 *
 * Each section also carries a `leadShort`. The wide layout shows every rule at
 * once and uses `lead`; the narrow one folds sections into accordions, where
 * the closed header has room for a phrase and not a sentence.
 */

import type { Rule } from '../../../shared/content/rules'
import type { Step } from '../../../shared/ui/StepList'

export type { Rule }

/**
 * What the rental is, for the 예약 tab: the one thing the flow never says.
 * How it goes in three steps; the rules themselves are the terms step's.
 */
export const ABOUT = {
  title: '학위복 대여란',
  summary: '총졸업준비위원회가 학위복(가운·학사모)을 빌려 드려요.',
  steps: [
    { term: '예약', detail: [{ text: '예약 기간에 사이즈와 수령·반납 시간을 골라요.' }] },
    {
      term: '수령',
      detail: [
        { text: '정한 시간에 와서 ' },
        { text: '실물 학생증', strong: true },
        { text: '(없으면 실물 신분증 + 모바일 학생증)을 맡기고 받아요.' },
      ],
    },
    { term: '반납', detail: [{ text: '정한 시간에 같은 곳으로 돌려주고 맡긴 것을 돌려받아요.' }] },
  ] as Step[],
}

/** What to carry on pickup day — the same three lines as the terms step's `bring`. */
export const PICKUP_ESSENTIALS = [
  { label: '실물 학생증', note: '하나면 본인 확인과 보증이 함께 끝나요' },
  { label: '학생증이 없으면', note: '실물 신분증과 모바일 학생증(또는 재학증명서)' },
  { label: '수령용 가방', note: '챙겨 오면 좋아요' },
]

export const PICKUP_GUIDE = {
  title: '수령 안내',
  lead: '수령 당일 챙길 것',
  leadShort: '수령 당일 챙길 것',
}

/**
 * Pickup does two different things with an ID, and students conflate them:
 * confirming you are the student who reserved, and holding a physical object
 * until the gown comes back. A phone satisfies the first and cannot satisfy
 * the second, so the desk is listed as two steps rather than one ID rule.
 */
export const PICKUP_CHECKS: Rule[] = [
  {
    term: '본인 확인',
    detail: '실물 학생증, 모바일 학생증, 재학증명서 중 하나만 있으면 돼요.',
  },
  {
    term: '보증물 보관',
    detail: '실물 학생증이나 실물 신분증 하나를 맡아 두고, 반납할 때 돌려드려요.',
  },
]

/** The single rule students most often get wrong. Repeated under 보증물 보관. */
export const ID_CARD_RULE: Rule = {
  term: '모바일 학생증은 보증물이 될 수 없어요',
  detail: '모바일 학생증으로는 본인 확인만 돼요. 맡겨 둘 것은 꼭 실물이어야 해요.',
}

export const PROXY_GUIDE = {
  title: '예약과 대리 수령',
  lead: '한 사람은 본인 몫 하나만 예약할 수 있어요',
  leadShort: '한 사람은 본인 몫 하나만',
}

export const PROXY_RULES: Rule[] = [
  {
    term: '단체로 와도 각자 예약',
    detail: '함께 오더라도 모두 각자 예약해야 수령이 원활해요.',
  },
  {
    term: '대리 수령은 예약할 때 미리 적기',
    detail: '예약한 다른 재학생이 대신 받는다면, 예약할 때 대리 수령 정보를 꼭 적어 주세요.',
  },
  {
    term: '대리인은 신청자의 예약 시간에 방문',
    detail: '대리 수령자는 신청자가 고른 수령 시간에 와서 받고, 반납 시간에 반납도 대신할 수 있어요.',
  },
  {
    term: '외부인은 대신 받을 수 없어요',
    detail: '예약하지 않은 사람이나 외부인은 보안상 대신 받을 수 없어요.',
  },
]

export const PROXY_NOTE = '※ 그 밖의 경우에는 본인이 직접 와서 받아요.'

/**
 * The applicant step's proxy rules, one line each: PROXY_RULES and PROXY_NOTE
 * above are the source (shown in full under 유의사항); a change there needs a
 * matching line here. A proxy is another student with their own
 * reservation, never an outsider.
 */
export const PROXY_BRIEF = [
  '예약한 재학생만 대신 받을 수 있어요. 외부인은 안 돼요',
  '대신 받는 사람은 내 수령 시간에 와서 받고, 반납도 대신할 수 있어요',
]

export const WARNINGS_GUIDE = {
  title: '유의사항',
  lead: '동의하면 아래 내용에 책임을 지게 돼요',
  leadShort: '변상 · 변경 마감 · 조기 마감',
}

/** Consequences the student carries. Shown as a warning, not a footnote. */
export const RESERVATION_WARNINGS: Rule[] = [
  {
    term: '분실하면 15만 원 변상',
    detail: '가운이나 학사모를 잃어버리면 예약한 본인이 변상해요. 파손도 위원회 회칙에 따라 변상해요.',
  },
  {
    term: '수정 기간이 끝나면 변경·취소할 수 없어요',
    detail: '수정 마감 일시(예약 탭과 확인 단계에 나와요)가 지나면 시간·사이즈 변경과 취소가 모두 닫혀요.',
  },
  {
    term: '재고가 떨어지면 일찍 마감될 수 있어요',
    detail: '사이즈별 재고가 모두 예약되면 예약 기간 중이라도 접수를 닫을 수 있어요.',
  },
]

/**
 * The phone's terms step: one line per point, scanned in seconds. The rules
 * above stay the source and are shown word for word under 전문 보기
 * (ReservationGuideFull); this is their summary, so a change there needs a
 * matching line here. `bring` merges the packing list with the two ID checks
 * at the desk: a physical student card covers both; without one, an ID card
 * to leave plus a mobile card or enrolment certificate to show. The editing
 * deadline is the round's own, filled in by the step.
 */
export const TERMS_BRIEF = {
  bring: {
    title: '가져올 것',
    items: [
      { strong: '실물 학생증', rest: '하나면 본인 확인과 보증이 함께 끝나요' },
      { strong: '학생증이 없으면', rest: '실물 신분증과 모바일 학생증(또는 재학증명서)을 함께 가져와요' },
      { strong: '수령용 가방', rest: '도 챙겨 오면 좋아요' },
    ],
  },
  pickup: {
    title: '예약과 대리 수령',
    items: ['단체로 와도 한 사람씩 각자 예약해요', '대리 수령은 신청서에 미리 적어요. 예약한 재학생만 되고 외부인은 안 돼요'],
  },
  warnings: {
    title: '꼭 알아 두세요',
    lost: '분실하면 15만 원을 변상해야 해요',
    /** `{deadline}` is the round's edit deadline, e.g. "11/22 (일) 09:00". */
    locked: '{deadline} 이후에는 시간·사이즈 변경과 취소를 할 수 없어요',
    lockedFallback: '수정 기간이 끝나면 변경·취소할 수 없어요',
    stock: '재고가 떨어지면 일찍 마감될 수 있어요',
  },
}
