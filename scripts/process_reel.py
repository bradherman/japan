"""
Instagram Reel Processing Pipeline
URL -> Download -> Caption -> Transcribe Audio -> Extract On-Screen Text

Usage:
    python scripts/process_reel.py <reel_url>
    python scripts/process_reel.py https://www.instagram.com/reel/ABC123/
"""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path

# Fix SSL certificate verification on macOS
try:
    import certifi
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
except ImportError:
    pass

import cv2
import easyocr
import instaloader
import yt_dlp
from faster_whisper import WhisperModel


@dataclass
class ReelData:
    url: str
    video_path: str = ""
    caption: str = ""
    transcript: str = ""
    transcript_segments: list = field(default_factory=list)
    detected_language: str = ""
    onscreen_texts: list = field(default_factory=list)


# --- Download ---


def _download_with_instaloader(url: str, output_dir: str) -> tuple[str, str]:
    L = instaloader.Instaloader(
        dirname_pattern=output_dir,
        download_videos=True,
        download_video_thumbnails=False,
        download_comments=False,
        save_metadata=True,
        compress_json=False,
    )

    shortcode = re.search(r"/(reels?|p)/([A-Za-z0-9_-]+)", url).group(2)
    post = instaloader.Post.from_shortcode(L.context, shortcode)
    caption = post.caption or ""
    L.download_post(post, target=output_dir)

    video_files = list(Path(output_dir).glob("*.mp4"))
    if not video_files:
        raise FileNotFoundError("No video file downloaded")
    return str(video_files[0]), caption


