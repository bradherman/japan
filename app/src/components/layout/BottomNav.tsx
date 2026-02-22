import { NavLink } from 'react-router-dom'
import { Sun, CalendarDays, UtensilsCrossed, ClipboardCheck, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', icon: CalendarDays, label: 'Itinerary' },
  { to: '/eat-drink', icon: UtensilsCrossed, label: 'Eat & Drink' },
  { to: '/today', icon: Sun, label: 'Today' },
  { to: '/reservations', icon: ClipboardCheck, label: 'Reservations' },
  { to: '/more', icon: MoreHorizontal, label: 'More' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg/95 backdrop-blur-xl safe-area-pb">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors relative',
                isActive ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-accent" />
                )}
                <span className={cn(
                  'relative flex items-center justify-center transition-transform',
                  isActive && 'scale-110'
                )}>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.75} />
                </span>
                <span className={cn(isActive && 'font-semibold')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
