"""Seed a development database.

Creates two tenants with distinct people, so tenant isolation is something you
can see in the UI rather than only in a test. One person -- external counsel --
holds membership in both, which is what makes the workspace switcher real.

Run:  uv run python -m moat_api.cli.seed [--reset]
"""

from __future__ import annotations

import asyncio
import sys
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from moat_api.auth.passwords import hash_password
from moat_api.auth.permissions import (
    PERMISSION_DESCRIPTIONS,
    ROLE_LABELS,
    ROLE_PERMISSIONS,
)
from moat_api.cli.corpus_data import PUBLICATIONS
from moat_api.core.config import get_settings
from moat_api.db.base import new_id
from moat_api.db.models import (
    Invention,
    InventionContributor,
    InventionVersion,
    Membership,
    MembershipRole,
    Permission,
    Publication,
    Role,
    RolePermission,
    Tenant,
    User,
)

settings = get_settings()

# Every seeded account shares this password. Development only -- it is printed
# at the end so it is impossible to mistake for a secret.
DEV_PASSWORD = "moat-dev-password"

TENANTS = [
    {
        "slug": "northwind",
        "name": "Northwind Robotics",
        "people": [
            ("Priya Raman", "priya@northwind.example", ["researcher"]),
            ("Daniel Okafor", "daniel@northwind.example", ["researcher"]),
            ("Arun Sethi", "arun@northwind.example", ["drafter"]),
            ("Mei Lin Cho", "mei@northwind.example", ["counsel"]),
            ("Hana Brandt", "hana@northwind.example", ["analyst"]),
            # One person, two hats -- the case the blueprint's one-role model
            # could not express.
            ("Viktor Sørensen", "viktor@northwind.example", ["cto", "product"]),
            # From Role & Requirements.docx: the design team draws the
            # figures, finance handles project payments.
            ("Lea Fontaine", "lea@northwind.example", ["design"]),
            ("Marcus Webb", "marcus@northwind.example", ["finance"]),
            ("Sam Ellery", "sam@northwind.example", ["admin"]),
        ],
    },
    {
        "slug": "vantage",
        "name": "Vantage Photonics",
        "people": [
            ("Inès Moreau", "ines@vantage.example", ["researcher"]),
            ("Omar Haddad", "omar@vantage.example", ["researcher", "cto"]),
            ("Rachel Okonkwo", "rachel@vantage.example", ["ceo"]),
            ("Yuki Tanaka", "yuki@vantage.example", ["design"]),
        ],
    },
]

# External patent counsel retained by both companies. Signing in as this person
# and switching workspace shows two entirely separate sets of disclosures.
SHARED_COUNSEL = ("Tara Iyer", "tara@ipcounsel.example", ["counsel"])

