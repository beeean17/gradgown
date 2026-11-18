package gradgown.admin.repository;

import java.util.List;
import java.util.function.Function;

/**
 * One page of a list. {@code nextCursor} goes back as {@code cursor} to get the next page, and is
 * null on the last page.
 */
public record Page<T>(List<T> items, String nextCursor) {

  public static final int DEFAULT_SIZE = 50;
  public static final int MAX_SIZE = 200;

  /** The page size to use for a requested {@code limit}. */
  public static int size(Integer requested) {
    if (requested == null) {
      return DEFAULT_SIZE;
    }
    return Math.max(1, Math.min(MAX_SIZE, requested));
  }

  /**
   * Builds a page from rows that were read with {@code LIMIT size + 1}: the extra row only tells
   * that there is a next page.
   */
  public static <T> Page<T> of(List<T> rows, int size, Function<T, String> cursorOf) {
    if (rows.size() <= size) {
      return new Page<>(rows, null);
    }
    List<T> items = rows.subList(0, size);
    return new Page<>(List.copyOf(items), cursorOf.apply(items.get(size - 1)));
  }

  /** Turns a search word into a LIKE pattern that matches it anywhere, or null for no search. */
  public static String likePattern(String query) {
    if (query == null || query.isBlank()) {
      return null;
    }
    String escaped = query.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    return "%" + escaped + "%";
  }

  /** An empty or blank filter value means "no filter". */
  public static String filter(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }
}
