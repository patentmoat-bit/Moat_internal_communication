from __future__ import annotations

from enum import StrEnum


class Permission(StrEnum):
    """What an action requires. Checked per request against the caller's
    membership, never inferred from job title alone."""

    INVENTION_READ = "invention.read"
    INVENTION_CREATE = "invention.create"
    INVENTION_UPDATE = "invention.update"
    INVENTION_SUBMIT = "invention.submit"

    ANALYSIS_READ = "analysis.read"
    ANALYSIS_RUN = "analysis.run"

    DOCUMENT_READ = "document.read"
    DOCUMENT_CREATE = "document.create"
    DOCUMENT_UPDATE = "document.update"
    DOCUMENT_EXPORT = "document.export"

    SUBMISSION_READ = "submission.read"
    DECISION_CREATE = "decision.create"

    # Drawings. A separate craft from drafting: the design team produces the
    # figures, the drafter references them in the specification.
    DRAWING_READ = "drawing.read"
    DRAWING_REQUEST = "drawing.request"
    DRAWING_UPLOAD = "drawing.upload"
    DRAWING_REVIEW = "drawing.review"

    # Projects and commercial tracking, from Role & Requirements.docx.
    PROJECT_READ = "project.read"
    PROJECT_MANAGE = "project.manage"
    PAYMENT_READ = "payment.read"
    PAYMENT_MANAGE = "payment.manage"

    COMMENT_READ = "comment.read"
    COMMENT_CREATE = "comment.create"

    NOTIFICATION_READ = "notification.read"
    USER_READ = "user.read"
    PORTFOLIO_READ = "portfolio.read"
    TENANT_ADMIN = "tenant.admin"


PERMISSION_DESCRIPTIONS: dict[Permission, str] = {
    Permission.INVENTION_READ: "View disclosures the caller may access",
    Permission.INVENTION_CREATE: "Raise a new disclosure",
    Permission.INVENTION_UPDATE: "Edit a disclosure, creating a new revision",
    Permission.INVENTION_SUBMIT: "Submit a revision for legal review",
    Permission.ANALYSIS_READ: "View prior-art evidence and its provenance",
    Permission.ANALYSIS_RUN: "Start a prior-art retrieval run",
    Permission.DOCUMENT_READ: "View patent specifications and claim sets",
    Permission.DOCUMENT_CREATE: "Start drafting from an approved disclosure",
    Permission.DOCUMENT_UPDATE: "Edit a specification and its claims",
    Permission.DOCUMENT_EXPORT: "Export a specification to DOCX",
    Permission.SUBMISSION_READ: "View the review queue",
    Permission.DECISION_CREATE: "Record a review decision against a revision",
    Permission.DRAWING_READ: "View patent drawings and figures",
    Permission.DRAWING_REQUEST: "Ask the design team for a figure",
    Permission.DRAWING_UPLOAD: "Upload and revise drawings",
    Permission.DRAWING_REVIEW: "Accept or send back a drawing",
    Permission.PROJECT_READ: "See project progress and milestones",
    Permission.PROJECT_MANAGE: "Create projects and move them through stages",
    Permission.PAYMENT_READ: "See payment status",
    Permission.PAYMENT_MANAGE: "Record and process project payments",
    Permission.COMMENT_READ: "Read discussion threads",
    Permission.COMMENT_CREATE: "Post a comment",
    Permission.NOTIFICATION_READ: "Read own notifications",
    Permission.USER_READ: "See colleagues in the same tenant",
    Permission.PORTFOLIO_READ: "View portfolio and executive aggregates",
    Permission.TENANT_ADMIN: "Manage members, roles and tenant settings",
}

_BASE = {
    Permission.INVENTION_READ,
    Permission.ANALYSIS_READ,
    Permission.DOCUMENT_READ,
    Permission.DRAWING_READ,
    Permission.PROJECT_READ,
    Permission.COMMENT_READ,
    Permission.COMMENT_CREATE,
    Permission.NOTIFICATION_READ,
    Permission.USER_READ,
}

