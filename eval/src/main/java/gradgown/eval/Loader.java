package gradgown.eval;

import static gradgown.eval.Firestore.bool;
import static gradgown.eval.Firestore.integer;
import static gradgown.eval.Firestore.map;
import static gradgown.eval.Firestore.nothing;
import static gradgown.eval.Firestore.string;
import static gradgown.eval.Firestore.time;

import gradgown.db.MySqlTestDatabase;
import gradgown.db.MySqlTestDatabase.Account;
import gradgown.eval.Dataset.Announcement;
import gradgown.eval.Dataset.AuditLog;
import gradgown.eval.Dataset.Registration;
import gradgown.eval.Dataset.Reservation;
import gradgown.eval.Dataset.User;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Puts one dataset into both stores: into MySQL in this project's schema, and into the emulator
 * in the document structure of the original service (grad42 firebase/docs/data-model.md).
 */
final class Loader {

  private static final LocalDateTime FIRST_SLOT = LocalDateTime.parse("2027-02-15T10:00:00");
  private static final DateTimeFormatter DISPLAY = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  private Loader() {}

  /** Slot {@code n} of the period: six a day, half an hour each, from 10:00. */
  static LocalDateTime slotStart(int n) {
    return FIRST_SLOT.plusDays(n / 6).plusMinutes(30L * (n % 6));
  }

  // --- MySQL ------------------------------------------------------------------

