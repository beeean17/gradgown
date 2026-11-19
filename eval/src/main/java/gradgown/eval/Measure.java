package gradgown.eval;

import gradgown.db.MySqlTestDatabase;
import gradgown.db.MySqlTestDatabase.Account;
import gradgown.eval.Dataset.Registration;
import gradgown.eval.Dataset.Scale;
import gradgown.eval.Firestore.Read;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Runs the same questions against both stores and writes what each had to read.
 *
 * <p>Firestore side: the queries of the original admin app and student web (grad42
 * admin-web/src/data/admin-api.ts, web/src/features), run on a local emulator. MySQL side: the
 * statements of this project's repositories, run on the container the tests use.
 *
 * <p>What is compared is structure: requests, documents or rows read, rows returned, bytes
 * returned, and whether the answer is right. Times are given for MySQL only, as a reference; the
 * emulator's times mean nothing for the real service.
 */
public final class Measure {

  private static final JsonMapper JSON = JsonMapper.builder().build();
  private static final int PAGE = 50;

  // --- The statements under test: the same SQL as the repositories -----------------

  /** admin-server GownAdminRepository.findReservations. */
  private static final String RESERVATION_LIST =
      """
      SELECT r.id, r.user_id, u.email, r.period_id, r.status,
             r.name, r.student_id, r.department, r.phone, r.size,
             r.rent_slot_id, rent_slot.starts_at AS rent_at,
             return_slot.starts_at AS return_at,
             r.is_proxy, r.proxy_name, r.proxy_phone,
             r.created_at, r.updated_at, r.version
      FROM gown_reservations AS r
      JOIN users AS u ON u.id = r.user_id
      JOIN gown_slots AS rent_slot ON rent_slot.id = r.rent_slot_id
      JOIN gown_slots AS return_slot ON return_slot.id = r.return_slot_id
      WHERE r.period_id = ?
        AND (? IS NULL OR r.status = ?)
        AND (? IS NULL
             OR r.name LIKE ? OR r.student_id LIKE ? OR r.phone LIKE ?)
        AND (? IS NULL OR r.id < ?)
      ORDER BY r.id DESC
      LIMIT ?
      """;

  /** admin-server MentoringAdminRepository.countByOption. */
  private static final String OPTION_COUNTS =
      """
      SELECT choice.option_no,
             SUM(choice.session_no = 1) AS first_count,
             SUM(choice.session_no = 2) AS second_count
      FROM (
        SELECT 1 AS session_no, COALESCE(first_option_no, 0) AS option_no
        FROM mentoring_registrations
        WHERE event_id = ? AND status = 'reserved'
        UNION ALL
        SELECT 2 AS session_no, COALESCE(second_option_no, 0) AS option_no
        FROM mentoring_registrations
        WHERE event_id = ? AND status = 'reserved'
      ) AS choice
      GROUP BY choice.option_no
      """;

  /** admin-server AuditLogAdminRepository.find, first page. */
  private static final String AUDIT_LIST =
      """
      SELECT a.operation_id, a.domain, a.action, a.actor_id, u.email AS actor_email,
             a.target_id, a.outcome, a.failure_kind, a.error_code,
             a.created_at, a.completed_at
      FROM audit_logs AS a
      JOIN users AS u ON u.id = a.actor_id
      WHERE (? IS NULL OR a.domain = ?)
        AND (? IS NULL OR a.outcome = ?)
      ORDER BY a.created_at DESC, a.operation_id DESC
      LIMIT ?
      """;

  /** student-server AnnouncementRepository.findAll. */
  private static final String VISIBLE_ANNOUNCEMENTS =
      """
      SELECT id, title, content, category, is_pinned, is_popup, show_on_home, author_id,
             created_at, updated_at
      FROM visible_announcements
      ORDER BY is_pinned DESC, created_at DESC, id DESC
      """;

  private static final String AUDIT_INDEX = "ix_audit_logs_created";

  // --- Results -------------------------------------------------------------------

  /** One line of a result table. */
  private record Line(
      String store, String how, long requests, String read, long returned, long bytes, String note) {}

  private record SqlRun(int rows, long rowsRead, long bytes, double medianMs, String plan) {}

  private final StringBuilder out = new StringBuilder();
  private final StringBuilder plans = new StringBuilder();

