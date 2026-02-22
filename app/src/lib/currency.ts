const CACHE_KEY = 'japan-exchange-rate'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const FALLBACK_RATE = 150 // reasonable fallback if API fails

interface CachedRate {
  rate: number // JPY per 1 USD
  ts: number
}

function loadCachedRate(): CachedRate | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw) as CachedRate
    if (Date.now() - cached.ts < CACHE_TTL) return cached
    return null // expired
  } catch {
    return null
  }
}

function saveCachedRate(rate: number) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, ts: Date.now() }))
}

let ratePromise: Promise<number> | null = null

export async function fetchExchangeRate(): Promise<number> {
  // Return cached if fresh
  const cached = loadCachedRate()
  if (cached) return cached.rate

  // Deduplicate concurrent fetches
  if (ratePromise) return ratePromise

  ratePromise = (async () => {
    try {
      // Free API, no key needed
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { rates: Record<string, number> }
      const rate = data.rates.JPY
      if (rate && rate > 0) {
        saveCachedRate(rate)
        return rate
      }
      throw new Error('Invalid rate')
    } catch {
      // Try fallback API
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as { rates: Record<string, number> }
        const rate = data.rates.JPY
        if (rate && rate > 0) {
          saveCachedRate(rate)
          return rate
        }
      } catch { /* fall through */ }

      // Use expired cache if available
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (raw) {
          const old = JSON.parse(raw) as CachedRate
          return old.rate
        }
      } catch { /* fall through */ }

      return FALLBACK_RATE
    } finally {
      ratePromise = null
    }
  })()

  return ratePromise
}

/** Get cached rate synchronously (returns fallback if not yet fetched) */
export function getCachedRate(): number {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const cached = JSON.parse(raw) as CachedRate
      return cached.rate
    }
  } catch { /* fall through */ }
  return FALLBACK_RATE
}

/** Extract numeric yen value from strings like "¥2,500", "~¥1,000", "¥500-1,000" */
export function parseYen(text: string): number | null {
  // Match yen amounts: ¥2,500 or ¥500 or 2,500円
  const m = text.match(/¥([\d,]+)/)
  if (m) return parseInt(m[1].replace(/,/g, ''), 10)
  const m2 = text.match(/([\d,]+)円/)
  if (m2) return parseInt(m2[1].replace(/,/g, ''), 10)
  return null
}

/** Convert yen to USD string */
export function yenToUsd(yen: number, rate: number): string {
  const usd = yen / rate
  if (usd < 100) return `$${usd.toFixed(2)}`
  return `$${Math.round(usd)}`
}

/** Convert USD to yen string */
export function usdToYen(usd: number, rate: number): string {
  const yen = Math.round(usd * rate)
  return `¥${yen.toLocaleString()}`
}
