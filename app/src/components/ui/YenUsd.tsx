import { useExchangeRate } from '@/hooks/useExchangeRate'
import { parseYen, yenToUsd } from '@/lib/currency'

/**
 * Displays a yen price with an inline USD conversion.
 * Yen in emerald, USD in a dimmer blue.
 * Pass the raw price string (e.g. "¥2,500" or "¥500-1,000/pp").
 */
export function YenUsd({ text, className }: { text: string; className?: string }) {
  const rate = useExchangeRate()
  const yen = parseYen(text)

  return (
    <span className={className}>
      <span className="text-emerald-400">{text}</span>
      {yen !== null && (
        <span className="ml-1 text-sky-400/60">({yenToUsd(yen, rate)})</span>
      )}
    </span>
  )
}
