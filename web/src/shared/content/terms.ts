/**
 * Service-level legal documents. Text is carried over verbatim from the
 * Flutter app (features/reservation/presentation/reservation_screen.dart) so
 * the agreement a user gives here means the same thing it did there.
 *
 * Content, not UI: screens render these, they never inline the wording.
 */
export interface TermsDocument {
  id: string
  /** Label on the consent row. */
  title: string
  /** Required consents block the flow; optional ones never do. */
  isRequired: boolean
  /** The one line beside its checkbox: what agreeing commits to. */
  summary?: string
  /** "## " starts a part, "제n조" an article (TermsViewer sets both as headings). */
  body: string
}

/**
 * The gown counter's rules and the site's terms of use as one consent: the
 * rules first (what the student is actually signing up to — the 15만 원 among
 * them), then the general terms. The rules restate the 예약 flow's guide
 * (features/reservation/content/guide.ts); a change there needs one here.
 */
export const RENTAL_TERMS: TermsDocument = {
  id: 'rental',
  title: '대여 규정·이용약관',
  isRequired: true,
  summary: '분실하면 15만 원 변상해요 · 수정 기간이 끝나면 바꿀 수 없어요',
  body: `## 대여 규정
제1조 (수령과 반납)
1. 예약한 수령 시간과 반납 시간에 제1학생회관 3층 320호로 방문합니다.
2. 수령할 때 실물 학생증 하나를 보증물로 맡기고, 반납할 때 돌려받습니다. 실물 학생증이 없으면 실물 신분증을 맡기고, 본인 확인을 위해 모바일 학생증이나 재학증명서를 보여 줍니다.
3. 모바일 학생증은 보증물을 대신할 수 없습니다.

제2조 (예약과 대리 수령)
1. 한 사람은 본인 몫 하나만 예약할 수 있으며, 단체로 방문하더라도 모든 인원이 각자 예약해야 합니다.
2. 본인이 아닌 다른 재학생이 대신 받는 경우, 예약할 때 대리 수령자 정보를 미리 적어야 합니다. 대리 수령자는 예약한 다른 재학생이어야 하며, 외부인은 대신 받을 수 없습니다.
3. 대리 수령자는 신청자의 예약 시간에 방문하여 받고, 반납도 대신할 수 있습니다.

제3조 (변경과 취소)
1. 수령·반납 시간과 사이즈의 변경, 예약 취소는 수정 기간 안에서만 할 수 있습니다.
2. 학위복 재고에 따라 예약이 예정보다 일찍 마감될 수 있습니다.

제4조 (분실·파손)
1. 대여한 학위복(가운·학사모)을 분실하면 대여자 본인이 15만 원을 변상합니다.
2. 파손된 경우에도 위원회의 회칙에 따라 변상 책임을 집니다.

## 서비스 이용약관
제1조 (목적)
본 약관은 서울과학기술대학교 총졸업준비위원회(이하 '위원회')가 제공하는 총졸업준비위원회 홈페이지(이하 '서비스')의 이용 조건 및 절차, 이용자와 위원회의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.

제2조 (서비스의 제공 및 변경)
1. '위원회'는 졸업 관련 공지사항 전달, 학사 일정 공유, 학위복 대여 예약 등의 서비스를 제공합니다.
2. 본 서비스는 학생들의 편의를 위해 개발된 시스템으로, '위원회'의 운영 정책에 따라 서비스 내용이 변경되거나 중단될 수 있습니다.

제3조 (이용자의 의무 및 학위복 대여 수칙)
1. 이용자는 서비스 이용 시 정확한 본인의 정보(이름, 학번, 연락처 등)를 입력해야 합니다.
2. 타인의 정보를 도용하거나 비정상적인 방법으로 예약 시스템을 조작하는 행위를 금지합니다.
3. 대여 예약은 위원회가 정한 기준에 따라 확정되며, 상황에 따라 변경될 수 있습니다.
4. 학위복 대여 등 예약 서비스를 이용할 경우, 정해진 일정과 수칙을 준수해야 합니다.
5. 대여 물품의 파손 또는 분실 시 '위원회'의 회칙에 따라 변상 책임을 집니다.

제4조 (책임의 제한)
1. 본 서비스는 학생 프로젝트로 개발되었으며, 시스템 오류, 서버 중단, 데이터 누락 등으로 인해 발생한 직접적/간접적 손해에 대해 '위원회'와 개발자는 고의가 없는 한 책임을 지지 않습니다.
2. 서비스 내 게시된 졸업 관련 정보는 학교 공식 학사 공지와 다를 수 있으므로, 이용자는 반드시 학교 공식 홈페이지를 통해 최종 확인해야 합니다. 정보의 불일치로 인한 불이익은 이용자 본인에게 있습니다.

제5조 (약관의 변경)
'위원회'는 운영상 필요하다고 판단되는 경우 본 약관을 변경할 수 있으며, 약관이 변경된 경우 '위원회'는 서비스 내 공지사항을 통해 변경 사실 및 내용을 고지합니다. 변경된 약관은 고지된 시점부터 효력이 발생합니다.`,
}

