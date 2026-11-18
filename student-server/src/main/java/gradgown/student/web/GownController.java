package gradgown.student.web;

import gradgown.core.input.ReservationInput;
import gradgown.core.view.ReservationView;
import gradgown.student.auth.SessionUser;
import gradgown.student.service.CommandRunner.Result;
import gradgown.student.service.ReservationService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Gown rental (docs/contracts/web-api.md). The user always comes from the session. */
@RestController
public class GownController {

  public record CreateRequest(String operationId, ReservationInput input) {}

  public record UpdateRequest(String operationId, String version, ReservationInput input) {}

  public record CancelRequest(String operationId, String version) {}

  /** The success body of a command, as the original {@code reservationCommand} answered. */
  public record CommandResponse(
      boolean success, String operationId, String reservationId, String status, boolean replayed) {

    static CommandResponse of(Result result) {
      return new CommandResponse(
          true,
          result.operationId(),
          Long.toString(result.targetId()),
          result.status(),
          result.replayed());
    }
  }

  private final ReservationService service;

  public GownController(ReservationService service) {
    this.service = service;
  }

  @GetMapping("/api/gown/periods/current")
  public ResponseEntity<Object> currentPeriod() {
    return Json.orNull(service.currentPeriod());
  }

  @GetMapping("/api/gown/reservations/me")
  public List<ReservationView> myReservations(
      @RequestAttribute(SessionUser.ATTRIBUTE) SessionUser user,
      @RequestParam(required = false) String periodId) {
    return service.myReservations(user, periodId);
  }

  @PostMapping("/api/gown/reservations")
  public CommandResponse create(
      @RequestAttribute(SessionUser.ATTRIBUTE) SessionUser user,
      @RequestBody CreateRequest body) {
    return CommandResponse.of(service.create(user, body.operationId(), body.input()));
  }

  @PutMapping("/api/gown/reservations/{reservationId}")
  public CommandResponse update(
      @RequestAttribute(SessionUser.ATTRIBUTE) SessionUser user,
      @PathVariable String reservationId,
      @RequestBody UpdateRequest body) {
    return CommandResponse.of(
        service.update(user, reservationId, body.operationId(), body.version(), body.input()));
  }

  @PostMapping("/api/gown/reservations/{reservationId}/cancel")
  public CommandResponse cancel(
      @RequestAttribute(SessionUser.ATTRIBUTE) SessionUser user,
      @PathVariable String reservationId,
      @RequestBody CancelRequest body) {
    return CommandResponse.of(
        service.cancel(user, reservationId, body.operationId(), body.version()));
  }
}
