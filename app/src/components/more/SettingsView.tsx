import { ArrowLeft, Plane, Users, Info, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getTripCountdown } from '@/lib/utils'

export function SettingsView() {
  const navigate = useNavigate()
  const countdown = getTripCountdown()

  const countdownText = countdown.type === 'before'
    ? countdown.days === 1
      ? 'Tomorrow. This is really happening.'
      : countdown.days <= 7
        ? `${countdown.days} days. Almost time.`
        : `${countdown.days} days until takeoff`
    : countdown.type === 'during'
      ? `Day ${countdown.days} of 16. Soak it in.`
      : 'What a trip.'

  return (
    <div className="flex flex-col pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            onClick={() => navigate('/more')}
            aria-label="Back to more"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg stagger-children space-y-3 p-4">
        {/* Countdown */}
        <div className="rounded-2xl bg-accent/[0.06] p-4 ring-1 ring-accent/15 text-center">
          <Calendar className="mx-auto h-5 w-5 text-accent" />
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {countdown.type === 'before' ? countdown.days : countdown.type === 'during' ? `${countdown.days}/16` : '16/16'}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">{countdownText}</p>
        </div>

        <div className="rounded-2xl bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plane className="h-4 w-4 text-tokyo" />
            <h2 className="text-sm font-semibold">Japan Trip Companion</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            April 25 to May 10, 2026
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-text-tertiary">
            <span className="rounded-md bg-tokyo-dim px-1.5 py-0.5 text-tokyo">Tokyo</span>
            <span>→</span>
            <span className="rounded-md bg-kyoto-dim px-1.5 py-0.5 text-kyoto">Kyoto</span>
            <span>→</span>
            <span className="rounded-md bg-osaka-dim px-1.5 py-0.5 text-osaka">Osaka</span>
            <span>→</span>
            <span className="rounded-md bg-hakone-dim px-1.5 py-0.5 text-hakone">Hakone</span>
            <span>→</span>
            <span className="rounded-md bg-tokyo-dim px-1.5 py-0.5 text-tokyo">Tokyo</span>
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-kyoto" />
            <h2 className="text-sm font-semibold">Travelers</h2>
          </div>
          <div className="space-y-1.5 text-xs text-text-secondary">
            <p>Brad (turning 40 on May 6!) & Alyona — full trip</p>
            <p>Dave & Gail — Tokyo only (Apr 25-30)</p>
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-text-tertiary" />
            <h2 className="text-sm font-semibold">About</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Built with React + Vite. Data parsed from markdown at build time.
            Works offline via service worker.
          </p>
        </div>
      </div>
    </div>
  )
}
