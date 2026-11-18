package gradgown.student;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import gradgown.core.test.HttpTestClient;
import gradgown.core.test.HttpTestClient.Response;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Layer 4 of docs/testing/dynamic.md: the gown reservation commands, end to end. */
class ReservationCommandTest extends ServerTest {

  private static final String RESERVATIONS = "/api/gown/reservations";

  @Test
  @DisplayName("apply, change, cancel and apply again all succeed; the cancelled row stays")
  void fullFlow() {
    HttpTestClient student = signedInAs(STUDENT_5);

    Response created = student.post(RESERVATIONS, createBody(newOperationId(), reservationInput()));
    assertStatus(200, created);
    assertEquals("reserved", read(created, "$.status"));
    assertEquals(false, read(created, "$.replayed"));
    String id = read(created, "$.reservationId");

    Response updated =
        student.put(
            RESERVATIONS + "/" + id,
            updateBody(
                newOperationId(),
                "1",
                reservationInput("6", "2027-02-15T10:30:00+09:00", "2027-02-17T10:30:00+09:00")));
    assertStatus(200, updated);

    Response cancelled =
        student.post(RESERVATIONS + "/" + id + "/cancel", cancelBody(newOperationId(), "2"));
    assertStatus(200, cancelled);
    assertEquals("cancelled", read(cancelled, "$.status"));

    Response again = student.post(RESERVATIONS, createBody(newOperationId(), reservationInput()));
    assertStatus(200, again);

    Response mine = student.get(RESERVATIONS + "/me?periodId=2027-02");
    List<String> statuses = read(mine, "$[*].status");
    assertEquals(2, statuses.size(), mine.body());
    assertTrue(statuses.contains("reserved") && statuses.contains("cancelled"), mine.body());
    // The change moved the rent slot, and the version went 1 -> 2 -> 3.
    assertEquals(List.of("6"), read(mine, "$[?(@.status=='cancelled')].slotId"));
    assertEquals(List.of("3"), read(mine, "$[?(@.status=='cancelled')].version"));
  }

  @Test
  @DisplayName("RES-25 the same operation ID again returns the earlier success and writes nothing")
  void replay() {
    HttpTestClient student = signedInAs(STUDENT_5);
    String body = createBody(newOperationId(), reservationInput());

    Response first = student.post(RESERVATIONS, body);
    Response second = student.post(RESERVATIONS, body);

    assertStatus(200, second);
    assertEquals(true, read(second, "$.replayed"));
    assertEquals((String) read(first, "$.reservationId"), read(second, "$.reservationId"));
    assertEquals("1", dbValue("SELECT COUNT(*) FROM gown_reservations WHERE user_id = 5"));
  }

  @Test
  @DisplayName("RES-22 a second reservation in the period is already-exists, from the UNIQUE key")
  void secondReservationIsRejected() {
    // Student 1 already has reservation 2 in the current period.
    HttpTestClient student = signedInAs(STUDENT_1);

    Response response = student.post(RESERVATIONS, createBody(newOperationId(), reservationInput()));

    assertError(409, "already-exists", response);
    assertEquals(
        "1",
        dbValue(
            "SELECT COUNT(*) FROM gown_reservations"
                + " WHERE user_id = 1 AND period_id = '2027-02' AND status = 'reserved'"));
  }

  @Test
  @DisplayName("RES-26 an operation ID that failed cannot be used again")
  void failedOperationIdIsRejected() {
    HttpTestClient student = signedInAs(STUDENT_1);
    String body = createBody(newOperationId(), reservationInput());
    assertError(409, "already-exists", student.post(RESERVATIONS, body));

    assertError(422, "failed-precondition", student.post(RESERVATIONS, body));
  }

