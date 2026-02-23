import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Search, X, ArrowLeft, Sparkles, Coffee, ShoppingBag, Compass, CalendarDays, Heart } from 'lucide-react'
import { recommendations } from '@/data'
import { CityBadge } from '@/components/ui/CityBadge'
import { YenUsd } from '@/components/ui/YenUsd'
import { cn } from '@/lib/utils'
import type { RecommendationCategory } from '@/lib/types'

type Tab = 'all' | 'coffee' | 'shopping' | 'activities' | 'events'

const tabs: Array<{ key: Tab; label: string; icon: typeof Sparkles; categories: RecommendationCategory[] }> = [
  { key: 'all', label: 'All', icon: Sparkles, categories: ['coffee', 'donuts', 'matcha', 'shopping', 'activities', 'events'] },
  { key: 'coffee', label: 'Coffee', icon: Coffee, categories: ['coffee', 'donuts', 'matcha'] },
  { key: 'shopping', label: 'Shopping', icon: ShoppingBag, categories: ['shopping'] },
  { key: 'activities', label: 'Activities', icon: Compass, categories: ['activities'] },
  { key: 'events', label: 'Events', icon: CalendarDays, categories: ['events'] },
]

const cities = ['All', 'Tokyo', 'Kyoto', 'Osaka', 'Hakone'] as const

const FAVORITES_KEY = 'japan-favorites'

function loadFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function saveFavorites(favs: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]))
}

const emptyMessages: Record<Tab, { icon: string; title: string; subtitle: string }> = {
  all: { icon: '', title: 'Nothing here yet', subtitle: 'Try a different search or filter' },
  coffee: { icon: '', title: 'No coffee spots found', subtitle: 'Adjust your filters — there\'s always coffee somewhere' },
  shopping: { icon: '', title: 'No shops match', subtitle: 'Try widening your search' },
  activities: { icon: '', title: 'No activities found', subtitle: 'Try a different city or search term' },
  events: { icon: '', title: 'No events match', subtitle: 'Check other cities or dates' },
}

export function RecommendationsView() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [city, setCity] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const activeTab = tabs.find(t => t.key === tab)!

  const filtered = useMemo(() => {
    let items = recommendations.filter(r => activeTab.categories.includes(r.category))
    if (city !== 'All') items = items.filter(r => r.city === city)
    if (showSaved) items = items.filter(r => favorites.has(r.id))
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.subcategory?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.neighborhood?.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.tags?.some(t => t.toLowerCase().includes(q))
      )
    }
    return items
  }, [tab, city, search, showSaved, favorites])

  const favCount = useMemo(() => {
    return recommendations.filter(r => favorites.has(r.id)).length
  }, [favorites])

  return (
    <div className="flex flex-col pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 pt-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/more')} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-surface transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Discover</h1>
              <p className="text-[10px] text-text-tertiary">Coffee, shopping, activities & events</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="mt-2.5 flex rounded-xl bg-surface p-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition-all',
                  tab === t.key
                    ? 'bg-accent/15 text-accent shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                <span className="hidden min-[380px]:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* City chips + Saved filter */}
          <div className="mt-2.5 flex gap-1.5">
            {cities.map(c => {
              const isActive = city === c
              const colorMap: Record<string, string> = {
                'Tokyo': 'bg-tokyo/15 text-tokyo ring-tokyo/30',
                'Kyoto': 'bg-kyoto/15 text-kyoto ring-kyoto/30',
                'Osaka': 'bg-osaka/15 text-osaka ring-osaka/30',
                'Hakone': 'bg-hakone/15 text-hakone ring-hakone/30',
                'All': 'bg-surface-2 text-text ring-border',
              }
              return (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    isActive
                      ? cn('ring-1', colorMap[c] || 'bg-surface-2 text-text ring-border')
                      : 'text-text-tertiary hover:text-text-secondary hover:bg-surface'
                  )}
                >
                  {c}
                </button>
              )
            })}
            <button
              onClick={() => setShowSaved(!showSaved)}
              className={cn(
                'ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
                showSaved
                  ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface'
              )}
            >
              <Heart className={cn('h-3 w-3', showSaved && 'fill-current')} />
              {favCount > 0 && <span>{favCount}</span>}
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-2.5 pb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={
                tab === 'coffee' ? 'Search cafes, roasters, matcha...' :
                tab === 'shopping' ? 'Search shops, watches, denim...' :
                tab === 'activities' ? 'Search temples, museums, onsen...' :
                tab === 'events' ? 'Search festivals, markets, shows...' :
                'Search all recommendations...'
              }
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
        <p className="mb-3 text-xs text-text-tertiary">
          {filtered.length} {filtered.length === 1 ? 'spot' : 'spots'}
          {showSaved && ' saved'}
        </p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-text-tertiary">
            <Search className="h-8 w-8 opacity-40" />
            <p className="text-sm">{emptyMessages[tab].title}</p>
            <p className="text-xs">{emptyMessages[tab].subtitle}</p>
          </div>
        ) : (
          <div className="stagger-children space-y-2">
            {filtered.map(r => (
              <div key={r.id} className={cn('relative rounded-2xl bg-surface p-4', `card-accent-${(r.city || 'tokyo').toLowerCase()}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{r.name}</span>
                      <CityBadge city={r.city} className="text-[9px]" />
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px] text-text-tertiary">
                      {r.subcategory && <span>{r.subcategory}</span>}
                      {r.subcategory && (r.price || r.neighborhood) && <span>·</span>}
                      {r.price && <YenUsd text={r.price} />}
                      {r.price && r.neighborhood && <span>·</span>}
                      {r.neighborhood && <span>{r.neighborhood}</span>}
                    </div>
                    {r.tags && r.tags.length > 0 && (
                      <div className="mt-1.5 flex gap-1 flex-wrap">
                        {r.tags.map(tag => (
                          <span key={tag} className={cn(
                            'rounded-md px-1.5 py-0.5 text-[9px] font-semibold',
                            tag === 'High Priority' ? 'bg-priority/15 text-priority' :
                            tag === 'Top Pick' ? 'bg-priority/15 text-priority' :
                            tag === 'Reservation Required' ? 'bg-red-500/15 text-red-400' :
                            tag === 'Free' ? 'bg-green-500/15 text-green-400' :
                            tag === 'Tax-Free' ? 'bg-green-500/15 text-green-400' :
                            tag === 'Multiple Locations' ? 'bg-blue-500/15 text-blue-400' :
                            'bg-surface-2 text-text-tertiary'
                          )}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.dates && (
                      <p className="mt-1.5 text-[11px] font-medium text-accent">{r.dates}</p>
                    )}
                    {r.description && (
                      <p className="mt-2 text-xs text-text-secondary leading-relaxed line-clamp-2">{r.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleFavorite(r.id)}
                      aria-label={favorites.has(r.id) ? 'Remove from saved' : 'Save'}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                        favorites.has(r.id)
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-surface-2 text-text-tertiary hover:text-red-400'
                      )}
                    >
                      <Heart className={cn('h-4 w-4', favorites.has(r.id) && 'fill-current')} />
                    </button>
                    {r.mapLink && (
                      <a
                        href={r.mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Map to ${r.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-text-tertiary transition-colors hover:text-tokyo"
                      >
                        <MapPin className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
