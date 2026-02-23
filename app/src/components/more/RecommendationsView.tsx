import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Search, X, ArrowLeft, Sparkles, Coffee, ShoppingBag, Compass, CalendarDays, Heart } from 'lucide-react'
import { recommendations } from '@/data'
import { CityBadge } from '@/components/ui/CityBadge'
import { YenUsd } from '@/components/ui/YenUsd'
import { cn } from '@/lib/utils'
import type { RecommendationCategory } from '@/lib/types'

type Tab = 'all' | 'coffee' | 'shopping' | 'activities' | 'events'

const tabs: Array<{
  key: Tab
  label: string
  icon: typeof Sparkles
  categories: RecommendationCategory[]
  color: string
  activeColor: string
  glowClass: string
}> = [
  { key: 'all', label: 'All', icon: Sparkles, categories: ['coffee', 'donuts', 'matcha', 'shopping', 'activities', 'events'], color: 'text-text', activeColor: 'bg-surface-2 text-text shadow-sm', glowClass: 'cat-glow-all' },
  { key: 'coffee', label: 'Coffee', icon: Coffee, categories: ['coffee', 'donuts', 'matcha'], color: 'text-coffee', activeColor: 'bg-coffee/15 text-coffee shadow-sm', glowClass: 'cat-glow-coffee' },
  { key: 'shopping', label: 'Shopping', icon: ShoppingBag, categories: ['shopping'], color: 'text-shopping', activeColor: 'bg-shopping/15 text-shopping shadow-sm', glowClass: 'cat-glow-shopping' },
  { key: 'activities', label: 'Activities', icon: Compass, categories: ['activities'], color: 'text-activities', activeColor: 'bg-activities/15 text-activities shadow-sm', glowClass: 'cat-glow-activities' },
  { key: 'events', label: 'Events', icon: CalendarDays, categories: ['events'], color: 'text-events', activeColor: 'bg-events/15 text-events shadow-sm', glowClass: 'cat-glow-events' },
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

const categoryIcon: Record<string, typeof Coffee> = {
  coffee: Coffee,
  donuts: Coffee,
  matcha: Coffee,
  shopping: ShoppingBag,
  activities: Compass,
  events: CalendarDays,
}

const categoryColor: Record<string, string> = {
  coffee: 'text-coffee bg-coffee/12',
  donuts: 'text-coffee bg-coffee/12',
  matcha: 'text-coffee bg-coffee/12',
  shopping: 'text-shopping bg-shopping/12',
  activities: 'text-activities bg-activities/12',
  events: 'text-events bg-events/12',
}

const emptyMessages: Record<Tab, { title: string; subtitle: string }> = {
  all: { title: 'Nothing matches', subtitle: 'Try a different search or filter' },
  coffee: { title: 'No coffee spots', subtitle: 'There\'s always coffee somewhere...' },
  shopping: { title: 'No shops found', subtitle: 'Try widening your search' },
  activities: { title: 'No activities found', subtitle: 'Try a different city' },
  events: { title: 'No events found', subtitle: 'Check other cities or dates' },
}

export function RecommendationsView() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [city, setCity] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)
  const [justToggled, setJustToggled] = useState<string | null>(null)

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
    setJustToggled(id)
    setTimeout(() => setJustToggled(null), 400)
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
    <div className={cn('flex flex-col pb-20', activeTab.glowClass)}>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 pt-3">
          {/* Title row */}
          <div className="flex items-center gap-3 animate-fade-up">
            <button onClick={() => navigate('/more')} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-surface transition-colors active:scale-95">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-2xl tracking-tight">Discover</h1>
            </div>
          </div>

          {/* Tab switcher */}
          <div
            className="mt-3 flex rounded-xl bg-surface p-1 animate-fade-up"
            style={{ animationDelay: '30ms' }}
          >
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition-all duration-200',
                  tab === t.key
                    ? t.activeColor
                    : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                <t.icon className={cn('h-3.5 w-3.5 transition-transform duration-200', tab === t.key && 'scale-110')} />
                <span className="hidden min-[380px]:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* City chips + Saved filter */}
          <div className="mt-2.5 flex gap-1.5 animate-fade-up" style={{ animationDelay: '60ms' }}>
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
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200',
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
                'ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200',
                showSaved
                  ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface'
              )}
            >
              <Heart className={cn('h-3 w-3 transition-transform duration-200', showSaved && 'fill-current scale-110')} />
              {favCount > 0 && <span>{favCount}</span>}
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-2.5 pb-3 animate-fade-up" style={{ animationDelay: '90ms' }}>
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
              className="w-full rounded-xl bg-surface py-2.5 pl-9 pr-8 text-sm text-text placeholder:text-text-tertiary outline-none ring-1 ring-transparent transition-all duration-200 focus:ring-border"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg p-4">
        <p className="mb-3 text-xs text-text-tertiary animate-fade-up" style={{ animationDelay: '120ms' }}>
          {filtered.length} {filtered.length === 1 ? 'spot' : 'spots'}
          {showSaved && ' saved'}
        </p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-text-tertiary animate-fade-up">
            <div className="animate-float">
              <activeTab.icon className="h-10 w-10 opacity-20" />
            </div>
            <p className="font-display text-lg italic text-text-secondary">{emptyMessages[tab].title}</p>
            <p className="text-xs">{emptyMessages[tab].subtitle}</p>
          </div>
        ) : (
          <div className="stagger-children space-y-2">
            {filtered.map(r => {
              const CatIcon = categoryIcon[r.category] || Sparkles
              const catColor = categoryColor[r.category] || 'text-text-tertiary bg-surface-2'
              const isPriority = r.tags?.some(t => t === 'High Priority' || t === 'Top Pick')

              return (
                <div
                  key={r.id}
                  className={cn(
                    'relative rounded-2xl bg-surface p-4 card-interactive',
                    `card-accent-${(r.city || 'tokyo').toLowerCase()}`,
                    isPriority && 'priority-shimmer'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Category indicator */}
                        <span className={cn('flex h-5 w-5 items-center justify-center rounded-md', catColor)}>
                          <CatIcon className="h-3 w-3" />
                        </span>
                        <span className="text-sm font-semibold">{r.name}</span>
                        <CityBadge city={r.city} className="text-[9px]" />
                      </div>
                      <div className="mt-1 ml-7 flex items-center gap-1.5 flex-wrap text-[11px] text-text-tertiary">
                        {r.subcategory && <span>{r.subcategory}</span>}
                        {r.subcategory && (r.price || r.neighborhood) && <span>·</span>}
                        {r.price && <YenUsd text={r.price} />}
                        {r.price && r.neighborhood && <span>·</span>}
                        {r.neighborhood && <span>{r.neighborhood}</span>}
                      </div>
                      {r.tags && r.tags.length > 0 && (
                        <div className="mt-1.5 ml-7 flex gap-1 flex-wrap">
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
                        <p className="mt-1.5 ml-7 text-[11px] font-medium text-events">{r.dates}</p>
                      )}
                      {r.description && (
                        <p className="mt-2 ml-7 text-xs text-text-secondary leading-relaxed line-clamp-2">{r.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleFavorite(r.id)}
                        aria-label={favorites.has(r.id) ? 'Remove from saved' : 'Save'}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200',
                          favorites.has(r.id)
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-surface-2 text-text-tertiary hover:text-red-400'
                        )}
                      >
                        <Heart className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          favorites.has(r.id) && 'fill-current',
                          justToggled === r.id && 'animate-heart-pop'
                        )} />
                      </button>
                      {r.mapLink && (
                        <a
                          href={r.mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Map to ${r.name}`}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-text-tertiary transition-all duration-200 hover:text-tokyo hover:scale-105 active:scale-95"
                        >
                          <MapPin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
