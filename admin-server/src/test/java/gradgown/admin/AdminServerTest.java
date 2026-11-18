package gradgown.admin;

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
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Base of the admin server tests: the real server on a random port, connected to a throwaway
 * MySQL with both the admin and the master account, driven over HTTP. Every test starts from the
 * seed data (db/init/04-seed.sql).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
abstract class AdminServerTest {

  static final String ADMIN = "admin01@example.com";
  static final String MASTER = "master01@example.com";

  @DynamicPropertySource
  static void database(DynamicPropertyRegistry registry) {
    registry.add(
        "gradgown.datasource.url",
        () ->
            MySqlTestDatabase.jdbcUrl()
                + "?connectionTimeZone=Asia/Seoul&forceConnectionTimeZoneToSession=true");
  }

  @Value("${local.server.port}")
  int port;

  @BeforeEach
  void startFromSeed() {
    MySqlTestDatabase.resetToSeed();
  }

  HttpTestClient anonymous() {
    return new HttpTestClient(port);
  }

  HttpTestClient signedInAs(String email) {
    HttpTestClient client = new HttpTestClient(port);
    assertStatus(200, client.post("/api/auth/login", "{\"email\":\"" + email + "\"}"));
    return client;
  }

  static void assertStatus(int expected, Response response) {
    assertEquals(expected, response.status(), response.body());
  }

  static void assertError(int status, String code, Response response) {
    assertStatus(status, response);
    assertEquals(code, read(response, "$.code"), response.body());
  }

  static <T> T read(Response response, String jsonPath) {
    return JsonPath.read(response.body(), jsonPath);
  }

  /** Runs a query that returns one value, as root. */
  static String dbValue(String sql, Object... args) {
    try (Connection db = MySqlTestDatabase.connect(Account.ROOT);
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

  /** Changes the data behind the server's back, as root. */
  static void dbUpdate(String sql, Object... args) {
    try (Connection db = MySqlTestDatabase.connect(Account.ROOT);
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
