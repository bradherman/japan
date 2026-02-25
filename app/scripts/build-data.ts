/**
 * Build-time script: Parse 7 markdown source files into structured JSON.
 * Run with: npx tsx scripts/build-data.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '../..')
const OUT = resolve(__dirname, '../src/data/generated')
mkdirSync(OUT, { recursive: true })

// ============================================================
// Helpers
// ============================================================
function read(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf-8')
}

function write(name: string, data: unknown) {
  const path = join(OUT, name)
  writeFileSync(path, JSON.stringify(data, null, 2))
  console.log(`  ✓ ${name} (${(JSON.stringify(data).length / 1024).toFixed(1)} KB)`)
}

function extractMapLink(text: string): string | undefined {
  const m = text.match(/\[.*?\]\((https:\/\/maps\.google\.com[^)]+)\)/)
  return m?.[1]
}

function stripLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

function cleanText(text: string): string {
  return stripLinks(text).replace(/\*\*/g, '').replace(/\*/g, '').trim()
}

type City = 'Tokyo' | 'Kyoto' | 'Osaka' | 'Hakone'

function dayCity(dayNumber: number): City {
  if (dayNumber <= 5) return 'Tokyo'
  if (dayNumber <= 9) return 'Kyoto'
  if (dayNumber <= 12) return 'Osaka'
  if (dayNumber <= 14) return 'Hakone'
  return 'Tokyo'
}

