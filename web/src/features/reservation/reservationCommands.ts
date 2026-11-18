import { CommandError, newOperationId, sendCommand, type CommandResponse } from '../../shared/api/command'
import type { GownSize, Reservation, ReservationSlot } from '../../shared/types'
import { storedSize } from './reservationData'

/**
 * Every create/update/cancel is a command of the student server, which
 * validates the period, slot and version in one transaction and writes the
 * matching `audit_logs` row. (In the original it was the `reservationCommand`
 * callable.) Sending it and classifying its errors are shared with St:talk
 * (shared/api/command.ts).
 */

export { CommandError as ReservationCommandError, newOperationId }
export type { CommandFailureKind } from '../../shared/api/command'

export interface ReservationInput {
  name: string
  studentId: string
  department: string
  phone: string
  size: GownSize
  rentSlot: ReservationSlot
  returnSlot: ReservationSlot
  isProxy: boolean
  proxyName: string
  proxyPhone: string
}

interface ReservationCommandResponse extends CommandResponse {
  reservationId: string
}

function toWire(input: ReservationInput) {
  return {
    name: input.name.trim(),
    studentId: input.studentId.trim(),
    department: input.department.trim(),
    phone: input.phone.trim(),
    size: storedSize(input.size),
    slotId: input.rentSlot.slotId,
    // The server validates `YYYY-MM-DDTHH:mm:ss(.sss)Z` exactly.
    rentAt: new Date(input.rentSlot.startsAt).toISOString(),
    returnAt: new Date(input.returnSlot.startsAt).toISOString(),
    isProxy: input.isProxy,
    proxyName: input.isProxy ? input.proxyName.trim() : null,
    proxyPhone: input.isProxy ? input.proxyPhone.trim() : null,
  }
}

const UNKNOWN_MESSAGE =
  '요청 결과를 확인하지 못했어요. 내 신청에서 반영 여부를 먼저 확인해 주세요. 다시 시도해도 중복으로 예약되지는 않아요.'

function send(request: Record<string, unknown> & { operationId: string }) {
  return sendCommand<ReservationCommandResponse>(request, UNKNOWN_MESSAGE)
}

export function createReservation(input: ReservationInput, operationId: string) {
  return send({ action: 'reservation.create', operationId, input: toWire(input) })
}

export function updateReservation(reservation: Reservation, input: ReservationInput, operationId: string) {
  return send({
    action: 'reservation.update',
    operationId,
    key: { reservationId: reservation.reservationId },
    version: reservation.version,
    input: toWire(input),
  })
}

export function cancelReservation(reservation: Reservation, operationId: string) {
  return send({
    action: 'reservation.cancel',
    operationId,
    key: { reservationId: reservation.reservationId },
    version: reservation.version,
  })
}
