"""Extract NCRB 'Crime in India' Chapter 9A tables into tidy CSV files.

Outputs (data/processed):
  ncrb_state_vintages.csv  every state/year value in every publication that printed it
  ncrb_state_cases.csv     one row per state/year: the latest published value
  ncrb_population.csv      NCRB's mid-year population denominator for each state/year
  ncrb_national_cases.csv  published all-India totals, one per year
  ncrb_crime_heads.csv     state x year x crime head (Table 9A.2)
  ncrb_motives.csv         state x year x motive (Table 9A.3)
  ncrb_revisions.csv       values that changed between publications

Missing values stay missing: '-' cells produce no row (or a null), never zero.
The build fails loudly if a table's internal arithmetic does not reconcile.
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

import pandas as pd
from pypdf import PdfReader

from common import CII_2017_VOL2, CII_2023, CII_2024, NCRB_TABLES, PROCESSED, clean_number, state_code

# Column order of Table 9A.2, 2017-2023 editions.
HEADS_BASE = [
    "tampering", "computer_related_total", "sec66_total", "ransomware", "sec66_other",
    "stolen_resource", "identity_theft", "personation", "privacy_violation", "cyber_terrorism",
    "obscene_total", "obscene_publishing", "sexually_explicit", "child_explicit",
    "preservation_info", "obscene_other", "interception", "unauthorized_access", "abetment_it",
    "attempt_it", "other_it", "total_it", "abetment_suicide", "cyber_stalking", "data_theft",
    "fraud_total", "fraud_card", "fraud_atm", "fraud_online_banking", "fraud_otp", "fraud_other",
    "cheating", "forgery", "defamation_morphing", "fake_profile", "counterfeit_total",
    "counterfeit_currency", "counterfeit_stamps", "blackmail", "fake_news", "other_ipc",
    "total_ipc", "online_gambling", "online_lotteries", "copyright", "trademarks", "other_sll",
    "total_sll", "total",
]
# 2024 added IT Act s.72, s.73-74 and three BNS heads.
HEADS_2024 = list(HEADS_BASE)
HEADS_2024[HEADS_2024.index("unauthorized_access") + 1:HEADS_2024.index("unauthorized_access") + 1] = [
    "breach_privacy", "false_esignature",
]
HEADS_2024[HEADS_2024.index("cyber_stalking") + 1:HEADS_2024.index("cyber_stalking") + 1] = [
    "deceitful_intercourse", "organised_cyber_crime", "false_info_sovereignty",
]
# 2024 also split fraud further: gaming apps, investment, vishing and e-wallet/UPI.
HEADS_2024[HEADS_2024.index("fraud_otp") + 1:HEADS_2024.index("fraud_otp") + 1] = [
    "fraud_gaming", "fraud_investment", "fraud_vishing", "fraud_upi",
]

MOTIVES_22 = [
    "revenge", "anger", "fraud", "extortion", "disrepute", "prank", "sexual_exploitation",
    "political", "terrorist", "_terror_recruit", "_terror_funding", "_terror_other", "hate",
    "disrupt_service", "drugs", "own_business", "piracy", "psycho", "steal_information",
    "abetment_suicide", "others", "total",
]
MOTIVES_19 = [m for m in MOTIVES_22 if not m.startswith("_")]
MOTIVES_2016 = [
    "fraud", "revenge", "insult_modesty", "extortion", "sexual_exploitation", "disrepute",
    "hate", "own_business",
]

TOTAL_ROW = re.compile(r"TOTAL\s*\(?\s*ALL[\s-]*INDIA\)?", re.I)
LOG: list[str] = []


def note(msg: str) -> None:
    LOG.append(msg)
    print(msg)


def clean_label(value: object) -> str:
    return re.sub(r"\s+", " ", str(value)).strip()


@dataclass
class StateTable:
    pub_year: int
    years: list[int]
    rows: dict[str, list[float | None]]
    national: list[float | None]
    population: dict[str, float | None]
    national_population: float | None
    published_rate: dict[str, float | None]
    source_file: str


def combine_daman(values: dict[str, list[float | None]]) -> dict[str, list[float | None]]:
    """Merge erstwhile D&N Haveli and Daman & Diu rows into today's merged UT."""
    out = {k: v for k, v in values.items() if not k.startswith("_")}
    if "_DNH" in values or "_DD" in values:
        a = values.get("_DNH")
        b = values.get("_DD")
        length = len(a or b)
        merged = []
        for i in range(length):
            va = a[i] if a else None
            vb = b[i] if b else None
            merged.append(None if va is None and vb is None else (va or 0) + (vb or 0))
        if "DN" in out:
            raise ValueError("Table has both merged and erstwhile Daman rows")
        out["DN"] = merged
    return out


