package gradgown.core.rule;

/**
 * The St:talk choices. The API uses 0 for "no choice" and 1 to 7 for the options, as the original
 * service does. The database stores "no choice" as NULL, so that the foreign key to the options
 * applies to real choices only.
 */
public final class MentoringOptions {

  /** "No choice" in the API. */
  public static final int NONE = 0;

  public static final int COUNT = 7;

  private MentoringOptions() {}

  /** API value to column value: 0 becomes NULL. */
  public static Integer toColumn(int apiValue) {
    return apiValue == NONE ? null : apiValue;
  }

  /** Column value to API value: NULL becomes 0. */
  public static int fromColumn(Integer columnValue) {
    return columnValue == null ? NONE : columnValue;
  }
}
