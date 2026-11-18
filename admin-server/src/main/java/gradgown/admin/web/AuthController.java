package gradgown.admin.web;

import gradgown.admin.auth.SessionUser;
import gradgown.admin.repository.UserRepository;
import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import gradgown.core.view.AccountView;
import gradgown.core.view.MeView;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test login (docs/decisions/test-login.md): the login screen lists the seeded admin and master
 * accounts and signs in as the one picked. There is no password.
 */
@RestController
public class AuthController {

  public record LoginRequest(String email) {}

  private final UserRepository users;

  public AuthController(UserRepository users) {
    this.users = users;
  }

  @GetMapping("/api/auth/accounts")
  public List<AccountView> accounts() {
    return users.findStaffAccounts();
  }

  @PostMapping("/api/auth/login")
  public MeView login(@RequestBody LoginRequest body, HttpServletRequest request) {
    if (body.email() == null || body.email().isBlank()) {
      throw new ApiException(ErrorCode.INVALID_ARGUMENT, "계정을 골라 주세요.");
    }
    SessionUser user =
        users
            .findByEmail(body.email().strip())
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "없는 계정입니다."));
    // Which server an account may sign in to is checked here, in code. What the account may do
    // after that is decided by the database account its requests run on.
    if (!user.role().equals("admin") && !user.role().equals("master")) {
      throw new ApiException(ErrorCode.PERMISSION_DENIED, "관리자 계정만 로그인할 수 있습니다.");
    }

    HttpSession old = request.getSession(false);
    if (old != null) {
      old.invalidate();
    }
    request.getSession(true).setAttribute(SessionUser.ATTRIBUTE, user);
    return me(user);
  }

  @PostMapping("/api/auth/logout")
  public Map<String, Boolean> logout(HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    if (session != null) {
      session.invalidate();
    }
    return Map.of("success", true);
  }

  @GetMapping("/api/me")
  public MeView me(@RequestAttribute(SessionUser.ATTRIBUTE) SessionUser user) {
    return new MeView(Long.toString(user.id()), user.email(), user.role());
  }
}
