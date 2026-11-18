import { useState, type ReactNode } from 'react'
import { VStack } from '@astryxdesign/core/Stack'
import { Dialog } from '@astryxdesign/core/Dialog'
import { Heading } from '@astryxdesign/core/Heading'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { gownSizes, type ScheduleDay } from '../useReservation'
import type { GownSize, ReservationSlot } from '../../../shared/types'
import { FlowTitle } from '../../../shared/ui/flow/FlowTitle'
import { FLOW_NAME, FLOW_STEPS } from '../flowSteps'

/** "14:00" in Seoul time, from a slot's ISO start. */
const clock = (iso: string) => {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
}

/** One choice chip: the size boxes' selection look (accent border and tint when chosen). */
function Chip({
  label,
  isSelected,
  isDisabled = false,
  isMarked = false,
  onSelect,
  ariaLabel,
}: {
  label: string
  isSelected: boolean
  isDisabled?: boolean
  /** Holds the choice while another day is on view: accent text, no fill. */
  isMarked?: boolean
  onSelect: () => void
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={ariaLabel}
      disabled={isDisabled}
      onClick={onSelect}
      className={`flex h-10 min-w-0 cursor-pointer items-center justify-center rounded-[var(--radius-inner)] border px-3 text-sm font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        isSelected
          ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-[var(--color-text-accent)]'
          : `border-[var(--color-border)] bg-[var(--color-background-muted)] hover:border-[var(--color-border-emphasized)] ${isMarked ? 'text-[var(--color-text-accent)]' : 'text-[var(--color-text-primary)]'}`
      }`}
    >
      {label}
    </button>
  )
}

/**
 * One of the two pickers: day chips, then that day's time chips. Only hours
 * that run are shown, so closed hours need no explaining.
 */
