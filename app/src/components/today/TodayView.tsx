import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, MapPin, AlertTriangle, Coffee, Train, Info, Cake, BookOpen, ChevronDown } from 'lucide-react'
import { schedule, itinerary, transport } from '@/data'
import { CityBadge } from '@/components/ui/CityBadge'
import { YenUsd } from '@/components/ui/YenUsd'
import { cn, getDayCity, getCityAccent, formatDate, getDayOfWeek, getTripDay, getTripCountdown, getTimeGreeting, isBradsBirthday } from '@/lib/utils'

export function TodayView() {
  const tripDay = getTripDay()
  const [selectedDay, setSelectedDay] = useState(tripDay ?? 1)

  const daySchedule = useMemo(() => schedule.find(s => s.dayNumber === selectedDay), [selectedDay])
  const dayItinerary = useMemo(() => itinerary.days.find(d => d.dayNumber === selectedDay), [selectedDay])
  const dayTransport = useMemo(() => transport.days.find(t => t.dayNumber === selectedDay), [selectedDay])
  const city = getDayCity(selectedDay)
  const cityAccent = getCityAccent(city)
  const countdown = getTripCountdown()
  const birthday = isBradsBirthday(selectedDay)

  const [summaryOpen, setSummaryOpen] = useState(false)

  // Reset summary collapsed state when day changes
  useEffect(() => {
    setSummaryOpen(false)
  }, [selectedDay])

  const prev = () => setSelectedDay(d => Math.max(1, d - 1))
  const next = () => setSelectedDay(d => Math.min(16, d + 1))

  return (
    <div className={cn('flex flex-col pb-20', `city-glow-${city.toLowerCase()}`)}>
      {/* Day header */}
      <div className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl">
        {/* Pre-trip countdown or during-trip greeting */}
        {countdown.type === 'before' && (
          <div className="mx-auto max-w-lg px-4 pt-2">
            <p className="text-center text-xs text-text-tertiary">
              {countdown.days === 1 ? 'Tomorrow!' : `${countdown.days} days to go`}
            </p>
          </div>
        )}
        {countdown.type === 'during' && tripDay === selectedDay && (
          <div className="mx-auto max-w-lg px-4 pt-2">
            <p className={cn('text-center text-xs', cityAccent)}>
              {getTimeGreeting()}, {city}
            </p>
          </div>
        )}

        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button
            onClick={prev}
            disabled={selectedDay === 1}
            aria-label="Previous day"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface disabled:opacity-20"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2.5">
              <span className="font-display text-2xl">Day {selectedDay}</span>
              <CityBadge city={city} />
            </div>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {getDayOfWeek(selectedDay)}, {formatDate(selectedDay)}
            </p>
          </div>
          <button
            onClick={next}
            disabled={selectedDay === 16}
            aria-label="Next day"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface disabled:opacity-20"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        {dayItinerary?.title && (
          <div className="mx-auto max-w-lg px-4 pb-2.5">
            <p className={cn('text-center text-sm font-medium', cityAccent)}>{dayItinerary.title}</p>
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-lg space-y-3 p-4">
        {/* Day overview summary */}
        {dayItinerary?.summary && (
          <button
            onClick={() => setSummaryOpen(o => !o)}
            className={cn(
              'w-full animate-fade-up rounded-2xl p-4 text-left ring-1 transition-all',
              `bg-${city.toLowerCase()}/8 ring-${city.toLowerCase()}/15`
            )}
            style={{
              backgroundColor: `color-mix(in srgb, var(--color-${city.toLowerCase()}) 8%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(--color-${city.toLowerCase()}) 15%, transparent)`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `color-mix(in srgb, var(--color-${city.toLowerCase()}) 15%, transparent)` }}
              >
                <BookOpen className="h-4 w-4" style={{ color: `var(--color-${city.toLowerCase()})` }} />
              </div>
              <span className="flex-1 text-sm font-medium">Day overview</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-text-tertiary transition-transform duration-200',
                  summaryOpen && 'rotate-180'
                )}
              />
            </div>
            <div
              className="grid transition-[grid-template-rows] duration-200 ease-in-out"
              style={{ gridTemplateRows: summaryOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="pt-3 text-sm leading-relaxed text-text-secondary">
                  {dayItinerary.summary}
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Brad's 40th birthday! */}
        {birthday && (
          <div className="animate-fade-up rounded-2xl bg-kyoto/8 p-4 ring-1 ring-kyoto/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kyoto/15 animate-gentle-pulse">
                <Cake className="h-5 w-5 text-kyoto" />
              </div>
              <div>
                <p className="text-sm font-bold text-kyoto">Happy 40th, Brad!</p>
                <p className="text-xs text-text-secondary">The big one. Make it count.</p>
              </div>
            </div>
          </div>
        )}

        {/* Morning coffee — featured */}
        {dayItinerary?.morningCoffee && (
          <div className="animate-fade-up rounded-2xl bg-amber-500/8 p-4 ring-1 ring-amber-500/15">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                <Coffee className="h-4 w-4 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/70">Morning Coffee</p>
                <p className="mt-0.5 text-sm font-semibold">{dayItinerary.morningCoffee.name}</p>
                {dayItinerary.morningCoffee.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{dayItinerary.morningCoffee.description}</p>
                )}
              </div>
              {dayItinerary.morningCoffee.mapLink && (
                <a
                  href={dayItinerary.morningCoffee.mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Map to ${dayItinerary.morningCoffee.name}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400/60 transition-colors hover:text-amber-400"
                >
                  <MapPin className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Transport bar */}
        {dayTransport && dayTransport.legs.length > 0 && (
          <div className="animate-fade-up rounded-2xl bg-surface p-4" style={{ animationDelay: '50ms' }}>
            <div className="mb-3 flex items-center gap-2">
              <Train className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Transit</span>
            </div>
            <div className="space-y-2">
              {dayTransport.legs.map((leg, i) => (
                <div key={i} className="flex items-baseline gap-2 text-xs">
                  <span className="w-14 shrink-0 font-mono text-text-tertiary">{leg.time || '—'}</span>
                  <span className="font-medium">{leg.transport}</span>
                  <span className="text-text-tertiary">{leg.duration}</span>
                  {leg.cost && <span className="ml-auto font-mono text-xs"><YenUsd text={leg.cost} /></span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {daySchedule && (
          <div className="relative animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="absolute left-[72px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-0">
              {daySchedule.entries.map((entry, i) => (
                <div key={i} className={cn(
                  'relative flex gap-3 py-2 transition-opacity',
                  entry.isBackup && 'opacity-50'
                )}>
                  <div className="w-[68px] shrink-0 text-right">
                    <span className={cn(
                      'text-xs font-mono tabular-nums',
                      entry.time ? 'text-text-secondary' : 'text-transparent'
                    )}>
                      {entry.time || '00:00'}
                    </span>
                  </div>
                  <div className={cn(
                    'relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-bg',
                    entry.isWarning ? 'bg-urgent' :
                    entry.isBackup ? 'bg-surface-3' :
                    `bg-${city.toLowerCase()}`
                  )} style={
                    !entry.isWarning && !entry.isBackup
                      ? { backgroundColor: `var(--color-${city.toLowerCase()})` }
                      : undefined
                  } />
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'text-sm leading-relaxed',
                      entry.isBackup && 'italic text-text-tertiary'
                    )}>
                      {entry.isWarning && <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5 text-urgent" />}
                      {entry.text.replace(/⚠️/g, '')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subtitle / notes */}
        {dayItinerary?.subtitle && (
          <p className="animate-fade-up text-xs italic text-text-tertiary px-2" style={{ animationDelay: '150ms' }}>{dayItinerary.subtitle}</p>
        )}

        {/* Logistics */}
        {dayItinerary?.logistics && dayItinerary.logistics.length > 0 && (
          <div className="animate-fade-up rounded-2xl bg-surface p-4" style={{ animationDelay: '150ms' }}>
            <div className="mb-2.5 flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Logistics</span>
            </div>
            <ul className="space-y-2">
              {dayItinerary.logistics.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-text-secondary">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
