package gradgown.admin.auth;

/**
 * The role of the user whose request the current thread is handling. The data source reads it to
 * pick the database account ({@link gradgown.admin.config.RoleRoutingDataSource}).
 */
public final class CurrentRole {

  private static final ThreadLocal<String> ROLE = new ThreadLocal<>();

  private CurrentRole() {}

  public static void set(String role) {
    ROLE.set(role);
  }

  /** The role, or {@code null} when no one is signed in. */
  public static String get() {
    return ROLE.get();
  }

  public static void clear() {
    ROLE.remove();
  }
}
