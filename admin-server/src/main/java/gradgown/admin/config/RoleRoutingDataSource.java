package gradgown.admin.config;

import gradgown.admin.auth.CurrentRole;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

/**
 * Hands out connections of the database account that matches the signed-in user's role: the
 * master account for a master, the read-only admin account for everyone else, including requests
 * made before login.
 *
 * <p>This is where the role boundary is drawn. Nothing above this class asks "is this user a
 * master?" before a write. An admin's write reaches MySQL as gradgown_admin and MySQL rejects it
 * with error 1142 (docs/decisions/admin-server-split.md).
 */
public final class RoleRoutingDataSource extends AbstractRoutingDataSource {

  private static final String ADMIN = "admin";
  private static final String MASTER = "master";

  public RoleRoutingDataSource(DataSource adminAccount, DataSource masterAccount) {
    super.setTargetDataSources(Map.<Object, Object>of(ADMIN, adminAccount, MASTER, masterAccount));
    super.setDefaultTargetDataSource(adminAccount);
  }

  @Override
  protected Object determineCurrentLookupKey() {
    return MASTER.equals(CurrentRole.get()) ? MASTER : ADMIN;
  }
}
