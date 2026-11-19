package gradgown.eval;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * A local Firestore emulator, driven through the REST API it serves. Nothing here can reach a
 * real Firebase project: the address must be a loopback address, the project ID is a "demo-"
 * project (which Firebase tooling never maps to a real one), and no Google host name appears.
 *
 * <p>The numbers taken here are counts and sizes, never times: an emulator's speed says nothing
 * about the service's.
 */
final class Firestore {

  /** A "demo-" project exists only in emulators. */
  static final String PROJECT = "demo-gradgown-eval";

  /** What one request cost: documents returned and bytes of the response body. */
  record Read(int documents, long bytes, List<JsonNode> docs) {}

  private static final JsonMapper JSON = JsonMapper.builder().build();
  private static final int BATCH = 400;

  private final HttpClient http = HttpClient.newHttpClient();
  private final String documents;
  private final String reset;

  Firestore(String emulatorHost) {
    String host = emulatorHost == null ? "" : emulatorHost.strip();
    if (!host.matches("(127\\.0\\.0\\.1|localhost):\\d{1,5}")) {
      throw new IllegalStateException(
          "FIRESTORE_EMULATOR_HOST must be a local emulator such as 127.0.0.1:8790, but is '"
              + host
              + "'. The measurements never run against a live Firebase project.");
    }
    String database = "http://" + host + "/v1/projects/" + PROJECT + "/databases/(default)";
    this.documents = database + "/documents";
    this.reset = "http://" + host + "/emulator/v1/projects/" + PROJECT + "/databases/(default)/documents";
  }

  /** Deletes every document in the emulator. */
  void clear() {
    send(HttpRequest.newBuilder(URI.create(reset)).DELETE());
  }

  // --- Writing ----------------------------------------------------------------

  /** Collects documents and writes them in batches. */
  final class Writer {
    private final List<Map<String, Object>> pending = new ArrayList<>();
    private long written;

    void put(String path, Map<String, Object> fields) {
      Map<String, Object> update = new LinkedHashMap<>();
      update.put("name", "projects/" + PROJECT + "/databases/(default)/documents/" + path);
      update.put("fields", fields);
      pending.add(Map.of("update", update));
      if (pending.size() >= BATCH) {
        flush();
      }
    }

    private void flush() {
      if (pending.isEmpty()) {
        return;
      }
      post(documents + ":commit", Map.of("writes", pending));
      written += pending.size();
      pending.clear();
    }

    /** Writes what is left and returns how many documents were written in all. */
    long finish() {
      flush();
      return written;
    }
  }

  static Map<String, Object> string(String value) {
    return Map.of("stringValue", value);
  }

  static Map<String, Object> integer(long value) {
    return Map.of("integerValue", Long.toString(value));
  }

  static Map<String, Object> bool(boolean value) {
    return Map.of("booleanValue", value);
  }

  static Map<String, Object> nothing() {
    Map<String, Object> value = new LinkedHashMap<>();
    value.put("nullValue", null);
    return value;
  }

  /** A Seoul wall-clock time as a Firestore timestamp. */
  static Map<String, Object> time(LocalDateTime seoulTime) {
    return Map.of("timestampValue", seoulTime.toInstant(ZoneOffset.ofHours(9)).toString());
  }

  static Map<String, Object> map(Map<String, Object> fields) {
    return Map.of("mapValue", Map.of("fields", fields));
  }

  // --- Reading ----------------------------------------------------------------

  /** Reads one document. */
  Read get(String path) {
    JsonNode document = JSON.readTree(send(HttpRequest.newBuilder(URI.create(documents + "/" + path)).GET()));
    return new Read(1, bytes(document), List.of(document));
  }

  /**
   * Runs a query over a collection or, with {@code allDescendants}, a collection group: the
   * documents where {@code field == value}, newest first by {@code createdAt}, at most {@code
   * limit}, starting after the document {@code after} when one is given. This is the shape of
   * every list query of the original admin app.
   */
  Read query(
      String collection, boolean allDescendants, String field, String value, int limit, JsonNode after) {
    Map<String, Object> query = new LinkedHashMap<>();
    query.put("from", List.of(Map.of("collectionId", collection, "allDescendants", allDescendants)));
    if (field != null) {
      query.put(
          "where",
          Map.of(
              "fieldFilter",
              Map.of("field", Map.of("fieldPath", field), "op", "EQUAL", "value", string(value))));
    }
    query.put(
        "orderBy",
        List.of(
            Map.of("field", Map.of("fieldPath", "createdAt"), "direction", "DESCENDING"),
            Map.of("field", Map.of("fieldPath", "__name__"), "direction", "DESCENDING")));
    query.put("limit", limit);
    if (after != null) {
      // startAfter(lastDocument): the cursor is the last document's sort key.
      query.put(
          "startAt",
          Map.of(
              "before",
              false,
              "values",
              List.of(
                  Map.of(
                      "timestampValue",
                      after.get("fields").get("createdAt").get("timestampValue").asString()),
                  Map.of("referenceValue", after.get("name").asString()))));
    }

    JsonNode rows = JSON.readTree(post(documents + ":runQuery", Map.of("structuredQuery", query)));
    List<JsonNode> docs = new ArrayList<>();
    for (JsonNode row : rows) {
      if (row.has("document")) {
        docs.add(row.get("document"));
      }
    }
    return new Read(docs.size(), bytes(rows), docs);
  }

  private String post(String url, Object body) {
    return send(
        HttpRequest.newBuilder(URI.create(url))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body))));
  }

  private String send(HttpRequest.Builder request) {
    try {
      // "owner" is the emulator's way to skip security rules, as the Admin SDK does.
      HttpResponse<String> response =
          http.send(
              request.header("Authorization", "Bearer owner").build(),
              HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() >= 300) {
        throw new IllegalStateException(
            "Emulator answered " + response.statusCode() + ": " + response.body());
      }
      return response.body();
    } catch (IOException e) {
      throw new UncheckedIOException(
          "Could not reach the Firestore emulator. Start it first (eval/README.md).", e);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(e);
    }
  }

  /**
   * The size of a response without the emulator's indentation: the emulator pretty-prints its
   * JSON, which would count whitespace against Firestore. What remains is Firestore's own wire
   * form, in which every value carries its type ({@code {"stringValue": "…"}}).
   */
  private static long bytes(JsonNode response) {
    return JSON.writeValueAsString(response).getBytes(StandardCharsets.UTF_8).length;
  }
}
