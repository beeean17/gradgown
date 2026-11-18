package gradgown.student.service;

import gradgown.core.error.ApiException;
import gradgown.core.error.ErrorCode;
import gradgown.core.error.MySqlError;
import gradgown.core.input.Check;
import gradgown.core.input.MentoringInput;
import gradgown.core.rule.ApplicationWindow;
import gradgown.core.rule.MentoringOptions;
import gradgown.core.time.SeoulTime;
import gradgown.core.view.MentoringEventView;
import gradgown.core.view.MentoringRegistrationView;
import gradgown.student.auth.SessionUser;
import gradgown.student.repository.MentoringEventRepository;
import gradgown.student.repository.MentoringEventRepository.Event;
import gradgown.student.repository.RegistrationRepository;
import gradgown.student.service.CommandRunner.Done;
import gradgown.student.service.CommandRunner.Result;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

/** St:talk for a student: the event, "my registrations", and the three commands. */
@Service
public class MentoringService {

  private static final String DOMAIN = "mentoring";

  private final MentoringEventRepository events;
  private final RegistrationRepository registrations;
  private final CommandRunner commands;
  private final Clock clock;

  public MentoringService(
      MentoringEventRepository events,
      RegistrationRepository registrations,
      CommandRunner commands,
      Clock clock) {
    this.events = events;
    this.registrations = registrations;
    this.commands = commands;
    this.clock = clock;
  }

  // --- Reads ----------------------------------------------------------------

  public Optional<MentoringEventView> currentEvent() {
    return events
        .findCurrentEvent()
        .map(
            event ->
                new MentoringEventView(
                    "v2",
                    event.id(),
                    event.open(),
                    SeoulTime.iso(event.applyStartsAt()),
                    SeoulTime.iso(event.applyEndsAt()),
                    SeoulTime.isoStartOfDay(event.eventDate()),
                    event.location(),
                    events.findSessions(event.id()),
                    events.findOptionNames(event.id()),
                    event.intro(),
                    events.findNotes(event.id()),
                    event.epicFolioUrl(),
                    event.epicFolioLinkOpen()));
  }

  public List<MentoringRegistrationView> myRegistrations(SessionUser user) {
    return registrations.findAll(user.id());
  }

  // --- Commands -------------------------------------------------------------

  public Result create(SessionUser user, String operationId, MentoringInput input) {
    return commands.run(
        operationId,
        DOMAIN,
        "mentoring.create",
        user.id(),
        () -> {
          MentoringInput.Valid valid = require(input).validate();
          Event event = requireOpenEvent();
          requireNamedOptions(event, valid);
          try {
            long id = registrations.insert(user.id(), event.id(), valid);
            return new Done(id, "reserved");
          } catch (DataAccessException failure) {
            // MNT-22: the UNIQUE key on (user, event, reserved) rejected the row.
            if (MySqlError.is(failure, MySqlError.DUPLICATE_KEY)) {
              throw new ApiException(
                  ErrorCode.ALREADY_EXISTS, "현재 행사에 이미 신청이 있습니다.", null, failure);
            }
            throw failure;
          }
        });
  }

  public Result update(
      SessionUser user,
      String registrationId,
      String operationId,
      String version,
      MentoringInput input) {
    return commands.run(
        operationId,
        DOMAIN,
        "mentoring.update",
        user.id(),
        () -> {
          MentoringInput.Valid valid = require(input).validate();
          int readVersion = Check.version(version);
          Event event = requireOpenEvent();
          long id = requireChangeable(user, registrationId, readVersion, event);
          requireNamedOptions(event, valid);
          requireChanged(registrations.update(user.id(), id, readVersion, valid));
          return new Done(id, "reserved");
        });
  }

  public Result cancel(
      SessionUser user, String registrationId, String operationId, String version) {
    return commands.run(
        operationId,
        DOMAIN,
        "mentoring.cancel",
        user.id(),
        () -> {
          int readVersion = Check.version(version);
          Event event = requireOpenEvent();
          long id = requireChangeable(user, registrationId, readVersion, event);
          requireChanged(registrations.cancel(user.id(), id, readVersion));
          return new Done(id, "cancelled");
        });
  }

  // --- Rules the schema cannot hold -----------------------------------------

  private static MentoringInput require(MentoringInput input) {
    if (input == null) {
      throw Check.invalid("신청 내용을 확인해 주세요.");
    }
    return input;
  }

  /** MNT-21: applying, changing and cancelling all need the switch on and the window. */
  private Event requireOpenEvent() {
    Event event =
        events
            .findCurrentEvent()
            .orElseThrow(
                () -> new ApiException(ErrorCode.FAILED_PRECONDITION, "신청을 받는 행사가 없습니다."));
    if (!ApplicationWindow.canRegister(
        event.open(), event.applyStartsAt(), event.applyEndsAt(), SeoulTime.now(clock))) {
      throw new ApiException(ErrorCode.FAILED_PRECONDITION, "현재 St:talk 신청 또는 변경 기간이 아닙니다.");
    }
    return event;
  }

  /**
   * MNT-25: a chosen option must have a name now. That the option belongs to this event is the
   * foreign key's job; that the two sessions differ is a CHECK constraint's, repeated in {@link
   * MentoringInput#validate()} for the message.
   */
  private void requireNamedOptions(Event event, MentoringInput.Valid input) {
    List<String> names = events.findOptionNames(event.id());
    for (int option : new int[] {input.firstOption(), input.secondOption()}) {
      if (option != MentoringOptions.NONE && names.get(option - 1).isBlank()) {
        throw Check.invalid("선택지를 확인해 주세요.");
      }
    }
  }

  /** MNT-23: the user's own registration, of the current event, unchanged, and reserved. */
  private long requireChangeable(
      SessionUser user, String registrationId, int readVersion, Event event) {
    RegistrationRepository.Current current =
        parseId(registrationId)
            .flatMap(id -> registrations.findCurrent(user.id(), id))
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "신청을 찾을 수 없습니다."));
    if (!current.eventId().equals(event.id())) {
      throw new ApiException(ErrorCode.FAILED_PRECONDITION, "지난 행사의 신청은 변경할 수 없습니다.");
    }
    if (current.version() != readVersion) {
      throw staleVersion();
    }
    if (!current.status().equals("reserved")) {
      throw new ApiException(ErrorCode.FAILED_PRECONDITION, "취소된 신청은 변경할 수 없습니다.");
    }
    return current.id();
  }

  private static void requireChanged(int changedRows) {
    if (changedRows == 0) {
      throw staleVersion();
    }
  }

  private static ApiException staleVersion() {
    return new ApiException(ErrorCode.ABORTED, "신청이 다른 곳에서 변경되었습니다. 최신 내용을 확인해 주세요.");
  }

  private static Optional<Long> parseId(String id) {
    try {
      return Optional.of(Long.parseLong(id));
    } catch (NumberFormatException e) {
      return Optional.empty();
    }
  }
}
