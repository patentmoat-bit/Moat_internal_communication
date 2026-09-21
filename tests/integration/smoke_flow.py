"""End-to-end check of the multi-tenant flow against a running API.

Exercises the whole Phase 1 path and, just as importantly, the paths that must
FAIL: cross-tenant reads, missing permissions, stale revisions.

    uv run --project apps/api python tests/integration/smoke_flow.py
"""

from __future__ import annotations

import io
import sys
import time
import uuid

import httpx

BASE = "http://127.0.0.1:8000/api/v1"
PASSWORD = "moat-dev-password"
ORIGIN = {"origin": "http://localhost:3000"}

passed = 0
failed = 0


def check(label: str, condition: bool, detail: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS  {label}")
    else:
        failed += 1
        print(f"  FAIL  {label}  {detail}")


# One authenticated client per account per run. Each login is a real
# authentication against the real throttle, so calling login() repeatedly for
# the same person would eventually -- correctly -- be refused with 429. Caching
# keeps the suite honest about the limit rather than raising it.
_CLIENTS: dict[str, httpx.Client] = {}


def login(email: str) -> httpx.Client:
    cached = _CLIENTS.get(email)
    if cached is not None:
        return cached

    client = httpx.Client(base_url=BASE, headers=ORIGIN, timeout=30)
    response = client.post("/auth/login", json={"email": email, "password": PASSWORD})
    if response.status_code == 429:
        raise SystemExit(
            f"\nLogin throttled for {email}.\n"
            f"That is the rate limiter working: {response.json()['error']['message']}\n"
            f"Wait for the window to pass, or restart the API to clear its in-process\n"
            f"counters. Do not raise MOAT_LOGIN_MAX_PER_ACCOUNT to get around it --\n"
            f"production refuses to start above 10.\n"
        )
    response.raise_for_status()
    _CLIENTS[email] = client
    return client


def main() -> int:
    print("\n1. Authentication")
    priya = login("priya@northwind.example")
    me = priya.get("/auth/me").json()
    check("researcher signs in", me["user"]["email"] == "priya@northwind.example")
    check("session carries a tenant", me["tenant"]["slug"] == "northwind", me["tenant"])
    check(
        "researcher holds invention.create",
        "invention.create" in me["permissions"],
        me["permissions"],
    )
    check(
        "researcher does NOT hold decision.create",
        "decision.create" not in me["permissions"],
    )

    anonymous = httpx.Client(base_url=BASE, headers=ORIGIN, timeout=30)
    check("unauthenticated read is refused", anonymous.get("/inventions").status_code == 401)
    check(
        "bad password is refused",
        anonymous.post(
            "/auth/login", json={"email": "priya@northwind.example", "password": "wrong"}
        ).status_code
        == 401,
    )

    print("\n2. Tenant isolation")
    northwind = priya.get("/inventions").json()
    check("Northwind sees its 4 disclosures", len(northwind) == 4, f"got {len(northwind)}")

    ines = login("ines@vantage.example")
    vantage = ines.get("/inventions").json()
    check("Vantage sees its 2 disclosures", len(vantage) == 2, f"got {len(vantage)}")

    nw_ids = {item["id"] for item in northwind}
    vg_ids = {item["id"] for item in vantage}
    check("no disclosure appears in both tenants", not (nw_ids & vg_ids))

    target = northwind[0]
    cross = ines.get(f"/inventions/{target['id']}")
    check(
        "cross-tenant fetch by id returns 404, not 403",
        cross.status_code == 404,
        f"got {cross.status_code}",
    )

    print("\n3. Create, retrieve evidence, submit")
    created = priya.post(
        "/inventions",
        json={
            "title": "Winding-temperature aware stiffness ceiling for collaborative joints",
            "summary": "Joint stiffness ceiling is re-derived from winding temperature at control rate.",
            "problem": "A fixed commissioning-time stiffness table wastes force headroom.",
            "description": (
                "The controller estimates external force from motor current and varies the "
                "joint stiffness setpoint, with the permissible motion envelope re-derived at "
                "control rate from winding temperature rather than a lookup table."
            ),
            "classifications": ["B25J 9/16"],
        },
    )
    check("disclosure created", created.status_code == 201, created.text[:200])
    invention = created.json()
    check("docket reference allocated", invention["ref"].startswith("NORT-"), invention["ref"])
    check("starts at revision 1", invention["revision"] == 1)

    accepted = priya.post(f"/inventions/{invention['id']}/analyses")
    check("analysis is accepted", accepted.status_code == 202, accepted.text[:200])
    finished = wait_for_job(priya, accepted.json()["job"]["id"])
    check("analysis job succeeds", finished["status"] == "succeeded", finished)

    detail = priya.get(f"/inventions/{invention['id']}").json()
    run = detail["latestAnalysis"]
    check("evidence retrieved from corpus", len(run["evidence"]) > 0, f"{len(run['evidence'])} hits")
    check("concepts extracted", len(run["concepts"]) > 0)
    check("provenance recorded", bool(run["retrievalVersion"]) and bool(run["corpusRevision"]))
    check(
        "retrieval is hybrid, not lexical only",
        "knn" in run["retrievalVersion"],
        run["retrievalVersion"],
    )
    check(
        "model version is honest about there being no model",
        "none" in run["modelVersion"],
        run["modelVersion"],
    )
    top = run["evidence"][0]
    print(f"        top hit: {top['publicationId']}  score {top['retrievalScore']}")

    submitted = priya.post(f"/inventions/{invention['id']}/submit", json={"note": "Ready"})
    check("submitted for review", submitted.json()["status"] == "submitted", submitted.text[:200])

    print("\n4. Permission boundaries")
    denied = priya.post(
        f"/inventions/{invention['id']}/decisions",
        json={"outcome": "approved", "rationale": "I approve my own work.", "revision": 1},
    )
    check(
        "researcher cannot decide on their own disclosure",
        denied.status_code == 403,
        f"got {denied.status_code}",
    )

    sam = login("sam@northwind.example")
    admin_denied = sam.post(
        f"/inventions/{invention['id']}/decisions",
        json={"outcome": "approved", "rationale": "Admin override attempt.", "revision": 1},
    )
    check(
        "admin cannot decide either (admin is not legal authority)",
        admin_denied.status_code == 403,
        f"got {admin_denied.status_code}",
    )

    print("\n5. Review against an exact revision")
    mei = login("mei@northwind.example")
    stale = mei.post(
        f"/inventions/{invention['id']}/decisions",
        json={"outcome": "approved", "rationale": "Approving an old revision.", "revision": 99},
    )
    check(
        "decision on a revision that is not current is refused",
        stale.status_code == 409,
        f"got {stale.status_code}",
    )

    decided = mei.post(
        f"/inventions/{invention['id']}/decisions",
        json={
            "outcome": "approved",
            "rationale": "Current-based force estimation is disclosed in the art, but "
            "continuous thermal re-derivation of the ceiling is not. Proceed to drafting.",
            "revision": 1,
        },
    )
    check("counsel records a decision", decided.status_code == 201, decided.text[:200])

    after = priya.get(f"/inventions/{invention['id']}").json()
    check("status reflects the decision", after["status"] == "approved", after["status"])
    check("decision is not superseded yet", after["decision"]["superseded"] is False)

    print("\n6. Editing invalidates a decision")
    edited = priya.put(
        f"/inventions/{invention['id']}",
        json={
            "title": after["title"] + " (revised)",
            "summary": after["summary"],
            "problem": after["problem"],
            "description": after["description"],
            "classifications": after["classifications"],
            "baseRevision": after["revision"],
        },
    )
    check("edit accepted", edited.status_code == 200, edited.text[:200])
    updated = edited.json()
    check("revision advanced", updated["revision"] == 2, updated["revision"])
    check("approval no longer applies to current text", updated["decision"]["superseded"] is True)
    check("status returned to draft after edit", updated["status"] == "draft", updated["status"])
    check(
        "evidence now flagged against an older revision",
        updated["latestAnalysis"]["inventionRevision"] != updated["revision"],
    )

    conflict = priya.put(
        f"/inventions/{invention['id']}",
        json={
            "title": "Concurrent edit",
            "summary": "",
            "problem": "",
            "description": "",
            "classifications": [],
            "baseRevision": 1,
        },
    )
    check(
        "stale write is refused instead of overwriting",
        conflict.status_code == 409,
        f"got {conflict.status_code}",
    )

    print("\n7. Notifications and multi-workspace membership")
    inbox = mei.get("/notifications").json()
    check("counsel was notified of the submission", any(n["kind"] == "approval_request" for n in inbox))

    priya_inbox = priya.get("/notifications").json()
    check(
        "inventor was notified of the decision",
        any(n["kind"] == "approval_decision" for n in priya_inbox),
    )

    tara = login("tara@ipcounsel.example")
    session = tara.get("/auth/me").json()
    check(
        "external counsel belongs to both workspaces",
        len(session["availableTenants"]) == 2,
        session["availableTenants"],
    )
    first = tara.get("/inventions").json()
    other = next(t for t in session["availableTenants"] if t["id"] != session["tenant"]["id"])
    switched = tara.post("/auth/switch-tenant", json={"tenantId": other["id"]})
    check("workspace switch succeeds", switched.status_code == 200, switched.text[:200])
    second = tara.get("/inventions").json()
    check(
        "switching workspace shows a different disclosure set",
        {i["id"] for i in first}.isdisjoint({i["id"] for i in second}),
    )

    print("\n8. Colleagues")
    people = priya.get("/users").json()
    # Asserted by content, not by count: the seed grows as roles are added, and
    # a hardcoded number turns every new colleague into a failing test.
    roles_present = {role for person in people for role in person["roles"]}
    check(
        "the roster covers the whole workflow",
        {"researcher", "drafter", "counsel", "design"} <= roles_present,
        sorted(roles_present),
    )
    check("every colleague has a name and an email", all(p["name"] and p["email"] for p in people))
    multi = [p for p in people if len(p["roles"]) > 1]
    check("a person can hold several roles", len(multi) >= 1, multi)

    vantage_roster = {p["email"] for p in ines.get("/users").json()}
    northwind_roster = {p["email"] for p in people}
    check(
        "each workspace has its own roster",
        vantage_roster != northwind_roster,
    )
    check(
        "a colleague from one workspace is not listed in the other",
        "priya@northwind.example" not in vantage_roster,
        sorted(vantage_roster),
    )
    # Tara is a member of both, so appearing in both rosters is correct --
    # she is the only person who should.
    check(
        "only the shared member appears in both",
        vantage_roster & northwind_roster == {"tara@ipcounsel.example"},
        sorted(vantage_roster & northwind_roster),
    )

    print("\n9. Durable jobs")
    accepted = priya.post(f"/inventions/{invention['id']}/analyses")
    check("analysis returns 202, not a result", accepted.status_code == 202, accepted.status_code)
    body = accepted.json()
    check("Location header points at the job", "/jobs/" in accepted.headers.get("location", ""))
    check("job starts queued or running", body["job"]["status"] in ("queued", "running"))

    repeat = priya.post(f"/inventions/{invention['id']}/analyses").json()
    check(
        "identical request returns the same job",
        repeat["job"]["id"] == body["job"]["id"] and repeat["created"] is False,
    )

    job = wait_for_job(priya, body["job"]["id"])
    check("job reaches a terminal state", job["status"] == "succeeded", job)
    check("job records its result", job["result"].get("evidence", 0) > 0, job["result"])

    cross_job = ines.get(f"/jobs/{body['job']['id']}")
    check(
        "another tenant cannot read the job",
        cross_job.status_code == 404,
        cross_job.status_code,
    )

    print("\n10. Upload, extraction and honest rejection")
    from pypdf import PdfWriter

    writer = PdfWriter()
    writer.add_blank_page(width=300, height=300)
    buffer = io.BytesIO()
    writer.write(buffer)

    scanned_job = upload_file(priya, invention["id"], "scan.pdf", buffer.getvalue(), "application/pdf")
    scanned = wait_for_job(priya, scanned_job)
    check("PDF extraction succeeds", scanned["status"] == "succeeded", scanned)
    check(
        "a page with no text layer is reported as needing OCR",
        scanned["result"].get("pages_needing_ocr", 0) == 1,
        scanned["result"],
    )

    notes = b"A joint stiffness ceiling derived continuously from winding temperature."
    text_job = wait_for_job(
        priya, upload_file(priya, invention["id"], "notes.txt", notes, "text/plain")
    )
    check("text extraction succeeds", text_job["status"] == "succeeded", text_job)
    check(
        "extracted character count is recorded",
        text_job["result"].get("characters") == len(notes),
        text_job["result"],
    )

    fake_job = wait_for_job(
        priya, upload_file(priya, invention["id"], "fake.pdf", b"not a pdf", "application/pdf")
    )
    check("a mislabelled file is rejected", fake_job["status"] == "failed", fake_job)
    check(
        "rejection names a category",
        fake_job["failureCategory"] == "unreadable",
        fake_job["failureCategory"],
    )

    documents = priya.get(f"/inventions/{invention['id']}/documents").json()
    states = {doc["filename"]: doc["state"] for doc in documents}
    check("readable documents end up ready", states.get("notes.txt") == "ready", states)
    check(
        "an unreadable document ends up rejected, not stuck",
        states.get("fake.pdf") == "rejected",
        states,
    )

    cross_docs = ines.get(f"/inventions/{invention['id']}/documents")
    check(
        "another tenant cannot list the documents",
        cross_docs.status_code in (403, 404) or cross_docs.json() == [],
        cross_docs.status_code,
    )

    print("\n11. Upload guards")
    oversize = priya.post(
        "/uploads",
        json={"filename": "big.pdf", "contentType": "application/pdf", "size": 999_999_999},
    )
    check("an oversized declaration is refused", oversize.status_code == 400, oversize.status_code)

    bad_type = priya.post(
        "/uploads",
        json={"filename": "run.exe", "contentType": "application/x-msdownload", "size": 100},
    )
    check("a disallowed type is refused", bad_type.status_code == 400, bad_type.status_code)

    reserved = priya.post(
        "/uploads",
        json={"filename": "x.txt", "contentType": "text/plain", "size": 5},
    ).json()
    priya.post(
        reserved["uploadUrl"].replace("/api/v1", ""),
        files={"file": ("x.txt", b"hello", "text/plain")},
    )
    mismatch = priya.post(
        f"/uploads/{reserved['uploadId']}/complete", json={"sha256": "0" * 64}
    )
    check("a checksum mismatch is refused", mismatch.status_code == 409, mismatch.status_code)

    print("\n12. Live event stream")
    events = read_events(priya, invention["id"])
    check("the stream opens", "open" in events, events)
    check("job progress is streamed", "job" in events, events)
    check("notifications are streamed", "notification" in events, events)

    print("\n13. Drafting: approved disclosure to claim set")
    arun = login("arun@northwind.example")

    me_drafter = arun.get("/auth/me").json()["permissions"]
    check("drafter may edit a specification", "document.update" in me_drafter)
    check(
        "counsel may start and export a draft but not edit claims",
        "document.update" not in mei.get("/auth/me").json()["permissions"],
    )

    # A fresh disclosure taken all the way to approved, so it reaches the queue.
    spec_invention = priya.post(
        "/inventions",
        json={
            "title": "Winding-temperature derated stiffness ceiling for robot joints",
            "summary": "Stiffness ceiling re-derived at control rate from winding temperature.",
            "problem": "A fixed commissioning-time table wastes force headroom.",
            "description": "A controller derives a stiffness ceiling from winding temperature.",
            "classifications": ["B25J 9/16"],
        },
    ).json()
    priya.post(f"/inventions/{spec_invention['id']}/submit", json={"note": ""})
    mei.post(
        f"/inventions/{spec_invention['id']}/decisions",
        json={"outcome": "approved", "revision": 1, "rationale": "Proceed to drafting please."},
    )

    queue = arun.get("/drafts/queue").json()
    check(
        "approved disclosure reaches the drafting queue",
        any(item["ref"] == spec_invention["ref"] for item in queue),
        [item["ref"] for item in queue],
    )

    started = arun.post("/drafts", json={"inventionId": spec_invention["id"], "jurisdiction": "US"})
    check("drafter starts a draft", started.status_code == 201, started.text[:200])
    draft = started.json()
    check("draft carries the disclosure text over", len(draft["detailedDescription"]) > 0)
    check("draft reference allocated", "-SPEC-" in draft["ref"], draft["ref"])

    denied_draft = priya.post("/drafts", json={"inventionId": spec_invention["id"]})
    check(
        "a researcher cannot start a draft",
        denied_draft.status_code == 403,
        denied_draft.status_code,
    )

    unapproved = arun.post("/drafts", json={"inventionId": invention["id"]})
    check(
        "drafting an unapproved disclosure is refused",
        unapproved.status_code == 409,
        unapproved.status_code,
    )

    print("\n14. Claim rules")
    saved = arun.put(
        f"/drafts/{draft['id']}/claims",
        json={
            "claims": [
                {
                    "number": 1, "kind": "independent", "category": "apparatus",
                    "preamble": "A robot joint assembly", "transition": "comprising",
                    "body": "a motor having a winding; a thermistor coupled to the winding; "
                            "and a controller deriving a stiffness ceiling.",
                    "dependsOn": [],
                },
                {
                    "number": 2, "kind": "dependent", "category": "apparatus",
                    "preamble": "The joint assembly of claim 1", "transition": "wherein",
                    "body": "the controller re-derives the stiffness ceiling at a control rate.",
                    "dependsOn": [1],
                },
                {
                    "number": 3, "kind": "dependent", "category": "apparatus",
                    "preamble": "The joint assembly of claim 1", "transition": "wherein",
                    "body": "the gearbox reduces backlash.",
                    "dependsOn": [1],
                },
            ],
            "changeNote": "First pass",
        },
    )
    check("claim set saves", saved.status_code == 200, saved.text[:200])
    claim_set = saved.json()["claimSet"]
    check("claim set starts at revision 1", claim_set["revision"] == 1)
    check("claim tree is built", len(claim_set["tree"]) == 1)
    check("dependents nest under their parent", len(claim_set["tree"][0]["children"]) == 2)

    antecedent = [f for f in claim_set["findings"] if f["code"] == "antecedent_basis"]
    check(
        "missing antecedent basis is caught",
        any(f["excerpt"] == "the gearbox" for f in antecedent),
        [f["excerpt"] for f in antecedent],
    )
    check(
        "properly introduced elements are NOT flagged",
        not any(f["excerpt"] in ("the winding", "the controller") for f in antecedent),
        [f["excerpt"] for f in antecedent],
    )
    check(
        "findings cite the rule they come from",
        all(f["authority"] for f in antecedent),
    )

    broken = arun.put(
        f"/drafts/{draft['id']}/claims",
        json={
            "claims": [
                {"number": 1, "kind": "dependent", "category": "apparatus", "preamble": "The device",
                 "transition": "wherein", "body": "x.", "dependsOn": [2]},
                {"number": 2, "kind": "dependent", "category": "apparatus", "preamble": "The device",
                 "transition": "wherein", "body": "y.", "dependsOn": [1]},
            ],
            "changeNote": "broken",
        },
    )
    check("a structurally invalid set is refused", broken.status_code == 422, broken.status_code)
    broken_codes = {f["code"] for f in broken.json()["error"]["findings"]}
    check("dependency cycle detected", "dependency_cycle" in broken_codes, broken_codes)
    check("forward reference detected", "forward_reference" in broken_codes, broken_codes)
    check("missing independent claim detected", "no_independent" in broken_codes, broken_codes)

    live = arun.post(
        "/drafts/check",
        json={
            "claims": [
                {"number": 1, "kind": "independent", "category": "apparatus",
                 "preamble": "A device", "transition": "comprising",
                 "body": "a plurality of blades; and a hub carrying the blades.", "dependsOn": []}
            ]
        },
    )
    check("live check endpoint answers", live.status_code == 200)
    check(
        '"a plurality of X" then "the X" gives no false positive',
        len(live.json()["findings"]) == 0,
        live.json()["findings"],
    )

    print("\n15. Claim set immutability")
    submitted = arun.post(f"/drafts/{draft['id']}/claims/submit")
    check("claim set submits", submitted.status_code == 200, submitted.text[:200])
    frozen = submitted.json()["claimSet"]
    check("submitted set is frozen", frozen["frozenAt"] is not None)
    check("document moves to review", submitted.json()["status"] == "in_review")

    resubmit = arun.post(f"/drafts/{draft['id']}/claims/submit")
    check("re-submitting a frozen set is refused", resubmit.status_code == 409)

    amended = arun.put(
        f"/drafts/{draft['id']}/claims",
        json={
            "claims": [
                {k: c[k] for k in
                 ("number", "kind", "category", "preamble", "transition", "body", "dependsOn")}
                for c in frozen["claims"]
            ]
            + [
                {"number": 4, "kind": "dependent", "category": "apparatus",
                 "preamble": "The joint assembly of claim 1", "transition": "wherein",
                 "body": "the motor is brushless.", "dependsOn": [1]}
            ],
            "changeNote": "Added claim 4",
        },
    )
    check(
        "editing a frozen set starts a new revision",
        amended.json()["claimSet"]["revision"] == 2,
        amended.json()["claimSet"]["revision"],
    )
    check("the new revision is editable again", amended.json()["claimSet"]["status"] == "draft")

    cross_draft = ines.get(f"/drafts/{draft['id']}")
    check(
        "another tenant cannot read the draft",
        cross_draft.status_code == 404,
        cross_draft.status_code,
    )

    print("\n16. Drafting assistance")
    assist = arun.get(f"/drafts/{draft['id']}/assist").json()
    check("template generation is available", assist["templateGeneration"] is True)
    check(
        "no model is configured, and the response says so",
        assist["modelGeneration"] is False and "trade secret" in assist["modelNote"],
        assist["modelNote"][:80],
    )
    fields = {s["field"] for s in assist["suggestions"]}
    check("abstract is generated from the claims", "abstract" in fields, fields)
    check("summary is generated from the claims", "summary" in fields, fields)
    check(
        "every suggestion explains where it came from",
        all(s["rationale"] for s in assist["suggestions"]),
    )
    generated_abstract = next(
        (s["value"] for s in assist["suggestions"] if s["field"] == "abstract"), ""
    )
    check(
        "generated abstract stays within the 150-word limit",
        len(generated_abstract.split()) <= 150,
        len(generated_abstract.split()),
    )

    print("\n17. Counsel decides the claim set (closing the loop)")
    current = arun.get(f"/drafts/{draft['id']}").json()
    revision = current["claimSet"]["revision"]

    # The amended set from section 15 is a draft again, so freeze it first.
    if current["claimSet"]["frozenAt"] is None:
        arun.post(f"/drafts/{draft['id']}/claims/submit")
        current = arun.get(f"/drafts/{draft['id']}").json()
        revision = current["claimSet"]["revision"]

    self_decision = arun.post(
        f"/drafts/{draft['id']}/claim-decisions",
        json={"outcome": "approved", "rationale": "Approving my own claims.",
              "claimSetRevision": revision},
    )
    check(
        "a drafter cannot decide on their own claim set",
        self_decision.status_code == 403,
        self_decision.status_code,
    )

    stale_decision = mei.post(
        f"/drafts/{draft['id']}/claim-decisions",
        json={"outcome": "approved", "rationale": "Reviewed an older revision.",
              "claimSetRevision": 99},
    )
    check(
        "a decision naming the wrong revision is refused",
        stale_decision.status_code == 409,
        stale_decision.status_code,
    )

    decided = mei.post(
        f"/drafts/{draft['id']}/claim-decisions",
        json={
            "outcome": "approved",
            "claimSetRevision": revision,
            "rationale": "Claim 1 is supported by the specification and distinguishes the "
                         "retrieved art. Approved for filing.",
        },
    )
    check("counsel records a claim decision", decided.status_code == 201, decided.text[:200])
    check("the draft reaches approved", decided.json()["status"] == "approved")
    check("the claim set is marked approved", decided.json()["claimSet"]["status"] == "approved")
    check("the decision is not superseded yet", decided.json()["claimDecision"]["superseded"] is False)

    second = mei.post(
        f"/drafts/{draft['id']}/claim-decisions",
        json={"outcome": "returned", "rationale": "Changing my mind entirely.",
              "claimSetRevision": revision},
    )
    check(
        "a second verdict on the same claim set is refused",
        second.status_code == 409,
        second.status_code,
    )

    amended = arun.put(
        f"/drafts/{draft['id']}/claims",
        json={
            "claims": [
                {k: c[k] for k in
                 ("number", "kind", "category", "preamble", "transition", "body", "dependsOn")}
                for c in decided.json()["claimSet"]["claims"]
            ]
            + [{"number": len(decided.json()["claimSet"]["claims"]) + 1, "kind": "dependent",
                "category": "apparatus", "preamble": "The joint assembly of claim 1",
                "transition": "wherein", "body": "the motor is brushless.", "dependsOn": [1]}],
            "changeNote": "Added a claim after approval",
        },
    ).json()
    check(
        "amending after approval marks the decision superseded",
        amended["claimDecision"]["superseded"] is True,
    )

    print("\n18. Export")
    for fmt, magic in (("docx", b"PK"), ("xml", b"<?xml"), ("pdf", b"%PDF")):
        accepted = arun.post(f"/drafts/{draft['id']}/exports", json={"format": fmt})
        check(f"{fmt} export is accepted", accepted.status_code == 202, accepted.status_code)
        job = wait_for_job(arun, accepted.json()["job"]["id"], limit=120)
        if job["status"] != "succeeded":
            check(f"{fmt} export succeeds", False, job.get("detail"))
            continue
        check(f"{fmt} export succeeds", True)
        download = arun.get(f"/drafts/{draft['id']}/exports/{job['id']}/download")
        check(f"{fmt} downloads", download.status_code == 200, download.status_code)
        check(
            f"{fmt} file is really a {fmt}",
            download.content.startswith(magic),
            download.content[:8],
        )
        check(
            f"{fmt} is sent as an attachment",
            "attachment" in download.headers.get("content-disposition", ""),
        )

    # Two different refusals, and the distinction matters.
    #
    # A user WITHOUT the permission is refused by the permission check before
    # the document is ever looked up. That returns 403 and discloses nothing --
    # a researcher gets the same 403 for a real id and for a made-up one.
    no_permission = ines.post(f"/drafts/{draft['id']}/exports", json={"format": "docx"})
    fabricated = ines.post(
        f"/drafts/{uuid.uuid4()}/exports", json={"format": "docx"}
    )
    check(
        "a role without export permission is refused",
        no_permission.status_code == 403,
        no_permission.status_code,
    )
    check(
        "that refusal is identical for a fabricated id, so it leaks nothing",
        no_permission.status_code == fabricated.status_code,
        (no_permission.status_code, fabricated.status_code),
    )

    # The isolation case that actually matters: someone who DOES hold the
    # permission, in a different tenant. The row policy makes the document
    # invisible, so it reads as not-found rather than forbidden.
    # Already authenticated in section 7; switching workspace reuses that
    # session rather than logging in again.
    tara_vantage = login("tara@ipcounsel.example")
    session = tara_vantage.get("/auth/me").json()
    if session["tenant"]["slug"] != "vantage":
        other = next(t for t in session["availableTenants"] if t["slug"] == "vantage")
        tara_vantage.post("/auth/switch-tenant", json={"tenantId": other["id"]})
    check(
        "external counsel holds export permission",
        "document.export" in tara_vantage.get("/auth/me").json()["permissions"],
    )
    cross_export = tara_vantage.post(
        f"/drafts/{draft['id']}/exports", json={"format": "docx"}
    )
    check(
        "a permitted role in another tenant sees the draft as not-found",
        cross_export.status_code == 404,
        cross_export.status_code,
    )

    print("\n19. Design team: request, draw, review, rework")
    lea = login("lea@northwind.example")
    marcus = login("marcus@northwind.example")

    lea_permissions = lea.get("/auth/me").json()["permissions"]
    check("design can upload drawings", "drawing.upload" in lea_permissions)
    check("design cannot edit the specification", "document.update" not in lea_permissions)

    # Finance sees money, not trade secrets. An unfiled disclosure is the most
    # sensitive thing in the system; paying for work does not require reading it.
    finance_permissions = marcus.get("/auth/me").json()["permissions"]
    check("finance cannot read disclosures", "invention.read" not in finance_permissions)
    check("finance cannot read drawings", "drawing.read" not in finance_permissions)
    check("finance manages payments", "payment.manage" in finance_permissions)
    check(
        "finance is refused the disclosure list",
        marcus.get("/inventions").status_code == 403,
    )

    requested = arun.post(
        f"/drafts/{draft['id']}/drawings",
        json={
            "figureNumber": 1,
            "caption": "is a schematic of the joint assembly.",
            "brief": "Show the motor, winding, thermistor and controller with signal paths.",
        },
    )
    check("drafter requests a figure", requested.status_code == 201, requested.text[:160])
    figure = requested.json()
    check("a new figure starts as requested", figure["status"] == "requested")

    duplicate = arun.post(
        f"/drafts/{draft['id']}/drawings",
        json={"figureNumber": 1, "caption": "", "brief": "duplicate figure number"},
    )
    check("a duplicate figure number is refused", duplicate.status_code == 409)

    queue = lea.get("/drawings/queue").json()
    check(
        "the figure reaches the design queue",
        any(item["id"] == figure["id"] for item in queue),
        [item["figureNumber"] for item in queue],
    )

    claimed = lea.post(f"/drawings/{figure['id']}/assign", json={})
    check("a designer can take an unassigned figure", claimed.json()["status"] == "in_progress")

    uploaded = lea.post(
        f"/drawings/{figure['id']}/versions",
        params={"notes": "First pass"},
        files={"file": ("fig1.png", tiny_png(), "image/png")},
    )
    check("a designer uploads a version", uploaded.status_code == 201, uploaded.text[:160])
    check("upload moves it to awaiting review", uploaded.json()["status"] == "submitted")

    mislabelled = lea.post(
        f"/drawings/{figure['id']}/versions",
        files={"file": ("fake.png", b"not a png", "image/png")},
    )
    check("a mislabelled image is refused", mislabelled.status_code == 400, mislabelled.status_code)

    self_review = lea.post(
        f"/drawings/{figure['id']}/reviews",
        json={"outcome": "approved", "version": 1, "notes": "Approving my own drawing."},
    )
    check(
        "a designer cannot approve their own drawing",
        self_review.status_code == 403,
        self_review.status_code,
    )

    reworked = arun.post(
        f"/drawings/{figure['id']}/reviews",
        json={"outcome": "rework", "version": 1, "notes": "Label the thermistor."},
    )
    check("the drafter can send it back", reworked.json()["status"] == "rework")

    lea.post(
        f"/drawings/{figure['id']}/versions",
        params={"notes": "Labels added"},
        files={"file": ("fig1.png", tiny_png(90, 60), "image/png")},
    )
    stale_review = arun.post(
        f"/drawings/{figure['id']}/reviews",
        json={"outcome": "approved", "version": 1, "notes": "Reviewing the old one."},
    )
    check(
        "reviewing a superseded version is refused",
        stale_review.status_code == 409,
        stale_review.status_code,
    )

    approved_drawing = arun.post(
        f"/drawings/{figure['id']}/reviews",
        json={"outcome": "approved", "version": 2, "notes": "Good."},
    )
    check("the drafter approves version 2", approved_drawing.json()["status"] == "approved")
    check("both versions are kept", len(approved_drawing.json()["versions"]) == 2)
    check("both reviews are kept", len(approved_drawing.json()["reviews"]) == 2)

    image = arun.get(f"/drawings/{figure['id']}/versions/2/file")
    check("the image is served", image.status_code == 200 and image.content[:4] == b"\x89PNG")
    check(
        "figures are never cached by a shared proxy",
        "private" in image.headers.get("cache-control", ""),
        image.headers.get("cache-control"),
    )

    summary = arun.get(f"/drafts/{draft['id']}/drawings/summary").json()
    check(
        "the drawings section is composed from the figures",
        "FIG. 1" in summary["text"] and summary["approved"] == 1,
        summary,
    )

    cross_drawing = ines.get(f"/drawings/{figure['id']}/versions/2/file")
    check(
        "another tenant cannot fetch the image",
        cross_drawing.status_code == 404,
        cross_drawing.status_code,
    )

    print(f"\n{'=' * 52}\n  {passed} passed, {failed} failed\n{'=' * 52}")
    return 1 if failed else 0


def tiny_png(width: int = 60, height: int = 40) -> bytes:
    """A real PNG, built here so the tests do not depend on a fixture file."""
    import struct
    import zlib

    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + bytes([200, 200, 255]) * width for _ in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def wait_for_job(client: httpx.Client, job_id: str, limit: float = 90.0) -> dict:
    """Poll until the job is terminal. A job that never finishes is itself a
    failure -- accepted work must always reach a terminal state."""
    deadline = time.time() + limit
    job: dict = {}
    while time.time() < deadline:
        job = client.get(f"/jobs/{job_id}").json()
        if job.get("status") in ("succeeded", "failed", "cancelled"):
            return job
        time.sleep(0.4)
    return job


def upload_file(
    client: httpx.Client, invention_id: str, name: str, data: bytes, content_type: str
) -> str:
    reserved = client.post(
        "/uploads",
        json={
            "filename": name,
            "contentType": content_type,
            "size": len(data),
            "inventionId": invention_id,
        },
    ).json()
    client.post(
        reserved["uploadUrl"].replace("/api/v1", ""),
        files={"file": (name, data, content_type)},
    )
    return client.post(f"/uploads/{reserved['uploadId']}/complete", json={}).json()["job"]["id"]


def read_events(client: httpx.Client, invention_id: str, seconds: float = 12.0) -> set[str]:
    """Open the stream, trigger work, and collect the event types that arrive."""
    seen: set[str] = set()
    with client.stream("GET", "/events", timeout=seconds + 5) as response:
        deadline = time.time() + seconds
        triggered = False
        for line in response.iter_lines():
            if line.startswith("event: "):
                seen.add(line.removeprefix("event: ").strip())
            if not triggered:
                triggered = True
                # Editing bumps the revision so the analysis is a new job
                # rather than an idempotent repeat of one already finished.
                detail = httpx.Client(
                    base_url=BASE, headers=ORIGIN, cookies=client.cookies, timeout=30
                )
                current = detail.get(f"/inventions/{invention_id}").json()
                detail.put(
                    f"/inventions/{invention_id}",
                    json={
                        "title": current["title"],
                        "summary": current["summary"],
                        "problem": current["problem"],
                        "description": current["description"],
                        "classifications": current["classifications"],
                        "baseRevision": current["revision"],
                    },
                )
                detail.post(f"/inventions/{invention_id}/analyses")
            if {"job", "notification"} <= seen or time.time() > deadline:
                break
    return seen


if __name__ == "__main__":
    sys.exit(main())
