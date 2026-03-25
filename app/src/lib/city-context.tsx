import { createContext, useContext, useState, type ReactNode } from 'react'
import type { City } from './types'

interface CityContextValue {
  city: City | null
  setCity: (city: City | null) => void
}

const CityContext = createContext<CityContextValue>({ city: null, setCity: () => {} })

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState<City | null>('Tokyo')
  return (
    <CityContext.Provider value={{ city, setCity }}>
      {children}
    </CityContext.Provider>
  )
}

export function useCity() {
  return useContext(CityContext)
}
