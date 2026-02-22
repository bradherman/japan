import { useRef, useEffect } from 'react'
import { cn, getDayCity, formatDate, getDayOfWeek, getCityBg } from '@/lib/utils'

interface Props {
  selectedDay: number
  onSelect: (day: number) => void
}

export function DayPicker({ selectedDay, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-day="${selectedDay}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedDay])

  return (
    <div
      ref={scrollRef}
      role="tablist"
      aria-label="Trip days"
      className="flex gap-1.5 overflow-x-auto px-4 py-2.5 scrollbar-hide"
    >
      {Array.from({ length: 16 }, (_, i) => i + 1).map(day => {
        const city = getDayCity(day)
        const isSelected = day === selectedDay
        return (
          <button
            key={day}
            role="tab"
            aria-selected={isSelected}
            data-day={day}
            onClick={() => onSelect(day)}
            className={cn(
              'flex shrink-0 flex-col items-center rounded-xl px-2.5 py-1.5 text-xs transition-all',
              isSelected
                ? 'bg-surface-2 text-text ring-1 ring-border shadow-lg'
                : 'text-text-tertiary hover:bg-surface hover:text-text-secondary'
            )}
          >
            <span className="text-[10px]">{getDayOfWeek(day)}</span>
            <span className="text-sm font-bold tabular-nums">{formatDate(day).split(' ')[1]}</span>
            <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full transition-transform', getCityBg(city), isSelected && 'scale-125')} />
          </button>
        )
      })}
    </div>
  )
}
