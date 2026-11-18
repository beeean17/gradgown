package gradgown.admin.repository;

import gradgown.core.time.SeoulTime;
import gradgown.core.view.AnnouncementView;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Announcements and FAQs for the admin app, hidden ones included. This reads the tables
 * themselves. The student account cannot: it has the view of visible announcements only.
 */
@Repository
public class ContentAdminRepository {

  public record FaqView(
      String id,
      String question,
      String answer,
      String category,
      List<String> tags,
      int order,
      boolean isVisible,
      String createdAt,
      String updatedAt) {}

  private final JdbcClient jdbc;

  public ContentAdminRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** Every announcement, pinned first, then newest first. */
  public List<AnnouncementView> findAnnouncements() {
    return jdbc.sql(
            """
            SELECT id, title, content, category, is_pinned, is_visible, is_popup, show_on_home,
                   author_id, created_at, updated_at
            FROM announcements
            ORDER BY is_pinned DESC, created_at DESC, id DESC
            """)
        .query(
            (row, n) -> {
              String createdAt = SeoulTime.iso(row.getObject("created_at", LocalDateTime.class));
              return new AnnouncementView(
                  Long.toString(row.getLong("id")),
                  row.getString("title"),
                  row.getString("content"),
                  row.getString("category"),
                  List.of(),
                  List.of(),
                  row.getBoolean("is_pinned"),
                  row.getBoolean("is_visible"),
                  row.getBoolean("show_on_home"),
                  row.getBoolean("is_popup"),
                  Long.toString(row.getLong("author_id")),
                  createdAt,
                  SeoulTime.iso(row.getObject("updated_at", LocalDateTime.class)),
                  createdAt);
            })
        .list();
  }

  /** Every FAQ in display order, each with its tags. */
  public List<FaqView> findFaqs() {
    Map<Long, List<String>> tags = findFaqTags();
    return jdbc.sql(
            """
            SELECT id, question, answer, category, display_order, is_visible, created_at, updated_at
            FROM faqs
            ORDER BY display_order, id
            """)
        .query(
            (row, n) ->
                new FaqView(
                    Long.toString(row.getLong("id")),
                    row.getString("question"),
                    row.getString("answer"),
                    row.getString("category"),
                    tags.getOrDefault(row.getLong("id"), List.of()),
                    row.getInt("display_order"),
                    row.getBoolean("is_visible"),
                    SeoulTime.iso(row.getObject("created_at", LocalDateTime.class)),
                    SeoulTime.iso(row.getObject("updated_at", LocalDateTime.class))))
        .list();
  }

  /** The tags of every FAQ: JSON_TABLE turns each JSON array into rows, in the array's order. */
  private Map<Long, List<String>> findFaqTags() {
    Map<Long, List<String>> tags = new HashMap<>();
    jdbc.sql(
            """
            SELECT f.id, tag.body
            FROM faqs AS f,
                 JSON_TABLE(f.tags, '$[*]'
                            COLUMNS (ord FOR ORDINALITY, body VARCHAR(100) PATH '$')) AS tag
            ORDER BY f.id, tag.ord
            """)
        .query(
            row -> {
              tags.computeIfAbsent(row.getLong("id"), id -> new ArrayList<>())
                  .add(row.getString("body"));
            });
    return tags;
  }
}