// ============================================================
// 1. Parse itinerary.md
// ============================================================
function parseItinerary() {
  const md = read('notes/finalized/itinerary.md')

  // Parse hotels table
  const hotelSection = md.match(/\*\*Hotels:\*\*\n([\s\S]*?)\n\n/)
  const hotels: Array<{ dates: string; city: string; name: string; mapLink: string }> = []
  if (hotelSection) {
    for (const line of hotelSection[1].split('\n')) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 3 && /^(Apr|May)/.test(cells[0])) {
        hotels.push({
          dates: cells[0],
          city: cells[1],
          name: cleanText(cells[2]),
          mapLink: extractMapLink(cells[2]) || '',
        })
      }
    }
  }

  // Parse days
  const dayBlocks = md.split(/^## Day (\d+):/m).slice(1)
  const days: Array<Record<string, unknown>> = []

  for (let i = 0; i < dayBlocks.length; i += 2) {
    const dayNum = parseInt(dayBlocks[i])
    const content = dayBlocks[i + 1]
    if (!content) continue

    const titleLine = content.split('\n')[0].trim()
    // e.g. "Friday, April 25 — Tokyo — Arrival / Shibuya"
    const titleMatch = titleLine.match(/^(\w+),\s+([\w\s]+)\s+—\s+(\w+)\s+—\s+(.+)/)
    const dayOfWeek = titleMatch?.[1] || ''
    const date = titleMatch?.[2]?.trim() || ''
    const city = titleMatch?.[3] || dayCity(dayNum)
    const dayTitle = titleMatch?.[4]?.trim() || titleLine

    // Subtitle (italic line after heading)
    const subtitleMatch = content.match(/^\*([^*]+)\*$/m)
    const subtitle = subtitleMatch?.[1]?.trim()

    // Summary (blockquote lines after subtitle)
    let summary: string | undefined
    const contentLines = content.split('\n')
    const subtitleIdx = contentLines.findIndex(l => /^\*[^*]+\*$/.test(l.trim()))
    if (subtitleIdx >= 0) {
      const quoteLines: string[] = []
      for (let j = subtitleIdx + 1; j < contentLines.length; j++) {
        const line = contentLines[j].trim()
        if (line.startsWith('> ')) {
          quoteLines.push(line.slice(2).trim())
        } else if (line === '>' || line === '') {
          continue // skip blank lines between subtitle and blockquote, or within blockquote
        } else {
          break
        }
      }
      if (quoteLines.length > 0) {
        summary = quoteLines.join(' ')
      }
    }

    // Morning coffee
    let morningCoffee: Record<string, unknown> | undefined
    const coffeeMatch = content.match(/\*\*Morning Coffee:\*\*\s*\[([^\]]+)\]\(([^)]+)\)\s*(?:—\s*(.+))?/m)
      || content.match(/\*\*Morning Coffee:\*\*\s*(.+)/m)
    if (coffeeMatch) {
      morningCoffee = {
        name: coffeeMatch[1] || cleanText(coffeeMatch[0].replace('**Morning Coffee:**', '')),
        mapLink: coffeeMatch[2] || extractMapLink(coffeeMatch[0]),
        description: coffeeMatch[3]?.trim(),
      }
    }

    // Sections (### headings)
    const sectionBlocks = content.split(/^### /m).slice(1)
    const sections: Array<Record<string, unknown>> = []

    for (const block of sectionBlocks) {
      const lines = block.split('\n')
      const sectionTitle = lines[0].trim()
      if (sectionTitle.toLowerCase() === 'logistics') {
        continue // handle logistics separately
      }

      const sectionSubtitleMatch = lines.find(l => /^\*[^*]+\*$/.test(l.trim()))
      const activities: Array<Record<string, unknown>> = []

      for (const line of lines.slice(1)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**')) continue

        // Numbered or bulleted activity: 1. **[Name](link)** (optional neighborhood) — description
        const actMatch = trimmed.match(/^(?:\d+\.\s+|\-\s+)\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s*(.*)/)
          || trimmed.match(/^(?:\d+\.\s+|\-\s+)\*\*([^*]+)\*\*\s*(.*)/)

        if (actMatch) {
          const name = actMatch[1]
          const mapLink = actMatch[2]?.startsWith('http') ? actMatch[2] : undefined
          // Everything after ** — find description after em-dash
          const afterBold = (mapLink ? actMatch[3] : actMatch[2]) || ''
          // Strip leading (Neighborhood) and find description after —
          const dashIdx = afterBold.indexOf('—')
          const rest = dashIdx >= 0 ? afterBold.slice(dashIdx + 1).trim() : ''

          const priority = /PRIORITY|PICK/i.test(rest) || /PRIORITY|PICK/i.test(trimmed)
          const reservationRequired = /reservation|BOOK|ADVANCE TICKET/i.test(trimmed)
          const lineUpMatch = rest.match(/LINE UP:\s*([^*]+)/i)
          const priceMatch = rest.match(/~?([\d,]+(?:-[\d,]+)?)\s*yen/i)

          activities.push({
            name,
            mapLink: mapLink || extractMapLink(trimmed),
            description: cleanText(rest).replace(/PRIORITY\.?\s*/i, '').replace(/LINE UP:[^.]+\.?\s*/i, '').trim() || undefined,
            priority,
            reservationRequired,
            lineUpTip: lineUpMatch?.[1]?.trim(),
            price: priceMatch ? `¥${priceMatch[1]}` : undefined,
          })
        } else if (trimmed.startsWith('- **') && !trimmed.startsWith('- **~')) {
          // Bulleted bold item (sub-items, venues, etc.)
          const subMatch = trimmed.match(/^-\s+\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s*(.*)/)
            || trimmed.match(/^-\s+\*\*([^*]+)\*\*\s*(.*)/)
          if (subMatch) {
            const subMapLink = subMatch[2]?.startsWith('http') ? subMatch[2] : undefined
            const subAfterBold = (subMapLink ? subMatch[3] : subMatch[2]) || ''
            const subDashIdx = subAfterBold.search(/[—–]/)
            const subDesc = subDashIdx >= 0 ? subAfterBold.slice(subDashIdx + 1).trim() : ''
            activities.push({
              name: subMatch[1],
              mapLink: subMapLink || extractMapLink(trimmed),
              description: cleanText(subDesc).trim() || undefined,
            })
          }
        } else if (trimmed.startsWith('- **') || /^\d+\.\s+\*\*/.test(trimmed)) {
          // Time-prefixed: - **3:00 PM** — Description
          const timeMatch = trimmed.match(/(?:\d+\.\s+|\-\s+)\*\*([^*]+)\*\*\s*(?:—\s*(.+))?/)
          if (timeMatch) {
            const possibleTime = timeMatch[1].match(/^\d{1,2}:\d{2}/)
            if (possibleTime) {
              activities.push({
                time: timeMatch[1],
                name: cleanText(timeMatch[2] || timeMatch[1]),
                mapLink: extractMapLink(trimmed),
                description: timeMatch[2] ? cleanText(timeMatch[2]) : undefined,
              })
            }
          }
        }
      }

      if (activities.length > 0 || sectionTitle) {
        sections.push({
          title: sectionTitle.replace(/\s*\(.*$/, '').trim(),
          subtitle: sectionSubtitleMatch ? cleanText(sectionSubtitleMatch) : undefined,
          activities,
        })
      }
    }

    // Logistics
    const logisticsMatch = content.match(/### Logistics\n([\s\S]*?)(?=\n---|\n## |$)/)
    const logistics: Array<{ text: string }> = []
    if (logisticsMatch) {
      for (const line of logisticsMatch[1].split('\n')) {
        const trimmed = line.trim()
        if (trimmed.startsWith('- ')) {
          logistics.push({ text: cleanText(trimmed.slice(2)) })
        }
      }
    }

    days.push({
      dayNumber: dayNum,
      date,
      dayOfWeek,
      title: dayTitle,
      city,
      subtitle,
      summary,
      morningCoffee,
      sections,
      logistics,
    })
  }

  return { hotels, days }
}

// ============================================================
// 2. Parse daily-schedule.md
// ============================================================
function parseDailySchedule() {
  const md = read('notes/finalized/daily-schedule.md')
  const dayBlocks = md.split(/^## Day (\d+):/m).slice(1)
  const schedules: Array<Record<string, unknown>> = []

  for (let i = 0; i < dayBlocks.length; i += 2) {
    const dayNum = parseInt(dayBlocks[i])
    const content = dayBlocks[i + 1]
    if (!content) continue

    const titleLine = content.split('\n')[0].trim()
    const titleMatch = titleLine.match(/^(\w+),\s+([\w\s]+)\s+—\s+(.+)/)

    // Extract code block
    const codeMatch = content.match(/```\n([\s\S]*?)```/)
    const entries: Array<Record<string, unknown>> = []

    if (codeMatch) {
      for (const line of codeMatch[1].split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // Match time patterns: "3:00 PM", "~4:30", "6:30-7:00"
        const entryMatch = trimmed.match(/^(~?\d{1,2}:\d{2}(?:\s*(?:AM|PM))?(?:\s*-\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)?)\s+(.+)/)
          || trimmed.match(/^(~?\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)\s+(.+)/)

        if (entryMatch) {
          const text = entryMatch[2].trim()
          entries.push({
            time: entryMatch[1].trim(),
            text,
            isWarning: text.includes('⚠️'),
            isBackup: text.startsWith('(B)') || text.startsWith('Option'),
          })
        } else if (/^\s+(Option|If|OR\b)/i.test(trimmed) || trimmed.startsWith('(B)')) {
          // Continuation/option line
          entries.push({
            time: '',
            text: trimmed,
            isBackup: true,
          })
        } else if (/^[A-Z]/.test(trimmed) && !trimmed.match(/^\d/)) {
          // Header-like line inside code block (e.g., "NO ALARM...")
          entries.push({
            time: '',
            text: trimmed,
          })
        }
      }
    }

    // Notes after code block
    const afterCode = content.split('```')[2] || ''
    const notes: string[] = []
    for (const line of afterCode.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        notes.push(cleanText(trimmed))
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        notes.push(cleanText(trimmed.slice(2)))
      }
    }

    schedules.push({
      dayNumber: dayNum,
      date: titleMatch?.[2]?.trim() || '',
      title: titleMatch?.[3]?.trim() || titleLine,
      entries,
      notes: notes.length > 0 ? notes : undefined,
    })
  }

  return schedules
}

// ============================================================
// 3. Parse reservation-tracker.md
// ============================================================
function parseReservations() {
  const md = read('notes/finalized/reservation-tracker.md')
  const reservations: Array<Record<string, unknown>> = []

  // Already Booked section
  const bookedMatch = md.match(/## ALREADY BOOKED\n([\s\S]*?)(?=\n---|\n## )/)
  if (bookedMatch) {
    const rows = bookedMatch[1].match(/^\|[^|].*\|$/gm) || []
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 5 && !cells[0].startsWith('Item') && !cells[0].startsWith('--')) {
        if (cells[0].includes('~~')) continue // strikethrough = moved
        reservations.push({
          name: cleanText(cells[0]),
          details: cleanText(cells[1]),
          date: cleanText(cells[2]),
          cost: cleanText(cells[3]),
          mapLink: extractMapLink(cells[4]),
          status: 'booked',
          category: 'booked',
        })
      }
    }
  }

  // URGENT section - Attractions
  const urgentAttr = md.match(/### Attractions & Experiences\n([\s\S]*?)(?=\n### |\n---|\n## )/)
  if (urgentAttr) {
    const rows = urgentAttr[1].match(/^\|[^|].*\|$/gm) || []
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 5 && !cells[0].startsWith('Item') && !cells[0].startsWith('--')) {
        if (cells[0].includes('~~')) continue
        reservations.push({
          name: cleanText(cells[0]),
          date: cleanText(cells[1]),
          cost: cleanText(cells[2]),
          bookingMethod: cleanText(cells[3]),
          mapLink: extractMapLink(row),
          alarm: cells.length > 5 ? cleanText(cells[5]) : undefined,
          status: 'urgent',
          category: 'attractions',
        })
      }
    }
  }

  // URGENT - Restaurants
  const urgentRest = md.match(/### Restaurants — Book Now\n([\s\S]*?)(?=\n### |\n---|\n## )/)
  if (urgentRest) {
    const rows = urgentRest[1].match(/^\|[^|].*\|$/gm) || []
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 5 && !cells[0].startsWith('Restaurant') && !cells[0].startsWith('--')) {
        if (cells[0].includes('~~')) continue
        reservations.push({
          name: cleanText(cells[0]),
          details: cleanText(cells[1]),
          date: cleanText(cells[2]),
          cost: cleanText(cells[3]),
          bookingMethod: cleanText(cells[4]),
          mapLink: extractMapLink(row),
          alarm: cells.length > 6 ? cleanText(cells[6]) : undefined,
          status: 'urgent',
          category: 'restaurants',
        })
      }
    }
  }

  // Bars
  const barsSection = md.match(/### Bars — Book When Window Opens\n([\s\S]*?)(?=\n---|\n## )/)
  if (barsSection) {
    const rows = barsSection[1].match(/^\|[^|].*\|$/gm) || []
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 3 && !cells[0].startsWith('Bar') && !cells[0].startsWith('--')) {
        reservations.push({
          name: cleanText(cells[0]),
          date: cleanText(cells[1]),
          bookingMethod: cleanText(cells[2]),
          alarm: cells.length > 3 ? cleanText(cells[3]) : undefined,
          status: 'urgent',
          category: 'bars',
        })
      }
    }
  }

  // BOOK 1 WEEK AHEAD
  const oneWeek = md.match(/## BOOK 1 WEEK AHEAD[^\n]*\n([\s\S]*?)(?=\n---|\n## )/)
  if (oneWeek) {
    const rows = oneWeek[1].match(/^\|[^|].*\|$/gm) || []
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 5 && !cells[0].startsWith('Restaurant') && !cells[0].startsWith('--')) {
        reservations.push({
          name: cleanText(cells[0]),
          details: cleanText(cells[1]),
          date: cleanText(cells[2]),
          cost: cleanText(cells[3]),
          bookingMethod: cleanText(cells[4]),
          mapLink: extractMapLink(row),
          alarm: cells.length > 6 ? cleanText(cells[6]) : undefined,
          status: 'book-soon',
          category: 'restaurants',
        })
      }
    }
  }

  // BOOK 2-4 WEEKS AHEAD
  const twoWeek = md.match(/## BOOK 2-4 WEEKS AHEAD[^\n]*\n([\s\S]*?)(?=\n---|\n## )/)
  if (twoWeek) {
    const rows = twoWeek[1].match(/^\|[^|].*\|$/gm) || []
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 4 && !cells[0].startsWith('Restaurant') && !cells[0].startsWith('--')) {
        if (cells[0].includes('~~')) continue
        reservations.push({
          name: cleanText(cells[0]),
          details: cleanText(cells[1]),
          date: cleanText(cells[2]),
          cost: cleanText(cells[3]),
          bookingMethod: cells.length > 4 ? cleanText(cells[4]) : undefined,
          mapLink: extractMapLink(row),
          status: 'book-soon',
          category: 'restaurants',
        })
      }
    }
  }

  // WALK-IN RESTAURANTS
  const walkIn = md.match(/## WALK-IN RESTAURANTS[^\n]*\n([\s\S]*?)(?=\n---|\n## )/)
  if (walkIn) {
    const rows = walkIn[1].match(/^\|[^|].*\|$/gm) || []
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 5 && !cells[0].startsWith('Restaurant') && !cells[0].startsWith('--')) {
        reservations.push({
          name: cleanText(cells[0]),
          details: cleanText(cells[1]),
          date: cleanText(cells[2]),
          cost: cleanText(cells[3]),
          bookingMethod: cleanText(cells[4]),
          mapLink: extractMapLink(row),
          status: 'walk-in',
          category: 'walk-in',
        })
      }
    }
  }

  // SHINKANSEN
  const shinkansen = md.match(/## SHINKANSEN BOOKINGS\n([\s\S]*?)(?=\n---|\n## )/)
  if (shinkansen) {
    const rows = shinkansen[1].match(/^\|[^|].*\|$/gm) || []
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 4 && !cells[0].startsWith('Route') && !cells[0].startsWith('--')) {
        const isBooked = row.toLowerCase().includes('booked')
        reservations.push({
          name: `Shinkansen: ${cleanText(cells[0])}`,
          date: cleanText(cells[1]),
          cost: cleanText(cells[2]),
          bookingMethod: cleanText(cells[3]),
          alarm: cells.length > 4 ? cleanText(cells[4]) : undefined,
          status: isBooked ? 'booked' : 'book-soon',
          category: 'transport',
        })
      }
    }
  }

  // Calendar alarms
  const alarms: Array<Record<string, string>> = []
  const alarmsSection = md.match(/## CALENDAR ALARM SUMMARY[\s\S]*?\n\n([\s\S]*?)(?=\n---|\n## |$)/)
  if (alarmsSection) {
    const rows = alarmsSection[1].match(/^\|[^|].*\|$/gm) || []
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 3 && !cells[0].startsWith('Date') && !cells[0].startsWith('--')) {
        alarms.push({
          date: cleanText(cells[0]),
          what: cleanText(cells[1]),
          priority: cleanText(cells[2]),
        })
      }
    }
  }

  return { reservations, alarms }
}

