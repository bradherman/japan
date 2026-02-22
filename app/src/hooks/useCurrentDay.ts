import { useMemo } from 'react'
import { schedule, itinerary } from '@/data'

export function useCurrentDay(dayNumber: number) {
  return useMemo(() => {
    const daySchedule = schedule.find(s => s.dayNumber === dayNumber)
    const dayItinerary = itinerary.days.find(d => d.dayNumber === dayNumber)
    return { daySchedule, dayItinerary }
  }, [dayNumber])
}
