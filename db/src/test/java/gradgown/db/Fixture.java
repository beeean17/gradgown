package gradgown.db;

import java.sql.Connection;
import java.sql.SQLException;

/**
 * The rows of src/test/resources/test-fixture.sql, and inserts that fill in the columns a test does
 * not care about.
 */
final class Fixture {

  static final long STUDENT_A = 9001;
  static final long STUDENT_B = 9002;
  static final long MASTER_USER = 9003;

  static final String PERIOD_1 = "2037-01";
  static final String PERIOD_2 = "2037-02";

  /** Slots of {@link #PERIOD_1}. */
  static final long SLOT_1A = 9001;

  static final long SLOT_1B = 9002;

  /** Slots of {@link #PERIOD_2}. */
  static final long SLOT_2A = 9003;

  static final long SLOT_2B = 9004;

  /** Has options 1 to 7. */
  static final String EVENT_FULL = "2037-01";

  /** Has options 1 to 3 only. */
  static final String EVENT_PARTIAL = "2037-02";

  private Fixture() {}

  /** Inserts a reserved gown reservation without a proxy. */
  static void insertReservation(
      Connection db, long userId, String periodId, long rentSlotId, long returnSlotId)
      throws SQLException {
    Sql.update(
        db,
        """
        INSERT INTO gown_reservations
          (user_id, period_id, rent_slot_id, return_slot_id,
           name, student_id, department, phone, size, created_by)
        VALUES (?, ?, ?, ?, 'Fixture Student', '00000000', 'Fixture Dept', '010-0000-0000', 'm', ?)
        """,
        userId,
        periodId,
        rentSlotId,
        returnSlotId,
        userId);
  }

  /** Inserts a reserved St:talk registration. A {@code null} option means "no choice". */
  static void insertRegistration(
      Connection db, long userId, String eventId, Integer firstOption, Integer secondOption)
      throws SQLException {
    insertRegistration(db, userId, eventId, firstOption, secondOption, 3);
  }

  static void insertRegistration(
      Connection db,
      long userId,
      String eventId,
      Integer firstOption,
      Integer secondOption,
      int grade)
      throws SQLException {
    Sql.update(
        db,
        """
        INSERT INTO mentoring_registrations
          (user_id, event_id, first_option_no, second_option_no,
           name, department, student_id, grade, phone, created_by)
        VALUES (?, ?, ?, ?, 'Fixture Student', 'Fixture Dept', '00000000', ?, '010-0000-0000', ?)
        """,
        userId,
        eventId,
        firstOption,
        secondOption,
        grade,
        userId);
  }

  /** Inserts an audit log row in its first state, {@code received}. */
  static void insertAuditLog(Connection db, String operationId, long actorId) throws SQLException {
    Sql.update(
        db,
        """
        INSERT INTO audit_logs (operation_id, domain, action, actor_id)
        VALUES (?, 'reservation', 'reservation.create', ?)
        """,
        operationId,
        actorId);
  }
}
