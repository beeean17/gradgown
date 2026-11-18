package gradgown.core.error;

/**
 * The error codes of the API (docs/contracts/web-api.md). They are the callable codes of the
 * original service, so the web's error handling works unchanged.
 */
public enum ErrorCode {
  INVALID_ARGUMENT("invalid-argument", 400, "validation"),
  UNAUTHENTICATED("unauthenticated", 401, "authentication"),
  PERMISSION_DENIED("permission-denied", 403, "authorization"),
  NOT_FOUND("not-found", 404, "not-found"),
  ALREADY_EXISTS("already-exists", 409, "duplicate"),
  ABORTED("aborted", 409, "conflict"),
  FAILED_PRECONDITION("failed-precondition", 422, "business-rule"),
  INTERNAL("internal", 500, "internal");

  private final String code;
  private final int httpStatus;
  private final String failureKind;

  ErrorCode(String code, int httpStatus, String failureKind) {
    this.code = code;
    this.httpStatus = httpStatus;
    this.failureKind = failureKind;
  }

  /** The value of {@code code} in an error body. */
  public String code() {
    return code;
  }

  public int httpStatus() {
    return httpStatus;
  }

  /** The value stored in {@code audit_logs.failure_kind}. */
  public String failureKind() {
    return failureKind;
  }

  /** True when the server failed, false when it read the request and turned it down. */
  public boolean isServerFailure() {
    return this == INTERNAL;
  }
}
