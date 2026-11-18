package gradgown.admin.repository;

import gradgown.core.time.SeoulTime;
import gradgown.core.view.ReservationPeriodView;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Gown rental as the admin app sees it: every period, every student's reservations. */
@Repository
public class GownAdminRepository {

  /** A period with how much is in it. */
  public record PeriodView(
      String periodId,
      String title,
      boolean isOpen,
      boolean isCurrent,
      String applyStartAt,
      String applyEndAt,
      String editStartAt,
      String editEndAt,
      int slotCount,
      int reservedCount) {}

  /** One reservation in the admin list: the reservation, and whose it is. */
  public record ReservationRow(
      String reservationId,
      String userId,
      String email,
      String periodId,
      String status,
      String name,
      String studentId,
      String department,
      String phone,
      String size,
      String slotId,
      String rentAt,
      String returnAt,
      boolean isProxy,
      String proxyName,
      String proxyPhone,
      String createdAt,
      String modifiedAt,
      String version) {}

  /** One slot of a period's timetable. A slot that is not enabled cannot be picked. */
  public record SlotView(
      String slotId, String periodId, String startsAt, String endsAt, boolean enabled) {}

  private static final String SELECT_PERIOD =
      """
      SELECT p.id, p.is_open, p.is_current,
             p.apply_starts_at, p.apply_ends_at, p.edit_starts_at, p.edit_ends_at,
             (SELECT COUNT(*) FROM gown_slots AS s WHERE s.period_id = p.id) AS slot_count,
             (SELECT COUNT(*) FROM gown_reservations AS r
               WHERE r.period_id = p.id AND r.status = 'reserved') AS reserved_count
      FROM gown_periods AS p
      """;

  private final JdbcClient jdbc;

  public GownAdminRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** Every period, newest first. Firestore kept only the current one. */
  public List<PeriodView> findPeriods() {
    return jdbc.sql(SELECT_PERIOD + "ORDER BY p.id DESC").query(GownAdminRepository::period).list();
  }

  public Optional<PeriodView> findCurrentPeriod() {
    return jdbc.sql(SELECT_PERIOD + "WHERE p.is_current = TRUE")
        .query(GownAdminRepository::period)
        .optional();
  }

  /** The timetable of a period in time order, switched-off slots included. */
  public List<SlotView> findSlots(String periodId) {
    return jdbc.sql(
            """
            SELECT id, period_id, starts_at, ends_at, enabled
            FROM gown_slots
            WHERE period_id = ?
            ORDER BY starts_at
            """)
        .param(periodId)
        .query(
            (row, n) ->
                new SlotView(
                    Long.toString(row.getLong("id")),
                    row.getString("period_id"),
                    SeoulTime.iso(row.getObject("starts_at", LocalDateTime.class)),
                    SeoulTime.iso(row.getObject("ends_at", LocalDateTime.class)),
                    row.getBoolean("enabled")))
        .list();
  }

  /**
   * The reservations of a period, newest first, one page at a time.
   *
   * <p>The search and the status filter are part of the WHERE clause, so they apply to the whole
   * period before the page is cut. The original read 51 documents and filtered that page in the
   * browser, so a match outside the first page was not found (docs/decisions/evaluation.md, A1).
   *
   * <p>Paging is by key: the cursor is the ID of the last row of the previous page. A filter that
   * is NULL is switched off.
   *
   * @param search a LIKE pattern, or null
   * @param status reserved or cancelled, or null
   * @param cursor the last reservation ID of the previous page, or null for the first page
   */
  public Page<ReservationRow> findReservations(
      String periodId, String search, String status, Long cursor, int size) {
    List<ReservationRow> rows =
        jdbc.sql(
                """
                SELECT r.id, r.user_id, u.email, r.period_id, r.status,
                       r.name, r.student_id, r.department, r.phone, r.size,
                       r.rent_slot_id, rent_slot.starts_at AS rent_at,
                       return_slot.starts_at AS return_at,
                       r.is_proxy, r.proxy_name, r.proxy_phone,
                       r.created_at, r.updated_at, r.version
                FROM gown_reservations AS r
                JOIN users AS u ON u.id = r.user_id
                JOIN gown_slots AS rent_slot ON rent_slot.id = r.rent_slot_id
                JOIN gown_slots AS return_slot ON return_slot.id = r.return_slot_id
                WHERE r.period_id = :periodId
                  AND (:status IS NULL OR r.status = :status)
                  AND (:search IS NULL
                       OR r.name LIKE :search OR r.student_id LIKE :search OR r.phone LIKE :search)
                  AND (:cursor IS NULL OR r.id < :cursor)
                ORDER BY r.id DESC
                LIMIT :limit
                """)
            .param("periodId", periodId)
            .param("status", status)
            .param("search", search)
            .param("cursor", cursor)
            .param("limit", size + 1)
            .query(GownAdminRepository::reservation)
            .list();
    return Page.of(rows, size, ReservationRow::reservationId);
  }

  /** Switches the applications of a period on or off. Returns the number of rows changed. */
  public int setOpen(String periodId, boolean open) {
    return jdbc.sql("UPDATE gown_periods SET is_open = ? WHERE id = ?")
        .param(open)
        .param(periodId)
        .update();
  }

  public boolean exists(String periodId) {
    return jdbc.sql("SELECT COUNT(*) FROM gown_periods WHERE id = ?")
            .param(periodId)
            .query(Integer.class)
            .single()
        > 0;
  }

  private static PeriodView period(ResultSet row, int n) throws SQLException {
    String id = row.getString("id");
    return new PeriodView(
        id,
        ReservationPeriodView.titleOf(id),
        row.getBoolean("is_open"),
        row.getBoolean("is_current"),
        SeoulTime.iso(row.getObject("apply_starts_at", LocalDateTime.class)),
        SeoulTime.iso(row.getObject("apply_ends_at", LocalDateTime.class)),
        SeoulTime.iso(row.getObject("edit_starts_at", LocalDateTime.class)),
        SeoulTime.iso(row.getObject("edit_ends_at", LocalDateTime.class)),
        row.getInt("slot_count"),
        row.getInt("reserved_count"));
  }

  private static ReservationRow reservation(ResultSet row, int n) throws SQLException {
    return new ReservationRow(
        Long.toString(row.getLong("id")),
        Long.toString(row.getLong("user_id")),
        row.getString("email"),
        row.getString("period_id"),
        row.getString("status"),
        row.getString("name"),
        row.getString("student_id"),
        row.getString("department"),
        row.getString("phone"),
        row.getString("size").toUpperCase(Locale.ROOT),
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
