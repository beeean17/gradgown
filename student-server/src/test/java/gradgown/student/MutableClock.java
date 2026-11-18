package gradgown.student;

import gradgown.core.time.SeoulTime;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/** A clock the tests set, so that "now" is inside or outside a window on purpose. */
final class MutableClock extends Clock {

  private volatile Instant now = Instant.EPOCH;

  /** Sets the time, for example {@code 2026-12-01T10:00:00+09:00}. */
  void setTo(String isoTime) {
    now = OffsetDateTime.parse(isoTime).toInstant();
  }

  @Override
  public Instant instant() {
    return now;
  }

  @Override
  public ZoneId getZone() {
    return SeoulTime.ZONE;
  }

  @Override
  public Clock withZone(ZoneId zone) {
    return Clock.fixed(now, zone);
  }
}
