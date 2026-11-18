package gradgown.admin.repository;

import gradgown.admin.auth.SessionUser;
import gradgown.core.view.AccountView;
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

  /** The accounts the test login screen offers on this server: admins and masters. */
  public List<AccountView> findStaffAccounts() {
    return jdbc.sql("SELECT email, role FROM users WHERE role IN ('admin', 'master') ORDER BY id")
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
}
