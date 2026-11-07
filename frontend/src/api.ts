import { useEffect, useState } from "react";

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

export interface SourceRef {
  source_id: string;
  organization: string;
  report_title: string;
  original_url: string;
  page_reference: string | null;
  verification: string;
}
export interface StateInfo { state_code: string; state_name: string; kind: string; region: string }
export interface HeadMeta { head_id: string; label: string; act: string; level: number; parent_id: string | null; first_year: number | null }
export interface MotiveMeta { motive_id: string; label: string; first_year: number | null }
export interface CoverageRow { dataset: string; level: string; years: { year: number; status: string }[] }
export interface Meta {
  ncrb_years: number[];
  latest_ncrb_year: number;
  states: StateInfo[];
  crime_heads: HeadMeta[];
  motives: MotiveMeta[];
  metrics: { id: string; label: string }[];
  coverage: CoverageRow[];
}
export interface NationalPoint { year: number; cases: number; yoy_pct: number | null; rate: number | null; population: number | null; source_id: string }
export interface Overview {
  year: number;
  cumulative_cases: number;
  cumulative_years: [number, number];
  year_cases: number;
  year_yoy_pct: number | null;
  year_rate: number | null;
  peak_year: { year: number; cases: number };
  top_state_by_cases: { state_code: string; state_name: string; cases: number; share: number };
  top_state_by_rate: { state_code: string; state_name: string; rate: number; cases: number };
  top_motive: { motive_id: string; label: string; cases: number; share: number | null } | null;
  top_crime_head: { head_id: string; label: string; cases: number } | null;
  financial: { total_crore: number; total_complaints: number; years: [number, number]; note: string };
  sources: { cases: SourceRef; financial: SourceRef };
}
export interface NationalTrend {
  ncrb: NationalPoint[];
  ncrp: { year: number; complaints: number; amount_crore: number; amount_yoy_pct: number | null }[];
  cert_in: { year: number; incidents: number; verification: string; source_id: string; yoy_pct: number | null }[];
  unavailable_note: string;
}
export interface MapState extends StateInfo {
  cases: number | null;
  rate: number | null;
  share: number | null;
  growth: number | null;
  population: number | null;
  financial: number | null;
  complaints: number | null;
  value: number | null;
  rank: number | null;
  notes: string[];
  table: string;
}
export interface MapData {
  year: number;
  metric: string;
  metric_label: string;
  category: string;
  category_label: string;
  states: MapState[];
  available_count: number;
  source: SourceRef | null;
}
export interface RegionRow { region: string; cases: number; population: number; rate: number | null; states: number }
export interface HeadRow { head_id: string; label: string; act: string; level: number; parent_id: string | null; cases: number | null; share: number | null }
export interface CategoryDist { year: number; level: number; state: string | null; total: number | null; heads: HeadRow[]; source: SourceRef | null }
export interface MotiveRow { motive_id: string; label: string; cases: number; share: number | null }
export interface MotiveDist { year: number; total: number | null; motives: MotiveRow[]; source: SourceRef | null; note: string | null }
export interface CategoryDetail {
  head_id: string;
  label: string;
  act: string;
  level: number;
  series: { year: number; cases: number; yoy_pct: number | null }[];
  latest_year: number | null;
  top_states: { state_code: string; state_name: string; cases: number; share: number | null }[];
  children: { head_id: string; label: string }[];
  financial_note: string;
  source: SourceRef | null;
}
export interface StatePoint {
  year: number;
  cases: number | null;
  population: number | null;
  rate: number | null;
  share: number | null;
  yoy_pct: number | null;
  national_cases: number;
  national_rate: number | null;
  basis: string | null;
}
export interface HeadChange { head_id: string; label: string; start_cases: number; end_cases: number; cagr_pct: number | null }
export interface StateProfile extends StateInfo {
  latest_year: number;
  overview: {
    cases: number | null; rate: number | null; share: number | null; growth: number | null; population: number | null;
    case_rank: number | null; rate_rank: number | null; ranked_units: number; national_rate: number | null;
  };
  series: StatePoint[];
  categories: CategoryDist;
  sub_categories: CategoryDist;
  motives: MotiveDist;
  financial: { year: number; complaints: number; amount_crore: number; complaints_on_hold: number; lien_crore: number; average_reported_inr: number | null } | null;
  financial_rank: number | null;
  financial_source: SourceRef;
  regional_peers: MapState[];
  insights: {
    peak: { year: number; cases: number } | null;
    top_heads: HeadRow[];
    increasing: HeadChange[];
    decreasing: HeadChange[];
    observations: string[];
  };
  notes: { year: number | null; note: string }[];
  contact: { email: string; phone: string | null } | null;
  contact_source: SourceRef;
  sources: SourceRef[];
}
export interface Contacts {
  note: string;
  source: SourceRef;
  contacts: { state_code: string; state_name: string; email: string; phone: string | null }[];
}
export interface FinancialState {
  state_code: string; state_name: string; region: string; year: number; complaints: number; amount_crore: number;
  complaints_on_hold: number; lien_crore: number; average_reported_inr: number | null; lien_pct: number | null; complaints_per_100k: number | null;
}
export interface Financial {
  national: { year: number; complaints: number; amount_crore: number; amount_yoy_pct: number | null; complaints_yoy_pct: number | null; average_reported_inr: number | null }[];
  states: FinancialState[];
  bank_fraud: { area: string; financial_year: string; frauds: number | null; amount_crore: number | null }[];
  cumulative_note: { text: string; source: SourceRef };
  sources: { national: SourceRef; states: SourceRef; bank_fraud: SourceRef };
  unavailable: string[];
}
export interface Trends {
  window: [number, number];
  growing_heads: HeadChange[];
  declining_heads: HeadChange[];
  motives: { motive_id: string; label: string; start_cases: number; end_cases: number; cagr_pct: number | null }[];
  growing_states: { state_code: string; state_name: string; start_cases: number; end_cases: number; cagr_pct: number | null }[];
  declining_states: { state_code: string; state_name: string; start_cases: number; end_cases: number; cagr_pct: number | null }[];
  fraud_motive_share: { year: number; fraud: number; total: number; share: number | null }[];
  significant_national_changes: { year: number; from: number; to: number; pct: number }[];
  significant_financial_changes: { year: number; from: number; to: number; pct: number }[];
  source: SourceRef;
}
export interface ForecastModel { model: string; mape: number; mean_error_pct: number; interval_coverage_pct: number; n_forecasts: number; selected: number }
export interface Forecast {
  history: NationalPoint[];
  forecast: { year: number; predicted: number; lower_95: number; upper_95: number; model: string }[];
  models: ForecastModel[];
  selected_model: ForecastModel;
  backtest: { year: number; actual: number; predicted: number; error_pct: number }[];
  label: string;
  limitations: string[];
  not_forecast: { dataset: string; reason: string }[];
}
export interface Source extends SourceRef {
  data_year: string; publication_date: string; access_date: string; coverage: string; units: string; limitations: string;
}
export interface DownloadFile { file: string; description: string; size_bytes: number; url: string }

