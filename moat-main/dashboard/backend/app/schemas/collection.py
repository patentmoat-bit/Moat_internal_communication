from datetime import datetime

from pydantic import BaseModel

from app.schemas.patent import PatentResponse


class CollectionCreate(BaseModel):
    name: str
    description: str | None = None


class CollectionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class CollectionResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    patent_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CollectionDetailResponse(CollectionResponse):
    patents: list[PatentResponse] = []
