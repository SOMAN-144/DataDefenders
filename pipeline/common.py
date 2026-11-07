"""Shared constants for the DataDefenders data pipeline.

States are standardised to the 36 States/UTs that exist today. Every source name
variant maps to one canonical state_code here; an unknown name fails the build
instead of silently dropping a row.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
CURATED = ROOT / "data" / "curated"
PROCESSED = ROOT / "data" / "processed"
GEO = ROOT / "data" / "geo"
NCRB_TABLES = RAW / "ncrb_tables"
CII_2017_VOL2 = RAW / "cii2017_vol2" / "CII2017_Volume2.pdf"
CII_2023 = RAW / "cii2023_vol2" / "cb95d6e0-f96a-41df-80c0-92ab2fbd74f5.pdf"
CII_2024 = RAW / "cii2024_vol2" / "2crimeinindia2024-volumeii.pdf"

# code, canonical name, kind, region (regions follow the Zonal Councils, with the
# North-East shown separately as the North Eastern Council area).
STATES: list[tuple[str, str, str, str]] = [
    ("AP", "Andhra Pradesh", "State", "South"),
    ("AR", "Arunachal Pradesh", "State", "North-East"),
    ("AS", "Assam", "State", "North-East"),
    ("BR", "Bihar", "State", "East"),
    ("CG", "Chhattisgarh", "State", "Central"),
    ("GA", "Goa", "State", "West"),
    ("GJ", "Gujarat", "State", "West"),
    ("HR", "Haryana", "State", "North"),
    ("HP", "Himachal Pradesh", "State", "North"),
    ("JH", "Jharkhand", "State", "East"),
    ("KA", "Karnataka", "State", "South"),
    ("KL", "Kerala", "State", "South"),
    ("MP", "Madhya Pradesh", "State", "Central"),
    ("MH", "Maharashtra", "State", "West"),
    ("MN", "Manipur", "State", "North-East"),
    ("ML", "Meghalaya", "State", "North-East"),
    ("MZ", "Mizoram", "State", "North-East"),
    ("NL", "Nagaland", "State", "North-East"),
    ("OD", "Odisha", "State", "East"),
    ("PB", "Punjab", "State", "North"),
    ("RJ", "Rajasthan", "State", "North"),
    ("SK", "Sikkim", "State", "North-East"),
    ("TN", "Tamil Nadu", "State", "South"),
    ("TG", "Telangana", "State", "South"),
    ("TR", "Tripura", "State", "North-East"),
    ("UP", "Uttar Pradesh", "State", "Central"),
    ("UK", "Uttarakhand", "State", "Central"),
    ("WB", "West Bengal", "State", "East"),
    ("AN", "Andaman & Nicobar Islands", "UT", "South"),
    ("CH", "Chandigarh", "UT", "North"),
    ("DN", "Dadra & Nagar Haveli and Daman & Diu", "UT", "West"),
    ("DL", "Delhi", "UT", "North"),
    ("JK", "Jammu & Kashmir", "UT", "North"),
    ("LA", "Ladakh", "UT", "North"),
    ("LD", "Lakshadweep", "UT", "South"),
    ("PY", "Puducherry", "UT", "South"),
]
CODE_BY_NAME = {name: code for code, name, _, _ in STATES}

_ALIASES = {
    "a&n islands": "AN",
    "a & n islands": "AN",
    "andaman & nicobar": "AN",
    "andaman and nicobar islands": "AN",
    "d&n haveli and daman & diu": "DN",
    "d & n haveli and daman & diu": "DN",
    "d&n haveli and daman and diu": "DN",
    "dadra & nagar haveli and daman & diu": "DN",
    "dadra and nagar haveli and daman and diu": "DN",
    "d&n haveli": "_DNH",
    "d & n haveli": "_DNH",
    "dadra & nagar haveli": "_DNH",
    "daman & diu": "_DD",
    "delhi ut": "DL",
    "delhi": "DL",
    "nct of delhi": "DL",
    "jammu & kashmir": "JK",
    "jammu and kashmir": "JK",
    "orissa": "OD",
    "uttaranchal": "UK",
    "pondicherry": "PY",
    "chhatisgarh": "CG",
}


def state_code(raw_name: str) -> str | None:
    """Return the canonical code for a source state name, or None if not a state."""
    cleaned = re.sub(r"[*+@#'\"‘’]", "", str(raw_name))
    cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()
    cleaned = re.sub(r"\(.*?\)", "", cleaned).strip()
    if cleaned in _ALIASES:
        return _ALIASES[cleaned]
    for name, code in CODE_BY_NAME.items():
        if name.lower() == cleaned:
            return code
    return None


def clean_number(value: object) -> float | None:
    """Parse a table cell. '-' and blanks are missing, never zero."""
    if value is None:
        return None
    if isinstance(value, float) and value != value:  # NaN
        return None
    text = str(value).strip().replace(",", "")
    if text in {"", "-", "--", "NA", "N.A.", "nan", "@", "*", "+"}:
        return None
    text = re.sub(r"[*+@#]", "", text)
    try:
        return float(text)
    except ValueError:
        return None
