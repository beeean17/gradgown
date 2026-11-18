package gradgown.admin.web;

import gradgown.admin.repository.MentoringAdminRepository;
import gradgown.admin.repository.MentoringAdminRepository.EventView;
import gradgown.admin.repository.MentoringAdminRepository.OptionCount;
import gradgown.admin.repository.MentoringAdminRepository.RegistrationRow;
import gradgown.admin.repository.Page;
import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import gradgown.core.input.Check;
import gradgown.core.rule.MentoringOptions;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** St:talk for the admin app (docs/contracts/web-api.md, "관리자 API"). */
@RestController
public class MentoringAdminController {

  /** {@code isOpen} is an Object so that only a JSON boolean passes; "true" and 1 do not. */
  public record OpenRequest(Object isOpen) {}

  private final MentoringAdminRepository mentoring;
  private final TransactionTemplate transaction;

  public MentoringAdminController(
      MentoringAdminRepository mentoring, TransactionTemplate transaction) {
    this.mentoring = mentoring;
    this.transaction = transaction;
  }

  @GetMapping("/api/admin/mentoring/events")
  public List<EventView> events() {
    return mentoring.findEvents();
  }

  @GetMapping("/api/admin/mentoring/events/current")
  public ResponseEntity<Object> currentEvent() {
    return Json.orNull(mentoring.findCurrentEvent());
  }

  /** {@code eventId} defaults to the current event. */
  @GetMapping("/api/admin/mentoring/registrations")
  public List<RegistrationRow> registrations(
      @RequestParam(required = false) String eventId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) Integer first,
      @RequestParam(required = false) Integer second) {
    return mentoring.findRegistrations(
        eventOrCurrent(eventId), Page.likePattern(q), Page.filter(status), first, second);
  }

  /** {@code eventId} defaults to the current event. */
  @GetMapping("/api/admin/mentoring/counts")
  public List<OptionCount> counts(@RequestParam(required = false) String eventId) {
    return mentoring.countByOption(eventOrCurrent(eventId));
  }

  /**
   * Switches the applications of an event on or off.
   *
   * <p>There is no role check here: an admin's UPDATE is refused by MySQL (403). The UPDATE comes
   * first so that the refusal does too, and the rule below undoes it by rolling back.
   *
   * <p>MNT-51: applications can open only when all seven options have a name.
   */
  @PutMapping("/api/admin/mentoring/events/{eventId}/open")
  public Map<String, Object> setOpen(@PathVariable String eventId, @RequestBody OpenRequest body) {
    if (!(body.isOpen() instanceof Boolean open)) {
      throw Check.invalid("isOpen 값을 확인해 주세요.");
    }
    transaction.executeWithoutResult(
        status -> {
          if (mentoring.setOpen(eventId, open) == 0 && !mentoring.exists(eventId)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "행사를 찾을 수 없습니다.");
          }
          if (open && mentoring.findOptionNames(eventId).stream().anyMatch(String::isBlank)) {
            throw new ApiException(
                ErrorCode.FAILED_PRECONDITION,
                "선택지 " + MentoringOptions.COUNT + "개의 이름을 모두 채워야 접수를 열 수 있습니다.");
          }
        });
    return Map.of("success", true, "eventId", eventId, "isOpen", open);
  }

  private String eventOrCurrent(String eventId) {
    String event = Page.filter(eventId);
    return event != null
        ? event
        : mentoring.findCurrentEvent().map(EventView::eventId).orElse("");
  }
}
