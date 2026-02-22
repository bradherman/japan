import { useState, useCallback } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { packing } from '@/data'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'japan-packing-checked'

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

export function PackingView() {
  const navigate = useNavigate()
  const [checked, setChecked] = useState<Set<string>>(loadChecked)

  const toggle = useCallback((id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveChecked(next)
      return next
    })
  }, [])

  const totalItems = packing.reduce((a, c) => a + c.items.length, 0)
  const checkedCount = packing.reduce((a, c) => a + c.items.filter(i => checked.has(i.id)).length, 0)
  const pct = Math.round((checkedCount / totalItems) * 100)

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
              <h1 className="text-lg font-bold">Packing List</h1>
              <p className="text-xs text-text-tertiary">{checkedCount} / {totalItems} packed · {pct}%</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2.5 h-1 w-full rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-1 rounded-full bg-booked transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-6 p-4">
        {packing.map((category, ci) => {
          const catChecked = category.items.filter(i => checked.has(i.id)).length
          return (
            <div key={ci} className="animate-fade-up" style={{ animationDelay: `${ci * 30}ms` }}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  {category.name}
                </h2>
                <span className="text-[10px] text-text-tertiary tabular-nums">{catChecked}/{category.items.length}</span>
              </div>
              <div className="space-y-0.5">
                {category.items.map(item => {
                  const isChecked = checked.has(item.id)
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
                        isChecked ? 'border-booked bg-booked' : 'border-surface-3'
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