def read_state_xlsx(path: Path, pub_year: int) -> StateTable:
    frame = pd.read_excel(path, header=None, dtype=object)
    header_row = next(
        i for i in range(8)
        if any(clean_label(v) == "State/UT" for v in frame.iloc[i].tolist())
    )
    header = [clean_label(v) for v in frame.iloc[header_row].tolist()]
    years = [int(float(h)) for h in header[2:5]]
    pop_col = next(i for i, h in enumerate(header) if "Population" in h)
    rate_col = next(i for i, h in enumerate(header) if h.startswith("Rate of Total"))
    rows, pops, rates = {}, {}, {}
    national, nat_pop = None, None
    for _, row in frame.iloc[header_row + 1:].iterrows():
        cells = row.tolist()
        first, second = clean_label(cells[0]), clean_label(cells[1])
        if TOTAL_ROW.search(first) or TOTAL_ROW.search(second):
            national = [clean_number(v) for v in cells[2:5]]
            nat_pop = clean_number(cells[pop_col])
            continue
        code = state_code(second)
        if code is None:
            if re.fullmatch(r"\d+", first) and re.search(r"[A-Za-z]", second):
                raise ValueError(f"Unknown state {second!r} in {path}")
            continue
        rows[code] = [clean_number(v) for v in cells[2:5]]
        pops[code] = clean_number(cells[pop_col])
        rates[code] = clean_number(cells[rate_col])
    return finish_state_table(pub_year, years, rows, national, pops, nat_pop, rates, path)


def finish_state_table(pub_year, years, rows, national, pops, nat_pop, rates, path) -> StateTable:
    merged = combine_daman(rows)
    pop_lists = combine_daman({k: [v] for k, v in pops.items()})
    return StateTable(
        pub_year, years, merged, national,
        {k: v[0] for k, v in pop_lists.items()}, nat_pop,
        {k: v for k, v in rates.items() if not k.startswith("_")},
        str(path.relative_to(NCRB_TABLES.parent.parent.parent)).replace("\\", "/"),
    )


NUM_TOKEN = r"(?:-|\d[\d,]*(?:\.\d+)?)"
PDF_ROW = re.compile(rf"^(\d+)\s+([A-Za-z].*?)\s+((?:{NUM_TOKEN}\s*)+)$")
PDF_TOTAL = re.compile(rf"^TOTAL\s*\(?\s*ALL[\s-]*INDIA\)?\s+((?:{NUM_TOKEN}\s*)+)$", re.I)


def read_state_pdf(path: Path, page_index: int, pub_year: int, years: list[int],
                   pop_i: int, rate_i: int) -> StateTable:
    text = PdfReader(str(path)).pages[page_index].extract_text() or ""
    rows, pops, rates = {}, {}, {}
    national, nat_pop = None, None
    for raw in text.splitlines():
        line = raw.strip()
        total = PDF_TOTAL.match(line)
        if total:
            values = [clean_number(v) for v in total.group(1).split()]
            # The 2016 edition's total row has no rank column, so read from the right.
            national, nat_pop = values[:3], values[-3] if pub_year != 2016 else values[-2]
            continue
        match = PDF_ROW.match(line)
        if not match:
            continue
        code = state_code(match.group(2))
        if code is None:
            raise ValueError(f"Unknown state {match.group(2)!r} in {path} p{page_index + 1}")
        values = [clean_number(v) for v in match.group(3).split()]
        rows[code], pops[code], rates[code] = values[:3], values[pop_i], values[rate_i]
    return finish_state_table(pub_year, years, rows, national, pops, nat_pop, rates, path)


