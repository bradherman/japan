import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  right?: ReactNode
}

export function PageHeader({ title, subtitle, right }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md px-4 py-3">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}
