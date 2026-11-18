package gradgown.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;

import gradgown.core.test.HttpTestClient;
import gradgown.core.test.HttpTestClient.Response;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Layer 4 of docs/testing/dynamic.md, "관리자 쓰기": the boundary between roles. The server has no
 * "is this a master?" check. An admin's request runs on the read-only database account, and it
 * is MySQL that refuses the write (docs/decisions/admin-server-split.md).
 */
class AdminRoleTest extends AdminServerTest {

  private static final String GOWN_OPEN = "/api/admin/gown/periods/2027-02/open";
  private static final String EVENT_OPEN = "/api/admin/mentoring/events/2027-01/open";

  @Test
  @DisplayName("a master closes and opens the applications of a period")
  void masterTogglesPeriod() {
    HttpTestClient master = signedInAs(MASTER);

    Response closed = master.put(GOWN_OPEN, "{\"isOpen\":false}");
    assertStatus(200, closed);
    assertEquals(false, read(closed, "$.isOpen"));
    assertEquals("0", dbValue("SELECT is_open FROM gown_periods WHERE id = '2027-02'"));
    assertEquals(false, read(master.get("/api/admin/gown/periods/current"), "$.isOpen"));

    assertStatus(200, master.put(GOWN_OPEN, "{\"isOpen\":true}"));
    assertEquals("1", dbValue("SELECT is_open FROM gown_periods WHERE id = '2027-02'"));
  }

  @Test
  @DisplayName("an admin's attempt to close a period is refused by MySQL: 403, nothing changed")
  void adminCannotTogglePeriod() {
    Response response = signedInAs(ADMIN).put(GOWN_OPEN, "{\"isOpen\":false}");

    assertError(403, "permission-denied", response);
    assertEquals("1", dbValue("SELECT is_open FROM gown_periods WHERE id = '2027-02'"));
  }

  @Test
  @DisplayName("an admin's attempt to close an event is refused by MySQL: 403, nothing changed")
  void adminCannotToggleEvent() {
    Response response = signedInAs(ADMIN).put(EVENT_OPEN, "{\"isOpen\":false}");

    assertError(403, "permission-denied", response);
    assertEquals("1", dbValue("SELECT is_open FROM mentoring_events WHERE id = '2027-01'"));
  }

  @Test
  @DisplayName("the role is taken from each request's session, not left over from the last one")
  void roleDoesNotLeakBetweenRequests() {
    HttpTestClient master = signedInAs(MASTER);
    HttpTestClient admin = signedInAs(ADMIN);

    // Alternate the two users many times over the same few request threads.
    for (int i = 0; i < 20; i++) {
      assertStatus(200, master.put(GOWN_OPEN, "{\"isOpen\":" + (i % 2 == 0) + "}"));
      assertError(403, "permission-denied", admin.put(GOWN_OPEN, "{\"isOpen\":false}"));
      assertStatus(200, admin.get("/api/admin/gown/periods"));
    }
  }

  @Test
  @DisplayName("MNT-51 an event with an unnamed option cannot be opened, and stays closed")
  void eventNeedsAllOptionNames() {
    HttpTestClient master = signedInAs(MASTER);
    assertStatus(200, master.put(EVENT_OPEN, "{\"isOpen\":false}"));
    dbUpdate("UPDATE mentoring_options SET name = '' WHERE event_id = '2027-01' AND option_no = 7");

    assertError(422, "failed-precondition", master.put(EVENT_OPEN, "{\"isOpen\":true}"));
    assertEquals("0", dbValue("SELECT is_open FROM mentoring_events WHERE id = '2027-01'"));

    // Closing needs no names, and opening works once the name is back.
    assertStatus(200, master.put(EVENT_OPEN, "{\"isOpen\":false}"));
    dbUpdate("UPDATE mentoring_options SET name = '대학원 진학' WHERE event_id = '2027-01' AND option_no = 7");
    assertStatus(200, master.put(EVENT_OPEN, "{\"isOpen\":true}"));
    assertEquals("1", dbValue("SELECT is_open FROM mentoring_events WHERE id = '2027-01'"));
  }

  @Test
  @DisplayName("an unknown period or event is not-found, and a missing value is invalid-argument")
  void badRequests() {
    HttpTestClient master = signedInAs(MASTER);

    assertError(404, "not-found", master.put("/api/admin/gown/periods/2030-01/open", "{\"isOpen\":true}"));
    assertError(404, "not-found", master.put("/api/admin/mentoring/events/2030-01/open", "{\"isOpen\":false}"));
    assertError(400, "invalid-argument", master.put(GOWN_OPEN, "{}"));
    // Only a JSON boolean. "false" and 0 were once converted and written.
    assertError(400, "invalid-argument", master.put(GOWN_OPEN, "{\"isOpen\":\"false\"}"));
    assertError(400, "invalid-argument", master.put(GOWN_OPEN, "{\"isOpen\":0}"));
    assertError(400, "invalid-argument", master.put(EVENT_OPEN, "{\"isOpen\":\"false\"}"));
    assertEquals("1", dbValue("SELECT is_open FROM gown_periods WHERE id = '2027-02'"));
    assertEquals("1", dbValue("SELECT is_open FROM mentoring_events WHERE id = '2027-01'"));
  }

  @Test
  @DisplayName("a write is answered with its real result whatever the request says it accepts")
  void acceptHeaderDoesNotChangeTheAnswer() {
    HttpTestClient master = signedInAs(MASTER);

    Response closed = master.putAccepting(GOWN_OPEN, "{\"isOpen\":false}", "text/html");

    assertStatus(200, closed);
    assertEquals(false, read(closed, "$.isOpen"));
    assertEquals("0", dbValue("SELECT is_open FROM gown_periods WHERE id = '2027-02'"));
    assertStatus(200, master.getAccepting("/api/admin/gown/periods", "text/plain"));
  }

  @Test
  @DisplayName("only admin and master accounts can sign in to the admin server")
  void loginIsForStaff() {
    HttpTestClient client = anonymous();

    assertError(403, "permission-denied", client.post("/api/auth/login", "{\"email\":\"student01@example.com\"}"));
    assertError(404, "not-found", client.post("/api/auth/login", "{\"email\":\"nobody@example.com\"}"));
    assertEquals(List.of("admin", "master"), read(client.get("/api/auth/accounts"), "$[*].role"));

    Response me = signedInAs(MASTER).get("/api/me");
    assertEquals("master", read(me, "$.role"));
    assertEquals("7", read(me, "$.uid"));
  }

  @Test
  @DisplayName("without a session every admin path answers 401")
  void anonymousIsUnauthenticated() {
    HttpTestClient anonymous = anonymous();

    assertError(401, "unauthenticated", anonymous.get("/api/me"));
    assertError(401, "unauthenticated", anonymous.get("/api/admin/gown/reservations"));
    assertError(401, "unauthenticated", anonymous.get("/api/admin/audit-logs"));
    assertError(401, "unauthenticated", anonymous.put(GOWN_OPEN, "{\"isOpen\":false}"));
    assertEquals("1", dbValue("SELECT is_open FROM gown_periods WHERE id = '2027-02'"));
  }
}