def _download_with_ytdlp(url: str, output_dir: str) -> tuple[str, str]:
    os.makedirs(output_dir, exist_ok=True)
    output_template = os.path.join(output_dir, "%(id)s.%(ext)s")

    ydl_opts = {
        "format": "best",
        "outtmpl": output_template,
        "cookiesfrombrowser": ("chrome",),
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        video_path = ydl.prepare_filename(info)
        caption = info.get("description", "")
    return video_path, caption


def download_reel(url: str, output_dir: str) -> tuple[str, str]:
    """Download reel with fallback. Returns (video_path, caption)."""
    for downloader, name in [
        (_download_with_instaloader, "instaloader"),
        (_download_with_ytdlp, "yt-dlp"),
    ]:
        try:
            print(f"  Trying {name}...")
            return downloader(url, output_dir)
        except Exception as e:
            print(f"  {name} failed: {e}")
    raise RuntimeError(f"All downloaders failed for {url}")


# --- Transcription ---

_whisper_model = None


def get_whisper_model() -> WhisperModel:
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperModel(
            "large-v3-turbo",
            device="cpu",
            compute_type="int8",
        )
    return _whisper_model


def transcribe_audio(video_path: str) -> tuple[str, list, str]:
    """Transcribe audio from video. Returns (full_text, segments, language)."""
    model = get_whisper_model()
    segments, info = model.transcribe(video_path, beam_size=5)

    seg_list = []
    text_parts = []
    for seg in segments:
        seg_list.append({
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": seg.text.strip(),
        })
        text_parts.append(seg.text.strip())

    return " ".join(text_parts), seg_list, info.language


# --- OCR ---

_ocr_reader = None


def get_ocr_reader(languages: list[str] | None = None) -> easyocr.Reader:
    global _ocr_reader
    if _ocr_reader is None:
        langs = languages or ["en", "ja"]
        _ocr_reader = easyocr.Reader(langs, gpu=False)
    return _ocr_reader


def extract_key_frames(video_path: str, fps: float = 0.5) -> list[dict]:
    """Extract frames at the given FPS rate."""
    cap = cv2.VideoCapture(video_path)
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_interval = max(1, int(video_fps / fps))

    frames = []
    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % frame_interval == 0:
            frames.append({
                "frame": frame,
                "timestamp": round(frame_count / video_fps, 2),
            })
        frame_count += 1
    cap.release()
    return frames


def extract_onscreen_text(video_path: str, languages: list[str] | None = None) -> list[dict]:
    """Extract on-screen text from video frames."""
    reader = get_ocr_reader(languages)
    frames = extract_key_frames(video_path, fps=0.5)

    all_texts = []
    seen = set()

    for frame_info in frames:
        results = reader.readtext(frame_info["frame"])
        for bbox, text, confidence in results:
            text_clean = text.strip()
            if confidence > 0.4 and text_clean and text_clean.lower() not in seen:
                seen.add(text_clean.lower())
                all_texts.append({
                    "text": text_clean,
                    "confidence": round(confidence, 3),
                    "timestamp": frame_info["timestamp"],
                })
    return all_texts


# --- Pipeline ---


def extract_shortcode(url: str) -> str:
    """Extract the shortcode from an Instagram URL."""
    match = re.search(r"/(reels?|p)/([A-Za-z0-9_-]+)", url)
    return match.group(2) if match else "unknown"


def is_already_processed(url: str, output_dir: str = "data/raw") -> bool:
    """Check if a reel has already been downloaded and parsed."""
    shortcode = extract_shortcode(url)
    parsed_path = os.path.join(output_dir, shortcode, "parsed.json")
    return os.path.exists(parsed_path)


def process_reel(url: str, output_dir: str = "data/raw", force: bool = False) -> ReelData | None:
    """Full pipeline: download -> caption -> transcribe -> OCR.

    Skips reels that already have a parsed.json unless force=True.
    Returns None if skipped.
    """
    shortcode = extract_shortcode(url)
    reel_dir = os.path.join(output_dir, shortcode)
    parsed_path = os.path.join(reel_dir, "parsed.json")

    # Skip if already processed
    if not force and os.path.exists(parsed_path):
        print(f"SKIP: {shortcode} already processed ({parsed_path})")
        with open(parsed_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        result = ReelData(**{k: v for k, v in data.items() if k in ReelData.__dataclass_fields__})
        return result

    result = ReelData(url=url)
    os.makedirs(reel_dir, exist_ok=True)

    print(f"[1/3] Downloading reel {shortcode}...")
    result.video_path, result.caption = download_reel(url, reel_dir)
    print(f"  Video: {result.video_path}")
    if result.caption:
        print(f"  Caption: {result.caption[:120]}...")

    print(f"[2/3] Transcribing audio...")
    result.transcript, result.transcript_segments, result.detected_language = (
        transcribe_audio(result.video_path)
    )
    print(f"  Language: {result.detected_language}")
    if result.transcript:
        print(f"  Transcript: {result.transcript[:120]}...")

    print(f"[3/3] Extracting on-screen text (OCR)...")
    try:
        result.onscreen_texts = extract_onscreen_text(result.video_path)
        print(f"  Found {len(result.onscreen_texts)} unique text elements")
    except Exception as e:
        print(f"  OCR failed (non-fatal): {e}")
        result.onscreen_texts = []

    # Save results as JSON
    with open(parsed_path, "w", encoding="utf-8") as f:
        json.dump(asdict(result), f, indent=2, ensure_ascii=False)
    print(f"\nResults saved to {parsed_path}")

    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/process_reel.py [--classify] [--force] <reel_url> [url2] ...")
        print("  --classify  Also run LLM classification (requires ANTHROPIC_API_KEY)")
        print("  --force     Re-process even if parsed.json already exists")
        sys.exit(1)

    args = sys.argv[1:]
    do_classify = "--classify" in args
    force = "--force" in args
    urls = [a for a in args if not a.startswith("--")]

    stats = {"processed": 0, "skipped": 0, "failed": 0, "classified": 0}

    for i, url in enumerate(urls, 1):
        print(f"\n{'='*60}")
        print(f"[{i}/{len(urls)}] {url}")
        print(f"{'='*60}")
        try:
            data = process_reel(url, force=force)

            if data and data.video_path == "" and not force:
                # Was loaded from existing parsed.json (skipped)
                stats["skipped"] += 1
            else:
                stats["processed"] += 1
                if data:
                    print(f"\n--- Extraction Summary ---")
                    print(f"Caption: {data.caption[:200] if data.caption else '(none)'}")
                    print(f"Transcript: {data.transcript[:200] if data.transcript else '(none)'}")
                    print(f"On-screen text: {[t['text'] for t in data.onscreen_texts]}")

            if do_classify and data:
                shortcode = extract_shortcode(url)
                classified_path = os.path.join("data/raw", shortcode, "classified.json")
                if not force and os.path.exists(classified_path):
                    print(f"SKIP classification: {shortcode} already classified")
                else:
                    print(f"\n[4/4] Classifying content with LLM...")
                    from classify_reel import classify_reel as classify
                    parsed_path = os.path.join("data/raw", shortcode, "parsed.json")
                    classification = classify(parsed_path)
                    if "error" not in classification:
                        print(f"  Sentiment: {classification.get('sentiment')}")
                        print(f"  Type: {classification.get('content_type')}")
                        print(f"  Summary: {classification.get('summary')}")
                        stats["classified"] += 1
                    else:
                        print(f"  Classification error: {classification.get('error')}")

        except Exception as e:
            stats["failed"] += 1
            print(f"ERROR processing {url}: {e}")

    print(f"\n{'='*60}")
    print(f"DONE: {stats['processed']} processed, {stats['skipped']} skipped, "
          f"{stats['failed']} failed, {stats['classified']} classified")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
