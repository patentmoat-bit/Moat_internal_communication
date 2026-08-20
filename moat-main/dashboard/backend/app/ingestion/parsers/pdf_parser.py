import io
import re
from typing import BinaryIO

from app.core.exceptions import BadRequestException


class PDFParser:
    def __init__(self, ocr_available: bool = False):
        self.ocr_available = ocr_available

    async def parse(self, file_stream: BinaryIO, filename: str = "") -> dict:
        try:
            raw_text = await self._extract_text(file_stream)
        except Exception as e:
            raise BadRequestException(f"PDF parsing failed: {e}")

        return {
            "raw_text": raw_text,
            "filename": filename,
            "pages": self._count_pages(raw_text),
            "has_claims": self._detect_section(raw_text, "claims"),
            "has_description": self._detect_section(raw_text, "description"),
            "has_drawings": self._detect_section(raw_text, "drawings"),
        }

    async def _extract_text(self, file_stream: BinaryIO) -> str:
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(file_stream)
            text_parts = []
            for page in reader.pages:
                page_text = page.extract_text() or ""
                text_parts.append(page_text)
            return "\n".join(text_parts)
        except ImportError:
            try:
                import pdfplumber
                text_parts = []
                with pdfplumber.open(file_stream) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text() or ""
                        text_parts.append(page_text)
                return "\n".join(text_parts)
            except ImportError:
                try:
                    import pdfminer
                    from pdfminer.high_level import extract_text
                    return extract_text(file_stream)
                except ImportError:
                    raise BadRequestException(
                        "No PDF library available. Install PyPDF2, pdfplumber, or pdfminer."
                    )

    def _count_pages(self, text: str) -> int:
        form_feed_count = text.count("\f")
        return form_feed_count + 1 if form_feed_count > 0 else 1

    def _detect_section(self, text: str, section: str) -> bool:
        patterns = {
            "claims": r"\b(what is claimed|claims|claim\s+\d+|the invention claimed)\b",
            "description": r"\b(background|summary|detailed description|field of the invention)\b",
            "drawings": r"\b(brief description of the drawings|figures|FIG\.\s*\d+)\b",
        }
        pattern = patterns.get(section)
        if pattern:
            return bool(re.search(pattern, text, re.IGNORECASE))
        return False
