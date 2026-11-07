"""The R analysis and the Python API calculate independently, so they must agree."""
import csv
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

OUTPUTS = Path(__file__).resolve().parents[1] / "analysis" / "outputs"
client = TestClient(app)


def read(name):
    with open(OUTPUTS / name, encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def test_national_growth_matches_r():
    api = {p["year"]: p for p in client.get("/api/national/trend").json()["ncrb"]}
    rows = read("national_yoy.csv")
    assert len(rows) == 9
    for row in rows:
        point = api[int(row["year"])]
        assert point["cases"] == int(float(row["cases"]))
        if row["yoy_pct"] not in ("", "NA"):
            assert point["yoy_pct"] == pytest.approx(float(row["yoy_pct"]), abs=1e-6)


def test_state_metrics_match_r():
    rows = [r for r in read("state_metrics.csv") if r["year"] == "2024"]
    assert len(rows) == 36
    api = {s["state_code"]: s for s in client.get("/api/comparison/map?year=2024").json()["states"]}
    for row in rows:
        state = api[row["state_code"]]
        assert state["cases"] == int(float(row["cases"]))
        assert state["rate"] == pytest.approx(float(row["rate_per_100k"]), abs=1e-6)
        assert state["share"] == pytest.approx(float(row["share_pct"]), abs=1e-6)


def test_ncrp_average_matches_r():
    api = {n["year"]: n for n in client.get("/api/financial").json()["national"]}
    for row in read("ncrp_summary.csv"):
        assert api[int(row["year"])]["average_reported_inr"] == pytest.approx(float(row["avg_reported_per_complaint_inr"]), abs=0.01)


def test_regions_match_r():
    rows = {r["region"]: r for r in read("regional.csv") if r["year"] == "2024"}
    for region in client.get("/api/comparison/regions?year=2024").json():
        assert region["cases"] == int(float(rows[region["region"]]["cases"]))


def test_forecast_matches_r():
    api = client.get("/api/forecast").json()["forecast"]
    rows = read("forecast_ncrb.csv")
    assert [f["year"] for f in api] == [int(r["year"]) for r in rows]
    for point, row in zip(api, rows):
        assert point["predicted"] == pytest.approx(float(row["predicted"]))
