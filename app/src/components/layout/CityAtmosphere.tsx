import { useEffect, useRef, useState, useCallback } from 'react'
import { useCity } from '@/lib/city-context'
import type { City } from '@/lib/types'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  targetOpacity: number
  rotation: number
  rotationSpeed: number
  city: City
}

const CONFIGS: Record<City, {
  color: [number, number, number]
  count: number
  size: [number, number]
  speed: number
  type: 'orb' | 'petal' | 'bokeh' | 'mist'
}> = {
  Tokyo:  { color: [96, 165, 250],  count: 25, size: [1.5, 4],  speed: 0.3,  type: 'orb' },
  Kyoto:  { color: [192, 132, 252], count: 18, size: [3, 7],    speed: 0.4,  type: 'petal' },
  Osaka:  { color: [251, 146, 60],  count: 12, size: [8, 22],   speed: 0.1,  type: 'bokeh' },
  Hakone: { color: [74, 222, 128],  count: 10, size: [25, 60],  speed: 0.15, type: 'mist' },
}

const rand = (a: number, b: number) => Math.random() * (b - a) + a

function spawn(city: City, w: number, h: number, scatter: boolean): Particle {
  const c = CONFIGS[city]
  const size = rand(...c.size)
  let x: number, y: number, vx: number, vy: number

  switch (c.type) {
    case 'orb': // Tokyo: drift upward like city lights
      x = rand(0, w)
      y = scatter ? rand(0, h) : h + size
      vx = rand(-0.15, 0.15)
      vy = rand(-c.speed * 1.5, -c.speed * 0.5)
      break
    case 'petal': // Kyoto: drift diagonally like cherry blossoms
      x = scatter ? rand(0, w) : w + size
      y = scatter ? rand(0, h) : rand(-20, h * 0.3)
      vx = rand(-c.speed * 0.8, -c.speed * 0.3)
      vy = rand(c.speed * 0.3, c.speed * 0.8)
      break
    case 'bokeh': // Osaka: gentle floating bokeh circles
      x = rand(0, w)
      y = rand(0, h)
      vx = rand(-c.speed, c.speed)
      vy = rand(-c.speed, c.speed)
      break
    case 'mist': // Hakone: horizontal mist wisps
      x = scatter ? rand(0, w) : -size
      y = scatter ? rand(0, h) : rand(h * 0.3, h)
      vx = rand(c.speed * 0.5, c.speed * 1.5)
      vy = rand(-0.05, 0.05)
      break
  }

  return {
    x, y, vx, vy, size,
    opacity: scatter ? rand(0.03, 0.1) : 0,
    targetOpacity: rand(0.04, 0.12),
    rotation: rand(0, Math.PI * 2),
    rotationSpeed: rand(-0.01, 0.01),
    city,
  }
}

function draw(ctx: CanvasRenderingContext2D, p: Particle) {
  const c = CONFIGS[p.city]
  const [r, g, b] = c.color
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.globalAlpha = p.opacity

  switch (c.type) {
    case 'orb': {
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2)
      grad.addColorStop(0, `rgba(${r},${g},${b},0.8)`)
      grad.addColorStop(0.4, `rgba(${r},${g},${b},0.3)`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'petal': {
      ctx.fillStyle = `rgba(${r},${g},${b},0.6)`
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 1.5)
      grad.addColorStop(0, `rgba(${r},${g},${b},0.2)`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(0, 0, p.size * 1.5, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'bokeh': {
      const grad = ctx.createRadialGradient(0, 0, p.size * 0.3, 0, 0, p.size)
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`)
      grad.addColorStop(0.6, `rgba(${r},${g},${b},0.15)`)
      grad.addColorStop(0.8, `rgba(${r},${g},${b},0.08)`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(0, 0, p.size, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'mist': {
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size)
      grad.addColorStop(0, `rgba(${r},${g},${b},0.06)`)
      grad.addColorStop(0.5, `rgba(${r},${g},${b},0.03)`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
  }
  ctx.restore()
}

export function CityAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { city } = useCity()
  const particlesRef = useRef<Particle[]>([])
  const targetCityRef = useRef<City | null>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)

  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const tick = useCallback((t: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Throttle to ~30fps for battery
    if (t - lastRef.current < 33) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    lastRef.current = t

    const { w, h } = sizeRef.current
    ctx.clearRect(0, 0, w, h)

    const target = targetCityRef.current
    const ps = particlesRef.current

    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]

      // Crossfade: fade in current city, fade out old city
      if (p.city === target) {
        p.opacity += (p.targetOpacity - p.opacity) * 0.02
      } else {
        p.opacity *= 0.97
        if (p.opacity < 0.001) { ps.splice(i, 1); continue }
      }

      // Physics
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.rotationSpeed
      // Gentle sine drift for organic feel
      p.x += Math.sin(t * 0.0008 + i) * 0.04

      // Cull off-screen
      const m = p.size * 3
      if (p.x < -m || p.x > w + m || p.y < -m || p.y > h + m) {
        ps.splice(i, 1)
        continue
      }

      draw(ctx, p)
    }

    // Spawn new particles for target city
    if (target) {
      const n = ps.filter(p => p.city === target).length
      const need = CONFIGS[target].count
      if (n < need && Math.random() < Math.max(0.02, (need - n) / need * 0.12)) {
        ps.push(spawn(target, w, h, false))
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  // React to city changes
  useEffect(() => {
    if (!city) return
    targetCityRef.current = city
    const { w, h } = sizeRef.current
    // Seed particles immediately if none exist for this city
    if (w > 0 && particlesRef.current.filter(p => p.city === city).length === 0) {
      const count = Math.floor(CONFIGS[city].count * 0.5)
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(spawn(city, w, h, true))
      }
    }
  }, [city])

  // Canvas setup + animation loop
  useEffect(() => {
    if (reducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w, h }
    }
    resize()
    window.addEventListener('resize', resize)

    // Seed initial particles
    const c = targetCityRef.current
    if (c) {
      const { w, h } = sizeRef.current
      const count = Math.floor(CONFIGS[c].count * 0.5)
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(spawn(c, w, h, true))
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    // Pause when tab hidden
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current)
      } else {
        lastRef.current = 0
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [tick, reducedMotion])

  // Reduced motion: static gradient fallback
  if (reducedMotion) {
    const c = city ? CONFIGS[city].color : null
    return (
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-[background] duration-1000"
        style={{
          viewTransitionName: 'atmosphere' as string,
          background: c
            ? `radial-gradient(ellipse at 50% 30%, rgba(${c[0]},${c[1]},${c[2]},0.06) 0%, transparent 60%)`
            : undefined,
        }}
        aria-hidden="true"
      />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ viewTransitionName: 'atmosphere' as string }}
      aria-hidden="true"
    />
  )
}
