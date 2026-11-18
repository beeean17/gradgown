package gradgown.core.test;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

/**
 * One browser talking to a server under test: real HTTP, with its own cookie jar, so a test can
 * sign in as one user and stay signed in. Two clients are two users.
 */
public final class HttpTestClient {

  /** A response: the HTTP status and the body as text. */
  public record Response(int status, String body) {}

  private final HttpClient http;
  private final String baseUrl;

  public HttpTestClient(int port) {
    this.http =
        HttpClient.newBuilder()
            .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
            .build();
    this.baseUrl = "http://127.0.0.1:" + port;
  }

  public Response get(String path) {
    return send(HttpRequest.newBuilder(URI.create(baseUrl + path)).GET());
  }

  public Response post(String path, String json) {
    return send(json(path).POST(body(json)));
  }

  /** A GET that says which media type it accepts, for example {@code text/plain}. */
  public Response getAccepting(String path, String accept) {
    return send(HttpRequest.newBuilder(URI.create(baseUrl + path)).header("Accept", accept).GET());
  }

  /** A PUT that says which media type it accepts. */
  public Response putAccepting(String path, String json, String accept) {
    return send(json(path).header("Accept", accept).PUT(body(json)));
  }

  /** A CORS preflight, as a browser on another origin sends before a POST. No cookie. */
  public Response preflight(String path) {
    try {
      HttpResponse<String> response =
          HttpClient.newHttpClient()
              .send(
                  HttpRequest.newBuilder(URI.create(baseUrl + path))
                      .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                      .header("Origin", "http://localhost:5173")
                      .header("Access-Control-Request-Method", "POST")
                      .build(),
                  HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      return new Response(response.statusCode(), response.body());
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(e);
    }
  }

  /** A POST whose body is not declared as JSON. */
  public Response post(String path, String body, String contentType) {
    return send(
        HttpRequest.newBuilder(URI.create(baseUrl + path))
            .header("Content-Type", contentType)
            .POST(body(body)));
  }

  public Response put(String path, String json) {
    return send(json(path).PUT(body(json)));
  }

  private HttpRequest.Builder json(String path) {
    return HttpRequest.newBuilder(URI.create(baseUrl + path))
        .header("Content-Type", "application/json");
  }

  private static HttpRequest.BodyPublisher body(String json) {
    return HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8);
  }

  private Response send(HttpRequest.Builder request) {
    try {
      HttpResponse<String> response =
          http.send(request.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      return new Response(response.statusCode(), response.body());
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(e);
    }
  }
}
