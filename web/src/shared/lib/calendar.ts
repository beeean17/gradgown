/**
 * A downloadable .ics with one event per entry: phones open it in their
 * calendar app ("캘린더에 추가"). Times go out in UTC, so the calendar shows
 * them in the student's own zone.
 */
export interface CalendarEvent {
  title: string
  startsAt: string
  endsAt: string
  location?: string
  description?: string
}

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
// RFC 5545: backslash, semicolon, comma and newline are escaped in text values.
const text = (value: string) => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

export function calendarFile(events: CalendarEvent[], uidPrefix: string): string {
  const now = stamp(new Date().toISOString())
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//grad42//reservation//KO', 'CALSCALE:GREGORIAN']
  events.forEach((event, index) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uidPrefix}-${index}@grad42`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(event.startsAt)}`,
      `DTEND:${stamp(event.endsAt)}`,
      `SUMMARY:${text(event.title)}`,
      ...(event.location ? [`LOCATION:${text(event.location)}`] : []),
      ...(event.description ? [`DESCRIPTION:${text(event.description)}`] : []),
      'END:VEVENT',
    )
  })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

/** Saves `calendarFile(events)` as `<name>.ics`. */
export function downloadCalendar(events: CalendarEvent[], name: string) {
  const blob = new Blob([calendarFile(events, name)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
