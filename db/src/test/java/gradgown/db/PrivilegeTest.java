package gradgown.db;

import static gradgown.db.Fixture.EVENT_FULL;
import static gradgown.db.Fixture.PERIOD_1;
import static gradgown.db.Fixture.SLOT_1A;
import static gradgown.db.Fixture.SLOT_1B;
import static gradgown.db.Fixture.STUDENT_A;
import static gradgown.db.Fixture.insertAuditLog;
import static gradgown.db.Fixture.insertRegistration;
import static gradgown.db.Fixture.insertReservation;
import static gradgown.db.Sql.assertRejected;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import gradgown.db.MySqlTestDatabase.Account;
import gradgown.db.Sql.ErrorCode;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Layer 2 of docs/testing/dynamic.md: each database account can do what the privilege table in
 * docs/decisions/db-privileges.md says, and nothing more. Every test connects as the account it is
 * about.
 *
 * <p>MySQL checks privileges before it runs a statement, so a statement that would change no row
 * ({@code WHERE 1 = 0}) is enough to show a denial. Allowed writes run for real and are rolled
 * back.
 */
class PrivilegeTest {

  /** Every table, with a column to use in a no-op UPDATE. */
  private static final Map<String, String> TABLES =
      Map.ofEntries(
          Map.entry("users", "role"),
          Map.entry("gown_periods", "is_open"),
          Map.entry("gown_slots", "enabled"),
          Map.entry("gown_reservations", "name"),
          Map.entry("mentoring_events", "is_open"),
          Map.entry("mentoring_sessions", "label"),
          Map.entry("mentoring_options", "name"),
          Map.entry("mentoring_registrations", "name"),
          Map.entry("announcements", "title"),
          Map.entry("faqs", "question"),
          Map.entry("audit_logs", "outcome"));

  static Stream<String> tables() {
    return TABLES.keySet().stream().sorted();
  }

  /** The three kinds of write, as statements that touch no row. */
  static Stream<String> writesToEveryTable() {
    return tables().flatMap(PrivilegeTest::writesTo);
  }

  private static Stream<String> writesTo(String table) {
    String column = TABLES.get(table);
    return Stream.of(
        "INSERT INTO " + table + " () VALUES ()",
        "UPDATE " + table + " SET " + column + " = " + column + " WHERE 1 = 0",
        "DELETE FROM " + table + " WHERE 1 = 0");
  }

  /** Statements that change the structure of the database. No account may run them. */
  static Stream<String> structureChanges() {
    return Stream.of(
        "CREATE TABLE privilege_probe (id INT PRIMARY KEY)",
        "ALTER TABLE gown_reservations ADD COLUMN privilege_probe INT",
        "DROP TABLE faqs",
        "CREATE VIEW privilege_probe AS SELECT id FROM users",
        "DROP VIEW visible_announcements");
  }

  // --------------------------------------------------------------------------

  @Nested
  @DisplayName("student account")
  class Student {

    static Stream<String> scheduleWrites() {
      return Stream.of(
              "gown_periods",
              "gown_slots",
              "mentoring_events",
              "mentoring_sessions",
              "mentoring_options")
          .flatMap(PrivilegeTest::writesTo);
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(
        strings = {
          "users",
          "gown_periods",
          "gown_slots",
          "gown_reservations",
          "mentoring_events",
          "mentoring_sessions",
          "mentoring_options",
          "mentoring_registrations",
          "visible_announcements",
          "audit_logs"
        })
    @DisplayName("may read")
    void mayRead(String table) throws SQLException {
      try (Connection db = MySqlTestDatabase.connect(Account.STUDENT)) {
        assertTrue(Sql.number(db, "SELECT COUNT(*) FROM " + table) >= 0);
      }
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"announcements", "faqs"})
    @DisplayName("may not read the table directly")
    void mayNotRead(String table) throws SQLException {
      try (Connection db = MySqlTestDatabase.connect(Account.STUDENT)) {
        assertRejected(
            ErrorCode.TABLE_ACCESS_DENIED, () -> Sql.number(db, "SELECT COUNT(*) FROM " + table));
      }
    }

