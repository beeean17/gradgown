package gradgown.admin.repository;

import gradgown.core.rule.MentoringOptions;
import gradgown.core.time.SeoulTime;
import gradgown.core.view.MentoringSessionView;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** St:talk as the admin app sees it: every event, every student's registrations, the counts. */
@Repository
public class MentoringAdminRepository {

  /**
   * An event as the settings screen shows it, with how many registrations it has. {@code options}
   * always has seven names; {@code sessions} are the two sessions in order.
   */
  public record EventView(
      String eventId,
      boolean isOpen,
      boolean isCurrent,
      String applyStartAt,
      String applyEndAt,
      String date,
      String location,
      List<MentoringSessionView> sessions,
      List<String> options,
      String intro,
      List<String> notes,
      String epicFolioUrl,
      boolean isEpicFolioLinkOpen,
      int reservedCount) {}

  /** One registration in the admin list. The e-mail comes from users, not from the row. */
  public record RegistrationRow(
      String registrationId,
      String userId,
      String email,
      String eventId,
      String status,
      int firstOption,
      int secondOption,
      String name,
      String studentId,
      String department,
      String phone,
      int grade,
      String createdAt,
      String modifiedAt,
      String version) {}

  /** How many reserved registrations chose an option in each session. Option 0 is "no choice". */
  public record OptionCount(int option, String name, int first, int second) {}

  /** An event as its own query returns it, before its sessions, options and notes are added. */
  private record EventRow(
      String id,
      boolean open,
      boolean current,
      String applyStartAt,
      String applyEndAt,
      String date,
      String location,
      String intro,
      String epicFolioUrl,
      boolean epicFolioLinkOpen,
      int reservedCount) {}

  private static final String SELECT_EVENT =
      """
      SELECT e.id, e.is_open, e.is_current, e.apply_starts_at, e.apply_ends_at,
             e.event_date, e.location, e.intro, e.epic_folio_url, e.is_epic_folio_link_open,
             (SELECT COUNT(*) FROM mentoring_registrations AS r
               WHERE r.event_id = e.id AND r.status = 'reserved') AS reserved_count
      FROM mentoring_events AS e
      """;

  private final JdbcClient jdbc;

  public MentoringAdminRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public List<EventView> findEvents() {
    List<EventRow> rows =
        jdbc.sql(SELECT_EVENT + "ORDER BY e.id DESC").query(MentoringAdminRepository::event).list();
    return rows.stream().map(this::withParts).toList();
  }

  public Optional<EventView> findCurrentEvent() {
    Optional<EventRow> row =
        jdbc.sql(SELECT_EVENT + "WHERE e.is_current = TRUE")
            .query(MentoringAdminRepository::event)
            .optional();
    return row.map(this::withParts);
  }

  /**
   * Adds the sessions, the option names and the notes, read after the event query has finished
   * and given its connection back. A query run from inside a row mapper would need a second
   * connection while the first is still held, and enough simultaneous requests would then empty
   * the pool for good.
   */
  private EventView withParts(EventRow row) {
    return new EventView(
        row.id(),
        row.open(),
        row.current(),
        row.applyStartAt(),
        row.applyEndAt(),
        row.date(),
        row.location(),
        findSessions(row.id()),
        findOptionNames(row.id()),
        row.intro(),
        findNotes(row.id()),
        row.epicFolioUrl(),
        row.epicFolioLinkOpen(),
        row.reservedCount());
  }

  private List<MentoringSessionView> findSessions(String eventId) {
    return jdbc.sql(
            """
            SELECT session_no, label, starts_at, ends_at
            FROM mentoring_sessions
            WHERE event_id = ?
            ORDER BY session_no
            """)
        .param(eventId)
        .query(
            (row, n) ->
                new MentoringSessionView(
                    Integer.toString(row.getInt("session_no")),
                    row.getString("label"),
                    SeoulTime.iso(row.getObject("starts_at", LocalDateTime.class)),
                    SeoulTime.iso(row.getObject("ends_at", LocalDateTime.class))))
        .list();
  }

  /** The notes of an event in the array's order: JSON_TABLE turns the JSON array into rows. */
  private List<String> findNotes(String eventId) {
    return jdbc.sql(
            """
            SELECT note.body
            FROM mentoring_events AS e,
                 JSON_TABLE(e.notes, '$[*]'
                            COLUMNS (ord FOR ORDINALITY, body VARCHAR(300) PATH '$')) AS note
            WHERE e.id = ?
            ORDER BY note.ord
            """)
        .param(eventId)
        .query(String.class)
        .list();
  }

  /** The names of options 1 to 7, in order. An option without a row or a name is "". */
  public List<String> findOptionNames(String eventId) {
    List<String> names = new ArrayList<>(Collections.nCopies(MentoringOptions.COUNT, ""));
    jdbc.sql("SELECT option_no, name FROM mentoring_options WHERE event_id = ?")
        .param(eventId)
        .query(
            row -> {
              names.set(row.getInt("option_no") - 1, row.getString("name"));
            });
    return names;
  }

