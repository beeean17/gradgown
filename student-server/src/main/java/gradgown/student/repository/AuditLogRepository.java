package gradgown.student.repository;

import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * The audit log of commands. Its primary key, the operation ID, is what makes a command run once
 * (RES-25, MNT-24). No input value (name, student ID, phone) is written here (RES-32, MNT-27).
 */
@Repository
public class AuditLogRepository {

  /**
   * @param abandoned true when the row has been {@code received} for more than two minutes: the
   *     request that claimed the ID never recorded an outcome
   */
  public record Entry(
      long actorId, String action, String outcome, Long targetId, boolean abandoned) {}

  private final JdbcClient jdbc;

  public AuditLogRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /**
   * Records that a command arrived. If the operation ID was used before, the primary key rejects
   * the row with MySQL error 1062.
   */
  public void insertReceived(String operationId, String domain, String action, long actorId) {
    jdbc.sql(
            """
            INSERT INTO audit_logs (operation_id, domain, action, actor_id, outcome)
            VALUES (?, ?, ?, ?, 'received')
            """)
        .param(operationId)
        .param(domain)
        .param(action)
        .param(actorId)
        .update();
  }

  public Optional<Entry> find(String operationId) {
    return jdbc.sql(
            """
            SELECT actor_id, action, outcome, target_id,
                   outcome = 'received'
                     AND created_at < CURRENT_TIMESTAMP(3) - INTERVAL 2 MINUTE AS abandoned
            FROM audit_logs
            WHERE operation_id = ?
            """)
        .param(operationId)
        .query(
            (row, n) ->
                new Entry(
                    row.getLong("actor_id"),
                    row.getString("action"),
                    row.getString("outcome"),
                    row.getObject("target_id", Long.class),
                    row.getBoolean("abandoned")))
        .optional();
  }

  /** Runs in the same transaction as the change it records. */
  public void markSucceeded(String operationId, long targetId) {
    jdbc.sql(
            """
            UPDATE audit_logs
            SET outcome = 'succeeded', target_id = ?, completed_at = CURRENT_TIMESTAMP(3)
            WHERE operation_id = ? AND outcome = 'received'
            """)
        .param(targetId)
        .param(operationId)
        .update();
  }

  /**
   * {@code outcome} is {@code rejected} (the request's fault) or {@code failed} (the server's).
   *
   * <p>Only a row that is still {@code received} changes. If the change did commit and only the
   * acknowledgement was lost, the row already says {@code succeeded} and must stay so: a retry
   * with the same operation ID then gets the earlier success back.
   */
  public void markEnded(String operationId, String outcome, String failureKind, String errorCode) {
    jdbc.sql(
            """
            UPDATE audit_logs
            SET outcome = ?, failure_kind = ?, error_code = ?, completed_at = CURRENT_TIMESTAMP(3)
            WHERE operation_id = ? AND outcome = 'received'
            """)
        .param(outcome)
        .param(failureKind)
        .param(errorCode)
        .param(operationId)
        .update();
  }
}
