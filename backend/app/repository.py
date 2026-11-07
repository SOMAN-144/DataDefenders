"""Read-only access to the SQLite database."""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
DB_PATH = Path(os.environ.get("CYBERCRIME_DB", ROOT / "database" / "cybercrime.db"))


def _connect() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at {DB_PATH}. Run pipeline/run_all.ps1 first.")
    con = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True, check_same_thread=False)
    con.row_factory = sqlite3.Row
    return con


_con: sqlite3.Connection | None = None


def connection() -> sqlite3.Connection:
    global _con
    if _con is None:
        _con = _connect()
    return _con


def rows(sql: str, params: Iterable[Any] = ()) -> list[dict]:
    return [dict(row) for row in connection().execute(sql, tuple(params)).fetchall()]


def one(sql: str, params: Iterable[Any] = ()) -> dict | None:
    row = connection().execute(sql, tuple(params)).fetchone()
    return dict(row) if row else None
