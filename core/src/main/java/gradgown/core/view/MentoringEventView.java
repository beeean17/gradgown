package gradgown.core.view;

import java.util.List;

/**
 * {@code MentoringEvent} of the student web: the current St:talk event. {@code options} always has
 * seven names, for options 1 to 7; an unnamed option is the empty string.
 */
public record MentoringEventView(
    String schema,
    String eventId,
    boolean isOpen,
    String applyStartAt,
    String applyEndAt,
    String date,
    String location,
    List<MentoringSessionView> sessions,
    List<String> options,
    String intro,
    List<String> notes,
    String epicFolioUrl,
    boolean isEpicFolioLinkOpen) {}
