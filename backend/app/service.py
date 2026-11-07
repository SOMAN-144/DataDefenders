"""Query logic behind the REST endpoints."""
from __future__ import annotations

from collections import defaultdict

from . import analytics as an
from .repository import one, rows

NCRP_CATEGORY = "Financial fraud complaints (NCRP)"
GROWTH_MIN_BASE = 20  # Below this, percentage growth is noise.
METRICS = {
    "cases": "Reported cases",
    "rate": "Cases per 100,000 population",
    "share": "Share of national cases (%)",
    "growth": "Year-over-year growth (%)",
    "financial": "Amount reported on NCRP (₹ crore)",
    "complaints": "Financial-fraud complaints on NCRP",
}


# --- helpers ----------------------------------------------------------------------

def ncrb_years() -> list[int]:
    return [r["year"] for r in rows("SELECT DISTINCT year FROM cybercrime_statistics ORDER BY year")]


def latest_year() -> int:
    return ncrb_years()[-1]


def state_rows() -> list[dict]:
    return rows("SELECT state_code, state_name, kind, region FROM states WHERE state_code <> 'IN' ORDER BY state_name")


def get_state(code: str) -> dict | None:
    return one("SELECT state_code, state_name, kind, region FROM states WHERE state_code = ? AND state_code <> 'IN'", (code.upper(),))


def heads_meta() -> list[dict]:
    return rows(
        """SELECT h.head_id, h.label, h.act, h.level, h.parent_id,
                  (SELECT MIN(year) FROM crime_head_statistics s WHERE s.head_id = h.head_id AND s.reported_cases IS NOT NULL) AS first_year
           FROM crime_heads h ORDER BY h.rowid"""
    )


def motives_meta() -> list[dict]:
    return rows(
        """SELECT m.motive_id, m.label,
                  (SELECT MIN(year) FROM motive_statistics s WHERE s.motive_id = m.motive_id AND s.reported_cases IS NOT NULL) AS first_year
           FROM motives m"""
    )


def population_by_state(year: int) -> dict[str, int | None]:
    return {
        r["state_code"]: r["population"]
        for r in rows(
            "SELECT st.state_code, p.population FROM population_statistics p JOIN states st USING (state_id) WHERE p.year = ?",
            (year,),
        )
    }


def category_values(category: str, year: int) -> tuple[dict[str, int | None], str]:
    """Cases by state code ('IN' = national) for one year and a table-specific category.

    category: 'total', 'head:<id>' or 'motive:<id>'. Returns values and the table used.
    """
    if category == "total":
        data = rows(
            """SELECT st.state_code, c.reported_cases AS v FROM cybercrime_statistics c
               JOIN states st USING (state_id) WHERE c.year = ?""", (year,))
        table = "9A.1"
    elif category.startswith("head:"):
        data = rows(
            """SELECT st.state_code, c.reported_cases AS v FROM crime_head_statistics c
               JOIN states st USING (state_id) WHERE c.year = ? AND c.head_id = ?""",
            (year, category[5:]))
        table = "9A.2"
    elif category.startswith("motive:"):
        data = rows(
            """SELECT st.state_code, c.reported_cases AS v FROM motive_statistics c
               JOIN states st USING (state_id) WHERE c.year = ? AND c.motive_id = ?""",
            (year, category[7:]))
        table = "9A.3"
    else:
        raise ValueError(f"Unknown category {category!r}")
    return {r["state_code"]: r["v"] for r in data}, table


def valid_category(category: str) -> bool:
    if category == "total":
        return True
    if category.startswith("head:"):
        return one("SELECT 1 AS x FROM crime_heads WHERE head_id = ?", (category[5:],)) is not None
    if category.startswith("motive:"):
        return one("SELECT 1 AS x FROM motives WHERE motive_id = ?", (category[7:],)) is not None
    return False


def category_label(category: str) -> str:
    if category == "total":
        return "All cyber crimes"
    if category.startswith("head:"):
        return one("SELECT label FROM crime_heads WHERE head_id = ?", (category[5:],))["label"]
    return "Motive: " + one("SELECT label FROM motives WHERE motive_id = ?", (category[7:],))["label"]


