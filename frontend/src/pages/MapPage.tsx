import type { FeatureCollection } from "geojson";
import { ArrowRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { type MapData, type MapState, type Meta, type StateProfile, useApi } from "../api";
import { LineSeries, RankedBars } from "../components/charts";
import { buildClasses, formatMetric, IndiaMap, MapLegend } from "../components/IndiaMap";
import { Async, Card, DataTable, EmptyState, inputClass, Loading, Notice, PageHeader, Select, SourceLine, Toggle } from "../components/ui";
import { crore, dec, num, pct } from "../format";

const CASE_METRICS = [
  { id: "cases", label: "Total cases" },
  { id: "rate", label: "Crime rate" },
];

export default function MapPage() {
  const meta = useApi<Meta>("/api/meta");
  return (
    <div className="fade-in">
      <PageHeader eyebrow="Interactive map" title="Cyber crime across India's States and Union Territories">
        Hover over a State or UT for its figures and click to explore it. Grey means the figure is not available. It never means low.
      </PageHeader>
      <Async state={meta} height={520}>{(m) => <MapExplorer meta={m} />}</Async>
    </div>
  );
}

function MapExplorer({ meta }: { meta: Meta }) {
  const [params, setParams] = useSearchParams();
  const year = Number(params.get("year")) || meta.latest_ncrb_year;
  const metric = params.get("metric") ?? "cases";
  const category = params.get("category") ?? "total";
  const selected = params.get("state");
  const [query, setQuery] = useState("");

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value == null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  const isFinancial = metric === "financial" || metric === "complaints";
  // State-wise NCRP amounts exist only for 2023, so that view pins the year.
  const effectiveYear = isFinancial ? 2023 : year;
  const dataPath = `/api/comparison/map?year=${effectiveYear}&metric=${metric}&category=${encodeURIComponent(isFinancial ? "total" : category)}`;
  const mapData = useApi<MapData>(dataPath);
  const geo = useApi<FeatureCollection>("/api/geo/states");

  const classes = useMemo(() => {
    const values = (mapData.data?.states ?? []).map((s) => s.value).filter((v): v is number => v != null);
    return buildClasses(values, metric);
  }, [mapData.data, metric]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? meta.states.filter((s) => s.state_name.toLowerCase().includes(q)).slice(0, 7) : [];
  }, [query, meta.states]);

  const ranked = useMemo(() => {
    const rows = [...(mapData.data?.states ?? [])];
    return rows.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity) || a.state_name.localeCompare(b.state_name));
  }, [mapData.data]);

  const headOptions = meta.crime_heads.filter((h) => h.level >= 1 && h.first_year != null);

  return (
    <>
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[0.8fr_1.6fr_1.2fr_1.1fr_1.1fr]">
          <Select label="Year" value={String(effectiveYear)} onChange={(v) => setParam({ year: v })}>
            {[...meta.ncrb_years].reverse().map((y) => <option key={y} value={y} disabled={isFinancial && y !== 2023}>{y}</option>)}
          </Select>
          <Select label="Crime category" value={isFinancial ? "total" : category} onChange={(v) => setParam({ category: v === "total" ? null : v })}>
            <option value="total">All cyber crimes</option>
            <optgroup label="Crime heads (NCRB Table 9A.2, from 2017)">
              {headOptions.map((h) => (
                <option key={h.head_id} value={`head:${h.head_id}`} disabled={isFinancial}>
                  {h.level > 1 ? "· " : ""}{h.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Motives (NCRB Table 9A.3)">
              {meta.motives.filter((m) => m.motive_id !== "total").map((m) => (
                <option key={m.motive_id} value={`motive:${m.motive_id}`} disabled={isFinancial}>{m.label}</option>
              ))}
            </optgroup>
          </Select>
          <Toggle
            label="Total cases / crime rate"
            value={metric === "rate" ? "rate" : "cases"}
            options={CASE_METRICS}
            onChange={(id) => setParam({ metric: id === "cases" ? null : id })}
          />
          <Select label="Metric" value={metric} onChange={(v) => setParam({ metric: v === "cases" ? null : v })}>
            {meta.metrics.map((m) => <option key={m.id} value={m.id}>{m.label}{m.id === "financial" || m.id === "complaints" ? " (2023)" : ""}</option>)}
          </Select>
          <div className="relative flex min-w-0 flex-col gap-1">
            <label htmlFor="state-search" className="text-xs font-medium text-ink-2">Search State/UT</label>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-3 text-ink-3" aria-hidden />
              <input id="state-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Kerala" className={`${inputClass} pl-8`} autoComplete="off" />
            </div>
            {query.trim() !== "" && (
              <ul className="absolute top-full z-[1200] mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-xl">
                {matches.map((s) => (
                  <li key={s.state_code}>
                    <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-card-hi" onClick={() => { setParam({ state: s.state_code }); setQuery(""); }}>
                      {s.state_name}
                    </button>
                  </li>
                ))}
                {matches.length === 0 && <li className="px-3 py-2 text-sm text-ink-2">No matching State or UT</li>}
              </ul>
            )}
          </div>
        </div>
        {isFinancial && (
          <p className="mt-3 text-xs text-ink-2">
            State-wise NCRP amounts could only be verified for 2023, so this view stays on that year and shows all financial-fraud complaints.
          </p>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
        <Card className="relative !p-3">
          {mapData.data && (
            <div className="mb-2 px-1">
              <h2 className="text-[15px] font-semibold leading-snug">
                {mapData.data.category_label}: {mapData.data.metric_label.toLowerCase()}, {mapData.data.year}
              </h2>
            </div>
          )}
          <div className="relative h-[58vh] min-h-[400px] sm:h-[660px]">
            {(mapData.loading || geo.loading) && <div className="absolute inset-0 z-[500]"><Loading label="Loading map" height={560} /></div>}
            {mapData.error && <EmptyState title="The map data could not be loaded">{mapData.error}</EmptyState>}
            {geo.data && (mapData.data || mapData.loading) && (
              mapData.data ? (
                <IndiaMap geo={geo.data} data={mapData.data} classes={classes} selected={selected} onSelect={(code) => setParam({ state: code })} />
              ) : null
            )}
          </div>
          {mapData.data && mapData.data.available_count === 0 && (
            <div className="mt-2">
              <Notice tone="warn" title="Data unavailable for this selection">
                NCRB does not publish this category for {mapData.data.year}. Try a later year. Some heads such as UPI fraud begin in 2024.
              </Notice>
            </div>
          )}
          <div className="mt-2 px-1">
            <MapLegend classes={classes} title={mapData.data?.metric_label ?? "Legend"} />
            <SourceLine source={mapData.data?.source} extra="Boundaries are community data (DataMeet, CC BY 2.5 India) and indicative only. Dots mark small territories so they stay clickable." />
          </div>
        </Card>

        <div className="min-w-0">
          {selected ? (
            <StatePanel code={selected} onClose={() => setParam({ state: null })} />
          ) : (
            <Card>
              <h2 className="mb-1 text-[15px] font-semibold">Ranking: {mapData.data?.metric_label.toLowerCase() ?? "loading"}</h2>
              <p className="mb-3 text-xs text-ink-2">Select a row or click the map to open a State or UT.</p>
              {mapData.data ? (
                <DataTable<MapState>
                  caption="States and Union Territories ranked by the selected metric"
                  rows={ranked}
                  maxHeight="600px"
                  columns={[
                    { label: "#", render: (s) => s.rank ?? "–" },
                    {
                      label: "State/UT", align: "left",
                      render: (s) => (
                        <button type="button" className="text-left font-sans text-ink hover:text-accent" onClick={() => setParam({ state: s.state_code })}>
                          {s.state_name}
                        </button>
                      ),
                    },
                    { label: mapData.data.metric === "cases" ? "Cases" : "Value", render: (s) => <span className={s.value == null ? "font-sans text-xs text-ink-3" : ""}>{formatMetric(mapData.data!.metric, s.value)}</span> },
                  ]}
                />
              ) : <Loading height={400} />}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function StatePanel({ code, onClose }: { code: string; onClose: () => void }) {
  const profile = useApi<StateProfile>(`/api/states/${code}`);
  return (
    <Card>
      <Async state={profile} height={500}>
        {(p) => (
          <div className="fade-in">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold tracking-tight">{p.state_name}</h2>
                <p className="text-xs text-ink-2">{p.kind === "UT" ? "Union Territory" : "State"} · {p.region} region · figures for {p.latest_year}</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close State panel" className="rounded-md border border-line p-1 text-ink-2 hover:text-ink"><X size={15} aria-hidden /></button>
            </div>

            <dl className="grid grid-cols-2 gap-2">
              {[
                ["Reported cases", num(p.overview.cases), p.overview.case_rank ? `Rank #${p.overview.case_rank} of ${p.overview.ranked_units}` : ""],
                ["Rate per 100,000", p.overview.rate == null ? "Data unavailable" : dec(p.overview.rate), `National ${dec(p.overview.national_rate)}`],
                ["Share of national", pct(p.overview.share), "Same NCRB table"],
                ["Year-over-year", pct(p.overview.growth, 1, true), `${p.latest_year - 1} to ${p.latest_year}`],
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-lg bg-surface p-3">
                  <dt className="text-xs text-ink-2">{label}</dt>
                  <dd className="num mt-1 text-lg font-semibold">{value}</dd>
                  <dd className="mt-0.5 text-[11px] text-ink-3">{detail}</dd>
                </div>
              ))}
              <div className="col-span-2 rounded-lg bg-surface p-3">
                <dt className="text-xs text-ink-2">Amount reported on NCRP, {p.financial?.year ?? 2023}</dt>
                <dd className="num mt-1 text-lg font-semibold">{crore(p.financial?.amount_crore, 1)}</dd>
                <dd className="mt-0.5 text-[11px] text-ink-3">{num(p.financial?.complaints)} complaints. A different dataset from NCRB cases.</dd>
              </div>
            </dl>

            <h3 className="mb-1 mt-4 text-sm font-semibold">Year-wise trend</h3>
            <LineSeries data={p.series as never} x="year" series={[{ key: "cases", name: "Cases" }]} fmt={num} height={170} />

            <h3 className="mb-2 mt-3 text-sm font-semibold">Top crime heads, {p.latest_year}</h3>
            {p.categories.heads.filter((h) => h.cases).length ? (
              <RankedBars data={p.categories.heads.filter((h) => h.cases).slice(0, 5) as never} label="label" value="cases" name="Cases" fmt={num} labelWidth={132} />
            ) : <EmptyState>No crime head data for this year.</EmptyState>}

            {p.insights.observations.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-sm leading-relaxed text-ink-2">
                {p.insights.observations.slice(0, 3).map((o) => <li key={o}>{o}</li>)}
              </ul>
            )}

            <Link to={`/states/${p.state_code}`} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg hover:bg-accent/85">
              Open full analysis <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
        )}
      </Async>
    </Card>
  );
}
