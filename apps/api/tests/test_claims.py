"""Claim set validation and antecedent basis.

These encode real patent-drafting rules. Getting them wrong produces confident
bad advice, which is worse for a drafter than no advice -- so each test names
the case it protects.
"""

from __future__ import annotations

from moat_api.services.claims import (
    ClaimInput,
    Severity,
    analyse,
    build_tree,
    check_antecedent_basis,
    coverage,
    validate_structure,
)


def codes(findings, severity=None):
    return {f.code for f in findings if severity is None or f.severity == severity}


def independent(number: int, body: str, category: str = "apparatus", transition: str = "comprising"):
    return ClaimInput(number, "independent", category, f"A device {number}", transition, body)


def dependent(number: int, body: str, parents: list[int]):
    return ClaimInput(
        number, "dependent", "apparatus", f"The device of claim {parents[0]}", "wherein",
        body, depends_on=parents,
    )


# --------------------------------------------------------------- structure --


def test_valid_set_has_no_structural_errors():
    claims = [
        independent(1, "a widget; and a housing surrounding the widget."),
        dependent(2, "the widget is rotatable.", [1]),
    ]
    assert codes(validate_structure(claims), Severity.ERROR) == set()


def test_claim_cannot_refer_to_a_later_claim():
    """37 CFR 1.75(c): a claim refers BACK. Forward references are rejected."""
    claims = [independent(1, "a widget."), dependent(2, "the widget is red.", [3]),
              dependent(3, "the widget is blue.", [1])]
    assert "forward_reference" in codes(validate_structure(claims))


def test_dependency_cycle_is_detected():
    """Without this, tree building and antecedent inheritance loop forever."""
    claims = [
        independent(1, "a widget."),
        ClaimInput(2, "dependent", "apparatus", "The device", "wherein", "x.", depends_on=[3]),
        ClaimInput(3, "dependent", "apparatus", "The device", "wherein", "y.", depends_on=[2]),
    ]
    assert "dependency_cycle" in codes(validate_structure(claims))


def test_independent_claim_may_not_have_a_parent():
    claims = [independent(1, "a widget."),
              ClaimInput(2, "independent", "apparatus", "A device", "comprising", "x.",
                         depends_on=[1])]
    assert "independent_with_parent" in codes(validate_structure(claims))


def test_multiple_dependent_may_not_depend_on_multiple_dependent():
    """37 CFR 1.75(c). A genuine rule that is easy to violate by accident."""
    claims = [
        independent(1, "a widget."),
        independent(2, "a gadget."),
        ClaimInput(3, "dependent", "apparatus", "The device", "wherein", "x.", depends_on=[1, 2]),
        ClaimInput(4, "dependent", "apparatus", "The device", "wherein", "y.", depends_on=[1, 3]),
    ]
    assert "multiple_on_multiple" in codes(validate_structure(claims))


def test_numbering_must_be_consecutive_from_one():
    claims = [independent(1, "a widget."), independent(5, "a gadget.")]
    assert "numbering" in codes(validate_structure(claims))


def test_a_set_needs_an_independent_claim():
    claims = [dependent(1, "the widget is red.", [1])]
    assert "no_independent" in codes(validate_structure(claims))


# -------------------------------------------------------- antecedent basis --


def test_element_introduced_then_referenced_is_fine():
    claims = [independent(1, "a widget; and a housing coupled to the widget.")]
    assert check_antecedent_basis(claims) == []


def test_element_never_introduced_is_flagged():
    claims = [independent(1, "a widget; and a housing coupled to the gearbox.")]
    findings = check_antecedent_basis(claims)
    assert len(findings) == 1
    assert findings[0].excerpt == "the gearbox"


def test_dependent_claim_inherits_its_parent_elements():
    """A dependent claim may refer to anything its parent introduced."""
    claims = [
        independent(1, "a widget; and a controller."),
        dependent(2, "the controller drives the widget.", [1]),
    ]
    assert check_antecedent_basis(claims) == []


def test_inheritance_does_not_leak_between_sibling_branches():
    """Claim 3 depends on claim 2, not claim 1, so claim 1's elements are
    unavailable to it. Getting this wrong would hide real §112(b) defects."""
    claims = [
        independent(1, "a widget."),
        independent(2, "a gadget."),
        dependent(3, "the widget is attached.", [2]),
    ]
    findings = check_antecedent_basis(claims)
    assert [f.excerpt for f in findings] == ["the widget"]


