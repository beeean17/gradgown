-- Rows the schema and privilege tests build on. The test container runs this
-- file after db/init (as 90-test-fixture.sql), so it is committed before the
-- first test. The IDs are mirrored in Fixture.java.
--
-- Everything is far from the seed data: IDs from 9001, year 2037, and the
-- reserved .example domain. The year stays below 2038, the end of the
-- TIMESTAMP range.

-- The times below are Seoul times (see db/init/04-seed.sql).
SET time_zone = '+09:00';
USE gradgown;

INSERT INTO users (id, email, role) VALUES
  (9001, 'student-a@fixture.example', 'student'),
  (9002, 'student-b@fixture.example', 'student'),
  (9003, 'master@fixture.example', 'master');

-- Two gown periods. Neither is the current one.
INSERT INTO gown_periods
  (id, is_open, apply_starts_at, apply_ends_at, edit_starts_at, edit_ends_at, is_current)
VALUES
  ('2037-01', TRUE, '2037-01-01 09:00:00', '2037-01-10 18:00:00',
                    '2037-01-11 09:00:00', '2037-01-15 18:00:00', FALSE),
  ('2037-02', TRUE, '2037-02-01 09:00:00', '2037-02-10 18:00:00',
                    '2037-02-11 09:00:00', '2037-02-15 18:00:00', FALSE);

INSERT INTO gown_slots (id, period_id, starts_at, ends_at, enabled) VALUES
  (9001, '2037-01', '2037-01-20 10:00:00', '2037-01-20 10:30:00', TRUE),
  (9002, '2037-01', '2037-01-21 10:00:00', '2037-01-21 10:30:00', TRUE),
  (9003, '2037-02', '2037-02-20 10:00:00', '2037-02-20 10:30:00', TRUE),
  (9004, '2037-02', '2037-02-21 10:00:00', '2037-02-21 10:30:00', TRUE);

-- Two events. 2037-01 has all seven options, 2037-02 only options 1 to 3, so
-- "option 5" exists in one event and not in the other.
INSERT INTO mentoring_events
  (id, is_open, apply_starts_at, apply_ends_at, event_date, location, is_current)
VALUES
  ('2037-01', TRUE, '2037-01-01 09:00:00', '2037-01-10 18:00:00', '2037-01-20', 'Fixture hall', FALSE),
  ('2037-02', TRUE, '2037-02-01 09:00:00', '2037-02-10 18:00:00', '2037-02-20', 'Fixture hall', FALSE);

INSERT INTO mentoring_sessions (event_id, session_no, label, starts_at, ends_at) VALUES
  ('2037-01', 1, 'Session 1', '2037-01-20 15:00:00', '2037-01-20 15:50:00'),
  ('2037-01', 2, 'Session 2', '2037-01-20 16:00:00', '2037-01-20 16:50:00');

INSERT INTO mentoring_options (event_id, option_no, name) VALUES
  ('2037-01', 1, 'Option 1'),
  ('2037-01', 2, 'Option 2'),
  ('2037-01', 3, 'Option 3'),
  ('2037-01', 4, 'Option 4'),
  ('2037-01', 5, 'Option 5'),
  ('2037-01', 6, 'Option 6'),
  ('2037-01', 7, 'Option 7'),
  ('2037-02', 1, 'Option 1'),
  ('2037-02', 2, 'Option 2'),
  ('2037-02', 3, 'Option 3');