function DayTimePicker({
  title,
  days,
  viewIndex,
  onViewChange,
  selectedSlotId,
  isDayDisabled,
  isSlotDisabled,
  onSelect,
  lockedMessage,
  notice,
}: {
  title: string
  days: ScheduleDay[]
  viewIndex: number
  onViewChange: (index: number) => void
  selectedSlotId: string
  isDayDisabled: (day: ScheduleDay) => boolean
  isSlotDisabled: (slot: ReservationSlot) => boolean
  onSelect: (slot: ReservationSlot, dayIndex: number) => void
  /** Shown instead of the chips while this picker waits for the other. */
  lockedMessage?: string
  /** A one-off line, e.g. that the return was cleared. */
  notice?: string
}) {
  const day = days[viewIndex]
  const slots = day ? day.slots.filter((slot) => !isSlotDisabled(slot)) : []
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <Text type="label" weight="bold">
        {title}
      </Text>
      {lockedMessage ? (
        <Text type="supporting" color="secondary" className="rounded-[var(--radius-inner)] border border-dashed border-border px-3.5 py-3">
          {lockedMessage}
        </Text>
      ) : (
        <>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(days.length, 1), 3)}, minmax(0, 1fr))` }}>
            {days.map((item, index) => {
              const chosen = item.slots.some((slot) => slot.slotId === selectedSlotId)
              return (
                <Chip
                  key={item.date}
                  label={item.label}
                  isSelected={index === viewIndex}
                  isDisabled={isDayDisabled(item)}
                  isMarked={chosen}
                  onSelect={() => onViewChange(index)}
                  ariaLabel={`${item.label}${chosen ? ' · 고른 날' : ''}`}
                />
              )
            })}
          </div>
          {notice && (
            <Text type="supporting" weight="semibold" className="text-[var(--color-text-red)]" role="status">
              {notice}
            </Text>
          )}
          {slots.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => (
                <Chip
                  key={slot.slotId}
                  label={clock(slot.startsAt)}
                  isSelected={slot.slotId === selectedSlotId}
                  onSelect={() => onSelect(slot, viewIndex)}
                  ariaLabel={`${day?.label} ${clock(slot.startsAt)}–${clock(slot.endsAt)}`}
                />
              ))}
            </div>
          ) : (
            <Text type="supporting" color="secondary">
              이 날은 고를 수 있는 시간이 없어요
            </Text>
          )}
        </>
      )}
    </section>
  )
}

/**
 * The pickup and the return as two pickers on one screen — no mode to switch
 * between, each fixed on its own. The return waits for the pickup, offers no
 * day before it and, on the same day, no hour before it; a pickup moved past
 * the return clears the return and says so. A summary line at the end gives
 * the span ("11/28 (토) 14:00 수령 → 11/29 (일) 11:00 반납").
 */
function RangeTimeSelector({
  rentDays,
  rentDayIndex,
  onRentDayChange,
  rentSlotId,
  onRentSlotChange,
  returnDays,
  returnDayIndex,
  onReturnDayChange,
  returnSlotId,
  onReturnSlotChange,
  location,
}: {
  rentDays: ScheduleDay[]
  rentDayIndex: number
  onRentDayChange: (index: number) => void
  rentSlotId: string
  onRentSlotChange: (id: string) => void
  returnDays: ScheduleDay[]
  returnDayIndex: number
  onReturnDayChange: (index: number) => void
  returnSlotId: string
  onReturnSlotChange: (id: string) => void
  location: string
  initialTarget?: 'rent' | 'return'
}) {
  const rentSlot = rentDays[rentDayIndex]?.slots.find((slot) => slot.slotId === rentSlotId)
  const returnSlot = returnDays[returnDayIndex]?.slots.find((slot) => slot.slotId === returnSlotId)
  const rentDate = rentSlot ? rentDays[rentDayIndex]?.date : undefined
  const [rentView, setRentView] = useState(rentDayIndex)
  const [returnView, setReturnView] = useState(returnDayIndex)
  const [notice, setNotice] = useState('')

  // A lunch break: a day whose hours jump over noon.
  const hasLunch = rentDays.some((day) => {
    const hours = day.slots.map((slot) => Number(clock(slot.startsAt).slice(0, 2)))
    return hours.some((hour, index) => index > 0 && hours[index - 1] < 12 && hour > 12)
  })

  const selectRent = (slot: ReservationSlot, dayIndex: number) => {
    const clearsReturn = Boolean(returnSlot && new Date(returnSlot.startsAt) < new Date(slot.startsAt))
    if (dayIndex !== rentDayIndex) onRentDayChange(dayIndex)
    onRentSlotChange(slot.slotId)
    setNotice(clearsReturn ? '수령이 반납보다 늦어져서 반납 시간을 지웠어요. 다시 골라 주세요' : '')
    // Bring the return picker to the first day it can use.
    const firstReturnDay = returnDays.findIndex((day) => day.date >= (rentDays[dayIndex]?.date ?? ''))
    if (firstReturnDay >= 0 && returnView < firstReturnDay) setReturnView(firstReturnDay)
  }

  const selectReturn = (slot: ReservationSlot, dayIndex: number) => {
    if (dayIndex !== returnDayIndex) onReturnDayChange(dayIndex)
    onReturnSlotChange(slot.slotId)
    setNotice('')
  }

  const summary =
    rentSlot && returnSlot
      ? `${rentDays[rentDayIndex]?.label} ${clock(rentSlot.startsAt)} 수령 → ${returnDays[returnDayIndex]?.label} ${clock(returnSlot.startsAt)} 반납`
      : ''

  return (
    <section className="flex flex-col gap-5">
      <VStack gap={0.5}>
        <Text type="label" weight="bold" className="text-lg">
          수령·반납 시간
        </Text>
        <Text type="supporting" color="secondary">
          {location}
          {hasLunch ? ' · 12:00은 점심시간이에요' : ''}
        </Text>
      </VStack>

      <DayTimePicker
        title="수령"
        days={rentDays}
        viewIndex={rentView}
        onViewChange={setRentView}
        selectedSlotId={rentSlotId}
        isDayDisabled={() => false}
        isSlotDisabled={() => false}
        onSelect={selectRent}
      />

      <DayTimePicker
        title="반납"
        days={returnDays}
        viewIndex={returnView}
        onViewChange={setReturnView}
        selectedSlotId={returnSlotId}
        isDayDisabled={(day) => Boolean(rentDate && day.date < rentDate)}
        isSlotDisabled={(slot) => Boolean(rentSlot && new Date(slot.startsAt) < new Date(rentSlot.startsAt))}
        onSelect={selectReturn}
        lockedMessage={rentSlot ? undefined : '수령 시간을 먼저 골라 주세요'}
        notice={notice}
      />

      {summary && (
        <div className="rounded-[var(--radius-inner)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-3.5 py-3" aria-live="polite">
          <Text type="body" weight="semibold" className="break-keep tabular-nums">
            {summary}
          </Text>
        </div>
      )}
    </section>
  )
}

/**
 * S · M · L as one low row, in the same selection language as the date tabs,
 * the 수령·반납 boxes and the time bars: a soft-cornered box that turns to an
 * accent border and tint when chosen.
 */
function SizeSegments({ size, onSizeChange }: { size: GownSize | ''; onSizeChange: (size: GownSize) => void }) {
  return (
    <div role="radiogroup" aria-label="학위복 사이즈" className="grid grid-cols-3 gap-2.5">
      {gownSizes().map((spec) => {
        const isSelected = size === spec.size
        return (
          <button
            key={spec.size}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSizeChange(spec.size)}
            className={`h-11 cursor-pointer rounded-[var(--radius-inner)] border text-base font-bold transition-colors ${
              isSelected
                ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-[var(--color-text-accent)]'
                : 'border-[var(--color-border)] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] hover:border-[var(--color-border-emphasized)]'
            }`}
          >
            {spec.size}
          </button>
        )
      })}
    </div>
  )
}

/** The measured sizes on demand, so the table does not sit in the way of the choice. */
function SizeTableLink() {
  const [isOpen, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 cursor-pointer rounded-[var(--radius-inner)] text-sm text-[var(--color-text-accent)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      >
        사이즈표 보기
      </button>
      <Dialog isOpen={isOpen} onOpenChange={setOpen} purpose="info" aria-label="사이즈표" width="min(28rem, calc(100vw - 2rem))" padding={5}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Heading level={2} className="text-lg">
              사이즈표
            </Heading>
            <Text type="supporting" size="sm" color="secondary">
              실측 기준 · 단위 cm
            </Text>
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--color-reservation-neutral-border)]">
            <SizeTable />
          </div>
          <div className="flex justify-end">
            <Button label="닫기" variant="primary" onClick={() => setOpen(false)} />
          </div>
        </div>
      </Dialog>
    </>
  )
}

export interface ScheduleSelectionFieldsProps {
  size: GownSize | ''
  onSizeChange: (size: GownSize) => void
  rentDays: ScheduleDay[]
  rentDayIndex: number
  onRentDayChange: (index: number) => void
  rentSlotId: string
  onRentSlotChange: (id: string) => void
  returnDays: ScheduleDay[]
  returnDayIndex: number
  onReturnDayChange: (index: number) => void
  returnSlotId: string
  onReturnSlotChange: (id: string) => void
  location: string
  sizeDescription?: ReactNode
  initialTarget?: 'rent' | 'return'
  /** Shown right under the time picker. */
  timeHint?: ReactNode
}

/** Shared size and schedule fields used by both create and in-page edit flows. */
export function ScheduleSelectionFields({
  size,
  onSizeChange,
  rentDays,
  rentDayIndex,
  onRentDayChange,
  rentSlotId,
  onRentSlotChange,
  returnDays,
  returnDayIndex,
  onReturnDayChange,
  returnSlotId,
  onReturnSlotChange,
  location,
  sizeDescription,
  initialTarget,
  timeHint,
}: ScheduleSelectionFieldsProps) {
  return (
    <section className="flex min-w-0 flex-col gap-6.5">
      <section className="flex flex-col gap-4">
        <VStack gap={0.5}>
          <div className="flex items-baseline justify-between gap-3">
            <Text type="label" weight="bold" className="text-lg">
              학위복 사이즈
            </Text>
            <SizeTableLink />
          </div>
          <Text type="supporting" color="secondary">
            {sizeDescription ?? '가운과 학사모를 함께 빌려 드려요'}
          </Text>
        </VStack>
        <SizeSegments size={size} onSizeChange={onSizeChange} />
      </section>

      <div className="h-px bg-[var(--color-border)]" />

      <RangeTimeSelector
        rentDays={rentDays}
        rentDayIndex={rentDayIndex}
        onRentDayChange={onRentDayChange}
        rentSlotId={rentSlotId}
        onRentSlotChange={onRentSlotChange}
        returnDays={returnDays}
        returnDayIndex={returnDayIndex}
        onReturnDayChange={onReturnDayChange}
        returnSlotId={returnSlotId}
        onReturnSlotChange={onReturnSlotChange}
        location={location}
        initialTarget={initialTarget}
      />
      {timeHint}
    </section>
  )
}

/** The measured sizes. The wide rail wraps it in a titled card; a phone shows it under the size tiles. */
function SizeTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-center tabular-nums">
        <caption className="sr-only">학위복 S, M, L 사이즈별 실측 정보 (단위 cm)</caption>
        <thead className="bg-[var(--color-background-muted)] text-[0.6875rem] text-[var(--color-text-secondary)]">
          <tr>
            <th scope="col" className="px-2 py-2.5 font-semibold">사이즈</th>
            <th scope="col" className="px-2 py-2.5 font-semibold">총장</th>
            <th scope="col" className="px-2 py-2.5 font-semibold">가슴단면</th>
            <th scope="col" className="px-2 py-2.5 font-semibold">어깨너비</th>
            <th scope="col" className="px-2 py-2.5 font-semibold">소매길이</th>
          </tr>
        </thead>
        <tbody>
          {gownSizes().map((spec) => (
            <tr key={spec.size} className="border-t border-[var(--color-border)] text-xs">
              <th scope="row" className="px-2 py-3 font-bold text-[var(--color-text-accent)]">
                {spec.size}
              </th>
              <td className="px-2 py-3">{spec.totalLengthCm}</td>
              <td className="px-2 py-3">{spec.chestWidthCm}</td>
              <td className="px-2 py-3">{spec.shoulderWidthCm}</td>
              <td className="px-2 py-3">{spec.sleeveLengthCm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SizeGuideCard() {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--color-reservation-neutral-border)] bg-[var(--color-reservation-neutral-surface)]">
      <div className="border-b border-[var(--color-border)] px-4.5 py-3.5">
        <Text type="label" weight="bold">
          사이즈 정보
        </Text>
        <Text type="supporting" size="sm" color="secondary" display="block" className="mt-1">
          실측 기준 · 단위 cm
        </Text>
      </div>
      <SizeTable />
    </section>
  )
}

export function ScheduleStep({
  size,
  onSizeChange,
  rentDays,
  rentDayIndex,
  onRentDayChange,
  rentSlotId,
  onRentSlotChange,
  returnDays,
  returnDayIndex,
  onReturnDayChange,
  returnSlotId,
  onReturnSlotChange,
  location,
  actions,
  onBack,
  onExit,
}: {
  size: GownSize | ''
  onSizeChange: (size: GownSize) => void
  rentDays: ScheduleDay[]
  rentDayIndex: number
  onRentDayChange: (index: number) => void
  rentSlotId: string
  onRentSlotChange: (id: string) => void
  returnDays: ScheduleDay[]
  returnDayIndex: number
  onReturnDayChange: (index: number) => void
  returnSlotId: string
  onReturnSlotChange: (id: string) => void
  location: string
  actions: ReactNode
  /** A phone's way back and out (FlowTitle); wide screens use `actions`. */
  onBack?: () => void
  onExit?: () => void
}) {
  return (
    <div className="flex flex-col gap-6.5">
      <FlowTitle flowName={FLOW_NAME} step={3} totalSteps={FLOW_STEPS.length} stepName={FLOW_STEPS[2].nav} onBack={onBack} onExit={onExit} exitLabel="예약 나가기">
        사이즈와 시간을 골라 주세요
      </FlowTitle>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_var(--rail-w)] lg:gap-[var(--rail-gap)]">
        <main className="flex min-w-0 flex-col gap-6.5">
          <ScheduleSelectionFields
            size={size}
            onSizeChange={onSizeChange}
            rentDays={rentDays}
            rentDayIndex={rentDayIndex}
            onRentDayChange={onRentDayChange}
            rentSlotId={rentSlotId}
            onRentSlotChange={onRentSlotChange}
            returnDays={returnDays}
            returnDayIndex={returnDayIndex}
            onReturnDayChange={onReturnDayChange}
            returnSlotId={returnSlotId}
            onReturnSlotChange={onReturnSlotChange}
            location={location}
            initialTarget={rentSlotId ? 'return' : 'rent'}
          />
        </main>

        <aside className="flex flex-col gap-4">
          <div className="hidden desk:block">
            <SizeGuideCard />
          </div>


          {actions}
        </aside>
      </div>
    </div>
  )
}
