package gradgown.admin.repository;

import gradgown.core.time.SeoulTime;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The audit log for the admin app. */
@Repository
public class AuditLogAdminRepository {

  public record AuditLogRow(
      String operationId,
      String domain,
      String action,
      String actorId,
      String actorEmail,
      String targetId,
      String outcome,
      String failureKind,
      String errorCode,
      String createdAt,
      String completedAt) {}

  /** A row with its exact creation time, which the cursor needs and the response does not. */
  private record Fetched(AuditLogRow row, LocalDateTime createdAt) {}

  private final JdbcClient jdbc;

  public AuditLogAdminRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /**
   * Audit log rows, newest first, one page at a time, filtered in the WHERE clause. The original
   * read the latest 200 documents and searched them in the browser
   * (docs/decisions/evaluation.md, A5).
   *
   * <p>Paging is by key on (created_at, operation_id): two rows can share a millisecond, and the
   * operation ID breaks the tie. The cursor condition is written out as "earlier, or the same
   * instant and a smaller ID" on purpose. The row comparison {@code (created_at, operation_id) <
   * (?, ?)} means the same, but MySQL does not turn it into an index range: every page then
   * scanned the index again from the newest row, and page 10 read ten pages' worth
   * (eval/results).
   *
   * @param operationId an exact operation ID, the one an error message shows to a student, or
   *     null. A lookup by primary key.
   */
  public Page<AuditLogRow> find(
      String domain,
      String outcome,
      String operationId,
      LocalDateTime cursorTime,
      String cursorId,
      int size) {
    List<Fetched> rows =
        jdbc.sql(
                """
                SELECT a.operation_id, a.domain, a.action, a.actor_id, u.email AS actor_email,
                       a.target_id, a.outcome, a.failure_kind, a.error_code,
                       a.created_at, a.completed_at
                FROM audit_logs AS a
                JOIN users AS u ON u.id = a.actor_id
                WHERE (:domain IS NULL OR a.domain = :domain)
                  AND (:outcome IS NULL OR a.outcome = :outcome)
                  AND (:operationId IS NULL OR a.operation_id = :operationId)
                  AND (:cursorTime IS NULL
                       OR a.created_at < :cursorTime
                       OR (a.created_at = :cursorTime AND a.operation_id < :cursorId))
                ORDER BY a.created_at DESC, a.operation_id DESC
                LIMIT :limit
                """)
            .param("domain", domain)
            .param("outcome", outcome)
            .param("operationId", operationId)
            .param("cursorTime", cursorTime)
            .param("cursorId", cursorId)
            .param("limit", size + 1)
            .query(
                (row, n) -> {
                  LocalDateTime createdAt = row.getObject("created_at", LocalDateTime.class);
                  Long targetId = row.getObject("target_id", Long.class);
                  return new Fetched(
                      new AuditLogRow(
                      row.getString("operation_id"),
                      row.getString("domain"),
                      row.getString("action"),
                      Long.toString(row.getLong("actor_id")),
                      row.getString("actor_email"),
                      targetId == null ? null : Long.toString(targetId),
                      row.getString("outcome"),
                      row.getString("failure_kind"),
                      row.getString("error_code"),
                      SeoulTime.iso(createdAt),
                      SeoulTime.iso(row.getObject("completed_at", LocalDateTime.class))),
                      createdAt);
                })
            .list();
    Page<Fetched> page =
        Page.of(rows, size, last -> last.createdAt() + "," + last.row().operationId());
    return new Page<>(page.items().stream().map(Fetched::row).toList(), page.nextCursor());
  }
}
