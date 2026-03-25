import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Sun, CalendarDays, UtensilsCrossed, ClipboardCheck, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'

const tabs = [
  { to: '/', icon: CalendarDays, label: 'Itinerary' },
  { to: '/eat-drink', icon: UtensilsCrossed, label: 'Eat & Drink' },
  { to: '/today', icon: Sun, label: 'Today' },
  { to: '/reservations', icon: ClipboardCheck, label: 'Reservations' },
  { to: '/more', icon: MoreHorizontal, label: 'More' },
]

function getActiveIndex(pathname: string): number {
  if (pathname === '/') return 0
  const idx = tabs.findIndex((t, i) => i > 0 && pathname.startsWith(t.to))
  return idx >= 0 ? idx : 0
}

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeIndex = getActiveIndex(location.pathname)
  const prevIndexRef = useRef(activeIndex)

  // Clean up direction attribute after transition settles
  useEffect(() => {
    const timer = setTimeout(() => {
      delete document.documentElement.dataset.navDir
    }, 400)
    prevIndexRef.current = activeIndex
    return () => clearTimeout(timer)
  }, [activeIndex])

  const handleTabClick = (e: React.MouseEvent, to: string, index: number) => {
    e.preventDefault()
    if (index === prevIndexRef.current) return

    // Set direction for CSS view-transition animations
    document.documentElement.dataset.navDir = index > prevIndexRef.current ? 'forward' : 'back'

    if ('startViewTransition' in document) {
      ;(document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        flushSync(() => navigate(to))
      })
    } else {
      navigate(to)
    }
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg/95 backdrop-blur-xl safe-area-pb"
      style={{ viewTransitionName: 'bottom-nav' }}
    >
      <div className="relative mx-auto flex max-w-lg">
        {/* Sliding indicator — single element that springs between tabs */}
        <span
          className="absolute top-0 h-[2px] w-8 rounded-full bg-accent"
          style={{
            left: `calc(${activeIndex} * (100% / ${tabs.length}) + (100% / ${tabs.length} / 2) - 1rem)`,
            transition: 'left 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />

        {tabs.map(({ to, icon: Icon, label }, index) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={(e) => handleTabClick(e, to, index)}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors relative',
                isActive ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn(
                  'relative flex items-center justify-center transition-transform duration-300',
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
