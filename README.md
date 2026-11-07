# India Cybercrime Intelligence Portal

**The Decade of Digital Threats: Analyzing the Rise of Cybercrimes in India (2016-2026)**
College project by **DataDefenders**: Adone, Sanjay, Abhiraj.

An interactive research and awareness site built on official Indian data: a clickable State/UT map, State profiles, crime categories, financial impact, trends, a tested forecast, safety guidance and verified reporting contacts.

> This is a student project, **not a government website**. To report a crime, use [cybercrime.gov.in](https://cybercrime.gov.in/) or call **1930**.

## Run it

This machine is already set up. From the project root:

```bash
powershell -ExecutionPolicy Bypass -File run_site.ps1
```

Then open <http://localhost:8000>. API documentation is at <http://localhost:8000/docs>.

### Set up on another computer

You need Python 3.12 or newer, Node 20 or newer, and optionally R 4.x if you want to rerun the analysis.

```bash
python -m venv .venv
```

```bash
.venv\Scripts\python.exe -m pip install -r backend/requirements.txt -r pipeline/requirements.txt
```

```bash
cd frontend && npm install && npm run build
```

The built database and R outputs are included, so the site runs without R. On macOS or Linux, use `.venv/bin/python`, and start the server with `uvicorn app.main:app --app-dir backend --port 8000`.

For frontend development, run the API as above and `npm run dev` in `frontend/`, then open <http://localhost:5173>.

### Rebuild the data

Stop the server first, then:

```bash
powershell -ExecutionPolicy Bypass -File pipeline/run_all.ps1
```

R packages needed: `dplyr tidyr readr ggplot2 sf forecast`. On this machine, R and its packages are installed locally under `.tools/`.

### Test

```bash
.venv\Scripts\python.exe -m pytest -q
```

## What the data shows

Figures and full tables are in [the statistical report](docs/STATISTICAL_REPORT.md).

- Registered cases rose from 12,317 in 2016 to 1,01,928 in 2024 (NCRB).
- In 2024, Telangana had the most cases (27,230) and the highest rate (71.1 per 100,000), ahead of Karnataka (21,993; 32.2).
- Fraud was the recorded motive in 72.6% of 2024 cases.
- Complaints to NCRP reported ₹22,848 crore in 2024 and ₹22,495 crore in 2025. These amounts are as reported by complainants, not verified losses.

## Key rules of this project

- **No invented statistics.** Everything comes from a listed source, and forecasts are labelled as estimates.
- **Missing is not zero.** Unavailable values are null in the database and grey on the map.
- **No mixing.** NCRB cases, NCRP complaints, CERT-In incidents and RBI frauds are never combined.
- **Raw data stays untouched.** Pipeline code only reads `data/raw/`.

## Documentation

| Document | Contents |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | Diagram, folders, database schema, API |
| [Methodology](docs/METHODOLOGY.md) | Cleaning, formulas, forecasting, access issues |
| [Data sources](docs/DATA_SOURCES.md) | Every dataset and its definitions |
| [Statistical report](docs/STATISTICAL_REPORT.md) | Findings, generated from the database |
| [Testing](docs/TESTING.md) | What was tested, results, and what was not |
| [Deployment](docs/DEPLOYMENT.md) | Vercel and Render, and updating data |
| [Limitations](docs/LIMITATIONS.md) | Limitations and future work |
| [Map licence](data/geo/LICENSE.md) | Boundary attribution and disclaimer |

## Technology

React, TypeScript, Tailwind CSS, Lucide, Recharts, D3, Leaflet, React Leaflet · Python, FastAPI, pandas · R (dplyr, tidyr, readr, ggplot2, sf, forecast) · SQLite.
