"""End-to-end API tests through FastAPI's test client."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def get(path, status=200):
    response = client.get(path)
    assert response.status_code == status, response.text
    return response.json()


def test_health_and_meta():
    assert get("/api/health")["latest_ncrb_year"] == 2024
    meta = get("/api/meta")
    assert len(meta["states"]) == 36
    assert meta["ncrb_years"] == list(range(2016, 2025))
    assert all(y["status"] == "unavailable" for row in meta["coverage"] for y in row["years"] if y["year"] == 2026)


def test_overview_cards():
    data = get("/api/national/overview")
    assert data["year_cases"] == 101928
    assert data["cumulative_cases"] == 463346
    assert data["top_state_by_cases"]["state_code"] == "TG"
    assert data["top_state_by_rate"]["state_code"] == "TG"
    assert data["top_motive"]["motive_id"] == "fraud"
    assert data["peak_year"]["year"] == 2024
    assert data["financial"]["total_crore"] == 55649


def test_year_filter_changes_overview():
    data = get("/api/national/overview?year=2019")
    assert data["year_cases"] == 44735
    assert data["top_state_by_cases"]["state_code"] == "KA"


def test_unknown_year_rejected_not_faked():
    get("/api/national/overview?year=2026", status=404)
    get("/api/comparison/map?year=2030", status=404)


@pytest.mark.parametrize("code", [
    "AP", "AR", "AS", "BR", "CG", "GA", "GJ", "HR", "HP", "JH", "KA", "KL", "MP", "MH", "MN", "ML", "MZ", "NL",
    "OD", "PB", "RJ", "SK", "TN", "TG", "TR", "UP", "UK", "WB", "AN", "CH", "DN", "DL", "JK", "LA", "LD", "PY",
])
def test_every_state_profile_works(code):
    profile = get(f"/api/states/{code}")
    assert profile["state_code"] == code
    assert len(profile["series"]) >= 5
    assert profile["insights"]["observations"]
    assert profile["financial"]["amount_crore"] is not None
    assert profile["sources"]


def test_lowercase_state_code_and_unknown_state():
    assert get("/api/states/kl")["state_name"] == "Kerala"
    get("/api/states/ZZ", status=404)


def test_map_all_metrics_return_every_state():
    for metric in ("cases", "rate", "share", "growth"):
        data = get(f"/api/comparison/map?year=2024&metric={metric}")
        assert len(data["states"]) == 36
        assert data["source"]


def test_map_missing_data_is_null_not_zero():
    data = get("/api/comparison/map?year=2018")
    ladakh = next(s for s in data["states"] if s["state_code"] == "LA")
    assert ladakh["cases"] is None and ladakh["value"] is None and ladakh["rank"] is None
    assert ladakh["notes"]


def test_map_filters_change_results():
    total = get("/api/comparison/map?year=2024")["states"]
    fraud = get("/api/comparison/map?year=2024&category=head:fraud_total")["states"]
    motive = get("/api/comparison/map?year=2024&category=motive:fraud")["states"]
    assert [s["cases"] for s in total] != [s["cases"] for s in fraud]
    assert [s["cases"] for s in fraud] != [s["cases"] for s in motive]


def test_map_category_without_data_for_year_is_unavailable():
    data = get("/api/comparison/map?year=2020&category=head:fraud_upi")
    assert data["available_count"] == 0


def test_financial_metric_only_for_2023():
    assert get("/api/comparison/map?year=2023&metric=financial")["available_count"] == 36
    assert get("/api/comparison/map?year=2024&metric=financial")["available_count"] == 0


def test_invalid_filters_rejected():
    get("/api/comparison/map?year=2024&metric=bogus", status=422)
    get("/api/comparison/map?year=2024&category=head:bogus", status=422)


def test_categories_and_detail():
    data = get("/api/categories?year=2024&level=1")
    assert sum(h["cases"] for h in data["heads"] if h["cases"]) == 101928
    detail = get("/api/categories/ransomware")
    assert detail["series"] and detail["top_states"]
    assert detail["financial_impact"] is None
    get("/api/categories/bogus", status=404)


def test_motives():
    data = get("/api/motives?year=2024")
    assert data["motives"][0]["motive_id"] == "fraud"
    assert data["motives"][0]["cases"] == 73987


def test_financial_payload_no_mismatched_average():
    data = get("/api/financial")
    assert len(data["national"]) == 5
    assert len(data["states"]) == 36
    assert data["unavailable"]
    assert data["national"][-1]["average_reported_inr"] == pytest.approx(93628, abs=5)


def test_trends_and_forecast_labelled():
    assert get("/api/trends")["growing_heads"]
    data = get("/api/forecast")
    assert "ESTIMATE" in data["label"]
    assert len(data["forecast"]) == 3
    assert all(f["year"] > 2024 for f in data["forecast"])
    assert all(f["lower_95"] < f["predicted"] < f["upper_95"] for f in data["forecast"])
    assert data["limitations"] and data["not_forecast"]


def test_regions_cover_all_cases():
    assert sum(r["cases"] for r in get("/api/comparison/regions?year=2024")) == 101928


def test_compare():
    data = get("/api/comparison/states?codes=KL,KA")
    assert set(data["series"]) == {"KL", "KA"}
    get("/api/comparison/states?codes=ZZ", status=404)


def test_geo_and_sources():
    assert len(get("/api/geo/states")["features"]) == 36
    sources = get("/api/sources")
    assert all(s["original_url"].startswith("https://") for s in sources)
    assert all(s["access_date"] and s["verification"] for s in sources)
    assert get("/api/sources/revisions")


def test_contacts_for_all_units_are_decoded():
    data = get("/api/contacts")
    assert len(data["contacts"]) == 36
    assert all("@" in c["email"] and "[" not in c["email"] for c in data["contacts"])
    assert data["source"]["original_url"] == "https://cybercrime.gov.in/contactus"
    # A number that is not published stays empty instead of being filled in.
    assert next(c for c in data["contacts"] if c["state_code"] == "MP")["phone"] is None
    assert get("/api/states/KL")["contact"]["phone"] == "0471-2300042"


def test_downloads_are_whitelisted():
    files = get("/api/downloads")
    assert len(files) >= 8
    response = client.get("/api/downloads/ncrb_state_cases.csv")
    assert response.status_code == 200 and response.text.startswith("state_code")
    assert client.get("/api/downloads/..%2F..%2Fsecret").status_code == 404
    assert client.get("/api/downloads/cybercrime.db").status_code == 404
