"""Perceptual hashing for logo marks.

What this can and cannot do, stated up front because the two are easy to
confuse:

  CAN    find near-identical and closely derived images -- the same logo
         re-coloured, resized, re-compressed, lightly cropped or traced.
  CANNOT recognise conceptual similarity. Two different drawings of a lion,
         or a stylised "M" in a different typeface, hash nothing alike, even
         where an examiner would find them confusingly similar.

So it is a first pass for copying and close derivation. Conceptual logo
similarity needs design-code classification (the Vienna Classification) or a
trained visual model, and neither is configured in this deployment.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

from PIL import Image, ImageOps

LOGO_HASH_VERSION = "dhash+ahash-64@1.0"
HASH_BITS = 64


class LogoError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class LogoHashes:
    dhash: str  # 16 hex chars
    ahash: str

    def as_dict(self) -> dict[str, str]:
        return {"dhash": self.dhash, "ahash": self.ahash, "version": LOGO_HASH_VERSION}


def _prepare(data: bytes, size: tuple[int, int]) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except Exception as error:  # noqa: BLE001 -- Pillow raises many types for bad input
        raise LogoError("The file is not a readable image.") from error

    # Decompression bombs are refused before any resize work is done.
    if image.width * image.height > 40_000_000:
        raise LogoError("The image is too large to process.")

    # Transparent logos are composited onto white: the same mark saved with and
    # without an alpha channel must hash the same.
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGBA")
        background = Image.new("RGBA", image.size, (255, 255, 255, 255))
        image = Image.alpha_composite(background, image)

    grey = ImageOps.grayscale(image.convert("RGB"))
    # Autocontrast so a logo re-coloured lighter or darker still lines up.
    grey = ImageOps.autocontrast(grey)
    return grey.resize(size, Image.Resampling.LANCZOS)


def _bits_to_hex(bits: list[bool]) -> str:
    value = 0
    for bit in bits:
        value = (value << 1) | int(bit)
    return f"{value:016x}"


def hash_image(data: bytes) -> LogoHashes:
    # Difference hash: compares each pixel to its right-hand neighbour, so it
    # captures edges and shape rather than absolute brightness.
    small = _prepare(data, (9, 8))
    pixels = list(small.getdata())
    dbits = [pixels[row * 9 + col] > pixels[row * 9 + col + 1] for row in range(8) for col in range(8)]

    # Average hash: which pixels are brighter than the mean. Robust to minor
    # edits that shift edges slightly.
    avg_image = _prepare(data, (8, 8))
    avg_pixels = list(avg_image.getdata())
    mean = sum(avg_pixels) / len(avg_pixels)
    abits = [pixel > mean for pixel in avg_pixels]

    return LogoHashes(dhash=_bits_to_hex(dbits), ahash=_bits_to_hex(abits))


def hamming(first: str, second: str) -> int:
    return (int(first, 16) ^ int(second, 16)).bit_count()


@dataclass(frozen=True, slots=True)
class LogoComparison:
    similarity: float  # 0..1
    dhash_distance: int
    ahash_distance: int
    finding: str


def compare(a: LogoHashes, b: LogoHashes) -> LogoComparison:
    d = hamming(a.dhash, b.dhash)
    av = hamming(a.ahash, b.ahash)
    # The better of the two: each is robust to a different kind of edit.
    best = min(d, av)
    similarity = round(1 - best / HASH_BITS, 3)
    if best <= 4:
        finding = "Visually near-identical: very likely the same image or a direct derivative."
    elif best <= 10:
        finding = "Visually close: possibly a re-coloured, resized or lightly edited version."
    elif best <= 18:
        finding = "Some visual resemblance in overall shape."
    else:
        finding = "Visually different by perceptual hash (conceptual similarity not assessed)."
    return LogoComparison(similarity, d, av, finding)
