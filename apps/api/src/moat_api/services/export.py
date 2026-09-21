"""Specification export.

Produces the three formats a drafter actually hands over: a DOCX the firm can
edit, a PDF for circulation, and structured XML for filing systems.

The XML follows WIPO ST.36 element naming so a filing system can read it. It is
NOT a validated filing package -- a real submission needs the full DTD, the
correct application-type declarations, drawings, and forms. Saying so here is
the point: an export that looks filing-ready but is not would be worse than no
export at all.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from xml.etree import ElementTree as ET

import httpx

from moat_api.core.config import get_settings

settings = get_settings()

EXPORTER_VERSION = "spec-export@1.0"

# 37 CFR 1.52(b): the specification is filed double-spaced in at least 12pt,
# with generous margins so an examiner can annotate it.
BODY_POINT_SIZE = 12
LINE_SPACING = 2.0


@dataclass(frozen=True, slots=True)
class ExportClaim:
    number: int
    kind: str
    preamble: str
    transition: str
    body: str
    depends_on: list[int]

    def rendered(self) -> str:
        """One claim as a single filed paragraph.

        Claims are filed as one sentence each: preamble, transition, then the
        body. The rendering has to match what was reviewed, so it is built from
        the stored parts rather than from anything typed separately.
        """
        preamble = self.preamble.strip()
        transition = self.transition.strip()
        body = self.body.strip()
        if not preamble:
            preamble = (
                f"The subject matter of claim {self.depends_on[0]}" if self.depends_on else ""
            )
        parts = [part for part in (preamble, transition) if part]
        head = " ".join(parts)
        if not body:
            return f"{head}."
        return f"{head}: {body}" if transition.lower() not in {"wherein"} else f"{head} {body}"


@dataclass(frozen=True, slots=True)
class ExportDocument:
    ref: str
    title: str
    jurisdiction: str
    abstract: str
    technical_field: str
    background: str
    summary: str
    brief_description_of_drawings: str
    detailed_description: str
    claims: list[ExportClaim]
    inventors: list[str]
    applicant: str
    revision: int
    claim_set_revision: int | None


# ---------------------------------------------------------------------------
# DOCX
# ---------------------------------------------------------------------------

SECTIONS = (
    ("TECHNICAL FIELD", "technical_field"),
    ("BACKGROUND", "background"),
    ("SUMMARY", "summary"),
    ("BRIEF DESCRIPTION OF THE DRAWINGS", "brief_description_of_drawings"),
    ("DETAILED DESCRIPTION", "detailed_description"),
)


def to_docx(document: ExportDocument) -> bytes:
    from docx import Document as Docx
    from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
    from docx.shared import Inches, Pt

    docx = Docx()

    style = docx.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(BODY_POINT_SIZE)
    style.paragraph_format.line_spacing = LINE_SPACING
    style.paragraph_format.space_after = Pt(0)

    for section in docx.sections:
        section.left_margin = Inches(1.5)
        section.right_margin = Inches(1.0)
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)

    def heading(text: str) -> None:
        paragraph = docx.add_paragraph()
        paragraph.paragraph_format.space_before = Pt(18)
        paragraph.paragraph_format.space_after = Pt(6)
        run = paragraph.add_run(text)
        run.bold = True

    def body(text: str) -> None:
        for block in [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]:
            paragraph = docx.add_paragraph(block)
            paragraph.paragraph_format.first_line_indent = Inches(0.5)

    title = docx.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title.add_run(document.title.upper())
    title_run.bold = True

    if document.inventors:
        inventors = docx.add_paragraph()
        inventors.alignment = WD_ALIGN_PARAGRAPH.CENTER
        inventors.add_run(f"Inventors: {', '.join(document.inventors)}")

    for label, field in SECTIONS:
        content = getattr(document, field, "").strip()
        if not content:
            continue
        heading(label)
        body(content)

    # Claims start on their own page: they are the operative part of the
    # document and are examined separately.
    if document.claims:
        docx.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
        heading("CLAIMS")
        docx.add_paragraph("What is claimed is:")
        for claim in sorted(document.claims, key=lambda c: c.number):
            paragraph = docx.add_paragraph(f"{claim.number}. {claim.rendered()}")
            paragraph.paragraph_format.first_line_indent = Inches(0.5)
            paragraph.paragraph_format.space_after = Pt(12)

    # 37 CFR 1.72(b): the abstract goes on a separate sheet.
    if document.abstract.strip():
        docx.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
        heading("ABSTRACT")
        abstract = docx.add_paragraph(document.abstract.strip())
        abstract.paragraph_format.line_spacing = 1.0

    buffer = io.BytesIO()
    docx.save(buffer)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# XML
# ---------------------------------------------------------------------------


def to_xml(document: ExportDocument) -> bytes:
    """Structured export using WIPO ST.36 element names.

    Readable by a filing system, but deliberately not claimed to be a valid
    filing package: no DTD declaration is emitted, because asserting a DTD this
    does not fully satisfy would be a lie a downstream system might act on.
    """
    root = ET.Element(
        "patent-application",
        {
            "lang": "en",
            "country": document.jurisdiction,
            "date-produced": datetime.now(UTC).strftime("%Y%m%d"),
            "produced-by": EXPORTER_VERSION,
            "status": "draft-not-for-filing",
        },
    )

    bibliographic = ET.SubElement(root, "bibliographic-data")
    ET.SubElement(bibliographic, "invention-title", {"lang": "en"}).text = document.title
    reference = ET.SubElement(bibliographic, "application-reference")
    ET.SubElement(reference, "doc-number").text = document.ref

    parties = ET.SubElement(bibliographic, "parties")
    applicants = ET.SubElement(parties, "applicants")
    applicant = ET.SubElement(applicants, "applicant")
    ET.SubElement(ET.SubElement(applicant, "addressbook"), "name").text = document.applicant

    inventors = ET.SubElement(parties, "inventors")
    for name in document.inventors:
        inventor = ET.SubElement(inventors, "inventor")
        ET.SubElement(ET.SubElement(inventor, "addressbook"), "name").text = name

    if document.abstract.strip():
        abstract = ET.SubElement(root, "abstract", {"lang": "en"})
        ET.SubElement(abstract, "p").text = document.abstract.strip()

    description = ET.SubElement(root, "description", {"lang": "en"})
    for label, field in SECTIONS:
        content = getattr(document, field, "").strip()
        if not content:
            continue
        heading = ET.SubElement(description, "heading")
        heading.text = label
        for block in [b.strip() for b in re.split(r"\n\s*\n", content) if b.strip()]:
            ET.SubElement(description, "p").text = block

    if document.claims:
        claims = ET.SubElement(
            root, "claims", {"lang": "en", "revision": str(document.claim_set_revision or 1)}
        )
        for claim in sorted(document.claims, key=lambda c: c.number):
            element = ET.SubElement(claims, "claim", {"num": f"{claim.number:04d}"})
            # ST.36 records dependency explicitly rather than leaving it to be
            # parsed out of the prose.
            for parent in claim.depends_on:
                ET.SubElement(element, "claim-ref", {"idref": f"{parent:04d}"})
            ET.SubElement(element, "claim-text").text = claim.rendered()

    ET.indent(root, space="  ")
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------


class PdfUnavailable(RuntimeError):
    """The conversion service could not be reached."""


async def to_pdf(docx_bytes: bytes, filename: str) -> bytes:
    """Convert DOCX to PDF through Gotenberg.

    A separate, isolated service on purpose: document conversion runs a full
    office suite, which is a large attack surface to host inside the API
    (design doc §2).
    """
    if not settings.gotenberg_url:
        raise PdfUnavailable("No conversion service is configured.")

    try:
        async with httpx.AsyncClient(timeout=settings.gotenberg_timeout_seconds) as client:
            response = await client.post(
                f"{settings.gotenberg_url.rstrip('/')}/forms/libreoffice/convert",
                files={
                    "files": (
                        filename,
                        docx_bytes,
                        "application/vnd.openxmlformats-officedocument"
                        ".wordprocessingml.document",
                    )
                },
            )
            response.raise_for_status()
            return response.content
    except httpx.HTTPError as error:
        raise PdfUnavailable(str(error)) from error


FORMATS = {
    "docx": (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "docx",
    ),
    "pdf": ("application/pdf", "pdf"),
    "xml": ("application/xml", "xml"),
}