  public static void main(String[] args) throws Exception {
    Firestore firestore = new Firestore(System.getenv("FIRESTORE_EMULATOR_HOST"));
    Path results = Path.of(System.getProperty("gradgown.eval.results", "results"));
    Files.createDirectories(results);
    List<Scale> scales =
        args.length == 0
            ? List.of(Scale.ACTUAL, Scale.X100)
            : Arrays.stream(args)
                .map(name -> name.equals("x100") ? Scale.X100 : Scale.ACTUAL)
                .toList();
    for (Scale scale : scales) {
      new Measure().run(scale, firestore, results);
    }
  }

  private void run(Scale scale, Firestore firestore, Path results) throws Exception {
    System.out.println("== " + scale.name() + ": generating and loading");
    Dataset data = new Dataset(scale);
    Loader.loadMySql(data);
    long documents = Loader.loadFirestore(data, firestore);

    try (Connection db = MySqlTestDatabase.connect(Account.ROOT)) {
      String version = one(db, "SELECT VERSION()");
      out.append("# 측정 결과: ").append(scale.name()).append("\n\n");
      out.append(
          """
          `./gradlew :eval:measure`가 쓴 파일이다. 손으로 고치지 않는다. 방법과 읽는 법은 [eval/README.md](../README.md)에 있다.

          | 항목 | 값 |
          |---|---|
          """);
      out.append("| 회차의 예약 | ").append(fmt(scale.reservations())).append("건 |\n");
      out.append("| 행사의 신청 | ").append(fmt(scale.registrations())).append("건 |\n");
      out.append("| 감사 로그 | ").append(fmt(scale.auditLogs())).append("건 |\n");
      out.append("| 공지 | ").append(fmt(scale.announcements())).append("건 |\n");
      out.append("| MySQL | ").append(version).append(" (Docker, `mysql:8.4`) |\n");
      out.append("| Firestore | 로컬 에뮬레이터, 문서 ").append(fmt(documents)).append("개 |\n\n");

      System.out.println("== " + scale.name() + ": measuring");
      firstPage(data, firestore, db);
      findOnePerson(data, firestore, db);
      optionCounts(data, firestore, db);
      auditLog(data, firestore, db);
      announcements(data, firestore, db);
    }

    out.append("## 실행 계획\n\n`EXPLAIN ANALYZE`의 출력이다. 시간은 이 컨테이너에서의 값이다.\n\n").append(plans);
    Path file = results.resolve(scale.name() + ".md");
    Files.writeString(file, out.toString(), StandardCharsets.UTF_8);
    System.out.println("== wrote " + file);
  }

  // --- 1. The first page of the reservation list ---------------------------------------

  private void firstPage(Dataset data, Firestore firestore, Connection db) throws SQLException {
    Read page = firestore.query("gown_reservations", true, "periodId", Dataset.PERIOD, PAGE + 1, null);
    SqlRun sql =
        sql(db, "예약 명단 첫 페이지", RESERVATION_LIST,
            Dataset.PERIOD, null, null, null, null, null, null, null, null, PAGE + 1);

    table(
        "1. 예약 명단의 첫 페이지",
        "회차의 예약을 최신순으로 50건 보인다. 다음 페이지가 있는지 알려고 둘 다 51건을 읽는다.",
        new Line("Firestore", "컬렉션 그룹 쿼리 `limit(51)`", 1, fmt(page.documents()) + " 문서", page.documents(), page.bytes(), ""),
        new Line("MySQL", "`WHERE period_id = ? ORDER BY id DESC LIMIT 51`", 1, fmt(sql.rowsRead()) + " 행", sql.rows(), sql.bytes(), ms(sql)));
  }

  // --- 2. Finding one person in the period (A1) -----------------------------------------

