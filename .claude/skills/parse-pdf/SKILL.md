---
name: parse-pdf
description: Parse PDF files containing Japan travel recommendations - extracts text, links, and structure. Use when asked to process or parse PDF files.
argument-hint: <pdf-path> [pdf-path2] ...
allowed-tools: Bash(python *), Bash(source *), Bash(pip *), Read, Glob, Grep
---

# Parse PDF Recommendations

## Setup

Ensure the virtual environment is active and dependencies are installed:

```bash
source .venv/bin/activate 2>/dev/null || (python3 -m venv .venv && source .venv/bin/activate)
pip install -q -r requirements.txt
```

## Task

Parse the following PDF file(s): $ARGUMENTS

Run the parser:

```bash
source .venv/bin/activate && python scripts/parse_pdf.py $ARGUMENTS
```

This will:
1. Extract text from each page (with fallback for tricky layouts)
2. Pull out hyperlinks from annotations and inline URLs
3. Count images per page
4. Save results as JSON in `data/raw/pdfs/<filename>.json`

## After Processing

- Read the output JSON and summarize the recommendations found
- Extract and list any specific places mentioned (restaurants, shops, attractions, neighborhoods)
- Note any Instagram links or other URLs found (these could be processed with `/process-reel`)
- Group recommendations by area/neighborhood if possible

## Available PDFs

!`find notes/ -name "*.pdf" 2>/dev/null || echo "No PDFs in notes/ yet"`

## Already Parsed

!`ls data/raw/pdfs/*.json 2>/dev/null || echo "No PDFs parsed yet"`
