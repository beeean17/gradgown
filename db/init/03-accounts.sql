-- Database accounts and their privileges.
-- Design and the privilege table: docs/decisions/db-privileges.md
--
-- One account per grade of the original service. The student server connects
-- as gradgown_student; the admin server reads as gradgown_admin and writes as
-- gradgown_master. No account can change the structure of a table: the tables
-- are created by root while the container initialises.
--
-- The passwords are for local development and tests only. This project is not
-- deployed (docs/decisions/local-only.md).

CREATE USER 'gradgown_student'@'%' IDENTIFIED BY 'student-local-only';
CREATE USER 'gradgown_admin'@'%' IDENTIFIED BY 'admin-local-only';
CREATE USER 'gradgown_master'@'%' IDENTIFIED BY 'master-local-only';

-- ---------------------------------------------------------------------------
-- Student: reads the schedule, writes reservations and registrations.
-- No DELETE anywhere. Cancelling changes the status (RES-20, MNT-20).
--
-- UPDATE is granted column by column: only what the student server changes.
-- The owner (user_id), the period or event, and the creation columns cannot
-- be changed, so a bug in the student server cannot move a reservation to
-- another user or period. updated_at is not listed: MySQL sets it itself
-- (ON UPDATE CURRENT_TIMESTAMP) and that needs no privilege.
-- ---------------------------------------------------------------------------

GRANT SELECT ON gradgown.users TO 'gradgown_student'@'%';
GRANT UPDATE (last_login_at) ON gradgown.users TO 'gradgown_student'@'%';

GRANT SELECT ON gradgown.gown_periods TO 'gradgown_student'@'%';
GRANT SELECT ON gradgown.gown_slots TO 'gradgown_student'@'%';
GRANT SELECT, INSERT ON gradgown.gown_reservations TO 'gradgown_student'@'%';
GRANT UPDATE (status, rent_slot_id, return_slot_id, name, student_id, department, phone, size,
              is_proxy, proxy_name, proxy_phone, version)
  ON gradgown.gown_reservations TO 'gradgown_student'@'%';

GRANT SELECT ON gradgown.mentoring_events TO 'gradgown_student'@'%';
GRANT SELECT ON gradgown.mentoring_sessions TO 'gradgown_student'@'%';
GRANT SELECT ON gradgown.mentoring_options TO 'gradgown_student'@'%';
GRANT SELECT, INSERT ON gradgown.mentoring_registrations TO 'gradgown_student'@'%';
GRANT UPDATE (status, first_option_no, second_option_no, name, department, student_id, grade,
              phone, version)
  ON gradgown.mentoring_registrations TO 'gradgown_student'@'%';

-- Announcements through the view only. Nothing on announcements or faqs.
GRANT SELECT ON gradgown.visible_announcements TO 'gradgown_student'@'%';

-- A command inserts its log row first and updates the outcome when it ends.
-- Who asked for what (operation_id, domain, action, actor_id) stays as inserted.
GRANT SELECT, INSERT ON gradgown.audit_logs TO 'gradgown_student'@'%';
GRANT UPDATE (outcome, failure_kind, error_code, target_id, completed_at)
  ON gradgown.audit_logs TO 'gradgown_student'@'%';

-- ---------------------------------------------------------------------------
-- Admin: reads everything, writes nothing.
-- ---------------------------------------------------------------------------

GRANT SELECT ON gradgown.* TO 'gradgown_admin'@'%';

-- ---------------------------------------------------------------------------
-- Master: reads and writes every table. Still no DDL.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON gradgown.* TO 'gradgown_master'@'%';
