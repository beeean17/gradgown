package gradgown.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import gradgown.core.test.HttpTestClient;
import gradgown.core.test.HttpTestClient.Response;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Layer 4 of docs/testing/dynamic.md, "관리자 조회": the lists the admin app reads. In the seed,
 * period 2027-02 has reservations 2 (홍길동), 3 (성춘향, cancelled), 4 (성춘향) and 5 (이몽룡), and
 * event 2027-01 has registrations 2 (1, 3), 3 (none, 2), 4 (2, 5, cancelled), 5 (5, 2), 6 (1, none).
 */
class AdminReadTest extends AdminServerTest {

  @Test
  @DisplayName("the reservation list holds every student's reservations of the period, newest first")
  void reservationList() {
    Response response = signedInAs(ADMIN).get("/api/admin/gown/reservations?periodId=2027-02");

    assertStatus(200, response);
    assertEquals(List.of("5", "4", "3", "2"), read(response, "$.items[*].reservationId"));
    assertNull(read(response, "$.nextCursor"));
    Map<String, Object> first = read(response, "$.items[0]");
    assertEquals(
        Set.of(
            "reservationId", "userId", "email", "periodId", "status", "name", "studentId",
            "department", "phone", "size", "slotId", "rentAt", "returnAt", "isProxy", "proxyName",
            "proxyPhone", "createdAt", "modifiedAt", "version"),
        first.keySet());
    assertEquals("student03@example.com", first.get("email"));
    assertEquals("2027-02-16T10:00:00+09:00", first.get("rentAt"));

    // Without periodId the current period is used; another period is another list.
    assertEquals(
        List.of("5", "4", "3", "2"),
        read(signedInAs(ADMIN).get("/api/admin/gown/reservations"), "$.items[*].reservationId"));
    assertEquals(
        List.of("1"),
        read(
            signedInAs(ADMIN).get("/api/admin/gown/reservations?periodId=2026-08"),
            "$.items[*].reservationId"));
  }

  @Test
  @DisplayName("A1 a search finds a match that lies outside the first page")
  void searchReachesBeyondTheFirstPage() {
    HttpTestClient admin = signedInAs(ADMIN);

    // With one row per page, the first page of the period is reservation 5 only.
    assertEquals(
        List.of("5"),
        read(admin.get("/api/admin/gown/reservations?periodId=2027-02&limit=1"), "$.items[*].reservationId"));
    // Searching by name, student ID or phone still finds reservation 2, the last row.
    assertEquals(
        List.of("2"),
        read(admin.get("/api/admin/gown/reservations?periodId=2027-02&limit=1&q=홍길동"), "$.items[*].reservationId"));
    assertEquals(
        List.of("2"),
        read(admin.get("/api/admin/gown/reservations?periodId=2027-02&limit=1&q=99990001"), "$.items[*].reservationId"));
    assertEquals(
        List.of("2"),
        read(admin.get("/api/admin/gown/reservations?periodId=2027-02&limit=1&q=0000-0001"), "$.items[*].reservationId"));
  }

  @Test
  @DisplayName("the status filter and the search combine, and a wildcard in the search is literal")
  void filters() {
    HttpTestClient admin = signedInAs(ADMIN);

    assertEquals(
        List.of("4", "3"),
        read(admin.get("/api/admin/gown/reservations?periodId=2027-02&q=춘향"), "$.items[*].reservationId"));
    assertEquals(
        List.of("3"),
        read(admin.get("/api/admin/gown/reservations?periodId=2027-02&q=춘향&status=cancelled"), "$.items[*].reservationId"));
    assertEquals(
        List.of("5", "4", "2"),
        read(admin.get("/api/admin/gown/reservations?periodId=2027-02&status=reserved"), "$.items[*].reservationId"));
    assertEquals(
        List.of(),
        read(admin.get("/api/admin/gown/reservations?periodId=2027-02&q=%25"), "$.items[*].reservationId"));
  }

  @Test
  @DisplayName("paging by cursor visits every row once, with no gap and no repeat")
  void paging() {
    HttpTestClient admin = signedInAs(ADMIN);
    List<String> seen = new ArrayList<>();
    String cursor = null;
    int pages = 0;

    do {
      Response page =
          admin.get(
              "/api/admin/gown/reservations?periodId=2027-02&limit=3"
                  + (cursor == null ? "" : "&cursor=" + cursor));
      assertStatus(200, page);
      List<String> ids = read(page, "$.items[*].reservationId");
      seen.addAll(ids);
      cursor = read(page, "$.nextCursor");
      pages++;
    } while (cursor != null);

    assertEquals(List.of("5", "4", "3", "2"), seen);
    assertEquals(2, pages);
  }