    @Test
    @DisplayName("may insert and update its reservations and registrations")
    void mayWriteReservationsAndRegistrations() throws SQLException {
      inTransaction(
          Account.STUDENT,
          db -> {
            insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1A, SLOT_1B);
            assertEquals(
                1,
                Sql.update(
                    db,
                    """
                    UPDATE gown_reservations
                    SET status = 'cancelled', version = version + 1
                    WHERE user_id = ? AND period_id = ?
                    """,
                    STUDENT_A,
                    PERIOD_1));

            insertRegistration(db, STUDENT_A, EVENT_FULL, 1, 2);
            assertEquals(
                1,
                Sql.update(
                    db,
                    """
                    UPDATE mentoring_registrations
                    SET second_option_no = 3, version = version + 1
                    WHERE user_id = ? AND event_id = ?
                    """,
                    STUDENT_A,
                    EVENT_FULL));
          });
    }

    @Test
    @DisplayName("may insert an audit log row and update its outcome")
    void mayWriteAuditLogs() throws SQLException {
      inTransaction(
          Account.STUDENT,
          db -> {
            insertAuditLog(db, "privilege-test-operation-1", STUDENT_A);
            assertEquals(
                1,
                Sql.update(
                    db,
                    """
                    UPDATE audit_logs
                    SET outcome = 'succeeded', completed_at = CURRENT_TIMESTAMP(3)
                    WHERE operation_id = ?
                    """,
                    "privilege-test-operation-1"));
          });
    }

