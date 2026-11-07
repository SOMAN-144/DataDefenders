import { ArrowRight, Map, PhoneCall } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { type CategoryDist, type CoverageRow, type MapData, type Meta, type MotiveDist, type NationalPoint, type NationalTrend, type Overview as OverviewData, type RegionRow, useApi } from "../api";
import { ColumnChart, RankedBars } from "../components/charts";
import { Async, Card, ChartCard, Loading, Notice, Select, SectionTitle, StatCard } from "../components/ui";
import { compact, crore, dec, num, pct } from "../format";

const YOY = (v: number) => pct(v, 1, true);

export default function Overview() {
  const meta = useApi<Meta>("/api/meta");
  return (
    <div className="fade-in">
      <section className="mb-6 overflow-hidden rounded-2xl border border-line/70 bg-gradient-to-br from-card via-surface to-bg p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">The Decade of Digital Threats · 2016–2026</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          How cybercrime in India has changed, State by State
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Registered cases, reported financial fraud and security incidents from NCRB, the National Cyber Crime Reporting Portal,
          CERT-In and RBI. Each reporting system is kept separate, and every figure links to its source.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link to="/map" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg hover:bg-accent/85">
            <Map size={16} aria-hidden /> Explore the India map
          </Link>
          <Link to="/emergency" className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:border-accent/60">
            <PhoneCall size={16} aria-hidden /> Get help after a fraud
          </Link>
        </div>
      </section>
      <Async state={meta} height={420}>{(m) => <Dashboard meta={m} />}</Async>
    </div>
  );
}

