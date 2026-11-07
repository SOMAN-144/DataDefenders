"""Parse official press releases and reports (kept in data/raw) into separate datasets.

These datasets are never merged with NCRB case counts or with each other:
  ncrp_national.csv    NCRP/CFCFRMS financial-fraud complaints and amount reported, by year
  ncrp_state_2023.csv  CFCFRMS complaints/amount/lien by state for calendar 2023
  cert_in_incidents.csv CERT-In incidents handled, by year
  rbi_fraud.csv        Bank-reported frauds by area of operation, by financial year
"""
from __future__ import annotations

import csv
import json
import re
from html.parser import HTMLParser
from pathlib import Path

from common import PROCESSED, RAW, clean_number, state_code


class TableRows(HTMLParser):
    """Collect all <table> rows of a page as lists of cell text."""

    def __init__(self) -> None:
        super().__init__()
        self.rows: list[list[str]] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = []

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self._cell is not None:
            self._row.append(re.sub(r"\s+", " ", "".join(self._cell)).strip())
            self._cell = None
        elif tag == "tr" and self._row is not None:
            self.rows.append(self._row)
            self._row = None

    def handle_data(self, data):
        if self._cell is not None:
            self._cell.append(data)


def page_rows(path: Path) -> list[list[str]]:
    parser = TableRows()
    parser.feed(path.read_text(encoding="utf-8", errors="replace"))
    return parser.rows


def write_csv(name: str, header: list[str], rows: list[list[object]]) -> None:
    PROCESSED.mkdir(parents=True, exist_ok=True)
    with open(PROCESSED / name, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)
    print(f"{name}: {len(rows)} rows")


def ncrp_national() -> None:
    rows, seen = [], set()
    for row in page_rows(RAW / "pib_2226441" / "pib_2226441.html"):
        cells = [c for c in row if c]
        if len(cells) == 3 and re.fullmatch(r"20\d\d", cells[0]) and cells[0] not in seen:
            seen.add(cells[0])
            rows.append([int(cells[0]), int(clean_number(cells[1])), clean_number(cells[2]), "pib_2226441"])
    if [r[0] for r in rows] != [2021, 2022, 2023, 2024, 2025]:
        raise ValueError(f"Unexpected NCRP years: {rows}")
    write_csv("ncrp_national.csv", ["year", "complaints", "amount_crore", "source_id"], rows)


def ncrp_state_2023() -> None:
    rows, seen = [], set()
    for row in page_rows(RAW / "pib_2003158" / "pib_2003158.html"):
        cells = [c for c in row if c]
        if len(cells) == 6 and re.fullmatch(r"\d+", cells[0]):
            code = state_code(cells[1])
            if code is None or code.startswith("_"):
                raise ValueError(f"Unknown state {cells[1]!r} in PIB 2003158")
            if code in seen:
                continue
            seen.add(code)
            complaints, amount, held, lien = (clean_number(c) for c in cells[2:6])
            rows.append([code, 2023, int(complaints), round(amount / 100, 4), int(held),
                         round(lien / 100, 4), "pib_2003158"])
    if len(rows) != 36:
        raise ValueError(f"Expected 36 units in PIB 2003158, found {len(rows)}")
    write_csv("ncrp_state_2023.csv",
              ["state_code", "year", "complaints", "amount_crore", "complaints_on_hold",
               "lien_crore", "source_id"], rows)


# Older CERT-In values are only available to us through press reports quoting the
# parliamentary replies, because the Parliament archives were unreachable from this
# network. They are flagged 'secondary' and shown with that label on the site.
CERT_IN_SECONDARY = [
    (2016, 50362, "dh_certin_2019", "secondary"),
    (2017, 53117, "dh_certin_2019", "secondary"),
    (2018, 208456, "dh_certin_2019", "secondary"),
    (2019, 394499, "dh_certin_2020", "secondary"),
    (2020, 1158208, "tribune_certin_2025", "secondary"),
]


def cert_in() -> None:
    rows = [[y, n, s, t] for y, n, s, t in CERT_IN_SECONDARY]
    seen = set()
    for row in page_rows(RAW / "pib_2244504" / "pib_2244504.html"):
        cells = [c for c in row if c]
        if len(cells) == 2 and re.fullmatch(r"20\d\d", cells[0]) and cells[0] not in seen:
            seen.add(cells[0])
            rows.append([int(cells[0]), int(clean_number(cells[1])), "pib_2244504", "primary"])
    if [r[0] for r in rows] != list(range(2016, 2026)):
        raise ValueError(f"Unexpected CERT-In years: {[r[0] for r in rows]}")
    write_csv("cert_in_incidents.csv", ["year", "incidents", "source_id", "verification"], rows)


def rbi() -> None:
    rows: list[list[object]] = []
    all_rows = page_rows(RAW / "rbi_ar_1436" / "rbi_ar_1436.html")
    start = next(i for i, r in enumerate(all_rows) if any("Table VI.3" in c for c in r))
    years = ["2022-23", "2023-24", "2024-25"]
    for row in all_rows[start + 1:start + 40]:
        cells = [c for c in row if c]
        if len(cells) != 7 or not re.search(r"[A-Za-z]", cells[0]) or cells[0].startswith("Area"):
            continue
        for i, year in enumerate(years):
            rows.append([cells[0], year, clean_number(cells[1 + 2 * i]), clean_number(cells[2 + 2 * i]), "rbi_ar_2025"])
        if cells[0].lower() == "total":
            break
    if not any(r[0] == "Card/Internet" for r in rows) or rows[-1][0].lower() != "total":
        raise ValueError("RBI Table VI.3 was not parsed as expected")
    write_csv("rbi_fraud.csv", ["area", "financial_year", "frauds", "amount_crore", "source_id"], rows)


# Where the nodal entry is an officer's own named address, the role-based grievance
# address from the same row is shown instead, as officers transfer between posts.
USE_GRIEVANCE_EMAIL = {"UK"}


def decode_email(text: str) -> str:
    return text.replace("[at]", "@").replace("[dot]", ".").replace("[hyphen]", "-").strip()


def state_contacts() -> None:
    data = json.loads((RAW / "ncrp_contacts" / "contactus_2026-11-07.json").read_text(encoding="utf-8"))
    rows = []
    for _, state, _rank, nodal, grievance, landline in data["rows"]:
        code = state_code(state.title().replace(" And ", " and "))
        if code is None or code.startswith("_"):
            raise ValueError(f"Unknown state {state!r} in the contact list")
        email = grievance if code in USE_GRIEVANCE_EMAIL else nodal
        rows.append([code, decode_email(email), landline.strip() or None, "ncrp_contacts"])
    if len(rows) != 36:
        raise ValueError(f"Expected 36 contact rows, found {len(rows)}")
    write_csv("state_contacts.csv", ["state_code", "email", "phone", "source_id"], rows)


if __name__ == "__main__":
    state_contacts()
    ncrp_national()
    ncrp_state_2023()
    cert_in()
    rbi()
