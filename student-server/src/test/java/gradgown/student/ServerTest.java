package gradgown.student;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.jayway.jsonpath.JsonPath;
import gradgown.core.test.HttpTestClient;
import gradgown.core.test.HttpTestClient.Response;
import gradgown.db.MySqlTestDatabase;
import gradgown.db.MySqlTestDatabase.Account;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Base of the student server tests: the real server on a random port, connected as the student
 * account to a throwaway MySQL, driven over HTTP.
 *
 * <p>Every test starts from the seed data (db/init/04-seed.sql) at a fixed time, 2026-12-01 10:00
 * in Seoul, which is inside the application windows of the current gown period (2027-02) and the
 * current St:talk event (2027-01).
 *
 * <p>The seed, as the tests use it: student 1 has reservation 2 (current) and 1 (past period),
 * and registration 2 (current) and 1 (past event). Student 2 has reservation 3 (cancelled) and 4.
 * Student 4 has no reservation. Student 5 has neither a reservation nor a registration.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(ServerTest.ClockConfig.class)
abstract class ServerTest {

  static final String IN_APPLICATION_WINDOW = "2026-12-01T10:00:00+09:00";

  static final String STUDENT_1 = "student01@example.com";
  static final String STUDENT_2 = "student02@example.com";
  static final String STUDENT_4 = "student04@example.com";
  static final String STUDENT_5 = "student05@example.com";

  @TestConfiguration
  static class ClockConfig {
    @Bean
    @Primary
    MutableClock testClock() {
      return new MutableClock();
    }
  }

  @DynamicPropertySource
  static void database(DynamicPropertyRegistry registry) {
    registry.add(
        "spring.datasource.url",
        () ->
            MySqlTestDatabase.jdbcUrl()
                + "?connectionTimeZone=Asia/Seoul&forceConnectionTimeZoneToSession=true");
  }

  @Value("${local.server.port}")
  int port;

  @Autowired MutableClock clock;

  @BeforeEach
  void startFromSeed() {
    MySqlTestDatabase.resetToSeed();
    clock.setTo(IN_APPLICATION_WINDOW);
  }

  // --- HTTP -----------------------------------------------------------------

  /** A browser that is not signed in. */
  HttpTestClient anonymous() {
    return new HttpTestClient(port);
  }

  /** A browser signed in as the seeded account. */
  HttpTestClient signedInAs(String email) {
    HttpTestClient client = new HttpTestClient(port);
    assertStatus(200, client.post("/api/auth/login", "{\"email\":\"" + email + "\"}"));
    return client;
  }

  static String newOperationId() {
    return UUID.randomUUID().toString();
  }

  static void assertStatus(int expected, Response response) {
    assertEquals(expected, response.status(), response.body());
  }

  /** Asserts the HTTP status and the {@code code} of an error body. */
  static void assertError(int status, String code, Response response) {
    assertStatus(status, response);
    assertEquals(code, read(response, "$.code"), response.body());
  }

  static <T> T read(Response response, String jsonPath) {
    return JsonPath.read(response.body(), jsonPath);
  }

  // --- Request bodies --------------------------------------------------------

  /** Slot 5 starts 2027-02-15 10:00, slot 13 starts 2027-02-17 10:00; both are enabled. */
  static String reservationInput(String slotId, String rentAt, String returnAt) {
    return """
        {"name":"임꺽정","studentId":"99990005","department":"컴퓨터공학과","phone":"010-0000-0005",
         "size":"L","slotId":"%s","rentAt":"%s","returnAt":"%s",
         "isProxy":false,"proxyName":null,"proxyPhone":null}"""
        .formatted(slotId, rentAt, returnAt);
  }

  static String reservationInput() {
    return reservationInput("5", "2027-02-15T10:00:00+09:00", "2027-02-17T10:00:00+09:00");
  }

  static String mentoringInput(int firstOption, int secondOption) {
    return """
        {"name":"임꺽정","department":"컴퓨터공학과","studentId":"99990005","grade":4,
         "phone":"010-0000-0005","firstOption":%d,"secondOption":%d}"""
        .formatted(firstOption, secondOption);
  }

  static String createBody(String operationId, String input) {
    return "{\"operationId\":\"%s\",\"input\":%s}".formatted(operationId, input);
  }

  static String updateBody(String operationId, String version, String input) {
    return "{\"operationId\":\"%s\",\"version\":\"%s\",\"input\":%s}"
        .formatted(operationId, version, input);
  }

  static String cancelBody(String operationId, String version) {
    return "{\"operationId\":\"%s\",\"version\":\"%s\"}".formatted(operationId, version);
  }

  // --- The database, seen from outside the server -----------------------------

  /** Runs a query that returns one value, as the master account. */
  static String dbValue(String sql, Object... args) {
    try (Connection db = MySqlTestDatabase.connect(Account.MASTER);
        PreparedStatement statement = db.prepareStatement(sql)) {
      for (int i = 0; i < args.length; i++) {
        statement.setObject(i + 1, args[i]);
      }
      try (ResultSet rows = statement.executeQuery()) {
        return rows.next() ? rows.getString(1) : null;
      }
    } catch (SQLException e) {
      throw new IllegalStateException(e);
    }
  }

  /** Changes the data behind the server's back, as the master account. */
  static void dbUpdate(String sql, Object... args) {
    try (Connection db = MySqlTestDatabase.connect(Account.MASTER);
        PreparedStatement statement = db.prepareStatement(sql)) {
      for (int i = 0; i < args.length; i++) {
        statement.setObject(i + 1, args[i]);
      }
      statement.executeUpdate();
    } catch (SQLException e) {
      throw new IllegalStateException(e);
    }
  }
}
