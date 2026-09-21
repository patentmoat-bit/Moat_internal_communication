from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from moat_api.db.base import Base, PrimaryKeyMixin, TenantMixin, TimestampMixin

DOCUMENT_STATUSES = ("drafting", "in_review", "approved", "filed", "abandoned")
CLAIM_SET_STATUSES = ("draft", "submitted", "approved", "superseded")
CLAIM_KINDS = ("independent", "dependent")

# The statutory categories under 35 U.S.C. §101. A claim that is not one of
# these is not eligible subject matter, whatever else it says.
CLAIM_CATEGORIES = ("apparatus", "method", "system", "composition", "crm", "other")


class Document(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """A patent specification being drafted from an invention disclosure.

    Holds only the pointer to the current revision. The prose of every revision
    lives in document_versions and is never edited in place, because a claim
    set that was approved must stay attached to the exact specification text it
    was approved against.
    """

    __tablename__ = "documents"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_documents_tenant_id_id"),
        UniqueConstraint("tenant_id", "ref", name="uq_documents_tenant_ref"),
        ForeignKeyConstraint(
            ["tenant_id", "invention_id"],
            ["inventions.tenant_id", "inventions.id"],
            ondelete="RESTRICT",
            name="fk_documents_invention",
        ),
        Index("ix_documents_tenant_status", "tenant_id", "status", "updated_at", "id"),
    )

    invention_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    ref: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(24), server_default="drafting", nullable=False)
    current_revision: Mapped[int] = mapped_column(Integer, server_default=text("1"), nullable=False)

    # The drafter responsible. Distinct from the inventors, who remain recorded
    # on the invention -- inventorship is a legal fact, authorship is not.
    drafter_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    jurisdiction: Mapped[str] = mapped_column(String(8), server_default="US", nullable=False)

    versions: Mapped[list[DocumentVersion]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    claim_sets: Mapped[list[ClaimSet]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class DocumentVersion(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """Immutable snapshot of the specification prose at one revision.

    Sections are explicit columns rather than a JSON blob: the structure of a
    patent specification is fixed by the patent offices, not by us, and naming
    them makes a missing required section a constraint rather than a runtime
    surprise.
    """

    __tablename__ = "document_versions"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "document_id", "revision", name="uq_document_versions_revision"
        ),
        ForeignKeyConstraint(
            ["tenant_id", "document_id"],
            ["documents.tenant_id", "documents.id"],
            ondelete="CASCADE",
            name="fk_document_versions_document",
        ),
    )

    document_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    # Abstract is capped at 150 words by 37 CFR 1.72(b); the API enforces it.
    abstract: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    technical_field: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    background: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    summary: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    brief_description_of_drawings: Mapped[str] = mapped_column(
        Text, server_default="", nullable=False
    )
    detailed_description: Mapped[str] = mapped_column(Text, server_default="", nullable=False)

    authored_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    change_note: Mapped[str] = mapped_column(String(300), server_default="", nullable=False)

    document: Mapped[Document] = relationship(back_populates="versions")


class ClaimSet(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """A versioned set of claims.

    Claims are versioned as a SET, not individually. A claim only means
    anything in the context of the others it sits with -- dependency, scope and
    antecedent basis are all properties of the whole set -- so approving claim
    7 in isolation would be meaningless.
    """

    __tablename__ = "claim_sets"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_claim_sets_tenant_id_id"),
        UniqueConstraint(
            "tenant_id", "document_id", "revision", name="uq_claim_sets_revision"
        ),
        ForeignKeyConstraint(
            ["tenant_id", "document_id"],
            ["documents.tenant_id", "documents.id"],
            ondelete="CASCADE",
            name="fk_claim_sets_document",
        ),
        Index("ix_claim_sets_document", "tenant_id", "document_id", "revision"),
    )

    document_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), server_default="draft", nullable=False)

    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    change_note: Mapped[str] = mapped_column(String(300), server_default="", nullable=False)

    # Frozen when the set is submitted or approved. Editing an immutable set
    # creates a new revision instead (design doc §6).
    frozen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    document: Mapped[Document] = relationship(back_populates="claim_sets")
    claims: Mapped[list[Claim]] = relationship(
        back_populates="claim_set", cascade="all, delete-orphan"
    )


