package gradgown.db;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.utility.MountableFile;

/**
 * The MySQL the tests run against: a throwaway container that initialises itself exactly like the
 * development container in compose.yaml. The image's entrypoint runs db/init/*.sql as root, with
 * the settings in db/conf, and then the test fixture.
 *
 * <p>One container serves a whole test run (one per Gradle test task). The schema and privilege
 * tests keep it clean by rolling back. The server tests commit through the server, so they call
 * {@link #resetToSeed()} before each test.
 */
public final class MySqlTestDatabase {

  /** The same tag as compose.yaml. ComposeFileTest fails if the two drift apart. */
  public static final String IMAGE = "mysql:8.4";

  public static final String DATABASE = "gradgown";

  /** The accounts created by db/init/03-accounts.sql, plus the container's root. */
  public enum Account {
    ROOT("root", "root-local-only"),
    STUDENT("gradgown_student", "student-local-only"),
    ADMIN("gradgown_admin", "admin-local-only"),
    MASTER("gradgown_master", "master-local-only");

    public final String user;
    public final String password;

    Account(String user, String password) {
      this.user = user;
      this.password = password;
    }
  }

  private static final String[] TABLES = {
    "audit_logs",
    "announcements",
    "faqs",
    "mentoring_registrations",
    "mentoring_options",
    "mentoring_sessions",
    "mentoring_events",
    "gown_reservations",
    "gown_slots",
    "gown_periods",
    "users"
  };

  private static final Path DB_DIR = Path.of(System.getProperty("gradgown.db.dir", "."));

  private static final MySQLContainer CONTAINER = start();

  private MySqlTestDatabase() {}

  /** The JDBC URL of the test database, without credentials or options. */
  public static String jdbcUrl() {
    return "jdbc:mysql://" + CONTAINER.getHost() + ":" + CONTAINER.getMappedPort(3306) + "/" + DATABASE;
  }

  /** Opens a new connection as the given account. The caller closes it. */
  public static Connection connect(Account account) throws SQLException {
    return DriverManager.getConnection(jdbcUrl(), account.user, account.password);
  }

  /**
   * Empties every table and loads db/init/04-seed.sql again, so that a test starts from the seed
   * data whatever earlier tests committed. The test fixture rows are not restored.
   */
  public static void resetToSeed() {
    StringBuilder script = new StringBuilder("SET FOREIGN_KEY_CHECKS = 0;\n");
    for (String table : TABLES) {
      script.append("TRUNCATE TABLE ").append(table).append(";\n");
    }
    script.append("SET FOREIGN_KEY_CHECKS = 1;\n");
    try {
      script.append(Files.readString(DB_DIR.resolve("init/04-seed.sql")));
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
    // The script is many statements, so this one connection allows several per call.
    try (Connection root =
            DriverManager.getConnection(
                jdbcUrl() + "?allowMultiQueries=true", Account.ROOT.user, Account.ROOT.password);
        Statement statement = root.createStatement()) {
      statement.execute(script.toString());
      // Drain the results so that an error in a later statement is not lost.
      while (statement.getMoreResults() || statement.getUpdateCount() != -1) {
        // nothing to read
      }
    } catch (SQLException e) {
      throw new IllegalStateException("Could not reset the test database to the seed data", e);
    }
  }

  private static MySQLContainer start() {
    MySQLContainer container =
        new MySQLContainer(IMAGE)
            .withDatabaseName(DATABASE)
            .withUsername(Account.ROOT.user)
            .withPassword(Account.ROOT.password)
            .withCopyFileToContainer(
                MountableFile.forHostPath(DB_DIR.resolve("conf/gradgown.cnf")),
                "/etc/mysql/conf.d/gradgown.cnf")
            .withCopyFileToContainer(
                MountableFile.forHostPath(DB_DIR.resolve("init")), "/docker-entrypoint-initdb.d/")
            .withCopyFileToContainer(
                MountableFile.forClasspathResource("test-fixture.sql"),
                "/docker-entrypoint-initdb.d/90-test-fixture.sql");
    // Stopped by Testcontainers when the test JVM exits.
    container.start();
    return container;
  }
}
