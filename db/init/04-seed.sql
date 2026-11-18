-- Seed data for local development.
--
-- Every person here is made up: the names are folk-tale characters, the
-- e-mail addresses use the reserved example.com domain, and the phone numbers
-- and student IDs are placeholders. Never put real personal data in this file.
--
-- The dates are fixed so that a fresh database always looks the same. The
-- current gown period and the current St:talk event accept applications from
-- 2026-11-01 to January 2027.
--
-- Tests do not rely on these rows. They create their own (db/src/test).

SET NAMES utf8mb4;
-- The times below are Seoul times. Without this line they would be read as
-- UTC: the image's entrypoint runs this file on a temporary server started
-- with --default-time-zone=SYSTEM, which overrides db/conf/gradgown.cnf.
SET time_zone = '+09:00';
USE gradgown;

-- ---------------------------------------------------------------------------
-- Test accounts: five students, one admin, one master
-- ---------------------------------------------------------------------------

INSERT INTO users (id, email, role) VALUES
  (1, 'student01@example.com', 'student'),
  (2, 'student02@example.com', 'student'),
  (3, 'student03@example.com', 'student'),
  (4, 'student04@example.com', 'student'),
  (5, 'student05@example.com', 'student'),
  (6, 'admin01@example.com', 'admin'),
  (7, 'master01@example.com', 'master');

-- ---------------------------------------------------------------------------
-- Gown rental
-- ---------------------------------------------------------------------------

INSERT INTO gown_periods
  (id, is_open, apply_starts_at, apply_ends_at, edit_starts_at, edit_ends_at, is_current)
VALUES
  ('2026-08', FALSE, '2026-07-20 09:00:00', '2026-08-07 18:00:00',
                     '2026-08-08 09:00:00', '2026-08-12 18:00:00', FALSE),
  ('2027-02', TRUE,  '2026-11-01 09:00:00', '2027-01-29 18:00:00',
                     '2027-01-30 09:00:00', '2027-02-05 18:00:00', TRUE);

INSERT INTO gown_slots (id, period_id, starts_at, ends_at, enabled) VALUES
  -- 2026-08 (past period)
  (1,  '2026-08', '2026-08-17 10:00:00', '2026-08-17 10:30:00', TRUE),
  (2,  '2026-08', '2026-08-17 10:30:00', '2026-08-17 11:00:00', TRUE),
  (3,  '2026-08', '2026-08-18 10:00:00', '2026-08-18 10:30:00', TRUE),
  (4,  '2026-08', '2026-08-18 10:30:00', '2026-08-18 11:00:00', TRUE),
  -- 2027-02 (current period): three days, four slots a day
  (5,  '2027-02', '2027-02-15 10:00:00', '2027-02-15 10:30:00', TRUE),
  (6,  '2027-02', '2027-02-15 10:30:00', '2027-02-15 11:00:00', TRUE),
  (7,  '2027-02', '2027-02-15 14:00:00', '2027-02-15 14:30:00', TRUE),
  (8,  '2027-02', '2027-02-15 14:30:00', '2027-02-15 15:00:00', TRUE),
  (9,  '2027-02', '2027-02-16 10:00:00', '2027-02-16 10:30:00', TRUE),
  (10, '2027-02', '2027-02-16 10:30:00', '2027-02-16 11:00:00', TRUE),
  (11, '2027-02', '2027-02-16 14:00:00', '2027-02-16 14:30:00', TRUE),
  (12, '2027-02', '2027-02-16 14:30:00', '2027-02-16 15:00:00', TRUE),
  (13, '2027-02', '2027-02-17 10:00:00', '2027-02-17 10:30:00', TRUE),
  (14, '2027-02', '2027-02-17 10:30:00', '2027-02-17 11:00:00', TRUE),
  (15, '2027-02', '2027-02-17 14:00:00', '2027-02-17 14:30:00', TRUE),
  (16, '2027-02', '2027-02-17 14:30:00', '2027-02-17 15:00:00', FALSE);

INSERT INTO gown_reservations
  (id, user_id, period_id, rent_slot_id, return_slot_id, status,
   name, student_id, department, phone, size,
   is_proxy, proxy_name, proxy_phone, created_by, version)
VALUES
  -- A reservation from the past period.
  (1, 1, '2026-08', 1, 3, 'reserved',
   '홍길동', '99990001', '화학공학과', '010-0000-0001', 'm', FALSE, NULL, NULL, 1, 1),
  -- Current period.
  (2, 1, '2027-02', 5, 13, 'reserved',
   '홍길동', '99990001', '화학공학과', '010-0000-0001', 'm', FALSE, NULL, NULL, 1, 1),
  -- Student 2 cancelled once and applied again: two rows, one of them reserved.
  (3, 2, '2027-02', 6, 14, 'cancelled',
   '성춘향', '99990002', '전자공학과', '010-0000-0002', 's', FALSE, NULL, NULL, 2, 2),
  (4, 2, '2027-02', 7, 15, 'reserved',
   '성춘향', '99990002', '전자공학과', '010-0000-0002', 's', FALSE, NULL, NULL, 2, 1),
  -- A proxy pickup.
  (5, 3, '2027-02', 9, 14, 'reserved',
   '이몽룡', '99990003', '기계공학과', '010-0000-0003', 'l', TRUE, '방자', '010-0000-0013', 3, 1);

-- ---------------------------------------------------------------------------
-- St:talk mentoring
-- ---------------------------------------------------------------------------

INSERT INTO mentoring_events
  (id, is_open, apply_starts_at, apply_ends_at, event_date, location,
   intro, notes, epic_folio_url, is_epic_folio_link_open, is_current)
