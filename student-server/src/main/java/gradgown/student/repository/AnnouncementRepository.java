package gradgown.student.repository;

import gradgown.core.time.SeoulTime;
import gradgown.core.view.AnnouncementView;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Announcements a student may read. The student account has no privilege on the announcements
 * table. It reads the view visible_announcements, which leaves hidden announcements out, so a
 * hidden announcement cannot reach this server (db/init/02-views.sql).
 */
@Repository
public class AnnouncementRepository {

  private static final String SELECT_VIEW =
      """
      SELECT id, title, content, category, is_pinned, is_popup, show_on_home, author_id,
             created_at, updated_at
      FROM visible_announcements
      """;

  private final JdbcClient jdbc;

  public AnnouncementRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** Pinned first, then newest first. */
  public List<AnnouncementView> findAll() {
    return jdbc.sql(SELECT_VIEW + "ORDER BY is_pinned DESC, created_at DESC, id DESC")
        .query(AnnouncementRepository::view)
        .list();
  }

  public Optional<AnnouncementView> findById(long id) {
    return jdbc.sql(SELECT_VIEW + "WHERE id = ?")
        .param(id)
        .query(AnnouncementRepository::view)
        .optional();
  }

  private static AnnouncementView view(ResultSet row, int n) throws SQLException {
    String createdAt = SeoulTime.iso(row.getObject("created_at", LocalDateTime.class));
    return new AnnouncementView(
        Long.toString(row.getLong("id")),
        row.getString("title"),
        row.getString("content"),
        row.getString("category"),
        List.of(),
        List.of(),
        row.getBoolean("is_pinned"),
        // Every row of the view is visible.
        true,
        row.getBoolean("show_on_home"),
        row.getBoolean("is_popup"),
        Long.toString(row.getLong("author_id")),
        createdAt,
        SeoulTime.iso(row.getObject("updated_at", LocalDateTime.class)),
        createdAt);
  }
}
