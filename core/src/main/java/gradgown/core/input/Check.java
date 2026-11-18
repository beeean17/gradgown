package gradgown.core.input;

import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import java.util.regex.Pattern;

/** Format checks shared by the command inputs. A failed check is {@code invalid-argument}. */
public final class Check {

  /** RES-25: chosen by the client, one per submit. */
  private static final Pattern OPERATION_ID = Pattern.compile("[A-Za-z0-9_-]{16,128}");

  /** RES-12. */
  private static final Pattern PHONE = Pattern.compile("[0-9+()\\s-]{7,30}");

  private Check() {}

  public static ApiException invalid(String message) {
    return new ApiException(ErrorCode.INVALID_ARGUMENT, message);
  }

  public static String operationId(String value) {
    if (value == null || !OPERATION_ID.matcher(value).matches()) {
      throw invalid("요청 ID 형식을 확인해 주세요.");
    }
    return value;
  }

  /** The optimistic-lock token the client read with the row. */
  public static int version(String value) {
    try {
      return Integer.parseInt(value);
    } catch (NumberFormatException e) {
      throw invalid("버전 값을 확인해 주세요.");
    }
  }

  /** Trims the text and requires its length to be within the bounds. */
  public static String text(String value, int min, int max, String fieldName) {
    String trimmed = value == null ? "" : value.strip();
    int length = trimmed.codePointCount(0, trimmed.length());
    if (length < min || length > max) {
      throw invalid(fieldName + "을(를) 확인해 주세요.");
    }
    return trimmed;
  }

  /**
   * A JSON whole number. The field is declared as {@code Object} so that the JSON library hands
   * over what was sent instead of converting it: 2.9 and "2" are not whole numbers.
   */
  public static int wholeNumber(Object value, int min, int max, String message) {
    if (value instanceof Integer number && number >= min && number <= max) {
      return number;
    }
    throw invalid(message);
  }

  /** A JSON boolean, or nothing, which reads as false. */
  public static boolean flag(Object value, String fieldName) {
    if (value == null) {
      return false;
    }
    if (value instanceof Boolean flag) {
      return flag;
    }
    throw invalid(fieldName + " 값을 확인해 주세요.");
  }

  public static String phone(String value, String fieldName) {
    String trimmed = value == null ? "" : value.strip();
    if (!PHONE.matcher(trimmed).matches()) {
      throw invalid(fieldName + " 형식을 확인해 주세요.");
    }
    return trimmed;
  }
}