function Dashboard({ meta }: { meta: Meta }) {
  const [year, setYear] = useState(meta.latest_ncrb_year);
  const [category, setCategory] = useState("total");
  const overview = useApi<OverviewData>(`/api/national/overview?year=${year}`);
  const trend = useApi<NationalTrend>("/api/national/trend");
  const heads = useApi<CategoryDist>(year >= 2017 ? `/api/categories?year=${year}&level=1` : null);
  const motives = useApi<MotiveDist>(`/api/motives?year=${year}`);
  const cases = useApi<MapData>(`/api/comparison/map?year=${year}&metric=cases&category=${encodeURIComponent(category)}`);
  const rates = useApi<MapData>(`/api/comparison/map?year=${year}&metric=rate&category=${encodeURIComponent(category)}`);
  const regions = useApi<RegionRow[]>(`/api/comparison/regions?year=${year}`);

  const label = meta.crime_heads.find((h) => `head:${h.head_id}` === category)?.label ?? "All cyber crimes";

  const topCases = useMemo(() => topTen(cases.data, "cases"), [cases.data]);
  const topRates = useMemo(() => topTen(rates.data, "rate"), [rates.data]);
  const allStates = useMemo(() => topTen(cases.data, "cases", 36), [cases.data]);

  return (
    <>
      <div className="z-40 -mx-1 mb-4 rounded-xl border border-line/70 bg-surface/95 p-3 backdrop-blur xl:sticky xl:top-[96px]">
        <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,320px)_1fr] sm:items-end">
          <Select label="Year" value={String(year)} onChange={(v) => setYear(Number(v))}>
            {[...meta.ncrb_years].reverse().map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Select label="Category, for the State charts" value={category} onChange={setCategory}>
            <option value="total">All cyber crimes</option>
            {meta.crime_heads.filter((h) => h.level === 1 && h.first_year).map((h) => (
              <option key={h.head_id} value={`head:${h.head_id}`}>{h.label}</option>
            ))}
          </Select>
          <p className="text-xs leading-relaxed text-ink-2">
            NCRB's latest edition covers {meta.latest_ncrb_year}. No complete official 2025 or 2026 case count exists yet, so those years are not shown as zero or estimated here.
          </p>
        </div>
      </div>

      <Async state={overview} height={180}>
        {(o) => (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label={`Registered cases, ${o.year}`}
              value={num(o.year_cases)}
              detail={<>{o.year_yoy_pct == null ? "First year in this series" : `${pct(o.year_yoy_pct, 1, true)} on ${o.year - 1}`}. {num(o.cumulative_cases)} in total across {o.cumulative_years[0]}–{o.cumulative_years[1]}.</>}
              tip="Cases registered by police under cyber crime heads, as compiled by NCRB. Complaints that did not become cases are not counted."
            />
            <StatCard
              label={`Reported on NCRP, ${o.financial.years[0]}–${o.financial.years[1]}`}
              value={crore(o.financial.total_crore)}
              tone="warn"
              detail={<>{num(o.financial.total_complaints)} complaints. As reported by victims and not verified.</>}
              tip={o.financial.note}
            />
            <StatCard label="Year with most reported cases" value={o.peak_year.year} tone="violet" detail={`${num(o.peak_year.cases)} cases`} />
            <StatCard
              label={`Most cases by State, ${o.year}`}
              value={o.top_state_by_cases.state_name}
              tone="bad"
              detail={`${num(o.top_state_by_cases.cases)} cases, ${pct(o.top_state_by_cases.share)} of India`}
            />
            <StatCard
              label={`Highest rate, ${o.year}`}
              value={o.top_state_by_rate.state_name}
              tone="bad"
              detail={`${dec(o.top_state_by_rate.rate)} cases per 100,000, against ${dec(o.year_rate)} nationally`}
            />
            <StatCard
              label={`Most common motive, ${o.year}`}
              value={o.top_motive?.label ?? "Data unavailable"}
              tone="violet"
              detail={o.top_motive ? `${num(o.top_motive.cases)} cases${o.top_motive.share != null ? `, ${pct(o.top_motive.share)} of the total` : ""}` : undefined}
              tip="From NCRB Table 9A.3. Police record one main motive for each case."
            />
          </div>
        )}
      </Async>

      <SectionTitle title="The national picture">Registered cases over the decade. Blank years have no official figure yet.</SectionTitle>
      <Async state={trend} height={280}>
        {(t) => {
          const padded = withEmptyYears(t.ncrb);
          return (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="Cyber crime cases registered, 2016–2026"
                subtitle="NCRB. 2025 and 2026 are not yet published."
                source={overview.data?.sources.cases}
                table={{ rows: t.ncrb, columns: [
                  { label: "Year", align: "left", render: (r) => r.year },
                  { label: "Cases", render: (r) => num(r.cases) },
                  { label: "Rate per 100,000", render: (r) => dec(r.rate) },
                ] }}
              >
                <ColumnChart data={padded} x="year" y="cases" name="Cases" fmt={num} />
              </ChartCard>
              <ChartCard
                title="Year-over-year growth"
                subtitle="Percentage change in registered cases against the previous year."
                source={overview.data?.sources.cases}
                table={{ rows: t.ncrb.slice(1), columns: [
                  { label: "Year", align: "left", render: (r) => r.year },
                  { label: "Growth", render: (r) => pct(r.yoy_pct, 1, true) },
                ] }}
              >
                <ColumnChart data={t.ncrb.slice(1) as never} x="year" y="yoy_pct" name="Growth" fmt={YOY} axisFmt={(v) => `${v}%`} color="#8B5CF6" zeroLine />
              </ChartCard>
              <ChartCard
                title="Amount reported on NCRP, by year"
                subtitle="Crore rupees reported by complainants. A separate system from NCRB cases."
                source={overview.data?.sources.financial}
                table={{ rows: t.ncrp, columns: [
                  { label: "Year", align: "left", render: (r) => r.year },
                  { label: "Amount", render: (r) => crore(r.amount_crore) },
                  { label: "Complaints", render: (r) => num(r.complaints) },
                ] }}
              >
                <ColumnChart data={t.ncrp as never} x="year" y="amount_crore" name="Amount reported" fmt={(v) => crore(v)} axisFmt={(v) => `₹${compact(v)}`} color="#F59E0B" />
              </ChartCard>
              <ChartCard
                title={`Crime heads, ${year}`}
                subtitle="Largest heads in NCRB Table 9A.2. They add up to the national total."
                source={heads.data?.source}
                sourceExtra={year === 2016 ? undefined : "Heads depend on how police classify a case, and States differ in this."}
                table={heads.data ? { rows: heads.data.heads.filter((h) => h.cases), columns: [
                  { label: "Crime head", align: "left", render: (r) => r.label },
                  { label: "Cases", render: (r) => num(r.cases) },
                  { label: "Share", render: (r) => pct(r.share) },
                ] } : undefined}
              >
                {year < 2017 ? (
                  <MotiveFallback data={motives.data} />
                ) : heads.data ? (
                  <RankedBars data={heads.data.heads.filter((h) => h.cases).slice(0, 8) as never} label="label" value="cases" name="Cases" fmt={num} labelWidth={150} />
                ) : <Loading />}
              </ChartCard>
            </div>
          );
        }}
      </Async>

      <SectionTitle title="States and Union Territories">
        Counts favour large States, while rates adjust for population. Rates are unreliable where counts or populations are very small.
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={`Top 10 by reported cases, ${year}`} subtitle={label} source={cases.data?.source}
          table={{ rows: topCases, columns: [{ label: "State/UT", align: "left", render: (r) => r.state_name }, { label: "Cases", render: (r) => num(r.cases) }] }}>
          {cases.data ? (topCases.length ? <RankedBars data={topCases as never} label="state_name" value="cases" name="Cases" fmt={num} /> : <NoData />) : <Loading />}
        </ChartCard>
        <ChartCard title={`Top 10 by rate per 100,000, ${year}`} subtitle={label} source={rates.data?.source} sourceExtra="Population is NCRB's printed mid-year projection for that year."
          table={{ rows: topRates, columns: [{ label: "State/UT", align: "left", render: (r) => r.state_name }, { label: "Rate", render: (r) => dec(r.rate) }, { label: "Cases", render: (r) => num(r.cases) }] }}>
          {rates.data ? (topRates.length ? <RankedBars data={topRates as never} label="state_name" value="rate" name="Rate per 100,000" fmt={(v) => dec(v)} color="#8B5CF6" /> : <NoData />) : <Loading />}
        </ChartCard>
        <ChartCard title={`State-wise comparison, ${year}`} subtitle={`${label}. All reporting units, largest first.`} source={cases.data?.source}
          table={{ rows: allStates, columns: [{ label: "State/UT", align: "left", render: (r) => r.state_name }, { label: "Cases", render: (r) => num(r.cases) }, { label: "Share", render: (r) => pct(r.share) }] }}>
          <div className="max-h-[420px] overflow-y-auto pr-1" tabIndex={0} role="region" aria-label="All states chart">
            {cases.data ? (allStates.length ? <RankedBars data={allStates as never} label="state_name" value="cases" name="Cases" fmt={num} height={allStates.length * 24 + 30} /> : <NoData />) : <Loading />}
          </div>
        </ChartCard>
        <ChartCard title={`Regional comparison, ${year}`} subtitle="All cyber crimes. Regions follow the Zonal Councils, with the North-East shown separately." source={cases.data?.source}
          sourceExtra="Regional grouping is this project's, not NCRB's."
          table={regions.data ? { rows: regions.data, columns: [{ label: "Region", align: "left", render: (r) => r.region }, { label: "Cases", render: (r) => num(r.cases) }, { label: "Rate", render: (r) => dec(r.rate) }] } : undefined}>
          {regions.data ? <RankedBars data={regions.data as never} label="region" value="cases" name="Cases" fmt={num} labelWidth={84} height={250} /> : <Loading />}
        </ChartCard>
      </div>

      <SectionTitle title="Data coverage">Which reporting system covers which year. No system is merged with another.</SectionTitle>
      <Card><CoverageMatrix rows={meta.coverage} /></Card>

      <div className="mt-4">
        <Notice title="Why these numbers can't be added together">
          NCRB counts police cases. NCRP counts complaints from the public, many of which never become cases. CERT-In counts technical security incidents, and RBI counts frauds reported by banks. A single incident may appear in several of them, or in none.{" "}
          <Link to="/sources" className="inline-flex items-center gap-1 text-accent hover:underline">See how they differ <ArrowRight size={12} aria-hidden /></Link>
        </Notice>
      </div>
    </>
  );
}

