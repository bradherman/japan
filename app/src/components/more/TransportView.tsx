import { useState } from 'react'
import { transport } from '@/data'
import { DayPicker } from '@/components/itinerary/DayPicker'
import { CityBadge } from '@/components/ui/CityBadge'
import { getDayCity } from '@/lib/utils'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { YenUsd } from '@/components/ui/YenUsd'
import { useNavigate } from 'react-router-dom'

export function TransportView() {
  const [selectedDay, setSelectedDay] = useState(1)
  const day = transport.days.find(d => d.dayNumber === selectedDay)
  const navigate = useNavigate()
  const city = getDayCity(selectedDay)

  return (
    <div className="flex flex-col pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 pt-3 pb-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/more')}
              aria-label="Back to more"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-2xl tracking-tight">Transport</h1>
          </div>
        </div>
        <DayPicker selectedDay={selectedDay} onSelect={setSelectedDay} />
      </header>

      {day && (
        <div className="mx-auto w-full max-w-lg space-y-4 p-4">
          <div className="flex items-center gap-2 animate-fade-up">
            <h2 className="text-base font-bold">{day.title}</h2>
            <CityBadge city={city} />
          </div>

          {day.legs.length > 0 ? (
            <div className="stagger-children space-y-2">
              {day.legs.map((leg, i) => (
                <div key={i} className="rounded-2xl bg-surface p-4">
                  <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1.5">
                    <span className="font-mono tabular-nums">{leg.time || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{leg.from}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-text-tertiary" />
                    <span className="font-semibold">{leg.to}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5 text-xs">
                    <span className="rounded-lg bg-surface-2 px-2 py-0.5 font-medium">{leg.transport}</span>
                    <span className="text-text-tertiary">{leg.duration}</span>
                    {leg.cost && <span className="font-mono text-xs"><YenUsd text={leg.cost} /></span>}
                  </div>
                  {leg.notes && <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">{leg.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 py-12 text-text-tertiary">
              <p className="text-sm">No major transit legs today</p>
              <p className="text-xs">Everything is walkable</p>
            </div>
          )}

          {day.notes && day.notes.length > 0 && (
            <div className="rounded-2xl bg-surface-2/50 p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Notes</p>
              <ul className="space-y-1.5">
                {day.notes.map((n, i) => (
                  <li key={i} className="text-xs text-text-secondary leading-relaxed">{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Cost summary */}
      {transport.costs.length > 0 && (
        <div className="mx-auto w-full max-w-lg px-4 pb-4">
          <div className="mb-2.5 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Cost Summary</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="rounded-2xl bg-surface p-4">
            <div className="space-y-1.5">
              {transport.costs.map((c, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-text-secondary">{c.segment}</span>
                  <span className="font-mono font-medium tabular-nums text-xs"><YenUsd text={c.cost} /></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
