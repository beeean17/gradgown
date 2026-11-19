package gradgown.eval;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Synthetic data for the measurements: the same people, reservations, registrations, audit log
 * rows and announcements, loaded into both stores. Everything is made up and generated from a
 * fixed seed, so two runs produce the same data.
 */
final class Dataset {

  /** How much data. {@code actual} is near the service's real size; {@code x100} is 100 times it. */
  record Scale(String name, int reservations, int registrations, int auditLogs, int announcements) {
    static final Scale ACTUAL = new Scale("actual", 1_000, 300, 5_000, 30);
    static final Scale X100 = new Scale("x100", 100_000, 30_000, 500_000, 300);
  }

  record User(long id, String uid, String email) {}

  record Reservation(
      long id,
      User user,
      String status,
      String name,
      String studentId,
      String department,
      String phone,
      String size,
      boolean proxy,
      int rentSlot,
      int returnSlot,
      LocalDateTime createdAt) {}

  record Registration(
      long id,
      User user,
      String status,
      int firstOption,
      int secondOption,
      String name,
      String department,
      String studentId,
      int grade,
      String phone,
      LocalDateTime createdAt) {}

  record AuditLog(
      String operationId,
      String domain,
      String action,
      User actor,
      Long targetId,
      String outcome,
      String failureKind,
      String errorCode,
      LocalDateTime createdAt) {}

  record Announcement(long id, String title, String content, boolean pinned, boolean visible) {}

  static final String PERIOD = "2027-02";
  static final String EVENT = "2027-01";
  static final int SLOTS = 12;

  /** The person the search measurement looks for. No generated name can equal it. */
  static final String TARGET_NAME = "측정대상";

  private static final String[] FAMILY = {"가", "나", "다", "라", "마", "바", "사", "아", "자", "차"};
  private static final String[] GIVEN = {
    "가람", "나래", "다온", "라온", "마루", "바다", "새벽", "아름", "자람", "초롱", "하늘", "한결", "보람", "슬기"
  };
  private static final String[] DEPARTMENTS = {
    "화학공학과", "전자공학과", "기계공학과", "건축학부", "컴퓨터공학과", "산업공학과", "신소재공학과"
  };

  final Scale scale;
  final List<User> users = new ArrayList<>();
  final List<Reservation> reservations = new ArrayList<>();
  final List<Registration> registrations = new ArrayList<>();
  final List<AuditLog> auditLogs = new ArrayList<>();
  final List<Announcement> announcements = new ArrayList<>();

  /** The reservation in the middle of the period by creation time: the one to search for. */
  final Reservation searchTarget;

  /** A rejected command older than the newest 200 audit log rows. */
  final AuditLog oldRejected;

  Dataset(Scale scale) {
    this.scale = scale;
    Random random = new Random(20261119);
    LocalDateTime start = LocalDateTime.parse("2026-11-01T09:00:00");

    int people = Math.max(scale.reservations(), scale.registrations());
    for (int i = 1; i <= people; i++) {
      users.add(new User(i, "uid%07d".formatted(i), "synthetic%07d@example.com".formatted(i)));
    }

    // One reservation per student, created one after another. Every tenth one is cancelled.
    int targetIndex = scale.reservations() / 2;
    for (int i = 0; i < scale.reservations(); i++) {
      User user = users.get(i);
      int rent = random.nextInt(SLOTS / 2);
      reservations.add(
          new Reservation(
              i + 1,
              user,
              i % 10 == 9 ? "cancelled" : "reserved",
              i == targetIndex ? TARGET_NAME : name(random),
              "%08d".formatted(10_000_000 + i),
              DEPARTMENTS[random.nextInt(DEPARTMENTS.length)],
              "010-%04d-%04d".formatted(i / 10_000, i % 10_000),
              new String[] {"s", "m", "l"}[random.nextInt(3)],
              i % 20 == 0,
              rent,
              rent + SLOTS / 2,
              start.plusSeconds(30L * i)));
    }
    searchTarget = reservations.get(targetIndex);

    for (int i = 0; i < scale.registrations(); i++) {
      User user = users.get(i);
      int first = random.nextInt(8);
      int second = random.nextInt(8);
      while (second == first) {
        second = random.nextInt(8);
      }
      registrations.add(
          new Registration(
              i + 1,
              user,
              i % 10 == 9 ? "cancelled" : "reserved",
              first,
              second,
              name(random),
              DEPARTMENTS[random.nextInt(DEPARTMENTS.length)],
              "%08d".formatted(10_000_000 + i),
              1 + random.nextInt(4),
              "010-%04d-%04d".formatted(i / 10_000, i % 10_000),
              start.plusSeconds(60L * i)));
    }

    // Audit log: one row per command, a fifth of them rejected.
    AuditLog chosen = null;
    for (int i = 0; i < scale.auditLogs(); i++) {
      boolean rejected = i % 5 == 4;
      boolean mentoring = i % 3 == 0;
      AuditLog row =
          new AuditLog(
              "eval-operation-%09d".formatted(i),
              mentoring ? "mentoring" : "reservation",
              (mentoring ? "mentoring." : "reservation.") + (i % 2 == 0 ? "create" : "update"),
              users.get(random.nextInt(users.size())),
              rejected ? null : (long) (1 + random.nextInt(scale.reservations())),
              rejected ? "rejected" : "succeeded",
              rejected ? "business-rule" : null,
              rejected ? "failed-precondition" : null,
              start.plusNanos(7_000_000L * 1_000 * i / 10));
      auditLogs.add(row);
      // Old enough to be outside the newest 200, whatever the scale.
      if (rejected && chosen == null && i >= scale.auditLogs() / 2) {
        chosen = row;
      }
    }
    oldRejected = chosen;

    // Announcements: every sixth one is hidden.
    for (int i = 1; i <= scale.announcements(); i++) {
      announcements.add(
          new Announcement(
              i,
              "공지 " + i + ": 학위복 대여와 St:talk 안내",
              ("합성 공지 본문입니다. 대여 기간과 반납 장소, 준비물, 문의 방법을 안내합니다. ").repeat(6),
              i % 10 == 1,
              i % 6 != 0));
    }
  }

  private static String name(Random random) {
    return FAMILY[random.nextInt(FAMILY.length)] + GIVEN[random.nextInt(GIVEN.length)];
  }
}
