package gradgown.admin.web;

import gradgown.admin.repository.GownAdminRepository;
import gradgown.admin.repository.GownAdminRepository.PeriodView;
import gradgown.admin.repository.GownAdminRepository.ReservationRow;
import gradgown.admin.repository.Page;
import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import gradgown.core.input.Check;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Gown rental for the admin app (docs/contracts/web-api.md, "관리자 API"). */
@RestController
public class GownAdminController {

  public record OpenRequest(Boolean isOpen) {}

  private final GownAdminRepository gown;

  public GownAdminController(GownAdminRepository gown) {
    this.gown = gown;
  }

  @GetMapping("/api/admin/gown/periods")
  public List<PeriodView> periods() {
    return gown.findPeriods();
  }

  @GetMapping("/api/admin/gown/periods/current")
  public ResponseEntity<Object> currentPeriod() {
    return Json.orNull(gown.findCurrentPeriod());
  }

  /** {@code periodId} defaults to the current period. */
  @GetMapping("/api/admin/gown/reservations")
  public Page<ReservationRow> reservations(
      @RequestParam(required = false) String periodId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String cursor,
      @RequestParam(required = false) Integer limit) {
    String period = Page.filter(periodId);
    if (period == null) {
      period = gown.findCurrentPeriod().map(PeriodView::periodId).orElse("");
    }
    return gown.findReservations(
        period, Page.likePattern(q), Page.filter(status), cursorId(cursor), Page.size(limit));
  }

  /**
   * Switches the applications of a period on or off.
   *
   * <p>There is no role check here. For an admin this UPDATE runs on the read-only account, MySQL
   * answers error 1142, and the response is 403 {@code permission-denied}.
   */
  @PutMapping("/api/admin/gown/periods/{periodId}/open")
  public Map<String, Object> setOpen(@PathVariable String periodId, @RequestBody OpenRequest body) {
    if (body.isOpen() == null) {
      throw Check.invalid("isOpen 값을 확인해 주세요.");
    }
    if (gown.setOpen(periodId, body.isOpen()) == 0 && !gown.exists(periodId)) {
      throw new ApiException(ErrorCode.NOT_FOUND, "회차를 찾을 수 없습니다.");
    }
    return Map.of("success", true, "periodId", periodId, "isOpen", body.isOpen());
  }

  private static Long cursorId(String cursor) {
    if (cursor == null || cursor.isBlank()) {
      return null;
    }
    try {
      return Long.parseLong(cursor);
    } catch (NumberFormatException e) {
      throw Check.invalid("cursor 값을 확인해 주세요.");
    }
  }
}