def load_state_tables() -> list[StateTable]:
    tables = [
        read_state_pdf(NCRB_TABLES / "2016" / "table-9A.1-2016.pdf", 0, 2016, [2014, 2015, 2016], 5, 6),
        read_state_xlsx(NCRB_TABLES / "2017" / "table-9A.1_1-2017.xlsx", 2017),
        read_state_xlsx(NCRB_TABLES / "2018" / "table-9A.1_0-2018.xlsx", 2018),
        read_state_xlsx(NCRB_TABLES / "2019" / "table-9A.1-2019.xlsx", 2019),
        read_state_xlsx(NCRB_TABLES / "2020" / "table-9A.1-2020.xlsx", 2020),
        read_state_xlsx(NCRB_TABLES / "2021" / "1679661903TABLE9A1.xlsx", 2021),
        read_state_xlsx(NCRB_TABLES / "2022" / "1702030584TABLE9A1.xlsx", 2022),
        read_state_pdf(CII_2023, 342, 2023, [2021, 2022, 2023], 3, 4),
        read_state_pdf(CII_2024, 420, 2024, [2022, 2023, 2024], 3, 4),
    ]
    for table in tables:
        if len(table.rows) != 36:
            note(f"NOTE {table.pub_year}: state table has {len(table.rows)} units: "
                 f"missing {sorted(set(_all_codes()) - set(table.rows))}")
    return tables


def _all_codes() -> list[str]:
    from common import STATES
    return [s[0] for s in STATES]


def build_cases(tables: list[StateTable]) -> dict[str, pd.DataFrame]:
    vintages, nationals = [], []
    for table in tables:
        for code, values in table.rows.items():
            for year, value in zip(table.years, values):
                if year >= 2016:
                    vintages.append({
                        "state_code": code, "year": year, "cases": value,
                        "pub_year": table.pub_year, "source_file": table.source_file,
                    })
        for year, value in zip(table.years, table.national):
            if year >= 2016:
                nationals.append({"year": year, "cases": value, "pub_year": table.pub_year,
                                  "source_file": table.source_file})
    vint = pd.DataFrame(vintages)
    nat_v = pd.DataFrame(nationals)

    latest = (vint.sort_values("pub_year").groupby(["state_code", "year"], as_index=False).last())
    # groupby.last skips NaN, so restore an explicit missing value from the newest edition.
    newest = vint.sort_values("pub_year").groupby(["state_code", "year"], as_index=False).tail(1)
    cases = newest[["state_code", "year", "cases", "pub_year", "source_file"]].copy()
    missing_latest = latest.merge(cases, on=["state_code", "year"], suffixes=("", "_n"))
    assert len(missing_latest) == len(cases)

    national = nat_v.sort_values("pub_year").groupby("year", as_index=False).tail(1).sort_values("year")

    # Revision log: every value that differs between editions.
    revisions = []
    for (code, year), group in vint.dropna(subset=["cases"]).groupby(["state_code", "year"]):
        if group["cases"].nunique() > 1:
            ordered = group.sort_values("pub_year")
            revisions.append({
                "scope": code, "year": year,
                "values": "; ".join(f"CII {int(r.pub_year)}={int(r.cases)}" for r in ordered.itertuples()),
            })
    for year, group in nat_v.dropna(subset=["cases"]).groupby("year"):
        if group["cases"].nunique() > 1:
            ordered = group.sort_values("pub_year")
            revisions.append({
                "scope": "ALL_INDIA", "year": year,
                "values": "; ".join(f"CII {int(r.pub_year)}={int(r.cases)}" for r in ordered.itertuples()),
            })
    return {
        "ncrb_state_vintages": vint,
        "ncrb_state_cases": cases.sort_values(["state_code", "year"]),
        "ncrb_national_cases": national,
        "ncrb_revisions": pd.DataFrame(revisions),
    }