  @Test
  @DisplayName("a parameter of the wrong type is invalid-argument, and an unknown path is not-found")
  void badParameters() {
    HttpTestClient admin = signedInAs(ADMIN);

    assertError(400, "invalid-argument", admin.get("/api/admin/gown/reservations?limit=abc"));
    assertError(400, "invalid-argument", admin.get("/api/admin/gown/reservations?cursor=abc"));
    assertError(400, "invalid-argument", admin.get("/api/admin/mentoring/registrations?first=x"));
    assertError(400, "invalid-argument", admin.get("/api/admin/audit-logs?cursor=nonsense"));
    assertError(404, "not-found", admin.get("/api/admin/no-such-path"));
    // A query string that is not valid UTF-8 once decoded.
    assertError(400, "invalid-argument", admin.get("/api/admin/gown/reservations?q=%ff%fe"));
    assertError(400, "invalid-argument", admin.get("/api/admin/audit-logs?domain=%ff"));
    // A cursor no page ever produced: a year no TIMESTAMP holds, an ID outside ASCII.
    assertError(
        400, "invalid-argument", admin.get("/api/admin/audit-logs?cursor=9999-12-31T23:59:59,x"));
    assertError(
        400,
        "invalid-argument",
        admin.get("/api/admin/audit-logs?cursor=2026-11-10T12:00:00.123,%ED%95%9C%EA%B8%80"));
  }

  @Test
  @DisplayName("many simultaneous event reads do not use up the connection pool")
  void simultaneousEventReads() throws Exception {
    // More requests than the pool has connections (10). When the option names were read from
    // inside the row mapper, each request held one connection and waited for a second.
    int requests = 40;
    HttpTestClient admin = signedInAs(ADMIN);
    ExecutorService threads = Executors.newFixedThreadPool(requests);
    try {
      CountDownLatch start = new CountDownLatch(1);
      List<Future<Response>> running = new ArrayList<>();
      for (int i = 0; i < requests; i++) {
        running.add(
            threads.submit(
                () -> {
                  start.await();
                  return admin.get("/api/admin/mentoring/events");
                }));
      }
      start.countDown();
      for (Future<Response> response : running) {
        assertStatus(200, response.get(20, TimeUnit.SECONDS));
      }
    } finally {
      threads.shutdownNow();
    }
    assertEquals(
        List.of("2027-01", "2026-05"),
        read(admin.get("/api/admin/mentoring/events"), "$[*].eventId"));
  }

  @Test
  @DisplayName("the period list shows every period with its counts")
  void periods() {
    Response response = signedInAs(ADMIN).get("/api/admin/gown/periods");

    assertStatus(200, response);
    assertEquals(List.of("2027-02", "2026-08"), read(response, "$[*].periodId"));
    assertEquals(List.of(true, false), read(response, "$[*].isCurrent"));
    assertEquals(List.of(12, 4), read(response, "$[*].slotCount"));
    // Reserved only: reservation 3 is cancelled.
    assertEquals(List.of(3, 1), read(response, "$[*].reservedCount"));
    assertEquals(
        "2027-02", read(signedInAs(ADMIN).get("/api/admin/gown/periods/current"), "$.periodId"));
  }

  @Test
  @DisplayName("the registration list filters by search, status and each session's choice")
  void registrationList() {
    HttpTestClient admin = signedInAs(ADMIN);
    String list = "/api/admin/mentoring/registrations?eventId=2027-01";

    Response all = admin.get(list);
    assertStatus(200, all);
    assertEquals(List.of("6", "5", "4", "3", "2"), read(all, "$[*].registrationId"));
    // The e-mail is not a column of the registration. It comes from the join with users.
    assertEquals("student04@example.com", read(all, "$[0].email"));

    assertEquals(List.of("6", "2"), read(admin.get(list + "&first=1"), "$[*].registrationId"));
    assertEquals(List.of("5", "3"), read(admin.get(list + "&second=2"), "$[*].registrationId"));
    // 0 is "no choice", which the table stores as NULL.
    assertEquals(List.of("3"), read(admin.get(list + "&first=0"), "$[*].registrationId"));
    assertEquals(List.of("6"), read(admin.get(list + "&second=0"), "$[*].registrationId"));
    assertEquals(List.of("4"), read(admin.get(list + "&status=cancelled"), "$[*].registrationId"));
    assertEquals(List.of("5", "4"), read(admin.get(list + "&q=몽룡"), "$[*].registrationId"));
    assertEquals(List.of(0), read(admin.get(list + "&first=0"), "$[*].firstOption"));
  }

