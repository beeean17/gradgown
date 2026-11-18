package gradgown.student.web;

import gradgown.core.input.MentoringInput;
import gradgown.core.view.MentoringRegistrationView;
import gradgown.student.auth.SessionUser;
import gradgown.student.service.CommandRunner.Result;
import gradgown.student.service.MentoringService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** St:talk (docs/contracts/web-api.md). The user always comes from the session. */
@RestController
public class MentoringController {

  public record CreateRequest(String operationId, MentoringInput input) {}

  public record UpdateRequest(String operationId, String version, MentoringInput input) {}

  public record CancelRequest(String operationId, String version) {}

  /** The success body of a command, as the original {@code mentoringCommand} answered. */
  public record CommandResponse(
      boolean success, String operationId, String registrationId, String status, boolean replayed) {

    static CommandResponse of(Result result) {
      return new CommandResponse(
          true,
          result.operationId(),
          Long.toString(result.targetId()),
          result.status(),
          result.replayed());
    }
  }

  private final MentoringService service;

  public MentoringController(MentoringService service) {
    this.service = service;
  }

  @GetMapping("/api/mentoring/events/current")
  public ResponseEntity<Object> currentEvent() {
    return Json.orNull(service.currentEvent());
  }

  @GetMapping("/api/mentoring/registrations/me")
  public List<MentoringRegistrationView> myRegistrations(
      @RequestAttribute(SessionUser.ATTRIBUTE) SessionUser user) {
    return service.myRegistrations(user);
  }

  @PostMapping("/api/mentoring/registrations")
  public CommandResponse create(
      @RequestAttribute(SessionUser.ATTRIBUTE) SessionUser user,
      @RequestBody CreateRequest body) {
    return CommandResponse.of(service.create(user, body.operationId(), body.input()));
  }

  @PutMapping("/api/mentoring/registrations/{registrationId}")
  public CommandResponse update(
      @RequestAttribute(SessionUser.ATTRIBUTE) SessionUser user,
      @PathVariable String registrationId,
      @RequestBody UpdateRequest body) {
    return CommandResponse.of(
        service.update(user, registrationId, body.operationId(), body.version(), body.input()));
  }

  @PostMapping("/api/mentoring/registrations/{registrationId}/cancel")
  public CommandResponse cancel(
      @RequestAttribute(SessionUser.ATTRIBUTE) SessionUser user,
      @PathVariable String registrationId,
      @RequestBody CancelRequest body) {
    return CommandResponse.of(
        service.cancel(user, registrationId, body.operationId(), body.version()));
  }
}
