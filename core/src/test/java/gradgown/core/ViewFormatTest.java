package gradgown.core;

import static org.junit.jupiter.api.Assertions.assertEquals;

import gradgown.core.time.SeoulTime;
import gradgown.core.view.ReservationPeriodView;
import gradgown.core.view.ReservationSlotView;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Layer 3 of docs/testing/dynamic.md: how times and labels are written for the web. */
class ViewFormatTest {

  @Test
  @DisplayName("a time is written as an ISO string with the Seoul offset")
  void isoWithSeoulOffset() {
    assertEquals(
        "2026-10-20T13:00:00+09:00", SeoulTime.iso(LocalDateTime.parse("2026-10-20T13:00:00")));
    assertEquals("2027-01-13T00:00:00+09:00", SeoulTime.isoStartOfDay(LocalDate.parse("2027-01-13")));
    assertEquals("", SeoulTime.iso(null));
  }

  @Test
  @DisplayName("'now' is the Seoul time whatever zone the clock is in")
  void nowIsSeoulTime() {
    Clock utc = Clock.fixed(Instant.parse("2026-12-31T16:00:00Z"), ZoneOffset.UTC);

    assertEquals(LocalDateTime.parse("2027-01-01T01:00:00"), SeoulTime.now(utc));
  }

  @Test
  @DisplayName("a slot is labelled with its start and end clock times")
  void slotLabel() {
    ReservationSlotView slot =
        ReservationSlotView.of(
            5,
            "2027-02",
            "rent",
            LocalDateTime.parse("2027-02-15T10:00:00"),
            LocalDateTime.parse("2027-02-15T10:30:00"),
            true);

    assertEquals("5", slot.slotId());
    assertEquals("10:00–10:30", slot.label());
    assertEquals("2027-02-15T10:00:00+09:00", slot.startsAt());
  }

  @Test
  @DisplayName("a period is titled from its ID")
  void periodTitle() {
    assertEquals("2027년 2월 학위복 예약", ReservationPeriodView.titleOf("2027-02"));
    assertEquals("학위복 예약", ReservationPeriodView.titleOf("unknown"));
  }
}
