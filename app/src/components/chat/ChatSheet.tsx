import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Globe, FileText, Pencil } from 'lucide-react'
import { cn, getTripDay, getDayCity, getTimeGreeting } from '@/lib/utils'

interface ToolUsed {
  name: string
  input: Record<string, string>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolsUsed?: ToolUsed[]
}

function getSuggestions(): string[] {
  const h = new Date().getHours()
  const day = getTripDay()
  const city = day ? getDayCity(day) : null

  if (h < 10) return [
    'Where should we get coffee?',
    "What's the plan this morning?",
    'Find a good breakfast spot nearby',
    'How do we get to our first stop?',
  ]
  if (h < 14) return [
    'Search for ramen near us',
    'How do we get to our next stop?',
    "What's the afternoon plan?",
    city === 'Tokyo' ? 'Any good shops nearby?' : 'What should we see nearby?',
  ]
  if (h < 18) return [
    "Where's dinner tonight?",
    'Find a quiet bar nearby',
    "What time do we need to be there?",
    'Search for a cocktail bar in the area',
  ]
  return [
    "What's the plan for tomorrow?",
    'Find a late-night izakaya nearby',
    'How do we get back to the hotel?',
    "What time do we start tomorrow?",
  ]
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-surface-2 px-1 py-0.5 text-[11px]">$1</code>')
    .replace(/\n/g, '<br/>')
}

function ToolBadge({ tool }: { tool: ToolUsed }) {
  const config = {
    web_search: {
      icon: Globe,
      label: `Searched: ${tool.input.query}`,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20',
    },
    read_itinerary_file: {
      icon: FileText,
      label: `Read: ${tool.input.file_path?.split('/').pop()}`,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
    },
    edit_itinerary_file: {
      icon: Pencil,
      label: `Updated: ${tool.input.file_path?.split('/').pop()}`,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20',
    },
  }[tool.name]

  if (!config) return null
  const Icon = config.icon

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium ring-1', config.color)}>
      <Icon className="h-2.5 w-2.5" />
      <span className="max-w-[180px] truncate">{config.label}</span>
    </span>
  )
}

function ToolActivity({ name }: { name?: string }) {
  const labels: Record<string, string> = {
    web_search: 'Searching the web...',
    read_itinerary_file: 'Reading itinerary...',
    edit_itinerary_file: 'Updating itinerary...',
  }
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-lg bg-surface px-4 py-3 ring-1 ring-border/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          {name && <span className="text-[10px] text-text-tertiary">{labels[name] || 'Thinking...'}</span>}
        </div>
      </div>
    </div>
  )
}

export function ChatSheet() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      // Send only role+content to the API (strip toolsUsed)
      const apiMessages = newMessages.map(({ role, content }) => ({ role, content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const text = await res.text()
        setMessages(prev => [...prev, { role: 'assistant', content: `Server error (${res.status}). Try again in a moment.` }])
        console.error('Chat non-JSON response:', res.status, text.slice(0, 200))
        return
      }
      const data = await res.json()
      if (data.detail) console.error('Chat API detail:', data.detail)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || data.error || 'Something went wrong',
        toolsUsed: data.toolsUsed,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Could not reach the server. Are you offline?' }])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open trip assistant"
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-xl shadow-accent/25 transition-transform hover:scale-105 active:scale-95"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    )
  }

  const greeting = getTimeGreeting()
  const suggestions = getSuggestions()

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-bold">Trip Assistant</h2>
          <p className="text-[10px] text-text-tertiary">Powered by Claude</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          aria-label="Close assistant"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-text-tertiary transition-colors hover:bg-surface"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 pt-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
              <MessageCircle className="h-6 w-6 text-accent" />
            </div>
            <div className="text-center">
              <p className="text-sm text-text-secondary">{greeting}! Ask me anything.</p>
              <p className="mt-0.5 text-xs text-text-tertiary">I can search the web and read the itinerary.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl bg-surface px-3 py-2 text-xs text-text-secondary ring-1 ring-border/50 transition-colors hover:bg-surface-2 active:bg-surface-3"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
            <div className={cn(
              'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-accent text-white rounded-br-lg'
                : 'bg-surface text-text rounded-bl-lg ring-1 ring-border/50'
            )}>
              {msg.role === 'assistant' ? (
                <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                msg.content
              )}
            </div>
            {/* Tool badges */}
            {msg.toolsUsed && msg.toolsUsed.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5 max-w-[85%]">
                {msg.toolsUsed.map((tool, j) => (
                  <ToolBadge key={j} tool={tool} />
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && <ToolActivity />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 safe-area-pb">
        <form onSubmit={e => { e.preventDefault(); send(input) }} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about the trip..."
            aria-label="Chat message"
            className="flex-1 rounded-xl bg-surface px-4 py-2.5 text-sm text-text placeholder:text-text-tertiary outline-none ring-1 ring-transparent transition-all focus:ring-border"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white transition-all disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
