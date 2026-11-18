package gradgown.core.view;

import gradgown.core.error.ApiException;

/** The body of every error response. {@code operationId} is null outside a command. */
public record ErrorBody(String code, String message, String operationId) {

  public static ErrorBody of(ApiException error) {
    return new ErrorBody(error.code().code(), error.getMessage(), error.operationId());
  }
}
