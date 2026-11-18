package gradgown.student.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The gown rental schedule: periods and their slots. Read-only for the student account. */
@Repository
public class GownScheduleRepository {

  public record Period(
      String id,
      boolean open,
      LocalDateTime applyStartsAt,
      LocalDateTime applyEndsAt,
      LocalDateTime editStartsAt,
      LocalDateTime editEndsAt) {}

  public record Slot(
      long id, String periodId, LocalDateTime startsAt, LocalDateTime endsAt, boolean enabled) {}

  private final JdbcClient jdbc;

  public GownScheduleRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<Period> findCurrentPeriod() {
    return jdbc.sql(
            """
            SELECT id, is_open, apply_starts_at, apply_ends_at, edit_starts_at, edit_ends_at
            FROM gown_periods
            WHERE is_current = TRUE
            """)
        .query(
            (row, n) ->
                new Period(
                    row.getString("id"),
                    row.getBoolean("is_open"),
                    row.getObject("apply_starts_at", LocalDateTime.class),
                    row.getObject("apply_ends_at", LocalDateTime.class),
                    row.getObject("edit_starts_at", LocalDateTime.class),
                    row.getObject("edit_ends_at", LocalDateTime.class)))
        .optional();
  }

  public List<Slot> findSlots(String periodId) {
    return jdbc.sql(
            """
            SELECT id, period_id, starts_at, ends_at, enabled
            FROM gown_slots
            WHERE period_id = ?
            ORDER BY starts_at
            """)
        .param(periodId)
        .query(GownScheduleRepository::slot)
        .list();
  }

  /** The slot with this ID, if it belongs to the period. */
  public Optional<Slot> findSlot(long slotId, String periodId) {
    return jdbc.sql(
            """
            SELECT id, period_id, starts_at, ends_at, enabled
            FROM gown_slots
            WHERE id = ? AND period_id = ?
            """)
        .param(slotId)
        .param(periodId)
        .query(GownScheduleRepository::slot)
        .optional();
  }

  /** RES-14: the enabled slot of the period that contains the time. */
  public Optional<Slot> findEnabledSlotAt(String periodId, LocalDateTime time) {
    return jdbc.sql(
            """
            SELECT id, period_id, starts_at, ends_at, enabled
            FROM gown_slots
            WHERE period_id = ? AND enabled = TRUE AND starts_at <= ? AND ends_at > ?
            ORDER BY starts_at
            LIMIT 1
            """)
        .param(periodId)
        .param(time)
        .param(time)
        .query(GownScheduleRepository::slot)
        .optional();
  }

  private static Slot slot(ResultSet row, int n) throws SQLException {
    return new Slot(
        row.getLong("id"),
        row.getString("period_id"),
        row.getObject("starts_at", LocalDateTime.class),
        row.getObject("ends_at", LocalDateTime.class),
        row.getBoolean("enabled"));
  }
}
