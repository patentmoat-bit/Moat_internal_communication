"""Drafting assistance.

Every suggestion must be a faithful restructuring of text the drafter already
wrote. A generator that quietly introduces technical content would be worse
than useless here -- it would put words into a legal document nobody chose.
"""

from __future__ import annotations

from moat_api.services import drafting_assist as assist
from moat_api.services.claims import ClaimInput


def claim(number, kind, preamble, transition, body, parents=None):
    return ClaimInput(
        number, kind, "apparatus", preamble, transition, body, depends_on=parents or []
    )


def test_abstract_restates_the_broadest_claim():
    claims = [claim(1, "independent", "A joint assembly", "comprising", "a motor; and a sensor.")]
    suggestion = assist.abstract_from_claims(claims)
    assert "motor" in suggestion.value
    assert "sensor" in suggestion.value
    # Claim register becomes prose register.
    assert "comprising" not in suggestion.value.lower()


def test_abstract_handles_plurality_without_a_dangling_article():
    """"a plurality of samples" becomes "several samples", not "a several
    samples" -- the article belongs to the phrase being replaced."""
    claims = [
        claim(1, "independent", "A device", "comprising", "a controller reading a plurality of samples.")
    ]
    value = assist.abstract_from_claims(claims).value
    assert "a several" not in value
    assert "several samples" in value


def test_abstract_respects_the_150_word_limit():
    long_body = "; ".join(f"a component {n} of the assembly" for n in range(60))
    claims = [claim(1, "independent", "A device", "comprising", long_body + ".")]
    value = assist.abstract_from_claims(claims).value
    assert len(value.split()) <= assist.ABSTRACT_WORD_LIMIT


def test_abstract_needs_an_independent_claim():
    assert assist.abstract_from_claims([claim(1, "dependent", "The device", "wherein", "x.", [1])]) is None


def test_summary_mirrors_the_claim_set():
    """Conventional structure: one "In one aspect" per independent claim, one
    "In some embodiments" per dependent."""
    claims = [
        claim(1, "independent", "A joint assembly", "comprising", "a motor."),
        claim(2, "dependent", "The joint assembly of claim 1", "wherein", "the motor is brushless", [1]),
    ]
    value = assist.summary_from_claims(claims).value
    assert value.count("In one aspect") == 1
    assert value.count("In some embodiments") == 1
    assert "brushless" in value


def test_summary_introduces_no_content_of_its_own():
    claims = [claim(1, "independent", "A widget", "comprising", "a flange.")]
    value = assist.summary_from_claims(claims).value
    for word in value.lower().split():
        stripped = word.strip(".,;")
        assert stripped in (
            "in one aspect, there is provided a widget comprising a flange."
        ).lower().replace(".", " ").replace(",", " ").split() or stripped in {
            "widget", "flange", "comprising", "a", "provided", "is", "there", "aspect,", "one", "in",
        }


def test_drawings_scaffold_finds_figure_references():
    suggestion = assist.drawings_scaffold("See FIG. 1 and Fig. 3; also FIGS. 2.")
    assert suggestion.value.count("FIG.") == 3


def test_drawings_scaffold_absent_when_there_are_no_figures():
    assert assist.drawings_scaffold("No figures are referenced here.") is None


def test_claim_skeleton_uses_the_disclosure_concepts():
    suggestion = assist.claim_skeleton("Adaptive stiffness control", ["winding sensor", "derating function"])
    assert "winding sensor" in suggestion.value
    assert "derating function" in suggestion.value
    # Marked as a skeleton: the rationale must say the wording needs work.
    assert "reword" in suggestion.rationale.lower()


def test_antecedent_fix_suggests_introducing_not_deleting():
    """Deleting the reference narrows the claim. Adding the element is almost
    always the right fix, and the rationale has to say why."""
    suggestion = assist.antecedent_fix(
        claim(2, "dependent", "The device", "wherein", "the gearbox turns", [1]), "the gearbox"
    )
    assert suggestion.value == "a gearbox"
    assert "narrows" in suggestion.rationale


def test_deployment_reports_that_no_model_is_configured():
    """The UI must be able to say why model-based drafting is absent, rather
    than showing a button that fails."""
    state = assist.available()
    assert state["templateGeneration"] is True
    assert state["modelGeneration"] is False
    assert "trade secret" in state["modelNote"]
