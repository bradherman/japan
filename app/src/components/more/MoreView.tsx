import { NavLink } from 'react-router-dom'
import { Train, Package, Settings, ChevronRight, CircleDollarSign, Sparkles, Coffee, ShoppingBag, Compass, CalendarDays } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'

const links = [
  { to: '/more/transport', icon: Train, label: 'Transport', desc: 'Day-by-day transit, costs', color: 'bg-tokyo/15 text-tokyo' },
  { to: '/more/packing', icon: Package, label: 'Packing List', desc: 'Interactive checklist', color: 'bg-booked/15 text-booked' },
  { to: '/more/currency', icon: CircleDollarSign, label: 'Currency', desc: 'USD ↔ Yen converter', color: 'bg-osaka/15 text-osaka' },
  { to: '/more/settings', icon: Settings, label: 'Settings', desc: 'About this app', color: 'bg-text-tertiary/15 text-text-secondary' },
]

const discoverPills = [
  { icon: Coffee, label: 'Coffee', color: 'text-coffee bg-coffee/12' },
  { icon: ShoppingBag, label: 'Shopping', color: 'text-shopping bg-shopping/12' },
  { icon: Compass, label: 'Activities', color: 'text-activities bg-activities/12' },
  { icon: CalendarDays, label: 'Events', color: 'text-events bg-events/12' },
]

export function MoreView() {
  return (
    <div className="flex flex-col pb-20">
      <PageHeader title="More" />
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 p-4">
        {/* Hero Discover card */}
        <NavLink to="/more/recommendations" className="animate-fade-up block">
          <div className="relative overflow-hidden rounded-2xl bg-surface p-5 ring-1 ring-border/50 transition-all hover:ring-border active:bg-surface-2 card-interactive">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <p className="font-display text-xl tracking-tight">Discover</p>
                <p className="mt-0.5 text-xs text-text-tertiary">97 curated spots across Japan</p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-tertiary" />
            </div>
            <div className="mt-3 flex gap-2">
              {discoverPills.map(({ icon: Icon, label, color }) => (
                <span key={label} className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold', color)}>
                  <Icon className="h-3 w-3" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </NavLink>

        {/* Standard links */}
        {links.map(({ to, icon: Icon, label, desc, color }, i) => (
          <NavLink key={to} to={to} className="animate-fade-up block" style={{ animationDelay: `${(i + 1) * 40}ms` }}>
            <div className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border/50 transition-all hover:ring-border active:bg-surface-2 card-interactive">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-text-tertiary">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-tertiary" />
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  )
}
