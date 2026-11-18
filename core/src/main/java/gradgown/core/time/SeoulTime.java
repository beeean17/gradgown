package gradgown.core.time;

import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;

/**
 * Times in this service are Seoul times. The database sessions run in +09:00, so a TIMESTAMP read
 * as a {@link LocalDateTime} is a Seoul wall-clock time, and the API writes it with the Seoul
 * offset: {@code 2026-10-20T13:00:00+09:00}.
 */
public final class SeoulTime {

  public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

  private static final DateTimeFormatter ISO =
      DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'+09:00'");

  private SeoulTime() {}

  /** The current Seoul time. */
  public static LocalDateTime now(Clock clock) {
    return LocalDateTime.now(clock.withZone(ZONE));
  }

  /** A Seoul time as the API writes it. {@code null} becomes the empty string. */
  public static String iso(LocalDateTime seoulTime) {
    return seoulTime == null ? "" : seoulTime.truncatedTo(ChronoUnit.SECONDS).format(ISO);
  }

  /** Midnight of a date in Seoul, as the API writes it. */
  public static String isoStartOfDay(LocalDate date) {
    return date == null ? "" : iso(date.atStartOfDay());
  }

  /**
   * Reads an ISO time with an offset or {@code Z} and returns the Seoul time of that instant.
   *
   * @throws ApiException {@code invalid-argument} when the text is not such a time
   */
  public static LocalDateTime parse(String isoText, String fieldName) {
    try {
      return OffsetDateTime.parse(isoText).atZoneSameInstant(ZONE).toLocalDateTime();
    } catch (DateTimeParseException | NullPointerException e) {
      throw new ApiException(ErrorCode.INVALID_ARGUMENT, fieldName + " 시각 형식을 확인해 주세요.");
    }
  }
}
