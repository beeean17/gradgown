package gradgown.core.view;

import java.util.List;

/**
 * {@code Announcement} of the student web. Tags and attachments are not stored; the original web
 * also always sent them empty.
 */
public record AnnouncementView(
    String id,
    String title,
    String content,
    String category,
    List<String> tags,
    List<Object> attachments,
    boolean isPinned,
    boolean isVisible,
    boolean showOnHome,
    boolean isPopup,
    String authorId,
    String createdAt,
    String updatedAt,
    String publishedAt) {}
