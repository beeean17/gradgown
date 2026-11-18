package gradgown.student.auth;

import java.io.Serializable;

/**
 * Who is signed in. Stored in the HTTP session at login and handed to controllers as a request
 * attribute. Every query on reservations or registrations takes {@link #id()} from here, never
 * from the request.
 */
public record SessionUser(long id, String email, String role) implements Serializable {

  /** The session attribute and the request attribute that hold the signed-in user. */
  public static final String ATTRIBUTE = "gradgown.user";
}
