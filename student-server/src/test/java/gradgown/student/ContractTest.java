package gradgown.student;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import gradgown.core.test.HttpTestClient;
import gradgown.core.test.HttpTestClient.Response;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Layer 6 of docs/testing/dynamic.md: the responses have the shape of the student web's screen
 * types (grad42 web/src/shared/types), so the web can use them without mapping.
 */
class ContractTest extends ServerTest {

  private static final String SEOUL_ISO = "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\+09:00";

  @Test
  @DisplayName("GET /api/gown/periods/current is a ReservationPeriod")
  void reservationPeriod() {
    Response response = anonymous().get("/api/gown/periods/current");

    assertStatus(200, response);
    assertKeys(
        response,
        "$",
        "periodId", "title", "status", "applyStartAt", "applyEndAt", "editStartAt", "editEndAt",
        "rentSlots", "returnSlots");
    assertEquals("2027-02", read(response, "$.periodId"));
    assertEquals("2027년 2월 학위복 예약", read(response, "$.title"));
    assertEquals("open", read(response, "$.status"));
    assertEquals("2026-11-01T09:00:00+09:00", read(response, "$.applyStartAt"));
    assertEquals("2027-02-05T18:00:00+09:00", read(response, "$.editEndAt"));

    assertKeys(
        response,
        "$.rentSlots[0]",
        "slotId", "periodId", "type", "startsAt", "endsAt", "label", "isActive");
    assertEquals(12, ((List<?>) read(response, "$.rentSlots")).size());
    assertEquals(12, ((List<?>) read(response, "$.returnSlots")).size());
    // The first slot, exactly as seeded: a Seoul time, not shifted by nine hours.
    assertEquals("5", read(response, "$.rentSlots[0].slotId"));
    assertEquals("rent", read(response, "$.rentSlots[0].type"));
    assertEquals("return", read(response, "$.returnSlots[0].type"));
    assertEquals("2027-02-15T10:00:00+09:00", read(response, "$.rentSlots[0].startsAt"));
    assertEquals("10:00–10:30", read(response, "$.rentSlots[0].label"));
    assertEquals(true, read(response, "$.rentSlots[0].isActive"));
    assertEquals(List.of(false), read(response, "$.rentSlots[?(@.slotId=='16')].isActive"));
  }

  @Test
  @DisplayName("GET /api/gown/reservations/me is a list of Reservation")
  void reservations() {
    // Reservation 5 of student 3 is a proxy pickup.
    Response response = signedInAs("student03@example.com").get("/api/gown/reservations/me");

    assertStatus(200, response);
    assertKeys(
        response,
        "$[0]",
        "reservationId", "periodId", "status", "name", "studentId", "department", "phone", "size",
        "sizeRaw", "slotId", "rentAt", "returnAt", "isProxy", "proxyName", "proxyPhone",
        "createdAt", "modifiedAt", "version");
    assertEquals("5", read(response, "$[0].reservationId"));
    assertEquals("L", read(response, "$[0].size"));
    assertEquals("l", read(response, "$[0].sizeRaw"));
    assertEquals("9", read(response, "$[0].slotId"));
    // The times come from the two slots the reservation refers to.
    assertEquals("2027-02-16T10:00:00+09:00", read(response, "$[0].rentAt"));
    assertEquals("2027-02-17T10:30:00+09:00", read(response, "$[0].returnAt"));
    assertEquals(true, read(response, "$[0].isProxy"));
    assertEquals("방자", read(response, "$[0].proxyName"));
    assertEquals("1", read(response, "$[0].version"));
    assertTrue(((String) read(response, "$[0].createdAt")).matches(SEOUL_ISO), response.body());
    assertTrue(((String) read(response, "$[0].modifiedAt")).matches(SEOUL_ISO), response.body());

    // Without a proxy the two proxy fields are empty strings, not null.
    Response plain = signedInAs(STUDENT_1).get("/api/gown/reservations/me?periodId=2027-02");
    assertEquals("", read(plain, "$[0].proxyName"));
    assertEquals(false, read(plain, "$[0].isProxy"));
  }

  @Test
  @DisplayName("GET /api/mentoring/events/current is a MentoringEvent")
  void mentoringEvent() {
    Response response = anonymous().get("/api/mentoring/events/current");

    assertStatus(200, response);
    assertKeys(
        response,
        "$",
        "schema", "eventId", "isOpen", "applyStartAt", "applyEndAt", "date", "location",
        "sessions", "options", "intro", "notes", "epicFolioUrl", "isEpicFolioLinkOpen");
    assertEquals("v2", read(response, "$.schema"));
    assertEquals("2027-01", read(response, "$.eventId"));
    assertEquals(true, read(response, "$.isOpen"));
    assertEquals("2027-01-13T00:00:00+09:00", read(response, "$.date"));
    assertKeys(response, "$.sessions[0]", "id", "label", "startsAt", "endsAt");
    assertEquals(List.of("1", "2"), read(response, "$.sessions[*].id"));
    assertEquals("2027-01-13T15:00:00+09:00", read(response, "$.sessions[0].startsAt"));
    List<String> options = read(response, "$.options");
    assertEquals(7, options.size());
    assertEquals("반도체 공정 엔지니어", options.get(0));
    assertEquals("대학원 진학", options.get(6));
    // The notes come out of the JSON column in the order they were written.
    List<String> notes = read(response, "$.notes");
    assertEquals(3, notes.size());
    assertTrue(notes.get(0).startsWith("차시마다 멘토 한 명을"), response.body());
    assertTrue(notes.get(2).startsWith("EPIC 점수"), response.body());
  }

