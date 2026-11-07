"""REST API. Data access and calculations live in service.py and analytics.py."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from . import service
from .repository import ROOT

app = FastAPI(
    title="India Cybercrime Intelligence Portal API",
    version="1.0.0",
    description="Official Indian cybercrime statistics. Reporting systems are kept separate; missing data is null.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o],
    allow_methods=["GET"],
    allow_headers=["*"],
)

GEOJSON = ROOT / "data" / "geo" / "india_states.geojson"
PROCESSED = ROOT / "data" / "processed"
DOWNLOADS = {
    "ncrb_state_cases.csv": "NCRB cases registered by State/UT and year (latest published value)",
    "ncrb_national_cases.csv": "NCRB all-India cases registered by year",
    "ncrb_crime_heads.csv": "NCRB cases by crime head, State/UT and year (Table 9A.2)",
    "ncrb_motives.csv": "NCRB cases by motive, State/UT and year (Table 9A.3)",
    "ncrb_population.csv": "Population denominators as printed by NCRB",
    "ncrb_revisions.csv": "Values changed between NCRB editions",
    "ncrp_national.csv": "NCRP financial-fraud complaints and amount reported by year",
    "ncrp_state_2023.csv": "CFCFRMS complaints, amount and lien by State/UT, 2023",
    "cert_in_incidents.csv": "CERT-In incidents handled by year",
    "rbi_fraud.csv": "RBI bank frauds by area of operation",
}


def _year(year: int | None) -> int | None:
    if year is not None and year not in service.ncrb_years():
        raise HTTPException(404, f"No NCRB data for {year}. Available: {service.ncrb_years()}")
    return year


def _category(category: str) -> str:
    if not service.valid_category(category):
        raise HTTPException(422, f"Unknown category: {category}")
    return category


def _state(code: str | None) -> str | None:
    if code is not None and not service.get_state(code):
        raise HTTPException(404, f"Unknown state code: {code}")
    return code


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "latest_ncrb_year": service.latest_year()}


@app.get("/api/meta")
def meta() -> dict:
    return service.meta()


@app.get("/api/national/overview")
def national_overview(year: int | None = None) -> dict:
    return service.overview(_year(year))


@app.get("/api/national/trend")
def national_trend() -> dict:
    return service.national_trend()


@app.get("/api/states")
def states() -> list[dict]:
    return service.state_rows()


@app.get("/api/states/{code}")
def state_profile(code: str) -> dict:
    profile = service.state_profile(code)
    if profile is None:
        raise HTTPException(404, f"Unknown state code: {code}")
    return profile


@app.get("/api/comparison/map")
def map_data(
    year: int = Query(...),
    metric: str = Query("cases"),
    category: str = Query("total"),
) -> dict:
    if metric not in service.METRICS:
        raise HTTPException(422, f"Unknown metric: {metric}")
    return service.map_data(_year(year), metric, _category(category))


@app.get("/api/comparison/regions")
def regions(year: int) -> list[dict]:
    return service.region_table(_year(year))


@app.get("/api/comparison/states")
def compare(codes: str = Query(..., description="Comma-separated state codes")) -> dict:
    selected = [c.strip().upper() for c in codes.split(",") if c.strip()]
    if not selected or len(selected) > 6:
        raise HTTPException(422, "Provide between 1 and 6 state codes")
    for code in selected:
        _state(code)
    return service.compare(selected)


@app.get("/api/categories")
def categories(year: int, level: int = Query(1, ge=0, le=3), state: str | None = None) -> dict:
    return service.category_distribution(_year(year), level, _state(state))


@app.get("/api/categories/{head_id}")
def category(head_id: str) -> dict:
    detail = service.category_detail(head_id)
    if detail is None:
        raise HTTPException(404, f"Unknown crime head: {head_id}")
    return detail


@app.get("/api/motives")
def motives(year: int, state: str | None = None) -> dict:
    return service.motive_distribution(_year(year), _state(state))


@app.get("/api/financial")
def financial() -> dict:
    return service.financial()


@app.get("/api/trends")
def trends() -> dict:
    return service.trends()


@app.get("/api/forecast")
def forecast() -> dict:
    return service.forecast()


@app.get("/api/geo/states")
def geo_states() -> Response:
    return FileResponse(GEOJSON, media_type="application/geo+json")


@app.get("/api/sources")
def sources() -> list[dict]:
    return service.sources()


@app.get("/api/sources/revisions")
def revisions() -> list[dict]:
    return service.revisions()


@app.get("/api/contacts")
def contacts() -> dict:
    return service.contacts()


@app.get("/api/downloads")
def downloads() -> list[dict]:
    return [
        {"file": name, "description": text, "size_bytes": (PROCESSED / name).stat().st_size, "url": f"/api/downloads/{name}"}
        for name, text in DOWNLOADS.items() if (PROCESSED / name).exists()
    ]


@app.get("/api/downloads/{name}")
def download(name: str) -> Response:
    # Whitelist lookup, so a crafted name can never reach another file.
    if name not in DOWNLOADS:
        raise HTTPException(404, "Unknown dataset")
    return FileResponse(PROCESSED / name, media_type="text/csv", filename=name)


# When a production frontend build exists, serve it from the same origin.
_dist = Path(ROOT / "frontend" / "dist")
if _dist.exists():
    app.mount("/assets", StaticFiles(directory=_dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> Response:
        if path.startswith("api/"):
            raise HTTPException(404, "Unknown API route")
        candidate = (_dist / path).resolve()
        if path and candidate.is_file() and _dist.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(_dist / "index.html")
