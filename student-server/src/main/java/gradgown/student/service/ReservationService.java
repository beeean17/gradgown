package gradgown.student.service;

import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import gradgown.core.error.MySqlError;
import gradgown.core.input.Check;
import gradgown.core.input.ReservationInput;
import gradgown.core.rule.ApplicationWindow;
import gradgown.core.time.SeoulTime;
import gradgown.core.view.ReservationPeriodView;
import gradgown.core.view.ReservationSlotView;
import gradgown.core.view.ReservationView;
import gradgown.student.auth.SessionUser;
import gradgown.student.repository.GownScheduleRepository;
import gradgown.student.repository.GownScheduleRepository.Period;
import gradgown.student.repository.GownScheduleRepository.Slot;
import gradgown.student.repository.ReservationRepository;
import gradgown.student.service.CommandRunner.Done;
import gradgown.student.service.CommandRunner.Result;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

/** Gown rental for a student: the schedule, "my reservations", and the three commands. */
@Service
public class ReservationService {

  private static final String DOMAIN = "reservation";
  private static final String NOT_IN_WINDOW = "현재 예약 신청 또는 변경 기간이 아닙니다.";

  private final GownScheduleRepository schedule;
  private final ReservationRepository reservations;
  private final CommandRunner commands;
  private final Clock clock;

  public ReservationService(
      GownScheduleRepository schedule,
      ReservationRepository reservations,
      CommandRunner commands,
      Clock clock) {
    this.schedule = schedule;
    this.reservations = reservations;
    this.commands = commands;
    this.clock = clock;
  }

  // --- Reads ----------------------------------------------------------------

  public Optional<ReservationPeriodView> currentPeriod() {
    return schedule.findCurrentPeriod().map(this::toView);
  }

  public List<ReservationView> myReservations(SessionUser user, String periodId) {
    return periodId == null || periodId.isBlank()
        ? reservations.findAll(user.id())
        : reservations.findByPeriod(user.id(), periodId);
  }

  private ReservationPeriodView toView(Period period) {
    List<Slot> slots = schedule.findSlots(period.id());
    return new ReservationPeriodView(
        period.id(),
        ReservationPeriodView.titleOf(period.id()),
        period.open() ? "open" : "closed",
        SeoulTime.iso(period.applyStartsAt()),
        SeoulTime.iso(period.applyEndsAt()),
        SeoulTime.iso(period.editStartsAt()),
        SeoulTime.iso(period.editEndsAt()),
        slots.stream().map(slot -> toView(slot, "rent")).toList(),
        slots.stream().map(slot -> toView(slot, "return")).toList());
  }

  private static ReservationSlotView toView(Slot slot, String type) {
    return ReservationSlotView.of(
        slot.id(), slot.periodId(), type, slot.startsAt(), slot.endsAt(), slot.enabled());
  }

  // --- Commands -------------------------------------------------------------

  public Result create(SessionUser user, String operationId, ReservationInput input) {
    return commands.run(
        operationId,
        DOMAIN,
        "reservation.create",
        user.id(),
        () -> {
          ReservationInput.Valid valid = require(input).validate();
          Period period = requireCurrentPeriod();
          LocalDateTime now = SeoulTime.now(clock);
          if (!ApplicationWindow.canCreateReservation(
              period.open(), period.applyStartsAt(), period.applyEndsAt(), now)) {
            throw new ApiException(ErrorCode.FAILED_PRECONDITION, NOT_IN_WINDOW);
          }
          Slot rentSlot = requireRentSlot(period, valid);
          Slot returnSlot = requireReturnSlot(period, valid);
          try {
            long id =
                reservations.insert(user.id(), period.id(), rentSlot.id(), returnSlot.id(), valid);
            return new Done(id, "reserved");
          } catch (DataAccessException failure) {
            // RES-22: the UNIQUE key on (user, period, reserved) rejected the row.
            if (MySqlError.is(failure, MySqlError.DUPLICATE_KEY)) {
              throw new ApiException(
                  ErrorCode.ALREADY_EXISTS, "현재 회차에 이미 예약이 있습니다.", null, failure);
            }
            throw failure;
          }
        });
  }

