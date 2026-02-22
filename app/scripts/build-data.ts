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

console.log(`\nDone! ${7} files generated in src/data/generated/`)
