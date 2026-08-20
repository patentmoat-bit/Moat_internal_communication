from io import BytesIO

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.invention import Invention, InventionAnalysis, InventionDocument, InventionDocumentType, InventionStatus
from app.models.user import User, UserRole
from app.repositories.invention_repository import InventionRepository
from app.schemas.invention import InventionCreate, InventionUpdate
from app.services.inventions.analysis import InventionAIAnalysisService


class InventionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = InventionRepository(db)
        self.ai = InventionAIAnalysisService()

    def _can_access(self, invention: Invention, user: User) -> bool:
        return user.role == UserRole.admin or invention.created_by == user.id

    async def _get_owned(self, invention_id: str, user: User) -> Invention:
        invention = await self.repo.get(invention_id)
        if not invention:
            raise NotFoundException("Invention not found")
        if not self._can_access(invention, user):
            raise ForbiddenException("Access denied to this invention")
        return invention

    def _latest(self, invention: Invention) -> InventionAnalysis | None:
        analyses = sorted(invention.analyses or [], key=lambda item: item.created_at, reverse=True)
        return analyses[0] if analyses else None

    def _serialize_document(self, document: InventionDocument) -> dict:
        return {
            "id": document.id,
            "invention_id": document.invention_id,
            "file_name": document.file_name,
            "file_type": document.file_type,
            "content_type": document.content_type,
            "storage_url": document.storage_url,
            "created_at": document.created_at,
        }

    def _serialize_analysis(self, analysis: InventionAnalysis | None) -> dict | None:
        if not analysis:
            return None
        return {
            "id": analysis.id,
            "invention_id": analysis.invention_id,
            "technical_summary": analysis.technical_summary,
            "innovation_summary": analysis.innovation_summary,
            "key_components": analysis.key_components or [],
            "technical_domains": analysis.technical_domains or [],
            "differentiators": analysis.differentiators or [],
            "workflows": analysis.workflows or [],
            "technical_architecture": analysis.technical_architecture,
            "innovation_highlights": analysis.innovation_highlights or [],
            "confidence_score": analysis.confidence_score,
            "model_name": analysis.model_name,
            "created_at": analysis.created_at,
        }

    def _serialize(self, invention: Invention) -> dict:
        return {
            "id": invention.id,
            "workspace_id": invention.workspace_id,
            "matter_id": invention.matter_id,
            "title": invention.title,
            "description": invention.description,
            "status": invention.status,
            "created_by": invention.created_by,
            "created_at": invention.created_at,
            "updated_at": invention.updated_at,
            "documents": [self._serialize_document(item) for item in sorted(invention.documents or [], key=lambda doc: doc.created_at, reverse=True)],
            "latest_analysis": self._serialize_analysis(self._latest(invention)),
        }

    async def list_inventions(self, user: User) -> list[dict]:
        inventions = await self.repo.list_for_user(user)
        return [self._serialize(item) for item in inventions]

    async def create_invention(self, data: InventionCreate, user: User) -> dict:
        invention = Invention(
            workspace_id=data.workspace_id,
            matter_id=data.matter_id,
            title=data.title,
            description=data.description,
            status=data.status,
            created_by=user.id,
        )
        self.db.add(invention)
        await self.db.flush()
        await self.db.refresh(invention)
        invention.documents = []
        invention.analyses = []
        return self._serialize(invention)

    async def update_invention(self, invention_id: str, data: InventionUpdate, user: User) -> dict:
        invention = await self._get_owned(invention_id, user)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(invention, field, value)
        await self.db.flush()
        await self.db.refresh(invention)
        return await self.get_invention(invention.id, user)

    async def get_invention(self, invention_id: str, user: User) -> dict:
        invention = await self._get_owned(invention_id, user)
        return self._serialize(invention)

    async def upload_document(self, invention_id: str, file: UploadFile, file_type: InventionDocumentType, user: User) -> dict:
        invention = await self._get_owned(invention_id, user)
        content = await file.read()
        extracted = self._extract_text(content, file.filename or "upload", file.content_type or "", file_type)
        document = InventionDocument(
            invention_id=invention.id,
            file_name=file.filename or "upload",
            file_type=file_type,
            content_type=file.content_type,
            storage_url=f"/uploads/inventions/{invention.id}/{file.filename or 'upload'}",
            extracted_text=extracted,
            uploaded_by=user.id,
        )
        self.db.add(document)
        if invention.status == InventionStatus.draft:
            invention.status = InventionStatus.ready
        await self.db.flush()
        await self.db.refresh(document)
        return self._serialize_document(document)

    def _extract_text(self, content: bytes, filename: str, content_type: str, file_type: InventionDocumentType) -> str:
        if file_type == InventionDocumentType.pdf or filename.lower().endswith(".pdf") or "pdf" in content_type:
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(BytesIO(content))
                return "\n".join((page.extract_text() or "") for page in reader.pages[:20]).strip()
            except Exception:
                return f"PDF uploaded: {filename}. Text extraction unavailable."
        if content_type.startswith("text/") or filename.lower().endswith((".txt", ".md", ".csv")):
            return content.decode("utf-8", errors="ignore")[:12000]
        if file_type in {InventionDocumentType.image, InventionDocumentType.sketch, InventionDocumentType.diagram}:
            return f"Visual artifact uploaded: {filename}. Interpret labeled blocks, geometry, data/control flows, interfaces, and component relationships."
        return f"Document uploaded: {filename}."

    async def analyze_invention(self, invention_id: str, user: User) -> tuple[dict, dict]:
        invention = await self._get_owned(invention_id, user)
        invention.status = InventionStatus.analyzing
        await self.db.flush()
        documents = [
            {"file_name": item.file_name, "file_type": item.file_type.value, "storage_url": item.storage_url, "extracted_text": item.extracted_text}
            for item in invention.documents or []
        ]
        payload = await self.ai.analyze(invention.title, invention.description or "", documents)
        analysis = InventionAnalysis(
            invention_id=invention.id,
            technical_summary=payload.technical_summary,
            innovation_summary=payload.innovation_summary,
            key_components=payload.key_components,
            technical_domains=payload.technical_domains,
            differentiators=payload.differentiators,
            workflows=payload.workflows,
            technical_architecture=payload.technical_architecture,
            innovation_highlights=payload.innovation_highlights,
            confidence_score=payload.confidence_score,
            model_name=payload.model_name,
        )
        self.db.add(analysis)
        invention.status = InventionStatus.analyzed
        await self.db.flush()
        await self.db.refresh(analysis)
        refreshed = await self.repo.get(invention.id)
        return self._serialize(refreshed or invention), self._serialize_analysis(analysis)

    async def get_analysis(self, invention_id: str, user: User) -> dict | None:
        await self._get_owned(invention_id, user)
        latest = await self.repo.latest_analysis(invention_id)
        if not latest:
            raise NotFoundException("Analysis not found")
        return self._serialize_analysis(latest)

    async def list_analysis_history(self, invention_id: str, user: User) -> list[dict]:
        await self._get_owned(invention_id, user)
        return [self._serialize_analysis(item) for item in await self.repo.analyses(invention_id)]
