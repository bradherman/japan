import { useRef, useEffect } from 'react'
import { cn, getDayCity, formatDate, getDayOfWeek, getCityBg, getCityTextColor } from '@/lib/utils'

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
                ? cn('bg-surface-2 shadow-lg', getCityTextColor(city))
                : 'text-text-tertiary hover:bg-surface hover:text-text-secondary'
            )}
            style={isSelected ? {
              boxShadow: `0 0 20px var(--color-${city.toLowerCase()})15, 0 0 0 1px var(--color-${city.toLowerCase()})40`,
            } : undefined}
          >
            <span className="text-[10px]">{getDayOfWeek(day)}</span>
            <span className={cn('text-sm font-bold tabular-nums', isSelected ? 'text-text' : '')}>{formatDate(day).split(' ')[1]}</span>
            <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full transition-transform', getCityBg(city), isSelected && 'scale-150')} />
          </button>
        )
      })}
    </div>
  )
}
