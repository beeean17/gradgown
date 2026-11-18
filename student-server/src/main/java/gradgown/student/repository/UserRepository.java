package gradgown.student.repository;

import gradgown.core.view.AccountView;
import gradgown.student.auth.SessionUser;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

  private final JdbcClient jdbc;

  public UserRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** The accounts the test login screen offers on this server: students only. */
  public List<AccountView> findStudentAccounts() {
    return jdbc.sql("SELECT email, role FROM users WHERE role = 'student' ORDER BY id")
        .query((row, n) -> new AccountView(row.getString("email"), row.getString("role")))
        .list();
  }

  public Optional<SessionUser> findByEmail(String email) {
    return jdbc.sql("SELECT id, email, role FROM users WHERE email = ?")
        .param(email)
        .query(
            (row, n) ->
                new SessionUser(row.getLong("id"), row.getString("email"), row.getString("role")))
        .optional();
  }

  /** The only column of users the student account may update. */
  public void touchLastLogin(long userId) {
    jdbc.sql("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?")
        .param(userId)
        .update();
  }
}
