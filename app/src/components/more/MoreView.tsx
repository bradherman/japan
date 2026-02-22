import { NavLink } from 'react-router-dom'
import { Train, Package, Settings, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'

const links = [
  { to: '/more/transport', icon: Train, label: 'Transport', desc: 'Day-by-day transit, costs' },
  { to: '/more/packing', icon: Package, label: 'Packing List', desc: 'Interactive checklist' },
  { to: '/more/settings', icon: Settings, label: 'Settings', desc: 'About this app' },
]

export function MoreView() {
  return (
    <div className="flex flex-col pb-20">
      <PageHeader title="More" />
      <div className="mx-auto w-full max-w-lg stagger-children space-y-2 p-4">
        {links.map(({ to, icon: Icon, label, desc }) => (
          <NavLink key={to} to={to}>
            <div className="flex items-center gap-3 rounded-2xl bg-surface p-4 transition-colors hover:bg-surface-2 active:bg-surface-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                <Icon className="h-5 w-5 text-text-secondary" />
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