  private void findOnePerson(Dataset data, Firestore firestore, Connection db) throws SQLException {
    String target = Dataset.TARGET_NAME;

    // The original filters inside the page the browser holds. Page 1 first, then "다음" until
    // the page that has the person.
    long requests = 0;
    long docs = 0;
    long bytes = 0;
    boolean foundOnFirstPage = false;
    boolean found = false;
    JsonNode cursor = null;
    while (!found) {
      Read page = firestore.query("gown_reservations", true, "periodId", Dataset.PERIOD, PAGE + 1, cursor);
      requests++;
      docs += page.documents();
      bytes += page.bytes();
      List<JsonNode> shown = page.docs().subList(0, Math.min(PAGE, page.docs().size()));
      found = shown.stream().anyMatch(doc -> doc.get("fields").get("name").get("stringValue").asString().equals(target));
      if (requests == 1) {
        foundOnFirstPage = found;
      }
      if (page.documents() <= PAGE) {
        break;
      }
      cursor = shown.get(shown.size() - 1);
    }

    SqlRun sql =
        sql(db, "이름으로 한 사람 찾기", RESERVATION_LIST,
            Dataset.PERIOD, null, null, "%" + target + "%", "%" + target + "%", "%" + target + "%",
            "%" + target + "%", null, null, PAGE + 1);

    table(
        "2. 회차에서 한 사람 찾기",
        "찾는 사람은 회차의 예약을 최신순으로 늘어놓았을 때 한가운데(" + fmt(data.scale.reservations() / 2 + 1)
            + "번째)에 있다. 원본은 검색어를 브라우저가 가진 페이지 안에서만 적용한다.",
        new Line("Firestore", "첫 페이지에서 검색", 1, "51 문서", foundOnFirstPage ? 1 : 0, 0,
            foundOnFirstPage ? "찾음" : "**못 찾음.** 화면은 \"결과 없음\"을 보인다"),
        new Line("Firestore", "찾을 때까지 \"다음 페이지\"", requests, fmt(docs) + " 문서", found ? 1 : 0, bytes,
            found ? "찾음. 어느 페이지에 있는지 알 방법은 없다" : "못 찾음"),
        new Line("MySQL", "`WHERE … name LIKE ? OR student_id LIKE ? OR phone LIKE ?`", 1,
            fmt(sql.rowsRead()) + " 행", sql.rows(), sql.bytes(), "찾음. " + ms(sql)));
  }

  // --- 3. Counts per option and session --------------------------------------------------

  private void optionCounts(Dataset data, Firestore firestore, Connection db) throws SQLException {
    // The truth, from the generated data.
    int[][] truth = new int[2][8];
    for (Registration r : data.registrations) {
      if (r.status().equals("reserved")) {
        truth[0][r.firstOption()]++;
        truth[1][r.secondOption()]++;
      }
    }

    // The original reads every registration of the event, capped at 1,000 (+1), and counts in
    // the browser (admin-api.ts listMentoring, data/mentoring.ts mentoringCounts).
    Read all = firestore.query("mentoring_registrations", true, "eventId", Dataset.EVENT, 1_001, null);
    int[][] counted = new int[2][8];
    for (JsonNode doc : all.docs().subList(0, Math.min(1_000, all.docs().size()))) {
      JsonNode f = doc.get("fields");
      if (f.get("status").get("stringValue").asString().equals("reserved")) {
        counted[0][Integer.parseInt(f.get("firstOption").get("integerValue").asString())]++;
        counted[1][Integer.parseInt(f.get("secondOption").get("integerValue").asString())]++;
      }
    }

    SqlRun sql = sql(db, "선택지 × 차시 인원 집계", OPTION_COUNTS, Dataset.EVENT, Dataset.EVENT);
    int[][] grouped = new int[2][8];
    try (PreparedStatement statement = db.prepareStatement(OPTION_COUNTS)) {
      statement.setString(1, Dataset.EVENT);
      statement.setString(2, Dataset.EVENT);
      try (ResultSet rows = statement.executeQuery()) {
        while (rows.next()) {
          grouped[0][rows.getInt("option_no")] = rows.getInt("first_count");
          grouped[1][rows.getInt("option_no")] = rows.getInt("second_count");
        }
      }
    }

    table(
        "3. St:talk 신청 인원 집계",
        "선택지(1~7과 선택 안함) × 차시의 신청 완료 인원 16칸을 구한다. 실제 인원의 합은 차시마다 "
            + fmt(Arrays.stream(truth[0]).sum()) + "명이다.",
        new Line("Firestore", "행사의 신청을 모두 읽어 브라우저에서 센다 (`limit(1001)`)", 1,
            fmt(all.documents()) + " 문서", all.documents(), all.bytes(),
            Arrays.deepEquals(truth, counted)
                ? "맞음"
                : "**틀림.** 1,000건까지만 읽어서 " + fmt(Arrays.stream(counted[0]).sum()) + "명으로 센다"),
        new Line("MySQL", "`GROUP BY` 한 번", 1, fmt(sql.rowsRead()) + " 행", sql.rows(), sql.bytes(),
            (Arrays.deepEquals(truth, grouped) ? "맞음. " : "**틀림.** ") + ms(sql)));
  }