  public Result update(
      SessionUser user,
      String reservationId,
      String operationId,
      String version,
      ReservationInput input) {
    return commands.run(
        operationId,
        DOMAIN,
        "reservation.update",
        user.id(),
        () -> {
          ReservationInput.Valid valid = require(input).validate();
          int readVersion = Check.version(version);
          Period period = requireCurrentPeriod();
          long id = requireChangeable(user, reservationId, readVersion, period);
          Slot rentSlot = requireRentSlot(period, valid);
          Slot returnSlot = requireReturnSlot(period, valid);
          int changed =
              reservations.update(
                  user.id(), id, readVersion, rentSlot.id(), returnSlot.id(), valid);
          requireChanged(changed);
          return new Done(id, "reserved");
        });
  }

  public Result cancel(
      SessionUser user, String reservationId, String operationId, String version) {
    return commands.run(
        operationId,
        DOMAIN,
        "reservation.cancel",
        user.id(),
        () -> {
          int readVersion = Check.version(version);
          Period period = requireCurrentPeriod();
          long id = requireChangeable(user, reservationId, readVersion, period);
          requireChanged(reservations.cancel(user.id(), id, readVersion));
          return new Done(id, "cancelled");
        });
  }

  // --- Rules the schema cannot hold -----------------------------------------

  private static ReservationInput require(ReservationInput input) {
    if (input == null) {
      throw Check.invalid("신청 내용을 확인해 주세요.");
    }
    return input;
  }

  private Period requireCurrentPeriod() {
    return schedule
        .findCurrentPeriod()
        .orElseThrow(
            () -> new ApiException(ErrorCode.FAILED_PRECONDITION, "예약을 받는 회차가 없습니다."));
  }

  /**
   * RES-21, RES-23, RES-24: a change needs the window, the user's own reservation, the current
   * period, the version the client read, and the status {@code reserved}.
   */
  private long requireChangeable(
      SessionUser user, String reservationId, int readVersion, Period period) {
    LocalDateTime now = SeoulTime.now(clock);
    if (!ApplicationWindow.canChangeReservation(
        period.open(),
        period.applyStartsAt(),
        period.applyEndsAt(),
        period.editStartsAt(),
        period.editEndsAt(),
        now)) {
      throw new ApiException(ErrorCode.FAILED_PRECONDITION, NOT_IN_WINDOW);
    }
    ReservationRepository.Current current =
        parseId(reservationId)
            .flatMap(id -> reservations.findCurrent(user.id(), id))
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "예약을 찾을 수 없습니다."));
    if (!current.periodId().equals(period.id())) {
      throw new ApiException(ErrorCode.FAILED_PRECONDITION, "지난 회차의 예약은 변경할 수 없습니다.");
    }
    if (current.version() != readVersion) {
      throw staleVersion();
    }
    if (!current.status().equals("reserved")) {
      throw new ApiException(ErrorCode.FAILED_PRECONDITION, "취소된 예약은 변경할 수 없습니다.");
    }
    return current.id();
  }

  /**
   * The UPDATE carries the version in its WHERE clause. No row changed means another request
   * changed the reservation after the check above read it.
   */
  private static void requireChanged(int changedRows) {
    if (changedRows == 0) {
      throw staleVersion();
    }
  }

  private static ApiException staleVersion() {
    return new ApiException(ErrorCode.ABORTED, "예약이 다른 곳에서 변경되었습니다. 최신 내용을 확인해 주세요.");
  }

  /** RES-14: the rent slot is the chosen one, is enabled, and contains the rent time. */
  private Slot requireRentSlot(Period period, ReservationInput.Valid input) {
    return schedule
        .findSlot(input.rentSlotId(), period.id())
        .filter(Slot::enabled)
        .filter(slot -> contains(slot, input.rentAt()))
        .orElseThrow(
            () -> new ApiException(ErrorCode.FAILED_PRECONDITION, "활성 슬롯 안의 대여 시각을 선택해 주세요."));
  }

  /** RES-14: the return time falls in some enabled slot of the period. */
  private Slot requireReturnSlot(Period period, ReservationInput.Valid input) {
    return schedule
        .findEnabledSlotAt(period.id(), input.returnAt())
        .orElseThrow(
            () -> new ApiException(ErrorCode.FAILED_PRECONDITION, "활성 슬롯 안의 반납 시각을 선택해 주세요."));
  }

  private static boolean contains(Slot slot, LocalDateTime time) {
    return !time.isBefore(slot.startsAt()) && time.isBefore(slot.endsAt());
  }

  private static Optional<Long> parseId(String id) {
    try {
      return Optional.of(Long.parseLong(id));
    } catch (NumberFormatException e) {
      return Optional.empty();
    }
  }
}
