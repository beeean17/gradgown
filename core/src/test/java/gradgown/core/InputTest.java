package gradgown.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import gradgown.core.input.Check;
import gradgown.core.input.MentoringInput;
import gradgown.core.input.ReservationInput;
import gradgown.core.rule.MentoringOptions;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

/** Layer 3 of docs/testing/dynamic.md: the input formats, without a database or a server. */
class InputTest {

  @Test
  @DisplayName("RES-13 the return time may equal the rent time but not precede it")
  void returnNotBeforeRent() {
    reservation("2027-02-15T10:00:00+09:00", "2027-02-15T10:00:00+09:00").validate();
    assertInvalid(() -> reservation("2027-02-15T10:30:00+09:00", "2027-02-15T10:00:00+09:00").validate());
  }

  @Test
  @DisplayName("a time sent in UTC keeps its Seoul date near midnight")
  void utcTimeNearMidnight() {
    // 15:30 UTC on the 15th is 00:30 on the 16th in Seoul.
    ReservationInput.Valid valid =
        reservation("2027-02-15T15:30:00Z", "2027-02-15T15:30:00.000Z").validate();

    assertEquals(LocalDateTime.parse("2027-02-16T00:30:00"), valid.rentAt());
    assertEquals(LocalDateTime.parse("2027-02-16T00:30:00"), valid.returnAt());
  }

  @Test
  @DisplayName("a time is read to the second, and a time no TIMESTAMP can hold is invalid")
  void timeRange() {
    ReservationInput.Valid valid =
        reservation("2027-02-15T10:00:00.789+09:00", "2027-02-15T10:00:00.999+09:00").validate();
    assertEquals(LocalDateTime.parse("2027-02-15T10:00:00"), valid.rentAt());
    assertEquals(LocalDateTime.parse("2027-02-15T10:00:00"), valid.returnAt());

    assertInvalid(() -> reservation("2027-02-15T10:00:00+09:00", "2040-01-01T00:00:00+09:00").validate());
    assertInvalid(() -> reservation("2027-02-15T10:00:00+09:00", "+12345-01-01T00:00:00Z").validate());
    assertInvalid(() -> reservation("2027-02-15T10:00:00+09:00", "+999999999-12-31T23:59:59Z").validate());
    assertInvalid(() -> reservation("2027-02-15 10:00", "2027-02-17T10:00:00+09:00").validate());
    assertInvalid(() -> reservation(null, "2027-02-17T10:00:00+09:00").validate());
  }

  @Test
  @DisplayName("RES-29 the size is stored in lower case and must be s, m or l")
  void sizeIsLowerCased() {
    assertEquals("l", reservationWithSize("L").validate().size());
    assertInvalid(() -> reservationWithSize("xl").validate());
  }

  @Test
  @DisplayName("RES-12 the phone number allows digits, +, (), spaces and hyphens, 7 to 30 long")
  void phoneFormat() {
    assertEquals("010-0000-0001", Check.phone(" 010-0000-0001 ", "전화번호"));
    assertInvalid(() -> Check.phone("010-abcd-0001", "전화번호"));
    assertInvalid(() -> Check.phone("12345", "전화번호"));
  }

  @Test
  @DisplayName("a proxy pickup needs the proxy's name and phone; otherwise both are dropped")
  void proxyDetails() {
    ReservationInput proxy =
        new ReservationInput("홍길동", "99990001", "화학공학과", "010-0000-0001", "m", "5",
            "2027-02-15T10:00:00+09:00", "2027-02-17T10:00:00+09:00", true, "방자", "010-0000-0013");
    assertEquals("방자", proxy.validate().proxyName());

    ReservationInput withoutName =
        new ReservationInput("홍길동", "99990001", "화학공학과", "010-0000-0001", "m", "5",
            "2027-02-15T10:00:00+09:00", "2027-02-17T10:00:00+09:00", true, "", "010-0000-0013");
    assertInvalid(withoutName::validate);

    ReservationInput notProxy =
        new ReservationInput("홍길동", "99990001", "화학공학과", "010-0000-0001", "m", "5",
            "2027-02-15T10:00:00+09:00", "2027-02-17T10:00:00+09:00", false, "방자", "010-0000-0013");
    assertNull(notProxy.validate().proxyName());
    assertNull(notProxy.validate().proxyPhone());
  }