def notes_for(code: str, year: int | None = None) -> list[dict]:
    if year is None:
        return rows("SELECT year, note FROM data_notes WHERE state_code = ? ORDER BY year", (code,))
    return rows("SELECT year, note FROM data_notes WHERE state_code = ? AND (year = ? OR year IS NULL)", (code, year))


def source_ref(source_id: str) -> dict | None:
    return one(
        "SELECT source_id, organization, report_title, original_url, page_reference, verification FROM data_sources WHERE source_id = ?",
        (source_id,),
    )


# --- metadata and coverage --------------------------------------------------------

def meta() -> dict:
    years = ncrb_years()
    return {
        "project_period": {"start": 2016, "end": 2026},
        "ncrb_years": years,
        "latest_ncrb_year": years[-1],
        "states": state_rows(),
        "crime_heads": heads_meta(),
        "motives": motives_meta(),
        "metrics": [{"id": k, "label": v} for k, v in METRICS.items()],
        "coverage": coverage(),
    }


def coverage() -> list[dict]:
    """Which dataset covers which year. 2026 has no complete annual figure anywhere."""
    span = list(range(2016, 2027))
    ncrb = set(ncrb_years())
    heads = {r["year"] for r in rows("SELECT DISTINCT year FROM crime_head_statistics")}
    motives = {r["year"] for r in rows("SELECT DISTINCT year FROM motive_statistics")}
    cert = {r["year"]: r["verification"] for r in rows("SELECT year, verification FROM cert_in_incidents")}
    ncrp = {r["year"] for r in rows("SELECT DISTINCT year FROM financial_statistics WHERE state_id = 0")}
    ncrp_state = {r["year"] for r in rows("SELECT DISTINCT year FROM financial_statistics WHERE state_id <> 0")}

    def row(dataset: str, level: str, present: set[int], special: dict[int, str] | None = None) -> dict:
        special = special or {}
        return {
            "dataset": dataset, "level": level,
            "years": [{"year": y, "status": special.get(y, "available" if y in present else "unavailable")} for y in span],
        }

    return [
        row("NCRB cases registered", "State/UT and national", ncrb),
        row("NCRB crime heads", "State/UT and national", heads),
        row("NCRB motives", "State/UT and national", motives),
        row("NCRP financial-fraud complaints and amount", "National", ncrp),
        row("NCRP amount reported", "State/UT", ncrp_state),
        row("CERT-In incidents handled", "National", set(cert), {y: "secondary" for y, v in cert.items() if v == "secondary"}),
        row("RBI bank frauds (financial years, by start year)", "National", {2022, 2023, 2024}),
    ]


# --- overview ---------------------------------------------------------------------

def national_series() -> list[dict]:
    data = rows(
        """SELECT c.year, c.reported_cases AS cases, c.source_id, p.population
           FROM cybercrime_statistics c
           LEFT JOIN population_statistics p ON p.state_id = c.state_id AND p.year = c.year
           WHERE c.state_id = 0 ORDER BY c.year"""
    )
    for prev, cur in zip([None] + data, data):
        cur["yoy_pct"] = an.growth_pct(cur["cases"], prev["cases"]) if prev else None
        cur["rate"] = an.rate_per_100k(cur["cases"], cur["population"])
    return data


def state_year_table(year: int, category: str = "total") -> list[dict]:
    """Every state for one year with all comparable metrics."""
    current, table = category_values(category, year)
    years = ncrb_years()
    previous = {}
    if year - 1 in years:
        try:
            previous, _ = category_values(category, year - 1)
        except ValueError:
            previous = {}
    population = population_by_state(year)
    national = current.get("IN")
    fin = {
        r["state_code"]: r
        for r in rows(
            """SELECT st.state_code, f.complaints, f.reported_financial_loss_crore AS amount_crore
               FROM financial_statistics f JOIN states st USING (state_id)
               WHERE f.year = ? AND f.state_id <> 0""", (year,))
    }
    output = []
    for state in state_rows():
        code = state["state_code"]
        cases = current.get(code)
        output.append({
            **state,
            "cases": cases,
            "rate": an.rate_per_100k(cases, population.get(code)),
            "share": an.share_pct(cases, national),
            "growth": None if previous.get(code, 0) is None or previous.get(code, 0) < GROWTH_MIN_BASE
            else an.state_growth(code, year, cases, previous.get(code)),
            "population": population.get(code),
            "financial": fin.get(code, {}).get("amount_crore"),
            "complaints": fin.get(code, {}).get("complaints"),
            "table": table,
        })
    return output