def test_adjectives_added_on_reference_are_accepted():
    """"a control shaft" then "the rotatable control shaft" is correct drafting."""
    claims = [independent(1, "a control shaft; and a motor turning the rotatable control shaft.")]
    assert check_antecedent_basis(claims) == []


def test_shortened_reference_to_a_longer_element_is_accepted():
    """"a winding temperature sensor" then "the sensor"."""
    claims = [independent(1, "a winding temperature sensor; and a bus reading the sensor.")]
    assert check_antecedent_basis(claims) == []


def test_plural_reference_to_singular_introduction_is_accepted():
    claims = [independent(1, "a plurality of blades; and a hub carrying the blades.")]
    assert check_antecedent_basis(claims) == []


def test_a_trailing_verb_does_not_break_matching():
    """The extractor may over-run into a verb; that must not produce a false
    positive on an element that was properly introduced."""
    claims = [
        independent(1, "a controller; and a motor."),
        dependent(2, "the controller re-derives a limit at a control rate.", [1]),
    ]
    assert check_antecedent_basis(claims) == []


def test_conventional_phrases_need_no_antecedent():
    claims = [independent(1, "a widget known in the art of the present invention.")]
    assert check_antecedent_basis(claims) == []


# ------------------------------------------------------------------- scope --


def test_closed_transition_on_an_independent_claim_is_warned():
    claims = [independent(1, "a widget.", transition="consisting of")]
    assert "closed_transition" in codes(analyse(claims))


def test_excess_claims_are_flagged_for_fees():
    claims = [independent(n, "a widget.") for n in range(1, 6)]
    found = codes(analyse(claims))
    assert "excess_independent" in found


def test_dependent_claim_that_adds_nothing_is_an_error():
    claims = [independent(1, "a widget."), dependent(2, "", [1])]
    assert "dependent_adds_nothing" in codes(analyse(claims), Severity.ERROR)


def test_method_only_sets_are_noted():
    """Method-only claims miss the party that makes or sells the product."""
    claims = [independent(1, "measuring a temperature.", category="method")]
    assert "single_category" in codes(analyse(claims))


# -------------------------------------------------------------------- tree --


def test_tree_nests_dependents_under_their_parents():
    claims = [independent(1, "a widget."), dependent(2, "x.", [1]), dependent(3, "y.", [2])]
    tree = build_tree(claims)
    assert [n["number"] for n in tree] == [1]
    assert tree[0]["children"][0]["number"] == 2
    assert tree[0]["children"][0]["children"][0]["number"] == 3


def test_multiple_dependent_claim_appears_under_every_parent():
    """Duplication is the honest rendering: the claim really does narrow each
    parent, and showing it once would hide a dependency."""
    claims = [
        independent(1, "a widget."),
        independent(2, "a gadget."),
        ClaimInput(3, "dependent", "apparatus", "The device", "wherein", "x.", depends_on=[1, 2]),
    ]
    tree = build_tree(claims)
    appearances = [n["number"] for root in tree for n in root["children"]]
    assert appearances.count(3) == 2


def test_coverage_reports_the_shape_of_the_set():
    claims = [
        independent(1, "a widget."),
        independent(2, "measuring.", category="method"),
        dependent(3, "x.", [1]),
        ClaimInput(4, "dependent", "apparatus", "The device", "wherein", "y.", depends_on=[1, 2]),
    ]
    shape = coverage(claims)
    assert shape["total"] == 4
    assert shape["independent"] == 2
    assert shape["multipleDependent"] == 1
    assert shape["maxDepth"] == 1


def test_participle_after_an_element_does_not_hide_it():
    """"a controller deriving a ceiling" introduces a controller. Running the
    extractor into the participle registered "controller deriving" instead,
    so a later "the controller" was wrongly flagged."""
    claims = [
        independent(1, "a motor; and a controller deriving a stiffness ceiling."),
        dependent(2, "the controller re-derives the stiffness ceiling.", [1]),
    ]
    assert check_antecedent_basis(claims) == []


def test_participle_element_names_still_work():
    """A winding, a housing, a bearing and a coating are all real element
    names that happen to be participles."""
    claims = [
        independent(1, "a winding; a housing; and a bearing supporting the winding."),
        dependent(2, "the housing encloses the bearing.", [1]),
    ]
    assert check_antecedent_basis(claims) == []
