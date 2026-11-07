-- India Cybercrime Intelligence Portal: SQLite schema (portable to PostgreSQL).
-- Each reporting system has its own table, so different statistics cannot be mixed
-- by accident. A NULL value means "not reported" and is never treated as zero.

CREATE TABLE data_sources (
    source_id TEXT PRIMARY KEY,
    organization TEXT NOT NULL,
    report_title TEXT NOT NULL,
    data_year TEXT,
    publication_date TEXT,
    original_url TEXT NOT NULL,
    page_reference TEXT,
    access_date TEXT NOT NULL,
    coverage TEXT,
    units TEXT,
    verification TEXT NOT NULL,
    limitations TEXT
);

CREATE TABLE states (
    state_id INTEGER PRIMARY KEY,
    state_code TEXT NOT NULL UNIQUE,
    state_name TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL CHECK (kind IN ('State', 'UT', 'Country')),
    region TEXT
);

CREATE TABLE crime_heads (
    head_id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    act TEXT NOT NULL,
    level INTEGER NOT NULL,
    parent_id TEXT REFERENCES crime_heads(head_id)
);

CREATE TABLE motives (
    motive_id TEXT PRIMARY KEY,
    label TEXT NOT NULL
);

-- NCRB cases registered, Table 9A.1: latest published value for each state and year.
CREATE TABLE cybercrime_statistics (
    record_id INTEGER PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES states(state_id),
    year INTEGER NOT NULL,
    reported_cases INTEGER,
    source_id TEXT NOT NULL REFERENCES data_sources(source_id),
    UNIQUE (state_id, year)
);

-- NCRB cases registered by crime head, Table 9A.2.
CREATE TABLE crime_head_statistics (
    record_id INTEGER PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES states(state_id),
    year INTEGER NOT NULL,
    head_id TEXT NOT NULL REFERENCES crime_heads(head_id),
    reported_cases INTEGER,
    source_id TEXT NOT NULL REFERENCES data_sources(source_id),
    UNIQUE (state_id, year, head_id)
);

-- NCRB cases registered by motive, Table 9A.3.
CREATE TABLE motive_statistics (
    record_id INTEGER PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES states(state_id),
    year INTEGER NOT NULL,
    motive_id TEXT NOT NULL REFERENCES motives(motive_id),
    reported_cases INTEGER,
    source_id TEXT NOT NULL REFERENCES data_sources(source_id),
    UNIQUE (state_id, year, motive_id)
);

-- NCRB's printed mid-year population denominator.
CREATE TABLE population_statistics (
    record_id INTEGER PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES states(state_id),
    year INTEGER NOT NULL,
    population INTEGER,
    published_rate REAL,
    basis TEXT NOT NULL,
    denominator_kind TEXT NOT NULL,
    source_id TEXT NOT NULL REFERENCES data_sources(source_id),
    UNIQUE (state_id, year)
);

-- NCRP/CFCFRMS financial-fraud complaints: amounts as reported, not verified losses.
CREATE TABLE financial_statistics (
    record_id INTEGER PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES states(state_id),
    year INTEGER NOT NULL,
    crime_category TEXT NOT NULL,
    complaints INTEGER,
    reported_financial_loss_crore REAL,
    complaints_on_hold INTEGER,
    lien_amount_crore REAL,
    source_id TEXT NOT NULL REFERENCES data_sources(source_id),
    UNIQUE (state_id, year, crime_category)
);

-- CERT-In cyber security incidents handled.
CREATE TABLE cert_in_incidents (
    year INTEGER PRIMARY KEY,
    incidents INTEGER NOT NULL,
    source_id TEXT NOT NULL REFERENCES data_sources(source_id),
    verification TEXT NOT NULL
);

-- RBI bank-reported frauds, by financial year and area of operation.
CREATE TABLE bank_fraud_statistics (
    record_id INTEGER PRIMARY KEY,
    area TEXT NOT NULL,
    financial_year TEXT NOT NULL,
    frauds INTEGER,
    amount_crore REAL,
    source_id TEXT NOT NULL REFERENCES data_sources(source_id),
    UNIQUE (area, financial_year)
);

-- Estimates from analysis/R/analysis.R. Never merged with reported statistics.
CREATE TABLE forecasts (
    year INTEGER PRIMARY KEY,
    predicted REAL NOT NULL,
    lower_95 REAL NOT NULL,
    upper_95 REAL NOT NULL,
    model TEXT NOT NULL
);

CREATE TABLE forecast_models (
    model TEXT PRIMARY KEY,
    mape REAL NOT NULL,
    mean_error_pct REAL NOT NULL,
    interval_coverage_pct REAL NOT NULL,
    n_forecasts INTEGER NOT NULL,
    selected INTEGER NOT NULL
);

CREATE TABLE forecast_backtest (
    year INTEGER PRIMARY KEY,
    actual INTEGER NOT NULL,
    predicted REAL NOT NULL,
    error_pct REAL NOT NULL
);

-- Contacts as published on cybercrime.gov.in/contactus.
CREATE TABLE state_contacts (
    state_id INTEGER PRIMARY KEY REFERENCES states(state_id),
    email TEXT NOT NULL,
    phone TEXT,
    source_id TEXT NOT NULL REFERENCES data_sources(source_id)
);

CREATE TABLE revisions (
    scope TEXT NOT NULL,
    year INTEGER NOT NULL,
    published_values TEXT NOT NULL,
    PRIMARY KEY (scope, year)
);

CREATE TABLE data_notes (
    state_code TEXT NOT NULL,
    year INTEGER,
    note TEXT NOT NULL
);

CREATE INDEX idx_cases_year ON cybercrime_statistics(year);
CREATE INDEX idx_heads_year_head ON crime_head_statistics(year, head_id);
CREATE INDEX idx_motive_year ON motive_statistics(year, motive_id);