    @Test
    @DisplayName("may update a user's last login time and no other column")
    void mayUpdateLastLoginOnly() throws SQLException {
      inTransaction(
          Account.STUDENT,
          db -> {
            assertEquals(
                1,
                Sql.update(
                    db,
                    "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
                    STUDENT_A));

            assertRejected(
                ErrorCode.COLUMN_ACCESS_DENIED,
                () -> Sql.update(db, "UPDATE users SET role = 'master' WHERE id = ?", STUDENT_A));
            assertRejected(
                ErrorCode.COLUMN_ACCESS_DENIED,
                () ->
                    Sql.update(
                        db, "UPDATE users SET email = 'x@fixture.example' WHERE id = ?", STUDENT_A));
          });
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(
        strings = {
          "DELETE FROM gown_reservations WHERE 1 = 0",
          "DELETE FROM mentoring_registrations WHERE 1 = 0",
          "DELETE FROM audit_logs WHERE 1 = 0",
          "DELETE FROM users WHERE 1 = 0",
          "INSERT INTO users () VALUES ()",
          "UPDATE visible_announcements SET title = title WHERE 1 = 0",
          "DELETE FROM visible_announcements WHERE 1 = 0"
        })
    @DisplayName("may not delete anything, add users, or write through the view")
    void mayNotDelete(String statement) throws SQLException {
      assertDenied(Account.STUDENT, statement);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("scheduleWrites")
    @DisplayName("may not write periods, slots, events, sessions or options")
    void mayNotWriteSchedule(String statement) throws SQLException {
      assertDenied(Account.STUDENT, statement);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("gradgown.db.PrivilegeTest#structureChanges")
    @DisplayName("may not change the structure")
    void mayNotChangeStructure(String statement) throws SQLException {
      assertDenied(Account.STUDENT, statement);
    }
  }

  // --------------------------------------------------------------------------

  @Nested
  @DisplayName("admin account")
  class Admin {

    @ParameterizedTest(name = "{0}")
    @MethodSource("gradgown.db.PrivilegeTest#tables")
    @DisplayName("may read every table")
    void mayRead(String table) throws SQLException {
      try (Connection db = MySqlTestDatabase.connect(Account.ADMIN)) {
        assertTrue(Sql.number(db, "SELECT COUNT(*) FROM " + table) >= 0);
      }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("gradgown.db.PrivilegeTest#writesToEveryTable")
    @DisplayName("may not write any table")
    void mayNotWrite(String statement) throws SQLException {
      assertDenied(Account.ADMIN, statement);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("gradgown.db.PrivilegeTest#structureChanges")
    @DisplayName("may not change the structure")
    void mayNotChangeStructure(String statement) throws SQLException {
      assertDenied(Account.ADMIN, statement);
    }
  }

  // --------------------------------------------------------------------------

  @Nested
  @DisplayName("master account")
  class Master {

    @ParameterizedTest(name = "{0}")
    @MethodSource("gradgown.db.PrivilegeTest#tables")
    @DisplayName("may read, update and delete in every table")
    void mayReadUpdateDelete(String table) throws SQLException {
      String column = TABLES.get(table);
      inTransaction(
          Account.MASTER,
          db -> {
            assertTrue(Sql.number(db, "SELECT COUNT(*) FROM " + table) >= 0);
            Sql.update(db, "UPDATE " + table + " SET " + column + " = " + column + " WHERE 1 = 0");
            Sql.update(db, "DELETE FROM " + table + " WHERE 1 = 0");
          });
    }

    @Test
    @DisplayName("may insert rows and delete a reservation for good")
    void mayInsertAndDelete() throws SQLException {
      inTransaction(
          Account.MASTER,
          db -> {
            insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1A, SLOT_1B);
            insertRegistration(db, STUDENT_A, EVENT_FULL, 1, 2);
            insertAuditLog(db, "privilege-test-operation-2", Fixture.MASTER_USER);
            Sql.update(
                db,
                "INSERT INTO announcements (title, content, author_id) VALUES ('t', 'c', ?)",
                Fixture.MASTER_USER);
            Sql.update(db, "INSERT INTO faqs (question, answer) VALUES ('q', 'a')");

            assertEquals(
                1, Sql.update(db, "DELETE FROM gown_reservations WHERE user_id = ?", STUDENT_A));
            assertEquals(
                1,
                Sql.update(db, "DELETE FROM mentoring_registrations WHERE user_id = ?", STUDENT_A));
          });
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("gradgown.db.PrivilegeTest#structureChanges")
    @DisplayName("may not change the structure")
    void mayNotChangeStructure(String statement) throws SQLException {
      assertDenied(Account.MASTER, statement);
    }
  }

  // --------------------------------------------------------------------------

  @Test
  @DisplayName("the view shows a student visible announcements only")
  void viewHidesHiddenAnnouncements() throws SQLException {
    // Committed, because another connection has to see the rows. Removed at the end.
    try (Connection master = MySqlTestDatabase.connect(Account.MASTER)) {
      Sql.update(
          master,
          """
          INSERT INTO announcements (title, content, is_visible, author_id) VALUES
            ('privilege-test visible', 'shown', TRUE, ?),
            ('privilege-test hidden', 'not shown', FALSE, ?)
          """,
          Fixture.MASTER_USER,
          Fixture.MASTER_USER);
      try (Connection student = MySqlTestDatabase.connect(Account.STUDENT)) {
        List<String> titles =
            Sql.strings(
                student,
                "SELECT title FROM visible_announcements WHERE title LIKE 'privilege-test%'");

        assertEquals(List.of("privilege-test visible"), titles);
        // The view does not expose the flag it filters on.
        assertFalse(
            Sql.strings(
                    student,
                    """
                    SELECT column_name FROM information_schema.columns
                    WHERE table_schema = 'gradgown' AND table_name = 'visible_announcements'
                    """)
                .contains("is_visible"));
      } finally {
        Sql.update(master, "DELETE FROM announcements WHERE title LIKE 'privilege-test%'");
      }
    }
  }

  // --- Helpers --------------------------------------------------------------

  @FunctionalInterface
  private interface Work {
    void run(Connection db) throws SQLException;
  }

  /** Runs the work as the account in a transaction and rolls it back. */
  private static void inTransaction(Account account, Work work) throws SQLException {
    try (Connection db = MySqlTestDatabase.connect(account)) {
      db.setAutoCommit(false);
      try {
        work.run(db);
      } finally {
        db.rollback();
      }
    }
  }

  /** Asserts that the account lacks the table privilege the statement needs. */
  private static void assertDenied(Account account, String statement) throws SQLException {
    try (Connection db = MySqlTestDatabase.connect(account)) {
      assertRejected(ErrorCode.TABLE_ACCESS_DENIED, () -> Sql.update(db, statement));
    }
  }
}