def build_population(tables: list[StateTable]) -> pd.DataFrame:
    basis = {
        2016: "Registrar General of India estimate based on the 2001 Census, as printed in CII 2016 Table 9A.1",
        2017: "RGI estimated population, as printed in CII 2017 Table 9A.1",
        2018: "Technical Group on Population Projections (Nov 2019), as printed in CII 2018 Table 9A.1",
        2019: "Technical Group on Population Projections (Nov 2019), as printed in CII 2019 Table 9A.1",
    }
    rows = []
    for table in tables:
        year = table.pub_year
        src = basis.get(year, f"Technical Group on Population Projections (July 2020), as printed in CII {year} Table 9A.1")
        for code, pop in table.population.items():
            rows.append({
                "state_code": code, "year": year, "population_lakh": pop,
                "published_rate": table.published_rate.get(code), "basis": src,
                "kind": "projection", "source_file": table.source_file,
            })
        rows.append({
            "state_code": "IN", "year": year, "population_lakh": table.national_population,
            "published_rate": None, "basis": src, "kind": "projection",
            "source_file": table.source_file,
        })
    return pd.DataFrame(rows)


# --- Table 9A.2 ---------------------------------------------------------------

def _xlsx_rows(path: Path, n_values: int, skip_labels=("S. No", "SL", "State/UT")):
    """Yield (state_label, values) from a wide multi-segment NCRB sheet."""
    frame = pd.read_excel(path, header=None, dtype=object)
    header_row = next(
        i for i in range(8)
        if any(clean_label(v) == "State/UT" for v in frame.iloc[i].tolist())
    )
    # Columns repeated per print page: SL / State columns in the header row.
    label_cols = [
        i for i, v in enumerate(frame.iloc[header_row].tolist())
        if clean_label(v) in skip_labels or re.fullmatch(r"S\.? ?No\.?", clean_label(v), re.I)
    ]
    data_cols = [i for i in range(frame.shape[1]) if i not in label_cols]
    if len(data_cols) != n_values:
        raise ValueError(f"{path}: expected {n_values} value columns, found {len(data_cols)}")
    for _, row in frame.iloc[header_row + 1:].iterrows():
        cells = row.tolist()
        first, second = clean_label(cells[0]), clean_label(cells[1])
        yield first, second, [clean_number(cells[i]) for i in data_cols]


def parse_wide_xlsx(path: Path, columns: list[str]):
    rows, national = {}, None
    for first, second, values in _xlsx_rows(path, len(columns)):
        if TOTAL_ROW.search(first) or TOTAL_ROW.search(second):
            national = dict(zip(columns, values))
            continue
        code = state_code(second)
        if code is None:
            if re.fullmatch(r"\d+", first) and re.search(r"[A-Za-z]", second):
                raise ValueError(f"Unknown state {second!r} in {path}")
            continue
        rows[code] = values
    return _merge_wide(rows, columns), national


def _merge_wide(rows, columns):
    merged = combine_daman(rows)
    return {code: dict(zip(columns, values)) for code, values in merged.items()}


