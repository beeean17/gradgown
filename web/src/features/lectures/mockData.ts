import type { Lecture, LectureRegistration, RegistrationStatus } from '../../shared/types'

/**
 * Placeholder data for the dormant lecture screens (St:talk is being redesigned
 * as a mentoring program; see private/documents/03-react-v2/sttalk-mentoring-plan.md).
 * None of these routes are registered — this file only keeps the components
 * type-checking until that feature is built against Firestore.
 */

export const mockLectures: Lecture[] = [
  { lectureId: 'lec_1', title: 'IT 대기업 취업 전략과 포트폴리오', description: '현직 개발자가 알려주는 서류·코딩테스트·면접 준비법. 실제 합격 포트폴리오를 함께 살펴봅니다.', speakerName: '한지훈', speakerBio: '前 네이버 · 現 스타트업 CTO', location: '온라인 (Zoom)', startsAt: '2026-06-25T19:00:00+09:00', endsAt: '2026-06-25T21:00:00+09:00', status: 'open', applyStartAt: '2026-06-10T00:00:00+09:00', applyEndAt: '2026-06-24T23:59:59+09:00', capacity: 100, registeredCount: 42, isVisible: true, summary: '서류·코테·면접 준비 A to Z' },
  // Off-season by default (apply window in the future) → the home shows only
  // the gown reservation card. Move applyStart/End to include "now" to make the
  // lecture card appear on the home and enable the registration flow.
  { lectureId: 'lec_2', title: '공기업·공공기관 채용 로드맵', description: 'NCS부터 자소서, 면접까지 공공기관 취업의 전 과정을 안내합니다.', speakerName: '오세라', speakerBio: '취업 컨설턴트', location: '학생회관 대강당', startsAt: '2026-09-22T14:00:00+09:00', endsAt: '2026-09-22T16:00:00+09:00', status: 'open', applyStartAt: '2026-09-01T00:00:00+09:00', applyEndAt: '2026-09-20T23:59:59+09:00', capacity: 0, registeredCount: 18, isVisible: true, summary: 'NCS·자소서·면접 로드맵' },
  { lectureId: 'lec_3', title: '이력서 클리닉 (1:1 첨삭)', description: '지원한 이력서를 현직자가 1:1로 첨삭합니다. 신청 시 이력서를 첨부해 주세요.', speakerName: '김도윤', speakerBio: '現 카카오 인사팀', location: '커리어개발센터', startsAt: '2026-05-20T13:00:00+09:00', endsAt: '2026-05-20T17:00:00+09:00', status: 'closed', applyStartAt: '2026-05-01T00:00:00+09:00', applyEndAt: '2026-05-15T23:59:59+09:00', capacity: 20, registeredCount: 20, isVisible: true, summary: '현직자 1:1 이력서 첨삭' },
]

export const mockRegistrations: LectureRegistration[] = [
  { registrationId: 'lec_1_u_101', lectureId: 'lec_1', uid: 'u_101', userEmail: 'sohee@grad42.dev', name: '이소희', studentId: '20190112', major: '컴퓨터공학과', phone: '010-1111-2222', question: '비전공자도 도움이 될까요?', status: 'registered', emailSent: true, createdAt: '2026-06-12T10:00:00+09:00', updatedAt: '2026-06-12T10:00:00+09:00' },
  { registrationId: 'lec_1_u_102', lectureId: 'lec_1', uid: 'u_102', userEmail: 'minjun@grad42.dev', name: '박민준', studentId: '20180233', major: '전자공학과', phone: '010-3333-4444', question: null, status: 'registered', emailSent: false, createdAt: '2026-06-13T14:20:00+09:00', updatedAt: '2026-06-13T14:20:00+09:00' },
  { registrationId: 'lec_1_u_103', lectureId: 'lec_1', uid: 'u_103', userEmail: 'jiwoo@grad42.dev', name: '최지우', studentId: '20200455', major: '산업공학과', phone: '010-7777-8888', question: '포트폴리오 링크를 미리 준비할까요?', status: 'cancelled', emailSent: true, createdAt: '2026-06-11T09:30:00+09:00', updatedAt: '2026-06-14T09:30:00+09:00' },
]

export const mockMyLectureRegistrations: {
  registrationId: string
  lectureId: string
  title: string
  startsAt: string
  status: RegistrationStatus
  updatedAt: string
}[] = [
  { registrationId: 'lec_1_u_101', lectureId: 'lec_1', title: 'IT 대기업 취업 전략과 포트폴리오', startsAt: '2026-06-25T19:00:00+09:00', status: 'registered', updatedAt: '2026-06-12T10:00:00+09:00' },
]
