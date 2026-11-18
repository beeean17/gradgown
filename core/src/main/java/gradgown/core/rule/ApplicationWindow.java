package gradgown.core.rule;

import java.time.LocalDateTime;

/**
 * When a student may apply, change or cancel. These rules look at the current time, so the schema
 * cannot hold them (docs/decisions/data-model.md, "서비스 코드에 남는 규칙").
 */
public final class ApplicationWindow {

  private ApplicationWindow() {}

  /** True strictly between the two times. The start and the end themselves are outside. */
  public static boolean contains(LocalDateTime startsAt, LocalDateTime endsAt, LocalDateTime now) {
    return now.isAfter(startsAt) && now.isBefore(endsAt);
  }

  /** RES-21: a new gown reservation needs the switch on and the application window. */
  public static boolean canCreateReservation(
      boolean isOpen, LocalDateTime applyStartsAt, LocalDateTime applyEndsAt, LocalDateTime now) {
    return isOpen && contains(applyStartsAt, applyEndsAt, now);
  }

  /**
   * RES-21: changing or cancelling a gown reservation needs the switch on and either the edit
   * window or the application window.
   */
  public static boolean canChangeReservation(
      boolean isOpen,
      LocalDateTime applyStartsAt,
      LocalDateTime applyEndsAt,
      LocalDateTime editStartsAt,
      LocalDateTime editEndsAt,
      LocalDateTime now) {
    return isOpen
        && (contains(editStartsAt, editEndsAt, now) || contains(applyStartsAt, applyEndsAt, now));
  }

  /** MNT-21: applying, changing and cancelling a St:talk registration share one window. */
  public static boolean canRegister(
      boolean isOpen, LocalDateTime applyStartsAt, LocalDateTime applyEndsAt, LocalDateTime now) {
    return isOpen && contains(applyStartsAt, applyEndsAt, now);
  }
}
