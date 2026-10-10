"""SQLAlchemy models. Importing this package registers every table on Base."""

from moat_api.db.models.analysis import AnalysisConcept, AnalysisRun, EvidenceLink
from moat_api.db.models.audit import AuditEvent
from moat_api.db.models.collab import Comment, Notification
from moat_api.db.models.corpus import Publication
from moat_api.db.models.design import Drawing, DrawingReview, DrawingVersion
from moat_api.db.models.documents import (
    ExtractionArtifact,
    IndexManifest,
    SourceObject,
    UploadSession,
)
from moat_api.db.models.drafting import (
    Claim,
    ClaimDependency,
    ClaimSet,
    ClaimSetDecision,
    Document,
    DocumentVersion,
)
from moat_api.db.models.execution import (
    ConsumerReceipt,
    FailedJob,
    Job,
    JobAttempt,
    OutboxEvent,
)
from moat_api.db.models.invention import Invention, InventionContributor, InventionVersion
from moat_api.db.models.review import Decision, Submission
from moat_api.db.models.tenancy import (
    AppSession,
    Membership,
    MembershipRole,
    Permission,
    Role,
    RolePermission,
    Tenant,
    User,
)

__all__ = [
    "DrawingVersion",
    "DrawingReview",
    "Drawing",
    "ClaimSetDecision",
    "DocumentVersion",
    "Document",
    "ClaimSet",
    "ClaimDependency",
    "Claim",
    "UploadSession",
    "SourceObject",
    "OutboxEvent",
    "JobAttempt",
    "Job",
    "IndexManifest",
    "FailedJob",
    "ExtractionArtifact",
    "ConsumerReceipt",
    "AnalysisConcept",
    "AnalysisRun",
    "AppSession",
    "AuditEvent",
    "Comment",
    "Decision",
    "EvidenceLink",
    "Invention",
    "InventionContributor",
    "InventionVersion",
    "Membership",
    "MembershipRole",
    "Notification",
    "Permission",
    "Publication",
    "Role",
    "RolePermission",
    "Submission",
    "Tenant",
    "User",
]

# Tables that carry tenant_id and are reachable by a request handler. Each one
# gets a row-level security policy; the migrations assert this list against the
# live schema, so a new tenant-owned table cannot ship without a policy.
TENANT_OWNED_TABLES = (
    "inventions",
    "invention_versions",
    "invention_contributors",
    "analysis_runs",
    "analysis_concepts",
    "evidence_links",
    "submissions",
    "decisions",
    "comments",
    "notifications",
    "audit_events",
    "jobs",
    "job_attempts",
    "failed_jobs",
    "upload_sessions",
    "source_objects",
    "extraction_artifacts",
    "documents",
    "document_versions",
    "claim_sets",
    "claims",
    "claim_dependencies",
    "claim_set_decisions",
    "drawings",
    "drawing_versions",
    "drawing_reviews",
)

# Visible within their tenant OR to the user they belong to, because login must
# read membership before a tenant has been chosen.
USER_SCOPED_TABLES = ("memberships",)

# Carry tenant_id but hold no policy, each for a stated reason:
#
#   app_sessions      looked up by token hash before any identity is known, so
#                     no policy predicate can apply.
#   outbox_events     written by the API inside a tenant transaction (tenant_id
#   consumer_receipts comes from the authenticated principal, never the client)
#                     and read by the dispatcher, a system process that must scan
#                     every tenant to deliver in commit order. Both hold ids and
#                     references only -- never patent text or file bytes.
UNPOLICIED_TENANT_TABLES = ("app_sessions", "outbox_events", "consumer_receipts")

from .project import ProjectAssignment, ProjectTransitionLog
