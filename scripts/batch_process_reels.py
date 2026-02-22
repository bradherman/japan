"""
Batch process all Instagram reels from notes/instagram-links.md

Extracts URLs, processes them in batches with sleep between downloads,
handles errors gracefully, and tracks progress.
"""

import os
import re
import sys
import time
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
os.chdir(project_root)
sys.path.insert(0, str(project_root / "scripts"))

from dotenv import load_dotenv
load_dotenv(project_root / ".env")


def extract_urls_from_markdown(filepath: str) -> list[str]:
    """Extract Instagram URLs from the markdown file, stripping backtick formatting."""
    urls = []
    with open(filepath, "r") as f:
        for line in f:
            line = line.strip()
            # Strip backticks
            line = line.strip("`")
            # Extract URL (may have context after |)
            if "instagram.com" in line:
                url = line.split("|")[0].strip().strip("`")
                if url:
                    urls.append(url)
    return urls


def main():
    links_file = project_root / "notes" / "instagram-links.md"
    failed_file = project_root / "data" / "failed-urls.txt"

    urls = extract_urls_from_markdown(str(links_file))
    print(f"Found {len(urls)} Instagram URLs")

    # Import processing functions
    from process_reel import process_reel, extract_shortcode, is_already_processed

    stats = {"processed": 0, "skipped": 0, "failed": 0, "classified": 0, "classify_failed": 0}
    failed_urls = []

    # Phase 1: Download + parse all reels
    print(f"\n{'='*60}")
    print("PHASE 1: Download, transcribe, and OCR all reels")
    print(f"{'='*60}\n")

    for i, url in enumerate(urls, 1):
        shortcode = extract_shortcode(url)
        parsed_path = project_root / "data" / "raw" / shortcode / "parsed.json"

        if parsed_path.exists():
            print(f"[{i}/{len(urls)}] SKIP {shortcode} — already parsed")
            stats["skipped"] += 1
            continue

        print(f"\n[{i}/{len(urls)}] Processing {shortcode}...")
        retry_count = 0
        max_retries = 1

        while retry_count <= max_retries:
            try:
                result = process_reel(url, output_dir=str(project_root / "data" / "raw"))
                if result:
                    stats["processed"] += 1
                    print(f"  ✓ Parsed successfully")
                break
            except Exception as e:
                error_str = str(e)
                if retry_count < max_retries and ("403" in error_str or "rate" in error_str.lower() or "timeout" in error_str.lower() or "connection" in error_str.lower()):
                    retry_count += 1
                    wait_time = 15 * retry_count
                    print(f"  Transient error: {e}")
                    print(f"  Retrying in {wait_time}s... (attempt {retry_count + 1})")
                    time.sleep(wait_time)
                else:
                    print(f"  ✗ FAILED: {e}")
                    stats["failed"] += 1
                    failed_urls.append(f"{url} | {e}")
                    break

        # Small sleep between downloads to avoid rate limits
        if not parsed_path.exists():  # only sleep if we actually downloaded
            time.sleep(3)

        # Print progress every 10 reels
        if i % 10 == 0:
            total = stats["processed"] + stats["skipped"] + stats["failed"]
            print(f"\n--- Progress: {total}/{len(urls)} ({stats['processed']} processed, {stats['skipped']} skipped, {stats['failed']} failed) ---\n")

    # Phase 2: Classify all parsed reels
    print(f"\n{'='*60}")
    print("PHASE 2: Classify all parsed reels with LLM")
    print(f"{'='*60}\n")

    from classify_reel import classify_reel
    import json

    raw_dir = project_root / "data" / "raw"
    parsed_files = sorted(raw_dir.glob("*/parsed.json"))

    for i, parsed_path in enumerate(parsed_files, 1):
        classified_path = parsed_path.parent / "classified.json"
        shortcode = parsed_path.parent.name

        if classified_path.exists():
            print(f"[{i}/{len(parsed_files)}] SKIP {shortcode} — already classified")
            continue

        print(f"[{i}/{len(parsed_files)}] Classifying {shortcode}...")
        try:
            classification = classify_reel(str(parsed_path))

            with open(classified_path, "w", encoding="utf-8") as f:
                json.dump(classification, f, indent=2, ensure_ascii=False)

            if "error" not in classification:
                print(f"  ✓ {classification.get('sentiment', '?')} | {classification.get('content_type', '?')} | {classification.get('summary', '')[:80]}")
                stats["classified"] += 1
            else:
                print(f"  ✗ Classification error: {classification.get('error')}")
                stats["classify_failed"] += 1
        except Exception as e:
            print(f"  ✗ FAILED: {e}")
            stats["classify_failed"] += 1

        # Small sleep between API calls
        time.sleep(1)

    # Save failed URLs
    if failed_urls:
        with open(failed_file, "w") as f:
            f.write("\n".join(failed_urls) + "\n")
        print(f"\nFailed URLs saved to {failed_file}")

    # Final summary
    print(f"\n{'='*60}")
    print("FINAL SUMMARY")
    print(f"{'='*60}")
    print(f"Download/Parse: {stats['processed']} processed, {stats['skipped']} skipped, {stats['failed']} failed")
    print(f"Classification: {stats['classified']} classified, {stats['classify_failed']} failed")
    print(f"Total URLs: {len(urls)}")
    if failed_urls:
        print(f"\nFailed URLs ({len(failed_urls)}):")
        for fu in failed_urls:
            print(f"  - {fu}")


if __name__ == "__main__":
    main()