  @Test
  @DisplayName("a name is required and limited in length")
  void nameLength() {
    assertInvalid(() -> Check.text("  ", 1, 60, "이름"));
    assertInvalid(() -> Check.text("가".repeat(61), 1, 60, "이름"));
    assertEquals("홍길동", Check.text(" 홍길동 ", 1, 60, "이름"));
  }

  @Test
  @DisplayName("MNT-11 the St:talk student ID is eight digits and the grade is 1 to 4")
  void mentoringStudentIdAndGrade() {
    mentoring("99990001", 4, 1, 2).validate();
    assertInvalid(() -> mentoring("9999000", 4, 1, 2).validate());
    assertInvalid(() -> mentoring("9999000a", 4, 1, 2).validate());
    assertInvalid(() -> mentoring("99990001", 5, 1, 2).validate());
    assertInvalid(() -> mentoring("99990001", null, 1, 2).validate());
    // What JSON sent as 2.9 or "2" arrives as a Double or a String, not as a whole number.
    assertInvalid(() -> mentoring("99990001", 2.9, 1, 2).validate());
    assertInvalid(() -> mentoring("99990001", "2", 1, 2).validate());
  }

  @Test
  @DisplayName("MNT-25 the two sessions cannot hold the same option or both be 'no choice'")
  void mentoringSelection() {
    mentoring("99990001", 3, 0, 2).validate();
    mentoring("99990001", 3, 2, 0).validate();
    assertInvalid(() -> mentoring("99990001", 3, 2, 2).validate());
    assertInvalid(() -> mentoring("99990001", 3, 0, 0).validate());
    assertInvalid(() -> mentoring("99990001", 3, 8, 1).validate());
    assertInvalid(() -> mentoring("99990001", 3, -1, 1).validate());
  }

  @Test
  @DisplayName("'no choice' is 0 in the API and NULL in the database")
  void noChoiceConversion() {
    assertNull(MentoringOptions.toColumn(0));
    assertEquals(3, MentoringOptions.toColumn(3));
    assertEquals(0, MentoringOptions.fromColumn(null));
    assertEquals(3, MentoringOptions.fromColumn(3));
  }

  @Test
  @DisplayName("RES-25 an operation ID is 16 to 128 letters, digits, hyphens or underscores")
  void operationIdFormat() {
    Check.operationId("0123456789abcdef");
    Check.operationId("3f2b8c1e-9a4d-4f6b-8c2e-1d5a7b9c0e3f");
    assertInvalid(() -> Check.operationId("too-short"));
    assertInvalid(() -> Check.operationId("has space 0123456789"));
    assertInvalid(() -> Check.operationId(null));
  }

  private static ReservationInput reservation(String rentAt, String returnAt) {
    return new ReservationInput("홍길동", "99990001", "화학공학과", "010-0000-0001", "m", "5",
        rentAt, returnAt, false, null, null);
  }

  private static ReservationInput reservationWithSize(String size) {
    return new ReservationInput("홍길동", "99990001", "화학공학과", "010-0000-0001", size, "5",
        "2027-02-15T10:00:00+09:00", "2027-02-17T10:00:00+09:00", false, null, null);
  }

  private static MentoringInput mentoring(String studentId, Object grade, int first, int second) {
    return new MentoringInput("홍길동", "화학공학과", studentId, grade, "010-0000-0001", first, second);
  }

  private static void assertInvalid(Executable action) {
    ApiException error = assertThrows(ApiException.class, action);
    assertEquals(ErrorCode.INVALID_ARGUMENT, error.code());
  }
}
