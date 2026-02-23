import { useState, useCallback } from 'react'
import { ArrowLeft, ArrowUpDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { cn } from '@/lib/utils'

type Direction = 'usd-to-jpy' | 'jpy-to-usd'

const quickAmountsUsd = [1, 5, 10, 20, 50, 100]
const quickAmountsJpy = [100, 500, 1000, 3000, 5000, 10000]

export function CurrencyView() {
  const navigate = useNavigate()
  const rate = useExchangeRate()
  const [direction, setDirection] = useState<Direction>('usd-to-jpy')
  const [input, setInput] = useState('')

  const isUsdToJpy = direction === 'usd-to-jpy'
  const numericInput = parseFloat(input.replace(/,/g, '')) || 0

  const converted = isUsdToJpy
    ? Math.round(numericInput * rate)
    : numericInput / rate

  const formattedResult = isUsdToJpy
    ? `¥${converted.toLocaleString()}`
    : converted < 1
      ? `$${converted.toFixed(2)}`
      : converted < 10
        ? `$${converted.toFixed(2)}`
        : `$${converted.toFixed(2)}`

  const swap = useCallback(() => {
    setDirection(d => d === 'usd-to-jpy' ? 'jpy-to-usd' : 'usd-to-jpy')
    setInput('')
  }, [])

  const quickAmounts = isUsdToJpy ? quickAmountsUsd : quickAmountsJpy

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
            <div>
              <h1 className="font-display text-2xl tracking-tight">Currency</h1>
              <p className="text-[11px] text-text-tertiary">
                1 USD = ¥{rate.toFixed(1)} <span className="text-text-tertiary/60">· updated daily</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-6 p-4">
        {/* Converter card */}
        <div className="animate-fade-up rounded-2xl bg-surface p-5">
          {/* From */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
              {isUsdToJpy ? 'USD' : 'JPY'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-text-tertiary">
                {isUsdToJpy ? '$' : '¥'}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={input}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9.,]/g, '')
                  setInput(v)
                }}
                placeholder="0"
                className="w-full rounded-xl bg-surface-2 py-4 pl-10 pr-4 text-right text-2xl font-bold tabular-nums text-text outline-none ring-1 ring-transparent transition-all focus:ring-border"
                autoFocus
              />
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center py-3">
            <button
              onClick={swap}
              aria-label="Swap currencies"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-text-tertiary transition-all hover:bg-surface-3 hover:text-text active:scale-95"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>

          {/* To */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
              {isUsdToJpy ? 'JPY' : 'USD'}
            </label>
            <div className={cn(
              'rounded-xl bg-surface-2 py-4 px-4 text-right text-2xl font-bold tabular-nums',
              isUsdToJpy ? 'text-emerald-400' : 'text-sky-400'
            )}>
              {numericInput > 0 ? formattedResult : isUsdToJpy ? '¥0' : '$0.00'}
            </div>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="animate-fade-up" style={{ animationDelay: '50ms' }}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Quick Convert</p>
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.map(amount => {
              const result = isUsdToJpy
                ? `¥${Math.round(amount * rate).toLocaleString()}`
                : `$${(amount / rate).toFixed(amount >= 1000 ? 1 : 2)}`
              return (
                <button
                  key={amount}
                  onClick={() => setInput(String(amount))}
                  className="flex flex-col items-center gap-0.5 rounded-xl bg-surface p-3 ring-1 ring-border/30 transition-all hover:ring-border active:bg-surface-2"
                >
                  <span className="text-sm font-bold">
                    {isUsdToJpy ? `$${amount}` : `¥${amount.toLocaleString()}`}
                  </span>
                  <span className={cn(
                    'text-xs font-mono',
                    isUsdToJpy ? 'text-emerald-400/70' : 'text-sky-400/70'
                  )}>
                    {result}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Common prices reference */}
        <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Common Prices</p>
          <div className="rounded-2xl bg-surface p-4">
            <div className="space-y-2.5">
              {[
                { item: 'Convenience store onigiri', yen: 150 },
                { item: 'Vending machine drink', yen: 160 },
                { item: 'Bowl of ramen', yen: 1000 },
                { item: 'Sushi lunch set', yen: 2500 },
                { item: 'Nice dinner for 2', yen: 15000 },
                { item: 'Tokyo Metro single ride', yen: 200 },
                { item: 'Shinkansen Tokyo→Kyoto', yen: 13320 },
                { item: 'Craft cocktail', yen: 1500 },
              ].map(({ item, yen }) => (
                <div key={item} className="flex items-baseline justify-between text-xs">
                  <span className="text-text-secondary">{item}</span>
                  <div className="flex items-baseline gap-2 tabular-nums">
                    <span className="font-mono text-emerald-400">¥{yen.toLocaleString()}</span>
                    <span className="font-mono text-sky-400/60">${(yen / rate).toFixed(yen >= 5000 ? 0 : 2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