VALUES
  ('2026-05', FALSE, '2026-05-01 09:00:00', '2026-05-15 18:00:00', '2026-05-20',
   '중앙도서관 1층 St:art홀',
   '졸업생 선배와 소그룹으로 진로와 취업 이야기를 나누는 멘토링 행사입니다.',
   JSON_ARRAY('차시마다 멘토 한 명을 고릅니다.'),
   '', FALSE, FALSE),
  ('2027-01', TRUE, '2026-11-01 09:00:00', '2027-01-08 18:00:00', '2027-01-13',
   '중앙도서관 1층 St:art홀',
   '졸업생 선배와 소그룹으로 진로와 취업 이야기를 나누는 멘토링 행사입니다.',
   JSON_ARRAY(
     '차시마다 멘토 한 명을 고릅니다. 두 차시에 같은 멘토를 고를 수 없습니다.',
     '한 차시만 참여하려면 다른 차시는 "선택 안함"으로 둡니다.',
     'EPIC 점수를 받으려면 EPIC Folio에서 따로 신청해야 합니다.'
   ),
   'https://example.com/epic-folio', TRUE, TRUE);

INSERT INTO mentoring_sessions (event_id, session_no, label, starts_at, ends_at) VALUES
  ('2026-05', 1, '1차시', '2026-05-20 15:00:00', '2026-05-20 15:50:00'),
  ('2026-05', 2, '2차시', '2026-05-20 16:00:00', '2026-05-20 16:50:00'),
  ('2027-01', 1, '1차시', '2027-01-13 15:00:00', '2027-01-13 15:50:00'),
  ('2027-01', 2, '2차시', '2027-01-13 16:00:00', '2027-01-13 16:50:00');

INSERT INTO mentoring_options (event_id, option_no, name) VALUES
  ('2026-05', 1, '반도체 공정 엔지니어'),
  ('2026-05', 2, '플랜트 설계 엔지니어'),
  ('2026-05', 3, '공기업 전기직'),
  ('2026-05', 4, '백엔드 개발자'),
  ('2026-05', 5, '건설 시공 관리'),
  ('2026-05', 6, '제약 품질 관리'),
  ('2026-05', 7, '대학원 진학'),
  ('2027-01', 1, '반도체 공정 엔지니어'),
  ('2027-01', 2, '이차전지 소재 연구원'),
  ('2027-01', 3, '공기업 전기직'),
  ('2027-01', 4, '백엔드 개발자'),
  ('2027-01', 5, '건설 시공 관리'),
  ('2027-01', 6, '제약 품질 관리'),
  ('2027-01', 7, '대학원 진학');

INSERT INTO mentoring_registrations
  (id, user_id, event_id, first_option_no, second_option_no, status,
   name, department, student_id, grade, phone, created_by, version)
VALUES
  -- A registration from the past event.
  (1, 1, '2026-05', 2, 4, 'reserved',
   '홍길동', '화학공학과', '99990001', 4, '010-0000-0001', 1, 1),
  -- Current event.
  (2, 1, '2027-01', 1, 3, 'reserved',
   '홍길동', '화학공학과', '99990001', 4, '010-0000-0001', 1, 1),
  -- Second session only.
  (3, 2, '2027-01', NULL, 2, 'reserved',
   '성춘향', '전자공학과', '99990002', 3, '010-0000-0002', 2, 1),
  -- Student 3 cancelled once and applied again.
  (4, 3, '2027-01', 2, 5, 'cancelled',
   '이몽룡', '기계공학과', '99990003', 2, '010-0000-0003', 3, 2),
  (5, 3, '2027-01', 5, 2, 'reserved',
   '이몽룡', '기계공학과', '99990003', 2, '010-0000-0003', 3, 1),
  -- First session only.
  (6, 4, '2027-01', 1, NULL, 'reserved',
   '심청', '건축학부', '99990004', 1, '010-0000-0004', 4, 1);
-- Student 5 has neither a reservation nor a registration: an account for trying
-- the whole application flow from the start.

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

INSERT INTO announcements
  (id, title, content, category, is_pinned, is_visible, is_popup, popup_order, show_on_home, author_id)
VALUES
  (1, '2027년 2월 학위복 대여 안내',
   '학위복 대여 신청을 받습니다. 대여와 반납 시간을 골라 신청해 주세요.',
   'notice', TRUE, TRUE, FALSE, NULL, TRUE, 7),
  (2, 'St:talk 멘토링 신청 안내',
   '졸업생 초청 멘토링 St:talk 신청을 받습니다. 차시마다 멘토 한 명을 고를 수 있습니다.',
   'notice', FALSE, TRUE, TRUE, 1, FALSE, 7),
  -- Hidden: must not appear in visible_announcements.
  (3, '(작성 중) 반납 장소 변경 안내',
   '아직 공개하지 않은 공지입니다.',
   'notice', FALSE, FALSE, FALSE, NULL, FALSE, 7);

INSERT INTO faqs (id, question, answer, category, tags, display_order, is_visible) VALUES
  (1, '다른 사람이 대신 받아도 되나요?',
   '신청할 때 대리 수령을 고르고 대리인의 이름과 전화번호를 적으면 됩니다.',
   '학위복', JSON_ARRAY('학위복', '대리 수령'), 1, TRUE),
  (2, 'St:talk은 한 차시만 들어도 되나요?',
   '됩니다. 듣지 않는 차시는 "선택 안함"으로 두고 신청하세요.',
   'St:talk', JSON_ARRAY('St:talk'), 2, TRUE);
