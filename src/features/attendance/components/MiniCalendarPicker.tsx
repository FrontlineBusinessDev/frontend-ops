import * as PopoverPrimitive from '@radix-ui/react-popover'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function MiniCalendarPicker({ value, onChange }: { value: string; onChange: (dateKey: string) => void }) {
  const selectedDate = parseISO(value)
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(selectedDate))

  const gridStart = startOfWeek(startOfMonth(visibleMonth))
  const gridEnd = endOfWeek(endOfMonth(visibleMonth))
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  function selectDay(day: Date) {
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setVisibleMonth(startOfMonth(selectedDate))
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-48 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium',
            'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          {format(selectedDate, 'EEE, MMM d, yyyy')}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 w-72 rounded-xl border border-border bg-card p-3 shadow-soft-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-sm font-semibold">{format(visibleMonth, 'MMMM yyyy')}</p>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label, idx) => (
              <p key={idx} className="py-1 text-center text-[11px] font-medium text-muted-foreground">
                {label}
              </p>
            ))}
            {days.map((day) => {
              const selected = isSameDay(day, selectedDate)
              const outsideMonth = !isSameMonth(day, visibleMonth)
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full text-sm transition-colors',
                    outsideMonth && 'text-muted-foreground/40',
                    !outsideMonth && !selected && 'text-foreground hover:bg-muted',
                    isToday(day) && !selected && 'font-semibold text-primary',
                    selected && 'bg-primary font-semibold text-primary-foreground',
                  )}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => selectDay(new Date())}
            className="mt-2 w-full rounded-lg border border-dashed border-border py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
          >
            Jump to Today
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
