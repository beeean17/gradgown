package gradgown.core.input;

import gradgown.core.time.SeoulTime;
import java.time.LocalDateTime;
import java.util.Locale;

/**
 * The {@code input} of a gown reservation command, as the web sends it. The fields and their rules
 * are those of the original {@code ReservationInput} (grad42 docs/contracts/reservation-command.md).
 */
public record ReservationInput(
    String name,
    String studentId,
    String department,
    String phone,
    String size,
    String slotId,
    String rentAt,
    String returnAt,
    Object isProxy,
    String proxyName,
    String proxyPhone) {

  /** The input after the format checks, in the form the database stores. */
  public record Valid(
      String name,
      String studentId,
      String department,
      String phone,
      String size,
      long rentSlotId,
      LocalDateTime rentAt,
      LocalDateTime returnAt,
      boolean proxy,
      String proxyName,
      String proxyPhone) {}

  /**
   * Checks the formats.
   *
   * @throws gradgown.core.error.ApiException {@code invalid-argument}
   */
  public Valid validate() {
    String validSize = size == null ? "" : size.strip().toLowerCase(Locale.ROOT);
    if (!validSize.equals("s") && !validSize.equals("m") && !validSize.equals("l")) {
      throw Check.invalid("사이즈를 확인해 주세요.");
    }
    long rentSlotId;
    try {
      rentSlotId = Long.parseLong(slotId == null ? "" : slotId.strip());
    } catch (NumberFormatException e) {
      throw Check.invalid("대여 시간을 확인해 주세요.");
    }
    LocalDateTime rent = SeoulTime.parse(rentAt, "대여");
    LocalDateTime back = SeoulTime.parse(returnAt, "반납");
    // RES-13: the same time is allowed.
    if (back.isBefore(rent)) {
      throw Check.invalid("반납 시각은 대여 시각과 같거나 이후여야 합니다.");
    }
    boolean proxy = Check.flag(isProxy, "대리 수령");
    return new Valid(
        Check.text(name, 1, 60, "이름"),
        Check.text(studentId, 1, 30, "학번"),
        Check.text(department, 1, 60, "학과"),
        Check.phone(phone, "전화번호"),
        validSize,
        rentSlotId,
        rent,
        back,
        proxy,
        // The schema requires both proxy columns to be NULL when it is not a proxy pickup.
        proxy ? Check.text(proxyName, 1, 60, "대리 수령자 이름") : null,
        proxy ? Check.phone(proxyPhone, "대리 수령자 전화번호") : null);
  }
}