def overview(year: int | None = None) -> dict:
    year = year or latest_year()
    series = national_series()
    current = next(s for s in series if s["year"] == year)
    table = state_year_table(year)
    with_cases = [s for s in table if s["cases"] is not None]
    with_rate = [s for s in table if s["rate"] is not None]
    top_state = max(with_cases, key=lambda s: s["cases"])
    top_rate = max(with_rate, key=lambda s: s["rate"])
    peak = max(series, key=lambda s: s["cases"])
    motive = rows(
        """SELECT m.motive_id, m.label, s.reported_cases AS cases FROM motive_statistics s
           JOIN motives m USING (motive_id)
           WHERE s.state_id = 0 AND s.year = ? AND s.motive_id <> 'total' AND s.reported_cases IS NOT NULL
           ORDER BY cases DESC""", (year,))
    head = rows(
        """SELECT h.head_id, h.label, s.reported_cases AS cases FROM crime_head_statistics s
           JOIN crime_heads h USING (head_id)
           WHERE s.state_id = 0 AND s.year = ? AND h.level = 1 AND s.reported_cases IS NOT NULL
           ORDER BY cases DESC""", (year,))
    fin = rows(
        """SELECT year, complaints, reported_financial_loss_crore AS amount_crore
           FROM financial_statistics WHERE state_id = 0 ORDER BY year""")
    return {
        "year": year,
        "cumulative_cases": sum(s["cases"] for s in series),
        "cumulative_years": [series[0]["year"], series[-1]["year"]],
        "year_cases": current["cases"],
        "year_yoy_pct": current["yoy_pct"],
        "year_rate": current["rate"],
        "peak_year": {"year": peak["year"], "cases": peak["cases"]},
        "top_state_by_cases": {k: top_state[k] for k in ("state_code", "state_name", "cases", "share")},
        "top_state_by_rate": {k: top_rate[k] for k in ("state_code", "state_name", "rate", "cases")},
        "top_motive": ({**motive[0], "share": an.share_pct(motive[0]["cases"], current["cases"])} if motive else None),
        "top_crime_head": head[0] if head else None,
        "financial": {
            "total_crore": sum(f["amount_crore"] for f in fin),
            "total_complaints": sum(f["complaints"] for f in fin),
            "years": [fin[0]["year"], fin[-1]["year"]],
            "note": "Sum of yearly amounts reported by complainants on NCRP. Not verified losses, and not linked to NCRB cases.",
        },
        "sources": {
            "cases": source_ref(current["source_id"]),
            "financial": source_ref("pib_2226441"),
        },
    }


def national_trend() -> dict:
    fin = rows(
        """SELECT year, complaints, reported_financial_loss_crore AS amount_crore
           FROM financial_statistics WHERE state_id = 0 ORDER BY year""")
    for prev, cur in zip([None] + fin, fin):
        cur["amount_yoy_pct"] = an.growth_pct(cur["amount_crore"], prev["amount_crore"]) if prev else None
    cert = rows("SELECT year, incidents, verification, source_id FROM cert_in_incidents ORDER BY year")
    for prev, cur in zip([None] + cert, cert):
        cur["yoy_pct"] = an.growth_pct(cur["incidents"], prev["incidents"]) if prev else None
    return {
        "ncrb": national_series(),
        "ncrp": fin,
        "cert_in": cert,
        "unavailable_note": "No complete official figure for 2026 had been published on the access date, and NCRB's latest edition covers 2024. These years are left blank rather than estimated.",
    }


# --- map and comparison -----------------------------------------------------------

