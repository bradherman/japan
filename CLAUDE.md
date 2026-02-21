# Japan Trip Planner

A tool for aggregating travel research from multiple sources (notes, conversations, Instagram videos, web links), classifying and mapping locations, discovering events, and generating a trip itinerary.

## Project Overview

### Goals
- Ingest notes, conversations, links, and Instagram video URLs
- Crawl Instagram videos and extract content (captions, transcripts, in-video text)
- Classify content with LLM: sentiment (must_do → avoid), category, structured place data
- Map locations geographically
- Discover events happening during a specified travel window
- Generate and refine a trip itinerary

### Tech Stack
- **Language**: Python 3.11+
- **Instagram download**: `instaloader` (primary) + `yt-dlp` (fallback)
- **Audio transcription**: `faster-whisper` (large-v3-turbo model, local)
- **OCR**: `easyocr` (English + Japanese)
- **Video processing**: `opencv-python-headless`
- **PDF parsing**: `pymupdf`
- **LLM classification**: `anthropic` (Claude Sonnet) — requires ANTHROPIC_API_KEY
- **Data storage**: Local JSON files

## Project Structure

```
notes/
  instagram-links.md      # Instagram URLs to process (one per line)
  base-itinerary.md       # Day-by-day itinerary with hotels and transport
  preferences.md          # Trip preferences, food/drink, activities, shopping
  unstructured-notes.md   # Unsorted places and recommendations
  ritz-carlton-*.md       # Restaurant recs from Ritz-Carlton concierge (5 files)
  originals/              # Backup of pre-processed original files
data/
  raw/                    # Downloaded videos + parsed JSON per reel (by shortcode)
    <shortcode>/
      parsed.json         # Raw extraction: caption, transcript, OCR text
      classified.json     # LLM classification: sentiment, categories, places
    pdfs/                 # Parsed PDF output JSON files
  classified/             # Content organized by category
  locations/              # Geocoded location data
scripts/
  process_reel.py         # Instagram reel download + parse pipeline
  classify_reel.py        # LLM classification of parsed reel content
  parse_pdf.py            # PDF recommendation extractor
config/                   # API keys, trip dates, category definitions
```

## Commands

```bash
# Set up virtual environment
python3 -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Process an Instagram reel (download + transcribe + OCR)
python scripts/process_reel.py <reel_url>

# Process with classification (also runs LLM analysis)
python scripts/process_reel.py --classify <reel_url>

# Classify an already-parsed reel
python scripts/classify_reel.py data/raw/<shortcode>/parsed.json

# Parse recommendation PDFs
python scripts/parse_pdf.py notes/pdfs-from-friend/*.pdf
```

## Skills (Slash Commands)

- `/process-reel <url>` — Full pipeline: download, extract, classify an Instagram reel
- `/parse-pdf <path>` — Parse PDF files and extract structured data
- `/process-all` — Process everything in notes/ that hasn't been processed yet

## Classification Schema

Each reel is classified with:
- **sentiment**: must_do | recommended | neutral | mixed | skip | avoid
- **content_type**: place_review | food_review | shopping | event | general_advice | itinerary_tip | cultural_info
- **locations[]**: structured place data with name, category, city, neighborhood, items, pricing, reservation info
- **relevant_to_trip**: whether it applies to our Tokyo/Kyoto/Osaka/Hakone itinerary

## Conventions
- Use Python 3.11+
- Keep scripts modular and composable
- Store raw/source data separately from processed data
- Use type hints in Python code
- Each reel gets its own subdirectory under `data/raw/<shortcode>/`
