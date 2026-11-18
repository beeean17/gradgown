package gradgown.admin.auth;

import java.io.Serializable;

/** Who is signed in: an admin or a master. Stored in the HTTP session at login. */
public record SessionUser(long id, String email, String role) implements Serializable {

  /** The session attribute and the request attribute that hold the signed-in user. */
  public static final String ATTRIBUTE = "gradgown.user";
}
