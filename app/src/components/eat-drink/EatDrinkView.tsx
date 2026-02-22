import { useState, useMemo } from 'react'
import { MapPin, Search, X, UtensilsCrossed, Wine } from 'lucide-react'
import { restaurants, nightlife } from '@/data'
import { CityBadge } from '@/components/ui/CityBadge'
import { cn } from '@/lib/utils'

type Tab = 'restaurants' | 'nightlife'
const cities = ['All', 'Tokyo', 'Kyoto', 'Osaka'] as const

export function EatDrinkView() {
  const [tab, setTab] = useState<Tab>('restaurants')
  const [city, setCity] = useState<string>('All')
  const [search, setSearch] = useState('')

  const filteredRestaurants = useMemo(() => {
    let items = restaurants
    if (city !== 'All') items = items.filter(r => r.city === city)
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.neighborhood?.toLowerCase().includes(q) ||
        r.whatToOrder?.toLowerCase().includes(q)
      )
    }
    return items
  }, [city, search])

  const filteredVenues = useMemo(() => {
    let items = nightlife.venues
    if (city !== 'All') items = items.filter(v => v.city === city)
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.category?.toLowerCase().includes(q) ||
        v.neighborhood?.toLowerCase().includes(q) ||
        v.vibe?.toLowerCase().includes(q)
      )
    }
    return items
  }, [city, search])

  const count = tab === 'restaurants' ? filteredRestaurants.length : filteredVenues.length

  return (
    <div className="flex flex-col pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 pt-3">
          <h1 className="text-lg font-bold">Eat & Drink</h1>

          {/* Tab switcher */}
          <div className="mt-2.5 flex rounded-xl bg-surface p-1">
            {([
              { key: 'restaurants' as Tab, label: 'Restaurants', icon: UtensilsCrossed },
              { key: 'nightlife' as Tab, label: 'Nightlife', icon: Wine },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                  tab === t.key
                    ? 'bg-surface-2 text-text shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* City chips */}
          <div className="mt-2.5 flex gap-1.5">
            {cities.map(c => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  city === c
                    ? 'bg-surface-2 text-text ring-1 ring-border'
                    : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mt-2.5 pb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'restaurants' ? 'Search restaurants, cuisines...' : 'Search bars, venues...'}
              aria-label="Search"
              className="w-full rounded-xl bg-surface py-2.5 pl-9 pr-8 text-sm text-text placeholder:text-text-tertiary outline-none ring-1 ring-transparent transition-all focus:ring-border"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg p-4">
        <p className="mb-3 text-xs text-text-tertiary">{count} {tab === 'restaurants' ? 'restaurants' : 'venues'}</p>

        {count === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-text-tertiary">
            <Search className="h-8 w-8 opacity-40" />
            <p className="text-sm">No {tab} found</p>
            <p className="text-xs">Try a different search or filter</p>
          </div>
        ) : (
          <div className="stagger-children space-y-2">
            {tab === 'restaurants' ? (
              filteredRestaurants.map(r => (
                <div key={r.id} className="rounded-2xl bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{r.name}</span>
                        <CityBadge city={r.city} className="text-[9px]" />
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px] text-text-tertiary">
                        {r.category && <span>{r.category}</span>}
                        {r.category && r.price && <span>·</span>}
                        {r.price && <span className="text-emerald-400">{r.price}</span>}
                        {(r.category || r.price) && r.neighborhood && <span>·</span>}
                        {r.neighborhood && <span>{r.neighborhood}</span>}
                      </div>
                      {r.tags && r.tags.length > 0 && (
                        <div className="mt-1.5 flex gap-1 flex-wrap">
                          {r.tags.map(tag => (
                            <span key={tag} className={cn(
                              'rounded-md px-1.5 py-0.5 text-[9px] font-semibold',
                              tag === 'Michelin' ? 'bg-red-500/15 text-red-400' :
                              tag === 'Top Pick' ? 'bg-priority/15 text-priority' :
                              tag === 'Cash Only' ? 'bg-amber-500/15 text-amber-400' :
                              'bg-surface-2 text-text-tertiary'
                            )}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {r.whatToOrder && (
                        <p className="mt-2 text-xs text-text-secondary leading-relaxed line-clamp-2">{r.whatToOrder}</p>
                      )}
                    </div>
                    {r.mapLink && (
                      <a
                        href={r.mapLink}
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
              ))
            ) : (
              filteredVenues.map(v => (
                <div key={v.id} className="rounded-2xl bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{v.name}</span>
                        <CityBadge city={v.city} className="text-[9px]" />
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px] text-text-tertiary">
                        {v.category && <span>{v.category}</span>}
                        {v.category && v.neighborhood && <span>·</span>}
                        {v.neighborhood && <span>{v.neighborhood}</span>}
                        {v.cover && <><span>·</span><span className="text-emerald-400">{v.cover}</span></>}
                      </div>
                      {v.tags && v.tags.length > 0 && (
                        <div className="mt-1.5 flex gap-1 flex-wrap">
                          {v.tags.map(tag => (
                            <span key={tag} className={cn(
                              'rounded-md px-1.5 py-0.5 text-[9px] font-semibold',
                              tag === 'Top Pick' ? 'bg-priority/15 text-priority' :
                              'bg-surface-2 text-text-tertiary'
                            )}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {v.vibe && (
                        <p className="mt-2 text-xs text-text-secondary leading-relaxed line-clamp-2">{v.vibe}</p>
                      )}
                    </div>
                    {v.mapLink && (
                      <a
                        href={v.mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Map to ${v.name}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-tertiary transition-colors hover:text-tokyo"
                      >
                        <MapPin className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
