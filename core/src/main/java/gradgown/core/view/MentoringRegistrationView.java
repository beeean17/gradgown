package gradgown.core.view;

/** {@code MentoringRegistration} of the student web. Options are API values: 0 is "no choice". */
public record MentoringRegistrationView(
    String registrationId,
    String eventId,
    String status,
    int firstOption,
    int secondOption,
    String name,
    String studentId,
    String department,
    String phone,
    int grade,
    String createdAt,
    String modifiedAt,
    String version) {}
