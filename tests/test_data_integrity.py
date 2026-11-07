"""Checks the database against the official published figures and its own arithmetic."""
import json
from pathlib import Path

import pytest

from app.repository import one, rows

ROOT = Path(__file__).resolve().parents[1]
YEARS = list(range(2016, 2025))

# Published in Lok Sabha USQ 251 (21 Jul 2026), and USQ 2895 (11 Mar 2020) for 2016-2018.
# 2019 is the revised value printed in CII 2020 and CII 2021, and quoted in PIB 2244504.
PUBLISHED_NATIONAL = {
    2016: 12317, 2017: 21796, 2018: 27248, 2019: 44735, 2020: 50035,
    2021: 52974, 2022: 65893, 2023: 86420, 2024: 101928,
}
# Spot values read directly from Lok Sabha USQ 251 Annexure-I.
PUBLISHED_STATE = [
    ("KA", 2024, 21993), ("TG", 2024, 27230), ("UP", 2020, 11097), ("KL", 2023, 3295),
    ("SK", 2021, 0), ("LD", 2024, 0), ("LA", 2023, 1), ("DN", 2022, 5), ("AS", 2021, 4846),
]


def national(year):
    return one("SELECT reported_cases v FROM cybercrime_statistics WHERE state_id = 0 AND year = ?", (year,))["v"]


@pytest.mark.parametrize("year,expected", PUBLISHED_NATIONAL.items())
def test_national_totals_match_publications(year, expected):
    assert national(year) == expected


@pytest.mark.parametrize("year", YEARS)
def test_state_values_add_up_to_national_without_double_counting(year):
    total = one(
        "SELECT SUM(reported_cases) v FROM cybercrime_statistics WHERE state_id <> 0 AND year = ?", (year,)
    )["v"]
    assert total == national(year)


@pytest.mark.parametrize("code,year,expected", PUBLISHED_STATE)
def test_state_values_match_annexure(code, year, expected):
    row = one(
        """SELECT reported_cases v FROM cybercrime_statistics c JOIN states s USING (state_id)
           WHERE s.state_code = ? AND c.year = ?""", (code, year))
    assert row["v"] == expected


def test_zero_is_kept_distinct_from_missing():
    sikkim = one(
        """SELECT reported_cases v FROM cybercrime_statistics c JOIN states s USING (state_id)
           WHERE s.state_code = 'SK' AND c.year = 2020""")
    assert sikkim["v"] == 0
    ladakh_2018 = one(
        """SELECT reported_cases v FROM cybercrime_statistics c JOIN states s USING (state_id)
           WHERE s.state_code = 'LA' AND c.year = 2018""")
    assert ladakh_2018 is None or ladakh_2018["v"] is None


@pytest.mark.parametrize("year", range(2017, 2025))
def test_level_one_heads_sum_to_total(year):
    total = one(
        "SELECT reported_cases v FROM crime_head_statistics WHERE state_id = 0 AND year = ? AND head_id = 'total'",
        (year,))["v"]
    summed = one(
        """SELECT SUM(s.reported_cases) v FROM crime_head_statistics s JOIN crime_heads h USING (head_id)
           WHERE s.state_id = 0 AND s.year = ? AND h.level = 1""", (year,))["v"]
    assert summed == total


@pytest.mark.parametrize("year", range(2020, 2025))
def test_head_table_total_matches_state_table(year):
    total = one(
        "SELECT reported_cases v FROM crime_head_statistics WHERE state_id = 0 AND year = ? AND head_id = 'total'",
        (year,))["v"]
    assert total == national(year)


def test_new_2024_heads_have_no_invented_history():
    earlier = rows(
        "SELECT reported_cases v FROM crime_head_statistics WHERE head_id = 'fraud_upi' AND year < 2024")
    assert earlier == []
    assert one(
        "SELECT reported_cases v FROM crime_head_statistics WHERE head_id = 'fraud_upi' AND state_id = 0 AND year = 2024"
    )["v"] == 723


def test_computed_rates_match_ncrb_printed_rates():
    """Rates must reproduce NCRB's. Known exceptions: Lakshadweep (population rounded to
    0.7 lakh in print) and West Bengal 2019 (cases revised after the rate was printed)."""
    data = rows(
        """SELECT st.state_code, c.year, c.reported_cases, p.population, p.published_rate
           FROM cybercrime_statistics c JOIN states st USING (state_id)
           JOIN population_statistics p ON p.state_id = c.state_id AND p.year = c.year
           WHERE c.state_id <> 0 AND p.published_rate IS NOT NULL AND c.reported_cases IS NOT NULL""")
    assert len(data) > 300
    for row in data:
        if row["state_code"] == "LD" or (row["state_code"], row["year"]) == ("WB", 2019):
            continue
        computed = row["reported_cases"] / row["population"] * 100000
        assert computed == pytest.approx(row["published_rate"], abs=0.1), row


def test_reporting_systems_are_stored_separately():
    # Each system has its own table and no shared total exists anywhere.
    cert_2024 = one("SELECT incidents v FROM cert_in_incidents WHERE year = 2024")["v"]
    ncrp_2024 = one("SELECT complaints v FROM financial_statistics WHERE state_id = 0 AND year = 2024")["v"]
    assert cert_2024 == 2041360 and ncrp_2024 == 1918835 and national(2024) == 101928


def test_official_financial_values():
    amounts = {r["year"]: r["a"] for r in rows(
        "SELECT year, reported_financial_loss_crore a FROM financial_statistics WHERE state_id = 0")}
    assert amounts == {2021: 551, 2022: 2290, 2023: 7465, 2024: 22848, 2025: 22495}
    assert one("SELECT frauds v FROM bank_fraud_statistics WHERE area = 'Card/Internet' AND financial_year = '2023-24'")["v"] == 29082


def test_every_record_has_a_real_source():
    for table in ("cybercrime_statistics", "crime_head_statistics", "motive_statistics",
                  "population_statistics", "financial_statistics"):
        orphan = one(
            f"SELECT COUNT(*) n FROM {table} t LEFT JOIN data_sources d USING (source_id) WHERE d.source_id IS NULL")
        assert orphan["n"] == 0, table


def test_geojson_keys_match_state_table():
    geo = json.loads((ROOT / "data" / "geo" / "india_states.geojson").read_text(encoding="utf-8"))
    geo_codes = {f["properties"]["state_code"] for f in geo["features"]}
    db_codes = {r["state_code"] for r in rows("SELECT state_code FROM states WHERE state_code <> 'IN'")}
    assert geo_codes == db_codes and len(db_codes) == 36


def test_forecasts_are_separate_from_statistics():
    forecast_years = {r["year"] for r in rows("SELECT year FROM forecasts")}
    assert forecast_years and not forecast_years & set(YEARS)
    assert one("SELECT COUNT(*) n FROM cybercrime_statistics WHERE year > 2024")["n"] == 0
