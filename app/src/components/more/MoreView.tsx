import { NavLink } from 'react-router-dom'
import { Train, Package, Settings, ChevronRight, CircleDollarSign, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'

const links = [
  { to: '/more/recommendations', icon: Sparkles, label: 'Discover', desc: 'Coffee, shopping, activities & events', color: 'bg-accent/15 text-accent' },
  { to: '/more/transport', icon: Train, label: 'Transport', desc: 'Day-by-day transit, costs', color: 'bg-tokyo/15 text-tokyo' },
  { to: '/more/packing', icon: Package, label: 'Packing List', desc: 'Interactive checklist', color: 'bg-booked/15 text-booked' },
  { to: '/more/currency', icon: CircleDollarSign, label: 'Currency', desc: 'USD ↔ Yen converter', color: 'bg-osaka/15 text-osaka' },
  { to: '/more/settings', icon: Settings, label: 'Settings', desc: 'About this app', color: 'bg-text-tertiary/15 text-text-secondary' },
]

export function MoreView() {
  return (
    <div className="flex flex-col pb-20">
      <PageHeader title="More" />
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 p-4">
        {links.map(({ to, icon: Icon, label, desc, color }) => (
          <NavLink key={to} to={to} className="animate-fade-up block">
            <div className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border/50 transition-all hover:ring-border active:bg-surface-2">
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
