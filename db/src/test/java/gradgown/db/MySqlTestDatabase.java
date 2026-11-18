package gradgown.db;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.utility.MountableFile;

/**
 * The MySQL the tests run against: a throwaway container that initialises itself exactly like the
 * development container in compose.yaml. The image's entrypoint runs db/init/*.sql as root, with
 * the settings in db/conf, and then the test fixture.
 *
 * <p>One container serves the whole test run. Tests keep it clean by rolling back.
 */
final class MySqlTestDatabase {

  /** The same tag as compose.yaml. ComposeFileTest fails if the two drift apart. */
  static final String IMAGE = "mysql:8.4";

  static final String DATABASE = "gradgown";

  /** The accounts created by db/init/03-accounts.sql, plus the container's root. */
  enum Account {
    ROOT("root", "root-local-only"),
    STUDENT("gradgown_student", "student-local-only"),
    ADMIN("gradgown_admin", "admin-local-only"),
    MASTER("gradgown_master", "master-local-only");

    final String user;
    final String password;

    Account(String user, String password) {
      this.user = user;
      this.password = password;
    }
  }

  private static final MySQLContainer CONTAINER = start();

  private MySqlTestDatabase() {}

  /** Opens a new connection as the given account. The caller closes it. */
  static Connection connect(Account account) throws SQLException {
    String url =
        "jdbc:mysql://"
            + CONTAINER.getHost()
            + ":"
            + CONTAINER.getMappedPort(3306)
            + "/"
            + DATABASE;
    return DriverManager.getConnection(url, account.user, account.password);
  }

  private static MySQLContainer start() {
    Path db = Path.of(System.getProperty("gradgown.db.dir", "."));
    MySQLContainer container =
        new MySQLContainer(IMAGE)
            .withDatabaseName(DATABASE)
            .withUsername(Account.ROOT.user)
            .withPassword(Account.ROOT.password)
            .withCopyFileToContainer(
                MountableFile.forHostPath(db.resolve("conf/gradgown.cnf")),
                "/etc/mysql/conf.d/gradgown.cnf")
            .withCopyFileToContainer(
                MountableFile.forHostPath(db.resolve("init")), "/docker-entrypoint-initdb.d/")
            .withCopyFileToContainer(
                MountableFile.forClasspathResource("test-fixture.sql"),
                "/docker-entrypoint-initdb.d/90-test-fixture.sql");
    // Stopped by Testcontainers when the test JVM exits.
    container.start();
    return container;
  }
}