def map_data(year: int, metric: str, category: str) -> dict:
    table = state_year_table(year, category)
    values = {s["state_code"]: s[metric] for s in table}
    ranks = an.rank_desc(values)
    notes = defaultdict(list)
    for note in rows("SELECT state_code, note FROM data_notes WHERE year = ? OR year IS NULL", (year,)):
        notes[note["state_code"]].append(note["note"])
    for state in table:
        code = state["state_code"]
        state.update(value=values[code], rank=ranks.get(code), notes=notes.get(code, []))
    available = [v for v in values.values() if v is not None]
    return {
        "year": year,
        "metric": metric,
        "metric_label": METRICS[metric],
        "category": category,
        "category_label": category_label(category) if metric not in ("financial", "complaints") else "NCRP financial-fraud complaints",
        "states": table,
        "available_count": len(available),
        "source": _map_source(year, metric, category),
    }


def _map_source(year: int, metric: str, category: str) -> dict | None:
    if metric in ("financial", "complaints"):
        return source_ref("pib_2003158")
    if category == "total":
        row = one("SELECT source_id FROM cybercrime_statistics WHERE state_id = 0 AND year = ?", (year,))
        return source_ref(row["source_id"]) if row else None
    return source_ref(f"ncrb_cii_{year}")


def region_table(year: int) -> list[dict]:
    totals: dict[str, dict] = {}
    for state in state_year_table(year):
        bucket = totals.setdefault(state["region"], {"region": state["region"], "cases": 0, "population": 0, "states": 0})
        if state["cases"] is not None:
            bucket["cases"] += state["cases"]
            bucket["states"] += 1
        if state["population"] is not None:
            bucket["population"] += state["population"]
    output = list(totals.values())
    for bucket in output:
        bucket["rate"] = an.rate_per_100k(bucket["cases"], bucket["population"])
    return sorted(output, key=lambda b: -b["cases"])


def compare(codes: list[str]) -> dict:
    series: dict[str, list[dict]] = {}
    for code in codes:
        data = rows(
            """SELECT c.year, c.reported_cases AS cases, p.population FROM cybercrime_statistics c
               JOIN states st USING (state_id)
               LEFT JOIN population_statistics p ON p.state_id = c.state_id AND p.year = c.year
               WHERE st.state_code = ? ORDER BY c.year""", (code,))
        for row in data:
            row["rate"] = an.rate_per_100k(row["cases"], row["population"])
        series[code] = data
    return {"series": series, "national": national_series()}


# --- categories -------------------------------------------------------------------

def category_distribution(year: int, level: int, state: str | None) -> dict:
    state_id = _state_id(state) if state else 0
    data = rows(
        """SELECT h.head_id, h.label, h.act, h.level, h.parent_id, s.reported_cases AS cases
           FROM crime_head_statistics s JOIN crime_heads h USING (head_id)
           WHERE s.state_id = ? AND s.year = ? AND h.level = ?
           ORDER BY cases DESC""", (state_id, year, level))
    total = one("SELECT reported_cases AS v FROM crime_head_statistics WHERE state_id = ? AND year = ? AND head_id = 'total'", (state_id, year))
    grand = total["v"] if total else None
    for row in data:
        row["share"] = an.share_pct(row["cases"], grand) if level == 1 else None
    return {
        "year": year, "level": level, "state": state, "total": grand, "heads": data,
        "source": source_ref(f"ncrb_cii_{year}") if data else None,
    }


def _state_id(code: str) -> int:
    row = one("SELECT state_id FROM states WHERE state_code = ?", (code.upper(),))
    return row["state_id"] if row else -1


