import type { Restaurant, Venue, EveningItinerary, Recommendation } from '@/lib/types'
import itineraryData from './generated/itinerary.json'
import scheduleData from './generated/daily-schedule.json'
import reservationsData from './generated/reservations.json'
import transportData from './generated/transport.json'
import packingData from './generated/packing.json'
import restaurantsData from './generated/restaurants.json'
import nightlifeData from './generated/nightlife.json'
import recommendationsData from './generated/recommendations.json'

// Use loose types for JSON data — fields may be missing on individual items
type ItineraryData = {
  hotels: Array<{ dates: string; city: string; name: string; mapLink: string }>
  days: Array<{
    dayNumber: number; date: string; dayOfWeek: string; title: string; city: string
    subtitle?: string
    morningCoffee?: { name: string; mapLink?: string; description?: string }
    sections: Array<{
      title: string; subtitle?: string
      activities: Array<{
        name: string; time?: string; description?: string; mapLink?: string
        price?: string; priority?: boolean; reservationRequired?: boolean
        lineUpTip?: string; tags?: string[]
      }>
    }>
    logistics: Array<{ text: string }>
  }>
}

type ScheduleData = Array<{
  dayNumber: number; date: string; title: string
  entries: Array<{ time: string; text: string; isWarning?: boolean; isBackup?: boolean }>
  notes?: string[]
}>

type ReservationItem = {
  name: string; details?: string; date?: string; time?: string; cost?: string
  bookingMethod?: string; mapLink?: string; alarm?: string
  status: string; category: string
}

type TransportData = {
  days: Array<{
    dayNumber: number; date: string; title: string
    legs: Array<{ time?: string; from: string; to: string; transport: string; duration: string; cost: string; notes?: string }>
    notes?: string[]
  }>
  costs: Array<{ segment: string; cost: string }>
  luggage: Array<{ sendDate: string; route: string; arrives: string; cost: string }>
}

type PackingCategory = {
  name: string
  items: Array<{ id: string; text: string; checked: boolean }>
}

type PackingData = {
  male: PackingCategory[]
  female: PackingCategory[]
}

export const itinerary = itineraryData as unknown as ItineraryData
export const schedule = scheduleData as unknown as ScheduleData
export const reservations = reservationsData as unknown as { reservations: ReservationItem[]; alarms: Array<{ date: string; what: string; priority: string }> }
export const transport = transportData as unknown as TransportData
export const packing = packingData as unknown as PackingData
export const restaurants = restaurantsData as unknown as Restaurant[]
export const nightlife = nightlifeData as unknown as { venues: Venue[]; itineraries: EveningItinerary[] }
export const recommendations = recommendationsData as unknown as Recommendation[]
