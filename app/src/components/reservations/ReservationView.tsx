import { useMemo, useState } from 'react'
import { MapPin, Bell, ExternalLink, CheckCircle, AlertCircle, Clock, ChevronDown, Calendar, Shirt, Info } from 'lucide-react'
import { reservations } from '@/data'
import { cn } from '@/lib/utils'
import { YenUsd } from '@/components/ui/YenUsd'

type ViewMode = 'action' | 'status'

const statusConfig = {
  booked: { label: 'Booked', color: 'text-booked', bg: 'bg-booked', icon: CheckCircle },
  urgent: { label: 'Book Now', color: 'text-urgent', bg: 'bg-urgent', icon: AlertCircle },
  'book-soon': { label: 'Book Soon', color: 'text-soon', bg: 'bg-soon', icon: Clock },
  'book-1-week': { label: '1 Week Ahead', color: 'text-soon', bg: 'bg-soon', icon: Clock },
  'walk-in': { label: 'Walk-In', color: 'text-text-tertiary', bg: 'bg-text-tertiary', icon: Clock },
  confirm: { label: 'Confirm', color: 'text-soon', bg: 'bg-soon', icon: Bell },
} as const

// Parse an action date string into a sortable Date (or null for "NOW")
function parseActionDate(alarm: string | undefined): { date: Date | null; isNow: boolean; isPast: boolean; label: string } {
  if (!alarm) return { date: null, isNow: false, isPast: false, label: '' }

  const now = new Date()
  const lower = alarm.toLowerCase()

  if (lower.includes('now') || lower.includes('asap')) {
    return { date: null, isNow: true, isPast: false, label: 'Now' }
  }

  // Try to extract date patterns like "Mar 8", "Apr 7", "~Apr 22"
  const dateMatch = alarm.match(/~?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})/i)
  if (dateMatch) {
    const parsed = new Date(`${dateMatch[1]}, 2026`)
    if (!isNaN(parsed.getTime())) {
      return {
        date: parsed,
        isNow: false,
        isPast: parsed < now,
        label: dateMatch[1],
      }
    }
  }

  return { date: null, isNow: false, isPast: false, label: alarm.substring(0, 30) }
}