def category_detail(head_id: str) -> dict | None:
    head = one("SELECT head_id, label, act, level, parent_id FROM crime_heads WHERE head_id = ?", (head_id,))
    if not head:
        return None
    series = rows(
        """SELECT s.year, s.reported_cases AS cases FROM crime_head_statistics s
           WHERE s.state_id = 0 AND s.head_id = ? ORDER BY s.year""", (head_id,))
    series = [p for p in series if p["cases"] is not None]
    for prev, cur in zip([None] + series, series):
        cur["yoy_pct"] = an.growth_pct(cur["cases"], prev["cases"]) if prev else None
    latest = series[-1]["year"] if series else None
    states = []
    if latest:
        states = rows(
            """SELECT st.state_code, st.state_name, s.reported_cases AS cases
               FROM crime_head_statistics s JOIN states st USING (state_id)
               WHERE s.head_id = ? AND s.year = ? AND s.state_id <> 0 AND s.reported_cases > 0
               ORDER BY cases DESC LIMIT 10""", (head_id, latest))
        national = series[-1]["cases"]
        for row in states:
            row["share"] = an.share_pct(row["cases"], national)
    return {
        **head, "series": series, "latest_year": latest, "top_states": states,
        "children": rows("SELECT head_id, label FROM crime_heads WHERE parent_id = ?", (head_id,)),
        "financial_impact": None,
        "financial_note": "No official source publishes financial loss by NCRB crime head.",
        "source": source_ref(f"ncrb_cii_{latest}") if latest else None,
    }


def motive_distribution(year: int, state: str | None) -> dict:
    state_id = _state_id(state) if state else 0
    data = rows(
        """SELECT m.motive_id, m.label, s.reported_cases AS cases FROM motive_statistics s
           JOIN motives m USING (motive_id)
           WHERE s.state_id = ? AND s.year = ? AND s.motive_id <> 'total' AND s.reported_cases IS NOT NULL
           ORDER BY cases DESC""", (state_id, year))
    denominator, _ = category_values("motive:total", year) if year != 2016 else ({}, "")
    total = denominator.get(state.upper() if state else "IN")
    for row in data:
        row["share"] = an.share_pct(row["cases"], total)
    return {
        "year": year, "state": state, "total": total, "motives": data,
        "source": source_ref(f"ncrb_cii_{year}") if data else None,
        "note": "The 2016 edition used different motive categories. 'Illegal Gain' is shown as Fraud, and only the eight labelled columns were extracted, so no shares are given." if year == 2016 else None,
    }


# --- states -----------------------------------------------------------------------

def state_profile(code: str) -> dict | None:
    state = get_state(code)
    if not state:
        return None
    code = state["state_code"]
    state_id = _state_id(code)
    series = rows(
        """SELECT c.year, c.reported_cases AS cases, c.source_id, p.population, p.published_rate, p.basis
           FROM cybercrime_statistics c
           LEFT JOIN population_statistics p ON p.state_id = c.state_id AND p.year = c.year
           WHERE c.state_id = ? ORDER BY c.year""", (state_id,))
    nat = {s["year"]: s for s in national_series()}
    for prev, cur in zip([None] + series, series):
        cur["rate"] = an.rate_per_100k(cur["cases"], cur["population"])
        cur["share"] = an.share_pct(cur["cases"], nat[cur["year"]]["cases"])
        previous = prev["cases"] if prev else None
        cur["yoy_pct"] = an.state_growth(code, cur["year"], cur["cases"], previous)
        cur["national_cases"] = nat[cur["year"]]["cases"]
        cur["national_rate"] = nat[cur["year"]]["rate"]
    year = latest_year()
    table = state_year_table(year)
    current = next(s for s in table if s["state_code"] == code)
    case_rank = an.rank_desc({s["state_code"]: s["cases"] for s in table})
    rate_rank = an.rank_desc({s["state_code"]: s["rate"] for s in table})

    peers = sorted(
        [s for s in table if s["region"] == state["region"]],
        key=lambda s: -(s["cases"] if s["cases"] is not None else -1),
    )
    categories = category_distribution(year, 1, code)
    motives = motive_distribution(year, code)
    fraud_children = category_distribution(year, 2, code)
    financial = one(
        """SELECT year, complaints, reported_financial_loss_crore AS amount_crore,
                  complaints_on_hold, lien_amount_crore AS lien_crore
           FROM financial_statistics WHERE state_id = ?""", (state_id,))
    if financial:
        financial["average_reported_inr"] = an.average_reported(financial["amount_crore"], financial["complaints"])
    fin_table = state_year_table(2023)
    fin_rank = an.rank_desc({s["state_code"]: s["financial"] for s in fin_table})

    return {
        **state,
        "latest_year": year,
        "overview": {
            "cases": current["cases"], "rate": current["rate"], "share": current["share"],
            "growth": _unfiltered_growth(series, year),
            "population": current["population"],
            "case_rank": case_rank.get(code), "rate_rank": rate_rank.get(code),
            "ranked_units": len(case_rank),
            "national_rate": nat[year]["rate"],
        },
        "series": series,
        "categories": categories,
        "sub_categories": fraud_children,
        "motives": motives,
        "financial": financial,
        "financial_rank": fin_rank.get(code),
        "financial_source": source_ref("pib_2003158"),
        "regional_peers": peers,
        "insights": state_insights(state, series, categories, state_id, motives),
        "notes": notes_for(code),
        "contact": one("SELECT email, phone FROM state_contacts WHERE state_id = ?", (state_id,)),
        "contact_source": source_ref("ncrp_contacts"),
        "sources": [source_ref(s) for s in sorted({row["source_id"] for row in series})],
    }