class Claim(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """One claim.

    `number` is the claim's position in the set as filed. Renumbering is a real
    operation during prosecution, so the number is data rather than identity --
    dependencies reference claim ids, not numbers.
    """

    __tablename__ = "claims"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_claims_tenant_id_id"),
        UniqueConstraint("tenant_id", "claim_set_id", "number", name="uq_claims_number"),
        ForeignKeyConstraint(
            ["tenant_id", "claim_set_id"],
            ["claim_sets.tenant_id", "claim_sets.id"],
            ondelete="CASCADE",
            name="fk_claims_claim_set",
        ),
        Index("ix_claims_set_number", "tenant_id", "claim_set_id", "number"),
    )

    claim_set_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), server_default="independent", nullable=False)
    category: Mapped[str] = mapped_column(String(16), server_default="other", nullable=False)

    # Preamble and body are stored separately because the transition phrase
    # ("comprising", "consisting of") between them decides whether the claim is
    # open or closed -- which changes its scope entirely.
    preamble: Mapped[str] = mapped_column(Text, server_default="", nullable=False)
    transition: Mapped[str] = mapped_column(String(64), server_default="comprising", nullable=False)
    body: Mapped[str] = mapped_column(Text, server_default="", nullable=False)

    claim_set: Mapped[ClaimSet] = relationship(back_populates="claims")


class ClaimDependency(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """An edge from a dependent claim to a claim it narrows.

    An edge table rather than a parent column on the claim, because a claim can
    depend on several others: "The method of any of claims 1 to 3" is one claim
    with three parents. A single parent_id could not express that, which is why
    the blueprint's parent-only tree was replaced (ADR 0001).
    """

    __tablename__ = "claim_dependencies"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "claim_id", "parent_claim_id", name="uq_claim_dependencies_edge"
        ),
        # Both endpoints must be claims in the SAME set. Without this a claim
        # could depend on a claim in another document entirely.
        ForeignKeyConstraint(
            ["tenant_id", "claim_set_id"],
            ["claim_sets.tenant_id", "claim_sets.id"],
            ondelete="CASCADE",
            name="fk_claim_dependencies_set",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "claim_id"],
            ["claims.tenant_id", "claims.id"],
            ondelete="CASCADE",
            name="fk_claim_dependencies_claim",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "parent_claim_id"],
            ["claims.tenant_id", "claims.id"],
            ondelete="CASCADE",
            name="fk_claim_dependencies_parent",
        ),
        Index("ix_claim_dependencies_set", "tenant_id", "claim_set_id"),
    )

    claim_set_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    claim_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    parent_claim_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)


class ClaimSetDecision(Base, PrimaryKeyMixin, TenantMixin, TimestampMixin):
    """Counsel's position on one frozen claim set.

    Recorded against the claim set, not the document: the document keeps
    changing while the set that was reviewed does not. Tying the decision to
    the document would let a later edit quietly inherit an approval nobody
    gave.
    """

    __tablename__ = "claim_set_decisions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "claim_set_id"],
            ["claim_sets.tenant_id", "claim_sets.id"],
            ondelete="CASCADE",
            name="fk_claim_set_decisions_set",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "document_id"],
            ["documents.tenant_id", "documents.id"],
            ondelete="CASCADE",
            name="fk_claim_set_decisions_document",
        ),
        # One decision per claim set. A second opinion means a new revision,
        # not a second verdict on the same text.
        UniqueConstraint("tenant_id", "claim_set_id", name="uq_claim_set_decisions_set"),
        Index("ix_claim_set_decisions_document", "tenant_id", "document_id", "decided_at"),
    )

    claim_set_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False)
    claim_set_revision: Mapped[int] = mapped_column(Integer, nullable=False)

    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )


CLAIM_SET_DECISION_OUTCOMES = ("approved", "returned")