function ReservationCard({ r }: { r: typeof reservations.reservations[0] }) {
  const config = statusConfig[r.status as keyof typeof statusConfig] || statusConfig['walk-in']
  const StatusIcon = config.icon
  const isBooked = r.status === 'booked'

  return (
    <div
      className={cn(
        'rounded-2xl bg-surface p-4 transition-all',
        isBooked ? 'border-l-3 border-booked/40' : ''
      )}
      style={{
        borderLeft: `3px solid ${isBooked ? '#34d39960' : r.status === 'urgent' ? '#f8717160' : r.status === 'book-soon' || r.status === 'book-1-week' ? '#fbbf2460' : '#64748b30'}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Header: name + status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{r.name}</p>
            <span className={cn(
              'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
              isBooked ? 'bg-booked/10 text-booked' :
              r.status === 'urgent' ? 'bg-urgent/10 text-urgent' :
              r.status === 'walk-in' ? 'bg-surface-2 text-text-tertiary' :
              'bg-soon/10 text-soon'
            )}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </span>
          </div>

          {/* Date & time */}
          {r.date && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-text-tertiary">
              <Calendar className="h-3 w-3" />
              {r.date}
            </p>
          )}

          {/* Details */}
          {r.details && (
            <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">{r.details}</p>
          )}

          {/* Notes (dress code, arrival tips, etc.) */}
          {r.notes && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-400/80 leading-relaxed">
              <Shirt className="mt-0.5 h-3 w-3 shrink-0" />
              {r.notes}
            </p>
          )}

          {/* Cost + booking method */}
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            {r.cost && <YenUsd text={r.cost} className="text-xs font-medium" />}
            {r.bookingMethod && !['BOOKED', 'Walk-in', '—'].includes(r.bookingMethod) && (
              <span className="flex items-center gap-1 text-[10px] text-tokyo">
                <ExternalLink className="h-3 w-3" /> {r.bookingMethod.substring(0, 50)}
              </span>
            )}
          </div>

          {/* Alarm info */}
          {r.alarm && r.alarm !== '—' && !r.alarm.toLowerCase().includes('booked') && r.status !== 'booked' && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-soon leading-relaxed">
              <Bell className="mt-0.5 h-3 w-3 shrink-0" /> {r.alarm}
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
  )
}

function ActionGroup({ title, subtitle, items, color, defaultOpen = true }: {
  title: string
  subtitle?: string
  items: typeof reservations.reservations
  color: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="animate-fade-up">
      <button
        onClick={() => setOpen(o => !o)}
        className="mb-2.5 flex w-full items-center gap-2 text-left"
      >
        <span className={cn('text-[10px] font-semibold uppercase tracking-widest', color)}>
          {title}
        </span>
        <span className={cn(
          'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
          color === 'text-urgent' ? 'bg-urgent/15 text-urgent' :
          color === 'text-booked' ? 'bg-booked/15 text-booked' :
          color === 'text-soon' ? 'bg-soon/15 text-soon' :
          'bg-surface-2 text-text-tertiary'
        )}>
          {items.length}
        </span>
        {subtitle && (
          <span className="flex-1 text-[10px] text-text-tertiary truncate">{subtitle}</span>
        )}
        <ChevronDown className={cn(
          'h-4 w-4 text-text-tertiary transition-transform duration-200',
          !open && '-rotate-90'
        )} />
      </button>
      {open && (
        <div className="stagger-children space-y-2">
          {items.map((r, i) => (
            <ReservationCard key={i} r={r} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ReservationView() {
  const [viewMode, setViewMode] = useState<ViewMode>('action')

  const { actionGroups, statusGroups, alarmsByUrgency } = useMemo(() => {
    const items = reservations.reservations
    const alarms = reservations.alarms

    // Status-based grouping
    const statusGroups: Record<string, typeof items> = {
      booked: [],
      urgent: [],
      'book-soon': [],
      'walk-in': [],
    }
    for (const r of items) {
      const key = r.status === 'book-1-week' ? 'book-soon' : r.status === 'confirm' ? 'book-soon' : r.status
      if (statusGroups[key]) statusGroups[key].push(r)
      else statusGroups['walk-in'].push(r)
    }

    // Action-date-based grouping
    const now: typeof items = []
    const upcoming: typeof items = []
    const booked: typeof items = []
    const walkIn: typeof items = []

    for (const r of items) {
      if (r.status === 'booked') {
        booked.push(r)
      } else if (r.status === 'walk-in') {
        walkIn.push(r)
      } else {
        const parsed = parseActionDate(r.alarm)
        if (parsed.isNow || parsed.isPast) {
          now.push(r)
        } else {
          upcoming.push(r)
        }
      }
    }

    // Sort upcoming by alarm/action date
    upcoming.sort((a, b) => {
      const aDate = parseActionDate(a.alarm).date
      const bDate = parseActionDate(b.alarm).date
      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      return aDate.getTime() - bDate.getTime()
    })

    // Sort booked by date
    booked.sort((a, b) => {
      const aMonth = a.date?.match(/Apr/) ? 4 : a.date?.match(/May/) ? 5 : 0
      const bMonth = b.date?.match(/Apr/) ? 4 : b.date?.match(/May/) ? 5 : 0
      const aDay = parseInt(a.date?.match(/\d+/)?.[0] || '0')
      const bDay = parseInt(b.date?.match(/\d+/)?.[0] || '0')
      return (aMonth * 100 + aDay) - (bMonth * 100 + bDay)
    })

    // Sort alarms by urgency
    const alarmsByUrgency = [...alarms].sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 }
      return (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3) - (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3)
    })

    return {
      actionGroups: { now, upcoming, booked, walkIn },
      statusGroups,
      alarmsByUrgency,
    }
  }, [])

  return (
    <div className="flex flex-col pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto max-w-lg">
          <h1 className="font-display text-2xl tracking-tight">Reservations</h1>

          {/* Stats bar */}
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-lg bg-booked/10 px-2 py-1 font-semibold text-booked">
              <CheckCircle className="h-3 w-3" /> {(viewMode === 'action' ? actionGroups.booked : statusGroups.booked).length}
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-urgent/10 px-2 py-1 font-semibold text-urgent">
              <AlertCircle className="h-3 w-3" /> {viewMode === 'action' ? actionGroups.now.length : statusGroups.urgent.length}
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-soon/10 px-2 py-1 font-semibold text-soon">
              <Clock className="h-3 w-3" /> {viewMode === 'action' ? actionGroups.upcoming.length : statusGroups['book-soon'].length}
            </span>
            <div className="flex-1" />
            {/* View toggle */}
            <div className="flex rounded-lg bg-surface p-0.5">
              <button
                onClick={() => setViewMode('action')}
                className={cn(
                  'rounded-md px-2 py-1 text-[10px] font-semibold transition-colors',
                  viewMode === 'action' ? 'bg-surface-2 text-text' : 'text-text-tertiary'
                )}
              >
                By Action
              </button>
              <button
                onClick={() => setViewMode('status')}
                className={cn(
                  'rounded-md px-2 py-1 text-[10px] font-semibold transition-colors',
                  viewMode === 'status' ? 'bg-surface-2 text-text' : 'text-text-tertiary'
                )}
              >
                By Status
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-6 p-4">
        {/* Calendar Alarms — always shown at top */}
        {alarmsByUrgency.length > 0 && (
          <div className="animate-fade-up">
            <div className="mb-2.5 flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-urgent" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-urgent">Set These Alarms</span>
            </div>
            <div className="rounded-2xl bg-urgent/[0.04] p-4 ring-1 ring-urgent/10">
              <div className="space-y-3">
                {alarmsByUrgency.map((alarm, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className={cn(
                      'shrink-0 rounded-md px-1.5 py-0.5 font-bold text-[10px]',
                      alarm.priority === 'CRITICAL' ? 'bg-urgent/15 text-urgent' :
                      alarm.priority === 'HIGH' ? 'bg-soon/15 text-soon' :
                      'bg-surface-2 text-text-tertiary'
                    )}>
                      {alarm.priority}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{alarm.date}</p>
                      <p className="mt-0.5 text-text-secondary leading-relaxed">{alarm.what}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'action' ? (
          <>
            {/* Action Now */}
            {actionGroups.now.length > 0 && (
              <ActionGroup
                title="Action Required Now"
                subtitle="Do these today"
                items={actionGroups.now}
                color="text-urgent"
              />
            )}

            {/* Upcoming actions */}
            {actionGroups.upcoming.length > 0 && (
              <ActionGroup
                title="Upcoming — Set Alarms"
                subtitle="Sorted by when to book"
                items={actionGroups.upcoming}
                color="text-soon"
              />
            )}

            {/* Confirmed */}
            {actionGroups.booked.length > 0 && (
              <ActionGroup
                title="Confirmed"
                items={actionGroups.booked}
                color="text-booked"
                defaultOpen={false}
              />
            )}

            {/* Walk-ins */}
            {actionGroups.walkIn.length > 0 && (
              <ActionGroup
                title="Walk-In — No Reservation"
                subtitle="Line-up strategy included"
                items={actionGroups.walkIn}
                color="text-text-tertiary"
                defaultOpen={false}
              />
            )}
          </>
        ) : (
          <>
            {Object.entries(statusGroups).map(([status, items]) => {
              if (items.length === 0) return null
              const config = statusConfig[status as keyof typeof statusConfig]
              return (
                <ActionGroup
                  key={status}
                  title={config.label}
                  items={items}
                  color={config.color}
                  defaultOpen={status !== 'walk-in'}
                />
              )
            })}
          </>
        )}

        {/* Notes footer */}
        <div className="animate-fade-up rounded-2xl bg-surface p-4">
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-text-tertiary" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Tips</span>
          </div>
          <ul className="space-y-1.5 text-xs text-text-secondary">
            <li>Dave's celiac: yakitori (salt), sashimi, grilled meats are safe. Tamari = GF soy sauce.</li>
            <li>Golden Week (Apr 29 - May 6): many family-run spots closed. Pre-GW Tokyo days are your best shot.</li>
            <li>Post-GW May 9 = normal hours, shorter lines.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
