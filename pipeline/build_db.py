"""Load processed datasets into database/cybercrime.db. Rebuilt from scratch every run."""
from __future__ import annotations

import sqlite3

import pandas as pd

from common import CURATED, PROCESSED, ROOT, STATES
from metadata import DATA_NOTES, HEADS, MOTIVES

DB_PATH = ROOT / "database" / "cybercrime.db"
SCHEMA = ROOT / "database" / "schema.sql"
OUTPUTS = ROOT / "analysis" / "outputs"


def as_int(value: object) -> int | None:
    return None if pd.isna(value) else int(value)


def as_float(value: object) -> float | None:
    return None if pd.isna(value) else float(value)


def main() -> None:
    DB_PATH.unlink(missing_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.executescript(SCHEMA.read_text(encoding="utf-8"))
    con.execute("PRAGMA foreign_keys = ON")

    sources = pd.read_csv(CURATED / "sources.csv", dtype=str, keep_default_na=False)
    con.executemany(
        "INSERT INTO data_sources VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        sources.values.tolist(),
    )

    con.execute("INSERT INTO states VALUES (0, 'IN', 'India', 'Country', NULL)")
    for i, (code, name, kind, region) in enumerate(STATES, 1):
        con.execute("INSERT INTO states VALUES (?,?,?,?,?)", (i, code, name, kind, region))
    state_ids = dict(con.execute("SELECT state_code, state_id FROM states").fetchall())

    con.executemany("INSERT INTO crime_heads VALUES (?,?,?,?,?)", HEADS)
    con.executemany("INSERT INTO motives VALUES (?,?)", MOTIVES)

    def cii(year: object) -> str:
        return f"ncrb_cii_{int(year)}"

    # Table 9A.1 latest values. The national row is stored as state 'IN'.
    cases = pd.read_csv(PROCESSED / "ncrb_state_cases.csv")
    con.executemany(
        "INSERT INTO cybercrime_statistics (state_id, year, reported_cases, source_id) VALUES (?,?,?,?)",
        [(state_ids[r.state_code], int(r.year), as_int(r.cases), cii(r.pub_year)) for r in cases.itertuples()],
    )
    national = pd.read_csv(PROCESSED / "ncrb_national_cases.csv")
    con.executemany(
        "INSERT INTO cybercrime_statistics (state_id, year, reported_cases, source_id) VALUES (0,?,?,?)",
        [(int(r.year), as_int(r.cases), cii(r.pub_year)) for r in national.itertuples()],
    )

    heads = pd.read_csv(PROCESSED / "ncrb_crime_heads.csv")
    con.executemany(
        "INSERT INTO crime_head_statistics (state_id, year, head_id, reported_cases, source_id) VALUES (?,?,?,?,?)",
        [(state_ids[r.state_code], int(r.year), r.head_id, as_int(r.cases), cii(r.year)) for r in heads.itertuples()],
    )

    motives = pd.read_csv(PROCESSED / "ncrb_motives.csv")
    con.executemany(
        "INSERT INTO motive_statistics (state_id, year, motive_id, reported_cases, source_id) VALUES (?,?,?,?,?)",
        [(state_ids[r.state_code], int(r.year), r.motive_id, as_int(r.cases), cii(r.year)) for r in motives.itertuples()],
    )

    pop = pd.read_csv(PROCESSED / "ncrb_population.csv")
    con.executemany(
        "INSERT INTO population_statistics (state_id, year, population, published_rate, basis, denominator_kind, source_id) "
        "VALUES (?,?,?,?,?,?,?)",
        [
            (state_ids[r.state_code], int(r.year),
             None if pd.isna(r.population_lakh) else int(round(r.population_lakh * 100000)),
             as_float(r.published_rate), r.basis, r.kind, cii(r.year))
            for r in pop.itertuples()
        ],
    )

    ncrp = pd.read_csv(PROCESSED / "ncrp_national.csv")
    con.executemany(
        "INSERT INTO financial_statistics (state_id, year, crime_category, complaints, reported_financial_loss_crore, source_id) "
        "VALUES (0,?,'Financial fraud complaints (NCRP)',?,?,?)",
        [(int(r.year), int(r.complaints), float(r.amount_crore), r.source_id) for r in ncrp.itertuples()],
    )
    ncrp_state = pd.read_csv(PROCESSED / "ncrp_state_2023.csv")
    con.executemany(
        "INSERT INTO financial_statistics (state_id, year, crime_category, complaints, reported_financial_loss_crore, "
        "complaints_on_hold, lien_amount_crore, source_id) VALUES (?,?,'Financial fraud complaints (NCRP)',?,?,?,?,?)",
        [
            (state_ids[r.state_code], int(r.year), int(r.complaints), float(r.amount_crore),
             int(r.complaints_on_hold), float(r.lien_crore), r.source_id)
            for r in ncrp_state.itertuples()
        ],
    )

    cert = pd.read_csv(PROCESSED / "cert_in_incidents.csv")
    con.executemany("INSERT INTO cert_in_incidents VALUES (?,?,?,?)",
                    [(int(r.year), int(r.incidents), r.source_id, r.verification) for r in cert.itertuples()])

    rbi = pd.read_csv(PROCESSED / "rbi_fraud.csv")
    con.executemany(
        "INSERT INTO bank_fraud_statistics (area, financial_year, frauds, amount_crore, source_id) VALUES (?,?,?,?,?)",
        [(r.area, r.financial_year, as_int(r.frauds), as_float(r.amount_crore), r.source_id) for r in rbi.itertuples()],
    )

    forecast = pd.read_csv(OUTPUTS / "forecast_ncrb.csv")
    con.executemany("INSERT INTO forecasts VALUES (?,?,?,?,?)",
                    [(int(r.year), r.predicted, r.lower_95, r.upper_95, r.model) for r in forecast.itertuples()])
    scores = pd.read_csv(OUTPUTS / "forecast_model_scores.csv")
    con.executemany("INSERT INTO forecast_models VALUES (?,?,?,?,?,?)",
                    [(r.model, r.mape, r.mean_error_pct, r.interval_coverage_pct, int(r.n_forecasts),
                      int(bool(r.selected))) for r in scores.itertuples()])
    backtest = pd.read_csv(OUTPUTS / "forecast_backtest.csv")
    con.executemany("INSERT INTO forecast_backtest VALUES (?,?,?,?)",
                    [(int(r.year), int(r.cases), r.predicted, r.error_pct) for r in backtest.itertuples()])

    contacts = pd.read_csv(PROCESSED / "state_contacts.csv", dtype=str, keep_default_na=False)
    con.executemany("INSERT INTO state_contacts VALUES (?,?,?,?)",
                    [(state_ids[r.state_code], r.email, r.phone or None, r.source_id) for r in contacts.itertuples()])

    revisions = pd.read_csv(PROCESSED / "ncrb_revisions.csv")
    con.executemany("INSERT INTO revisions VALUES (?,?,?)",
                    [(r.scope, int(r.year), r.values) for r in revisions.itertuples()])
    con.executemany("INSERT INTO data_notes VALUES (?,?,?)", DATA_NOTES)

    con.commit()
    for table in ("cybercrime_statistics", "crime_head_statistics", "motive_statistics",
                  "population_statistics", "financial_statistics"):
        print(table, con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
    con.close()


if __name__ == "__main__":
    main()
