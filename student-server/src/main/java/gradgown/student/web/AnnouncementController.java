package gradgown.student.web;

import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import gradgown.core.view.AnnouncementView;
import gradgown.student.repository.AnnouncementRepository;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Announcements. Public, and visible ones only: the repository reads the view. */
@RestController
public class AnnouncementController {

  private final AnnouncementRepository announcements;

  public AnnouncementController(AnnouncementRepository announcements) {
    this.announcements = announcements;
  }

  @GetMapping("/api/announcements")
  public List<AnnouncementView> list() {
    return announcements.findAll();
  }

  @GetMapping("/api/announcements/{id}")
  public AnnouncementView one(@PathVariable String id) {
    try {
      return announcements.findById(Long.parseLong(id)).orElseThrow(AnnouncementController::notFound);
    } catch (NumberFormatException e) {
      throw notFound();
    }
  }

  private static ApiException notFound() {
    return new ApiException(ErrorCode.NOT_FOUND, "공지를 찾을 수 없습니다.");
  }
}
