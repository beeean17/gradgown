package gradgown.student.repository;

import gradgown.core.input.MentoringInput;
import gradgown.core.rule.MentoringOptions;
import gradgown.core.time.SeoulTime;
import gradgown.core.view.MentoringRegistrationView;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

/**
 * St:talk registrations of one student.
 *
 * <p>As in {@link ReservationRepository}, every method takes the user ID and every statement
 * filters by it.
 */
@Repository
public class RegistrationRepository {

  /** What a change needs to know about the registration it is about to touch. */
  public record Current(long id, String eventId, String status, int version) {}

  private final JdbcClient jdbc;

  public RegistrationRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** All registrations of the user, newest change first. */
  public List<MentoringRegistrationView> findAll(long userId) {
    return jdbc.sql(
            """
            SELECT id, event_id, status, first_option_no, second_option_no,
                   name, student_id, department, phone, grade, created_at, updated_at, version
            FROM mentoring_registrations
            WHERE user_id = ?
            ORDER BY updated_at DESC, id DESC
            """)
        .param(userId)
        .query(
            (row, n) ->
                new MentoringRegistrationView(
                    Long.toString(row.getLong("id")),
                    row.getString("event_id"),
                    row.getString("status"),
                    MentoringOptions.fromColumn(row.getObject("first_option_no", Integer.class)),
                    MentoringOptions.fromColumn(row.getObject("second_option_no", Integer.class)),
                    row.getString("name"),
                    row.getString("student_id"),
                    row.getString("department"),
                    row.getString("phone"),
                    row.getInt("grade"),
                    SeoulTime.iso(row.getObject("created_at", LocalDateTime.class)),
                    SeoulTime.iso(row.getObject("updated_at", LocalDateTime.class)),
                    Integer.toString(row.getInt("version"))))
        .list();
  }

  /** The registration, if it is this user's. Another user's ID finds nothing. */
  public Optional<Current> findCurrent(long userId, long registrationId) {
    return jdbc.sql(
            """
            SELECT id, event_id, status, version
            FROM mentoring_registrations
            WHERE id = ? AND user_id = ?
            """)
        .param(registrationId)
        .param(userId)
        .query(
            (row, n) ->
                new Current(
                    row.getLong("id"),
                    row.getString("event_id"),
                    row.getString("status"),
                    row.getInt("version")))
        .optional();
  }

  /**
   * Inserts a reserved registration and returns its ID.
   *
   * <p>MNT-22 is not checked here: the UNIQUE key uq_mentoring_registrations_active rejects a
   * second reserved registration with MySQL error 1062. "No choice" (0) is stored as NULL.
   */
  public long insert(long userId, String eventId, MentoringInput.Valid input) {
    KeyHolder key = new GeneratedKeyHolder();
    jdbc.sql(
            """
            INSERT INTO mentoring_registrations
              (user_id, event_id, first_option_no, second_option_no, status,
               name, department, student_id, grade, phone, created_by)
            VALUES
              (:userId, :eventId, :first, :second, 'reserved',
               :name, :department, :studentId, :grade, :phone, :userId)
            """)
        .param("userId", userId)
        .param("eventId", eventId)
        .param("first", MentoringOptions.toColumn(input.firstOption()))
        .param("second", MentoringOptions.toColumn(input.secondOption()))
        .param("name", input.name())
        .param("department", input.department())
        .param("studentId", input.studentId())
        .param("grade", input.grade())
        .param("phone", input.phone())
        .update(key);
    return key.getKeyAs(Number.class).longValue();
  }

  /** Returns the number of rows changed: 0 when the version is stale (MNT-23). */
  public int update(long userId, long registrationId, int version, MentoringInput.Valid input) {
    return jdbc.sql(
            """
            UPDATE mentoring_registrations
            SET first_option_no = :first, second_option_no = :second,
                name = :name, department = :department, student_id = :studentId,
                grade = :grade, phone = :phone,
                version = version + 1
            WHERE id = :id AND user_id = :userId AND version = :version AND status = 'reserved'
            """)
        .param("first", MentoringOptions.toColumn(input.firstOption()))
        .param("second", MentoringOptions.toColumn(input.secondOption()))
        .param("name", input.name())
        .param("department", input.department())
        .param("studentId", input.studentId())
        .param("grade", input.grade())
        .param("phone", input.phone())
        .param("id", registrationId)
        .param("userId", userId)
        .param("version", version)
        .update();
  }

  /** MNT-20: cancelling keeps the row and changes its status. Returns the rows changed. */
  public int cancel(long userId, long registrationId, int version) {
    return jdbc.sql(
            """
            UPDATE mentoring_registrations
            SET status = 'cancelled', version = version + 1
            WHERE id = ? AND user_id = ? AND version = ? AND status = 'reserved'
            """)
        .param(registrationId)
        .param(userId)
        .param(version)
        .update();
  }
}
