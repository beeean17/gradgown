-- gradgown schema: 11 tables.
-- Design and the Firestore mapping: docs/decisions/data-model.md
-- Requirement IDs (RES-nn, MNT-nn) refer to the grad42 requirement documents.
--
-- Conventions
--   * Every point in time is a TIMESTAMP (an instant, like a Firestore
--     Timestamp). The server zone is +09:00 (db/conf/gradgown.cnf).
--   * No ON DELETE / ON UPDATE actions. Every foreign key is RESTRICT, so a
--     referenced row cannot be removed. MySQL also forbids referential actions
--     on columns used in a CHECK constraint.
--   * A "marker" column is a generated column that is 1 for the rows a UNIQUE
--     key must count and NULL for the rest. UNIQUE ignores NULL, so the key
--     applies to the counted rows only.

USE gradgown;

-- ---------------------------------------------------------------------------
-- Shared
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  email         VARCHAR(254) NOT NULL,
  role          ENUM('student', 'admin', 'master') NOT NULL DEFAULT 'student',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------
-- Gown rental: period -> slot -> reservation
-- ---------------------------------------------------------------------------

CREATE TABLE gown_periods (
  id              CHAR(7)   NOT NULL COMMENT 'YYYY-MM',
  is_open         BOOLEAN   NOT NULL DEFAULT FALSE,
  apply_starts_at TIMESTAMP NOT NULL,
  apply_ends_at   TIMESTAMP NOT NULL,
  edit_starts_at  TIMESTAMP NOT NULL,
  edit_ends_at    TIMESTAMP NOT NULL,
  is_current      BOOLEAN   NOT NULL DEFAULT FALSE,
  -- At most one period is the current one.
  current_marker  TINYINT GENERATED ALWAYS AS (IF(is_current, 1, NULL)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gown_periods_current (current_marker),
  CONSTRAINT ck_gown_periods_id CHECK (id REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT ck_gown_periods_apply CHECK (apply_starts_at < apply_ends_at),
  CONSTRAINT ck_gown_periods_edit CHECK (edit_starts_at < edit_ends_at)
) ENGINE = InnoDB;

CREATE TABLE gown_slots (
  id        BIGINT    NOT NULL AUTO_INCREMENT,
  period_id CHAR(7)   NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at   TIMESTAMP NOT NULL,
  enabled   BOOLEAN   NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gown_slots_period_start (period_id, starts_at),
  -- Target of the composite foreign keys in gown_reservations. A foreign key
  -- must reference a unique key (MySQL 8.4 enforces this by default).
  UNIQUE KEY uq_gown_slots_id_period (id, period_id),
  CONSTRAINT fk_gown_slots_period FOREIGN KEY (period_id) REFERENCES gown_periods (id),
  CONSTRAINT ck_gown_slots_time CHECK (starts_at < ends_at)
) ENGINE = InnoDB;

CREATE TABLE gown_reservations (
  id              BIGINT      NOT NULL AUTO_INCREMENT,
  user_id         BIGINT      NOT NULL,
  period_id       CHAR(7)     NOT NULL,
  rent_slot_id    BIGINT      NOT NULL,
  return_slot_id  BIGINT      NOT NULL,
  status          ENUM('reserved', 'cancelled') NOT NULL DEFAULT 'reserved',
  name            VARCHAR(60) NOT NULL,
  student_id      VARCHAR(30) NOT NULL,
  department      VARCHAR(60) NOT NULL,
  phone           VARCHAR(30) NOT NULL,
  size            ENUM('s', 'm', 'l') NOT NULL,
  is_proxy        BOOLEAN     NOT NULL DEFAULT FALSE,
  proxy_name      VARCHAR(60) NULL DEFAULT NULL,
  proxy_phone     VARCHAR(30) NULL DEFAULT NULL,
  created_by      BIGINT      NOT NULL,
  -- Optimistic lock (RES-24). The server adds 1 on every change.
  version         INT         NOT NULL DEFAULT 1,
  created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reserved_marker TINYINT GENERATED ALWAYS AS (IF(status = 'reserved', 1, NULL)) VIRTUAL,
  PRIMARY KEY (id),
  -- RES-22: one reserved reservation per user and period. Cancelled rows have
  -- a NULL marker, so they neither collide nor block a new reservation.
  UNIQUE KEY uq_gown_reservations_active (user_id, period_id, reserved_marker),
  CONSTRAINT fk_gown_reservations_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_gown_reservations_period FOREIGN KEY (period_id) REFERENCES gown_periods (id),
  -- Both slots must belong to the reservation's own period.
  CONSTRAINT fk_gown_reservations_rent_slot
    FOREIGN KEY (rent_slot_id, period_id) REFERENCES gown_slots (id, period_id),
  CONSTRAINT fk_gown_reservations_return_slot
    FOREIGN KEY (return_slot_id, period_id) REFERENCES gown_slots (id, period_id),
  CONSTRAINT fk_gown_reservations_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  -- A proxy pickup carries the proxy's name and phone; otherwise both are NULL.
  CONSTRAINT ck_gown_reservations_proxy CHECK (
    (is_proxy = TRUE AND proxy_name IS NOT NULL AND proxy_phone IS NOT NULL)
    OR (is_proxy = FALSE AND proxy_name IS NULL AND proxy_phone IS NULL)
  )
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------
-- St:talk mentoring: event -> option, session -> registration
-- ---------------------------------------------------------------------------

CREATE TABLE mentoring_events (
  id                      CHAR(7)       NOT NULL COMMENT 'YYYY-MM',
  is_open                 BOOLEAN       NOT NULL DEFAULT FALSE,
  apply_starts_at         TIMESTAMP     NOT NULL,
  apply_ends_at           TIMESTAMP     NOT NULL,
  event_date              DATE          NOT NULL,
  location                VARCHAR(200)  NOT NULL,
  intro                   VARCHAR(3000) NOT NULL DEFAULT '',
  -- A JSON array of strings. Shown as is and never used in a condition.
  notes                   JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  epic_folio_url          VARCHAR(500)  NOT NULL DEFAULT '',
  is_epic_folio_link_open BOOLEAN       NOT NULL DEFAULT FALSE,
  is_current              BOOLEAN       NOT NULL DEFAULT FALSE,
  current_marker          TINYINT GENERATED ALWAYS AS (IF(is_current, 1, NULL)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mentoring_events_current (current_marker),
  CONSTRAINT ck_mentoring_events_id CHECK (id REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT ck_mentoring_events_apply CHECK (apply_starts_at < apply_ends_at)
) ENGINE = InnoDB;

CREATE TABLE mentoring_sessions (
  event_id   CHAR(7)     NOT NULL,
  session_no TINYINT     NOT NULL,
  label      VARCHAR(30) NOT NULL,
  starts_at  TIMESTAMP   NOT NULL,
  ends_at    TIMESTAMP   NOT NULL,
  PRIMARY KEY (event_id, session_no),
  CONSTRAINT fk_mentoring_sessions_event FOREIGN KEY (event_id) REFERENCES mentoring_events (id),
  CONSTRAINT ck_mentoring_sessions_no CHECK (session_no IN (1, 2)),
  CONSTRAINT ck_mentoring_sessions_time CHECK (starts_at < ends_at)
) ENGINE = InnoDB;

CREATE TABLE mentoring_options (
  event_id  CHAR(7)      NOT NULL,
  option_no TINYINT      NOT NULL,
  -- May be empty while the event is closed (MNT-51 is checked by the server).
  name      VARCHAR(200) NOT NULL DEFAULT '',
  PRIMARY KEY (event_id, option_no),
  CONSTRAINT fk_mentoring_options_event FOREIGN KEY (event_id) REFERENCES mentoring_events (id),
  CONSTRAINT ck_mentoring_options_no CHECK (option_no BETWEEN 1 AND 7)
) ENGINE = InnoDB;

CREATE TABLE mentoring_registrations (
  id               BIGINT      NOT NULL AUTO_INCREMENT,
  user_id          BIGINT      NOT NULL,
  event_id         CHAR(7)     NOT NULL,
  -- NULL means "no choice" for that session (0 in the original and in the API).
  first_option_no  TINYINT     NULL DEFAULT NULL,
  second_option_no TINYINT     NULL DEFAULT NULL,
  status           ENUM('reserved', 'cancelled') NOT NULL DEFAULT 'reserved',
  name             VARCHAR(60) NOT NULL,
  department       VARCHAR(60) NOT NULL,
  student_id       VARCHAR(30) NOT NULL,
  grade            TINYINT     NOT NULL,
  phone            VARCHAR(30) NOT NULL,
  -- The applicant's e-mail is users.email. It is not copied here.
  created_by       BIGINT      NOT NULL,
  -- Optimistic lock (MNT-23). The server adds 1 on every change.
  version          INT         NOT NULL DEFAULT 1,
  created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reserved_marker  TINYINT GENERATED ALWAYS AS (IF(status = 'reserved', 1, NULL)) VIRTUAL,
  PRIMARY KEY (id),
  -- MNT-22: one reserved registration per user and event.
  UNIQUE KEY uq_mentoring_registrations_active (user_id, event_id, reserved_marker),
  CONSTRAINT fk_mentoring_registrations_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_mentoring_registrations_event FOREIGN KEY (event_id) REFERENCES mentoring_events (id),
  -- A chosen option must belong to the registration's own event. A NULL
  -- option makes the pair incomplete, and an incomplete pair is not checked.
  CONSTRAINT fk_mentoring_registrations_first
    FOREIGN KEY (event_id, first_option_no) REFERENCES mentoring_options (event_id, option_no),
  CONSTRAINT fk_mentoring_registrations_second
    FOREIGN KEY (event_id, second_option_no) REFERENCES mentoring_options (event_id, option_no),
  CONSTRAINT fk_mentoring_registrations_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT ck_mentoring_registrations_grade CHECK (grade BETWEEN 1 AND 4),
  -- MNT-25: the two sessions cannot both be "no choice" ...
  CONSTRAINT ck_mentoring_registrations_any CHECK (
    first_option_no IS NOT NULL OR second_option_no IS NOT NULL
  ),
  -- ... and cannot hold the same option. With one side NULL the comparison
  -- is UNKNOWN, which a CHECK accepts.
  CONSTRAINT ck_mentoring_registrations_distinct CHECK (first_option_no <> second_option_no)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

CREATE TABLE announcements (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  title        VARCHAR(200) NOT NULL,
  content      TEXT         NOT NULL,
  category     VARCHAR(30)  NOT NULL DEFAULT '일반',
  is_pinned    BOOLEAN      NOT NULL DEFAULT FALSE,
  is_visible   BOOLEAN      NOT NULL DEFAULT TRUE,
  is_popup     BOOLEAN      NOT NULL DEFAULT FALSE,
  popup_order  INT          NULL DEFAULT NULL,
  show_on_home BOOLEAN      NOT NULL DEFAULT FALSE,
  author_id    BIGINT       NOT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_announcements_author FOREIGN KEY (author_id) REFERENCES users (id)
) ENGINE = InnoDB;

CREATE TABLE faqs (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  question      VARCHAR(500) NOT NULL,
  answer        TEXT         NOT NULL,
  category      VARCHAR(30)  NOT NULL DEFAULT '',
  -- A JSON array of strings. Shown as is and never used in a condition.
  tags          JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  display_order INT          NOT NULL DEFAULT 0,
  is_visible    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------

CREATE TABLE audit_logs (
  -- Chosen by the client, one per submit. The primary key is what stops a
  -- request from being handled twice (RES-25, MNT-24). Compared byte by byte:
  -- two IDs that differ only in letter case are different requests.
  operation_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  domain       VARCHAR(20)  NOT NULL COMMENT 'reservation | mentoring',
  action       VARCHAR(40)  NOT NULL COMMENT 'for example reservation.create',
  actor_id     BIGINT       NOT NULL,
  -- ID of the reservation or registration the command touched. Not a foreign
  -- key: the log must outlive a target that a master deletes. No input values
  -- (name, student ID, phone) are copied here (RES-32, MNT-27).
  target_id    BIGINT       NULL DEFAULT NULL,
  outcome      ENUM('received', 'succeeded', 'rejected', 'failed') NOT NULL DEFAULT 'received',
  failure_kind ENUM('authentication', 'authorization', 'validation', 'business-rule',
                    'not-found', 'duplicate', 'conflict', 'infrastructure', 'internal')
               NULL DEFAULT NULL,
  error_code   VARCHAR(40)  NULL DEFAULT NULL,
  created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at TIMESTAMP(3) NULL DEFAULT NULL,
  PRIMARY KEY (operation_id),
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES users (id)
) ENGINE = InnoDB;