def _unfiltered_growth(series: list[dict], year: int) -> float | None:
    return next((s["yoy_pct"] for s in series if s["year"] == year), None)


def head_changes(state_id: int, start: int, end: int, min_base: int = GROWTH_MIN_BASE) -> list[dict]:
    """CAGR for level 1 and 2 heads between two years, excluding small bases."""
    data = rows(
        """SELECT h.head_id, h.label, h.level, a.reported_cases AS start_cases, b.reported_cases AS end_cases
           FROM crime_heads h
           JOIN crime_head_statistics a ON a.head_id = h.head_id AND a.year = ? AND a.state_id = ?
           JOIN crime_head_statistics b ON b.head_id = h.head_id AND b.year = ? AND b.state_id = ?
           WHERE h.level IN (1, 2) AND a.reported_cases >= ? AND b.reported_cases IS NOT NULL""",
        (start, state_id, end, state_id, min_base))
    for row in data:
        row["cagr_pct"] = an.cagr_pct(row["start_cases"], row["end_cases"], end - start)
    return sorted(data, key=lambda r: -(r["cagr_pct"] if r["cagr_pct"] is not None else -1e9))


def state_insights(state: dict, series: list[dict], categories: dict, state_id: int, motives: dict) -> dict:
    present = [s for s in series if s["cases"] is not None]
    peak = max(present, key=lambda s: s["cases"]) if present else None
    latest = present[-1] if present else None
    top_heads = [h for h in categories["heads"] if h["cases"]][:3]
    changes = head_changes(state_id, 2021, latest_year())
    increasing = [c for c in changes if c["cagr_pct"] is not None and c["cagr_pct"] > 0][:3]
    decreasing = [c for c in reversed(changes) if c["cagr_pct"] is not None and c["cagr_pct"] < 0][:3]
    observations = []
    if peak and latest:
        if peak["year"] == latest["year"]:
            observations.append(f"{latest['year']} is the highest count in the available data ({latest['cases']:,} cases).")
        else:
            drop = an.growth_pct(latest["cases"], peak["cases"])
            observations.append(
                f"Reported cases peaked in {peak['year']} at {peak['cases']:,}. The {latest['year']} figure is {abs(drop):.0f}% lower."
                if drop is not None else f"Reported cases peaked in {peak['year']} at {peak['cases']:,}.")
    if latest and latest.get("rate") is not None and latest.get("national_rate"):
        ratio = latest["rate"] / latest["national_rate"]
        relation = "above" if ratio >= 1 else "below"
        observations.append(
            f"The {latest['year']} rate of {latest['rate']:.1f} per 100,000 is {relation} the national {latest['national_rate']:.1f}.")
    if motives["motives"]:
        top = motives["motives"][0]
        if top["motive_id"] != "others" and top["share"] is not None:
            observations.append(f"{top['label']} is the leading recorded motive, at {top['share']:.0f}% of {motives['year']} cases.")
        elif len(motives["motives"]) > 1:
            observations.append(f"Most {motives['year']} cases are recorded under 'other motives', which limits what can be said about motive.")
    if latest and latest["cases"] is not None and latest["cases"] < 50:
        observations.append("Counts here are small, so percentage changes can swing widely from a few cases.")
    return {
        "peak": {"year": peak["year"], "cases": peak["cases"]} if peak else None,
        "top_heads": top_heads,
        "increasing": increasing,
        "decreasing": decreasing,
        "observations": observations,
    }