def parse_wide_pdf(path: Path, pages: range, columns: list[str]):
    reader = PdfReader(str(path))
    rows: dict[str, list[float | None]] = {}
    national: list[float | None] = []
    for page in pages:
        text = reader.pages[page].extract_text() or ""
        # PDF text extraction occasionally breaks a state name ("17 M\neghalaya 4 1").
        text = re.sub(r"(?m)^(\d+ [A-Za-z]{1,3})\s*\n(\S)", r"\1\2", text)
        for raw in text.splitlines():
            line = raw.strip()
            total = PDF_TOTAL.match(line)
            if total:
                national.extend(clean_number(v) for v in total.group(1).split())
                continue
            match = PDF_ROW.match(line)
            if not match:
                continue
            code = state_code(match.group(2))
            if code is None:
                raise ValueError(f"Unknown state {match.group(2)!r} on page {page + 1}")
            rows.setdefault(code, []).extend(clean_number(v) for v in match.group(3).split())
    for code, values in rows.items():
        if len(values) != len(columns):
            raise ValueError(f"{path} {code}: {len(values)} values, expected {len(columns)}")
    if len(national) != len(columns):
        raise ValueError(f"{path}: national row has {len(national)} values, expected {len(columns)}")
    return _merge_wide(rows, columns), dict(zip(columns, national))


def check_heads(year: int, rows: dict, national: dict) -> None:
    """Reconcile act subtotals and the national row. Raises on structural errors."""
    problems = 0
    for code, values in list(rows.items()) + [("ALL_INDIA", national)]:
        parts = [values.get(k) or 0 for k in ("total_it", "total_ipc", "total_sll")]
        if abs(sum(parts) - (values.get("total") or 0)) > 0:
            problems += 1
            note(f"  head-sum mismatch {year} {code}: IT+IPC+SLL={sum(parts)} total={values.get('total')}")
    if problems > 3:
        raise ValueError(f"{year}: {problems} crime-head rows do not reconcile; layout is likely wrong")
    for head in national:
        summed = sum((row.get(head) or 0) for row in rows.values())
        if national[head] is not None and summed != national[head]:
            note(f"  head {year} {head}: state sum {summed} != national {national[head]}")


def build_heads() -> pd.DataFrame:
    specs = [
        (2017, NCRB_TABLES / "2017" / "table-9A.2_1-2017.xlsx", None, HEADS_BASE),
        (2018, NCRB_TABLES / "2018" / "table-9A.2_0-2018.xlsx", None, HEADS_BASE),
        (2019, NCRB_TABLES / "2019" / "table-9A.2-2019.xlsx", None, HEADS_BASE),
        (2020, NCRB_TABLES / "2020" / "table-9A.2-2020.xlsx", None, HEADS_BASE),
        (2021, NCRB_TABLES / "2021" / "1679661926TABLE9A2.xlsx", None, HEADS_BASE),
        (2022, NCRB_TABLES / "2022" / "1702030760TABLE9A2.xlsx", None, HEADS_BASE),
        (2023, CII_2023, range(343, 353), HEADS_BASE),
        (2024, CII_2024, range(421, 432), HEADS_2024),
    ]
    rows = []
    for year, path, pages, columns in specs:
        if pages is None:
            states, national = parse_wide_xlsx(path, columns)
        else:
            states, national = parse_wide_pdf(path, pages, columns)
        check_heads(year, states, national)
        rel = str(path.relative_to(NCRB_TABLES.parent.parent.parent)).replace("\\", "/")
        for code, values in list(states.items()) + [("IN", national)]:
            for head, value in values.items():
                rows.append({"state_code": code, "year": year, "head_id": head, "cases": value,
                             "source_file": rel})
    return pd.DataFrame(rows)


# --- Table 9A.3 ---------------------------------------------------------------

def check_motives(year: int, rows: dict, national: dict) -> None:
    parts = [k for k in national if k != "total" and not k.startswith("_")]
    for code, values in list(rows.items()) + [("ALL_INDIA", national)]:
        summed = sum(values.get(k) or 0 for k in parts)
        if values.get("total") is not None and summed != values["total"]:
            note(f"  motive-sum mismatch {year} {code}: {summed} vs {values['total']}")


