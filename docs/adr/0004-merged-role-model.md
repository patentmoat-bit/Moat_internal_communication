# ADR 0004 — Merged role model

Date: 2026-09-11
Status: Accepted · Implemented

## Context

Two specifications describe this product and they do not agree.

`MOAT_MASTER_BLUEPRINT.md` describes a **corporate in-house IP department**:
nine roles, patents only, an inventor raising a disclosure and counsel deciding
whether to file.

`Role & Requirements.docx` describes an **IP services firm**: five roles, work
organised as client projects, patents *and trademarks and copyrights*, an
in-house design team producing the figures, and a finance manager invoicing per
project. It has no patent counsel at all — the CEO approves.

Everything built so far follows the blueprint. The instruction was to merge.

## Decision

Take the union: **eleven roles**.

| Role | Source | State |
| --- | --- | --- |
| `researcher` | blueprint | Built |
| `drafter` | both | Built |
| `counsel` | blueprint | Partly — decisions built, matters not |
| `design` | **docx** | **Built** |
| `analyst` | both | Permissions only |
| `finance` | **docx** | Permissions only |
| `product`, `cto`, `cio`, `ceo`, `admin` | blueprint | Permissions only |

### Counsel is kept, despite the docx dropping it

The docx gives the CEO "decisions, approvals". Approving a patent filing is a
legal act, and running a company is not the same as being admitted to practise.
So `decision.create` stays with counsel; the CEO gets oversight, project
management and payment visibility instead.

If the CEO of this firm *is* a patent attorney, that is expressible without
changing the model: give that person both roles. Multiple roles per membership
is exactly what makes this possible, and it keeps the authority attached to the
qualification rather than to the job title.

### Finance deliberately cannot read disclosures

`finance` does not receive the base permission set. It holds projects, payments
and notifications — not `invention.read`, not `drawing.read`.

An unfiled disclosure is a trade secret whose value is destroyed by disclosure.
Paying for work does not require reading it, and every additional person who
can read one widens the surface for losing it. Verified by test.

### Design is a separate craft from drafting

The drafter requests a figure and accepts it; the design team draws it. Neither
can do the other's job: `design` holds `drawing.upload` but not
`document.update`; `drafter` holds `drawing.request` and `drawing.review` but
not `drawing.upload`.

Drawings are versioned with reviews recorded against a specific version, for
the same reason claim sets are: "approved" has to mean "approved this one". A
designer cannot approve their own work.

The specification's "Brief description of the drawings" is generated from the
figures that exist, marking any not yet approved — so the section stays in step
as figures are added and reworked.

## Navigation is permission-aware

A nav item the caller cannot use is hidden, and forcing the URL redirects to a
landing page **computed from what they can reach**. A fixed destination would
have looped: finance can read neither disclosures, nor drafts, nor drawings.

| Role | Lands on | Sees |
| --- | --- | --- |
| researcher / drafter / counsel / analyst | `/inventions` | most of the app |
| design | `/drafts` | Drafts, Drawings, Inbox, Settings |
| finance | `/inbox` | Inbox, Payments, Settings |
| admin | `/inbox` | Inbox, Settings |

The API refuses either way. This only stops a boundary from rendering as an
empty page, which reads as a bug rather than as a rule.

## Not decided

**Trademarks and copyrights.** The docx scopes all three; only patents are
built. Trademarks are not a feature on top of this — different search (word and
logo similarity), different classification (Nice, not CPC), different registries,
different lifecycle (opposition windows, ten-year renewals). It is a separate
milestone and should be sized as one.

**Projects and payments.** The docx is project-centric — "Research Projects",
"project payment", "project progress". That model does not exist yet; the
`payment.*` and `project.*` permissions are defined and the Payments route is a
stated placeholder. The project spine should be built with matters, which needs
it too.
