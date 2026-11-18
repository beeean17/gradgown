package gradgown.admin.web;

import gradgown.admin.repository.AuditLogAdminRepository;
import gradgown.admin.repository.AuditLogAdminRepository.AuditLogRow;
import gradgown.admin.repository.ContentAdminRepository;
import gradgown.admin.repository.ContentAdminRepository.FaqView;
import gradgown.admin.repository.Page;
import gradgown.core.input.Check;
import gradgown.core.view.AnnouncementView;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Announcements, FAQs and the audit log for the admin app. Read-only. */
@RestController
public class ContentAdminController {

  private static final Pattern CURSOR_ID = Pattern.compile("[A-Za-z0-9_-]{1,128}");

  private final ContentAdminRepository content;
  private final AuditLogAdminRepository auditLogs;

  public ContentAdminController(
      ContentAdminRepository content, AuditLogAdminRepository auditLogs) {
    this.content = content;
    this.auditLogs = auditLogs;
  }

  /** Hidden announcements included. */
  @GetMapping("/api/admin/announcements")
  public List<AnnouncementView> announcements() {
    return content.findAnnouncements();
  }

  @GetMapping("/api/admin/faqs")
  public List<FaqView> faqs() {
    return content.findFaqs();
  }

  @GetMapping("/api/admin/audit-logs")
  public Page<AuditLogRow> auditLogs(
      @RequestParam(required = false) String domain,
      @RequestParam(required = false) String outcome,
      @RequestParam(required = false) String cursor,
      @RequestParam(required = false) Integer limit) {
    LocalDateTime cursorTime = null;
    String cursorId = null;
    if (cursor != null && !cursor.isBlank()) {
      // "<created_at>,<operation_id>", as Page.nextCursor gave it.
      int comma = cursor.indexOf(',');
      try {
        cursorTime = LocalDateTime.parse(cursor.substring(0, Math.max(comma, 0)));
        cursorId = cursor.substring(comma + 1);
      } catch (DateTimeParseException e) {
        throw Check.invalid("cursor 값을 확인해 주세요.");
      }
      // Only what a real cursor can hold goes on to MySQL: a time a TIMESTAMP can store and an
      // ID in the characters of an operation ID.
      if (cursorTime.getYear() < 1971
          || cursorTime.getYear() > 2037
          || !CURSOR_ID.matcher(cursorId).matches()) {
        throw Check.invalid("cursor 값을 확인해 주세요.");
      }
    }
    return auditLogs.find(
        Page.filter(domain), Page.filter(outcome), cursorTime, cursorId, Page.size(limit));
  }
}
