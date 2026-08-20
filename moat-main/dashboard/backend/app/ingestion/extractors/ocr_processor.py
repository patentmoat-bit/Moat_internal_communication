import io
import os
import tempfile
from pathlib import Path
from typing import BinaryIO


class OCRProcessor:
    def __init__(self, engine: str = "tesseract"):
        self.engine = engine
        self._available = None

    @property
    def is_available(self) -> bool:
        if self._available is None:
            self._available = self._check_availability()
        return self._available

    def _check_availability(self) -> bool:
        if self.engine == "tesseract":
            try:
                import subprocess
                result = subprocess.run(["tesseract", "--version"], capture_output=True, text=True)
                return result.returncode == 0
            except (FileNotFoundError, subprocess.SubprocessError):
                return False
        elif self.engine == "paddleocr":
            try:
                from paddleocr import PaddleOCR
                return True
            except ImportError:
                return False
        return False

    async def process_image(self, image_data: bytes, lang: str = "eng") -> str:
        if not self.is_available:
            raise RuntimeError(
                f"OCR engine '{self.engine}' is not available. "
                f"Install tesseract-ocr or paddleocr."
            )

        if self.engine == "tesseract":
            return await self._ocr_tesseract(image_data, lang)
        else:
            return await self._ocr_paddle(image_data, lang)

    async def process_pdf(self, pdf_stream: BinaryIO, lang: str = "eng") -> str:
        try:
            import pdf2image
            images = pdf2image.convert_from_bytes(pdf_stream.read())
        except ImportError:
            try:
                import fitz
                doc = fitz.open(stream=pdf_stream.read(), filetype="pdf")
                images = []
                for page in doc:
                    pix = page.get_pixmap()
                    img_data = pix.tobytes("png")
                    from PIL import Image
                    import io
                    images.append(Image.open(io.BytesIO(img_data)))
                doc.close()
            except ImportError:
                raise RuntimeError(
                    "Need pdf2image or PyMuPDF (fitz) for PDF OCR."
                )

        text_parts = []
        for img in images:
            img_bytes = io.BytesIO()
            img.save(img_bytes, format="PNG")
            text = await self.process_image(img_bytes.getvalue(), lang)
            text_parts.append(text)

        return "\n\n".join(text_parts)

    async def _ocr_tesseract(self, image_data: bytes, lang: str) -> str:
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(io.BytesIO(image_data))
            text = pytesseract.image_to_string(img, lang=lang)
            return text
        except ImportError:
            import subprocess
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                tmp.write(image_data)
                tmp_path = tmp.name
            try:
                result = subprocess.run(
                    ["tesseract", tmp_path, "stdout", "-l", lang],
                    capture_output=True,
                    text=True,
                )
                return result.stdout
            finally:
                os.unlink(tmp_path)

    async def _ocr_paddle(self, image_data: bytes, lang: str) -> str:
        from paddleocr import PaddleOCR
        ocr = PaddleOCR(use_angle_cls=True, lang=lang)
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(image_data)
            tmp_path = tmp.name
        try:
            result = ocr.ocr(tmp_path, cls=True)
            text_parts = []
            for line in result[0] if result else []:
                text_parts.append(line[1][0])
            return "\n".join(text_parts)
        finally:
            os.unlink(tmp_path)