  static void loadMySql(Dataset data) throws SQLException {
    try (Connection db =
        DriverManager.getConnection(
            MySqlTestDatabase.jdbcUrl() + "?rewriteBatchedStatements=true&allowMultiQueries=true",
            Account.ROOT.user,
            Account.ROOT.password)) {
      try (Statement statement = db.createStatement()) {
        statement.execute(
            """
            SET time_zone = '+09:00';
            SET FOREIGN_KEY_CHECKS = 0;
            TRUNCATE TABLE audit_logs; TRUNCATE TABLE announcements; TRUNCATE TABLE faqs;
            TRUNCATE TABLE mentoring_registrations; TRUNCATE TABLE mentoring_options;
            TRUNCATE TABLE mentoring_sessions; TRUNCATE TABLE mentoring_events;
            TRUNCATE TABLE gown_reservations; TRUNCATE TABLE gown_slots;
            TRUNCATE TABLE gown_periods; TRUNCATE TABLE users;
            SET FOREIGN_KEY_CHECKS = 1;
            INSERT INTO gown_periods
              (id, is_open, apply_starts_at, apply_ends_at, edit_starts_at, edit_ends_at, is_current)
            VALUES ('2027-02', TRUE, '2026-11-01 09:00:00', '2027-01-29 18:00:00',
                    '2027-01-30 09:00:00', '2027-02-05 18:00:00', TRUE);
            INSERT INTO mentoring_events
              (id, is_open, apply_starts_at, apply_ends_at, event_date, location, is_current)
            VALUES ('2027-01', TRUE, '2026-11-01 09:00:00', '2027-01-08 18:00:00', '2027-01-13',
                    '중앙도서관 1층 St:art홀', TRUE);
            INSERT INTO mentoring_sessions (event_id, session_no, label, starts_at, ends_at) VALUES
              ('2027-01', 1, '1차시', '2027-01-13 15:00:00', '2027-01-13 15:50:00'),
              ('2027-01', 2, '2차시', '2027-01-13 16:00:00', '2027-01-13 16:50:00');
            """);
        while (statement.getMoreResults() || statement.getUpdateCount() != -1) {
          // drain
        }
      }
      db.setAutoCommit(false);

      batch(db, "INSERT INTO users (id, email, role) VALUES (?, ?, 'student')", data.users, (row, u) -> {
        row.setLong(1, u.id());
        row.setString(2, u.email());
      });
      // The author of the announcements.
      try (Statement statement = db.createStatement()) {
        statement.executeUpdate(
            "INSERT INTO users (id, email, role) VALUES (9000000, 'master@example.com', 'master')");
        for (int n = 0; n < Dataset.SLOTS; n++) {
          statement.executeUpdate(
              "INSERT INTO gown_slots (id, period_id, starts_at, ends_at) VALUES (%d, '2027-02', '%s', '%s')"
                  .formatted(n + 1, slotStart(n), slotStart(n).plusMinutes(30)));
        }
        for (int option = 1; option <= 7; option++) {
          statement.executeUpdate(
              "INSERT INTO mentoring_options (event_id, option_no, name) VALUES ('2027-01', %d, '멘토 %d')"
                  .formatted(option, option));
        }
      }
      batch(
          db,
          """
          INSERT INTO gown_reservations
            (id, user_id, period_id, rent_slot_id, return_slot_id, status, name, student_id,
             department, phone, size, is_proxy, proxy_name, proxy_phone, created_by, created_at, updated_at)
          VALUES (?, ?, '2027-02', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          data.reservations,
          (row, r) -> {
            row.setLong(1, r.id());
            row.setLong(2, r.user().id());
            row.setInt(3, r.rentSlot() + 1);
            row.setInt(4, r.returnSlot() + 1);
            row.setString(5, r.status());
            row.setString(6, r.name());
            row.setString(7, r.studentId());
            row.setString(8, r.department());
            row.setString(9, r.phone());
            row.setString(10, r.size());
            row.setBoolean(11, r.proxy());
            row.setString(12, r.proxy() ? "대리인" : null);
            row.setString(13, r.proxy() ? "010-9999-0000" : null);
            row.setLong(14, r.user().id());
            row.setObject(15, r.createdAt());
            row.setObject(16, r.createdAt());
          });
      batch(
          db,
          """
          INSERT INTO mentoring_registrations
            (id, user_id, event_id, first_option_no, second_option_no, status, name, department,
             student_id, grade, phone, created_by, created_at, updated_at)
          VALUES (?, ?, '2027-01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          data.registrations,
          (row, r) -> {
            row.setLong(1, r.id());
            row.setLong(2, r.user().id());
            row.setObject(3, r.firstOption() == 0 ? null : r.firstOption());
            row.setObject(4, r.secondOption() == 0 ? null : r.secondOption());
            row.setString(5, r.status());
            row.setString(6, r.name());
            row.setString(7, r.department());
            row.setString(8, r.studentId());
            row.setInt(9, r.grade());
            row.setString(10, r.phone());
            row.setLong(11, r.user().id());
            row.setObject(12, r.createdAt());
            row.setObject(13, r.createdAt());
          });
      batch(
          db,
          """
          INSERT INTO audit_logs
            (operation_id, domain, action, actor_id, target_id, outcome, failure_kind, error_code,
             created_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          data.auditLogs,
          (row, a) -> {
            row.setString(1, a.operationId());
            row.setString(2, a.domain());
            row.setString(3, a.action());
            row.setLong(4, a.actor().id());
            row.setObject(5, a.targetId());
            row.setString(6, a.outcome());
            row.setString(7, a.failureKind());
            row.setString(8, a.errorCode());
            row.setObject(9, a.createdAt());
            row.setObject(10, a.createdAt().plusNanos(40_000_000));
          });
      batch(
          db,
          """
          INSERT INTO announcements (id, title, content, category, is_pinned, is_visible, author_id)
          VALUES (?, ?, ?, '일반', ?, ?, 9000000)
          """,
          data.announcements,
          (row, a) -> {
            row.setLong(1, a.id());
            row.setString(2, a.title());
            row.setString(3, a.content());
            row.setBoolean(4, a.pinned());
            row.setBoolean(5, a.visible());
          });
      db.commit();
      db.setAutoCommit(true);
      // Fresh statistics, so the plans are not chosen from an empty table's numbers.
      try (Statement statement = db.createStatement()) {
        statement.execute(
            "ANALYZE TABLE users, gown_reservations, mentoring_registrations, audit_logs, announcements");
      }
    }
  }

  @FunctionalInterface
  private interface Binder<T> {
    void bind(PreparedStatement row, T item) throws SQLException;
  }

  private static <T> void batch(Connection db, String sql, Iterable<T> items, Binder<T> binder)
      throws SQLException {
    try (PreparedStatement statement = db.prepareStatement(sql)) {
      int pending = 0;
      for (T item : items) {
        binder.bind(statement, item);
        statement.addBatch();
        if (++pending == 2_000) {
          statement.executeBatch();
          pending = 0;
        }
      }
      statement.executeBatch();
    }
    db.commit();
  }

  // --- Firestore emulator -------------------------------------------------------

  static long loadFirestore(Dataset data, Firestore firestore) {
    firestore.clear();
    Firestore.Writer writer = firestore.new Writer();
    {
      for (User user : data.users) {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("email", string(user.email()));
        fields.put("role", string("student"));
        fields.put("createdAt", time(LocalDateTime.parse("2026-10-01T00:00:00")));
        fields.put("lastLogin", time(LocalDateTime.parse("2026-11-01T00:00:00")));
        writer.put("users/" + user.uid(), fields);
      }
      for (Reservation r : data.reservations) {
        writer.put("users/" + r.user().uid() + "/gown_reservations/res" + r.id(), reservation(r));
      }
      for (Registration r : data.registrations) {
        writer.put(
            "users/" + r.user().uid() + "/mentoring_registrations/reg" + r.id(), registration(r));
      }
      for (AuditLog a : data.auditLogs) {
        writer.put("adminAuditLogs/" + a.operationId(), auditLog(a));
      }
      writer.put("information/announcements", announcements(data));
    }
    return writer.finish();
  }

  private static Map<String, Object> reservation(Reservation r) {
    LocalDateTime rent = slotStart(r.rentSlot());
    LocalDateTime back = slotStart(r.returnSlot());
    Map<String, Object> f = new LinkedHashMap<>();
    f.put("periodId", string(Dataset.PERIOD));
    f.put("status", string(r.status()));
    f.put("slotId", string(rent.toLocalDate() + "_" + rent.toLocalTime().toString().replace(":", "")));
    f.put("rentTime", time(rent));
    f.put("rentDisplayTime", string(rent.format(DISPLAY)));
    f.put("returnTime", time(back));
    f.put("returnDisplayTime", string(back.format(DISPLAY)));
    f.put("name", string(r.name()));
    f.put("studentId", string(r.studentId()));
    f.put("department", string(r.department()));
    f.put("phone", string(r.phone()));
    f.put("size", string(r.size()));
    f.put("isProxy", bool(r.proxy()));
    f.put("proxyName", r.proxy() ? string("대리인") : nothing());
    f.put("proxyPhone", r.proxy() ? string("010-9999-0000") : nothing());
    f.put("createdBy", string(r.user().uid()));
    f.put("createdAt", time(r.createdAt()));
    f.put("modifiedAt", time(r.createdAt()));
    return f;
  }

  private static Map<String, Object> registration(Registration r) {
    Map<String, Object> f = new LinkedHashMap<>();
    f.put("eventId", string(Dataset.EVENT));
    f.put("status", string(r.status()));
    f.put("firstOption", integer(r.firstOption()));
    f.put("secondOption", integer(r.secondOption()));
    f.put("name", string(r.name()));
    f.put("department", string(r.department()));
    f.put("studentId", string(r.studentId()));
    f.put("grade", integer(r.grade()));
    f.put("phone", string(r.phone()));
    f.put("email", string(r.user().email()));
    f.put("createdBy", string(r.user().uid()));
    f.put("createdAt", time(r.createdAt()));
    f.put("modifiedAt", time(r.createdAt()));
    return f;
  }

  private static Map<String, Object> auditLog(AuditLog a) {
    boolean rejected = a.outcome().equals("rejected");
    Map<String, Object> f = new LinkedHashMap<>();
    f.put("schemaVersion", integer(2));
    f.put("operationId", string(a.operationId()));
    f.put("domain", string(a.domain()));
    f.put("action", string(a.action()));
    f.put("origin", string("student-web"));
    f.put("actorType", string("student"));
    f.put("actorUid", string(a.actor().uid()));
    f.put("appId", nothing());
    f.put("target", a.targetId() == null ? nothing() : string("users/" + a.actor().uid() + "/gown_reservations/res" + a.targetId()));
    f.put("targetUserId", string(a.actor().uid()));
    f.put("reservationId", a.targetId() == null ? nothing() : string("res" + a.targetId()));
    f.put("periodId", string(Dataset.PERIOD));
    f.put("stage", string("completed"));
    f.put("outcome", string(a.outcome()));
    f.put("failureSource", rejected ? string("request") : nothing());
    f.put("failureKind", rejected ? string(a.failureKind()) : nothing());
    f.put("errorCode", rejected ? string(a.errorCode()) : nothing());
    f.put("message", rejected ? string("현재 예약 신청 또는 변경 기간이 아닙니다.") : nothing());
    f.put("retryable", bool(false));
    f.put("resultKnown", bool(true));
    f.put("severity", string(rejected ? "warning" : "info"));
    f.put("createdAt", time(a.createdAt()));
    f.put("updatedAt", time(a.createdAt()));
    f.put("completedAt", time(a.createdAt()));
    f.put("durationMs", integer(40));
    f.put("resolvedAt", nothing());
    f.put("resolvedByUid", nothing());
    f.put("resolutionNote", nothing());
    return f;
  }

  /** One document that holds every announcement as a map entry, hidden ones included. */
  private static Map<String, Object> announcements(Dataset data) {
    Map<String, Object> f = new LinkedHashMap<>();
    f.put(
        "metadata",
        map(Map.of("schemaVersion", integer(1), "lastUpdated", time(LocalDateTime.parse("2026-11-01T00:00:00")))));
    for (Announcement a : data.announcements) {
      Map<String, Object> entry = new LinkedHashMap<>();
      entry.put("title", string(a.title()));
      entry.put("content", string(a.content()));
      entry.put("category", string("일반"));
      entry.put("isPinned", bool(a.pinned()));
      entry.put("isVisible", bool(a.visible()));
      entry.put("isPopup", bool(false));
      entry.put("popupOrder", nothing());
      entry.put("showOnToggle", bool(false));
      entry.put("createdAt", time(LocalDateTime.parse("2026-11-01T00:00:00").plusHours(a.id())));
      entry.put("updatedAt", time(LocalDateTime.parse("2026-11-01T00:00:00").plusHours(a.id())));
      entry.put("authorId", string("master"));
      f.put("a" + a.id(), map(entry));
    }
    return f;
  }
}