# --- financial --------------------------------------------------------------------

def financial() -> dict:
    national = rows(
        """SELECT year, complaints, reported_financial_loss_crore AS amount_crore, source_id
           FROM financial_statistics WHERE state_id = 0 ORDER BY year""")
    for prev, cur in zip([None] + national, national):
        cur["amount_yoy_pct"] = an.growth_pct(cur["amount_crore"], prev["amount_crore"]) if prev else None
        cur["complaints_yoy_pct"] = an.growth_pct(cur["complaints"], prev["complaints"]) if prev else None
        cur["average_reported_inr"] = an.average_reported(cur["amount_crore"], cur["complaints"])
    states = rows(
        """SELECT st.state_code, st.state_name, st.region, f.year, f.complaints,
                  f.reported_financial_loss_crore AS amount_crore, f.complaints_on_hold,
                  f.lien_amount_crore AS lien_crore, p.population
           FROM financial_statistics f JOIN states st USING (state_id)
           LEFT JOIN population_statistics p ON p.state_id = f.state_id AND p.year = f.year
           WHERE f.state_id <> 0 ORDER BY amount_crore DESC""")
    for row in states:
        row["average_reported_inr"] = an.average_reported(row["amount_crore"], row["complaints"])
        row["lien_pct"] = an.share_pct(row["lien_crore"], row["amount_crore"])
        row["complaints_per_100k"] = an.rate_per_100k(row["complaints"], row["population"])
    return {
        "national": national,
        "states": states,
        "bank_fraud": rows("SELECT area, financial_year, frauds, amount_crore FROM bank_fraud_statistics ORDER BY rowid"),
        "cumulative_note": {
            "reply_complaints": 6589201,
            "reply_amount_crore": 55050,
            "reply_lien_crore": 8189,
            "text": "A Lok Sabha reply of 21 July 2026 gives more than 65,89,201 complaints, more than ₹55,050 crore reported and more than ₹8,189 crore marked as lien for 2021-2025. Yearly figures from another reply sum slightly differently because the data is dynamic.",
            "source": source_ref("ls_usq251_2026"),
        },
        "sources": {
            "national": source_ref("pib_2226441"),
            "states": source_ref("pib_2003158"),
            "bank_fraud": source_ref("rbi_ar_2025"),
        },
        "unavailable": [
            "State-wise amount reported for years other than 2023: no complete official table could be verified.",
            "Financial loss by crime category: not published by NCRP, NCRB or CERT-In.",
            "Average loss per NCRB case: not calculated, because NCRP amounts and NCRB cases cover different incidents.",
        ],
    }


# --- trends and forecast ----------------------------------------------------------

