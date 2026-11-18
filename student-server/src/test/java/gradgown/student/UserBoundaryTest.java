package gradgown.student;

import static org.junit.jupiter.api.Assertions.assertEquals;

import gradgown.core.test.HttpTestClient;
import gradgown.core.test.HttpTestClient.Response;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Layer 4 of docs/testing/dynamic.md: the boundary between users. The database cannot keep it,
 * because every student reaches it through the same account, so these tests are the only check
 * that a student stays away from another student's data (docs/decisions/db-privileges.md).
 */
class UserBoundaryTest extends ServerTest {

  @Test
  @DisplayName("a student cannot change or cancel another student's reservation")
  void othersReservation() {
    // Reservation 2 belongs to student 1. Student 4 knows its ID and version.
    HttpTestClient student4 = signedInAs(STUDENT_4);

    assertError(
        404,
        "not-found",
        student4.put(
            "/api/gown/reservations/2", updateBody(newOperationId(), "1", reservationInput())));
    assertError(
        404,
        "not-found",
        student4.post("/api/gown/reservations/2/cancel", cancelBody(newOperationId(), "1")));
    assertEquals(
        "reserved|1|홍길동",
        dbValue("SELECT CONCAT_WS('|', status, version, name) FROM gown_reservations WHERE id = 2"));
  }

  @Test
  @DisplayName("a student cannot change or cancel another student's registration")
  void othersRegistration() {
    // Registration 2 belongs to student 1.
    HttpTestClient student4 = signedInAs(STUDENT_4);

    assertError(
        404,
        "not-found",
        student4.put(
            "/api/mentoring/registrations/2",
            updateBody(newOperationId(), "1", mentoringInput(4, 5))));
    assertError(
        404,
        "not-found",
        student4.post("/api/mentoring/registrations/2/cancel", cancelBody(newOperationId(), "1")));
    assertEquals(
        "reserved|1|1|3",
        dbValue(
            "SELECT CONCAT_WS('|', status, version, first_option_no, second_option_no)"
                + " FROM mentoring_registrations WHERE id = 2"));
  }

  @Test
  @DisplayName("'my reservations' and 'my registrations' hold the signed-in student's rows only")
  void myListsAreMine() {
    HttpTestClient student1 = signedInAs(STUDENT_1);

    assertEquals(List.of("2"), read(student1.get("/api/gown/reservations/me?periodId=2027-02"), "$[*].reservationId"));
    assertEquals(
        List.of("1", "2"),
        sorted(student1.get("/api/gown/reservations/me"), "$[*].reservationId"));
    assertEquals(
        List.of("1", "2"),
        sorted(student1.get("/api/mentoring/registrations/me"), "$[*].registrationId"));

    // Student 5 has nothing, although the tables are not empty.
    HttpTestClient student5 = signedInAs(STUDENT_5);
    assertEquals("[]", student5.get("/api/gown/reservations/me").body());
    assertEquals("[]", student5.get("/api/mentoring/registrations/me").body());
  }

  @Test
  @DisplayName("without a session, 'my' data and the commands answer 401")
  void anonymousIsUnauthenticated() {
    HttpTestClient anonymous = anonymous();

    assertError(401, "unauthenticated", anonymous.get("/api/me"));
    assertError(401, "unauthenticated", anonymous.get("/api/gown/reservations/me"));
    assertError(401, "unauthenticated", anonymous.get("/api/mentoring/registrations/me"));
    assertError(
        401,
        "unauthenticated",
        anonymous.post("/api/gown/reservations", createBody(newOperationId(), reservationInput())));
    assertError(
        401,
        "unauthenticated",
        anonymous.post(
            "/api/mentoring/registrations/2/cancel", cancelBody(newOperationId(), "1")));
    assertEquals("0", dbValue("SELECT COUNT(*) FROM audit_logs"));
  }

  @Test
  @DisplayName("the schedule and the announcements are public")
  void publicReads() {
    HttpTestClient anonymous = anonymous();

    assertStatus(200, anonymous.get("/api/gown/periods/current"));
    assertStatus(200, anonymous.get("/api/mentoring/events/current"));
    assertStatus(200, anonymous.get("/api/announcements"));
    assertStatus(200, anonymous.get("/api/auth/accounts"));
  }

  @Test
  @DisplayName("only a student account can sign in to the student server")
  void loginIsForStudents() {
    HttpTestClient client = anonymous();

    assertError(403, "permission-denied", client.post("/api/auth/login", "{\"email\":\"admin01@example.com\"}"));
    assertError(403, "permission-denied", client.post("/api/auth/login", "{\"email\":\"master01@example.com\"}"));
    assertError(404, "not-found", client.post("/api/auth/login", "{\"email\":\"nobody@example.com\"}"));
    assertError(400, "invalid-argument", client.post("/api/auth/login", "{}"));
    assertError(401, "unauthenticated", client.get("/api/me"));

    // The login screen offers the five students and no one else.
    Response accounts = client.get("/api/auth/accounts");
    assertEquals(List.of("student", "student", "student", "student", "student"), read(accounts, "$[*].role"));
  }

  @Test
  @DisplayName("signing in and out")
  void loginAndLogout() {
    HttpTestClient student = signedInAs(STUDENT_1);

    Response me = student.get("/api/me");
    assertStatus(200, me);
    assertEquals("1", read(me, "$.uid"));
    assertEquals(STUDENT_1, read(me, "$.email"));
    assertEquals("student", read(me, "$.role"));
    assertEquals("1", dbValue("SELECT COUNT(*) FROM users WHERE id = 1 AND last_login_at IS NOT NULL"));

    assertStatus(200, student.post("/api/auth/logout", "{}"));
    assertError(401, "unauthenticated", student.get("/api/me"));
  }

  private static List<String> sorted(Response response, String jsonPath) {
    List<String> values = read(response, jsonPath);
    return values.stream().sorted().toList();
  }
}
