"""Statistical calculations used by the API. Pure functions, no database access.

The rule throughout: a missing input gives a missing output (None), never zero.
"""
from __future__ import annotations

# J&K and Ladakh were one reporting unit until the 2020 edition.
NOT_COMPARABLE_GROWTH = {("JK", 2020), ("LA", 2020)}


def growth_pct(current: float | None, previous: float | None) -> float | None:
    """((current - previous) / previous) x 100. Undefined when previous is 0 or missing."""
    if current is None or previous is None or previous == 0:
        return None
    return (current - previous) / previous * 100


def rate_per_100k(cases: float | None, population: float | None) -> float | None:
    """(cases / population) x 100,000."""
    if cases is None or not population:
        return None
    return cases / population * 100_000


def share_pct(part: float | None, whole: float | None) -> float | None:
    """(part / whole) x 100, for figures from the same table only."""
    if part is None or not whole:
        return None
    return part / whole * 100


def cagr_pct(start: float | None, end: float | None, years: int) -> float | None:
    """Compound annual growth rate. Undefined for a zero or missing start."""
    if start is None or end is None or start <= 0 or years <= 0 or end < 0:
        return None
    return ((end / start) ** (1 / years) - 1) * 100


def average_reported(amount_crore: float | None, complaints: float | None) -> float | None:
    """Average rupees per complaint. Valid only when both come from the same NCRP table."""
    if amount_crore is None or not complaints:
        return None
    return amount_crore * 1e7 / complaints


def state_growth(code: str, year: int, current: float | None, previous: float | None) -> float | None:
    """Year-over-year growth, suppressed where the reporting unit changed."""
    if (code, year) in NOT_COMPARABLE_GROWTH:
        return None
    return growth_pct(current, previous)


def rank_desc(values: dict[str, float | None]) -> dict[str, int]:
    """Standard competition ranking, highest first. Missing values get no rank."""
    present = sorted(((v, k) for k, v in values.items() if v is not None), key=lambda p: -p[0])
    ranks: dict[str, int] = {}
    last_value, last_rank = None, 0
    for position, (value, key) in enumerate(present, 1):
        if value != last_value:
            last_value, last_rank = value, position
        ranks[key] = last_rank
    return ranks


def significant_changes(series: list[dict], threshold: float = 25.0) -> list[dict]:
    """Year-over-year moves of at least `threshold` percent, largest first."""
    moves = []
    for prev, cur in zip(series, series[1:]):
        change = growth_pct(cur["value"], prev["value"])
        if change is not None and abs(change) >= threshold:
            moves.append({"year": cur["year"], "from": prev["value"], "to": cur["value"], "pct": change})
    return sorted(moves, key=lambda m: -abs(m["pct"]))