def trends() -> dict:
    latest = latest_year()
    start = 2021
    head_growth = head_changes(0, start, latest, min_base=50)
    motive_rows = rows(
        """SELECT m.motive_id, m.label, a.reported_cases AS start_cases, b.reported_cases AS end_cases
           FROM motives m
           JOIN motive_statistics a ON a.motive_id = m.motive_id AND a.year = ? AND a.state_id = 0
           JOIN motive_statistics b ON b.motive_id = m.motive_id AND b.year = ? AND b.state_id = 0
           WHERE m.motive_id <> 'total' AND a.reported_cases >= 50""", (start, latest))
    for row in motive_rows:
        row["cagr_pct"] = an.cagr_pct(row["start_cases"], row["end_cases"], latest - start)
    motive_rows.sort(key=lambda r: -(r["cagr_pct"] if r["cagr_pct"] is not None else -1e9))

    state_growth = rows(
        """SELECT st.state_code, st.state_name, a.reported_cases AS start_cases, b.reported_cases AS end_cases
           FROM states st
           JOIN cybercrime_statistics a ON a.state_id = st.state_id AND a.year = ?
           JOIN cybercrime_statistics b ON b.state_id = st.state_id AND b.year = ?
           WHERE st.state_code <> 'IN' AND a.reported_cases >= 100""", (start, latest))
    for row in state_growth:
        row["cagr_pct"] = an.cagr_pct(row["start_cases"], row["end_cases"], latest - start)
    state_growth.sort(key=lambda r: -(r["cagr_pct"] if r["cagr_pct"] is not None else -1e9))

    motive_share = rows(
        """SELECT f.year, f.reported_cases AS fraud, t.reported_cases AS total FROM motive_statistics f
           JOIN motive_statistics t ON t.year = f.year AND t.state_id = 0 AND t.motive_id = 'total'
           WHERE f.state_id = 0 AND f.motive_id = 'fraud' ORDER BY f.year""")
    for row in motive_share:
        row["share"] = an.share_pct(row["fraud"], row["total"])

    series = [{"year": s["year"], "value": s["cases"]} for s in national_series()]
    fin_series = [{"year": f["year"], "value": f["reported_financial_loss_crore"]}
                  for f in rows("SELECT year, reported_financial_loss_crore FROM financial_statistics WHERE state_id = 0 ORDER BY year")]
    return {
        "window": [start, latest],
        "growing_heads": [h for h in head_growth if (h["cagr_pct"] or 0) > 0][:10],
        "declining_heads": [h for h in reversed(head_growth) if h["cagr_pct"] is not None and h["cagr_pct"] < 0][:10],
        "motives": motive_rows,
        "growing_states": [s for s in state_growth if (s["cagr_pct"] or 0) > 0][:10],
        "declining_states": [s for s in reversed(state_growth) if s["cagr_pct"] is not None and s["cagr_pct"] < 0][:10],
        "fraud_motive_share": motive_share,
        "significant_national_changes": an.significant_changes(series),
        "significant_financial_changes": an.significant_changes(fin_series),
        "source": source_ref(f"ncrb_cii_{latest}"),
    }


def forecast() -> dict:
    predictions = rows("SELECT * FROM forecasts ORDER BY year")
    models = rows("SELECT * FROM forecast_models ORDER BY mape")
    selected = next(m for m in models if m["selected"])
    return {
        "history": national_series(),
        "forecast": predictions,
        "models": models,
        "selected_model": selected,
        "backtest": rows("SELECT * FROM forecast_backtest ORDER BY year"),
        "label": "ESTIMATE, NOT A REPORTED STATISTIC",
        "limitations": [
            "Based on only nine annual observations (2016-2024).",
            "The model is a simple trend. It does not know about policy, reporting, or legal changes such as the move from IPC to BNS.",
            f"In backtests the 95% interval contained the actual value only {selected['interval_coverage_pct']:.0f}% of the time, so treat the range as narrower than it should be.",
            f"The model tended to under-predict in backtests (average error {selected['mean_error_pct']:.1f}%), because reporting has accelerated in recent years.",
            "Registered cases reflect reporting and police registration as well as underlying crime.",
        ],
        "not_forecast": [
            {"dataset": "NCRP amount reported", "reason": "Only five years, with a very sharp rise and then a slight fall in 2025. That is too short and unstable for a defensible model."},
            {"dataset": "CERT-In incidents", "reason": "Large jumps suggest changes in detection and reporting, so a trend would not represent a stable process. No published explanation allows adjusting for them."},
            {"dataset": "State-level cases", "reason": "Several states swing sharply year to year, and nine points per state cannot separate signal from reporting changes."},
        ],
    }


# --- sources ----------------------------------------------------------------------

def sources() -> list[dict]:
    return rows("SELECT * FROM data_sources ORDER BY rowid")


def contacts() -> dict:
    return {
        "note": "Complainants who registered a complaint on the portal may contact the State/UT Nodal or Grievance Officer if the response has not been appropriate. For new financial fraud, call 1930 first.",
        "source": source_ref("ncrp_contacts"),
        "contacts": rows(
            """SELECT st.state_code, st.state_name, c.email, c.phone FROM state_contacts c
               JOIN states st USING (state_id) ORDER BY st.state_name"""
        ),
    }


def revisions() -> list[dict]:
    return rows("SELECT scope, year, published_values FROM revisions ORDER BY year")