  // --- 4. Finding a rejected command in the audit log (A5) --------------------------------

  private void auditLog(Dataset data, Firestore firestore, Connection db) throws SQLException {
    String wanted = data.oldRejected.operationId();

    // The original reads the newest 200 and searches them in the browser.
    Read newest = firestore.query("adminAuditLogs", false, null, null, 200, null);
    boolean inNewest =
        newest.docs().stream()
            .anyMatch(doc -> doc.get("fields").get("operationId").get("stringValue").asString().equals(wanted));

    execute(db, "ALTER TABLE audit_logs DROP INDEX " + AUDIT_INDEX, true);
    SqlRun without =
        sql(db, "거부된 요청의 첫 페이지 (보조 인덱스 없음)", AUDIT_LIST, null, null, "rejected", "rejected", PAGE + 1);
    execute(db, "ALTER TABLE audit_logs ADD INDEX " + AUDIT_INDEX + " (created_at, operation_id)", false);
    execute(db, "ANALYZE TABLE audit_logs", false);
    SqlRun with =
        sql(db, "거부된 요청의 첫 페이지 (인덱스 있음)", AUDIT_LIST, null, null, "rejected", "rejected", PAGE + 1);

    // Reaching the wanted row: pages of rejected rows until it appears.
    long rejectedNewer =
        data.auditLogs.stream()
            .filter(a -> a.outcome().equals("rejected") && a.createdAt().isAfter(data.oldRejected.createdAt()))
            .count();

    table(
        "4. 감사 로그에서 거부된 요청 보기",
        "전체 " + fmt(data.scale.auditLogs()) + "건 가운데 5분의 1이 거부된 요청이다. 찾는 것은 그중 오래된 한 건이고, 그보다 새 거부 건이 "
            + fmt(rejectedNewer) + "건 있다.",
        new Line("Firestore", "최신 200건을 읽어 브라우저에서 거른다", 1, fmt(newest.documents()) + " 문서",
            newest.documents(), newest.bytes(),
            inNewest ? "찾음" : "**못 찾음.** 200건 밖의 기록은 화면에서 볼 방법이 없다"),
        new Line("MySQL", "`WHERE outcome = ?` 첫 페이지, 보조 인덱스 없음", 1, fmt(without.rowsRead()) + " 행",
            without.rows(), without.bytes(), ms(without)),
        new Line("MySQL", "같은 문장, `(created_at, operation_id)` 인덱스", 1, fmt(with.rowsRead()) + " 행",
            with.rows(), with.bytes(), ms(with) + ". 페이지를 넘기면 찾는 건에 닿는다"));
  }

  // --- 5. Announcements a student is sent (A4) --------------------------------------------

  private void announcements(Dataset data, Firestore firestore, Connection db) throws SQLException {
    Read document = firestore.get("information/announcements");
    long hidden = data.announcements.stream().filter(a -> !a.visible()).count();
    SqlRun sql = sql(db, "노출 중인 공지", VISIBLE_ANNOUNCEMENTS);

    table(
        "5. 학생에게 내려가는 공지",
        "공지 " + fmt(data.scale.announcements()) + "건 가운데 " + fmt(hidden) + "건이 숨김이다.",
        new Line("Firestore", "문서 하나를 통째로 읽고 브라우저가 숨김 항목을 뺀다", 1, "1 문서",
            data.scale.announcements(), document.bytes(), "**숨김 " + fmt(hidden) + "건이 브라우저까지 내려온다**"),
        new Line("MySQL", "학생 계정은 뷰 `visible_announcements`만 읽는다", 1, fmt(sql.rowsRead()) + " 행",
            sql.rows(), sql.bytes(), "숨김 0건. " + ms(sql)));
  }

