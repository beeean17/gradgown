package gradgown.db;

import static gradgown.db.Fixture.EVENT_FULL;
import static gradgown.db.Fixture.EVENT_PARTIAL;
import static gradgown.db.Fixture.PERIOD_1;
import static gradgown.db.Fixture.PERIOD_2;
import static gradgown.db.Fixture.SLOT_1A;
import static gradgown.db.Fixture.SLOT_1B;
import static gradgown.db.Fixture.SLOT_2A;
import static gradgown.db.Fixture.SLOT_2B;
import static gradgown.db.Fixture.STUDENT_A;
import static gradgown.db.Fixture.STUDENT_B;
import static gradgown.db.Fixture.insertAuditLog;
import static gradgown.db.Fixture.insertRegistration;
import static gradgown.db.Fixture.insertReservation;
import static gradgown.db.Sql.assertRejected;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import gradgown.db.MySqlTestDatabase.Account;
import gradgown.db.Sql.ErrorCode;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Layer 1 of docs/testing/dynamic.md: the schema itself keeps the rules that the original service
 * checked in Cloud Functions code (docs/decisions/data-model.md). Each rule is shown both ways:
 * what MySQL rejects and what it accepts.
 *
 * <p>Runs as the master account, which may read and write every table. Each test runs in a
 * transaction that is rolled back.
 */
class SchemaConstraintTest {

  private Connection db;

  @BeforeEach
  void openTransaction() throws SQLException {
    db = MySqlTestDatabase.connect(Account.MASTER);
    db.setAutoCommit(false);
  }

  @AfterEach
  void rollBack() throws SQLException {
    db.rollback();
    db.close();
  }

  // --- The scripts apply ----------------------------------------------------

  @Test
  @DisplayName("db/init creates the 11 tables and the view on an empty database")
  void initCreatesTablesAndView() throws SQLException {
    List<String> tables =
        Sql.strings(
            db,
            """
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'gradgown' AND table_type = 'BASE TABLE'
            ORDER BY table_name
            """);
    assertEquals(
        List.of(
            "announcements",
            "audit_logs",
            "faqs",
            "gown_periods",
            "gown_reservations",
            "gown_slots",
            "mentoring_events",
            "mentoring_options",
            "mentoring_registrations",
            "mentoring_sessions",
            "users"),
        tables);

    List<String> views =
        Sql.strings(
            db,
            """
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'gradgown' AND table_type = 'VIEW'
            """);
    assertEquals(List.of("visible_announcements"), views);
  }

  @Test
  @DisplayName("the seed data loads without breaking a constraint")
  void seedLoads() throws SQLException {
    // The entrypoint stops at the first SQL error, so a running container already proves it.
    assertTrue(Sql.number(db, "SELECT COUNT(*) FROM users WHERE email LIKE '%@example.com'") > 0);
    assertTrue(Sql.number(db, "SELECT COUNT(*) FROM gown_reservations WHERE user_id < 9000") > 0);
    assertTrue(
        Sql.number(db, "SELECT COUNT(*) FROM mentoring_registrations WHERE user_id < 9000") > 0);
  }

  @Test
  @DisplayName("the seed times were stored as Seoul times, not UTC")
  void seedTimesAreSeoulTimes() throws SQLException {
    // The entrypoint runs db/init in UTC unless the file sets its own time zone. Every seed slot
    // starts between 10:00 and 15:00 in Seoul; read as UTC they would start at 19:00 or later.
    assertEquals(
        0,
        Sql.number(
            db,
            """
            SELECT COUNT(*) FROM gown_slots
            WHERE id < 9000 AND HOUR(CONVERT_TZ(starts_at, @@session.time_zone, '+09:00')) NOT BETWEEN 10 AND 15
            """));
  }

  @Test
  @DisplayName("the server runs in Seoul time (db/conf/gradgown.cnf is in effect)")
  void serverTimeZone() throws SQLException {
    assertEquals(List.of("+09:00"), Sql.strings(db, "SELECT @@global.time_zone"));
  }

  // --- RES-22: one reserved reservation per user and period -----------------

  @Test
  @DisplayName("RES-22 rejects a second reserved reservation for the same user and period")
  void secondReservedReservationIsRejected() throws SQLException {
    insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1A, SLOT_1B);

