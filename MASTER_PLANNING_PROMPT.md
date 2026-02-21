# Japan Trip Planning — Master Prompt

> **Model**: Use **Claude Opus 4.6** (`claude-opus-4-6`) — this is a multi-hour, deeply creative planning task that benefits from Opus's superior reasoning, long-horizon planning, and nuanced judgment. Sonnet is fine for the classification subtasks, but the orchestration and final itinerary benefit from Opus.
>
> Since you're on **Pro Max**, the Claude Code session itself is covered by your subscription. The only API cost is the `classify_reel.py` script calling Sonnet directly (see cost estimate at bottom).

---

**Copy everything below this line and paste it into a fresh Claude Code session in the `/Users/bherms/src/japan` project directory.**

---

I need you to plan a comprehensive, day-by-day Japan trip itinerary. This is a big task — take your time, be thorough, and think deeply. You have full access to web search, all project skills, and all tools. Make sure to source `.env` before running any scripts that need the API key (`source .env`).

## Error Handling & Self-Healing

This is a long-running, multi-phase task. Things WILL break. Follow these rules:

1. **Never stop on a single failure.** If one Instagram reel fails to download, log it and move on to the next. Process everything you can.
2. **Retry transient errors.** Instagram 403s, rate limits, and network timeouts are transient — wait 10-30 seconds and retry once before giving up on that URL.
3. **If a script crashes, diagnose and fix it.** Read the error, look at the script source, fix the bug, and re-run. You have full edit access to all scripts.
4. **If a dependency is missing, install it.** `pip install` whatever is needed.
5. **If the whisper model fails to load** (memory, download issues), try a smaller model — edit `process_reel.py` to use `medium` or `small` instead of `large-v3-turbo`.
6. **If Instagram blocks downloads**, try the yt-dlp fallback (it uses Chrome cookies). If both fail, skip that URL and add it to a `data/failed-urls.txt` file for manual review.
7. **Track progress.** After each batch of reels, report how many succeeded, skipped, and failed. The scripts print stats at the end of each run.
8. **Never re-process work that's already done.** The scripts automatically skip reels/classifications that already have output files (`parsed.json`, `classified.json`). Use `--force` only if explicitly asked.

## Phase 1: Ingest & Process All Content

Start by processing every piece of source material we've collected:

### 1a. Process all Instagram reels
- Read `notes/instagram-links.md` for all URLs (there are ~114 links)
- Strip the backtick formatting when extracting URLs from the markdown
- Run `scripts/process_reel.py` in batches to download, transcribe, and OCR each reel
- Then classify each one with `scripts/classify_reel.py`
- This will produce `parsed.json` and `classified.json` per reel in `data/raw/<shortcode>/`
- **Deduplication is built in**: each reel is stored by its shortcode (the ID from the URL). If `data/raw/<shortcode>/parsed.json` already exists, it will be skipped automatically. Same for classification. This means the process is **fully resumable** — if it crashes at reel #47, just re-run and it will skip the first 46.
- Important: the links use `instagram.com/p/` format (no www) — the scripts handle this
- Process in batches. Respect Instagram rate limits — add a few seconds of sleep between downloads if you hit 403s. If a batch fails partway, re-run the same batch and already-processed reels will be skipped.

