import { newOperationId, sendCommand, type CommandResponse } from '../../shared/firebase/command'
import type { MentoringRegistration } from '../../shared/types'

/**
 * Students never write registration documents directly — the rules forbid it
 * (MNT-28). Every create/update/cancel goes through the `mentoringCommand`
 * callable, which checks the switch, the period, the option rules and the
 * version in one transaction and writes `adminAuditLogs/{operationId}`.
 * Contract: docs/contracts/mentoring-command.md.
 */

export { newOperationId }
export { CommandError as MentoringCommandError } from '../../shared/firebase/command'

export interface MentoringInput {
  name: string
  studentId: string
  department: string
  grade: number
  phone: string
  /** 0 = 선택 안함, 1–7 = option number (contract "선택지"). */
  firstOption: number
  secondOption: number
}

interface MentoringCommandResponse extends CommandResponse {
  registrationId: string
}

function toWire(input: MentoringInput) {
  return {
    name: input.name.trim(),
    department: input.department.trim(),
    studentId: input.studentId.trim(),
    grade: input.grade,
    phone: input.phone.trim(),
    firstOption: input.firstOption,
    secondOption: input.secondOption,
  }
}

const UNKNOWN_MESSAGE =
  '요청 결과를 확인하지 못했어요. 내 신청에서 반영 여부를 먼저 확인해 주세요. 다시 시도해도 중복으로 신청되지는 않아요.'

function send(request: Record<string, unknown> & { operationId: string }) {
  return sendCommand<MentoringCommandResponse>('mentoringCommand', request, UNKNOWN_MESSAGE)
}

export function createRegistration(input: MentoringInput, operationId: string) {
  return send({ action: 'mentoring.create', operationId, input: toWire(input) })
}

export function updateRegistration(registration: MentoringRegistration, input: MentoringInput, operationId: string) {
  return send({
    action: 'mentoring.update',
    operationId,
    key: { registrationId: registration.registrationId },
    version: registration.version,
    input: toWire(input),
  })
}

export function cancelRegistration(registration: MentoringRegistration, operationId: string) {
  return send({
    action: 'mentoring.cancel',
    operationId,
    key: { registrationId: registration.registrationId },
    version: registration.version,
  })
}
