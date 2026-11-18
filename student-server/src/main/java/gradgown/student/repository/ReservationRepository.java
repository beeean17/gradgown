package gradgown.student.repository;

import gradgown.core.input.ReservationInput;
import gradgown.core.time.SeoulTime;
import gradgown.core.view.ReservationView;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

/**
 * Gown reservations of one student.
 *
 * <p>Every method takes the user ID and every statement filters by it. The database cannot tell
 * students apart, because they all reach it through the one student account, so this class is
 * what keeps a student away from another student's reservations
 * (docs/decisions/db-privileges.md).
 */
@Repository
public class ReservationRepository {

  /** What a change needs to know about the reservation it is about to touch. */
  public record Current(long id, String periodId, String status, int version) {}

  /** The rent and return times are not stored: they are the start times of the two slots. */
  private static final String SELECT_VIEW =
      """
      SELECT r.id, r.period_id, r.status, r.name, r.student_id, r.department, r.phone, r.size,
             r.rent_slot_id, rent_slot.starts_at AS rent_at, return_slot.starts_at AS return_at,
             r.is_proxy, r.proxy_name, r.proxy_phone, r.created_at, r.updated_at, r.version
      FROM gown_reservations AS r
      JOIN gown_slots AS rent_slot ON rent_slot.id = r.rent_slot_id
      JOIN gown_slots AS return_slot ON return_slot.id = r.return_slot_id
      """;

  private final JdbcClient jdbc;

  public ReservationRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** All reservations of the user, newest change first. */
  public List<ReservationView> findAll(long userId) {
    return jdbc.sql(SELECT_VIEW + "WHERE r.user_id = ? ORDER BY r.updated_at DESC, r.id DESC")
        .param(userId)
        .query(ReservationRepository::view)
        .list();
  }

  /** The reservations of the user in one period, newest change first. */
  public List<ReservationView> findByPeriod(long userId, String periodId) {
    return jdbc.sql(
            SELECT_VIEW
                + "WHERE r.user_id = ? AND r.period_id = ? ORDER BY r.updated_at DESC, r.id DESC")
        .param(userId)
        .param(periodId)
        .query(ReservationRepository::view)
        .list();
  }

  /** The reservation, if it is this user's. Another user's ID finds nothing. */
  public Optional<Current> findCurrent(long userId, long reservationId) {
    return jdbc.sql(
            """
            SELECT id, period_id, status, version
            FROM gown_reservations
            WHERE id = ? AND user_id = ?
            """)
        .param(reservationId)
        .param(userId)
        .query(
            (row, n) ->
                new Current(
                    row.getLong("id"),
                    row.getString("period_id"),
                    row.getString("status"),
                    row.getInt("version")))
        .optional();
  }

  /**
   * Inserts a reserved reservation and returns its ID.
   *
   * <p>RES-22 is not checked here. If the user already has a reserved reservation in the period,
   * the UNIQUE key uq_gown_reservations_active rejects the row with MySQL error 1062.
   */
  public long insert(
      long userId,
      String periodId,
      long rentSlotId,
      long returnSlotId,
      ReservationInput.Valid input) {
    KeyHolder key = new GeneratedKeyHolder();
    jdbc.sql(
            """
            INSERT INTO gown_reservations
              (user_id, period_id, rent_slot_id, return_slot_id, status,
               name, student_id, department, phone, size,
               is_proxy, proxy_name, proxy_phone, created_by)
            VALUES
              (:userId, :periodId, :rentSlotId, :returnSlotId, 'reserved',
               :name, :studentId, :department, :phone, :size,
               :isProxy, :proxyName, :proxyPhone, :userId)
            """)
        .param("userId", userId)
        .param("periodId", periodId)
        .param("rentSlotId", rentSlotId)
        .param("returnSlotId", returnSlotId)
        .param("name", input.name())
        .param("studentId", input.studentId())
        .param("department", input.department())
        .param("phone", input.phone())
        .param("size", input.size())
        .param("isProxy", input.proxy())
        .param("proxyName", input.proxyName())
        .param("proxyPhone", input.proxyPhone())
        .update(key);
    return key.getKeyAs(Number.class).longValue();
  }

  /**
   * Replaces the contents of a reserved reservation. Returns the number of rows changed: 0 when
   * the version is no longer the one the client read (RES-24), or the reservation is not this
   * user's or not reserved.
   */
  public int update(
      long userId,
      long reservationId,
      int version,
      long rentSlotId,
      long returnSlotId,
      ReservationInput.Valid input) {
    return jdbc.sql(
            """
            UPDATE gown_reservations
            SET rent_slot_id = :rentSlotId, return_slot_id = :returnSlotId,
                name = :name, student_id = :studentId, department = :department,
                phone = :phone, size = :size,
                is_proxy = :isProxy, proxy_name = :proxyName, proxy_phone = :proxyPhone,
                version = version + 1
            WHERE id = :id AND user_id = :userId AND version = :version AND status = 'reserved'
            """)
        .param("rentSlotId", rentSlotId)
        .param("returnSlotId", returnSlotId)
        .param("name", input.name())
        .param("studentId", input.studentId())
        .param("department", input.department())
        .param("phone", input.phone())
        .param("size", input.size())
        .param("isProxy", input.proxy())
        .param("proxyName", input.proxyName())
        .param("proxyPhone", input.proxyPhone())
        .param("id", reservationId)
        .param("userId", userId)
        .param("version", version)
        .update();
  }

  /** RES-20: cancelling keeps the row and changes its status. Returns the rows changed. */
  public int cancel(long userId, long reservationId, int version) {
    return jdbc.sql(
            """
            UPDATE gown_reservations
            SET status = 'cancelled', version = version + 1
            WHERE id = ? AND user_id = ? AND version = ? AND status = 'reserved'
            """)
        .param(reservationId)
        .param(userId)
        .param(version)
        .update();
  }

  private static ReservationView view(ResultSet row, int n) throws SQLException {
    String size = row.getString("size");
    return new ReservationView(
        Long.toString(row.getLong("id")),
        row.getString("period_id"),
        row.getString("status"),
        row.getString("name"),
        row.getString("student_id"),
        row.getString("department"),
        row.getString("phone"),
        // RES-29: stored in lower case, shown in upper case.
        size.toUpperCase(Locale.ROOT),
        size,
        Long.toString(row.getLong("rent_slot_id")),
        SeoulTime.iso(row.getObject("rent_at", LocalDateTime.class)),
        SeoulTime.iso(row.getObject("return_at", LocalDateTime.class)),
        row.getBoolean("is_proxy"),
        nullToEmpty(row.getString("proxy_name")),
        nullToEmpty(row.getString("proxy_phone")),
        SeoulTime.iso(row.getObject("created_at", LocalDateTime.class)),
        SeoulTime.iso(row.getObject("updated_at", LocalDateTime.class)),
        Integer.toString(row.getInt("version")));
  }

  private static String nullToEmpty(String value) {
    return value == null ? "" : value;
  }
}
