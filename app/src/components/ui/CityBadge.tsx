import { cn, getCityColor } from '@/lib/utils'

export function CityBadge({ city, className }: { city: string; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
      getCityColor(city),
      className
    )}>
      {city}
    </span>
  )
}
