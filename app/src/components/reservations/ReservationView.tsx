import { useMemo } from 'react'
import { MapPin, Bell, ExternalLink, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { reservations } from '@/data'
import { cn } from '@/lib/utils'
import { YenUsd } from '@/components/ui/YenUsd'

const statusConfig = {
  booked: { label: 'Booked', color: 'text-booked', icon: CheckCircle },
  urgent: { label: 'Book Now', color: 'text-urgent', icon: AlertCircle },
  'book-soon': { label: 'Book Soon', color: 'text-soon', icon: Clock },
  'book-1-week': { label: '1 Week Ahead', color: 'text-soon', icon: Clock },
  'walk-in': { label: 'Walk-In', color: 'text-text-tertiary', icon: Clock },
  confirm: { label: 'Confirm', color: 'text-soon', icon: Bell },
} as const

export function ReservationView() {
  const grouped = useMemo(() => {
    const groups: Record<string, typeof reservations.reservations> = {
      booked: [],
      urgent: [],
      'book-soon': [],
      'walk-in': [],
    }
    for (const r of reservations.reservations) {
      const key = r.status === 'book-1-week' ? 'book-soon' : r.status
      if (groups[key]) groups[key].push(r)
      else groups['walk-in'].push(r)
    }
    return groups
  }, [])

  return (
    <div className="flex flex-col pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto max-w-lg">
          <h1 className="font-display text-2xl tracking-tight">Reservations</h1>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-lg bg-booked/10 px-2 py-1 font-semibold text-booked">
              <CheckCircle className="h-3 w-3" /> {grouped.booked.length}
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-urgent/10 px-2 py-1 font-semibold text-urgent">
              <AlertCircle className="h-3 w-3" /> {grouped.urgent.length}
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-soon/10 px-2 py-1 font-semibold text-soon">
              <Clock className="h-3 w-3" /> {grouped['book-soon'].length}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-6 p-4">
        {/* Alarms */}
        {reservations.alarms.length > 0 && (
          <div className="animate-fade-up">
            <div className="mb-2.5 flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-urgent" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-urgent">Calendar Alarms</span>
            </div>
            <div className="rounded-2xl bg-urgent/[0.06] p-4 ring-1 ring-urgent/15">
              <div className="space-y-2.5">
                {reservations.alarms.map((alarm, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className={cn(
                      'shrink-0 rounded-md px-1.5 py-0.5 font-semibold',
                      alarm.priority === 'CRITICAL' ? 'bg-urgent/15 text-urgent' : 'bg-soon/15 text-soon'
                    )}>
                      {alarm.priority}
                    </span>
                    <div>
                      <p className="font-medium">{alarm.date}</p>
                      <p className="text-text-secondary">{alarm.what}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Grouped reservations */}
        {Object.entries(grouped).map(([status, items]) => {
          if (items.length === 0) return null
          const config = statusConfig[status as keyof typeof statusConfig]
          const StatusIcon = config.icon

          return (
            <div key={status} className="animate-fade-up">
              <div className="mb-2.5 flex items-center gap-2">
                <StatusIcon className={cn('h-3.5 w-3.5', config.color)} />
                <span className={cn('text-[10px] font-semibold uppercase tracking-widest', config.color)}>
                  {config.label} ({items.length})
                </span>
              </div>
              <div className="stagger-children space-y-2">
                {items.map((r, i) => (
                  <div key={i} className="rounded-2xl bg-surface p-4" style={{ borderLeft: `3px solid ${status === 'booked' ? '#34d39960' : status === 'urgent' ? '#f8717160' : status === 'book-soon' ? '#fbbf2460' : '#64748b30'}` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{r.name}</p>
                        {r.date && <p className="mt-0.5 text-xs text-text-tertiary">{r.date}</p>}
                        {r.details && <p className="mt-1 text-xs text-text-secondary leading-relaxed">{r.details}</p>}
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                          {r.cost && <YenUsd text={r.cost} className="text-xs font-medium" />}
                          {r.bookingMethod && (
                            <span className="flex items-center gap-1 text-[10px] text-tokyo">
                              <ExternalLink className="h-3 w-3" /> {r.bookingMethod.substring(0, 40)}
                            </span>
                          )}
                        </div>
                        {r.alarm && (
                          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-soon">
                            <Bell className="h-3 w-3" /> {r.alarm}
                          </p>
                        )}
                      </div>
                      {r.mapLink && (
                        <a
                          href={r.mapLink as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Map to ${r.name}`}
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
          )
        })}
      </div>
    </div>
  )
}
