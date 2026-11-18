package gradgown.admin.config;

import com.zaxxer.hikari.HikariDataSource;
import gradgown.admin.auth.AuthInterceptor;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.servlet.config.annotation.ContentNegotiationConfigurer;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AppConfig implements WebMvcConfigurer {

  private final AuthInterceptor authInterceptor;

  public AppConfig(AuthInterceptor authInterceptor) {
    this.authInterceptor = authInterceptor;
  }

  /** The pool of the read-only admin account. */
  @Bean(destroyMethod = "close")
  HikariDataSource adminAccountPool(
      @Value("${gradgown.datasource.url}") String url,
      @Value("${gradgown.datasource.admin.username}") String username,
      @Value("${gradgown.datasource.admin.password}") String password) {
    return pool("admin-account", url, username, password);
  }

  /** The pool of the master account. */
  @Bean(destroyMethod = "close")
  HikariDataSource masterAccountPool(
      @Value("${gradgown.datasource.url}") String url,
      @Value("${gradgown.datasource.master.username}") String username,
      @Value("${gradgown.datasource.master.password}") String password) {
    return pool("master-account", url, username, password);
  }

  /** The data source the repositories use: one of the two pools, chosen for each request. */
  @Bean
  @Primary
  DataSource dataSource(HikariDataSource adminAccountPool, HikariDataSource masterAccountPool) {
    return new RoleRoutingDataSource(adminAccountPool, masterAccountPool);
  }

  @Bean
  TransactionTemplate transactionTemplate(PlatformTransactionManager transactionManager) {
    return new TransactionTemplate(transactionManager);
  }

  /** Everything except the login endpoints needs a session. */
  /**
   * Every response is JSON, whatever the request says it accepts. With negotiation on, a request
   * that did not accept JSON had its command carried out and was then told 400.
   */
  @Override
  public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
    configurer.ignoreAcceptHeader(true).defaultContentType(MediaType.APPLICATION_JSON);
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(authInterceptor).addPathPatterns("/api/me", "/api/admin/**");
  }

  private static HikariDataSource pool(String name, String url, String username, String password) {
    HikariDataSource pool = new HikariDataSource();
    pool.setPoolName(name);
    pool.setJdbcUrl(url);
    pool.setUsername(username);
    pool.setPassword(password);
    return pool;
  }
}
