package gradgown.admin.web;

import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import gradgown.core.error.MySqlError;
import gradgown.core.view.ErrorBody;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Writes every error as {@code { code, message, operationId }} (docs/contracts/web-api.md). */
@RestControllerAdvice
public class ApiExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ErrorBody> apiError(ApiException error) {
    return ResponseEntity.status(error.code().httpStatus()).body(ErrorBody.of(error));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ErrorBody> unreadableBody(HttpMessageNotReadableException error) {
    return apiError(new ApiException(ErrorCode.INVALID_ARGUMENT, "요청 본문을 확인해 주세요."));
  }

  /** A statement the database account is not allowed to run. */
  @ExceptionHandler(DataAccessException.class)
  public ResponseEntity<ErrorBody> databaseError(DataAccessException error) {
    if (MySqlError.isAccessDenied(error)) {
      return apiError(new ApiException(ErrorCode.PERMISSION_DENIED, "권한이 없습니다."));
    }
    return unexpected(error);
  }

  @ExceptionHandler(RuntimeException.class)
  public ResponseEntity<ErrorBody> unexpected(RuntimeException error) {
    log.error("Unexpected failure", error);
    return apiError(new ApiException(ErrorCode.INTERNAL, "요청을 처리하지 못했습니다."));
  }
}
