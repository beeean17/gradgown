package gradgown.student.service;

import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import gradgown.core.error.MySqlError;
import gradgown.core.input.Check;
import gradgown.student.repository.AuditLogRepository;
import java.util.Optional;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Runs a student command once and records how it ended.
 *
 * <ol>
 *   <li>Insert an audit log row keyed by the operation ID, in its own transaction. If the ID was
 *       used before, the primary key rejects the row and the earlier outcome decides the answer
 *       (RES-25, RES-26).
 *   <li>Run the change in one transaction. The audit log row turns to {@code succeeded} in that
 *       same transaction, so the two can only commit together.
 *   <li>If the change fails, its transaction rolls back, and the audit log row turns to
 *       {@code rejected} or {@code failed} afterwards.
 * </ol>
 */
@Component
public class CommandRunner {

  /** What the change did: the row it touched and the status the row has now. */
  public record Done(long targetId, String status) {}

  /** The answer to the client. {@code replayed} is true when an earlier success is returned. */
  public record Result(String operationId, long targetId, String status, boolean replayed) {}

  private static final Logger log = LoggerFactory.getLogger(CommandRunner.class);

  private final AuditLogRepository auditLogs;
  private final TransactionTemplate transaction;

  public CommandRunner(AuditLogRepository auditLogs, TransactionTemplate transaction) {
    this.auditLogs = auditLogs;
    this.transaction = transaction;
  }

  /**
   * @param action for example {@code reservation.create}; its last part decides the status a
   *     replay reports
   * @param change the validation and the writes; throws {@link ApiException} to reject
   */
  public Result run(
      String operationId, String domain, String action, long actorId, Supplier<Done> change) {
    String id = Check.operationId(operationId);

    Optional<Result> earlier;
    try {
      earlier = begin(id, domain, action, actorId);
    } catch (ApiException error) {
      throw error;
    } catch (RuntimeException failure) {
      // Nothing was recorded, for example because the database is unreachable.
      throw toApiError(failure).withOperationId(id);
    }
    if (earlier.isPresent()) {
      return earlier.get();
    }

    try {
      Done done =
          transaction.execute(
              status -> {
                Done result = change.get();
                auditLogs.markSucceeded(id, result.targetId());
                return result;
              });
      return new Result(id, done.targetId(), done.status(), false);
    } catch (RuntimeException failure) {
      ApiException error = toApiError(failure);
      recordEnd(id, error);
      throw error.withOperationId(id);
    }
  }

  /** Claims the operation ID, or answers from the earlier use of it. */
  private Optional<Result> begin(String id, String domain, String action, long actorId) {
    try {
      auditLogs.insertReceived(id, domain, action, actorId);
      return Optional.empty();
    } catch (DataAccessException failure) {
      if (!MySqlError.is(failure, MySqlError.DUPLICATE_KEY)) {
        throw failure;
      }
    }

    AuditLogRepository.Entry entry =
        auditLogs
            .find(id)
            .orElseThrow(() -> new ApiException(ErrorCode.INTERNAL, "요청 기록을 확인하지 못했습니다."));
    if (entry.actorId() != actorId || !entry.action().equals(action)) {
      throw new ApiException(ErrorCode.PERMISSION_DENIED, "다른 요청에 사용된 요청 ID입니다.")
          .withOperationId(id);
    }
    return switch (entry.outcome()) {
      case "succeeded" ->
          Optional.of(new Result(id, entry.targetId(), statusAfter(action), true));
      case "received" -> {
        // Still running, or it died without an outcome. After two minutes it is taken as
        // dead, so that the client stops retrying this ID, as in the original service.
        if (entry.abandoned()) {
          throw new ApiException(ErrorCode.FAILED_PRECONDITION, "이미 실패한 요청에 사용되었습니다.")
              .withOperationId(id);
        }
        throw new ApiException(ErrorCode.ABORTED, "같은 요청을 처리 중이거나 결과를 확인 중입니다.")
            .withOperationId(id);
      }
      default ->
          throw new ApiException(ErrorCode.FAILED_PRECONDITION, "이미 실패한 요청에 사용되었습니다.")
              .withOperationId(id);
    };
  }

  private static String statusAfter(String action) {
    return action.endsWith(".cancel") ? "cancelled" : "reserved";
  }

  private static ApiException toApiError(RuntimeException failure) {
    if (failure instanceof ApiException error) {
      return error;
    }
    if (MySqlError.isLockConflict(failure)) {
      return new ApiException(
          ErrorCode.ABORTED, "다른 요청과 겹쳤습니다. 최신 내용을 확인하고 다시 시도해 주세요.", null, failure);
    }
    if (MySqlError.isAccessDenied(failure)) {
      return new ApiException(ErrorCode.PERMISSION_DENIED, "권한이 없습니다.", null, failure);
    }
    log.error("A command failed", failure);
    return new ApiException(
        ErrorCode.INTERNAL, "요청을 완료하지 못했습니다. 요청 추적 ID와 함께 관리자에게 문의해 주세요.", null, failure);
  }

  private void recordEnd(String id, ApiException error) {
    try {
      auditLogs.markEnded(
          id,
          error.code().isServerFailure() ? "failed" : "rejected",
          error.code().failureKind(),
          error.code().code());
    } catch (RuntimeException failure) {
      // The row stays "received": the outcome is then unknown, which is true.
      log.error("Could not record the end of command {}", id, failure);
    }
  }
}
