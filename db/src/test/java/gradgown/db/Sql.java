package gradgown.db;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/** Small JDBC helpers so that each test reads as the SQL it runs and the result it expects. */
final class Sql {

  /** MySQL error numbers the tests expect. The server reports them as the JDBC vendor code. */
  static final class ErrorCode {
    /** ER_DUP_ENTRY: a PRIMARY KEY or UNIQUE key already holds the value. */
    static final int DUPLICATE_KEY = 1062;

    /** ER_CHECK_CONSTRAINT_VIOLATED. */
    static final int CHECK_VIOLATED = 3819;

    /** ER_NO_REFERENCED_ROW_2: the row a foreign key points at does not exist. */
    static final int NO_REFERENCED_ROW = 1452;

    /** ER_ROW_IS_REFERENCED_2: a foreign key still points at the row being removed. */
    static final int ROW_IS_REFERENCED = 1451;

    /** WARN_DATA_TRUNCATED: in strict mode, a value that is not a member of the ENUM. */
    static final int NOT_AN_ENUM_VALUE = 1265;

    /** ER_TABLEACCESS_DENIED_ERROR: the account lacks the privilege on the table. */
    static final int TABLE_ACCESS_DENIED = 1142;

    /** ER_COLUMNACCESS_DENIED_ERROR: the account lacks the privilege on the column. */
    static final int COLUMN_ACCESS_DENIED = 1143;

    private ErrorCode() {}
  }

  @FunctionalInterface
  interface Action {
    void run() throws SQLException;
  }

  private Sql() {}

  /** Runs an INSERT, UPDATE, DELETE or DDL statement and returns the number of affected rows. */
  static int update(Connection db, String sql, Object... args) throws SQLException {
    try (PreparedStatement statement = prepare(db, sql, args)) {
      return statement.executeUpdate();
    }
  }

  /** Runs a query that returns one number, for example {@code SELECT COUNT(*)}. */
  static long number(Connection db, String sql, Object... args) throws SQLException {
    try (PreparedStatement statement = prepare(db, sql, args);
        ResultSet rows = statement.executeQuery()) {
      rows.next();
      return rows.getLong(1);
    }
  }

  /** Runs a query and returns its first column as text. */
  static List<String> strings(Connection db, String sql, Object... args) throws SQLException {
    try (PreparedStatement statement = prepare(db, sql, args);
        ResultSet rows = statement.executeQuery()) {
      List<String> values = new ArrayList<>();
      while (rows.next()) {
        values.add(rows.getString(1));
      }
      return values;
    }
  }

  /** Asserts that MySQL rejects the action with the given error number. */
  static void assertRejected(int expectedError, Action action) {
    SQLException rejection = assertThrows(SQLException.class, action::run);
    assertEquals(expectedError, rejection.getErrorCode(), rejection.getMessage());
  }

  private static PreparedStatement prepare(Connection db, String sql, Object... args)
      throws SQLException {
    PreparedStatement statement = db.prepareStatement(sql);
    for (int i = 0; i < args.length; i++) {
      statement.setObject(i + 1, args[i]);
    }
    return statement;
  }
}
