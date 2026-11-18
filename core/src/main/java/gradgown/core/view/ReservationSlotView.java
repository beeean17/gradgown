package gradgown.core.view;

import gradgown.core.time.SeoulTime;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/** {@code ReservationSlot} of the student web (web/src/shared/types). */
public record ReservationSlotView(
    String slotId,
    String periodId,
    String type,
    String startsAt,
    String endsAt,
    String label,
    boolean isActive) {

  private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("HH:mm");

  /** {@code type} is {@code rent} or {@code return}: the web lists every slot once for each. */
  public static ReservationSlotView of(
      long id,
      String periodId,
      String type,
      LocalDateTime startsAt,
      LocalDateTime endsAt,
      boolean enabled) {
    return new ReservationSlotView(
        Long.toString(id),
        periodId,
        type,
        SeoulTime.iso(startsAt),
        SeoulTime.iso(endsAt),
        startsAt.format(CLOCK) + "–" + endsAt.format(CLOCK),
        enabled);
  }
}
