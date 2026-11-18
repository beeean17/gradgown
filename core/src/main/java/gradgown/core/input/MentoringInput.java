package gradgown.core.input;

import gradgown.core.rule.MentoringOptions;
import java.util.regex.Pattern;

/**
 * The {@code input} of a St:talk registration command, as the web sends it. The fields and their
 * rules are those of the original {@code MentoringInput} (grad42
 * docs/contracts/mentoring-command.md).
 */
public record MentoringInput(
    String name,
    String department,
    String studentId,
    Integer grade,
    String phone,
    Integer firstOption,
    Integer secondOption) {

  private static final Pattern STUDENT_ID = Pattern.compile("[0-9]{8}");

  /** The input after the format checks. The options are still API values: 0 is "no choice". */
  public record Valid(
      String name,
      String department,
      String studentId,
      int grade,
      String phone,
      int firstOption,
      int secondOption) {}

  /**
   * Checks the formats and the selection rule (MNT-25).
   *
   * @throws gradgown.core.error.ApiException {@code invalid-argument}
   */
  public Valid validate() {
    String validStudentId = studentId == null ? "" : studentId.strip();
    if (!STUDENT_ID.matcher(validStudentId).matches()) {
      throw Check.invalid("학번은 숫자 8자리로 입력해 주세요.");
    }
    if (grade == null || grade < 1 || grade > 4) {
      throw Check.invalid("학년을 확인해 주세요.");
    }
    int first = option(firstOption);
    int second = option(secondOption);
    // The schema holds the same two rules as CHECK constraints. Checking here gives the
    // student a message instead of a constraint error.
    if (first == MentoringOptions.NONE && second == MentoringOptions.NONE) {
      throw Check.invalid("한 차시 이상 선택해 주세요.");
    }
    if (first == second) {
      throw Check.invalid("같은 선택지를 두 차시에 고를 수 없습니다.");
    }
    return new Valid(
        Check.text(name, 1, 30, "이름"),
        Check.text(department, 1, 30, "학과"),
        validStudentId,
        grade,
        Check.phone(phone, "전화번호"),
        first,
        second);
  }

  private static int option(Integer value) {
    if (value == null || value < MentoringOptions.NONE || value > MentoringOptions.COUNT) {
      throw Check.invalid("선택지를 확인해 주세요.");
    }
    return value;
  }
}
