"""Nice Classification (WIPO), 45 classes.

Short headings only -- enough to show a person which class they are looking
at. The authoritative class headings and explanatory notes are WIPO's, and the
edition in force changes every year; the edition recorded here is stated so a
classification can be traced to the list it was chosen from.
"""

from __future__ import annotations

NICE_EDITION = "NCL 12-2026 (headings abridged)"

CLASSES: dict[int, str] = {
    1: "Chemicals for industry, science and agriculture",
    2: "Paints, varnishes, colorants",
    3: "Cosmetics, cleaning preparations, perfumery",
    4: "Industrial oils, lubricants, fuels",
    5: "Pharmaceuticals, medical and veterinary preparations",
    6: "Common metals and metal hardware",
    7: "Machines, machine tools, motors and engines",
    8: "Hand tools and implements",
    9: "Scientific and electronic apparatus, computers, software",
    10: "Medical and surgical apparatus",
    11: "Lighting, heating, cooling and sanitary apparatus",
    12: "Vehicles and apparatus for locomotion",
    13: "Firearms, ammunition, explosives, fireworks",
    14: "Precious metals, jewellery, clocks and watches",
    15: "Musical instruments",
    16: "Paper, printed matter, stationery",
    17: "Rubber, plastics in extruded form, insulating materials",
    18: "Leather goods, luggage, umbrellas",
    19: "Non-metallic building materials",
    20: "Furniture, mirrors, frames",
    21: "Household utensils, glassware, porcelain",
    22: "Ropes, nets, tents, sacks, raw textile fibres",
    23: "Yarns and threads",
    24: "Textiles and household linen",
    25: "Clothing, footwear, headwear",
    26: "Lace, ribbons, buttons, artificial flowers",
    27: "Carpets, rugs, mats, wall hangings",
    28: "Games, toys, sporting articles",
    29: "Meat, fish, dairy, preserved foods",
    30: "Coffee, tea, bakery goods, confectionery",
    31: "Agricultural and horticultural products, live animals",
    32: "Beers, non-alcoholic beverages",
    33: "Alcoholic beverages (except beers)",
    34: "Tobacco and smokers' articles",
    35: "Advertising, business management, retail services",
    36: "Financial, insurance and real estate services",
    37: "Construction, repair and installation services",
    38: "Telecommunications",
    39: "Transport, packaging, storage, travel arrangement",
    40: "Treatment of materials, custom manufacturing",
    41: "Education, training, entertainment",
    42: "Scientific and technological services, software development",
    43: "Food and drink services, temporary accommodation",
    44: "Medical, beauty and agricultural services",
    45: "Legal and security services, personal services",
}

# Classes that commonly cover related goods and services, so that marks in
# DIFFERENT classes can still be confused. The textbook case is software (9)
# and software services (42): a consumer does not care which class a product
# was filed in. This is a screening aid for widening a search, not a rule
# any examiner applies mechanically.
RELATED: frozenset[frozenset[int]] = frozenset(
    frozenset(pair)
    for pair in (
        (9, 42),   # software goods / software services
        (9, 38),   # devices / telecommunications
        (9, 28),   # electronics / games
        (38, 42),  # telecom / technology services
        (35, 9),   # retail / goods sold
        (35, 25),  # retail / clothing
        (25, 18),  # clothing / leather goods
        (25, 14),  # clothing / jewellery and watches
        (3, 44),   # cosmetics / beauty services
        (5, 10),   # pharmaceuticals / medical apparatus
        (5, 44),   # pharmaceuticals / medical services
        (10, 44),  # medical apparatus / medical services
        (29, 30),  # foods
        (30, 43),  # coffee and bakery / cafes
        (32, 33),  # beverages
        (32, 43),  # beverages / bars
        (33, 43),  # alcohol / bars
        (41, 9),   # education / educational software
        (41, 16),  # education / printed matter
        (36, 42),  # fintech
        (7, 12),   # engines / vehicles
        (7, 37),   # machines / installation and repair
        (12, 37),  # vehicles / vehicle repair
        (11, 37),  # heating apparatus / installation
    )
)


def heading(number: int) -> str:
    return CLASSES.get(number, "Unknown class")


def is_goods(number: int) -> bool:
    return 1 <= number <= 34


def validate(classes: list[int]) -> list[int]:
    """Return sorted, de-duplicated classes, refusing anything outside 1-45."""
    unique = sorted(set(classes))
    invalid = [number for number in unique if number not in CLASSES]
    if invalid:
        raise ValueError(
            f"Nice classes run from 1 to 45. Not valid: {', '.join(map(str, invalid))}."
        )
    return unique


def overlap(first: list[int], second: list[int]) -> tuple[list[int], list[tuple[int, int]]]:
    """Identical classes, and pairs of related classes, between two filings."""
    a, b = set(first), set(second)
    identical = sorted(a & b)
    related = sorted(
        (x, y)
        for x in a
        for y in b
        if x != y and frozenset((x, y)) in RELATED and x not in b and y not in a
    )
    return identical, related
