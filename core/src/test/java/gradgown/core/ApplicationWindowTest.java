package gradgown.core;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import gradgown.core.rule.ApplicationWindow;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Layer 3 of docs/testing/dynamic.md: the window rules, without a database or a server. */
class ApplicationWindowTest {

  private static final LocalDateTime APPLY_START = LocalDateTime.parse("2027-01-04T09:00:00");
  private static final LocalDateTime APPLY_END = LocalDateTime.parse("2027-01-08T18:00:00");
  private static final LocalDateTime EDIT_START = LocalDateTime.parse("2027-01-09T09:00:00");
  private static final LocalDateTime EDIT_END = LocalDateTime.parse("2027-01-12T18:00:00");

  private static final LocalDateTime IN_APPLY = LocalDateTime.parse("2027-01-05T12:00:00");
  private static final LocalDateTime IN_EDIT = LocalDateTime.parse("2027-01-10T12:00:00");
  private static final LocalDateTime BETWEEN = LocalDateTime.parse("2027-01-08T20:00:00");
  private static final LocalDateTime AFTER = LocalDateTime.parse("2027-01-13T00:00:00");

  @Test
  @DisplayName("RES-21 a new reservation needs the switch on and the application window")
  void createNeedsSwitchAndWindow() {
    assertTrue(canCreate(true, IN_APPLY));
    assertFalse(canCreate(false, IN_APPLY), "the switch is off");
    assertFalse(canCreate(true, IN_EDIT), "the edit window does not allow new reservations");
    assertFalse(canCreate(true, AFTER));
  }

  @Test
  @DisplayName("RES-21 the first and the last instant of a window are outside it")
  void windowBoundsAreExclusive() {
    assertFalse(canCreate(true, APPLY_START));
    assertFalse(canCreate(true, APPLY_END));
    assertTrue(canCreate(true, APPLY_START.plusSeconds(1)));
    assertTrue(canCreate(true, APPLY_END.minusSeconds(1)));
  }

  @Test
  @DisplayName("RES-21 a change or a cancellation is allowed in the edit window and in the application window")
  void changeAllowedInEitherWindow() {
    assertTrue(canChange(true, IN_APPLY));
    assertTrue(canChange(true, IN_EDIT));
    assertFalse(canChange(true, BETWEEN), "between the two windows");
    assertFalse(canChange(true, AFTER));
    assertFalse(canChange(false, IN_EDIT), "the switch is off");
  }

  @Test
  @DisplayName("MNT-21 St:talk uses one window for applying, changing and cancelling")
  void mentoringUsesOneWindow() {
    assertTrue(ApplicationWindow.canRegister(true, APPLY_START, APPLY_END, IN_APPLY));
    assertFalse(ApplicationWindow.canRegister(false, APPLY_START, APPLY_END, IN_APPLY));
    assertFalse(ApplicationWindow.canRegister(true, APPLY_START, APPLY_END, APPLY_END));
    assertFalse(ApplicationWindow.canRegister(true, APPLY_START, APPLY_END, AFTER));
  }

  private static boolean canCreate(boolean isOpen, LocalDateTime now) {
    return ApplicationWindow.canCreateReservation(isOpen, APPLY_START, APPLY_END, now);
  }

  private static boolean canChange(boolean isOpen, LocalDateTime now) {
    return ApplicationWindow.canChangeReservation(
        isOpen, APPLY_START, APPLY_END, EDIT_START, EDIT_END, now);
  }
}