  @Test
  @DisplayName("RES-26 an operation ID another user used is permission-denied")
  void otherUsersOperationIdIsRejected() {
    String operationId = newOperationId();
    assertStatus(
        200,
        signedInAs(STUDENT_5).post(RESERVATIONS, createBody(operationId, reservationInput())));

    Response response =
        signedInAs(STUDENT_4).post(RESERVATIONS, createBody(operationId, reservationInput()));

    assertError(403, "permission-denied", response);
    assertEquals("0", dbValue("SELECT COUNT(*) FROM gown_reservations WHERE user_id = 4"));
  }

  @Test
  @DisplayName("RES-24 a change with a stale version is aborted")
  void staleVersionIsAborted() {
    HttpTestClient student = signedInAs(STUDENT_1);
    assertStatus(
        200,
        student.put(RESERVATIONS + "/2", updateBody(newOperationId(), "1", reservationInput())));

    Response stale =
        student.put(RESERVATIONS + "/2", updateBody(newOperationId(), "1", reservationInput()));

    assertError(409, "aborted", stale);
    assertError(
        409, "aborted", student.post(RESERVATIONS + "/2/cancel", cancelBody(newOperationId(), "1")));
    assertEquals("2", dbValue("SELECT version FROM gown_reservations WHERE id = 2"));
  }

  @Test
  @DisplayName("RES-21 nothing works when applications are switched off")
  void closedSwitch() {
    dbUpdate("UPDATE gown_periods SET is_open = FALSE WHERE id = '2027-02'");

    assertError(
        422,
        "failed-precondition",
        signedInAs(STUDENT_5).post(RESERVATIONS, createBody(newOperationId(), reservationInput())));
    assertError(
        422,
        "failed-precondition",
        signedInAs(STUDENT_1)
            .post(RESERVATIONS + "/2/cancel", cancelBody(newOperationId(), "1")));
  }

  @Test
  @DisplayName("RES-21 in the edit window a reservation can be changed but not created")
  void editWindow() {
    clock.setTo("2027-02-01T10:00:00+09:00");

    assertError(
        422,
        "failed-precondition",
        signedInAs(STUDENT_5).post(RESERVATIONS, createBody(newOperationId(), reservationInput())));
    assertStatus(
        200,
        signedInAs(STUDENT_1)
            .put(RESERVATIONS + "/2", updateBody(newOperationId(), "1", reservationInput())));
  }

  @Test
  @DisplayName("RES-21 after both windows nothing can be changed")
  void afterTheWindows() {
    clock.setTo("2027-02-10T10:00:00+09:00");

    assertError(
        422,
        "failed-precondition",
        signedInAs(STUDENT_1)
            .post(RESERVATIONS + "/2/cancel", cancelBody(newOperationId(), "1")));
    assertEquals("reserved", dbValue("SELECT status FROM gown_reservations WHERE id = 2"));
  }

  @Test
  @DisplayName("RES-14 a disabled slot, or a time outside the chosen slot, is rejected")
  void slotRules() {
    HttpTestClient student = signedInAs(STUDENT_5);

    // Slot 16 (2027-02-17 14:30) is disabled.
    assertError(
        422,
        "failed-precondition",
        student.post(
            RESERVATIONS,
            createBody(
                newOperationId(),
                reservationInput("16", "2027-02-17T14:30:00+09:00", "2027-02-17T14:30:00+09:00"))));
    // The rent time is not inside slot 5.
    assertError(
        422,
        "failed-precondition",
        student.post(
            RESERVATIONS,
            createBody(
                newOperationId(),
                reservationInput("5", "2027-02-15T11:00:00+09:00", "2027-02-17T10:00:00+09:00"))));
    // No enabled slot contains the return time.
    assertError(
        422,
        "failed-precondition",
        student.post(
            RESERVATIONS,
            createBody(
                newOperationId(),
                reservationInput("5", "2027-02-15T10:00:00+09:00", "2027-02-17T14:30:00+09:00"))));
    // A slot of another period.
    assertError(
        422,
        "failed-precondition",
        student.post(
            RESERVATIONS,
            createBody(
                newOperationId(),
                reservationInput("1", "2026-08-17T10:00:00+09:00", "2026-08-18T10:00:00+09:00"))));
    assertEquals("0", dbValue("SELECT COUNT(*) FROM gown_reservations WHERE user_id = 5"));
  }