### 1b. Read all notes files
Read and deeply internalize every file in `notes/`:
- `base-itinerary.md` — fixed dates, hotels, confirmed transport
- `preferences.md` — our detailed preferences, must-dos, food/drink priorities, shopping goals, anti-preferences
- `unstructured-notes.md` — unsorted places and recommendations
- `ritz-carlton-kyoto-lunch-recs.md` — 30+ Kyoto restaurant recommendations
- `ritz-carlton-tokyo-sushi-michelin.md` — Michelin sushi in Tokyo
- `ritz-carlton-tokyo-sushi-casual.md` — Casual sushi in Tokyo
- `ritz-carlton-tokyo-teppanyaki.md` — Teppanyaki in Tokyo
- `ritz-carlton-tokyo-yakiniku.md` — Yakiniku/BBQ in Tokyo
- `friends-convo-summary.md` — **Critical context**: summarized group chat with friends Dave & Gail about Tokyo preferences. Contains agreed activities, individual preferences, onsen/watch factory split plan, nightlife consensus, and scheduling agreements. Read this carefully — it has specific constraints (Gail can't hike, Alyona wants afternoon onsen, Dave needs work time, etc.)

### 1c. Build a master database
After processing everything, compile a single consolidated view of ALL places, restaurants, shops, activities, and tips from every source (notes, PDFs, Instagram reels). Group by city and category. Save this to `data/classified/master-database.md`.

## Phase 2: Deep Web Research

Search the web extensively to fill gaps and enrich the plan. Research ALL of the following:

### Events & Festivals
- What's happening in Tokyo Apr 25–30, Kyoto Apr 30–May 4, Osaka May 4–7, Hakone May 7–9 during Golden Week 2026?
- Any special events, festivals, pop-ups, markets, or seasonal things we shouldn't miss?
- Are there any Kikagaku Moyo member side-project concerts in Tokyo or elsewhere in late April / early May 2026?

### Restaurants & Food
- Verify hours and reservation info for places we've identified — some may be outdated
- Research the best ramen, sushi, udon, teppanyaki, street food spots that match our preferences (high quality, not insanely expensive, reservable when possible)
- Find the best coffee shops in each city (we are serious coffee snobs)
- Find the best donut spots in Tokyo
- Research Michelin-starred lunch deals in Tokyo, Kyoto, and Osaka
- Research the best matcha experiences in Kyoto

### Nightlife & Music
- Best vinyl/record bars in Tokyo, Kyoto, and Osaka
- Best jazz bars (especially gypsy jazz) in Tokyo
- Live music venues that might have psychedelic rock or jazz shows during our dates
- Late night areas beyond Golden Gai — less touristy alternatives
- Best craft cocktail bars in each city

### Shopping
- Grand Seiko factory tour — how to book, where, logistics from Tokyo
- Grand Seiko boutiques and authorized dealers in Tokyo for purchasing (~$6,000 range + ~$2,000 for Alyona)
- Best secondhand/pre-owned watch shops in Tokyo (for Kurono, Grand Seiko)
- Kurono Tokyo boutique — location, what to expect
- Kuoe Watches in Kyoto — location, hours
- Flower Mountain shoe stores in Tokyo
- Best artisan knife shops in Tokyo (for a high-end chef's knife)
- Momotaro denim — Tokyo locations, custom painting/embroidery options
- Other custom denim options in Tokyo with embroidery/painting
- Nishikawa custom pillow experience — Tokyo location, how to book
- Chopstick making classes in Tokyo — best options, how to book
- Jins eyewear — convenient locations near our hotels
- Where to buy Royce chocolate (airport availability?)
- Mofusand cat toy stores in Tokyo

### Activities & Sightseeing
- teamLab — which experience (Borderless vs Planets vs other), tickets, timing, best time of day
- Studio Ghibli Museum — ticket availability for late April (these sell out far in advance)
- Tsukiji outer market — best time to go, what to eat, how long to spend
- Shibuya Sky — tickets, best time of day
- Best onsen near Tokyo that are co-ed and tattoo-friendly
- Nara day trip from Kyoto — logistics, must-sees, timing
- What to do in Hakone for short easy outings from a ryokan
- Fushimi Inari and other Kyoto must-sees
- Best neighborhoods to explore in Osaka (Dotonbori, Shinsekai, etc.)

### Reservations Research
For every restaurant or experience you plan to include, actively check whether reservations are available and HOW to book. Japan rarely uses OpenTable. Research and use these platforms:
- **Tabelog** (tabelog.com) — Japan's dominant restaurant review/booking site. Check each restaurant's Tabelog page for online reservation availability.
- **TableAll** (tableall.com) — concierge-style booking for high-end restaurants
- **Omakase** (omakase.in) — reservation platform for sushi and omakase experiences
- **Pocket Concierge** — English-friendly restaurant reservations
- **Direct phone/website** — many places only accept phone reservations (note the phone number and any Japanese-only requirements)
- **Google Maps** — check if "Reserve a table" button is available
- For activities (teamLab, chopstick making, Grand Seiko factory, etc.), find the actual booking URLs and note whether advance purchase is required

### Transport
- NRT airport → Shibuya Granbell Hotel: best option
- Shibuya hotel → Tokyo Station: route for Shinkansen day
- Kyoto Station → Hotel Forza Kyoto Shijo Kawaramachi: best option
- Odawara → Hakone Gora Byakudan: best option
- Hakone → Tokyo (Hotel MyStays Nippori): best option
- Hotel MyStays Nippori → Narita Airport: best option
- Should we get a JR Pass or Suica/Pasmo? Cost analysis for our specific itinerary
- IC card (Suica/Pasmo) — how to get, where to load

## Phase 3: Build the Itinerary

Now plan every day. Follow these principles religiously:

### Structural Rules
1. **One neighborhood focus per day** — don't zigzag across a city. Plan geographically.
2. **Variety in cuisine** — never repeat a cuisine type on consecutive meals. If we have ramen for lunch, dinner should be something different. Across the whole trip, ensure we hit: sushi (at least 2x — one high-end, one casual), ramen, udon, soba, teppanyaki, yakiniku, tonkatsu, tempura, kaiseki, street food, izakaya, curry, and anything else essential.
3. **Buffer time** — every activity estimate should have 1-2 hours of slack. We won't rush.
4. **Morning coffee** — every day starts with a great coffee spot near where we are.
5. **Dinner reservations** — for any sit-down dinner, note whether we should reserve in advance and how (phone, Tabelog, etc.)
6. **Friends overlap (Apr 25-30)** — shared experiences with Dave & Gail should be the priority. Save solo/couple activities for after Tokyo.
7. **Golden Week awareness** — flag anything that might be affected (closures, extreme crowds, special events).
8. **Hakone = rest** — May 7-9 should be mostly ryokan time with maybe one or two easy outings.
9. **Birthday (May 6)** — make this day special beyond just the dinner reservation. It's Brad's 40th.
10. **Leave room for spontaneity** — don't over-schedule. 2-3 planned activities per day max, with suggestions for "if you have extra time" alternatives.

### Multiple Options Per Slot

For EVERY meal and activity slot, provide **2-3 ranked options** so we have flexibility. Format:

```
### Lunch
1. **[Top Pick] Restaurant Name** — Cuisine, ~¥X,000/pp
   - Why: [reason this is #1]
   - Reserve: [how to book — Tabelog link, phone number, walk-in, etc.]
   - Hours: [hours] | Closed: [days]
   - Address: [address]

2. **[Backup] Restaurant Name** — Cuisine, ~¥X,000/pp
   - Why: [reason this is a good alternative]
   - Reserve: [how to book]
   - Hours: [hours] | Closed: [days]
   - Address: [address]

3. **[Casual/Flexible] Restaurant Name** — Cuisine, ~¥X,000/pp
   - Why: [good if we want something quick/easy/different]
   - Reserve: [walk-in / no reservation needed]
   - Address: [address]
```

This applies to dinners, lunches, nightlife, and activities. Always give us a top pick, a backup, and a casual/flexible fallback.

### Format for Each Day

```
## [Day X] — [Date] — [City] — [Neighborhood Focus]

### Morning
- Coffee: [2-3 options near the day's area with addresses]
- Activity: [what to do, timing estimates]

### Lunch
[2-3 ranked options as described above]

### Afternoon
- Activity: [what to do]
- Optional: [alternatives if time/energy allows]

### Dinner
[2-3 ranked options as described above]

### Evening / Nightlife
[2-3 options — bars, jazz, vinyl, cocktails — with addresses and vibe descriptions]

### Notes
- [Transit tips, timing warnings, Golden Week impacts, etc.]
```

## Phase 4: Outputs

After building the itinerary, save these files:

1. **`notes/itinerary-draft.md`** — The full day-by-day itinerary with all options
2. **`notes/restaurants-master.md`** — Every restaurant in the plan with all details (hours, budget, reservation method, Tabelog/booking link, address, what to order, cash-only flag)
3. **`notes/shopping-guide.md`** — All shopping destinations organized by city with addresses, hours, and what to buy
4. **`notes/transport-guide.md`** — All intercity and intracity transport instructions
5. **`notes/reservations-todo.md`** — A prioritized checklist of everything we need to book in advance, organized by urgency:
   - **Book NOW** (sells out weeks ahead): Ghibli tickets, teamLab, factory tours, popular omakase
   - **Book 1-2 weeks before**: Popular dinner reservations, cooking classes
   - **Book day-of or walk-in**: Casual spots, walk-in-only places
   - Include the exact booking method for each (URL, phone number, platform)
6. **`notes/daily-cuisine-tracker.md`** — A simple grid showing what cuisine we're eating at each meal across the whole trip, to verify variety and no back-to-back repeats

## Important Reminders

- Read `preferences.md` carefully — it has strong opinions. We prefer hidden gems over viral Instagram spots. We're coffee and food snobs. We love jazz and vinyl. Brad is a watch obsessive.
- Don't suggest places just because they're famous. Prioritize quality and fit with our preferences.
- For restaurants, always note if it's cash only.
- We prefer to walk and explore, so factor in walking time between places and assume we'll wander.
- If something from the Instagram reels classified as "must_do" or "recommended" fits naturally into a day, include it. If it classified as "skip" or "avoid", exclude it.
- If you find conflicting information (e.g. hours from our notes vs. web search), flag it.
- This trip is a celebration. It should feel special, not like a checklist.
- When checking reservation platforms, actually try to visit the Tabelog or booking page via web fetch to confirm availability — don't just guess.
- **You are NOT limited to places and activities mentioned in our notes.** Our notes are a starting point, not a boundary. Use web research aggressively to discover restaurants, bars, shops, experiences, and events that match our preferences — even if we've never heard of them. The best itinerary will blend our collected research with things we haven't found yet. If you find a jazz bar, coffee shop, or hidden-gem ramen spot that perfectly fits our vibe but isn't in any of our notes, absolutely include it.