// ============================================================
// 4. Parse transport-cheatsheet.md
// ============================================================
function parseTransport() {
  const md = read('notes/finalized/transport-cheatsheet.md')
  const dayBlocks = md.split(/^## Day (\d+):/m).slice(1)
  const days: Array<Record<string, unknown>> = []

  for (let i = 0; i < dayBlocks.length; i += 2) {
    const dayNum = parseInt(dayBlocks[i])
    const content = dayBlocks[i + 1]
    if (!content) continue

    const titleLine = content.split('\n')[0].trim()
    const titleMatch = titleLine.match(/^(\w+),\s+([\w\s]+)\s+—\s+(.+)/)

    const legs: Array<Record<string, unknown>> = []
    const tableRows = content.match(/^\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|.*\|$/gm) || []
    for (const row of tableRows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 5 && !cells[0].startsWith('Time') && !cells[0].startsWith('--')) {
        legs.push({
          time: cleanText(cells[0]),
          from: cleanText(cells[1].split('→')[0] || cells[1]),
          to: cleanText(cells[1].split('→')[1] || ''),
          transport: cleanText(cells[2]),
          duration: cleanText(cells[3]),
          cost: cleanText(cells[4]),
          notes: cells.length > 5 ? cleanText(cells[5]) : undefined,
        })
      }
    }

    // Notes (bold lines and bullet points outside table)
    const notes: string[] = []
    const lines = content.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('**') && !trimmed.includes('|')) {
        notes.push(cleanText(trimmed))
      }
    }

    days.push({
      dayNumber: dayNum,
      date: titleMatch?.[2]?.trim() || '',
      title: titleMatch?.[3]?.trim() || titleLine,
      legs,
      notes: notes.length > 0 ? notes : undefined,
    })
  }

  // Cost summary
  const costSection = md.match(/## Cost Summary[\s\S]*?\n\n([\s\S]*?)(?=\n---|\n## |$)/)
  const costs: Array<Record<string, string>> = []
  if (costSection) {
    const rows = costSection[1].match(/^\|[^|]+\|[^|]+\|$/gm) || []
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 2 && !cells[0].startsWith('Segment') && !cells[0].startsWith('--')) {
        costs.push({ segment: cleanText(cells[0]), cost: cleanText(cells[1]) })
      }
    }
  }

  // Luggage forwarding
  const luggageSection = md.match(/## Luggage Forwarding[\s\S]*?\n\n([\s\S]*?)(?=\n---|\n## |$)/)
  const luggage: Array<Record<string, string>> = []
  if (luggageSection) {
    const rows = luggageSection[1].match(/^\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|$/gm) || []
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 4 && !cells[0].startsWith('Send') && !cells[0].startsWith('--')) {
        luggage.push({
          sendDate: cleanText(cells[0]),
          route: cleanText(cells[1]),
          arrives: cleanText(cells[2]),
          cost: cleanText(cells[3]),
        })
      }
    }
  }

  return { days, costs, luggage }
}