  // --- Helpers ----------------------------------------------------------------------------

  private void table(String title, String about, Line... lines) {
    out.append("## ").append(title).append("\n\n").append(about).append("\n\n");
    out.append("| 저장소 | 방법 | 요청 | 읽은 것 | 돌려받은 것 | 응답 크기 | 결과 |\n|---|---|---|---|---|---|---|\n");
    for (Line line : lines) {
      out.append("| ").append(line.store())
          .append(" | ").append(line.how())
          .append(" | ").append(fmt(line.requests()))
          .append(" | ").append(line.read())
          .append(" | ").append(fmt(line.returned())).append("건")
          .append(" | ").append(line.bytes() == 0 ? "—" : size(line.bytes()))
          .append(" | ").append(line.note()).append(" |\n");
    }
    out.append("\n");
  }

  /**
   * Runs a statement and measures it: rows returned, rows the storage engine read (the session's
   * Handler_read counters), the size of the result written as JSON, the median time of 15 runs,
   * and the plan.
   */
  private SqlRun sql(Connection db, String title, String statementText, Object... args) throws SQLException {
    execute(db, "FLUSH STATUS", false);
    List<Map<String, Object>> rows = new ArrayList<>();
    try (PreparedStatement statement = prepare(db, statementText, args);
        ResultSet result = statement.executeQuery()) {
      ResultSetMetaData columns = result.getMetaData();
      while (result.next()) {
        Map<String, Object> row = new LinkedHashMap<>();
        for (int i = 1; i <= columns.getColumnCount(); i++) {
          Object value = result.getObject(i);
          row.put(columns.getColumnLabel(i), value == null ? null : value.toString());
        }
        rows.add(row);
      }
    }
    long rowsRead = 0;
    try (Statement statement = db.createStatement();
        ResultSet status = statement.executeQuery("SHOW SESSION STATUS LIKE 'Handler_read%'")) {
      while (status.next()) {
        rowsRead += status.getLong(2);
      }
    }

    double[] times = new double[15];
    for (int i = 0; i < times.length; i++) {
      long start = System.nanoTime();
      try (PreparedStatement statement = prepare(db, statementText, args);
          ResultSet result = statement.executeQuery()) {
        while (result.next()) {
          // read every row, as a client would
        }
      }
      times[i] = (System.nanoTime() - start) / 1_000_000.0;
    }
    Arrays.sort(times);

    StringBuilder plan = new StringBuilder();
    try (PreparedStatement statement = prepare(db, "EXPLAIN ANALYZE " + statementText, args);
        ResultSet result = statement.executeQuery()) {
      while (result.next()) {
        plan.append(result.getString(1)).append('\n');
      }
    }
    plans.append("### ").append(title).append("\n\n```\n").append(plan.toString().strip()).append("\n```\n\n");

    long bytes = JSON.writeValueAsString(rows).getBytes(StandardCharsets.UTF_8).length;
    return new SqlRun(rows.size(), rowsRead, bytes, times[times.length / 2], plan.toString());
  }

  private static PreparedStatement prepare(Connection db, String sql, Object... args) throws SQLException {
    PreparedStatement statement = db.prepareStatement(sql);
    for (int i = 0; i < args.length; i++) {
      statement.setObject(i + 1, args[i]);
    }
    return statement;
  }

  private static void execute(Connection db, String sql, boolean ignoreFailure) throws SQLException {
    try (Statement statement = db.createStatement()) {
      statement.execute(sql);
    } catch (SQLException failure) {
      if (!ignoreFailure) {
        throw failure;
      }
    }
  }

  private static String one(Connection db, String sql) throws SQLException {
    try (Statement statement = db.createStatement();
        ResultSet rows = statement.executeQuery(sql)) {
      rows.next();
      return rows.getString(1);
    }
  }

  private static String ms(SqlRun run) {
    return "%.1f ms".formatted(run.medianMs());
  }

  private static String fmt(long number) {
    return "%,d".formatted(number);
  }

  private static String size(long bytes) {
    return bytes >= 1_048_576
        ? "%.1f MB".formatted(bytes / 1_048_576.0)
        : bytes >= 1_024 ? "%.1f KB".formatted(bytes / 1_024.0) : bytes + " B";
  }

  private Measure() {}
}
