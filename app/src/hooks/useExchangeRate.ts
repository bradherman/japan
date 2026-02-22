import { useState, useEffect } from 'react'
import { fetchExchangeRate, getCachedRate } from '@/lib/currency'

/** Returns the JPY/USD exchange rate. Starts with cached value, fetches fresh if stale. */
export function useExchangeRate(): number {
  const [rate, setRate] = useState(getCachedRate)

  useEffect(() => {
    fetchExchangeRate().then(setRate)
  }, [])

  return rate
}
