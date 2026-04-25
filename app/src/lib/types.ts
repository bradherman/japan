// === Itinerary ===
export interface Hotel {
  dates: string
  city: City
  name: string
  mapLink: string
}

export type City = 'Tokyo' | 'Kyoto' | 'Osaka' | 'Hakone'

export interface Activity {
  time?: string
  name: string
  description?: string
  mapLink?: string
  price?: string
  /** How long to spend at the activity, e.g. "30-60 min", "1.5 hrs". */
  duration?: string
  priority?: boolean
  reservationRequired?: boolean
  booked?: boolean
  backup?: boolean
  notes?: string
  lineUpTip?: string
  tags?: string[]
  /** Used by the morning-card slot to switch label + icon between coffee and breakfast. */
  kind?: 'coffee' | 'breakfast'
}

export interface DaySection {
  title: string
  subtitle?: string
  activities: Activity[]
}

export interface LogisticsItem {
  text: string
}

export interface Day {
  dayNumber: number
  date: string
  dayOfWeek: string
  title: string
  city: City
  subtitle?: string
  summary?: string
  morningCoffee?: Activity
  sections: DaySection[]
  logistics: LogisticsItem[]
}

export interface Itinerary {
  hotels: Hotel[]
  days: Day[]
}

// === Daily Schedule ===
export interface ScheduleEntry {
  time: string
  text: string
  isWarning?: boolean
  isBackup?: boolean
}

export interface DaySchedule {
  dayNumber: number
  date: string
  title: string
  entries: ScheduleEntry[]
  notes?: string[]
}

// === Reservations ===
export type ReservationStatus = 'booked' | 'urgent' | 'book-soon' | 'book-1-week' | 'walk-in' | 'confirm'

export interface Reservation {
  name: string
  details?: string
  date?: string
  time?: string
  cost?: string
  bookingMethod?: string
  mapLink?: string
  alarm?: string
  notes?: string
  actionDate?: string
  status: ReservationStatus
  category: string
}

// === Transport ===
export interface TransitLeg {
  time?: string
  from: string
  to: string
  transport: string
  duration: string
  cost: string
  notes?: string
}

export interface TransportDay {
  dayNumber: number
  date: string
  title: string
  legs: TransitLeg[]
  notes?: string[]
}

// === Packing ===
export interface PackingCategory {
  name: string
  items: PackingItem[]
}

export interface PackingItem {
  id: string
  text: string
  checked: boolean
}

// === Restaurant Guide ===
export interface Restaurant {
  id: string
  name: string
  city: City | 'Nara'
  neighborhood?: string
  category: string
  subcategory?: string
  address?: string
  hours?: string
  closed?: string
  price?: string
  reservations?: string
  payment?: string
  whatToOrder?: string
  notes?: string
  goldenWeek?: string
  mapLink?: string
  tags?: string[]
  onItinerary?: boolean
}

// === Nightlife Guide ===
export interface Venue {
  id: string
  name: string
  city: City
  neighborhood?: string
  category: string
  subcategory?: string
  address?: string
  hours?: string
  cover?: string
  price?: string
  vibe?: string
  whyGo?: string
  mapLink?: string
  tags?: string[]
  onItinerary?: boolean
}

export interface EveningItinerary {
  name: string
  city: City
  steps: string[]
}

// === Recommendations ===
export type RecommendationCategory = 'coffee' | 'donuts' | 'matcha' | 'shopping' | 'activities' | 'events'

export interface Recommendation {
  id: string
  name: string
  category: RecommendationCategory
  subcategory?: string
  city: City | 'Nara'
  neighborhood?: string
  address?: string
  hours?: string
  closed?: string
  price?: string
  description?: string
  tip?: string
  tags?: string[]
  mapLink?: string
  dates?: string
  bookingInfo?: string
}
