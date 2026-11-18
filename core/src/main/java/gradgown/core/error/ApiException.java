package gradgown.core.error;

/** A request the server answers with an error body: {@code { code, message, operationId }}. */
public class ApiException extends RuntimeException {

  private static final long serialVersionUID = 1L;

  private final ErrorCode code;
  private final String operationId;

  public ApiException(ErrorCode code, String message) {
    this(code, message, null, null);
  }

  public ApiException(ErrorCode code, String message, String operationId, Throwable cause) {
    super(message, cause);
    this.code = code;
    this.operationId = operationId;
  }

  public ErrorCode code() {
    return code;
  }

  /** The command this error belongs to, or {@code null} for a read. */
  public String operationId() {
    return operationId;
  }

  /** The same error, tagged with the command it belongs to. */
  public ApiException withOperationId(String id) {
    return new ApiException(code, getMessage(), id, this);
  }
}