# Finance deliberately does NOT get _BASE. Paying for work does not require
# reading the invention: an unfiled disclosure is a trade secret, and the
# fewer people who can read one, the smaller the surface for losing it. They
# see projects, amounts and status -- not technical content.
_FINANCE_ONLY = {
    Permission.PROJECT_READ,
    Permission.PAYMENT_READ,
    Permission.PAYMENT_MANAGE,
    Permission.NOTIFICATION_READ,
    Permission.USER_READ,
    Permission.COMMENT_READ,
}

# The blueprint's nine personas, expressed as permission sets.
#
# Note what admin does NOT get: recording a legal decision. Platform
# administration is not legal authority, and an unfiled disclosure is a trade
# secret -- "can manage the system" must not silently mean "can approve a
# patent filing" (design doc §5).
ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "researcher": _BASE
    | {
        Permission.INVENTION_CREATE,
        Permission.INVENTION_UPDATE,
        Permission.INVENTION_SUBMIT,
        Permission.ANALYSIS_RUN,
        Permission.DRAWING_REQUEST,
    },
    # The drafter owns the specification and the claims, but not the decision
    # on whether to file -- that stays with counsel.
    "drafter": _BASE
    | {
        Permission.INVENTION_UPDATE,
        Permission.SUBMISSION_READ,
        Permission.DOCUMENT_CREATE,
        Permission.DOCUMENT_UPDATE,
        Permission.DOCUMENT_EXPORT,
        # The drafter asks for figures and accepts them into the
        # specification, but does not draw them.
        Permission.DRAWING_REQUEST,
        Permission.DRAWING_REVIEW,
    },
    "counsel": _BASE
    | {
        Permission.SUBMISSION_READ,
        Permission.DECISION_CREATE,
        Permission.ANALYSIS_RUN,
        # Counsel can start a draft and export one, but editing claims is the
        # drafter's craft.
        Permission.DOCUMENT_CREATE,
        Permission.DOCUMENT_EXPORT,
    },
    # Role & Requirements.docx gives the analyst the whole research surface:
    # search, comparison, claim mapping, patentability and reports.
    "analyst": _BASE | {Permission.ANALYSIS_RUN, Permission.DRAWING_REQUEST},

    # Produces the figures. Sees the drawings and the documents they belong to,
    # but cannot alter the specification or the claims.
    "design": {
        Permission.DRAWING_READ,
        Permission.DRAWING_UPLOAD,
        Permission.DOCUMENT_READ,
        Permission.PROJECT_READ,
        Permission.COMMENT_READ,
        Permission.COMMENT_CREATE,
        Permission.NOTIFICATION_READ,
        Permission.USER_READ,
    },

    # Money only, by design. See _FINANCE_ONLY above.
    "finance": _FINANCE_ONLY,
    "product": _BASE | {Permission.PROJECT_MANAGE},
    "cto": _BASE | {Permission.PORTFOLIO_READ},
    "cio": _BASE | {Permission.PORTFOLIO_READ},
    # The docx has the CEO approving and overseeing. Oversight and money, yes;
    # legal filing authority stays with counsel, because approving a filing is
    # a legal act and "runs the company" is not the same as "is admitted to
    # practise".
    "ceo": _BASE | {Permission.PORTFOLIO_READ, Permission.PROJECT_MANAGE, Permission.PAYMENT_READ},
    "admin": {
        Permission.USER_READ,
        Permission.NOTIFICATION_READ,
        Permission.PROJECT_READ,
        Permission.TENANT_ADMIN,
    },
}

ROLE_LABELS: dict[str, str] = {
    "design": "Design Team",
    "finance": "Finance Manager",
    "researcher": "Researcher / Inventor",
    "drafter": "Patent Drafter",
    "counsel": "Patent Counsel",
    "analyst": "IP Analyst",
    "product": "Product Manager",
    "cto": "Chief Technology Officer",
    "cio": "Chief IP Officer",
    "ceo": "Chief Executive Officer",
    "admin": "System Administrator",
}
