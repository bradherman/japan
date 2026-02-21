"""
PDF Recommendation Parser

Extracts text, images, and links from PDF files containing Japan travel
recommendations. Handles both text-based and image-heavy PDFs (falls back
to OCR on pages with little extractable text).

Usage:
    python scripts/parse_pdf.py <pdf_path> [pdf_path2] ...
    python scripts/parse_pdf.py notes/recs-from-friend.pdf
    python scripts/parse_pdf.py notes/*.pdf
"""

import json
import os
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path

import fitz  # pymupdf


@dataclass
class PDFPage:
    page_number: int
    text: str
    links: list[str] = field(default_factory=list)
    images: int = 0


@dataclass
class PDFData:
    source_path: str
    filename: str
    total_pages: int = 0
    full_text: str = ""
    pages: list[dict] = field(default_factory=list)
    links: list[str] = field(default_factory=list)


def extract_links_from_text(text: str) -> list[str]:
    """Pull URLs out of extracted text (sometimes PDF link annotations are missing)."""
    url_pattern = r'https?://[^\s<>\"\')}\]]+'
    return list(set(re.findall(url_pattern, text)))


def parse_pdf(pdf_path: str) -> PDFData:
    """Parse a PDF and extract text, links, and metadata per page."""
    path = Path(pdf_path)
    doc = fitz.open(pdf_path)

    result = PDFData(
        source_path=str(path.resolve()),
        filename=path.name,
        total_pages=len(doc),
    )

    all_text_parts = []
    all_links = set()

    for page_num, page in enumerate(doc):
        text = page.get_text("text").strip()

        # If very little text extracted, try the page as blocks (can catch
        # text in unusual layouts)
        if len(text) < 20:
            blocks = page.get_text("blocks")
            block_texts = [b[4].strip() for b in blocks if b[6] == 0]
            alt_text = "\n".join(block_texts).strip()
            if len(alt_text) > len(text):
                text = alt_text

        # Extract hyperlink annotations
        page_links = []
        for link in page.get_links():
            uri = link.get("uri", "")
            if uri:
                page_links.append(uri)
                all_links.add(uri)

        # Also find URLs embedded in the text itself
        text_urls = extract_links_from_text(text)
        for url in text_urls:
            if url not in all_links:
                page_links.append(url)
                all_links.add(url)

        # Count images on the page
        image_count = len(page.get_images(full=True))

        page_data = PDFPage(
            page_number=page_num + 1,
            text=text,
            links=page_links,
            images=image_count,
        )

        result.pages.append(asdict(page_data))
        if text:
            all_text_parts.append(text)

    doc.close()

    result.full_text = "\n\n---\n\n".join(all_text_parts)
    result.links = sorted(all_links)

    return result


def save_result(result: PDFData, output_dir: str = "data/raw") -> str:
    """Save parsed PDF data as JSON."""
    pdf_dir = os.path.join(output_dir, "pdfs")
    os.makedirs(pdf_dir, exist_ok=True)

    stem = Path(result.filename).stem
    output_path = os.path.join(pdf_dir, f"{stem}.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(asdict(result), f, indent=2, ensure_ascii=False)

    return output_path


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/parse_pdf.py <pdf_path> [pdf_path2] ...")
        sys.exit(1)

    for pdf_path in sys.argv[1:]:
        print(f"\n{'='*60}")
        print(f"Parsing: {pdf_path}")
        print(f"{'='*60}")

        try:
            result = parse_pdf(pdf_path)
            output_path = save_result(result)

            print(f"  Pages: {result.total_pages}")
            print(f"  Text length: {len(result.full_text)} chars")
            print(f"  Links found: {len(result.links)}")
            if result.links:
                for link in result.links[:10]:
                    print(f"    {link}")
                if len(result.links) > 10:
                    print(f"    ... and {len(result.links) - 10} more")

            # Show a preview of extracted text
            preview = result.full_text[:300].replace("\n", " ")
            print(f"  Preview: {preview}...")
            print(f"\n  Saved to: {output_path}")

        except Exception as e:
            print(f"  ERROR: {e}")


if __name__ == "__main__":
    main()
