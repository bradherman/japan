import { useState } from 'react'
import { MapPin, Star, Ticket, Clock } from 'lucide-react'
import { itinerary } from '@/data'
import { DayPicker } from './DayPicker'
import { CityBadge } from '@/components/ui/CityBadge'
import { cn, getDayCity, getCityAccent } from '@/lib/utils'

export function ItineraryView() {
  const [selectedDay, setSelectedDay] = useState(1)
  const day = itinerary.days.find(d => d.dayNumber === selectedDay)
  const city = getDayCity(selectedDay)

  return (
    <div className="flex flex-col pb-20">
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
        <div className="mx-auto w-full max-w-lg space-y-5 p-4">
          <div className="animate-fade-up">
            <h2 className={cn('text-base font-bold', getCityAccent(city))}>{day.title}</h2>
            {day.subtitle && <p className="mt-1 text-xs text-text-tertiary">{day.subtitle}</p>}
          </div>

          {day.sections.map((section, si) => (
            <div key={si} className="animate-fade-up" style={{ animationDelay: `${si * 50}ms` }}>
              <div className="mb-2.5 flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <h3 className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  {section.title}
                </h3>
                <div className="h-px flex-1 bg-border" />
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
                      act.priority && 'ring-1 ring-priority/30 bg-priority/[0.03]'
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
                            <span className="text-xs font-medium text-emerald-400">{act.price}/pp</span>
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
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-tertiary transition-colors hover:text-tokyo"
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
