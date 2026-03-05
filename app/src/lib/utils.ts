import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { City } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Use constructor to avoid UTC midnight parse shifting dates back in US timezones
export const TRIP_START = new Date(2026, 3, 25) // Apr 25
export const TRIP_END = new Date(2026, 4, 10)   // May 10

export function getCityColor(city: City | string): string {
  switch (city) {
    case 'Tokyo': return 'bg-tokyo/20 text-tokyo'
    case 'Kyoto': return 'bg-kyoto/20 text-kyoto'
    case 'Osaka': return 'bg-osaka/20 text-osaka'
    case 'Hakone': return 'bg-hakone/20 text-hakone'
    default: return 'bg-surface-2 text-text-secondary'
  }
}

export function getCityAccent(city: City | string): string {
  switch (city) {
    case 'Tokyo': return 'text-tokyo'
    case 'Kyoto': return 'text-kyoto'
    case 'Osaka': return 'text-osaka'
    case 'Hakone': return 'text-hakone'
    default: return 'text-text-secondary'
  }
}

export function getCityBg(city: City | string): string {
  switch (city) {
    case 'Tokyo': return 'bg-tokyo'
    case 'Kyoto': return 'bg-kyoto'
    case 'Osaka': return 'bg-osaka'
    case 'Hakone': return 'bg-hakone'
    default: return 'bg-surface-2'
  }
}

export function getCityDimBg(city: City | string): string {
  switch (city) {
    case 'Tokyo': return 'bg-tokyo-dim'
    case 'Kyoto': return 'bg-kyoto-dim'
    case 'Osaka': return 'bg-osaka-dim'
    case 'Hakone': return 'bg-hakone-dim'
    default: return 'bg-surface-2'
  }
}

export function getCityTextColor(city: City | string): string {
  switch (city) {
    case 'Tokyo': return 'text-tokyo'
    case 'Kyoto': return 'text-kyoto'
    case 'Osaka': return 'text-osaka'
    case 'Hakone': return 'text-hakone'
    default: return 'text-text-secondary'
  }
}

export function getDayCity(dayNumber: number): City {
  if (dayNumber <= 5) return 'Tokyo'
  if (dayNumber === 6) return 'Kyoto' // travel day
  if (dayNumber <= 9) return 'Kyoto'
  if (dayNumber <= 12) return 'Osaka'
  if (dayNumber <= 14) return 'Hakone'
  return 'Tokyo'
}

export function getTripDay(): number | null {
  const now = new Date()
  const start = TRIP_START
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0 || diff > 15) return null
  return diff + 1
}

export function formatDate(dayNumber: number): string {
  const date = new Date(TRIP_START)
  date.setDate(date.getDate() + dayNumber - 1)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getDayOfWeek(dayNumber: number): string {
  const date = new Date(TRIP_START)
  date.setDate(date.getDate() + dayNumber - 1)
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function getTripCountdown(): { type: 'before' | 'during' | 'after'; days: number } {
  const now = new Date()
  const start = TRIP_START
  const end = TRIP_END
  const msPerDay = 1000 * 60 * 60 * 24
  if (now < start) return { type: 'before', days: Math.ceil((start.getTime() - now.getTime()) / msPerDay) }
  if (now > end) return { type: 'after', days: Math.floor((now.getTime() - end.getTime()) / msPerDay) }
  return { type: 'during', days: Math.floor((now.getTime() - start.getTime()) / msPerDay) + 1 }
}

export function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Night owl'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Night owl'
}

export function isBradsBirthday(dayNumber: number): boolean {
  return dayNumber === 12 // May 6 = Day 12
}

/** Extract the ?q= place name from a Google Maps URL */
export function extractPlaceName(mapUrl: string): string | null {
  const match = mapUrl.match(/[?&]q=([^&]+)/)
  return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null
}

/** Build a Google Maps route URL for a day, starting and ending at the hotel */
export function buildDayMapUrl(
  mapLinks: string[],
  hotelMapLink?: string
): string | null {
  const places = mapLinks
    .map(extractPlaceName)
    .filter((p): p is string => p !== null)
    .filter((p, i, arr) => arr.indexOf(p) === i)

  if (places.length === 0) return null

  const hotelPlace = hotelMapLink ? extractPlaceName(hotelMapLink) : null

  // Single place: just search for it
  if (places.length === 1 && !hotelPlace) {
    return `https://www.google.com/maps/search/${encodeURIComponent(places[0])}`
  }

  const origin = encodeURIComponent(hotelPlace || places[0])
  const destination = encodeURIComponent(hotelPlace || places[places.length - 1])
  // All activity places become waypoints when hotel bookends the route
  const waypointPlaces = hotelPlace ? places : places.slice(1, -1)
  const waypoints = waypointPlaces.map(p => encodeURIComponent(p)).join('|')
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=transit`
  if (waypoints) url += `&waypoints=${waypoints}`
  return url
}
