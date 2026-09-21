from __future__ import annotations

import io
import re
from dataclasses import dataclass, field

from moat_api.core.config import get_settings

settings = get_settings()

EXTRACTOR_VERSION = "pypdf+docx@1.0"

# A page yielding fewer characters than this is treated as having no usable
# text layer -- almost always a scan. Reported rather than silently returned
# as an empty page, because "no text" and "text we cannot read" differ.
MIN_CHARS_PER_PAGE = 24

# Bounds enforced during parsing, not after: a decompression bomb must be
# refused while it is being read, not once it has filled memory.
MAX_TEXT_CHARS = 4_000_000


class ExtractionError(RuntimeError):
    """Extraction failed for a stated reason, carried through to the UI."""

    def __init__(self, message: str, category: str = "unreadable") -> None:
        super().__init__(message)
        self.category = category


@dataclass(slots=True)
class ExtractionResult:
    text: str
    page_count: int
    pages_needing_ocr: int
    extractor: str
    pages: list[str] = field(default_factory=list)
    detail: dict = field(default_factory=dict)

    @property
    def needs_ocr(self) -> bool:
        return self.pages_needing_ocr > 0


def _normalise(text: str) -> str:
    """Collapse the whitespace PDF extraction leaves behind, without merging
    paragraphs -- paragraph boundaries carry meaning in a specification."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_pdf(data: bytes) -> ExtractionResult:
    from pypdf import PdfReader
    from pypdf.errors import PdfReadError

    try:
        reader = PdfReader(io.BytesIO(data), strict=False)
    except PdfReadError as error:
        raise ExtractionError(f"The PDF could not be opened: {error}", "malformed") from error

    if reader.is_encrypted:
        # An empty-password decrypt covers the common "owner password only"
        # case; anything else needs a password we do not have.
        try:
            if reader.decrypt("") == 0:
                raise ExtractionError("The PDF is password protected.", "encrypted")
        except Exception as error:  # noqa: BLE001
            raise ExtractionError("The PDF is password protected.", "encrypted") from error

    page_count = len(reader.pages)
    if page_count > settings.upload_max_pages:
        raise ExtractionError(
            f"The document has {page_count} pages, over the "
            f"{settings.upload_max_pages} page limit.",
            "too_many_pages",
        )

    pages: list[str] = []
    needing_ocr = 0
    total = 0

    for index in range(page_count):
        try:
            raw = reader.pages[index].extract_text() or ""
        except Exception:  # noqa: BLE001 -- one bad page must not lose the rest
            raw = ""
        page_text = _normalise(raw)
        if len(page_text) < MIN_CHARS_PER_PAGE:
            needing_ocr += 1
        total += len(page_text)
        if total > MAX_TEXT_CHARS:
            raise ExtractionError("The document's text exceeds the processing limit.", "too_large")
        pages.append(page_text)

    return ExtractionResult(
        text=_normalise("\n\n".join(pages)),
        page_count=page_count,
        pages_needing_ocr=needing_ocr,
        extractor=EXTRACTOR_VERSION,
        pages=pages,
        detail={"encrypted": False},
    )


def _extract_docx(data: bytes) -> ExtractionResult:
    import docx

    try:
        document = docx.Document(io.BytesIO(data))
    except Exception as error:  # noqa: BLE001
        raise ExtractionError(f"The document could not be opened: {error}", "malformed") from error

    blocks = [paragraph.text for paragraph in document.paragraphs]
    # Tables carry claim charts and comparison matrices; dropping them would
    # lose exactly the content most worth searching.
    for table in document.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells]
            if any(cells):
                blocks.append(" | ".join(cells))

    text = _normalise("\n\n".join(blocks))
    if len(text) > MAX_TEXT_CHARS:
        raise ExtractionError("The document's text exceeds the processing limit.", "too_large")

    return ExtractionResult(
        text=text,
        page_count=0,  # DOCX has no fixed pagination until it is rendered.
        pages_needing_ocr=0,
        extractor=EXTRACTOR_VERSION,
        pages=[text],
    )


def _extract_text(data: bytes) -> ExtractionResult:
    try:
        text = _normalise(data.decode("utf-8"))
    except UnicodeDecodeError:
        text = _normalise(data.decode("latin-1", errors="replace"))
    if len(text) > MAX_TEXT_CHARS:
        raise ExtractionError("The file's text exceeds the processing limit.", "too_large")
    return ExtractionResult(
        text=text, page_count=1, pages_needing_ocr=0, extractor=EXTRACTOR_VERSION, pages=[text]
    )


def extract(data: bytes, content_type: str) -> ExtractionResult:
    """Pull text out of an uploaded file.

    Native text only. Scanned pages are counted and reported, never silently
    returned as empty: an OCR step (Tesseract in an isolated worker) is a
    separate deployment decision, and pretending a scan contained no text would
    mean a prior-art search quietly missing the document entirely.
    """
    if content_type == "application/pdf":
        return _extract_pdf(data)
    if content_type.endswith("wordprocessingml.document"):
        return _extract_docx(data)
    if content_type.startswith("text/"):
        return _extract_text(data)
    if content_type.startswith("image/"):
        # Honest refusal rather than an empty result.
        raise ExtractionError(
            "Images require OCR, which is not enabled in this deployment.", "ocr_required"
        )
    raise ExtractionError(f"No extractor for {content_type}.", "unsupported")
