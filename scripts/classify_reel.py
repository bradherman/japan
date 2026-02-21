"""
Instagram Reel Classifier

Takes raw parsed reel data (caption, transcript, on-screen text) and uses
Claude to classify the content with sentiment, categories, and structured
place/recommendation data.

Usage:
    python scripts/classify_reel.py data/raw/<shortcode>/parsed.json
    python scripts/classify_reel.py data/raw/*/parsed.json
"""

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import anthropic

CLASSIFICATION_PROMPT = """\
You are analyzing an Instagram reel about Japan travel. You have been given
the caption, audio transcript, and on-screen text extracted from the video.

Analyze this content and return a JSON object with the following structure:

{
  "summary": "1-2 sentence summary of what this reel is about",
  "sentiment": "one of: must_do | recommended | neutral | mixed | skip | avoid",
  "sentiment_reasoning": "brief explanation of why you chose this sentiment — what language or tone indicated it",
  "content_type": "one of: place_review | food_review | shopping | event | general_advice | itinerary_tip | cultural_info | other",
  "locations": [
    {
      "name": "Place name (in English, with Japanese name if visible)",
      "category": "one of: restaurant | cafe | bar | street_food | market | shop | attraction | shrine_temple | neighborhood | hotel | transport | event_venue | other",
      "neighborhood": "neighborhood or area if mentioned (e.g. Shibuya, Shinjuku, Gion)",
      "city": "one of: Tokyo | Kyoto | Osaka | Hakone | Nara | other | unknown",
      "specific_items": ["specific dishes, products, or things recommended at this location"],
      "price_info": "any pricing mentioned, or null",
      "reservation_info": "any reservation tips mentioned, or null",
      "hours_or_timing": "any timing tips (best time to go, hours, wait times), or null",
      "google_maps_searchable": "a search query that would find this place on Google Maps"
    }
  ],
  "travel_tips": ["any general travel advice or tips mentioned that aren't tied to a specific location"],
  "relevant_to_trip": true,
  "relevance_note": "why this is or isn't relevant to a 15-day Japan trip covering Tokyo, Kyoto, Osaka, and Hakone in late April / early May 2026 (Golden Week)"
}

Rules:
- "sentiment" reflects the creator's recommendation strength:
  - must_do: "you HAVE to do this", "best thing ever", "don't miss this"
  - recommended: generally positive, worth doing
  - neutral: informational, no strong opinion
  - mixed: some good, some bad, or "it depends"
  - skip: "not worth it", "overrated", "save your money"
  - avoid: "don't do this", "terrible", "tourist trap"
- A single reel may mention multiple locations — list them all
- If the reel is about general Japan travel advice (e.g. "things I wish I knew"),
  content_type should be "general_advice" and locations may be empty
- If price info is in yen, keep it in yen. Don't convert currencies.
- "relevant_to_trip" should be false only if the content is about regions/cities
  not on the itinerary, or is clearly not applicable (e.g. skiing in Hokkaido)

Return ONLY the JSON object, no markdown fences, no explanation.\
"""


def classify_reel(parsed_path: str) -> dict:
    """Classify a parsed reel using Claude."""
    with open(parsed_path, "r", encoding="utf-8") as f:
        parsed = json.load(f)

    # Build the content for Claude
    parts = []
    if parsed.get("caption"):
        parts.append(f"CAPTION:\n{parsed['caption']}")
    if parsed.get("transcript"):
        parts.append(f"AUDIO TRANSCRIPT:\n{parsed['transcript']}")
    if parsed.get("onscreen_texts"):
        texts = [t["text"] for t in parsed["onscreen_texts"]]
        parts.append(f"ON-SCREEN TEXT:\n{chr(10).join(texts)}")

    if not parts:
        return {"error": "No content to classify", "source": parsed_path}

    reel_content = "\n\n---\n\n".join(parts)

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": f"{CLASSIFICATION_PROMPT}\n\n---\n\nREEL CONTENT:\n\n{reel_content}",
            }
        ],
    )

    response_text = message.content[0].text.strip()

    # Parse the JSON response
    try:
        classification = json.loads(response_text)
    except json.JSONDecodeError:
        # Try to extract JSON from the response if wrapped in markdown
        import re
        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            classification = json.loads(match.group())
        else:
            classification = {"error": "Failed to parse response", "raw": response_text}

    return classification


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/classify_reel.py [--force] <parsed.json> [parsed2.json] ...")
        print("  --force  Re-classify even if classified.json already exists")
        sys.exit(1)

    args = sys.argv[1:]
    force = "--force" in args
    paths = [a for a in args if not a.startswith("--")]

    stats = {"classified": 0, "skipped": 0, "failed": 0}

    for parsed_path in paths:
        path = Path(parsed_path)
        if not path.exists():
            print(f"SKIP: {parsed_path} not found")
            stats["skipped"] += 1
            continue

        output_path = path.parent / "classified.json"
        if not force and output_path.exists():
            print(f"SKIP: {path.parent.name} already classified")
            stats["skipped"] += 1
            continue

        print(f"\nClassifying: {parsed_path}")
        try:
            classification = classify_reel(parsed_path)

            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(classification, f, indent=2, ensure_ascii=False)

            if "error" not in classification:
                print(f"  Summary: {classification.get('summary', 'N/A')}")
                print(f"  Sentiment: {classification.get('sentiment', 'N/A')}")
                print(f"  Type: {classification.get('content_type', 'N/A')}")
                print(f"  Relevant: {classification.get('relevant_to_trip', 'N/A')}")
                locs = classification.get("locations", [])
                if locs:
                    print(f"  Locations ({len(locs)}):")
                    for loc in locs:
                        print(f"    - {loc['name']} ({loc.get('category', '?')}, {loc.get('city', '?')})")
                stats["classified"] += 1
            else:
                print(f"  ERROR: {classification.get('error')}")
                stats["failed"] += 1

            print(f"  Saved to: {output_path}")

        except Exception as e:
            print(f"  FAILED: {e}")
            stats["failed"] += 1

    print(f"\nDONE: {stats['classified']} classified, {stats['skipped']} skipped, {stats['failed']} failed")


if __name__ == "__main__":
    main()
