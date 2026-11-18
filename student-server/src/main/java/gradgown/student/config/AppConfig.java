package gradgown.student.config;

import gradgown.core.time.SeoulTime;
import gradgown.student.auth.AuthInterceptor;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AppConfig implements WebMvcConfigurer {

  private final AuthInterceptor authInterceptor;

  public AppConfig(AuthInterceptor authInterceptor) {
    this.authInterceptor = authInterceptor;
  }

  /** The time the window rules see. Tests replace it with a clock they can set. */
  @Bean
  Clock clock() {
    return Clock.system(SeoulTime.ZONE);
  }

  @Bean
  TransactionTemplate transactionTemplate(PlatformTransactionManager transactionManager) {
    return new TransactionTemplate(transactionManager);
  }

  /**
   * The schedule and the announcements are public, as in the original service. Everything about
   * "my" data needs a session.
   */
  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry
        .addInterceptor(authInterceptor)
        .addPathPatterns("/api/me", "/api/gown/reservations/**", "/api/mentoring/registrations/**");
  }
}
