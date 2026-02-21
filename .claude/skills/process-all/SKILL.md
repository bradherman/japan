---
name: process-all
description: Process all unprocessed content in the notes directory - parses PDFs, processes Instagram reel URLs found in notes, classifies everything, and summarizes. Use when asked to process all notes or prepare all content.
allowed-tools: Bash(python *), Bash(source *), Bash(pip *), Read, Glob, Grep, Write
---

# Process All Notes & Content

## Setup

```bash
source .venv/bin/activate 2>/dev/null || (python3 -m venv .venv && source .venv/bin/activate)
pip install -q -r requirements.txt
```

## Current Notes

!`ls -la notes/ 2>/dev/null || echo "notes/ directory is empty"`

## Already Processed

- Reels parsed: !`ls data/raw/*/parsed.json 2>/dev/null | wc -l | tr -d ' '`
- Reels classified: !`ls data/raw/*/classified.json 2>/dev/null | wc -l | tr -d ' '`
- PDFs parsed: !`ls data/raw/pdfs/*.json 2>/dev/null | wc -l | tr -d ' '`

## Task

Process all unprocessed content in the `notes/` directory:

### Step 1: Parse all PDFs
Find and parse any PDF files that haven't been processed yet:

```bash
source .venv/bin/activate && python scripts/parse_pdf.py notes/pdfs-from-friend/*.pdf
```

### Step 2: Find Instagram URLs
Search through all notes files for Instagram reel/post URLs:

```bash
grep -roh 'https://www.instagram.com/\(reels\?/\|p/\)[A-Za-z0-9_-]*/' notes/ | sort -u
```

### Step 3: Process Instagram reels
For each Instagram URL found that hasn't been processed, run the full pipeline:

```bash
source .venv/bin/activate && python scripts/process_reel.py <urls>
```

### Step 4: Classify all unclassified reels
For each reel that has a parsed.json but no classified.json:

```bash
source .venv/bin/activate && python scripts/classify_reel.py data/raw/<shortcode>/parsed.json
```

### Step 5: Read and summarize text notes
Read any plain text or markdown files in `notes/` and extract useful content.

## After Processing

Produce a comprehensive summary:
- Total content processed (PDFs, reels, notes)
- All places found across all sources, grouped by city and category
- Sentiment breakdown: what's a must-do vs skip
- Any content that failed to process and why
- Instagram URLs found in PDFs or notes that need further processing