function MotiveFallback({ data }: { data: MotiveDist | null }) {
  if (!data) return <Loading />;
  return (
    <>
      <p className="mb-2 text-xs text-ink-2">Crime heads are not available by State for 2016, so the motives NCRB published that year are shown instead.</p>
      <RankedBars data={data.motives.slice(0, 8) as never} label="label" value="cases" name="Cases" fmt={num} labelWidth={150} />
    </>
  );
}

function NoData() {
  return <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-2">Data unavailable for this year and category.</p>;
}

function topTen(data: MapData | null, key: "cases" | "rate", limit = 10) {
  return (data?.states ?? [])
    .filter((s) => s[key] != null && (s[key] as number) > 0)
    .sort((a, b) => (b[key] as number) - (a[key] as number))
    .slice(0, limit);
}

function withEmptyYears(points: NationalPoint[]) {
  const last = points[points.length - 1].year;
  const extra = [];
  for (let y = last + 1; y <= 2026; y++) extra.push({ year: y, cases: null });
  return [...points, ...extra] as never[];
}

const STATUS = {
  available: { className: "bg-accent/70", label: "Available" },
  secondary: { className: "bg-warn/70", label: "Press report of official reply" },
  unavailable: { className: "bg-line/40", label: "Unavailable" },
} as const;

export function CoverageMatrix({ rows }: { rows: CoverageRow[] }) {
  const years = rows[0].years.map((y) => y.year);
  return (
    <>
      <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label="Data coverage by year">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1 text-left font-medium text-ink-2">Dataset</th>
              {years.map((y) => <th key={y} scope="col" className="num px-0.5 py-1 font-medium text-ink-2">{y}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.dataset} className="border-t border-line/40">
                <th scope="row" className="px-2 py-1.5 text-left font-normal">
                  {row.dataset} <span className="text-ink-3">· {row.level}</span>
                </th>
                {row.years.map((y) => {
                  const status = STATUS[y.status as keyof typeof STATUS] ?? STATUS.unavailable;
                  return (
                    <td key={y.year} className="px-0.5 py-1.5" title={`${row.dataset}, ${y.year}: ${status.label}`}>
                      <span className={`block h-4 rounded-sm ${status.className}`}>
                        <span className="sr-only">{status.label}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 flex flex-wrap gap-4 text-xs text-ink-2">
        {Object.values(STATUS).map((s) => (
          <li key={s.label} className="flex items-center gap-1.5"><span className={`inline-block h-3 w-4 rounded-sm ${s.className}`} aria-hidden /> {s.label}</li>
        ))}
      </ul>
    </>
  );
}
