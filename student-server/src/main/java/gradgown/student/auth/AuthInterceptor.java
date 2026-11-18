package gradgown.student.auth;

import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** Turns away requests without a session: 401 {@code unauthenticated}. */
@Component
public class AuthInterceptor implements HandlerInterceptor {

  @Override
  public boolean preHandle(
      HttpServletRequest request, HttpServletResponse response, Object handler) {
    if ("OPTIONS".equals(request.getMethod())) {
      // A preflight carries no cookie and asks for no data.
      return true;
    }
    HttpSession session = request.getSession(false);
    Object user = session == null ? null : session.getAttribute(SessionUser.ATTRIBUTE);
    if (!(user instanceof SessionUser)) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED, "로그인이 필요합니다.");
    }
    request.setAttribute(SessionUser.ATTRIBUTE, user);
    return true;
  }
}
