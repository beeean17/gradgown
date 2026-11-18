import type { FlowStep } from '../../shared/ui/flow/steps'

export type { FlowStep }

/** The flow's name over each step heading ("St:talk 신청 · STEP 01"). */
export const FLOW_NAME = 'St:talk 신청'

/**
 * The four steps of the St:talk flow (requirements MNT-10~13), the same
 * shape as the reservation flow so the footer rail and headings read alike.
 */
export const FLOW_STEPS: FlowStep[] = [
  {
    key: 'terms',
    nav: '약관 동의·안내',
    title: '안내를 읽고 약관에 동의해 주세요',
  },
  {
    key: 'applicant',
    nav: '신청자 정보',
    title: '정보가 맞는지 확인해 주세요',
    subtitle: '학년을 꼭 골라 주세요',
  },
  {
    key: 'sessions',
    nav: '차시 선택',
    title: '차시별 선택지를 골라 주세요',
    subtitle: '같은 선택지를 두 차시에 고를 수 없어요',
  },
  {
    key: 'confirm',
    nav: '확인',
    title: '신청 내용을 확인해 주세요',
  },
]

export const LAST_STEP = FLOW_STEPS.length - 1