export const PRIVACY_POLICY: TermsDocument = {
  id: 'privacy',
  title: '개인정보 수집·이용',
  isRequired: true,
  summary: '이름·학번·학과·전화번호, 1년 보관',
  body: `## 1. 수집하는 개인정보 항목
• 필수 항목: 성명, 학번, 학과, 휴대전화 번호
• 대리 수령을 신청하는 경우: 대리 수령자의 성명, 휴대전화 번호
• 서비스 이용 과정에서 생성되는 정보: 예약·변경·취소 기록과 그 일시, 로그인한 구글 계정의 이메일 주소

## 2. 개인정보의 수집 및 이용 목적
• 이용자 식별 및 본인 확인
• 학위복 대여 예약 관리 및 미반납 시 연락
• 대리 수령 시 수령자 확인 및 연락

## 3. 개인정보의 보유 및 이용 기간
• 원칙적으로 수집일로부터 1년 동안 보관합니다.
• 보유 기간이 경과하거나 이용 목적이 달성된 경우, 해당 정보는 지체 없이 복구 불가능한 방법으로 파기합니다.

## 4. 동의 거부권 및 불이익
이용자는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 단, 필수 정보 수집에 동의하지 않을 경우 학위복 예약 및 관련 서비스 이용이 제한될 수 있습니다.`,
}

/** Consents the reservation flow asks for, in display order. */
export const RESERVATION_TERMS: TermsDocument[] = [RENTAL_TERMS, PRIVACY_POLICY]

/*
 * St:talk has its own pair (MNT-10): the programme's rules differ from the
 * gown counter's, and the data collected differs too. Wording follows the
 * Flutter recruit screen, with the v2 additions (학년, 계정 이메일) spelled out.
 */

export const MENTORING_TERMS_OF_SERVICE: TermsDocument = {
  id: 'mentoring-tos',
  title: 'St:talk 이용약관',
  isRequired: true,
  summary: 'EPIC Folio에서도 따로 신청해요 · 신청 기간이 끝나면 바꿀 수 없어요',
  body: `제1조 (목적)
본 약관은 총졸업준비위원회 홈페이지를 통해 제공되는 St:talk 신청 절차와 참여 조건을 안내하기 위한 것입니다.

제2조 (신청 안내)
1. 신청자는 본인 정보를 정확하게 입력해야 합니다.
2. 신청 기간 안에만 신청·변경·취소를 할 수 있습니다.
3. 1차시와 2차시에서 각각 하나씩 선택해야 신청이 완료됩니다. 한 차시만 참여한다면 다른 차시는 '선택 안함'을 고릅니다.
4. 같은 선택지는 1차시와 2차시에서 중복 선택할 수 없습니다.
5. 장소는 신청 화면에 안내된 행사 장소입니다.
6. 세부 운영 안내는 추후 공지를 통해 전달됩니다.

제3조 (참여 방법)
1. 신청 완료 후, 행사 당일 행사 장소로 방문합니다.
2. 원활한 진행을 위해 시작 시간 최소 5분 전 도착을 권장합니다.
3. 운영자의 안내에 따라 프로그램이 진행됩니다.

제4조 (유의사항)
1. 입력한 정보가 실제 신청 정보와 다를 경우 참여가 제한될 수 있습니다.
2. 신청 기간 이후에는 항목을 변경할 수 없습니다.
3. 본 신청과 별도로 EPIC Folio에 접속하여 해당 프로그램을 반드시 신청해야 합니다.
4. EPIC Folio에서는 아래 두 가지 방법 중 하나로 신청합니다.
   - 학습활동 → 교내 비교과 → 총졸업준비위원회 동문 선배들과의 취업 진로 테이블 토크 ST:alk_ST동문특강
   - 비교과 신청 프로그램 바로가기 → 총졸업준비위원회 동문 선배들과의 취업 진로 테이블 토크 ST:alk_ST동문특강
5. EPIC Folio 신청을 하지 않을 경우, EPIC 점수를 받을 수 없습니다.
6. 운영 상황에 따라 일정 및 구성은 일부 변경될 수 있습니다.

제5조 (문의)
문의 사항은 총졸업준비위원회 인스타그램(@grad_seoultech)으로 연락 바랍니다.`,
}

export const MENTORING_PRIVACY_POLICY: TermsDocument = {
  id: 'mentoring-privacy',
  title: '개인정보 수집·이용',
  isRequired: true,
  summary: '이름·학번·학과·학년·연락처, 위원회 임기 동안 보관',
  body: `## 1. 수집 항목
• 이름, 학번, 학과, 학년, 연락처
• 로그인한 구글 계정의 이메일 주소

## 2. 이용 목적
• St:talk 신청자 확인
• 차시 운영 및 참가자 명단 작성
• 신청 현황 관리와 행사 안내 연락

## 3. 보관 기간
• 제42대 총졸업준비위원회 운영 기간 동안 보관한 뒤 파기합니다.

## 4. 동의 거부권
• 개인정보 수집 및 이용에 동의하지 않을 경우 신청이 제한될 수 있습니다.`,
}

/** Consents the St:talk flow asks for, in display order. */
export const MENTORING_TERMS: TermsDocument[] = [MENTORING_TERMS_OF_SERVICE, MENTORING_PRIVACY_POLICY]
