import { NavLink } from 'react-router-dom'
import { Sun, CalendarDays, UtensilsCrossed, ClipboardCheck, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', icon: Sun, label: 'Today' },
  { to: '/itinerary', icon: CalendarDays, label: 'Itinerary' },
  { to: '/eat-drink', icon: UtensilsCrossed, label: 'Eat & Drink' },
  { to: '/reservations', icon: ClipboardCheck, label: 'Reservations' },
  { to: '/more', icon: MoreHorizontal, label: 'More' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg/90 backdrop-blur-xl safe-area-pb">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn('relative flex items-center justify-center', isActive && 'drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]')}>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
