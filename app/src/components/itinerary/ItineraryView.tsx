import { useState, useMemo } from 'react'
import { MapPin, Star, Ticket, Clock, Coffee, Train } from 'lucide-react'
import { itinerary, transport } from '@/data'
import { DayPicker } from './DayPicker'
import { CityBadge } from '@/components/ui/CityBadge'
import { YenUsd } from '@/components/ui/YenUsd'
import { cn, getDayCity, getCityAccent } from '@/lib/utils'

export function ItineraryView() {
  const [selectedDay, setSelectedDay] = useState(1)
  const day = itinerary.days.find(d => d.dayNumber === selectedDay)
  const dayTransport = useMemo(() => transport.days.find(t => t.dayNumber === selectedDay), [selectedDay])
  const city = getDayCity(selectedDay)
  const cityLower = city.toLowerCase()

  return (
    <div className={cn('flex flex-col pb-20', `city-glow-${cityLower}`)}>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 pt-3 pb-1">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Itinerary</h1>
            <CityBadge city={city} />
          </div>
        </div>
        <DayPicker selectedDay={selectedDay} onSelect={setSelectedDay} />
      </header>

      {day && (
        <div className="mx-auto w-full max-w-lg space-y-4 p-4">
          <div className="animate-fade-up">
            <h2 className={cn('text-base font-bold', getCityAccent(city))}>{day.title}</h2>
            {day.subtitle && <p className="mt-1 text-xs text-text-tertiary">{day.subtitle}</p>}
          </div>

          {/* Morning coffee */}
          {day.morningCoffee && (
            <div className="animate-fade-up rounded-2xl bg-amber-500/8 p-4 ring-1 ring-amber-500/20" style={{ animationDelay: '30ms' }}>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                  <Coffee className="h-4 w-4 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/70">Morning Coffee</p>
                  <p className="mt-0.5 text-sm font-semibold">{day.morningCoffee.name}</p>
                  {day.morningCoffee.description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{day.morningCoffee.description}</p>
                  )}
                </div>
                {day.morningCoffee.mapLink && (
                  <a
                    href={day.morningCoffee.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Map to ${day.morningCoffee.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400/60 transition-colors hover:text-amber-400"
                  >
                    <MapPin className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Transit overview */}
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

          {/* Activity sections */}
          {day.sections.map((section, si) => (
            <div key={si} className="animate-fade-up" style={{ animationDelay: `${(si + 2) * 40}ms` }}>
              <div className="mb-2.5 flex items-center gap-2">
                <div className={cn('h-px flex-1')} style={{ background: `linear-gradient(to right, var(--color-${cityLower})30, var(--color-border))` }} />
                <h3 className={cn('shrink-0 text-[10px] font-semibold uppercase tracking-widest', getCityAccent(city))} style={{ opacity: 0.7 }}>
                  {section.title}
                </h3>
                <div className={cn('h-px flex-1')} style={{ background: `linear-gradient(to left, var(--color-${cityLower})30, var(--color-border))` }} />
              </div>
              {section.subtitle && (
                <p className="mb-2.5 text-xs text-text-tertiary">{section.subtitle}</p>
              )}
              <div className="stagger-children space-y-2">
                {section.activities.map((act, ai) => (
                  <div
                    key={ai}
                    className={cn(
                      'rounded-2xl bg-surface p-4 transition-colors',
                      act.priority
                        ? 'ring-1 ring-priority/30 bg-priority/[0.04] priority-shimmer'
                        : `card-accent-${cityLower}`
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{act.name}</span>
                          {act.priority && (
                            <Star className="h-3.5 w-3.5 fill-priority text-priority" />
                          )}
                          {act.reservationRequired && (
                            <span className="flex items-center gap-0.5 rounded-md bg-urgent/10 px-1.5 py-0.5 text-[10px] font-semibold text-urgent">
                              <Ticket className="h-3 w-3" /> Book
                            </span>
                          )}
                        </div>
                        {act.time && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-text-tertiary">
                            <Clock className="h-3 w-3" /> {act.time}
                          </p>
                        )}
                        {act.description && (
                          <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">{act.description}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-3">
                          {act.price && (
                            <YenUsd text={`${act.price}/pp`} className="text-xs font-medium" />
                          )}
                          {act.lineUpTip && (
                            <span className="text-xs text-amber-400">Tip: {act.lineUpTip}</span>
                          )}
                        </div>
                      </div>
                      {act.mapLink && (
                        <a
                          href={act.mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Map to ${act.name}`}
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-tertiary transition-colors',
                            `hover:text-${cityLower}`
                          )}
                        >
                          <MapPin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {day.logistics.length > 0 && (
            <div className="animate-fade-up">
              <div className="mb-2.5 flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <h3 className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  Logistics
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="rounded-2xl bg-surface p-4">
                <ul className="space-y-2">
                  {day.logistics.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-text-secondary">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
                      <span className="leading-relaxed">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
