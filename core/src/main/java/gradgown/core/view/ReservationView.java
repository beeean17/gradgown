package gradgown.core.view;

/** {@code Reservation} of the student web: one gown reservation. */
public record ReservationView(
    String reservationId,
    String periodId,
    String status,
    String name,
    String studentId,
    String department,
    String phone,
    String size,
    String sizeRaw,
    String slotId,
    String rentAt,
    String returnAt,
    boolean isProxy,
    String proxyName,
    String proxyPhone,
    String createdAt,
    String modifiedAt,
    String version) {}
