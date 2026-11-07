# Deployment

The committed SQLite database is read-only at runtime, so no database host is needed for this prototype.

## Option A: one service (simplest)

FastAPI serves the API and the built site from one origin. On any Python host:

```bash
cd frontend && npm ci && npm run build
```

```bash
pip install -r backend/requirements.txt
```

```bash
uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

## Option B: Vercel and Render

### Backend on Render

1. Put the project in a Git repository, including `database/cybercrime.db`, `data/geo/` and `data/processed/`.
2. In Render, choose **New > Blueprint** and select the repository. `render.yaml` configures the service.
3. Set `ALLOWED_ORIGINS` to your Vercel URL once you have it.
4. Check `https://<your-service>.onrender.com/api/health`.

### Frontend on Vercel

1. Import the repository and set the **Root Directory** to `frontend`. Vite is detected, and `vercel.json` handles page routes.
2. Add the environment variable `VITE_API_BASE` with your Render URL and no trailing slash.
3. Deploy, then update `ALLOWED_ORIGINS` on Render if the URL changed.

Free hosting tiers may sleep when idle, so the first request can be slow.

## Before publishing

- Read `data/geo/LICENSE.md`. The boundaries are community data, and publishing maps of India has legal requirements. Have them reviewed, or replace them with Survey of India data.
- Recheck the helpline and contact information on the Emergency page, and update the checked date.
- Keep the "not a government website" notice visible.

## Updating the data

1. Add the new files under `data/raw/` without overwriting anything.
2. Add the new edition to `load_state_tables`, `build_heads` and `build_motives` in `pipeline/extract_ncrb.py`, and to `data/curated/sources.csv`.
3. Stop the API server, because it holds the database file open.
4. Run `pipeline/run_all.ps1`, then the tests.
