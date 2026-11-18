package gradgown.student;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import gradgown.core.test.HttpTestClient;
import gradgown.core.test.HttpTestClient.Response;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Layer 5 of docs/testing/dynamic.md: requests that arrive at the same moment. The original
 * service kept these rules with a query inside a Firestore transaction. Here the UNIQUE key, the
 * primary key and the version in the WHERE clause keep them.
 */
class ConcurrencyTest extends ServerTest {

  private static final int REQUESTS = 8;

  @Test
  @DisplayName("RES-22 of several simultaneous applications by one student, exactly one succeeds")
  void simultaneousReservations() throws Exception {
    List<Callable<Response>> requests = new ArrayList<>();
    for (int i = 0; i < REQUESTS; i++) {
      HttpTestClient browser = signedInAs(STUDENT_5);
      String body = createBody(newOperationId(), reservationInput());
      requests.add(() -> browser.post("/api/gown/reservations", body));
    }

    List<Response> responses = runTogether(requests);

    assertEquals(1, count(responses, 200), statuses(responses));
    assertEquals(REQUESTS - 1, count(responses, 409), statuses(responses));
    assertEquals(
        "1",
        dbValue("SELECT COUNT(*) FROM gown_reservations WHERE user_id = 5 AND status = 'reserved'"));
    assertEquals("1", dbValue("SELECT COUNT(*) FROM gown_reservations WHERE user_id = 5"));
  }

  @Test
  @DisplayName("MNT-22 of several simultaneous registrations by one student, exactly one succeeds")
  void simultaneousRegistrations() throws Exception {
    List<Callable<Response>> requests = new ArrayList<>();
    for (int i = 0; i < REQUESTS; i++) {
      HttpTestClient browser = signedInAs(STUDENT_5);
      String body = createBody(newOperationId(), mentoringInput(1, 2));
      requests.add(() -> browser.post("/api/mentoring/registrations", body));
    }

    List<Response> responses = runTogether(requests);

    assertEquals(1, count(responses, 200), statuses(responses));
    assertEquals("1", dbValue("SELECT COUNT(*) FROM mentoring_registrations WHERE user_id = 5"));
  }

  @Test
  @DisplayName("RES-24 of several simultaneous changes with the same version, exactly one succeeds")
  void simultaneousChanges() throws Exception {
    // Reservation 2 of student 1 is at version 1.
    List<Callable<Response>> requests = new ArrayList<>();
    for (int i = 0; i < REQUESTS; i++) {
      HttpTestClient browser = signedInAs(STUDENT_1);
      String body = updateBody(newOperationId(), "1", reservationInput());
      requests.add(() -> browser.put("/api/gown/reservations/2", body));
    }

    List<Response> responses = runTogether(requests);

    assertEquals(1, count(responses, 200), statuses(responses));
    assertEquals(REQUESTS - 1, count(responses, 409), statuses(responses));
    assertEquals("2", dbValue("SELECT version FROM gown_reservations WHERE id = 2"));
  }

  @Test
  @DisplayName("RES-25 the same operation ID sent several times at once is handled once")
  void simultaneousSameOperation() throws Exception {
    String body = createBody(newOperationId(), reservationInput());
    List<Callable<Response>> requests = new ArrayList<>();
    for (int i = 0; i < REQUESTS; i++) {
      HttpTestClient browser = signedInAs(STUDENT_5);
      requests.add(() -> browser.post("/api/gown/reservations", body));
    }

    List<Response> responses = runTogether(requests);

    // One request does the work. The others see it finished (a replay) or still running (aborted).
    long fresh =
        responses.stream()
            .filter(r -> r.status() == 200 && Boolean.FALSE.equals(read(r, "$.replayed")))
            .count();
    assertEquals(1, fresh, statuses(responses));
    assertTrue(
        responses.stream().allMatch(r -> r.status() == 200 || r.status() == 409),
        statuses(responses));
    assertEquals("1", dbValue("SELECT COUNT(*) FROM gown_reservations WHERE user_id = 5"));
    assertEquals("1", dbValue("SELECT COUNT(*) FROM audit_logs"));
  }

  /** Starts every request at the same instant and waits for all of them. */
  private static List<Response> runTogether(List<Callable<Response>> requests) throws Exception {
    ExecutorService threads = Executors.newFixedThreadPool(requests.size());
    try {
      CountDownLatch start = new CountDownLatch(1);
      List<Future<Response>> running = new ArrayList<>();
      for (Callable<Response> request : requests) {
        running.add(
            threads.submit(
                () -> {
                  start.await();
                  return request.call();
                }));
      }
      start.countDown();
      List<Response> responses = new ArrayList<>();
      for (Future<Response> future : running) {
        responses.add(future.get(30, TimeUnit.SECONDS));
      }
      return responses;
    } finally {
      threads.shutdownNow();
    }
  }

  private static long count(List<Response> responses, int status) {
    return responses.stream().filter(r -> r.status() == status).count();
  }

  private static String statuses(List<Response> responses) {
    return responses.stream().map(r -> r.status() + " " + r.body()).toList().toString();
  }
}
