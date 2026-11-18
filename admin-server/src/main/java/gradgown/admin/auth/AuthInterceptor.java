package gradgown.admin.auth;

import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Turns away requests without a session (401), and tells the data source whose request this is.
 *
 * <p>It does not check what the user may do. An admin's write goes to MySQL on the read-only
 * account, and MySQL refuses it.
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

  @Override
  public boolean preHandle(
      HttpServletRequest request, HttpServletResponse response, Object handler) {
    HttpSession session = request.getSession(false);
    Object attribute = session == null ? null : session.getAttribute(SessionUser.ATTRIBUTE);
    if (!(attribute instanceof SessionUser user)) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED, "로그인이 필요합니다.");
    }
    request.setAttribute(SessionUser.ATTRIBUTE, user);
    CurrentRole.set(user.role());
    return true;
  }

  @Override
  public void afterCompletion(
      HttpServletRequest request, HttpServletResponse response, Object handler, Exception failure) {
    // Request threads are reused. The next request must not inherit this one's role.
    CurrentRole.clear();
  }
}