  @Test
  @DisplayName("RES-13 a return time before the rent time is invalid-argument")
  void returnBeforeRent() {
    assertError(
        400,
        "invalid-argument",
        signedInAs(STUDENT_5)
            .post(
                RESERVATIONS,
                createBody(
                    newOperationId(),
                    reservationInput(
                        "13", "2027-02-17T10:00:00+09:00", "2027-02-15T10:00:00+09:00"))));
  }

  @Test
  @DisplayName("RES-23 a reservation of a past period, or a cancelled one, cannot be changed")
  void pastOrCancelledReservation() {
    // Reservation 1 of student 1 is in period 2026-08.
    assertError(
        422,
        "failed-precondition",
        signedInAs(STUDENT_1)
            .put(RESERVATIONS + "/1", updateBody(newOperationId(), "1", reservationInput())));
    // Reservation 3 of student 2 is cancelled, at version 2.
    assertError(
        422,
        "failed-precondition",
        signedInAs(STUDENT_2)
            .post(RESERVATIONS + "/3/cancel", cancelBody(newOperationId(), "2")));
  }

  @Test
  @DisplayName("an unknown reservation ID is not-found")
  void unknownReservation() {
    HttpTestClient student = signedInAs(STUDENT_1);

    assertError(
        404,
        "not-found",
        student.post(RESERVATIONS + "/999999/cancel", cancelBody(newOperationId(), "1")));
    assertError(
        404,
        "not-found",
        student.post(RESERVATIONS + "/not-a-number/cancel", cancelBody(newOperationId(), "1")));
  }

  @Test
  @DisplayName("RES-32 every command leaves an audit log row with its outcome")
  void auditLog() {
    HttpTestClient student = signedInAs(STUDENT_5);
    String succeeded = newOperationId();
    String rejected = newOperationId();

    Response created = student.post(RESERVATIONS, createBody(succeeded, reservationInput()));
    assertError(
        409, "already-exists", student.post(RESERVATIONS, createBody(rejected, reservationInput())));

    assertEquals(
        "reservation|reservation.create|5|succeeded|" + read(created, "$.reservationId"),
        dbValue(
            "SELECT CONCAT_WS('|', domain, action, actor_id, outcome, target_id)"
                + " FROM audit_logs WHERE operation_id = ?",
            succeeded));
    assertEquals(
        "rejected|duplicate|already-exists",
        dbValue(
            "SELECT CONCAT_WS('|', outcome, failure_kind, error_code)"
                + " FROM audit_logs WHERE operation_id = ?",
            rejected));
    assertEquals(
        "0",
        dbValue("SELECT COUNT(*) FROM audit_logs WHERE completed_at IS NULL"),
        "no command is left without an outcome");
    // The error body carries the operation ID, so that the student can quote it.
    assertNull(dbValue("SELECT target_id FROM audit_logs WHERE operation_id = ?", rejected));
  }

  @Test
  @DisplayName("an invalid input is invalid-argument, recorded as rejected")
  void invalidInput() {
    HttpTestClient student = signedInAs(STUDENT_5);
    String operationId = newOperationId();

    Response response =
        student.post(
            RESERVATIONS,
            createBody(operationId, reservationInput().replace("\"size\":\"L\"", "\"size\":\"XL\"")));

    assertError(400, "invalid-argument", response);
    assertEquals(operationId, read(response, "$.operationId"));
    assertEquals(
        "rejected", dbValue("SELECT outcome FROM audit_logs WHERE operation_id = ?", operationId));
    // A malformed operation ID is turned away before anything is recorded.
    assertError(
        400, "invalid-argument", student.post(RESERVATIONS, createBody("short", reservationInput())));
    assertFalse(Integer.parseInt(dbValue("SELECT COUNT(*) FROM audit_logs")) > 1);
  }
}
