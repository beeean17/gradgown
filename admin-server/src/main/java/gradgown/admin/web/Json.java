package gradgown.admin.web;

import java.util.Optional;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** Helpers for response bodies. */
final class Json {

  private Json() {}

  /** The value as JSON, or the JSON literal {@code null} when there is none. */
  static ResponseEntity<Object> orNull(Optional<?> value) {
    Object body = value.isPresent() ? value.get() : "null";
    return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
  }
}
