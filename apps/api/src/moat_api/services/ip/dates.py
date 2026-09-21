"""Calendar arithmetic for legal deadlines.

Deadlines are calendar dates, not durations: "ten years from registration" on
29 February lands on 28 February in a non-leap year, not on 1 March. Getting
that wrong by a day is how a registration lapses.
"""

from __future__ import annotations

import calendar
from datetime import date


def add_months(start: date, months: int) -> date:
    total = start.month - 1 + months
    year = start.year + total // 12
    month = total % 12 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def add_years(start: date, years: int) -> date:
    return add_months(start, years * 12)


def end_of_year(year: int) -> date:
    return date(year, 12, 31)