    assertRejected(
        ErrorCode.DUPLICATE_KEY, () -> insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1B, SLOT_1B));
  }

  @Test
  @DisplayName("RES-22 accepts a new reservation after a cancellation, any number of times")
  void reservationAfterCancellationIsAccepted() throws SQLException {
    for (int round = 0; round < 3; round++) {
      insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1A, SLOT_1B);
      Sql.update(
          db,
          """
          UPDATE gown_reservations SET status = 'cancelled'
          WHERE user_id = ? AND period_id = ? AND status = 'reserved'
          """,
          STUDENT_A,
          PERIOD_1);
    }
    insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1A, SLOT_1B);

    assertEquals(4, countReservations(STUDENT_A, PERIOD_1, null));
    assertEquals(1, countReservations(STUDENT_A, PERIOD_1, "reserved"));
  }

  @Test
  @DisplayName("RES-22 rejects turning a cancelled reservation back while another is reserved")
  void revivingCancelledReservationIsRejected() throws SQLException {
    insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1A, SLOT_1B);
    Sql.update(db, "UPDATE gown_reservations SET status = 'cancelled' WHERE user_id = ?", STUDENT_A);
    insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1A, SLOT_1B);

    assertRejected(
        ErrorCode.DUPLICATE_KEY,
        () ->
            Sql.update(
                db,
                "UPDATE gown_reservations SET status = 'reserved' WHERE user_id = ?",
                STUDENT_A));
  }

  @Test
  @DisplayName("RES-22 accepts reservations in another period and by another user")
  void otherPeriodAndOtherUserAreAccepted() throws SQLException {
    insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1A, SLOT_1B);
    insertReservation(db, STUDENT_A, PERIOD_2, SLOT_2A, SLOT_2B);
    insertReservation(db, STUDENT_B, PERIOD_1, SLOT_1A, SLOT_1B);

    assertEquals(1, countReservations(STUDENT_A, PERIOD_1, "reserved"));
    assertEquals(1, countReservations(STUDENT_A, PERIOD_2, "reserved"));
    assertEquals(1, countReservations(STUDENT_B, PERIOD_1, "reserved"));
  }

  // --- MNT-22: one reserved registration per user and event -----------------

  @Test
  @DisplayName("MNT-22 rejects a second reserved registration for the same user and event")
  void secondReservedRegistrationIsRejected() throws SQLException {
    insertRegistration(db, STUDENT_A, EVENT_FULL, 1, 2);

    assertRejected(
        ErrorCode.DUPLICATE_KEY, () -> insertRegistration(db, STUDENT_A, EVENT_FULL, 3, 4));
  }

  @Test
  @DisplayName("MNT-22 accepts a new registration after a cancellation")
  void registrationAfterCancellationIsAccepted() throws SQLException {
    insertRegistration(db, STUDENT_A, EVENT_FULL, 1, 2);
    Sql.update(
        db, "UPDATE mentoring_registrations SET status = 'cancelled' WHERE user_id = ?", STUDENT_A);
    insertRegistration(db, STUDENT_A, EVENT_FULL, 3, 4);

    assertEquals(
        2,
        Sql.number(
            db,
            "SELECT COUNT(*) FROM mentoring_registrations WHERE user_id = ? AND event_id = ?",
            STUDENT_A,
            EVENT_FULL));
  }

  // --- A slot must belong to the reservation's period -----------------------

  @Test
  @DisplayName("rejects a rent slot that belongs to another period")
  void rentSlotOfAnotherPeriodIsRejected() {
    assertRejected(
        ErrorCode.NO_REFERENCED_ROW,
        () -> insertReservation(db, STUDENT_A, PERIOD_1, SLOT_2A, SLOT_1B));
  }

  @Test
  @DisplayName("rejects a return slot that belongs to another period")
  void returnSlotOfAnotherPeriodIsRejected() {
    assertRejected(
        ErrorCode.NO_REFERENCED_ROW,
        () -> insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1A, SLOT_2A));
  }

  @Test
  @DisplayName("accepts the same slot for rent and return (RES-13 allows an equal time)")
  void sameSlotForRentAndReturnIsAccepted() throws SQLException {
    insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1A, SLOT_1A);

    assertEquals(1, countReservations(STUDENT_A, PERIOD_1, "reserved"));
  }

  // --- An option must belong to the registration's event --------------------

  @Test
  @DisplayName("rejects an option number that exists only in another event")
  void optionOfAnotherEventIsRejected() {
    // Option 5 exists in EVENT_FULL but not in EVENT_PARTIAL.
    assertRejected(
        ErrorCode.NO_REFERENCED_ROW, () -> insertRegistration(db, STUDENT_A, EVENT_PARTIAL, 5, 1));
    assertRejected(
        ErrorCode.NO_REFERENCED_ROW, () -> insertRegistration(db, STUDENT_A, EVENT_PARTIAL, 1, 5));
  }

  @Test
  @DisplayName("accepts option numbers of the registration's own event")
  void optionOfSameEventIsAccepted() throws SQLException {
    insertRegistration(db, STUDENT_A, EVENT_PARTIAL, 1, 3);
    insertRegistration(db, STUDENT_A, EVENT_FULL, 5, 7);

    assertEquals(
        2,
        Sql.number(db, "SELECT COUNT(*) FROM mentoring_registrations WHERE user_id = ?", STUDENT_A));
  }

  @Test
  @DisplayName("rejects option number 8 in a registration (no event has it)")
  void optionEightInRegistrationIsRejected() {
    assertRejected(
        ErrorCode.NO_REFERENCED_ROW, () -> insertRegistration(db, STUDENT_A, EVENT_FULL, 8, 1));
  }

  // --- MNT-25: the two sessions --------------------------------------------

  @Test
  @DisplayName("MNT-25 rejects the same option in both sessions")
  void sameOptionInBothSessionsIsRejected() {
    assertRejected(
        ErrorCode.CHECK_VIOLATED, () -> insertRegistration(db, STUDENT_A, EVENT_FULL, 2, 2));
  }

  @Test
  @DisplayName("MNT-25 rejects 'no choice' in both sessions")
  void noChoiceInBothSessionsIsRejected() {
    assertRejected(
        ErrorCode.CHECK_VIOLATED, () -> insertRegistration(db, STUDENT_A, EVENT_FULL, null, null));
  }

  @Test
  @DisplayName("MNT-25 accepts 'no choice' in one session only")
  void noChoiceInOneSessionIsAccepted() throws SQLException {
    insertRegistration(db, STUDENT_A, EVENT_FULL, null, 2);
    insertRegistration(db, STUDENT_B, EVENT_FULL, 2, null);

    assertEquals(
        2,
        Sql.number(
            db,
            """
            SELECT COUNT(*) FROM mentoring_registrations
            WHERE event_id = ? AND (first_option_no IS NULL OR second_option_no IS NULL)
            """,
            EVENT_FULL));
  }

  @Test
  @DisplayName("MNT-25 also holds on update: a change cannot make both sessions equal")
  void updateToSameOptionIsRejected() throws SQLException {
    insertRegistration(db, STUDENT_A, EVENT_FULL, 1, 2);

    assertRejected(
        ErrorCode.CHECK_VIOLATED,
        () ->
            Sql.update(
                db,
                "UPDATE mentoring_registrations SET second_option_no = 1 WHERE user_id = ?",
                STUDENT_A));
  }

  // --- Proxy pickup ---------------------------------------------------------

  @Test
  @DisplayName("rejects a proxy pickup without the proxy's name or phone")
  void proxyWithoutNameOrPhoneIsRejected() {
    assertRejected(ErrorCode.CHECK_VIOLATED, () -> insertProxyReservation(true, null, "010-0000-0009"));
    assertRejected(ErrorCode.CHECK_VIOLATED, () -> insertProxyReservation(true, "Proxy", null));
    assertRejected(ErrorCode.CHECK_VIOLATED, () -> insertProxyReservation(true, null, null));
  }

  @Test
  @DisplayName("rejects proxy details on a reservation that is not a proxy pickup")
  void proxyDetailsWithoutProxyAreRejected() {
    assertRejected(
        ErrorCode.CHECK_VIOLATED, () -> insertProxyReservation(false, "Proxy", "010-0000-0009"));
  }

  @Test
  @DisplayName("accepts a proxy pickup with both details, and no proxy with neither")
  void consistentProxyDetailsAreAccepted() throws SQLException {
    insertProxyReservation(true, "Proxy", "010-0000-0009");
    insertReservation(db, STUDENT_B, PERIOD_1, SLOT_1A, SLOT_1B);

    assertEquals(
        2, Sql.number(db, "SELECT COUNT(*) FROM gown_reservations WHERE period_id = ?", PERIOD_1));
  }

  // --- Ranges ---------------------------------------------------------------

  @Test
  @DisplayName("rejects a grade outside 1 to 4")
  void gradeOutOfRangeIsRejected() {
    assertRejected(
        ErrorCode.CHECK_VIOLATED, () -> insertRegistration(db, STUDENT_A, EVENT_FULL, 1, 2, 0));
    assertRejected(
        ErrorCode.CHECK_VIOLATED, () -> insertRegistration(db, STUDENT_A, EVENT_FULL, 1, 2, 5));
  }

  @Test
  @DisplayName("accepts grades 1 and 4")
  void gradeInRangeIsAccepted() throws SQLException {
    insertRegistration(db, STUDENT_A, EVENT_FULL, 1, 2, 1);
    insertRegistration(db, STUDENT_B, EVENT_FULL, 1, 2, 4);
  }

  @Test
  @DisplayName("rejects an option number outside 1 to 7")
  void optionNumberOutOfRangeIsRejected() {
    assertRejected(ErrorCode.CHECK_VIOLATED, () -> insertOption(EVENT_PARTIAL, 0));
    assertRejected(ErrorCode.CHECK_VIOLATED, () -> insertOption(EVENT_PARTIAL, 8));
  }

  @Test
  @DisplayName("accepts option numbers up to 7")
  void optionNumberInRangeIsAccepted() throws SQLException {
    for (int optionNo = 4; optionNo <= 7; optionNo++) {
      insertOption(EVENT_PARTIAL, optionNo);
    }
  }

  @Test
  @DisplayName("rejects a session number other than 1 or 2")
  void sessionNumberOutOfRangeIsRejected() {
    assertRejected(
        ErrorCode.CHECK_VIOLATED,
        () ->
            Sql.update(
                db,
                """
                INSERT INTO mentoring_sessions (event_id, session_no, label, starts_at, ends_at)
                VALUES (?, 3, 'Session 3', '2037-02-20 17:00:00', '2037-02-20 17:50:00')
                """,
                EVENT_PARTIAL));
  }

  @Test
  @DisplayName("rejects size 'xl' and status 'completed' (not members of the ENUM)")
  void unknownEnumValueIsRejected() {
    assertRejected(ErrorCode.NOT_AN_ENUM_VALUE, () -> insertSizedReservation("xl"));
    assertRejected(
        ErrorCode.NOT_AN_ENUM_VALUE,
        () -> {
          insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1A, SLOT_1B);
          Sql.update(
              db, "UPDATE gown_reservations SET status = 'completed' WHERE user_id = ?", STUDENT_A);
        });
  }

  @Test
  @DisplayName("RES-29 stores an upper-case size in lower case")
  void upperCaseSizeIsStoredInLowerCase() throws SQLException {
    insertSizedReservation("L");

    assertEquals(
        List.of("l"),
        Sql.strings(db, "SELECT size FROM gown_reservations WHERE user_id = ?", STUDENT_A));
  }

  // --- Slots and schedules --------------------------------------------------

  @Test
  @DisplayName("rejects two slots with the same start time in one period")
  void duplicateSlotIsRejected() {
    assertRejected(
        ErrorCode.DUPLICATE_KEY, () -> insertSlot(PERIOD_1, "2037-01-20 10:00:00", "2037-01-20 10:30:00"));
  }

  @Test
  @DisplayName("accepts the same start time in another period, and another start time")
  void distinctSlotsAreAccepted() throws SQLException {
    insertSlot(PERIOD_2, "2037-01-20 10:00:00", "2037-01-20 10:30:00");
    insertSlot(PERIOD_1, "2037-01-20 10:30:00", "2037-01-20 11:00:00");
  }

  @Test
  @DisplayName("rejects a slot or an application window that ends before it starts")
  void reversedTimeRangeIsRejected() {
    assertRejected(
        ErrorCode.CHECK_VIOLATED,
        () -> insertSlot(PERIOD_1, "2037-01-22 11:00:00", "2037-01-22 10:00:00"));
    assertRejected(
        ErrorCode.CHECK_VIOLATED,
        () ->
            Sql.update(
                db,
                "UPDATE gown_periods SET apply_ends_at = '2036-12-31 00:00:00' WHERE id = ?",
                PERIOD_1));
    assertRejected(
        ErrorCode.CHECK_VIOLATED,
        () ->
            Sql.update(
                db,
                "UPDATE mentoring_events SET apply_ends_at = '2036-12-31 00:00:00' WHERE id = ?",
                EVENT_FULL));
  }

  @Test
  @DisplayName("rejects a period ID that is not YYYY-MM")
  void malformedPeriodIdIsRejected() {
    assertRejected(ErrorCode.CHECK_VIOLATED, () -> insertPeriod("2037-13", false));
    assertRejected(ErrorCode.CHECK_VIOLATED, () -> insertPeriod("203703", false));
  }

  // --- One current period, one current event --------------------------------

  @Test
  @DisplayName("rejects a second current gown period")
  void secondCurrentPeriodIsRejected() throws SQLException {
    Sql.update(db, "UPDATE gown_periods SET is_current = FALSE");
    Sql.update(db, "UPDATE gown_periods SET is_current = TRUE WHERE id = ?", PERIOD_1);

    assertRejected(
        ErrorCode.DUPLICATE_KEY,
        () -> Sql.update(db, "UPDATE gown_periods SET is_current = TRUE WHERE id = ?", PERIOD_2));
  }

  @Test
  @DisplayName("accepts any number of gown periods that are not current")
  void manyNonCurrentPeriodsAreAccepted() throws SQLException {
    Sql.update(db, "UPDATE gown_periods SET is_current = FALSE");
    insertPeriod("2037-03", false);
    insertPeriod("2037-04", false);

    assertEquals(0, Sql.number(db, "SELECT COUNT(*) FROM gown_periods WHERE is_current"));
  }

  @Test
  @DisplayName("rejects a second current St:talk event")
  void secondCurrentEventIsRejected() throws SQLException {
    Sql.update(db, "UPDATE mentoring_events SET is_current = FALSE");
    Sql.update(db, "UPDATE mentoring_events SET is_current = TRUE WHERE id = ?", EVENT_FULL);

    assertRejected(
        ErrorCode.DUPLICATE_KEY,
        () ->
            Sql.update(
                db, "UPDATE mentoring_events SET is_current = TRUE WHERE id = ?", EVENT_PARTIAL));
  }

  // --- RES-25, MNT-24: a request is handled once -----------------------------

  @Test
  @DisplayName("RES-25 rejects a second audit log row with the same operation ID")
  void duplicateOperationIdIsRejected() throws SQLException {
    insertAuditLog(db, "fixture-operation-0001", STUDENT_A);

    assertRejected(
        ErrorCode.DUPLICATE_KEY, () -> insertAuditLog(db, "fixture-operation-0001", STUDENT_A));
    // Another user cannot take the ID either.
    assertRejected(
        ErrorCode.DUPLICATE_KEY, () -> insertAuditLog(db, "fixture-operation-0001", STUDENT_B));
  }

  @Test
  @DisplayName("RES-25 accepts another operation ID, including one that differs only in case")
  void distinctOperationIdsAreAccepted() throws SQLException {
    insertAuditLog(db, "fixture-operation-0001", STUDENT_A);
    insertAuditLog(db, "fixture-operation-0002", STUDENT_A);
    insertAuditLog(db, "FIXTURE-OPERATION-0001", STUDENT_A);

    assertEquals(
        3, Sql.number(db, "SELECT COUNT(*) FROM audit_logs WHERE actor_id = ?", STUDENT_A));
  }

  // --- Referential integrity ------------------------------------------------

  @Test
  @DisplayName("rejects deleting a slot, a period or a user that a reservation refers to")
  void deletingReferencedRowsIsRejected() throws SQLException {
    insertReservation(db, STUDENT_A, PERIOD_1, SLOT_1A, SLOT_1B);

    assertRejected(
        ErrorCode.ROW_IS_REFERENCED,
        () -> Sql.update(db, "DELETE FROM gown_slots WHERE id = ?", SLOT_1A));
    assertRejected(
        ErrorCode.ROW_IS_REFERENCED,
        () -> Sql.update(db, "DELETE FROM gown_slots WHERE id = ?", SLOT_1B));
    assertRejected(
        ErrorCode.ROW_IS_REFERENCED,
        () -> Sql.update(db, "DELETE FROM gown_periods WHERE id = ?", PERIOD_1));
    assertRejected(
        ErrorCode.ROW_IS_REFERENCED, () -> Sql.update(db, "DELETE FROM users WHERE id = ?", STUDENT_A));
  }

  @Test
  @DisplayName("rejects deleting an option that a registration refers to")
  void deletingReferencedOptionIsRejected() throws SQLException {
    insertRegistration(db, STUDENT_A, EVENT_FULL, 1, null);

    assertRejected(
        ErrorCode.ROW_IS_REFERENCED,
        () ->
            Sql.update(
                db,
                "DELETE FROM mentoring_options WHERE event_id = ? AND option_no = 1",
                EVENT_FULL));
  }

  @Test
  @DisplayName("accepts deleting a slot and an option that nothing refers to")
  void deletingUnreferencedRowsIsAccepted() throws SQLException {
    assertEquals(1, Sql.update(db, "DELETE FROM gown_slots WHERE id = ?", SLOT_2B));
    assertEquals(
        1,
        Sql.update(
            db, "DELETE FROM mentoring_options WHERE event_id = ? AND option_no = 3", EVENT_PARTIAL));
  }

  // --- Helpers --------------------------------------------------------------

  private long countReservations(long userId, String periodId, String status) throws SQLException {
    if (status == null) {
      return Sql.number(
          db,
          "SELECT COUNT(*) FROM gown_reservations WHERE user_id = ? AND period_id = ?",
          userId,
          periodId);
    }
    return Sql.number(
        db,
        "SELECT COUNT(*) FROM gown_reservations WHERE user_id = ? AND period_id = ? AND status = ?",
        userId,
        periodId,
        status);
  }

  private void insertProxyReservation(boolean isProxy, String proxyName, String proxyPhone)
      throws SQLException {
    Sql.update(
        db,
        """
        INSERT INTO gown_reservations
          (user_id, period_id, rent_slot_id, return_slot_id,
           name, student_id, department, phone, size,
           is_proxy, proxy_name, proxy_phone, created_by)
        VALUES (?, ?, ?, ?, 'Fixture Student', '00000000', 'Fixture Dept', '010-0000-0000', 'm',
                ?, ?, ?, ?)
        """,
        STUDENT_A,
        PERIOD_1,
        SLOT_1A,
        SLOT_1B,
        isProxy,
        proxyName,
        proxyPhone,
        STUDENT_A);
  }

  private void insertSizedReservation(String size) throws SQLException {
    Sql.update(
        db,
        """
        INSERT INTO gown_reservations
          (user_id, period_id, rent_slot_id, return_slot_id,
           name, student_id, department, phone, size, created_by)
        VALUES (?, ?, ?, ?, 'Fixture Student', '00000000', 'Fixture Dept', '010-0000-0000', ?, ?)
        """,
        STUDENT_A,
        PERIOD_1,
        SLOT_1A,
        SLOT_1B,
        size,
        STUDENT_A);
  }

  private void insertSlot(String periodId, String startsAt, String endsAt) throws SQLException {
    Sql.update(
        db,
        "INSERT INTO gown_slots (period_id, starts_at, ends_at) VALUES (?, ?, ?)",
        periodId,
        startsAt,
        endsAt);
  }

  private void insertOption(String eventId, int optionNo) throws SQLException {
    Sql.update(
        db,
        "INSERT INTO mentoring_options (event_id, option_no, name) VALUES (?, ?, 'Option')",
        eventId,
        optionNo);
  }

  private void insertPeriod(String id, boolean isCurrent) throws SQLException {
    Sql.update(
        db,
        """
        INSERT INTO gown_periods
          (id, apply_starts_at, apply_ends_at, edit_starts_at, edit_ends_at, is_current)
        VALUES (?, '2037-03-01 09:00:00', '2037-03-10 18:00:00',
                   '2037-03-11 09:00:00', '2037-03-15 18:00:00', ?)
        """,
        id,
        isCurrent);
  }
}
