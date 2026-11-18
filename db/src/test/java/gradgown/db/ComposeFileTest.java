package gradgown.db;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Development and tests must run the same MySQL (docs/decisions/mysql-docker.md). */
class ComposeFileTest {

  @Test
  @DisplayName("compose.yaml uses the same MySQL image as the tests")
  void composeUsesTheTestImage() throws IOException {
    Path compose = Path.of(System.getProperty("gradgown.compose.file", "../compose.yaml"));

    assertTrue(
        Files.readString(compose).contains("image: " + MySqlTestDatabase.IMAGE + "\n"),
        "compose.yaml should contain 'image: " + MySqlTestDatabase.IMAGE + "'");
  }
}