  /**
   * The registrations of an event, newest first. The filters are part of the WHERE clause.
   *
   * <p>A choice filter takes the API value: 0 means "no choice", which is NULL in the table, so
   * the comparison is the NULL-safe {@code <=>} against {@code NULLIF(value, 0)}.
   *
   * @param search a LIKE pattern, or null
   * @param status reserved or cancelled, or null
   * @param first the first session's choice (0 to 7), or null
   * @param second the second session's choice (0 to 7), or null
   */
  public List<RegistrationRow> findRegistrations(
      String eventId, String search, String status, Integer first, Integer second) {
    return jdbc.sql(
            """
            SELECT r.id, r.user_id, u.email, r.event_id, r.status,
                   r.first_option_no, r.second_option_no,
                   r.name, r.student_id, r.department, r.phone, r.grade,
                   r.created_at, r.updated_at, r.version
            FROM mentoring_registrations AS r
            JOIN users AS u ON u.id = r.user_id
            WHERE r.event_id = :eventId
              AND (:status IS NULL OR r.status = :status)
              AND (:search IS NULL
                   OR r.name LIKE :search OR r.student_id LIKE :search OR r.phone LIKE :search)
              AND (:first IS NULL OR r.first_option_no <=> NULLIF(:first, 0))
              AND (:second IS NULL OR r.second_option_no <=> NULLIF(:second, 0))
            ORDER BY r.id DESC
            """)
        .param("eventId", eventId)
        .param("status", status)
        .param("search", search)
        .param("first", first)
        .param("second", second)
        .query(MentoringAdminRepository::registration)
        .list();
  }

  /**
   * Reserved registrations per option and session, in one GROUP BY. The original read every
   * registration of the event into the browser and counted there (docs/decisions/evaluation.md).
   *
   * <p>The inner query turns each registration into two rows, one per session, so that both
   * sessions can be counted by option in a single pass. Always returns eight rows: options 1 to 7
   * and then 0, "no choice".
   */
  public List<OptionCount> countByOption(String eventId) {
    int[] first = new int[MentoringOptions.COUNT + 1];
    int[] second = new int[MentoringOptions.COUNT + 1];
    jdbc.sql(
            """
            SELECT choice.option_no,
                   SUM(choice.session_no = 1) AS first_count,
                   SUM(choice.session_no = 2) AS second_count
            FROM (
              SELECT 1 AS session_no, COALESCE(first_option_no, 0) AS option_no
              FROM mentoring_registrations
              WHERE event_id = :eventId AND status = 'reserved'
              UNION ALL
              SELECT 2 AS session_no, COALESCE(second_option_no, 0) AS option_no
              FROM mentoring_registrations
              WHERE event_id = :eventId AND status = 'reserved'
            ) AS choice
            GROUP BY choice.option_no
            """)
        .param("eventId", eventId)
        .query(
            row -> {
              first[row.getInt("option_no")] = row.getInt("first_count");
              second[row.getInt("option_no")] = row.getInt("second_count");
            });

    List<String> names = findOptionNames(eventId);
    List<OptionCount> counts = new ArrayList<>();
    for (int option = 1; option <= MentoringOptions.COUNT; option++) {
      counts.add(new OptionCount(option, names.get(option - 1), first[option], second[option]));
    }
    counts.add(new OptionCount(MentoringOptions.NONE, "선택 안함", first[0], second[0]));
    return counts;
  }

  /** Switches the applications of an event on or off. Returns the number of rows changed. */
  public int setOpen(String eventId, boolean open) {
    return jdbc.sql("UPDATE mentoring_events SET is_open = ? WHERE id = ?")
        .param(open)
        .param(eventId)
        .update();
  }

  public boolean exists(String eventId) {
    return jdbc.sql("SELECT COUNT(*) FROM mentoring_events WHERE id = ?")
            .param(eventId)
            .query(Integer.class)
            .single()
        > 0;
  }

  private static EventRow event(ResultSet row, int n) throws SQLException {
    return new EventRow(
        row.getString("id"),
        row.getBoolean("is_open"),
        row.getBoolean("is_current"),
        SeoulTime.iso(row.getObject("apply_starts_at", LocalDateTime.class)),
        SeoulTime.iso(row.getObject("apply_ends_at", LocalDateTime.class)),
        SeoulTime.isoStartOfDay(row.getObject("event_date", LocalDate.class)),
        row.getString("location"),
        row.getString("intro"),
        row.getString("epic_folio_url"),
        row.getBoolean("is_epic_folio_link_open"),
        row.getInt("reserved_count"));
  }

  private static RegistrationRow registration(ResultSet row, int n) throws SQLException {
    return new RegistrationRow(
        Long.toString(row.getLong("id")),
        Long.toString(row.getLong("user_id")),
        row.getString("email"),
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
        Integer.toString(row.getInt("version")));
  }
}
