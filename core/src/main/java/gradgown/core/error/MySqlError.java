package gradgown.core.error;

import java.sql.SQLException;

/**
 * MySQL error numbers the servers react to. The schema and the grants enforce rules by raising
 * these, and the servers turn them into API errors.
 */
public final class MySqlError {

  /** ER_DUP_ENTRY: a PRIMARY KEY or UNIQUE key already holds the value. */
  public static final int DUPLICATE_KEY = 1062;

  /** ER_TABLEACCESS_DENIED_ERROR: the account lacks the privilege on the table. */
  public static final int TABLE_ACCESS_DENIED = 1142;

  /** ER_COLUMNACCESS_DENIED_ERROR: the account lacks the privilege on the column. */
  public static final int COLUMN_ACCESS_DENIED = 1143;

  /** ER_LOCK_WAIT_TIMEOUT. */
  public static final int LOCK_WAIT_TIMEOUT = 1205;

  /** ER_LOCK_DEADLOCK. */
  public static final int DEADLOCK = 1213;

  private MySqlError() {}

  /** The MySQL error number behind an exception, or 0 when there is none. */
  public static int numberOf(Throwable failure) {
    for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
      if (cause instanceof SQLException sql && sql.getErrorCode() != 0) {
        return sql.getErrorCode();
      }
      if (cause.getCause() == cause) {
        break;
      }
    }
    return 0;
  }

  public static boolean is(Throwable failure, int number) {
    return numberOf(failure) == number;
  }

  /** True when MySQL refused the statement because the account lacks a privilege. */
  public static boolean isAccessDenied(Throwable failure) {
    int number = numberOf(failure);
    return number == TABLE_ACCESS_DENIED || number == COLUMN_ACCESS_DENIED;
  }

  /** True when a concurrent transaction got in the way and the request may be sent again. */
  public static boolean isLockConflict(Throwable failure) {
    int number = numberOf(failure);
    return number == DEADLOCK || number == LOCK_WAIT_TIMEOUT;
  }
}
