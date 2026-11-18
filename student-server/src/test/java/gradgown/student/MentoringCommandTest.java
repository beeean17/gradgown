package gradgown.student;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import gradgown.core.test.HttpTestClient;
import gradgown.core.test.HttpTestClient.Response;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Layer 4 of docs/testing/dynamic.md: the St:talk registration commands, end to end. */
class MentoringCommandTest extends ServerTest {

  private static final String REGISTRATIONS = "/api/mentoring/registrations";

  @Test
  @DisplayName("apply, change, cancel and apply again all succeed; the cancelled row stays")
  void fullFlow() {
    HttpTestClient student = signedInAs(STUDENT_5);

    Response created = student.post(REGISTRATIONS, createBody(newOperationId(), mentoringInput(1, 2)));
    assertStatus(200, created);
    String id = read(created, "$.registrationId");

    assertStatus(
        200,
        student.put(
            REGISTRATIONS + "/" + id, updateBody(newOperationId(), "1", mentoringInput(0, 3))));
    Response cancelled =
        student.post(REGISTRATIONS + "/" + id + "/cancel", cancelBody(newOperationId(), "2"));
    assertStatus(200, cancelled);
    assertEquals("cancelled", read(cancelled, "$.status"));
    assertStatus(
        200, student.post(REGISTRATIONS, createBody(newOperationId(), mentoringInput(4, 5))));

    Response mine = student.get(REGISTRATIONS + "/me");
    assertEquals(2, ((List<?>) read(mine, "$")).size(), mine.body());
    // "No choice" went to the database as NULL and came back as 0.
    assertEquals(List.of(0), read(mine, "$[?(@.status=='cancelled')].firstOption"));
    assertEquals(List.of(3), read(mine, "$[?(@.status=='cancelled')].secondOption"));
    assertNull(dbValue("SELECT first_option_no FROM mentoring_registrations WHERE id = ?", id));
  }

  @Test
  @DisplayName("MNT-22 a second registration for the event is already-exists, from the UNIQUE key")
  void secondRegistrationIsRejected() {
    // Student 1 already has registration 2 for the current event.
    Response response =
        signedInAs(STUDENT_1)
            .post(REGISTRATIONS, createBody(newOperationId(), mentoringInput(4, 5)));

    assertError(409, "already-exists", response);
  }

  @Test
  @DisplayName("MNT-25 the same option twice, or no choice twice, is invalid-argument")
  void selectionRule() {
    HttpTestClient student = signedInAs(STUDENT_5);

    assertError(
        400,
        "invalid-argument",
        student.post(REGISTRATIONS, createBody(newOperationId(), mentoringInput(2, 2))));
    assertError(
        400,
        "invalid-argument",
        student.post(REGISTRATIONS, createBody(newOperationId(), mentoringInput(0, 0))));
    assertError(
        400,
        "invalid-argument",
        student.post(REGISTRATIONS, createBody(newOperationId(), mentoringInput(8, 1))));
    // The rule holds on a change too. Registration 2 of student 1 is (1, 3).
    assertError(
        400,
        "invalid-argument",
        signedInAs(STUDENT_1)
            .put(REGISTRATIONS + "/2", updateBody(newOperationId(), "1", mentoringInput(3, 3))));
    assertEquals("0", dbValue("SELECT COUNT(*) FROM mentoring_registrations WHERE user_id = 5"));
  }

  @Test
  @DisplayName("MNT-25 an option without a name cannot be chosen")
  void unnamedOption() {
    dbUpdate("UPDATE mentoring_options SET name = '' WHERE event_id = '2027-01' AND option_no = 6");

    assertError(
        400,
        "invalid-argument",
        signedInAs(STUDENT_5)
            .post(REGISTRATIONS, createBody(newOperationId(), mentoringInput(6, 1))));
  }

  @Test
  @DisplayName("MNT-24 the same operation ID again returns the earlier success")
  void replay() {
    HttpTestClient student = signedInAs(STUDENT_5);
    String body = createBody(newOperationId(), mentoringInput(1, 2));

    Response first = student.post(REGISTRATIONS, body);
    Response second = student.post(REGISTRATIONS, body);

    assertStatus(200, second);
    assertEquals(true, read(second, "$.replayed"));
    assertEquals((String) read(first, "$.registrationId"), read(second, "$.registrationId"));
    assertEquals("1", dbValue("SELECT COUNT(*) FROM mentoring_registrations WHERE user_id = 5"));
  }

  @Test
  @DisplayName("MNT-23 a stale version is aborted; a past event's or a cancelled registration is refused")
  void changeRules() {
    HttpTestClient student1 = signedInAs(STUDENT_1);
    assertStatus(
        200,
        student1.put(REGISTRATIONS + "/2", updateBody(newOperationId(), "1", mentoringInput(2, 3))));

    assertError(
        409,
        "aborted",
        student1.put(REGISTRATIONS + "/2", updateBody(newOperationId(), "1", mentoringInput(4, 5))));
    // Registration 1 of student 1 belongs to event 2026-05.
    assertError(
        422,
        "failed-precondition",
        student1.post(REGISTRATIONS + "/1/cancel", cancelBody(newOperationId(), "1")));
    // Registration 4 of student 3 is cancelled, at version 2.
    assertError(
        422,
        "failed-precondition",
        signedInAs("student03@example.com")
            .post(REGISTRATIONS + "/4/cancel", cancelBody(newOperationId(), "2")));
  }

  @Test
  @DisplayName("MNT-21 applying, changing and cancelling all stop outside the window or when closed")
  void window() {
    HttpTestClient student5 = signedInAs(STUDENT_5);
    HttpTestClient student1 = signedInAs(STUDENT_1);

    clock.setTo("2027-01-09T10:00:00+09:00");
    assertError(
        422,
        "failed-precondition",
        student5.post(REGISTRATIONS, createBody(newOperationId(), mentoringInput(1, 2))));
    assertError(
        422,
        "failed-precondition",
        student1.post(REGISTRATIONS + "/2/cancel", cancelBody(newOperationId(), "1")));

    clock.setTo(IN_APPLICATION_WINDOW);
    dbUpdate("UPDATE mentoring_events SET is_open = FALSE WHERE id = '2027-01'");
    assertError(
        422,
        "failed-precondition",
        student5.post(REGISTRATIONS, createBody(newOperationId(), mentoringInput(1, 2))));
  }

  @Test
  @DisplayName("MNT-27 every command leaves an audit log row in the mentoring domain")
  void auditLog() {
    String operationId = newOperationId();

    Response created =
        signedInAs(STUDENT_5).post(REGISTRATIONS, createBody(operationId, mentoringInput(1, 2)));

    assertEquals(
        "mentoring|mentoring.create|5|succeeded|" + read(created, "$.registrationId"),
        dbValue(
            "SELECT CONCAT_WS('|', domain, action, actor_id, outcome, target_id)"
                + " FROM audit_logs WHERE operation_id = ?",
            operationId));
  }
}