INVENTIONS = {
    "northwind": [
        {
            "title": "Thermally-derated adaptive impedance control for collaborative arm joints",
            "summary": (
                "Joint stiffness limits are continuously re-derived from per-joint winding "
                "temperature, so a collaborative arm keeps its safety envelope during sustained "
                "high-duty cycles instead of falling back to a fixed conservative table."
            ),
            "problem": (
                "Collaborative arms hold a fixed, conservative stiffness ceiling chosen at "
                "commissioning for the worst-case thermal condition. On sustained high-duty "
                "cycles this leaves usable force headroom unclaimed for most of the shift, and "
                "operators compensate by slowing the cell manually."
            ),
            "description": (
                "Each joint reports winding temperature from the existing motor thermistor. A "
                "per-joint derating function maps that temperature to an allowable joint "
                "stiffness ceiling, and the impedance controller treats the resulting value as "
                "a moving upper bound rather than a fixed constant. Because the bound moves "
                "continuously, the permissible motion envelope is re-derived at control rate "
                "instead of being selected from a commissioning time lookup table. When any "
                "joint approaches its thermal limit the bound contracts before a fault "
                "condition is reached, so the cell degrades smoothly instead of stopping."
            ),
            "classifications": ["B25J 9/16", "B25J 19/06", "G05B 13/04"],
            "status": "draft",
            "contributors": ["priya@northwind.example", "daniel@northwind.example"],
        },
        {
            "title": "Sparse attention routing for on-device perception under memory pressure",
            "summary": (
                "Attention heads are selectively evicted at inference time based on a measured "
                "contribution score, allowing the perception stack to hold a latency budget on "
                "constrained edge hardware."
            ),
            "problem": (
                "The perception model does not fit the memory budget of the target accelerator "
                "at full width, and static pruning at calibration time loses accuracy on the "
                "scenes that matter most."
            ),
            "description": (
                "A contribution score is measured per attention head during inference rather "
                "than during a calibration pass. When available memory falls below a threshold, "
                "heads are evicted in ascending score order until the latency budget is met, "
                "and restored when pressure eases."
            ),
            "classifications": ["G06N 3/0464", "G06V 10/82"],
            "status": "draft",
            "contributors": ["daniel@northwind.example"],
        },
        {
            "title": "Vision-guided weld seam tracking with self-calibrating stereo baseline",
            "summary": (
                "The stereo rig re-estimates its own baseline from observed weld geometry "
                "during operation, removing the scheduled recalibration stop that currently "
                "costs a shift per month."
            ),
            "problem": (
                "Stereo baseline drifts with thermal cycling near the torch, and correcting it "
                "requires taking the cell out of production to present a calibration target."
            ),
            "description": (
                "During normal seam tracking, the observed joint path provides geometry of "
                "known form. The system re-estimates the stereo baseline from that observed "
                "scene geometry continuously, so no calibration target is ever presented and "
                "the cell is never stopped for recalibration."
            ),
            "classifications": ["B23K 9/127", "G06T 7/80"],
            "status": "draft",
            "contributors": ["priya@northwind.example"],
        },
        {
            "title": "Cell-level thermal balancing for high-cycle battery packs",
            "summary": (
                "Balancing current is allocated by predicted cell temperature rather than "
                "voltage delta alone, reducing pack degradation on duty cycles with frequent "
                "deep discharge."
            ),
            "problem": (
                "Voltage-delta balancing ignores thermal gradients across the pack, so the "
                "hottest cells age fastest and set the replacement interval for the whole pack."
            ),
            "description": (
                "A thermal model predicts per-cell temperature from current draw and position "
                "within the pack. Balancing current is allocated in dependence on that "
                "predicted cell temperature, shifting load away from cells trending hot."
            ),
            "classifications": ["H01M 10/48", "H02J 7/00"],
            "status": "draft",
            "contributors": ["daniel@northwind.example", "priya@northwind.example"],
        },
    ],
    "vantage": [
        {
            "title": "Closed-loop thermal tuning for waveguide coupling under process variation",
            "summary": (
                "Resonator heaters are driven from a per-die calibration surface so optical "
                "coupling holds across fabrication tolerance without mechanical adjustment."
            ),
            "problem": (
                "Fabrication tolerance shifts resonance enough that fixed heater drive leaves "
                "coupling loss outside specification on a significant fraction of dies."
            ),
            "description": (
                "Each die is characterised once to produce a calibration surface relating "
                "heater drive to resonance offset. During operation the control loop aligns "
                "optical coupling of the waveguide by thermal tuning of the resonator, "
                "compensating fabrication tolerance continuously."
            ),
            "classifications": ["G02B 6/12", "G02F 1/01"],
            "status": "draft",
            "contributors": ["ines@vantage.example"],
        },
        {
            "title": "Crosstalk-aware heater drive for densely integrated photonic circuits",
            "summary": (
                "Heater drive signals are corrected for measured thermal coupling between "
                "adjacent tuning elements, improving channel isolation at high integration "
                "density."
            ),
            "problem": (
                "As tuning elements are packed closer, heating one shifts its neighbours, and "
                "independent per-channel control loops fight each other."
            ),
            "description": (
                "A coupling matrix is measured at test and inverted, so each commanded "
                "resonance offset is translated into a corrected set of heater drive signals "
                "that compensates thermal crosstalk between adjacent heaters."
            ),
            "classifications": ["G02B 6/12", "G02F 1/01"],
            "status": "draft",
            "contributors": ["ines@vantage.example", "omar@vantage.example"],
        },
    ],
}


