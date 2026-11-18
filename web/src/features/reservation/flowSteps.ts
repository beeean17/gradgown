import type { FlowStep } from '../../shared/ui/flow/steps'

export type { FlowStep }

/** The four steps of the reservation flow, in one place (see shared/ui/flow/steps.ts). */

/** The flow's name over each step heading ("학위복 대여 예약 · STEP 01"). */
export const FLOW_NAME = '학위복 대여 예약'

export const FLOW_STEPS: FlowStep[] = [
  {
    key: 'terms',
    nav: '약관 동의·안내',
    title: '약관에 동의해 주세요',
  },
  {
    key: 'applicant',
    nav: '신청자 정보',
    title: '정보가 맞는지 확인해 주세요',
    subtitle: '연락처만 입력하면 됩니다',
  },
  {
    key: 'schedule',
    nav: '사이즈·시간',
    title: '사이즈와 시간을 선택해 주세요',
    subtitle: '수령·반납 시간을 각각 골라요',
  },
  {
    key: 'confirm',
    nav: '확인',
    title: '예약 내용을 확인해 주세요',
    subtitle: '확정 후 변경·취소는 수정 기간에 내 신청에서 할 수 있어요',
  },
]

export const LAST_STEP = FLOW_STEPS.length - 1