  @Test
  @DisplayName("GET /api/mentoring/registrations/me is a list of MentoringRegistration")
  void registrations() {
    // Registration 3 of student 2 has "no choice" in the first session.
    Response response = signedInAs(STUDENT_2).get("/api/mentoring/registrations/me");

    assertStatus(200, response);
    assertKeys(
        response,
        "$[0]",
        "registrationId", "eventId", "status", "firstOption", "secondOption", "name", "studentId",
        "department", "phone", "grade", "createdAt", "modifiedAt", "version");
    assertEquals("3", read(response, "$[0].registrationId"));
    assertEquals(0, (int) read(response, "$[0].firstOption"));
    assertEquals(2, (int) read(response, "$[0].secondOption"));
    assertEquals(3, (int) read(response, "$[0].grade"));
    assertEquals("1", read(response, "$[0].version"));
  }

  @Test
  @DisplayName("GET /api/announcements is a list of Announcement, visible ones only")
  void announcements() {
    HttpTestClient anonymous = anonymous();
    Response response = anonymous.get("/api/announcements");

    assertStatus(200, response);
    assertKeys(
        response,
        "$[0]",
        "id", "title", "content", "category", "tags", "attachments", "isPinned", "isVisible",
        "showOnHome", "isPopup", "authorId", "createdAt", "updatedAt", "publishedAt");
    // Announcement 3 is hidden. The pinned one comes first.
    assertEquals(List.of("1", "2"), read(response, "$[*].id"));
    assertEquals(true, read(response, "$[0].isPinned"));
    assertEquals(true, read(response, "$[0].showOnHome"));
    assertEquals("7", read(response, "$[0].authorId"));

    assertStatus(200, anonymous.get("/api/announcements/2"));
    assertError(404, "not-found", anonymous.get("/api/announcements/3"));
  }

  @Test
  @DisplayName("without a current period or event the body is the JSON literal null")
  void noCurrentPeriod() {
    dbUpdate("UPDATE gown_periods SET is_current = FALSE");
    dbUpdate("UPDATE mentoring_events SET is_current = FALSE");

    Response period = anonymous().get("/api/gown/periods/current");
    assertStatus(200, period);
    assertEquals("null", period.body());
    assertEquals("null", anonymous().get("/api/mentoring/events/current").body());
  }

  @Test
  @DisplayName("a command answers { success, operationId, reservationId, status, replayed }")
  void commandResponse() {
    String operationId = newOperationId();

    Response response =
        signedInAs(STUDENT_5)
            .post("/api/gown/reservations", createBody(operationId, reservationInput()));

    assertStatus(200, response);
    assertKeys(response, "$", "success", "operationId", "reservationId", "status", "replayed");
    assertEquals(true, read(response, "$.success"));
    assertEquals(operationId, read(response, "$.operationId"));
    assertTrue(read(response, "$.reservationId") instanceof String, "IDs are strings");
  }

  @Test
  @DisplayName("an error answers { code, message, operationId } with the status of its code")
  void errorResponse() {
    String operationId = newOperationId();

    Response response =
        signedInAs(STUDENT_1)
            .post("/api/gown/reservations", createBody(operationId, reservationInput()));

    assertStatus(409, response);
    assertKeys(response, "$", "code", "message", "operationId");
    assertEquals("already-exists", read(response, "$.code"));
    assertEquals("현재 회차에 이미 예약이 있습니다.", read(response, "$.message"));
    assertEquals(operationId, read(response, "$.operationId"));

    assertError(400, "invalid-argument", signedInAs(STUDENT_5).post("/api/gown/reservations", "not json"));
  }

  @Test
  @DisplayName("what the framework turns away has the same error body")
  void frameworkErrors() {
    HttpTestClient student = signedInAs(STUDENT_5);

    Response unknownPath = student.get("/api/no-such-path");
    assertError(404, "not-found", unknownPath);
    assertKeys(unknownPath, "$", "code", "message", "operationId");

    // A body that is not declared as JSON, and a method the path does not take.
    Response notJson =
        student.post(
            "/api/gown/reservations", createBody(newOperationId(), reservationInput()), "text/plain");
    assertError(400, "invalid-argument", notJson);
    assertKeys(notJson, "$", "code", "message", "operationId");
    assertError(400, "invalid-argument", student.put("/api/gown/reservations", "{}"));

    // An error is JSON even for a request that says it does not accept JSON.
    assertError(401, "unauthenticated", anonymous().getAccepting("/api/me", "text/plain"));
    assertError(404, "not-found", anonymous().getAccepting("/api/announcements/999", "application/xml"));
    // A preflight has no cookie. It must not fail on the session check.
    assertTrue(anonymous().preflight("/api/gown/reservations").status() < 500);
    assertEquals("0", dbValue("SELECT COUNT(*) FROM gown_reservations WHERE user_id = 5"));
  }

  private static void assertKeys(Response response, String jsonPath, String... expected) {
    Map<String, Object> object = read(response, jsonPath);
    assertEquals(Set.of(expected), object.keySet(), response.body());
  }
}
