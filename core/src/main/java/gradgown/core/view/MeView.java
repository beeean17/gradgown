package gradgown.core.view;

/** The signed-in user, as {@code GET /api/me} answers. */
public record MeView(String uid, String email, String role) {}
