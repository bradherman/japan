import { useState, useCallback, useMemo } from 'react'
import { ArrowLeft, Check, PartyPopper } from 'lucide-react'
import { packing } from '@/data'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'japan-packing-checked'
const GENDER_KEY = 'japan-packing-gender'

type Gender = 'male' | 'female'

function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveChecked(checked: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]))
}

function loadGender(): Gender {
  return (localStorage.getItem(GENDER_KEY) as Gender) || 'male'
}

function getMilestoneMessage(pct: number): string | null {
  if (pct === 100) return null
  if (pct >= 75) return 'Almost there! Just the essentials left.'
  if (pct >= 50) return 'Halfway packed. Looking good.'
  if (pct >= 25) return 'Nice start. Keep going!'
  return null
}

export function PackingView() {
  const navigate = useNavigate()
  const [checked, setChecked] = useState<Set<string>>(loadChecked)
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null)
  const [gender, setGender] = useState<Gender>(loadGender)

  const categories = useMemo(() => packing[gender], [gender])

  const handleGenderChange = useCallback((g: Gender) => {
    setGender(g)
    localStorage.setItem(GENDER_KEY, g)
  }, [])

  const toggle = useCallback((id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setLastCheckedId(null)
      } else {
        next.add(id)
        setLastCheckedId(id)
      }
      saveChecked(next)
      return next
    })
  }, [])

  const totalItems = categories.reduce((a, c) => a + c.items.length, 0)
  const checkedCount = categories.reduce((a, c) => a + c.items.filter(i => checked.has(i.id)).length, 0)
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0
  const allDone = checkedCount === totalItems && totalItems > 0
  const milestone = getMilestoneMessage(pct)

  return (
    <div className="flex flex-col pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/more')}
              aria-label="Back to more"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-display text-2xl tracking-tight">Packing List</h1>
              <p className="text-xs text-text-tertiary">
                {allDone ? 'All packed! Ready for Japan.' : `${checkedCount} / ${totalItems} packed · ${pct}%`}
              </p>
            </div>
            {allDone && (
              <span className="animate-gentle-pulse text-booked">
                <PartyPopper className="h-5 w-5" />
              </span>
            )}
          </div>

          {/* Gender toggle */}
          <div className="mt-3 flex gap-1 rounded-xl bg-surface p-1">
            <button
              onClick={() => handleGenderChange('male')}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all',
                gender === 'male'
                  ? 'bg-surface-2 text-text shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              Brad
            </button>
            <button
              onClick={() => handleGenderChange('female')}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all',
                gender === 'female'
                  ? 'bg-surface-2 text-text shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              Alyona
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all duration-500 ease-out',
                allDone ? 'bg-booked shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-booked'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          {milestone && (
            <p className="mt-1.5 text-[11px] text-text-tertiary">{milestone}</p>
          )}
        </div>
      </header>

      {/* Completion celebration */}
      {allDone && (
        <div className="mx-auto w-full max-w-lg px-4 pt-4">
          <div className="animate-fade-up rounded-2xl bg-booked/8 p-4 ring-1 ring-booked/20 text-center">
            <p className="text-sm font-semibold text-booked">Bags are packed!</p>
            <p className="mt-0.5 text-xs text-text-secondary">Passport, chargers, snacks for the flight. You got this.</p>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-lg space-y-6 p-4">
        {categories.map((category, ci) => {
          const catChecked = category.items.filter(i => checked.has(i.id)).length
          const catDone = catChecked === category.items.length
          return (
            <div key={`${gender}-${ci}`} className="animate-fade-up" style={{ animationDelay: `${ci * 30}ms` }}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className={cn(
                  'text-[10px] font-semibold uppercase tracking-widest',
                  catDone ? 'text-booked' : 'text-text-tertiary'
                )}>
                  {category.name} {catDone && '✓'}
                </h2>
                <span className="text-[10px] text-text-tertiary tabular-nums">{catChecked}/{category.items.length}</span>
              </div>
              <div className="space-y-0.5">
                {category.items.map(item => {
                  const isChecked = checked.has(item.id)
                  const justChecked = lastCheckedId === item.id && isChecked
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                        isChecked ? 'bg-booked/[0.04]' : 'hover:bg-surface active:bg-surface-2'
                      )}
                    >
                      <div className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all',
                        isChecked ? 'border-booked bg-booked' : 'border-surface-3',
                        justChecked && 'animate-check-pop'
                      )}>
                        {isChecked && <Check className="h-3 w-3 text-bg" strokeWidth={3} />}
                      </div>
                      <span className={cn(
                        'text-sm transition-all',
                        isChecked && 'text-text-tertiary line-through'
                      )}>
                        {item.text}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
