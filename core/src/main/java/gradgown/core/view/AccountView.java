package gradgown.core.view;

/** A seeded account shown on the test login screen (docs/decisions/test-login.md). */
public record AccountView(String email, String role) {}
