package gradgown.core.view;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** {@code ReservationPeriod} of the student web: the current gown period and its slots. */
public record ReservationPeriodView(
    String periodId,
    String title,
    String status,
    String applyStartAt,
    String applyEndAt,
    String editStartAt,
    String editEndAt,
    List<ReservationSlotView> rentSlots,
    List<ReservationSlotView> returnSlots) {

  private static final Pattern PERIOD_ID = Pattern.compile("(\\d{4})-(\\d{2})");

  /** {@code 2027-02} becomes {@code 2027년 2월 학위복 예약}, as the original web titled it. */
  public static String titleOf(String periodId) {
    Matcher match = PERIOD_ID.matcher(periodId);
    return match.matches()
        ? match.group(1) + "년 " + Integer.parseInt(match.group(2)) + "월 학위복 예약"
        : "학위복 예약";
  }
}
