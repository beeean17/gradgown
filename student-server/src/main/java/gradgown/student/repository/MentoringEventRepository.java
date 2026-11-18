package gradgown.student.repository;

import gradgown.core.rule.MentoringOptions;
import gradgown.core.time.SeoulTime;
import gradgown.core.view.MentoringSessionView;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** St:talk events with their sessions and options. Read-only for the student account. */
@Repository
public class MentoringEventRepository {

  public record Event(
      String id,
      boolean open,
      LocalDateTime applyStartsAt,
      LocalDateTime applyEndsAt,
      LocalDate eventDate,
      String location,
      String intro,
      String epicFolioUrl,
      boolean epicFolioLinkOpen) {}

  private final JdbcClient jdbc;

  public MentoringEventRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<Event> findCurrentEvent() {
    return jdbc.sql(
            """
            SELECT id, is_open, apply_starts_at, apply_ends_at, event_date, location, intro,
                   epic_folio_url, is_epic_folio_link_open
            FROM mentoring_events
            WHERE is_current = TRUE
            """)
        .query(
            (row, n) ->
                new Event(
                    row.getString("id"),
                    row.getBoolean("is_open"),
                    row.getObject("apply_starts_at", LocalDateTime.class),
                    row.getObject("apply_ends_at", LocalDateTime.class),
                    row.getObject("event_date", LocalDate.class),
                    row.getString("location"),
                    row.getString("intro"),
                    row.getString("epic_folio_url"),
                    row.getBoolean("is_epic_folio_link_open")))
        .optional();
  }

  public List<MentoringSessionView> findSessions(String eventId) {
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
   * The notes of the event, one row per element of the JSON array, in the array's order.
   * JSON_TABLE turns the array into rows, so no JSON is parsed in Java.
   */
  public List<String> findNotes(String eventId) {
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
}