export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}

const cache = new Map<string, Promise<unknown>>();

export function fetchJson<T>(path: string): Promise<T> {
  let request = cache.get(path) as Promise<T> | undefined;
  if (!request) {
    request = fetch(apiUrl(path)).then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail ?? `The server returned an error (${response.status}).`);
      }
      return response.json() as Promise<T>;
    });
    cache.set(path, request);
    request.catch(() => cache.delete(path));
  }
  return request;
}

export interface Loadable<T> { data: T | null; loading: boolean; error: string | null; retry: () => void }

/** Fetch `path` and track state. A null path means "nothing to load yet". */
export function useApi<T>(path: string | null): Loadable<T> {
  const [state, setState] = useState<{ path: string | null; data: T | null; error: string | null }>({ path: null, data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    fetchJson<T>(path)
      .then((data) => { if (!cancelled) setState({ path, data, error: null }); })
      .catch((err: Error) => {
        if (!cancelled) {
          const message = err.message.includes("fetch")
            ? "Could not reach the data service. Check that the backend is running."
            : err.message;
          setState({ path, data: null, error: message });
        }
      });
    return () => { cancelled = true; };
  }, [path, attempt]);

  const current = state.path === path;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: path != null && (!current || (state.data == null && state.error == null)),
    retry: () => setAttempt((n) => n + 1),
  };
}