async def reset(session) -> None:
    """Clear seeded data.

    TRUNCATE rather than DELETE: it is not subject to row-level security, so
    the owner can clear every tenant at once without setting a tenant context
    per table, and CASCADE handles foreign key order.
    """
    # Every tenant-owned table, so a reseed really is a clean slate. Leaving
    # one out means yesterday's data survives and tests start failing on state
    # rather than on behaviour. index_manifests is excluded on purpose: the
    # search index is rebuilt separately by `reindex`, not by seeding.
    tables = ", ".join(
        [
            "audit_events",
            "drawing_reviews",
            "drawing_versions",
            "drawings",
            "claim_set_decisions",
            "claim_dependencies",
            "claims",
            "claim_sets",
            "document_versions",
            "documents",
            "failed_jobs",
            "job_attempts",
            "jobs",
            "outbox_events",
            "consumer_receipts",
            "extraction_artifacts",
            "source_objects",
            "upload_sessions",
            "notifications",
            "comments",
            "decisions",
            "submissions",
            "evidence_links",
            "analysis_concepts",
            "analysis_runs",
            "invention_contributors",
            "invention_versions",
            "inventions",
            "app_sessions",
            "membership_roles",
            "memberships",
            "role_permissions",
            "roles",
            "permissions",
            "users",
            "tenants",
            "publications",
        ]
    )
    await session.execute(text(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE"))


async def seed_roles(session) -> dict[str, Role]:
    permissions: dict[str, Permission] = {}
    for key, description in PERMISSION_DESCRIPTIONS.items():
        row = Permission(id=new_id(), key=str(key), description=description)
        session.add(row)
        permissions[str(key)] = row
    await session.flush()

    roles: dict[str, Role] = {}
    for key, granted in ROLE_PERMISSIONS.items():
        role = Role(id=new_id(), key=key, label=ROLE_LABELS[key], description="")
        session.add(role)
        await session.flush()
        for permission in granted:
            session.add(
                RolePermission(
                    role_id=role.id, permission_id=permissions[str(permission)].id
                )
            )
        roles[key] = role
    await session.flush()
    return roles


async def upsert_user(session, name: str, email: str) -> User:
    existing = (
        await session.execute(select(User).where(User.email == email))
    ).scalar_one_or_none()
    if existing:
        return existing
    user = User(
        id=new_id(),
        email=email,
        name=name,
        password_hash=hash_password(DEV_PASSWORD),
        is_active=True,
    )
    session.add(user)
    await session.flush()
    return user


async def main(do_reset: bool) -> None:
    # Seeds as the owner, straight at Postgres. FORCE row security applies to
    # the owner too, so tenant context is set before any tenant-owned insert --
    # which means this script exercises the same policies the API does.
    engine = create_async_engine(settings.migration_dsn, poolclass=None)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with factory() as session, session.begin():
        if do_reset:
            await reset(session)

        already = (await session.execute(select(Tenant).limit(1))).scalar_one_or_none()
        if already and not do_reset:
            print("Already seeded. Pass --reset to rebuild.")
            return

        for row in PUBLICATIONS:
            session.add(
                Publication(
                    id=new_id(),
                    source="fixture",
                    corpus_revision="local-corpus-2026.37",
                    **row,
                )
            )
        print(f"corpus: {len(PUBLICATIONS)} publications")

        roles = await seed_roles(session)
        print(f"roles: {len(roles)}")

        shared_name, shared_email, shared_roles = SHARED_COUNSEL
        shared_user = await upsert_user(session, shared_name, shared_email)

        for spec in TENANTS:
            tenant = Tenant(id=new_id(), slug=spec["slug"], name=spec["name"], is_active=True)
            session.add(tenant)
            await session.flush()

            # Tenant-owned inserts below are checked by the row policy.
            await session.execute(
                text("SELECT set_config('app.tenant_id', :t, true)"), {"t": str(tenant.id)}
            )

            people: dict[str, User] = {}
            roster = [*spec["people"], (shared_name, shared_email, shared_roles)]
            for name, email, role_keys in roster:
                user = (
                    shared_user
                    if email == shared_email
                    else await upsert_user(session, name, email)
                )
                people[email] = user
                membership = Membership(
                    id=new_id(),
                    tenant_id=tenant.id,
                    user_id=user.id,
                    is_active=True,
                    revision=1,
                )
                session.add(membership)
                await session.flush()
                for role_key in role_keys:
                    session.add(
                        MembershipRole(membership_id=membership.id, role_id=roles[role_key].id)
                    )

            year = datetime.now(UTC).year
            for index, item in enumerate(INVENTIONS[spec["slug"]], start=1):
                ref = f"{spec['slug'].upper()[:4]}-{year}-{index:04d}"
                author = people[item["contributors"][0]]
                created = datetime.now(UTC) - timedelta(days=30 - index * 4)
                invention = Invention(
                    id=new_id(),
                    tenant_id=tenant.id,
                    ref=ref,
                    title=item["title"],
                    summary=item["summary"],
                    status=item["status"],
                    current_revision=1,
                    classifications=item["classifications"],
                    created_by_id=author.id,
                    created_at=created,
                    updated_at=created,
                )
                session.add(invention)
                await session.flush()
                session.add(
                    InventionVersion(
                        id=new_id(),
                        tenant_id=tenant.id,
                        invention_id=invention.id,
                        revision=1,
                        title=item["title"],
                        summary=item["summary"],
                        problem=item["problem"],
                        description=item["description"],
                        classifications=item["classifications"],
                        authored_by_id=author.id,
                    )
                )
                for email in item["contributors"]:
                    session.add(
                        InventionContributor(
                            id=new_id(),
                            tenant_id=tenant.id,
                            invention_id=invention.id,
                            user_id=people[email].id,
                            contribution="Inventor",
                        )
                    )

            print(
                f"tenant {spec['slug']}: {len(spec['people']) + 1} members, "
                f"{len(INVENTIONS[spec['slug']])} disclosures"
            )

    await engine.dispose()

    print("\nSign in with any address below. Password for all of them:")
    print(f"    {DEV_PASSWORD}\n")
    for spec in TENANTS:
        print(f"  {spec['name']}")
        for name, email, role_keys in spec["people"]:
            print(f"    {email:<34} {name:<18} {', '.join(role_keys)}")
    print("\n  Member of both workspaces (use the switcher):")
    print(f"    {SHARED_COUNSEL[1]:<34} {SHARED_COUNSEL[0]:<18} {', '.join(SHARED_COUNSEL[2])}")


if __name__ == "__main__":
    asyncio.run(main("--reset" in sys.argv))