  @Test
  @DisplayName("MNT-54 the counts per option and session come from one GROUP BY; cancelled rows are not counted")
  void counts() {
    Response response = signedInAs(ADMIN).get("/api/admin/mentoring/counts?eventId=2027-01");

    assertStatus(200, response);
    // Reserved registrations: (1, 3), (none, 2), (5, 2), (1, none). Registration 4 is cancelled.
    assertEquals(List.of(1, 2, 3, 4, 5, 6, 7, 0), read(response, "$[*].option"));
    assertEquals(List.of(2, 0, 0, 0, 1, 0, 0, 1), read(response, "$[*].first"));
    assertEquals(List.of(0, 2, 1, 0, 0, 0, 0, 1), read(response, "$[*].second"));
    assertEquals("반도체 공정 엔지니어", read(response, "$[0].name"));
    assertEquals("선택 안함", read(response, "$[7].name"));
  }

  @Test
  @DisplayName("the admin sees hidden announcements, which the student API never returns")
  void announcements() {
    Response response = signedInAs(ADMIN).get("/api/admin/announcements");

    assertStatus(200, response);
    // Pinned first, then newest first: 1 is pinned, 3 (hidden) is newer than 2.
    assertEquals(List.of("1", "3", "2"), read(response, "$[*].id"));
    assertEquals(List.of(true, false, true), read(response, "$[*].isVisible"));
  }

  @Test
  @DisplayName("the FAQ list carries each FAQ's tags in order")
  void faqs() {
    Response response = signedInAs(ADMIN).get("/api/admin/faqs");

    assertStatus(200, response);
    assertEquals(List.of("1", "2"), read(response, "$[*].id"));
    assertEquals(List.of("학위복", "대리 수령"), read(response, "$[0].tags"));
    assertEquals(List.of("St:talk"), read(response, "$[1].tags"));
  }

  @Test
  @DisplayName("A5 the audit log is filtered and paged by the server")
  void auditLogs() {
    for (int i = 1; i <= 5; i++) {
      dbUpdate(
          """
          INSERT INTO audit_logs (operation_id, domain, action, actor_id, outcome, created_at)
          VALUES (?, ?, 'test.action', 1, ?, ?)
          """,
          "audit-test-operation-" + i,
          i % 2 == 0 ? "mentoring" : "reservation",
          i == 5 ? "rejected" : "succeeded",
          // Rows 2 and 3 share a millisecond, so the cursor has to break the tie.
          "2026-12-01 10:00:0" + (i == 3 ? 2 : i) + ".000");
    }
    HttpTestClient admin = signedInAs(ADMIN);

    Response all = admin.get("/api/admin/audit-logs");
    assertEquals(
        List.of("audit-test-operation-5", "audit-test-operation-4", "audit-test-operation-3",
            "audit-test-operation-2", "audit-test-operation-1"),
        read(all, "$.items[*].operationId"));
    assertEquals("student01@example.com", read(all, "$.items[0].actorEmail"));
    assertEquals(
        List.of("audit-test-operation-4", "audit-test-operation-2"),
        read(admin.get("/api/admin/audit-logs?domain=mentoring"), "$.items[*].operationId"));
    assertEquals(
        List.of("audit-test-operation-5"),
        read(admin.get("/api/admin/audit-logs?outcome=rejected"), "$.items[*].operationId"));

    List<String> seen = new ArrayList<>();
    String cursor = null;
    do {
      Response page =
          admin.get("/api/admin/audit-logs?limit=2" + (cursor == null ? "" : "&cursor=" + cursor));
      assertStatus(200, page);
      List<String> ids = read(page, "$.items[*].operationId");
      seen.addAll(ids);
      cursor = read(page, "$.nextCursor");
    } while (cursor != null);
    assertEquals(read(all, "$.items[*].operationId"), seen);
    assertTrue(seen.size() == 5);
  }
}
