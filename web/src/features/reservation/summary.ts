import { formatClock, formatMonthDayWeekday, kstParts } from '../../shared/lib/datetime'
import type { Reservation, ReservationPeriod } from '../../shared/types'

/** "11/27 (금) 16:00 수령 · M": a live reservation in one line, for cards. */
export function reservationSummary(reservation: Reservation): string {
  return [
    reservation.rentAt && `${formatMonthDayWeekday(reservation.rentAt)} ${formatClock(reservation.rentAt)} 수령`,
    reservation.size ?? reservation.sizeRaw,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * The hours the desk takes pickups and returns, from the round's own slots:
 * "10:00 ~ 18:00" when every day runs the same, otherwise one range per run
 * of days, one per line ("11/27 (금) 13:00 ~ 18:00", "11/28 (토) ~ 11/29 (일) 10:00 ~ 18:00").
 * A break inside a day is not shown — the schedule step lays those out.
 */
export function rentalHours(period: ReservationPeriod | null): string {
  if (!period) return ''
  const slots = [...period.rentSlots, ...period.returnSlots].filter((slot) => slot.isActive && slot.startsAt && slot.endsAt)
  const days = new Map<string, { first: string; start: string; end: string }>()
  for (const slot of slots) {
    const p = kstParts(slot.startsAt)
    const key = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
    const start = formatClock(slot.startsAt)
    const end = formatClock(slot.endsAt)
    const known = days.get(key)
    if (!known) days.set(key, { first: slot.startsAt, start, end })
    else {
      if (start < known.start) known.start = start
      if (end > known.end) known.end = end
    }
  }
  const ordered = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value)
  if (ordered.length === 0) return ''
  const runs: { from: string; to: string; hours: string }[] = []
  for (const dayHours of ordered) {
    const hours = `${dayHours.start} ~ ${dayHours.end}`
    const last = runs[runs.length - 1]
    if (last && last.hours === hours) last.to = dayHours.first
    else runs.push({ from: dayHours.first, to: dayHours.first, hours })
  }
  if (runs.length === 1) return runs[0].hours
  return runs
    .map((run) =>
      run.from === run.to
        ? `${formatMonthDayWeekday(run.from)} ${run.hours}`
        : `${formatMonthDayWeekday(run.from)} ~ ${formatMonthDayWeekday(run.to)} ${run.hours}`,
    )
    .join('\n')
}