// ============================================================
// 5. Parse packing-list.md
// ============================================================
function parsePackingFile(filePath: string, idPrefix: string) {
  const md = read(filePath)
  const categories: Array<{ name: string; items: Array<{ id: string; text: string; checked: boolean }> }> = []
  let currentCategory: typeof categories[0] | null = null
  let itemIdx = 0

  for (const line of md.split('\n')) {
    const trimmed = line.trim()

    // Category: ## heading
    if (trimmed.startsWith('## ') && !trimmed.includes('DO NOT PACK') && !trimmed.includes('Laundry') && !trimmed.includes('Pre-Departure')) {
      currentCategory = { name: trimmed.replace('## ', ''), items: [] }
      categories.push(currentCategory)
      continue
    }

    // Sub-category: ### heading — treat as category
    if (trimmed.startsWith('### ') && currentCategory) {
      currentCategory = { name: `${currentCategory.name} — ${trimmed.replace('### ', '')}`, items: [] }
      categories.push(currentCategory)
      continue
    }

    // Item: - [ ] or - [x]
    if (currentCategory && /^- \[[ x]\]/.test(trimmed)) {
      const checked = trimmed.startsWith('- [x]')
      const text = trimmed.replace(/^- \[[ x]\]\s*/, '')
      currentCategory.items.push({
        id: `${idPrefix}-${itemIdx++}`,
        text: cleanText(text),
        checked,
      })
    }
  }

  // Also add pre-departure checklist
  const preDepMatch = md.match(/## Pre-Departure Checklist\n([\s\S]*?)$/)
  if (preDepMatch) {
    const items: Array<{ id: string; text: string; checked: boolean }> = []
    for (const line of preDepMatch[1].split('\n')) {
      if (/^- \[[ x]\]/.test(line.trim())) {
        const checked = line.trim().startsWith('- [x]')
        items.push({
          id: `${idPrefix}-${itemIdx++}`,
          text: cleanText(line.trim().replace(/^- \[[ x]\]\s*/, '')),
          checked,
        })
      }
    }
    if (items.length > 0) {
      categories.push({ name: 'Pre-Departure Checklist', items })
    }
  }

  return categories
}

function parsePackingList() {
  return {
    male: parsePackingFile('notes/finalized/packing-list.md', 'pack-m'),
    female: parsePackingFile('notes/finalized/packing-list-female.md', 'pack-f'),
  }
}

// ============================================================
// 6. Parse restaurant-guide.md
// ============================================================
function parseRestaurantGuide() {
  const md = read('notes/restaurant-guide.md')
  const restaurants: Array<Record<string, unknown>> = []
  let currentCity: City | 'Nara' = 'Tokyo'
  let currentCategory = ''
  let currentSubcategory = ''
  let idx = 0

  // Split by #### for individual restaurants
  const blocks = md.split(/^####\s+/m)

  for (const block of blocks.slice(1)) {
    const lines = block.split('\n')
    const nameLine = lines[0].trim()

    // Skip non-restaurant headings
    if (!nameLine || nameLine.startsWith('#')) continue

    // Track city from ## headings earlier in the file
    const cityMatch = block.match(/## (TOKYO|KYOTO|OSAKA)/i)
    if (cityMatch) {
      currentCity = cityMatch[1].charAt(0) + cityMatch[1].slice(1).toLowerCase() as City
    }

    // Clean the name
    const nameClean = nameLine
      .replace(/\s*\(.*?\)\s*$/, '') // remove trailing parenthetical
      .replace(/\s*—.*$/, '') // remove em dash suffix
      .replace(/\s*--.*$/, '') // remove double dash suffix
      .trim()

    // Extract fields from bullet points
    const fields: Record<string, string> = {}
    const tags: string[] = []

    for (const line of lines.slice(1)) {
      const trimmed = line.trim()
      const fieldMatch = trimmed.match(/^-\s+\*\*(\w[\w\s/]+?):\*\*\s*(.+)/)
      if (fieldMatch) {
        fields[fieldMatch[1].toLowerCase()] = cleanText(fieldMatch[2])
      }
    }

    // Tags from name line (outside the loop — once per restaurant)
    if (/Michelin|Bib Gourmand/i.test(nameLine)) tags.push('Michelin')
    if (/TOP PICK|BEST/i.test(nameLine)) tags.push('Top Pick')
    if (/INSTAGRAM/i.test(nameLine)) tags.push('Instagram Rec')

    if (fields['payment']?.toLowerCase().includes('cash')) tags.push('Cash Only')
    if (fields['what to order']) tags.push('Must Order')

    // Extract map link from any line in the block
    const mapLink = extractMapLink(block)

    restaurants.push({
      id: `rest-${idx++}`,
      name: nameClean,
      city: currentCity,
      neighborhood: fields['address']?.match(/\b(Shibuya|Ginza|Shinjuku|Ebisu|Roppongi|Asakusa|Akihabara|Aoyama|Tsukiji|Harajuku|Shimokitazawa|Kagurazaka|Nakameguro|Daikanyama|Gion|Pontocho|Higashiyama|Nishiki|Ichijoji|Arashiyama|Dotonbori|Shinsekai|Shinsaibashi|Amerikamura|Namba|Umeda|Tenma|Tenjinbashi|Horie)\b/i)?.[1],
      category: currentCategory,
      subcategory: currentSubcategory || undefined,
      address: fields['address'],
      hours: fields['hours'],
      closed: fields['closed'],
      price: fields['price'],
      reservations: fields['reservations'],
      payment: fields['payment'],
      whatToOrder: fields['what to order'],
      notes: fields['notes'],
      goldenWeek: fields['golden week'],
      mapLink,
      tags: tags.length > 0 ? tags : undefined,
    })
  }

  // Track categories by looking at ### headings
  const categoryBlocks = md.split(/^###\s+/m)
  let cityFromSection = 'Tokyo'
  for (const cb of categoryBlocks) {
    const firstLine = cb.split('\n')[0].trim()
    if (/^TOKYO/i.test(firstLine)) cityFromSection = 'Tokyo'
    if (/^KYOTO/i.test(firstLine)) cityFromSection = 'Kyoto'
    if (/^OSAKA/i.test(firstLine)) cityFromSection = 'Osaka'

    // Category number pattern: "1. RAMEN", "2. AFFORDABLE SUSHI"
    const catMatch = firstLine.match(/^\d+\.\s+(.+)/)
    if (catMatch) {
      currentCategory = catMatch[1].trim()
      currentSubcategory = ''
    }
  }

  // Re-assign city based on position in file
  const tokyoEnd = md.indexOf('## KYOTO')
  const kyotoEnd = md.indexOf('## OSAKA')
  let charPos = 0

  for (const r of restaurants) {
    const namePos = md.indexOf(r.name as string, charPos)
    if (namePos >= 0) {
      charPos = namePos
      if (kyotoEnd >= 0 && namePos >= kyotoEnd) {
        r.city = 'Osaka'
      } else if (tokyoEnd >= 0 && namePos >= tokyoEnd) {
        r.city = 'Kyoto'
      } else {
        r.city = 'Tokyo'
      }
    }
  }

  return restaurants
}

// ============================================================
// 7. Parse nightlife-guide.md
// ============================================================
function parseNightlifeGuide() {
  const md = read('data/nightlife-guide.md')
  const venues: Array<Record<string, unknown>> = []
  let idx = 0

  // Split by #### for individual venues
  const blocks = md.split(/^####\s+/m)

  // Track position for city assignment
  const tokyoEnd = md.indexOf('## KYOTO')
  const kyotoEnd = md.indexOf('## OSAKA')
  let charPos = 0

  for (const block of blocks.slice(1)) {
    const lines = block.split('\n')
    const nameLine = lines[0].trim()
    if (!nameLine) continue

    // Clean name: "1. JBS Jazz Bar (Shibuya) — TOP PICK"
    const nameClean = nameLine
      .replace(/^\d+\.\s*/, '')
      .replace(/\s*\(.*?\)\s*/, ' ')
      .replace(/\s*—.*$/, '')
      .replace(/\s*--.*$/, '')
      .trim()

    const neighborhood = nameLine.match(/\(([^)]+)\)/)?.[1]
    const tags: string[] = []
    if (/TOP PICK/i.test(nameLine)) tags.push('Top Pick')
    if (/INSTAGRAM/i.test(nameLine)) tags.push('Instagram Rec')

    // Extract fields
    const fields: Record<string, string> = {}
    for (const line of lines.slice(1)) {
      const trimmed = line.trim()
      const fieldMatch = trimmed.match(/^-\s+\*\*(\w[\w\s/]+?):\*\*\s*(.+)/)
      if (fieldMatch) {
        fields[fieldMatch[1].toLowerCase()] = cleanText(fieldMatch[2])
      }
    }

    // Determine city by position
    const namePos = md.indexOf(nameLine, charPos)
    let city: City = 'Tokyo'
    if (namePos >= 0) {
      charPos = namePos
      if (kyotoEnd >= 0 && namePos >= kyotoEnd) city = 'Osaka'
      else if (tokyoEnd >= 0 && namePos >= tokyoEnd) city = 'Kyoto'
    }

    // Determine category from ### heading context
    let category = 'Other'
    const beforeBlock = md.substring(0, namePos)
    const lastH3 = beforeBlock.lastIndexOf('### ')
    if (lastH3 >= 0) {
      const h3Line = beforeBlock.substring(lastH3).split('\n')[0]
      if (/vinyl|listening/i.test(h3Line)) category = 'Vinyl / Listening Bars'
      else if (/jazz/i.test(h3Line)) category = 'Jazz Bars'
      else if (/cocktail/i.test(h3Line)) category = 'Craft Cocktails'
      else if (/live music/i.test(h3Line)) category = 'Live Music'
      else if (/late-night/i.test(h3Line)) category = 'Late-Night Areas'
    }

    venues.push({
      id: `venue-${idx++}`,
      name: nameClean,
      city,
      neighborhood,
      category,
      address: fields['address'],
      hours: fields['hours'],
      cover: fields['cover'],
      price: fields['price'] || fields['drinks'],
      vibe: fields['vibe'],
      whyGo: fields['why go'],
      mapLink: extractMapLink(block),
      tags: tags.length > 0 ? tags : undefined,
    })
  }

  // Evening itineraries
  const itineraries: Array<Record<string, unknown>> = []
  const itinSection = md.match(/## SUGGESTED EVENING ITINERARIES\n([\s\S]*?)(?=\n---|\n## PRACTICAL)/)
  if (itinSection) {
    const itinBlocks = itinSection[1].split(/^### /m).slice(1)
    for (const ib of itinBlocks) {
      const lines = ib.split('\n')
      const title = lines[0].trim()
      const cityMatch = title.match(/\b(Tokyo|Kyoto|Osaka)\b/i)
      const steps: string[] = []
      for (const line of lines.slice(1)) {
        if (line.trim().startsWith('- ')) {
          steps.push(cleanText(line.trim().slice(2)))
        }
      }
      itineraries.push({
        name: title,
        city: cityMatch?.[1] || 'Tokyo',
        steps,
      })
    }
  }

  return { venues, itineraries }
}

// ============================================================
// 8. Parse coffee-donuts-matcha-guide.md
// ============================================================
type RecCategory = 'coffee' | 'donuts' | 'matcha' | 'shopping' | 'activities' | 'events'

interface Recommendation {
  id: string
  name: string
  category: RecCategory
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

// Entries we decided against — filter these out
const EXCLUDED_NAMES = [
  'STUDIO GHIBLI MUSEUM',
  'The Seiko Museum Ginza',
]

function isExcluded(name: string): boolean {
  return EXCLUDED_NAMES.some(ex => name.toLowerCase().includes(ex.toLowerCase()))
}

function parseCoffeeDonutsMatchaGuide(): Recommendation[] {
  const md = read('notes/coffee-donuts-matcha-guide.md')
  const recs: Recommendation[] = []
  let idx = 0
  let currentCity: City = 'Tokyo'
  let currentCategory: RecCategory = 'coffee'

  // Track city & category by scanning section headers
  const lines = md.split('\n')

  // Build a position map of city/category changes
  const cityMarkers: Array<{ pos: number; city: City }> = []
  const categoryMarkers: Array<{ pos: number; category: RecCategory }> = []
  let charPos = 0
  for (const line of lines) {
    if (/^### TOKYO/i.test(line)) cityMarkers.push({ pos: charPos, city: 'Tokyo' })
    else if (/^### KYOTO/i.test(line)) cityMarkers.push({ pos: charPos, city: 'Kyoto' })
    else if (/^### OSAKA/i.test(line)) cityMarkers.push({ pos: charPos, city: 'Osaka' })
    else if (/^### HAKONE/i.test(line)) cityMarkers.push({ pos: charPos, city: 'Hakone' })
    // Also catch Tea Ceremony / Matcha sections that don't have city prefix
    if (/^## PART 1: SPECIALTY COFFEE/i.test(line)) categoryMarkers.push({ pos: charPos, category: 'coffee' })
    else if (/^## PART 2: DONUTS/i.test(line)) categoryMarkers.push({ pos: charPos, category: 'donuts' })
    else if (/^## PART 3: MATCHA/i.test(line)) categoryMarkers.push({ pos: charPos, category: 'matcha' })
    charPos += line.length + 1
  }

  // Split by #### headings for individual entries
  const blocks = md.split(/^####\s+/m)

  let blockCharPos = 0
  for (const block of blocks.slice(1)) {
    const headerLine = block.split('\n')[0].trim()
    blockCharPos = md.indexOf('#### ' + headerLine, blockCharPos)
    if (blockCharPos < 0) blockCharPos = 0

    // Determine city from position
    for (const m of cityMarkers) {
      if (m.pos <= blockCharPos) currentCity = m.city
    }
    // Determine category from position
    for (const m of categoryMarkers) {
      if (m.pos <= blockCharPos) currentCategory = m.category
    }

    // Skip non-entry headers (tables, game plan, sources, etc.)
    if (/^(DAILY|SOURCES|Matcha Shopping)/i.test(headerLine)) continue
    // Skip sub-location entries like "Nakamura Tokichi Honten" under Uji day trip
    // but keep the main entry headings

    // Clean name
    const nameClean = headerLine
      .replace(/^\d+\.\s*/, '')
      .replace(/\s*\(.*?(HIGH PRIORITY|TOP RECOMMENDATION|TWO locations).*?\)/i, '')
      .replace(/\s*—.*$/, '')
      .replace(/\s*--.*$/, '')
      .replace(/^Honorable Mention:\s*/i, '')
      .trim()

    if (!nameClean || nameClean.length > 80) continue

    // Extract fields
    const fields: Record<string, string> = {}
    const blockLines = block.split('\n')
    for (const line of blockLines) {
      const trimmed = line.trim()
      const fieldMatch = trimmed.match(/^-\s+\*\*(\w[\w\s/&]+?)(?:\*\*)?:\*\*\s*(.+)/)
      if (fieldMatch) {
        fields[fieldMatch[1].toLowerCase()] = cleanText(fieldMatch[2])
      }
      // Also match standalone patterns like "- Address: ..." or "- Hours: ..."
      const simpleField = trimmed.match(/^-\s+(Address|Hours|Phone|Nearest Station|Location|Locations):\s*(.+)/i)
      if (simpleField) {
        fields[simpleField[1].toLowerCase()] = cleanText(simpleField[2])
      }
    }

    // Tags
    const tags: string[] = []
    if (/HIGH PRIORITY/i.test(headerLine) || /HIGH PRIORITY/i.test(block.slice(0, 200))) tags.push('High Priority')
    if (/TOP RECOMMENDATION/i.test(headerLine) || /TOP MATCHA/i.test(headerLine)) tags.push('Top Pick')
    if (/TWO locations/i.test(headerLine)) tags.push('Multiple Locations')
    if (/reservations?\s+(required|recommended|strongly)/i.test(block)) tags.push('Reservation Required')

    // Description: first narrative paragraph (not a bullet, not a heading, not a table)
    let description = ''
    let inBlock = false
    for (const line of blockLines.slice(1)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('|') || trimmed.startsWith('---')) {
        if (inBlock) break
        continue
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) continue
      if (/^\*\*/.test(trimmed) && /\*\*$/.test(trimmed)) continue // bold-only line (sub-heading)
      if (/^\*\*\w/.test(trimmed) && !trimmed.includes(':')) continue // bold sub-location headers
      description = cleanText(trimmed)
      inBlock = true
      break
    }

    // Extract "Why it's special" or "What to expect" as fallback description
    const whyMatch = block.match(/\*\*Why it's (?:special|the best)\*\*:\s*(.+?)(?:\n\n|\n\*\*)/s)
    if (whyMatch && !description) {
      description = cleanText(whyMatch[1].split('\n')[0])
    }
    if (!description && whyMatch) {
      description = cleanText(whyMatch[1].split('\n')[0])
    }

    // Tip from Recommendation or Strategy or Important
    const tipMatch = block.match(/\*\*(?:Recommendation|Strategy|Important|Tip|Note)\*\*:\s*(.+)/i)
    const tip = tipMatch ? cleanText(tipMatch[1]) : undefined

    // Price
    const priceMatch = block.match(/\*\*Price range\*\*:\s*(.+)/i)
    const price = priceMatch ? cleanText(priceMatch[1]) : (fields['price range'] || fields['cost'] || undefined)

    // Address (try fields, then look for bold sub-locations)
    const address = fields['address'] || fields['location'] || fields['locations'] || undefined

    // Hours
    const hours = fields['hours'] || undefined

    // Closed
    const closedMatch = block.match(/\*\*closed\s+(\w+(?:\s+and\s+\w+)?)\*\*/i)
      || block.match(/closed\s+(\w+day(?:\s+and\s+\w+day)?)/i)
    const closed = closedMatch ? closedMatch[1] : undefined

    // Map link
    const mapLink = extractMapLink(block)

    // Subcategory for matcha
    let subcategory: string | undefined
    if (currentCategory === 'matcha') {
      const beforeBlock = md.substring(0, blockCharPos)
      const lastH3 = beforeBlock.lastIndexOf('### ')
      if (lastH3 >= 0) {
        const h3Line = beforeBlock.substring(lastH3).split('\n')[0].replace('### ', '')
        if (/Tea Ceremony/i.test(h3Line)) subcategory = 'Tea Ceremony'
        else if (/Matcha Dessert/i.test(h3Line)) subcategory = 'Matcha Desserts'
        else if (/Day Trip.*Uji/i.test(h3Line)) subcategory = 'Uji Day Trip'
      }
    }
    if (currentCategory === 'coffee') subcategory = 'Specialty Coffee'
    if (currentCategory === 'donuts') subcategory = 'Donuts'

    recs.push({
      id: `rec-cdm-${idx++}`,
      name: nameClean,
      category: currentCategory,
      subcategory,
      city: currentCity,
      address,
      hours,
      closed,
      price,
      description: description || undefined,
      tip,
      tags: tags.length > 0 ? tags : undefined,
      mapLink,
    })

    blockCharPos += 1
  }

  return recs
}

// ============================================================
// 9. Parse shopping-guide.md
// ============================================================
function parseShoppingGuide(): Recommendation[] {
  const md = read('notes/shopping-guide.md')
  const recs: Recommendation[] = []
  let idx = 0
  let currentCity: City = 'Tokyo'
  let currentSubcategory = ''

  // City markers
  const tokyoStart = md.indexOf('# TOKYO')
  const kyotoStart = md.indexOf('# KYOTO')
  const osakaStart = md.indexOf('# OSAKA')
  const hakoneStart = md.indexOf('# HAKONE')
  const priorityStart = md.indexOf('# SHOPPING PRIORITY')
  const comboStart = md.indexOf('# SUGGESTED SHOPPING')

  function getCityAtPos(pos: number): City {
    if (hakoneStart >= 0 && pos >= hakoneStart && (priorityStart < 0 || pos < priorityStart)) return 'Hakone'
    if (osakaStart >= 0 && pos >= osakaStart && (hakoneStart < 0 || pos < hakoneStart)) return 'Osaka'
    if (kyotoStart >= 0 && pos >= kyotoStart && (osakaStart < 0 || pos < osakaStart)) return 'Kyoto'
    return 'Tokyo'
  }

  // Split by ### for individual shops/experiences
  const blocks = md.split(/^###\s+/m)
  let blockCharPos = 0

  for (const block of blocks.slice(1)) {
    const headerLine = block.split('\n')[0].trim()
    blockCharPos = md.indexOf('### ' + headerLine, blockCharPos)
    if (blockCharPos < 0) blockCharPos = 0

    // Skip sections that are past the shopping guide content
    if (priorityStart >= 0 && blockCharPos >= priorityStart) break
    if (comboStart >= 0 && blockCharPos >= comboStart) break

    currentCity = getCityAtPos(blockCharPos)

    // Track subcategory from ## headings before this block
    const beforeBlock = md.substring(0, blockCharPos)
    const lastH2 = beforeBlock.lastIndexOf('\n## ')
    if (lastH2 >= 0) {
      const h2Line = beforeBlock.substring(lastH2 + 4).split('\n')[0].trim()
      // Skip city-level ## headings and meta sections
      if (!/^(TOKYO|KYOTO|OSAKA|HAKONE|Tax-Free|Other)/i.test(h2Line)) {
        currentSubcategory = h2Line
      }
    }

    // Skip non-entry headings
    if (/^(Option \d|Recommendation|Multi-Brand|Custom Denim Tips|What to Look|Customs|Steel Types|Price Guidance|Other Tokyo|Other Kyoto|Other Osaka|Nishikawa Pillow)/i.test(headerLine)) {
      // Nishikawa is special — include it
      if (!/^Nishikawa/i.test(headerLine)) {
        blockCharPos += 1
        continue
      }
    }

    // Some ### are sub-locations (like "Kappabashi Street") that contain #### entries
    // Check if this block has #### sub-entries
    const hasSubEntries = /^####\s+/m.test(block)

    if (hasSubEntries) {
      // Parse #### sub-entries within this ### block
      const subBlocks = block.split(/^####\s+/m)
      let subCharPos = blockCharPos

      for (const subBlock of subBlocks.slice(1)) {
        const subHeader = subBlock.split('\n')[0].trim()
        if (!subHeader) continue

        const nameClean = subHeader
          .replace(/^\d+\.\s*/, '')
          .replace(/\s*\(.*?\)\s*$/, '')
          .replace(/\s*—.*$/, '')
          .trim()

        if (!nameClean || nameClean.length > 80) continue
        // Skip meta sub-entries
        if (/^(What to Look|Customs|Steel Types|Price Guidance|Option \d)/i.test(nameClean)) continue

        const fields: Record<string, string> = {}
        for (const line of subBlock.split('\n')) {
          const trimmed = line.trim()
          const fieldMatch = trimmed.match(/^-\s+\*\*(\w[\w\s/&]+?)(?:\*\*)?:\*\*\s*(.+)/)
          if (fieldMatch) {
            fields[fieldMatch[1].toLowerCase()] = cleanText(fieldMatch[2])
          }
        }

        const tags: string[] = []
        if (/tax-free/i.test(subBlock)) tags.push('Tax-Free')

        let description = ''
        const whatMatch = subBlock.match(/\*\*What to expect\*\*:\s*(.+)/i)
          || subBlock.match(/\*\*Why go\*\*:\s*(.+)/i)
          || subBlock.match(/\*\*What to expect:\*\*\s*(.+)/i)
        if (whatMatch) description = cleanText(whatMatch[1])

        const tipMatch = subBlock.match(/\*\*Tip\*\*:\s*(.+)/i)
          || subBlock.match(/\*\*(?:Recommendation|Strategy|Important)\*\*:\s*(.+)/i)

        recs.push({
          id: `rec-shop-${idx++}`,
          name: nameClean,
          category: 'shopping',
          subcategory: currentSubcategory || undefined,
          city: currentCity,
          neighborhood: fields['address']?.match(/\b(Shibuya|Ginza|Shinjuku|Ebisu|Roppongi|Asakusa|Akihabara|Aoyama|Tsukiji|Harajuku|Shimokitazawa|Kagurazaka|Nakameguro|Daikanyama|Ueno|Nihonbashi|Kuramae|Gion|Pontocho|Higashiyama|Nishiki|Dotonbori|Shinsekai|Shinsaibashi|Amerikamura|Namba|Horie|Kita-Aoyama|Togoshi)\b/i)?.[1],
          address: fields['address'],
          hours: fields['hours'],
          price: fields['price range'] || fields['cost'],
          description: description || undefined,
          tip: tipMatch ? cleanText(tipMatch[1]) : undefined,
          tags: tags.length > 0 ? tags : undefined,
          mapLink: extractMapLink(subBlock),
        })
      }
    } else {
      // This ### heading IS the individual entry
      const nameClean = headerLine
        .replace(/^\d+\.\s*/, '')
        .replace(/\s*\(.*?\)\s*$/, '')
        .replace(/\s*—.*$/, '')
        .trim()

      if (!nameClean || nameClean.length > 80) {
        blockCharPos += 1
        continue
      }

      const fields: Record<string, string> = {}
      for (const line of block.split('\n')) {
        const trimmed = line.trim()
        const fieldMatch = trimmed.match(/^-\s+\*\*(\w[\w\s/&]+?)(?:\*\*)?:\*\*\s*(.+)/)
        if (fieldMatch) {
          fields[fieldMatch[1].toLowerCase()] = cleanText(fieldMatch[2])
        }
      }

      const tags: string[] = []
      if (/tax-free/i.test(block.slice(0, 500))) tags.push('Tax-Free')
      if (/reservation|book/i.test(headerLine)) tags.push('Reservation Required')

      let description = ''
      const whatMatch = block.match(/\*\*What to expect\*\*:\s*(.+)/i)
        || block.match(/\*\*What to expect:\*\*\s*(.+)/i)
        || block.match(/\*\*Why go\*\*:\s*(.+)/i)
        || block.match(/\*\*Why go:\*\*\s*(.+)/i)
      if (whatMatch) description = cleanText(whatMatch[1])

      // Fallback: first narrative paragraph
      if (!description) {
        for (const line of block.split('\n').slice(1)) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('#') || trimmed.startsWith('|')) continue
          description = cleanText(trimmed)
          break
        }
      }

      const tipMatch = block.match(/\*\*Tip\*\*:\s*(.+)/i)
        || block.match(/\*\*(?:Recommendation|Strategy|Important)\*\*:\s*(.+)/i)

      recs.push({
        id: `rec-shop-${idx++}`,
        name: nameClean,
        category: 'shopping',
        subcategory: currentSubcategory || undefined,
        city: currentCity,
        neighborhood: fields['address']?.match(/\b(Shibuya|Ginza|Shinjuku|Ebisu|Roppongi|Asakusa|Akihabara|Aoyama|Tsukiji|Harajuku|Shimokitazawa|Kagurazaka|Nakameguro|Daikanyama|Ueno|Nihonbashi|Kuramae|Gion|Pontocho|Higashiyama|Nishiki|Dotonbori|Shinsekai|Shinsaibashi|Amerikamura|Namba|Horie|Togoshi)\b/i)?.[1],
        address: fields['address'],
        hours: fields['hours'],
        price: fields['price range'] || fields['price'] || fields['cost'],
        description: description || undefined,
        tip: tipMatch ? cleanText(tipMatch[1]) : undefined,
        tags: tags.length > 0 ? tags : undefined,
        mapLink: extractMapLink(block),
      })
    }

    blockCharPos += 1
  }

  return recs
}

// ============================================================
// 10. Parse activities-and-sightseeing-research.md
// ============================================================
function parseActivitiesGuide(): Recommendation[] {
  const md = read('notes/activities-and-sightseeing-research.md')
  const recs: Recommendation[] = []
  let idx = 0

  // City markers by position
  const cityPositions: Array<{ pos: number; city: City }> = []
  const lines = md.split('\n')
  let pos = 0
  for (const line of lines) {
    if (/^## .*(Tokyo)/i.test(line)) cityPositions.push({ pos, city: 'Tokyo' })
    else if (/^## .*(Kyoto)/i.test(line)) cityPositions.push({ pos, city: 'Kyoto' })
    else if (/^## .*(Osaka)/i.test(line)) cityPositions.push({ pos, city: 'Osaka' })
    else if (/^## .*(Hakone)/i.test(line)) cityPositions.push({ pos, city: 'Hakone' })
    else if (/^## NARA/i.test(line)) cityPositions.push({ pos, city: 'Tokyo' as City }) // Nara is a day trip
    pos += line.length + 1
  }

  function getCityAtPos(p: number): City {
    let city: City = 'Tokyo'
    for (const m of cityPositions) {
      if (m.pos <= p) city = m.city
    }
    return city
  }

  // Split by ## for major sections
  const sections = md.split(/^## /m).slice(1)
  let sectionPos = md.indexOf('## ')

  for (const section of sections) {
    const sectionHeader = section.split('\n')[0].trim()
    const thisPos = md.indexOf('## ' + sectionHeader, sectionPos)
    if (thisPos >= 0) sectionPos = thisPos

    // Skip non-activity sections
    if (/^(GOLDEN WEEK SURVIVAL|QUICK REFERENCE|Sources)/i.test(sectionHeader)) {
      sectionPos += 1
      continue
    }

    const city = getCityAtPos(sectionPos)

    // Extract the main activity name from the ## heading
    const activityName = sectionHeader
      .replace(/\s*\(.*?\)\s*$/, '')
      .replace(/\s*—.*$/, '')
      .trim()

    if (!activityName || activityName.length > 80) {
      sectionPos += 1
      continue
    }

    // Extract fields from the section
    const fields: Record<string, string> = {}
    for (const line of section.split('\n')) {
      const trimmed = line.trim()
      const fieldMatch = trimmed.match(/^-\s+\*\*(\w[\w\s/&:]+?)(?:\*\*)?:\*\*\s*(.+)/)
      if (fieldMatch) {
        fields[fieldMatch[1].toLowerCase()] = cleanText(fieldMatch[2])
      }
      // Simpler patterns
      const simpleMatch = trimmed.match(/^-\s+(Address|Hours|Admission|Entry|Location):\s*(.+)/i)
      if (simpleMatch) {
        fields[simpleMatch[1].toLowerCase()] = cleanText(simpleMatch[2])
      }
    }

    // Description
    let description = ''
    for (const line of section.split('\n').slice(1)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('#') || trimmed.startsWith('|') || trimmed.startsWith('---')) continue
      if (/^\*\*/.test(trimmed)) continue
      description = cleanText(trimmed)
      break
    }

    // Price / admission
    const priceMatch = section.match(/\*\*(?:Admission|Entry|Ticket Price)\*\*:\s*(.+)/i)
      || section.match(/- (?:Admission|Entry):\s*(.+)/i)
    const price = priceMatch ? cleanText(priceMatch[1]) : (fields['admission'] || fields['entry'] || undefined)

    // Tip
    const tipMatch = section.match(/\*\*(?:Tip|Best Time|Strategy|Recommendation|Verdict)\*\*:\s*(.+)/i)
      || section.match(/\*\*(?:Best Time of Day|Best Time to Arrive)\*\*\n\n-\s*(.+)/i)
    const tip = tipMatch ? cleanText(tipMatch[1]) : undefined

    // Booking info
    const bookingMatch = section.match(/\*\*How to Buy\*\*\n\n([\s\S]*?)(?:\n\n###|\n\n##|\n\n\*\*)/i)
    const bookingInfo = bookingMatch ? cleanText(bookingMatch[1].split('\n')[1]?.replace(/^-\s+/, '') || '') : undefined

    // Tags
    const tags: string[] = []
    if (/free\s+(admission|entry)/i.test(section)) tags.push('Free')
    if (/reservation|advance\s+ticket|book\s+early|pre-book/i.test(section)) tags.push('Reservation Required')

    const mapLink = extractMapLink(section)

    // Address
    const addrMatch = section.match(/- Address:\s*(.+)/i)
      || section.match(/\*\*Address\*\*:\s*(.+)/i)
    const address = addrMatch ? cleanText(addrMatch[1]) : (fields['address'] || fields['location'] || undefined)

    // Determine subcategory
    let subcategory: string | undefined
    if (/onsen|sento|bath/i.test(sectionHeader)) subcategory = 'Onsen'
    else if (/temple|shrine|inari/i.test(sectionHeader)) subcategory = 'Temples & Shrines'
    else if (/market/i.test(sectionHeader)) subcategory = 'Markets'
    else if (/teamlab/i.test(sectionHeader)) subcategory = 'Immersive Art'
    else if (/ghibli/i.test(sectionHeader)) subcategory = 'Museums'
    else if (/sky|observation/i.test(sectionHeader)) subcategory = 'Observation'
    else if (/nara/i.test(sectionHeader)) subcategory = 'Day Trips'

    recs.push({
      id: `rec-act-${idx++}`,
      name: activityName,
      category: 'activities',
      subcategory,
      city,
      address,
      hours: fields['hours'],
      price,
      description: description || undefined,
      tip,
      tags: tags.length > 0 ? tags : undefined,
      mapLink,
      bookingInfo,
    })

    sectionPos += 1
  }

  return recs
}

// ============================================================
// 11. Parse events guides
// ============================================================
function parseEventsGuides(): Recommendation[] {
  const recs: Recommendation[] = []
  let idx = 0

  // Parse both event files
  for (const filePath of ['data/golden-week-events-2026.md', 'data/tokyo-events-april-may-2026.md']) {
    const md = read(filePath)
    const isTokyoFile = filePath.includes('tokyo-events')
    let currentCity: City = isTokyoFile ? 'Tokyo' : 'Tokyo'

    // City markers
    const cityMarkers: Array<{ pos: number; city: City }> = []
    let charPos = 0
    for (const line of md.split('\n')) {
      if (/^## (?:KYOTO|.*Kyoto)/i.test(line)) cityMarkers.push({ pos: charPos, city: 'Kyoto' })
      else if (/^## (?:OSAKA|.*Osaka)/i.test(line)) cityMarkers.push({ pos: charPos, city: 'Osaka' })
      else if (/^## (?:HAKONE|.*Hakone)/i.test(line)) cityMarkers.push({ pos: charPos, city: 'Hakone' })
      else if (/^## (?:TOKYO|.*Tokyo|\d+\.\s)/i.test(line)) cityMarkers.push({ pos: charPos, city: 'Tokyo' })
      charPos += line.length + 1
    }

    // Split by #### for individual events
    const blocks = md.split(/^####\s+/m)
    let blockCharPos = 0

    for (const block of blocks.slice(1)) {
      const headerLine = block.split('\n')[0].trim()
      blockCharPos = md.indexOf('#### ' + headerLine, blockCharPos)
      if (blockCharPos < 0) blockCharPos = 0

      // Determine city
      currentCity = isTokyoFile ? 'Tokyo' : 'Tokyo'
      for (const m of cityMarkers) {
        if (m.pos <= blockCharPos) currentCity = m.city
      }

      // Skip non-event headers
      if (/^(TRANSPORT|SUMMARY|TOP REC|Crowd|Market Alternative)/i.test(headerLine)) {
        blockCharPos += 1
        continue
      }

      const nameClean = headerLine
        .replace(/^\d+\.\s*/, '')
        .replace(/\s*\(.*?\)\s*$/, '')
        .replace(/\s*—.*$/, '')
        .trim()

      if (!nameClean || nameClean.length > 100) {
        blockCharPos += 1
        continue
      }

      // Extract fields
      const fields: Record<string, string> = {}
      for (const line of block.split('\n')) {
        const trimmed = line.trim()
        const fieldMatch = trimmed.match(/^-\s+\*\*(\w[\w\s/&:]+?)(?:\*\*)?:\*\*\s*(.+)/)
        if (fieldMatch) {
          fields[fieldMatch[1].toLowerCase()] = cleanText(fieldMatch[2])
        }
      }

      // Dates
      const datesMatch = block.match(/\*\*Dates?\*\*:\s*(.+)/i)
        || block.match(/\*\*When\*\*:\s*(.+)/i)
        || headerLine.match(/\(([^)]*(?:April|May|Apr|Jun|Jul|Aug|Sep)[^)]*)\)/)
      const dates = datesMatch ? cleanText(datesMatch[1]) : undefined

      // Description
      let description = ''
      const whatMatch = block.match(/\*\*(?:What|Highlights?)\*\*:\s*(.+)/i)
      if (whatMatch) {
        description = cleanText(whatMatch[1])
      } else {
        for (const line of block.split('\n').slice(1)) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('#') || trimmed.startsWith('|')) continue
          if (/^\*\*/.test(trimmed)) continue
          description = cleanText(trimmed)
          break
        }
      }

      // Location / address
      const location = fields['location'] || fields['venue'] || undefined

      // Price
      const price = fields['admission'] || fields['tickets'] || undefined

      // Tip / note
      const tipMatch = block.match(/\*\*(?:Tip|Note)\*\*:\s*(.+)/i)
      const tip = tipMatch ? cleanText(tipMatch[1]) : undefined

      // Tags
      const tags: string[] = []
      if (/free/i.test(block.slice(0, 200)) && !/tax-free/i.test(block.slice(0, 200))) tags.push('Free')

      // Subcategory
      let subcategory: string | undefined
      const beforeBlock = md.substring(0, blockCharPos)
      const lastH3 = beforeBlock.lastIndexOf('### ')
      if (lastH3 >= 0) {
        const h3Line = beforeBlock.substring(lastH3 + 4).split('\n')[0]
        if (/Festival/i.test(h3Line)) subcategory = 'Festivals'
        else if (/Market/i.test(h3Line)) subcategory = 'Markets'
        else if (/Temple|Shrine/i.test(h3Line)) subcategory = 'Temple Events'
        else if (/Art|Culture/i.test(h3Line)) subcategory = 'Art & Culture'
        else if (/Jazz|Rock|Music/i.test(h3Line)) subcategory = 'Live Music'
      }
      if (isTokyoFile) {
        if (/festival|matsuri/i.test(headerLine)) subcategory = 'Festivals'
        else if (/jazz|music|concert/i.test(headerLine)) subcategory = 'Live Music'
        else if (/art|exhibition|museum/i.test(headerLine)) subcategory = 'Art & Culture'
      }

      recs.push({
        id: `rec-evt-${idx++}`,
        name: nameClean,
        category: 'events',
        subcategory,
        city: currentCity,
        address: location,
        price,
        dates,
        description: description || undefined,
        tip,
        tags: tags.length > 0 ? tags : undefined,
        mapLink: extractMapLink(block),
      })

      blockCharPos += 1
    }

    // Also parse ### entries from the Tokyo events file (some events are at ### level)
    if (isTokyoFile) {
      const h3Blocks = md.split(/^###\s+/m).slice(1)
      let h3Pos = 0
      for (const block of h3Blocks) {
        const headerLine = block.split('\n')[0].trim()
        h3Pos = md.indexOf('### ' + headerLine, h3Pos)
        if (h3Pos < 0) h3Pos = 0

        // Only process entries that don't contain #### sub-entries (those were already handled)
        if (/^####/m.test(block)) {
          h3Pos += 1
          continue
        }

        // Skip venue lists, meta sections
        if (/^(Confirmed|Slightly After|Venues to Check|Key Dates|Kikagaku|Guruguru|Tomo|Go Kurosawa|Maya)/i.test(headerLine)) {
          h3Pos += 1
          continue
        }

        // Skip if it's a non-event section
        if (/^(Which|Best|Must-See|How|Ticket|Location|Golden Week)/i.test(headerLine)) {
          h3Pos += 1
          continue
        }

        const nameClean = headerLine.replace(/^\d+\.\s*/, '').replace(/\s*—.*$/, '').trim()
        if (!nameClean || nameClean.length > 100) {
          h3Pos += 1
          continue
        }

        // Some ### entries are real events
        const datesMatch = block.match(/\*\*Dates?\*\*:\s*(.+)/i)
          || block.match(/\*\*Date\*\*:\s*(.+)/i)
        if (!datesMatch && !/festival|matsuri|exhibition|concert|event/i.test(headerLine)) {
          h3Pos += 1
          continue
        }

        const fields: Record<string, string> = {}
        for (const line of block.split('\n')) {
          const trimmed = line.trim()
          const fieldMatch = trimmed.match(/^-\s+\*\*(\w[\w\s/&:]+?)(?:\*\*)?:\*\*\s*(.+)/)
          if (fieldMatch) {
            fields[fieldMatch[1].toLowerCase()] = cleanText(fieldMatch[2])
          }
        }

        let description = ''
        const whatMatch = block.match(/\*\*(?:What|Highlights?)\*\*:\s*(.+)/i)
        if (whatMatch) description = cleanText(whatMatch[1])

        recs.push({
          id: `rec-evt-${idx++}`,
          name: nameClean,
          category: 'events',
          subcategory: /exhibition|art|museum/i.test(nameClean) ? 'Art & Culture' : /festival|matsuri/i.test(nameClean) ? 'Festivals' : /jazz|music/i.test(nameClean) ? 'Live Music' : undefined,
          city: 'Tokyo',
          address: fields['location'] || fields['venue'],
          price: fields['admission'] || fields['tickets'],
          dates: datesMatch ? cleanText(datesMatch[1]) : undefined,
          description: description || undefined,
          tags: /free/i.test(block.slice(0, 300)) ? ['Free'] : undefined,
          mapLink: extractMapLink(block),
        })

        h3Pos += 1
      }
    }
  }

  return recs
}

// ============================================================
// Main
// ============================================================
console.log('Building trip data from markdown sources...\n')

const itinerary = parseItinerary()
write('itinerary.json', itinerary)

const schedule = parseDailySchedule()
write('daily-schedule.json', schedule)

const reservations = parseReservations()
write('reservations.json', reservations)

const transport = parseTransport()
write('transport.json', transport)

const packing = parsePackingList()
write('packing.json', packing)

const restaurants = parseRestaurantGuide()
write('restaurants.json', restaurants)

const nightlife = parseNightlifeGuide()
write('nightlife.json', nightlife)

const recommendations = [
  ...parseCoffeeDonutsMatchaGuide(),
  ...parseShoppingGuide(),
  ...parseActivitiesGuide(),
  ...parseEventsGuides(),
].filter(r => !isExcluded(r.name))
write('recommendations.json', recommendations)

console.log(`\nDone! ${8} files generated in src/data/generated/`)
console.log(`  Recommendations: ${recommendations.length} items`)
