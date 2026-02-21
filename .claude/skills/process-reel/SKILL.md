---
name: process-reel
description: Download, parse, and classify Instagram reels - extracts captions, transcribes audio, OCRs on-screen text, then classifies content with sentiment and categories. Use when asked to process Instagram reel URLs.
argument-hint: <reel-url> [reel-url2] ...
allowed-tools: Bash(python *), Bash(source *), Bash(pip *), Read, Glob, Grep
---

# Process Instagram Reel

## Setup

Ensure the virtual environment is active and dependencies are installed:

```bash
source .venv/bin/activate 2>/dev/null || (python3 -m venv .venv && source .venv/bin/activate)
pip install -q -r requirements.txt
```

## Task

Process the following Instagram reel URL(s): $ARGUMENTS

### Step 1: Download and extract content

```bash
source .venv/bin/activate && python scripts/process_reel.py $ARGUMENTS
```

This downloads the video, extracts the caption, transcribes audio, and OCRs on-screen text into `data/raw/<shortcode>/parsed.json`.

### Step 2: Classify with LLM

For each processed reel, run classification (requires ANTHROPIC_API_KEY):

```bash
source .venv/bin/activate && python scripts/classify_reel.py data/raw/<shortcode>/parsed.json
```

This produces `data/raw/<shortcode>/classified.json` with:
- **sentiment**: must_do / recommended / neutral / mixed / skip / avoid
- **content_type**: place_review / food_review / shopping / event / general_advice / itinerary_tip / cultural_info
- **locations**: structured place data (name, category, city, neighborhood, specific items, price, reservation info)
- **travel_tips**: general advice not tied to a specific place
- **relevant_to_trip**: whether it matters for our Tokyo/Kyoto/Osaka/Hakone itinerary

## After Processing

- Read both the parsed.json and classified.json files
- Present the classification results clearly: sentiment, locations found, and any travel tips
- If sentiment is "must_do" or "recommended", highlight how it might fit into the itinerary
- If any locations were identified, note which city/neighborhood they're in
- Flag any Instagram links found in captions (could be processed as additional reels)

## Existing Processed Reels

Parsed: !`ls data/raw/*/parsed.json 2>/dev/null || echo "None yet"`
Classified: !`ls data/raw/*/classified.json 2>/dev/null || echo "None yet"`