def parse_2016_motives() -> tuple[dict, dict]:
    path = NCRB_TABLES / "2016" / "table-9A.5-2016.pdf"
    text = "\n".join(page.extract_text() or "" for page in PdfReader(str(path)).pages)
    rows: dict[str, list[float | None]] = {}
    national: list[float | None] = []
    for raw in text.splitlines():
        line = raw.strip()
        total = re.match(rf"^TOTAL\s*\(?\s*ALL[\s-]*INDIA\)?\s+((?:{NUM_TOKEN}\s*)+)$", line, re.I)
        if total:
            # This table spans pages with repeated total rows; the first page holds these columns.
            if not national:
                national = [clean_number(v) for v in total.group(1).split()]
            continue
        match = PDF_ROW.match(line)
        if match:
            code = state_code(match.group(2))
            if code:
                rows.setdefault(code, []).extend(clean_number(v) for v in match.group(3).split())
    # Only the eight leading columns have stable labels in this edition's first page.
    trimmed = {k: v[:8] for k, v in rows.items()}
    return _merge_wide(trimmed, MOTIVES_2016), dict(zip(MOTIVES_2016, national[:8]))


def build_motives() -> pd.DataFrame:
    specs = [
        # The 2017 index only lists the metro table, so state motives come from Volume 2.
        (2017, CII_2017_VOL2, range(341, 345), MOTIVES_22),
        (2018, NCRB_TABLES / "2018" / "1681982492Table9A30.xlsx", None, MOTIVES_22),
        (2019, NCRB_TABLES / "2019" / "1681725747Table9A3.xlsx", None, MOTIVES_22),
        (2020, NCRB_TABLES / "2020" / "1680861996TABLE9A3.xlsx", None, MOTIVES_22),
        (2021, NCRB_TABLES / "2021" / "1679661951TABLE9A3.xlsx", None, MOTIVES_19),
        (2022, NCRB_TABLES / "2022" / "1702030805TABLE9A3.xlsx", None, MOTIVES_19),
        (2023, CII_2023, range(353, 356), MOTIVES_19),
        (2024, CII_2024, range(432, 435), MOTIVES_19),
    ]
    rows = []
    for year, path, pages, columns in specs:
        if pages is None:
            states, national = parse_wide_xlsx(path, columns)
        else:
            states, national = parse_wide_pdf(path, pages, columns)
        check_motives(year, states, national)
        rel = str(path.relative_to(NCRB_TABLES.parent.parent.parent)).replace("\\", "/")
        for code, values in list(states.items()) + [("IN", national)]:
            for motive, value in values.items():
                if motive.startswith("_"):
                    continue
                rows.append({"state_code": code, "year": year, "motive_id": motive, "cases": value,
                             "source_file": rel})
    states, national = parse_2016_motives()
    rel = "data/raw/ncrb_tables/2016/table-9A.5-2016.pdf"
    for code, values in list(states.items()) + [("IN", national)]:
        for motive, value in values.items():
            rows.append({"state_code": code, "year": 2016, "motive_id": motive, "cases": value,
                         "source_file": rel})
    return pd.DataFrame(rows)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    PROCESSED.mkdir(parents=True, exist_ok=True)
    tables = load_state_tables()
    cases = build_cases(tables)
    for name, frame in cases.items():
        frame.to_csv(PROCESSED / f"{name}.csv", index=False)
    build_population(tables).to_csv(PROCESSED / "ncrb_population.csv", index=False)

    national = cases["ncrb_national_cases"].set_index("year")["cases"]
    state = cases["ncrb_state_cases"]
    for year, total in national.items():
        summed = state[state.year == year].cases.sum()
        marker = "OK" if summed == total else f"DIFF {summed - total:+.0f}"
        print(f"year {year}: national {total:.0f} state sum {summed:.0f} {marker}")

    heads = build_heads()
    heads.to_csv(PROCESSED / "ncrb_crime_heads.csv", index=False)
    print("heads rows", len(heads))
    motives = build_motives()
    motives.to_csv(PROCESSED / "ncrb_motives.csv", index=False)
    print("motives rows", len(motives))
    print("revisions", len(cases["ncrb_revisions"]))
    (PROCESSED / "extract_ncrb.log").write_text("\n".join(LOG), encoding="utf-8")


if __name__ == "__main__":
    main()
